import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Scissors,
  IndianRupee,
  AlertTriangle,
  Lock,
  Sparkles,
  Layers,
  Plus,
  Minus,
} from 'lucide-react';
import { sanitizeInteger, sanitizeDecimal, blockInvalidNumberKeys } from '../../utils/formValidation';
import { resolvePieceLabel } from '../../utils/productUtils';
import { isAssistantHelper, isExternalHelper } from '../../utils/masterHelpers';
import CustomSelect from '../common/CustomSelect';
import { useProduction } from '../../context/useManagement';

export default function MasterAssignTrimmingModal({
  isOpen,
  onClose,
  onSuccess,
  master,
  fabrics = [],
  cuttings = [],
  helpers = [],
  initialFabricId = null,
  initialCuttingId = null,
  initialSubPart = null,
  initialMode = 'assign', // 'assign' | 'skip'
  assignThreadCutting,
}) {
  const todayStr = new Date().toISOString().split('T')[0];

  const {
    tailorAssignments = [],
    threadCuttingAssignments = [],
  } = useProduction();

  const [mode, setMode] = useState(initialMode); // 'assign' | 'skip'
  const [selectedFabricId, setSelectedFabricId] = useState(initialFabricId || '');
  const [selectedCuttingId, setSelectedCuttingId] = useState(initialCuttingId || '');
  const [selectedSubPart, setSelectedSubPart] = useState(initialSubPart || '');
  const [selectedHelperId, setSelectedHelperId] = useState('');
  const [helperType, setHelperType] = useState('internal'); // 'internal' | 'external'
  const [assignedPSC, setAssignedPSC] = useState('');
  const [partQuantities, setPartQuantities] = useState({});
  const [ratePerPSC, setRatePerPSC] = useState('');
  const [assignedDate, setAssignedDate] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wasOpenRef = useRef(false);

  // Only reset/initialize form when the modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const available = helpers.filter(
        (h) => !h.isArchived && h.status !== 'Left' && !isExternalHelper(h)
      );
      const firstH = available[0];
      const isExt = firstH ? isExternalHelper(firstH) : false;
      const initialRate = isExt ? String(firstH.defaultRatePerPiece || firstH.defaultRatePerPSC || 2.5) : '';

      const timer = setTimeout(() => {
        setMode(initialMode || 'assign');
        setSelectedFabricId(initialFabricId || (fabrics[0]?.id || ''));
        setSelectedCuttingId(initialCuttingId || '');
        setSelectedSubPart(initialSubPart || '');
        setAssignedDate(todayStr);
        setPartQuantities({});
        setAssignedPSC('');
        setNotes('');
        setErrorMessage('');
        setIsSubmitting(false);

        if (firstH) {
          setSelectedHelperId(firstH.id);
          setHelperType(isExt ? 'external' : 'internal');
          setRatePerPSC(initialRate);
        }
      }, 0);
      wasOpenRef.current = isOpen;
      return () => clearTimeout(timer);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialFabricId, initialCuttingId, initialSubPart, initialMode, todayStr, helpers, fabrics]);

  // Safe fallback if fabric list arrives after open
  useEffect(() => {
    if (isOpen && !selectedFabricId && fabrics.length > 0) {
      const timer = setTimeout(() => {
        setSelectedFabricId((prev) => prev || initialFabricId || fabrics[0]?.id || '');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedFabricId, fabrics, initialFabricId]);

  // Selected fabric object & structure
  const selectedFabric = fabrics.find((f) => String(f.id) === String(selectedFabricId)) || fabrics[0] || null;
  const struct = selectedFabric?.productStructure || null;
  const subParts = useMemo(() => struct?.subParts || [], [struct?.subParts]);

  // Calculate pending tailor pieces per subpart for this fabric
  const subPartPendingInfo = useMemo(() => {
    if (!selectedFabric) return {};
    const fId = String(selectedFabric.id);
    const fabricCuttings = cuttings.filter(
      (c) => String(c.fabricId || c.fabric_id) === fId
    );
    const cuttingIds = new Set(fabricCuttings.map((c) => String(c.id)));

    // 1. Tailor accepted pieces per subpart
    const stitchedMap = {};
    const relevantAssignments = tailorAssignments.filter(
      (a) => String(a.fabricId) === fId || cuttingIds.has(String(a.cuttingId))
    );
    relevantAssignments.forEach((a) => {
      (a.dailySubmissions || []).forEach((sub) => {
        if (sub.approvalStatus === 'Approved') {
          if (sub.subParts && typeof sub.subParts === 'object') {
            Object.entries(sub.subParts).forEach(([k, v]) => {
              const cleanK = k.toLowerCase().trim();
              stitchedMap[cleanK] = (stitchedMap[cleanK] || 0) + (parseInt(v, 10) || 0);
            });
          } else if (sub.parts && typeof sub.parts === 'object') {
            Object.entries(sub.parts).forEach(([k, v]) => {
              const cleanK = k.toLowerCase().trim();
              stitchedMap[cleanK] = (stitchedMap[cleanK] || 0) + (parseInt(v, 10) || 0);
            });
          }
        }
      });
    });

    // 2. Already assigned/skipped trimming pieces per subpart by Master
    const trimmedMap = {};
    const relevantThreadJobs = threadCuttingAssignments.filter((tc) => {
      if (tc.createdByRole && tc.createdByRole !== 'master') return false;
      const matchFabric = String(tc.fabricId) === fId || cuttingIds.has(String(tc.cuttingId));
      if (!matchFabric) return false;
      if (tc.createdByRole === 'master') {
        if (tc.masterId && master?.id) return String(tc.masterId) === String(master.id);
        return true;
      }
      return !tc.masterId || (master?.id && String(tc.masterId) === String(master.id));
    });
    relevantThreadJobs.forEach((tc) => {
      const spKey = (tc.subPart || tc.sub_part || '').toLowerCase().trim();
      const assigned = parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0;
      if (spKey) {
        trimmedMap[spKey] = (trimmedMap[spKey] || 0) + assigned;
      }
    });

    const res = {};
    subParts.forEach((sp) => {
      const spKey = (sp.id || sp.name || '').toLowerCase().trim();
      const stitched = stitchedMap[spKey] || stitchedMap[sp.id] || stitchedMap[sp.name] || 0;
      const alreadyAssigned = trimmedMap[spKey] || trimmedMap[sp.id] || trimmedMap[sp.name] || 0;
      const pending = Math.max(0, stitched - alreadyAssigned);
      res[sp.id] = {
        name: sp.name,
        stitched,
        alreadyAssigned,
        pending,
      };
    });
    return res;
  }, [selectedFabric, cuttings, tailorAssignments, threadCuttingAssignments, subParts, master]);

  // Helpers available to Master: Assistant + Internal helpers only (strictly no external helpers)
  const masterHelpers = helpers.filter(
    (h) => !h.isArchived && h.status !== 'Left' && !isExternalHelper(h)
  );

  // When helper selection changes, update helperType and default rate
  const handleHelperChange = (hId) => {
    setSelectedHelperId(hId);
    setErrorMessage('');
    const helper = helpers.find((h) => String(h.id) === String(hId));
    if (helper) {
      const isExt = isExternalHelper(helper);
      setHelperType(isExt ? 'external' : 'internal');
      if (isExt) {
        setRatePerPSC(String(helper.defaultRatePerPiece || helper.defaultRatePerPSC || 2.5));
      } else {
        setRatePerPSC('');
      }
    }
  };

  const handlePartChange = (partId, val) => {
    setErrorMessage('');
    const maxAvail = subPartPendingInfo[partId]?.pending !== undefined ? subPartPendingInfo[partId].pending : 99999;
    const sanitized = sanitizeInteger(val, { min: 0, max: maxAvail });
    setPartQuantities((prev) => ({
      ...prev,
      [partId]: sanitized,
    }));
  };

  const handlePartStep = (partId, delta) => {
    setErrorMessage('');
    const current = parseInt(partQuantities[partId], 10) || 0;
    const maxAvail = subPartPendingInfo[partId]?.pending !== undefined ? subPartPendingInfo[partId].pending : 99999;
    const next = Math.max(0, Math.min(maxAvail, current + delta));
    setPartQuantities((prev) => ({
      ...prev,
      [partId]: next > 0 ? String(next) : '',
    }));
  };

  const handleFillAllSets = () => {
    setErrorMessage('');
    const pendings = subParts.map((sp) => subPartPendingInfo[sp.id]?.pending || 0);
    const minPending = pendings.length > 0 ? Math.min(...pendings) : 0;
    if (minPending <= 0) {
      setErrorMessage('No complete sets available to trim.');
      return;
    }
    const next = {};
    subParts.forEach((sp) => {
      next[sp.id] = String(minPending);
    });
    setPartQuantities(next);
  };

  const handleClearAll = () => {
    setErrorMessage('');
    setPartQuantities({});
  };

  const totalPiecesEntered = subParts.length > 1
    ? Object.values(partQuantities).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0)
    : (parseInt(assignedPSC, 10) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedFabric) {
      setErrorMessage('Please select a fabric lot.');
      return;
    }

    if (subParts.length > 1) {
      if (totalPiecesEntered <= 0) {
        setErrorMessage('Please enter pieces to trim for at least one subpart.');
        return;
      }
    } else {
      const pscNum = parseInt(assignedPSC, 10);
      if (!pscNum || pscNum <= 0) {
        setErrorMessage('Please enter a valid piece count.');
        return;
      }
    }

    if (mode === 'assign' && !selectedHelperId) {
      setErrorMessage('Please select a helper for trimming.');
      return;
    }

    setIsSubmitting(true);

    const helper = helpers.find((h) => String(h.id) === String(selectedHelperId));
    const finalRate = helperType === 'external' ? parseFloat(ratePerPSC) || 0 : 0;

    try {
      if (subParts.length > 1) {
        let anyFailed = false;
        let lastAssignment = null;

        for (const sp of subParts) {
          const qty = parseInt(partQuantities[sp.id], 10) || 0;
          if (qty > 0) {
            const payload = {
              fabricId: selectedFabric.id,
              cuttingId: selectedCuttingId || null,
              fabricName: selectedFabric.fabricType || selectedFabric.productName || 'Fabric Lot',
              subPart: sp.id,
              subPartName: sp.name || resolvePieceLabel(sp.id, struct),
              masterId: master?.id || null,
              masterName: master?.name || 'Cutting Master',
              createdByRole: 'master',
              assignedDate,
              notes: notes.trim(),
              assignedPSC: qty,
            };

            if (mode === 'skip') {
              payload.helperId = null;
              payload.helperName = 'Direct Handover (Skipped Trimming)';
              payload.helperType = 'skip';
              payload.status = 'Skipped';
              payload.actionType = 'skip';
              payload.ratePerPSC = 0;
            } else {
              payload.helperId = helper?.id || selectedHelperId;
              payload.helperName = helper?.name || 'Helper';
              payload.helperPhone = helper?.phone || '';
              payload.helperType = helperType;
              payload.status = 'In Progress';
              payload.actionType = 'assign';
              payload.ratePerPSC = finalRate;
            }

            const res = assignThreadCutting(payload);
            if (res?.success) {
              lastAssignment = res.assignment;
            } else {
              anyFailed = true;
              setErrorMessage(res?.error || (mode === 'skip' ? `Failed to skip trimming for ${sp.name}` : `Failed to assign trimming for ${sp.name}`));
              break;
            }
          }
        }

        if (!anyFailed) {
          if (onSuccess) onSuccess(lastAssignment);
          onClose();
        }
      } else {
        const pscNum = parseInt(assignedPSC, 10);
        const subPartObj = subParts[0] || null;
        const subPartName = subPartObj?.name || (selectedSubPart ? resolvePieceLabel(selectedSubPart, struct) : null);

        const payload = {
          fabricId: selectedFabric.id,
          cuttingId: selectedCuttingId || null,
          fabricName: selectedFabric.fabricType || selectedFabric.productName || 'Fabric Lot',
          subPart: selectedSubPart || subPartObj?.id || null,
          subPartName,
          masterId: master?.id || null,
          masterName: master?.name || 'Cutting Master',
          createdByRole: 'master',
          assignedDate,
          notes: notes.trim(),
          assignedPSC: pscNum,
        };

        if (mode === 'skip') {
          payload.helperId = null;
          payload.helperName = 'Direct Handover (Skipped Trimming)';
          payload.helperType = 'skip';
          payload.status = 'Skipped';
          payload.actionType = 'skip';
          payload.ratePerPSC = 0;
        } else {
          payload.helperId = helper?.id || selectedHelperId;
          payload.helperName = helper?.name || 'Helper';
          payload.helperPhone = helper?.phone || '';
          payload.helperType = helperType;
          payload.status = 'In Progress';
          payload.actionType = 'assign';
          payload.ratePerPSC = finalRate;
        }

        const res = assignThreadCutting(payload);
        if (res?.success) {
          if (onSuccess) onSuccess(res.assignment);
          onClose();
        } else {
          setErrorMessage(res?.error || (mode === 'skip' ? 'Failed to skip trimming.' : 'Failed to save trimming job.'));
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error creating trimming job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-tight">
                {mode === 'skip' ? 'Skip Trimming (Floor Level)' : 'Assign Floor Trimming'}
              </h3>
              <p className="text-[11px] text-teal-100">
                {master?.name} • Cutting &amp; Trimming Floor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tab (Assign to Helper vs Skip Trimming) */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('assign');
              setErrorMessage('');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'assign'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Assign Helper</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('skip');
              setErrorMessage('');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'skip'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Skip Trimming</span>
          </button>
        </div>

        {/* Form Container with Sticky Footer and Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-left text-xs">
          {/* Scrollable Form Body */}
          <div className="p-4 space-y-3.5 overflow-y-auto flex-1 min-h-0">
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Fabric Lot Selection */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Fabric Lot</label>
            <CustomSelect
              value={selectedFabricId}
              onChange={(val) => {
                setSelectedFabricId(val);
                setSelectedCuttingId('');
                setSelectedSubPart('');
                setPartQuantities({});
                setAssignedPSC('');
                setErrorMessage('');
              }}
              options={fabrics.map((f) => ({
                value: f.id,
                label: `${f.fabricType || f.productName || 'Lot'} (${f.lotNo ? `Lot #${f.lotNo}` : 'Active'})`,
              }))}
              placeholder="Select Fabric Lot"
            />
          </div>

          {/* Subpart breakdown if fabric has multiple parts (e.g. TOP & BOTTOM) */}
          {subParts.length > 1 ? (
            <div className="space-y-2.5 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-600" />
                  {mode === 'skip' ? 'Pieces to Skip per Subpart' : 'Pieces to Trim per Subpart'}
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleFillAllSets}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-colors flex items-center gap-1"
                    title="Fill all parts equally up to maximum complete sets"
                  >
                    <Sparkles className="w-3 h-3" />
                    Fill All Sets
                  </button>
                  {totalPiecesEntered > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {subParts.map((sp) => {
                  const pInfo = subPartPendingInfo[sp.id] || { stitched: 0, pending: 0, alreadyAssigned: 0 };
                  const qtyVal = partQuantities[sp.id] || '';
                  const qtyNum = parseInt(qtyVal, 10) || 0;
                  const isAvailable = pInfo.pending > 0;

                  return (
                    <div
                      key={sp.id}
                      className={`p-2.5 rounded-xl border transition-all ${
                        qtyNum > 0
                          ? 'border-teal-400 bg-teal-50/40 shadow-xs'
                          : isAvailable
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-100 bg-slate-50/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900 tracking-wide uppercase">
                              {sp.name}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              {resolvePieceLabel(sp.id, struct)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Tailor: <span className="font-bold text-slate-700">{pInfo.stitched}</span> • Pending: <span className={`font-bold ${pInfo.pending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{pInfo.pending}</span>
                          </div>
                        </div>

                        {/* Stepper + Input + Max */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handlePartStep(sp.id, -1)}
                            disabled={!qtyNum || qtyNum <= 0}
                            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700 font-black text-sm active:scale-95 transition-all"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            onKeyDown={blockInvalidNumberKeys}
                            value={qtyVal}
                            onChange={(e) => handlePartChange(sp.id, e.target.value)}
                            disabled={!isAvailable}
                            placeholder="0"
                            className="w-12 h-7 text-center font-black text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handlePartStep(sp.id, 1)}
                            disabled={!isAvailable || qtyNum >= pInfo.pending}
                            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700 font-black text-sm active:scale-95 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePartChange(sp.id, String(pInfo.pending))}
                            disabled={!isAvailable || qtyNum >= pInfo.pending}
                            className="px-2 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:pointer-events-none font-bold text-[10px] active:scale-95 transition-all"
                          >
                            Max
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total summary */}
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Total Selected:</span>
                <span className="font-black text-teal-700 text-sm">{totalPiecesEntered} PCs</span>
              </div>
            </div>
          ) : (
            <>
              {/* Optional SubPart Selector for single or none */}
              {subParts.length === 1 && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-xs">Subpart</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                    {subParts[0].name} ({resolvePieceLabel(subParts[0].id, struct)})
                  </div>
                </div>
              )}

              {/* Single Piece Quantity */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 block text-xs">
                    {mode === 'skip' ? 'Number of Pieces to Skip' : 'Number of Pieces to Trim'}
                  </label>
                  {selectedFabric && subParts.length === 1 && (
                    <span className="text-[10px] text-slate-500">
                      Pending: <strong className="text-amber-600">{subPartPendingInfo[subParts[0].id]?.pending || 0}</strong>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  onKeyDown={blockInvalidNumberKeys}
                  value={assignedPSC}
                  onChange={(e) => {
                    setErrorMessage('');
                    setAssignedPSC(sanitizeInteger(e.target.value, { min: 1, max: 100000 }));
                  }}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition-all text-xs"
                  required
                />
              </div>
            </>
          )}

          {/* Helper Selection (only in assign mode) */}
          {mode === 'assign' && (
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Floor Helper</label>
                <CustomSelect
                  value={selectedHelperId}
                  onChange={handleHelperChange}
                  options={[
                    { value: '', label: '-- Select Floor Helper --' },
                    ...masterHelpers.map((h) => ({
                      value: h.id,
                      label: `${h.name} (${isAssistantHelper(h) ? 'Assistant' : 'Internal Helper'})`,
                    })),
                  ]}
                  placeholder="Select Floor Helper"
                />
              </div>

              {/* Rate per PC only for External (Piece Rate) helpers. Staff helpers do not show Wage Type */}
              {selectedHelperId && helperType === 'external' && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block text-[11px]">Rate per PC (₹)</label>
                  <div className="relative">
                    <IndianRupee className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ratePerPSC}
                      onChange={(e) => setRatePerPSC(sanitizeDecimal(e.target.value, 2))}
                      placeholder="0.50"
                      className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date & Optional Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <label className="font-bold text-slate-600 block text-[11px]">Date</label>
              <input
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-600 block text-[11px]">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Batch note..."
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            </div>
          </div>

          {/* Sticky Pinned Modal Footer: Always visible, never hidden */}
          <div className="p-3 sm:p-4 bg-slate-50/95 border-t border-slate-200/90 backdrop-blur-xs flex items-center justify-end gap-2.5 shrink-0 shadow-xs z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                totalPiecesEntered <= 0 ||
                (mode === 'assign' && !selectedHelperId)
              }
              className={`px-4 py-2 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'skip'
                  ? 'bg-slate-800 hover:bg-slate-900'
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              {mode === 'skip' ? <Lock className="w-3.5 h-3.5" /> : <Scissors className="w-3.5 h-3.5" />}
              <span>{isSubmitting ? 'Saving...' : mode === 'skip' ? 'Confirm Skip' : 'Assign Helper'}</span>
              {totalPiecesEntered > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black">
                  {totalPiecesEntered} PCs
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
