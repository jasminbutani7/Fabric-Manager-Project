import React, { useState } from 'react';
import {
  X,
  Scissors,
  Truck,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useFabric, useProduction } from '../../context/useManagement';
import {
  formatPieceName,
  resolvePieceLabel,
  getFabricSubPartSkippedPieces,
  getMasterVerifiedTrimmedPiecesForSubPart,
} from '../../utils/productUtils';
import { sanitizeInteger, blockInvalidNumberKeys } from '../../utils/formValidation';

export default function ThreadTrimmingDecisionModal({
  isOpen,
  onClose,
  fabric,
  verifiedPiecesCount = 0,
  onChooseAssignTrimming,
  _onChooseSkipTrimming,
}) {
  const { cuttings = [] } = useFabric();
  const {
    masterHandovers = [],
    threadCuttingAssignments = [],
    setFabricThreadCuttingDecision,
  } = useProduction();

  // Local state for PC inputs per subpart
  const [customPcs, setCustomPcs] = useState({});

  if (!isOpen || !fabric) return null;

  let struct = fabric.productStructure || fabric.product_structure;
  if (typeof struct === 'string') {
    try {
      struct = JSON.parse(struct);
    } catch {
      struct = null;
    }
  }

  const configuredSubParts =
    Array.isArray(struct?.subParts) && struct.subParts.length > 0
      ? struct.subParts
      : Array.isArray(struct?.parts) && struct.parts.length > 0
        ? struct.parts
        : [];

  const linkedCuttings = cuttings.filter(
    (c) => c.fabricId === fabric.id || c.fabric_id === fabric.id
  );
  const linkedCuttingIds = linkedCuttings.map((c) => c.id);

  // 1. Master handovers verified by Admin (Step 3 intake - full amount without delivered deduction)
  const linkedHandovers = masterHandovers.filter(
    (mh) =>
      ((mh.fabricId === fabric.id || mh.fabric_id === fabric.id) ||
        linkedCuttingIds.includes(mh.cuttingId) ||
        linkedCuttingIds.includes(mh.cutting_id)) &&
      mh.status === 'Verified'
  );

  const verifiedSubPartsMap = {};
  linkedHandovers.forEach((h) => {
    const parts =
      h.subParts && typeof h.subParts === 'object'
        ? h.subParts
        : h.parts && typeof h.parts === 'object'
          ? h.parts
          : null;
    if (parts) {
      Object.entries(parts).forEach(([k, v]) => {
        const cleanKey = resolvePieceLabel(k, struct) || formatPieceName(k);
        const count = parseInt(v, 10) || 0;
        if (count > 0) {
          verifiedSubPartsMap[cleanKey] = (verifiedSubPartsMap[cleanKey] || 0) + count;
        }
      });
    } else if (h.subPart || h.sub_part || h.partName) {
      const cleanKey = resolvePieceLabel(h.subPart || h.sub_part || h.partName, struct);
      const count = parseInt(h.piecesCount ?? h.pieces ?? h.receivedQuantity, 10) || 0;
      if (count > 0) {
        verifiedSubPartsMap[cleanKey] = (verifiedSubPartsMap[cleanKey] || 0) + count;
      }
    }
  });

  const totalGrossVerifiedPieces = linkedHandovers.reduce(
    (sum, mh) => sum + (parseInt(mh.piecesCount ?? mh.pieces ?? mh.pieces_count ?? mh.receivedQuantity, 10) || 0),
    0
  );

  const totalAdminReceived = totalGrossVerifiedPieces > 0
    ? totalGrossVerifiedPieces
    : Object.values(verifiedSubPartsMap).reduce((s, v) => s + (parseInt(v, 10) || 0), 0) || verifiedPiecesCount || 0;

  // 2. Thread cutting assignments
  const linkedThreadJobs = (threadCuttingAssignments || []).filter(
    (tc) =>
      tc.fabricId === fabric.id ||
      tc.fabric_id === fabric.id ||
      linkedCuttingIds.includes(tc.cuttingId) ||
      linkedCuttingIds.includes(tc.cutting_id)
  );

  const isSkipJob = (tc) =>
    tc.status === 'Skipped' ||
    tc.actionType === 'skip' ||
    tc.action_type === 'skip';

  const threadAssignJobs = linkedThreadJobs.filter((tc) => !isSkipJob(tc));

  // Skipped Map (from threadCuttingAssignments & fabric metadata)
  const skippedMap = getFabricSubPartSkippedPieces(fabric, threadCuttingAssignments);

  // Subpart definitions
  const subPartDefs = configuredSubParts.length > 0
    ? configuredSubParts
    : [{ id: 'part_1', name: fabric.productName || 'Pieces', qty: 1 }];

  // Calculate each subpart trimming status
  const subPartList = subPartDefs.map((sp, idx) => {
    const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
    const spName = resolvePieceLabel(sp.name || sp.id, struct) || sp.name || `Part ${idx + 1}`;
    const pNorm = spName.toLowerCase().replace(/[^a-z0-9]+/g, '');

    // 1. Total verified pieces received for this component
    let verifiedPieces = verifiedSubPartsMap[spName] || 0;
    if (verifiedPieces === 0) {
      for (const [vk, vv] of Object.entries(verifiedSubPartsMap)) {
        if (vk.toLowerCase().replace(/[^a-z0-9]+/g, '') === pNorm) {
          verifiedPieces = vv;
          break;
        }
      }
    }
    if (verifiedPieces === 0) {
      if (subPartDefs.length === 1) {
        verifiedPieces = totalAdminReceived;
      } else {
        const targetSets = parseInt(fabric.targetSets ?? fabric.totalSets, 10) || 0;
        const ratio = parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1;
        if (targetSets > 0) {
          verifiedPieces = targetSets * ratio;
        }
      }
    }

    // Match thread cutting jobs for this subpart
    const spJobs = threadAssignJobs.filter((tc) => {
      const tcSub = (tc.subPart || tc.sub_part || '').toLowerCase().trim();
      const tcSubNorm = tcSub.replace(/[^a-z0-9]+/g, '');
      const tcSubResolved = (resolvePieceLabel(tc.subPart || tc.sub_part, struct) || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (tcSubNorm === pNorm || tcSubResolved === pNorm || tcSub === key) return true;
      return subPartDefs.length === 1 || (tc.notes && tc.notes.toLowerCase().includes(pNorm));
    });

    const masterTrimmed = getMasterVerifiedTrimmedPiecesForSubPart(
      linkedHandovers,
      key,
      spName,
      sp.id,
      configuredSubParts,
      threadCuttingAssignments
    );

    const adminAssignJobs = spJobs.filter((tc) => tc.createdByRole !== 'master');

    const adminCompletedTrimmed = adminAssignJobs.reduce((acc, tc) => {
      const assignedCount = parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0;
      const doneCount = parseInt(tc.completedPieces ?? tc.completedPSC ?? tc.completed_psc, 10) || 0;
      return acc + (tc.status === 'Completed' ? Math.max(assignedCount, doneCount) : doneCount);
    }, 0);

    const completedTrimmedPieces = masterTrimmed + adminCompletedTrimmed;

    const assignedTrimmedPieces = adminAssignJobs.reduce(
      (acc, tc) => acc + (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0),
      0
    );

    // Skipped pieces for this subpart
    let skippedPieces = 0;
    for (const [sk, sv] of Object.entries(skippedMap || {})) {
      const sNorm = sk.toLowerCase().replace(/[^a-z0-9]+/g, '');
      const sResolvedNorm = (resolvePieceLabel(sk, struct) || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (sNorm === pNorm || sResolvedNorm === pNorm || sNorm === key) {
        skippedPieces = Math.max(skippedPieces, parseInt(sv, 10) || 0);
      }
    }

    // In Progress pieces with Admin helpers
    const inProgressPieces = adminAssignJobs
      .filter((tc) => tc.status !== 'Completed')
      .reduce((acc, tc) => {
        const rem = Math.max(
          0,
          (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0) -
          (parseInt(tc.completedPieces ?? tc.completedPSC, 10) || 0)
        );
        return acc + rem;
      }, 0);

    // Pending pieces waiting for Admin trimming decision / helper assignment
    const pendingPieces = Math.max(
      0,
      verifiedPieces - completedTrimmedPieces - skippedPieces - inProgressPieces
    );

    // Ready pieces = completed trimmed + skipped
    const readyPieces = completedTrimmedPieces + skippedPieces;

    return {
      key,
      name: spName,
      verifiedPieces,
      grossVerifiedPieces: verifiedPieces,
      assignedTrimmedPieces,
      completedTrimmedPieces,
      skippedPieces,
      inProgressPieces,
      pendingPieces,
      readyPieces,
      ratio: parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1,
    };
  });

  const totalVerifiedPieces = subPartList.reduce((sum, p) => sum + p.verifiedPieces, 0) || totalAdminReceived;
  const totalPendingPieces = subPartList.reduce((sum, p) => sum + p.pendingPieces, 0);

  // Target Sets
  const targetSetsCalculated = subPartList.map((p) => Math.floor(p.verifiedPieces / (p.ratio || 1)));
  const totalSets = targetSetsCalculated.length > 0 ? Math.min(...targetSetsCalculated) : 0;

  const hasMultipleSubParts = subPartList.length > 1;

  const fabricName = fabric.fabricType || fabric.productName || 'Fabric Lot';
  const lotNo = fabric.lotNo ? `#${fabric.lotNo}` : '';
  const supplier = fabric.supplierName || 'Primary Supplier';

  // Check if standard Top + Pant/Lower pattern is present
  const topPart = subPartList.find((p) => p.name.toLowerCase().includes('top'));
  const pantPart = subPartList.find(
    (p) => p.name.toLowerCase().includes('pant') || p.name.toLowerCase().includes('bottom') || p.name.toLowerCase().includes('lower')
  );
  const hasTopAndPant = Boolean(topPart && pantPart && (topPart.pendingPieces > 0 || pantPart.pendingPieces > 0));

  const getSubPartInputQty = (partKey, maxPending) => {
    if (customPcs[partKey] !== undefined) {
      return customPcs[partKey];
    }
    return maxPending > 0 ? String(maxPending) : '';
  };

  const setSubPartInputQty = (partKey, val) => {
    setCustomPcs((prev) => ({ ...prev, [partKey]: val }));
  };

  const handleApplyPresetTrimTopSkipPant = () => {
    if (pantPart && pantPart.pendingPieces > 0) {
      setFabricThreadCuttingDecision(fabric.id, 'skipped', pantPart.key, pantPart.pendingPieces, true, pantPart.pendingPieces);
    }
    if (topPart && onChooseAssignTrimming) {
      const topQty = topPart.pendingPieces > 0 ? topPart.pendingPieces : topPart.verifiedPieces;
      onChooseAssignTrimming(topPart.key, topPart.name, topQty, { [topPart.key]: topQty });
    }
  };

  const handleSkipPcs = (part, qtyToSkip) => {
    const num = parseInt(qtyToSkip, 10);
    if (!num || num <= 0 || !part) return;
    const pending = part.pendingPieces || 0;
    if (pending <= 0) return;

    const actualDelta = Math.min(pending, num);
    if (actualDelta <= 0) return;

    setFabricThreadCuttingDecision(fabric.id, 'skipped', part.key, actualDelta, true, actualDelta);
    setSubPartInputQty(part.key, '');
  };

  const handleResetSubPart = (partKey) => {
    setFabricThreadCuttingDecision(fabric.id, null, partKey, 0);
    setSubPartInputQty(partKey, '');
  };

  const handleSkipAllPending = () => {
    subPartList.forEach((part) => {
      if (part.pendingPieces > 0) {
        setFabricThreadCuttingDecision(fabric.id, 'skipped', part.key, part.pendingPieces, true, part.pendingPieces);
      }
    });
  };

  const handleAssignPart = (part, inputVal) => {
    const qty = parseInt(inputVal, 10) || part.pendingPieces || part.verifiedPieces;
    if (onChooseAssignTrimming) {
      onChooseAssignTrimming(part.key, part.name, qty, { [part.key]: qty });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 text-left">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 text-left">
        {/* Header - Teal to Emerald Gradient */}
        <div className="p-3 sm:p-3.5 bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
              <Scissors className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-black tracking-tight leading-tight">
                  Thread Trimming Finishing Plan
                </h2>
                {lotNo && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 shrink-0">
                    {lotNo}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-teal-100 font-medium truncate mt-0.5">
                Admin Finishing &amp; Delivery Prep
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-3 sm:p-3.5 space-y-2.5 overflow-y-auto flex-1 text-left">
          {/* Fabric Lot Context Pill - Compact */}
          <div className="p-2.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black text-slate-900 truncate block">
                  {fabricName}
                </span>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">Supplier: <strong className="text-slate-700">{supplier}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Received</span>
                  <span className="text-xs font-black text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200/80 inline-block shadow-2xs">
                    {totalVerifiedPieces.toLocaleString('en-IN')} PCs {totalSets > 0 ? `(${totalSets} Sets)` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase text-amber-600 block">Pending</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg border inline-block shadow-2xs ${
                    totalPendingPieces > 0
                      ? 'text-amber-800 bg-amber-50 border-amber-200'
                      : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  }`}>
                    {totalPendingPieces > 0 ? `${totalPendingPieces} PCs` : '✓ Done'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Smart Preset (if Top + Pant exist) */}
          {hasTopAndPant && (
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-indigo-500/10 border border-amber-300/60 flex items-center justify-between gap-2 flex-wrap">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1 text-xs font-black text-amber-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Kurti Set Quick Preset</span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium leading-tight">
                  Trim <strong>{topPart.name} ({topPart.verifiedPieces} PCs)</strong> &amp; skip <strong>{pantPart.name} ({pantPart.verifiedPieces} PCs)</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplyPresetTrimTopSkipPant}
                className="px-2.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg text-[11px] font-black shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
              >
                <span>⚡ Trim Top, Skip Pant</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Component-by-Component Section */}
          {hasMultipleSubParts ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between pt-0.5">
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Component Trimming Breakdown ({subPartList.length} Items)</span>
                </h3>
              </div>

              <div className="space-y-2">
                {subPartList.map((part) => {
                  const inputVal = getSubPartInputQty(part.key, part.pendingPieces);
                  const isDone = part.pendingPieces === 0;

                  return (
                    <div
                      key={part.key}
                      className={`p-2.5 sm:p-3 rounded-2xl border transition-all space-y-2 ${
                        isDone
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : 'border-slate-200/90 bg-white shadow-2xs'
                      }`}
                    >
                      {/* Component Title & Ledger Badges */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {part.name}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/70 shrink-0">
                            {part.verifiedPieces} Total
                          </span>
                        </div>

                        {/* Summary Badges */}
                        <div className="flex items-center gap-1 flex-wrap text-[9px] sm:text-[10px] font-bold">
                          {(part.completedTrimmedPieces > 0 || part.assignedTrimmedPieces > 0) && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {part.completedTrimmedPieces > 0 ? `${part.completedTrimmedPieces} Trimmed` : `${part.assignedTrimmedPieces} Assigned`}
                            </span>
                          )}
                          {part.inProgressPieces > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200">
                              {part.inProgressPieces} In Prog
                            </span>
                          )}
                          {part.skippedPieces > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {part.skippedPieces} Skipped
                            </span>
                          )}
                          {part.pendingPieces > 0 ? (
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {part.pendingPieces} Pending
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" />
                              Ready
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Component Actions Block */}
                      {part.pendingPieces > 0 ? (
                        <div className="p-2 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-1.5">
                          {/* Stepper helper buttons */}
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              Action Qty:
                            </span>
                            <div className="flex items-center gap-1">
                              {[10, 25, 50].map((step) => (
                                <button
                                  key={step}
                                  type="button"
                                  onClick={() => {
                                    const cur = parseInt(inputVal, 10) || 0;
                                    const nxt = Math.min(part.pendingPieces, cur + step);
                                    setSubPartInputQty(part.key, String(nxt));
                                  }}
                                  className="px-1.5 py-0.5 bg-white hover:bg-slate-200 text-slate-600 rounded text-[9px] font-bold border border-slate-200 cursor-pointer active:scale-95"
                                >
                                  +{step}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setSubPartInputQty(part.key, String(part.pendingPieces))}
                                className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded text-[9px] font-bold border border-teal-200 cursor-pointer active:scale-95"
                              >
                                Max ({part.pendingPieces})
                              </button>
                            </div>
                          </div>

                          {/* Controls Row: Input + Assign Button + Skip Button */}
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              max={part.pendingPieces}
                              value={inputVal}
                              placeholder={String(part.pendingPieces)}
                              onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                              onChange={(e) => {
                                const sanitized = sanitizeInteger(e.target.value, {
                                  min: 1,
                                  max: part.pendingPieces,
                                });
                                setSubPartInputQty(part.key, sanitized);
                              }}
                              className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 text-center focus:outline-none focus:border-teal-500 shadow-2xs"
                            />

                            {/* Assign button */}
                            <button
                              type="button"
                              onClick={() => handleAssignPart(part, inputVal)}
                              className="flex-1 py-1.5 px-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer truncate"
                            >
                              <Scissors className="w-3 h-3 shrink-0" />
                              <span className="truncate">Assign {inputVal || part.pendingPieces} Trim</span>
                            </button>

                            {/* Skip button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleSkipPcs(
                                  part,
                                  inputVal || part.pendingPieces
                                )
                              }
                              className="flex-1 py-1.5 px-2 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate"
                              title="Skip trimming and make directly ready for delivery"
                            >
                              <Truck className="w-3 h-3 shrink-0" />
                              <span className="truncate">Skip {inputVal || part.pendingPieces}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-0.5 text-[11px]">
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>All {part.verifiedPieces} decided ({part.readyPieces} ready)</span>
                          </span>
                          {part.skippedPieces > 0 && (
                            <button
                              type="button"
                              onClick={() => handleResetSubPart(part.key)}
                              className="text-[10px] text-slate-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Reset skipped count for this part to allow re-assignment"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Single Component Layout */
            <div className="space-y-2">
              {subPartList.length > 0 && (
                <div className="p-3 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-2xs">
                  {subPartList.map((part) => {
                    const inputVal = getSubPartInputQty(part.key, part.pendingPieces);
                    return (
                      <div key={part.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-black text-slate-900">{part.name}</span>
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {part.verifiedPieces} Total PCs
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                          <div className="p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[9px] text-slate-400 block font-bold uppercase">Assigned</span>
                            <span className="font-extrabold text-indigo-700 text-xs">{part.assignedTrimmedPieces} PCs</span>
                          </div>
                          <div className="p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[9px] text-slate-400 block font-bold uppercase">Skipped</span>
                            <span className="font-extrabold text-emerald-700 text-xs">{part.skippedPieces} PCs</span>
                          </div>
                          <div className="p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[9px] text-slate-400 block font-bold uppercase">Pending</span>
                            <span className="font-extrabold text-amber-700 text-xs">{part.pendingPieces} PCs</span>
                          </div>
                        </div>

                        {part.pendingPieces > 0 ? (
                          <div className="space-y-1.5 pt-1 border-t border-slate-100">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                              <span className="text-[10px] uppercase text-slate-400">Action Quantity:</span>
                              <button
                                type="button"
                                onClick={() => setSubPartInputQty(part.key, String(part.pendingPieces))}
                                className="text-teal-700 text-[10px] font-bold hover:underline cursor-pointer"
                              >
                                Max ({part.pendingPieces})
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                max={part.pendingPieces}
                                value={inputVal}
                                placeholder={String(part.pendingPieces)}
                                onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                                onChange={(e) =>
                                  setSubPartInputQty(
                                    part.key,
                                    sanitizeInteger(e.target.value, { min: 1, max: part.pendingPieces })
                                  )
                                }
                                className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 text-center focus:outline-none focus:border-teal-500 shadow-2xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleAssignPart(part, inputVal)}
                                className="flex-1 py-1.5 px-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate"
                              >
                                <Scissors className="w-3 h-3 shrink-0" />
                                <span className="truncate">Assign {inputVal || part.pendingPieces} Trim</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleSkipPcs(
                                    part,
                                    inputVal || part.pendingPieces
                                  )
                                }
                                className="flex-1 py-1.5 px-2 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate"
                              >
                                <Truck className="w-3 h-3 shrink-0" />
                                <span className="truncate">Skip {inputVal || part.pendingPieces}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              All pieces decided ({part.readyPieces} ready)
                            </span>
                            {part.skippedPieces > 0 && (
                              <button
                                type="button"
                                onClick={() => handleResetSubPart(part.key)}
                                className="text-[10px] text-slate-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Reset</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Action Footer with Bulk Operations */}
        <div className="p-2.5 sm:p-3 border-t border-slate-100 bg-white/95 backdrop-blur-xs flex items-center justify-between gap-2 shrink-0 shadow-lg">
          {totalPendingPieces > 0 ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={handleSkipAllPending}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 truncate"
                title="Skip trimming for all pending pieces"
              >
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Skip All ({totalPendingPieces})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const pendingMap = {};
                  subPartList.forEach((part) => {
                    if (part.pendingPieces > 0) {
                      pendingMap[part.key] = part.pendingPieces;
                    }
                  });
                  if (onChooseAssignTrimming) {
                    onChooseAssignTrimming(null, 'All', totalPendingPieces, pendingMap);
                  }
                }}
                className="px-2.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 truncate"
                title="Trim all pending pieces"
              >
                <Scissors className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Trim All ({totalPendingPieces})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All Pieces Decided &amp; Handover Ready</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-20 sm:w-24 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer shrink-0 text-center active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
