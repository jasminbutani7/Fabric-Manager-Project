import React, { useState } from 'react';
import {
  Check,
  Clock,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { resolvePieceLabel } from '../../../utils/productUtils';
import ProductionCustodyTracking from './ProductionCustodyTracking';

export default function Step3FabricCutting({
  fabric: f,
  struct,
  isStep3Open,
  toggleStep3,
  totalReceivedFromMaster = 0,
  targetPiecesForStep3 = 0,
  receivedPercent = 0,
  pendingFromMaster = 0,
  remainingFromMaster = 0,
  verifiedFromMaster = 0,
  targetSets = 0,
  subPartsList = [],
  allPieceNames = [],
  targetPiecesMap = {},
  receivedSubPartsMap = {},
  verifiedSubPartsMap: _verifiedSubPartsMap = {},
  remainingPiecesMap: _remainingPiecesMap = {},
  totalCutPieces = 0,
  totalTargetCutPieces = 0,
  cutPercent = 0,
  totalCutSets = 0,
  cutGroups = [],
  totalStitchedPieces = 0,
  stitchingPercent = 0,
  totalTailorAssignedPieces = 0,
  totalPendingTailorPieces = 0,
  totalTargetGarmentPieces = 0,
  stitchedSubPartsBreakdown = {},
  assignedTailorSubPartsBreakdown = {},
  lotHandovers = [],
  verifyingHandoverId,
  setVerifyingHandoverId,
  verifyMasterHandover,
  navigate,
}) {
  const [showHandoverLogs, setShowHandoverLogs] = useState(false);

  const getHandoverItemBreakdown = (h) => {
    const parts =
      h.subParts && typeof h.subParts === 'object'
        ? h.subParts
        : h.parts && typeof h.parts === 'object'
          ? h.parts
          : null;
    if (parts) {
      const entries = Object.entries(parts)
        .map(([k, v]) => {
          const count = parseInt(v, 10) || 0;
          if (count <= 0) return null;
          return `${resolvePieceLabel(k, struct)}: ${count} PCs`;
        })
        .filter(Boolean);
      if (entries.length > 0) return entries.join(', ');
    }
    if (h.combinationFormula && typeof h.combinationFormula === 'string' && h.combinationFormula.trim()) {
      return h.combinationFormula;
    }
    if (h.subPart || h.sub_part || h.partName) {
      const pName = resolvePieceLabel(h.subPart || h.sub_part || h.partName, struct);
      const count = parseInt(h.piecesCount ?? h.pieces ?? h.receivedQuantity, 10) || 0;
      return count > 0 ? `${pName}: ${count} PCs` : pName;
    }
    if (subPartsList.length === 1) {
      const pName = subPartsList[0].name || f.productName || 'Piece';
      const count = parseInt(h.piecesCount ?? h.pieces ?? h.receivedQuantity, 10) || 0;
      return count > 0 ? `${pName}: ${count} PCs` : pName;
    }
    return null;
  };

  const remTailorPieces = totalTailorAssignedPieces > 0
    ? totalPendingTailorPieces
    : Math.max(0, totalTargetGarmentPieces - totalStitchedPieces);

  const isStep3Complete =
    totalReceivedFromMaster > 0 &&
    pendingFromMaster === 0 &&
    remainingFromMaster === 0 &&
    remTailorPieces === 0;

  return (
    <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-slate-50/80 to-emerald-50/40 overflow-hidden shadow-2xs transition-all">
      {/* Header */}
      <div
        onClick={toggleStep3}
        className="p-2.5 sm:p-3 flex items-start sm:items-center justify-between gap-2 cursor-pointer select-none hover:bg-amber-100/40 transition-colors"
      >
        <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
          <span
            className={`w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5 sm:mt-0 ${isStep3Complete
              ? 'bg-emerald-600'
              : pendingFromMaster > 0
                ? 'bg-amber-500'
                : totalReceivedFromMaster > 0
                  ? 'bg-amber-600'
                  : 'bg-amber-500'
              }`}
          >
            {isStep3Complete ? (
              <Check className="w-3 h-3 stroke-[3]" />
            ) : pendingFromMaster > 0 ? (
              <Clock className="w-3 h-3 stroke-[2.5]" />
            ) : (
              <span className="text-[10px] font-black">3</span>
            )}
          </span>
          <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5 sm:gap-1">
            {/* Row 1: Step Title */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-950 truncate">
                Step 3: Getting PCs from Master
              </span>
            </div>

            {/* Row 2: Quantities + Status Badge moved DOWN */}
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="text-[11px] sm:text-xs font-black text-slate-900 truncate">
                • {totalReceivedFromMaster > 0
                  ? `${totalReceivedFromMaster.toLocaleString('en-IN')}${targetPiecesForStep3 > 0 ? ` / ${targetPiecesForStep3.toLocaleString('en-IN')}` : ''} PCs Received${targetPiecesForStep3 > 0 ? ` (${receivedPercent}%)` : ''}`
                  : `0 / ${targetPiecesForStep3 > 0 ? `${targetPiecesForStep3.toLocaleString('en-IN')} PCs` : `${targetSets} Sets`} Expected`}
              </span>

              {/* Status Badge placed neatly on Row 2 next to counts */}
              {pendingFromMaster > 0 ? (
                <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.2 rounded-md border border-amber-300 animate-pulse shrink-0">
                  {pendingFromMaster} In Review
                </span>
              ) : remTailorPieces > 0 ? (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.2 rounded-md border border-amber-200 shrink-0">
                  {verifiedFromMaster > 0 ? `${verifiedFromMaster} Verified • ` : ''}{remTailorPieces} Tailor Rem
                </span>
              ) : verifiedFromMaster > 0 ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.2 rounded-md border border-emerald-200 shrink-0 shadow-2xs">
                  {verifiedFromMaster} Verified
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.2 rounded-md border border-amber-200 shrink-0">
                  Awaiting Handover
                </span>
              )}

              {totalReceivedFromMaster > 0 && Object.keys(receivedSubPartsMap).length > 0 && (
                <span className="text-[10px] font-bold text-slate-600 bg-white/80 px-1.5 py-0.2 rounded border border-amber-200 shadow-2xs hidden sm:inline shrink-0">
                  ({Object.entries(receivedSubPartsMap).map(([p, c]) => `${p}: ${c} PCs`).join(' • ')})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons on right: Show More & Chevron */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 self-start sm:self-center mt-0.5 sm:mt-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate('/orders?tab=handovers')}
            className="p-1 sm:px-2 sm:py-1 rounded-lg text-amber-800 hover:text-amber-950 hover:bg-amber-50 transition-all flex items-center gap-1 text-[11px] font-bold border border-amber-200 bg-white shadow-2xs cursor-pointer"
            title="Show More"
          >
            <span className="hidden sm:inline">Show More</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleStep3}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-transform cursor-pointer"
            title={isStep3Open ? 'Collapse Step 3' : 'Expand Step 3'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isStep3Open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isStep3Open && (
        <div className="p-3 pt-0 border-t border-amber-100 animate-in fade-in duration-150 space-y-2.5">


          {/* Production & Custody Breakdown */}
          <ProductionCustodyTracking
            fabric={f}
            struct={struct}
            totalCutPieces={totalCutPieces}
            totalTargetCutPieces={totalTargetCutPieces}
            cutPercent={cutPercent}
            totalCutSets={totalCutSets}
            cutGroups={cutGroups}
            totalStitchedPieces={totalStitchedPieces}
            stitchingPercent={stitchingPercent}
            totalTailorAssignedPieces={totalTailorAssignedPieces}
            totalPendingTailorPieces={totalPendingTailorPieces}
            totalTargetGarmentPieces={totalTargetGarmentPieces}
            stitchedSubPartsBreakdown={stitchedSubPartsBreakdown}
            assignedTailorSubPartsBreakdown={assignedTailorSubPartsBreakdown}
            allPieceNames={allPieceNames}
            targetPiecesMap={targetPiecesMap}
            targetSets={targetSets}
            targetPiecesForStep3={targetPiecesForStep3}
            totalReceivedFromMaster={totalReceivedFromMaster}
            receivedSubPartsMap={receivedSubPartsMap}
          />

          {/* Received Handover Logs */}
          {lotHandovers.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                  Recent Handover Logs ({lotHandovers.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowHandoverLogs(!showHandoverLogs)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-indigo-50 active:scale-95 transition-all cursor-pointer"
                >
                  <span>{showHandoverLogs ? 'Hide' : 'Show More'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showHandoverLogs ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {showHandoverLogs && (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5 animate-in fade-in duration-150">
                  {lotHandovers.map((h) => {
                    const hPieces =
                      parseInt(h.piecesCount ?? h.pieces ?? h.receivedQuantity, 10) || 0;
                    const isHVerified = h.status === 'Verified';
                    const isHPending =
                      h.status === 'Pending Verification' ||
                      h.status === 'Pending' ||
                      !h.status;
                    const hPieceBreakdown = getHandoverItemBreakdown(h);

                    return (
                      <div
                        key={h.id}
                        className="p-2 bg-white rounded-lg border border-slate-200/70 flex items-center justify-between gap-2 flex-wrap text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${isHVerified ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                              }`}
                          />
                          <span className="font-extrabold text-slate-900">
                            +{hPieces} PCs
                          </span>
                          {hPieceBreakdown && (
                            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-200">
                              {hPieceBreakdown}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500 truncate">
                            from {h.masterName || f.assignedMasterName || 'Master'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            • {h.handoverDate || h.createdAt || 'Recent'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isHVerified ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              <span>Verified</span>
                            </span>
                          ) : isHPending ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>Pending</span>
                              </span>
                              <button
                                type="button"
                                disabled={verifyingHandoverId === h.id}
                                onClick={() => {
                                  setVerifyingHandoverId(h.id);
                                  verifyMasterHandover(h.id, 'Factory Admin');
                                  setTimeout(() => setVerifyingHandoverId(null), 300);
                                }}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer transition-all"
                              >
                                {verifyingHandoverId === h.id ? 'Accepting...' : 'Accept'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {h.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
