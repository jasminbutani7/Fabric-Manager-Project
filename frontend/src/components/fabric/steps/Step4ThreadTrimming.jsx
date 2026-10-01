import React, { useState } from 'react';
import {
  Check,
  ArrowRight,
  ChevronDown,
  Lock,
  Clock,
} from 'lucide-react';
import ThreadCuttingTracking from './ThreadCuttingTracking';
import { resolvePieceLabel } from '../../../utils/productUtils';

export default function Step4ThreadTrimming({
  fabric: f,
  struct,
  isStep4Open,
  toggleStep4,
  totalVerifiedPieces = 0,
  threadCuttedCount = 0,
  totalSkippedCount = 0,
  piecesAwaitingTrimming = 0,
  inProgressThreadCount = 0,
  allPieceNames = [],
  verifiedSubPartsMap = {},
  threadCuttedSubPartsMap = {},
  skippedMap = {},
  inProgressSubPartsMap = {},
  awaitingTrimmingSubPartsMap = {},
  onOpenTrimmingDecisionModal,
  navigate,
  totalReceivedFromMaster: _totalReceivedFromMaster = 0,
  targetPiecesForStep3 = 0,
  receivedPercent: _receivedPercent = 0,
  pendingFromMaster: _pendingFromMaster = 0,
  remainingFromMaster: _remainingFromMaster = 0,
  verifiedFromMaster: _verifiedFromMaster = 0,
  targetSets = 0,
  subPartsList: _subPartsList = [],
  targetPiecesMap = {},
  receivedSubPartsMap: _receivedSubPartsMap = {},
  remainingPiecesMap: _remainingPiecesMap = {},
  totalCutPieces: _totalCutPieces = 0,
  cutPercent: _cutPercent = 0,
  totalCutSets: _totalCutSets = 0,
  cutGroups = [],
  totalStitchedPieces: _totalStitchedPieces = 0,
  stitchingPercent: _stitchingPercent = 0,
  totalTailorAssignedPieces: _totalTailorAssignedPieces = 0,
  totalPendingTailorPieces: _totalPendingTailorPieces = 0,
  totalTargetGarmentPieces: _totalTargetGarmentPieces = 0,
  stitchedSubPartsBreakdown: _stitchedSubPartsBreakdown = {},
  assignedTailorSubPartsBreakdown: _assignedTailorSubPartsBreakdown = {},
  lotThreadJobs = [],
  updateThreadCuttingProgress,
}) {
  const [showTrimmingLogs, setShowTrimmingLogs] = useState(false);

  const sortedThreadJobs = (() => {
    const list = Array.isArray(lotThreadJobs) ? [...lotThreadJobs] : [];
    return list.sort((a, b) => {
      const timeA = new Date(a.completionDate || a.assignedDate || a.createdAt || a.created_at || 0).getTime();
      const timeB = new Date(b.completionDate || b.assignedDate || b.createdAt || b.created_at || 0).getTime();
      return timeB - timeA;
    });
  })();
  return (
    <div className="rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/60 via-slate-50/80 to-emerald-50/40 overflow-hidden shadow-2xs transition-all">
      {/* Header */}
      <div
        onClick={toggleStep4}
        className="p-2.5 sm:p-3 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-teal-100/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 shadow-2xs ${threadCuttedCount > 0 || totalSkippedCount > 0
              ? 'bg-teal-600'
              : 'bg-slate-400'
              }`}
          >
            {threadCuttedCount > 0 || totalSkippedCount > 0 ? (
              <Check className="w-3 h-3 stroke-[3]" />
            ) : (
              <span className="text-[10px] font-black">4</span>
            )}
          </span>
          <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-950">
              Step 4: Thread Cutting
            </span>
            <span className="text-xs font-black text-slate-900 truncate">
              • {totalVerifiedPieces > 0 ? `${totalVerifiedPieces} Admin Received • ` : ''}{threadCuttedCount} Cutted • {totalSkippedCount} Skipped (Locked)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-lg border border-teal-200 hidden xs:inline">
            {piecesAwaitingTrimming > 0 ? `${piecesAwaitingTrimming} Awaiting` : 'Ready'}
          </span>

          <button
            type="button"
            onClick={() => navigate('/orders?tab=thread_cutting')}
            className="p-1 sm:px-2 sm:py-1 rounded-lg text-teal-700 hover:text-teal-950 hover:bg-teal-50 transition-all flex items-center gap-1 text-[11px] font-bold border border-teal-200 bg-white shadow-2xs cursor-pointer"
            title="Show More"
          >
            <span className="hidden sm:inline">Show More</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleStep4}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-transform cursor-pointer"
            title={isStep4Open ? 'Collapse Step 4' : 'Expand Step 4'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isStep4Open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isStep4Open && (
        <div className="p-3 pt-0 border-t border-teal-100 animate-in fade-in duration-150 space-y-2.5">


          {/* Thread Cutting & Trimming Tracking (Step 4 Data in Step 3 Layout) */}
          <ThreadCuttingTracking
            fabric={f}
            struct={struct}
            totalVerifiedPieces={totalVerifiedPieces}
            threadCuttedCount={threadCuttedCount}
            totalSkippedCount={totalSkippedCount}
            piecesAwaitingTrimming={piecesAwaitingTrimming}
            inProgressThreadCount={inProgressThreadCount}
            allPieceNames={allPieceNames}
            verifiedSubPartsMap={verifiedSubPartsMap}
            threadCuttedSubPartsMap={threadCuttedSubPartsMap}
            skippedMap={skippedMap}
            inProgressSubPartsMap={inProgressSubPartsMap}
            awaitingTrimmingSubPartsMap={awaitingTrimmingSubPartsMap}
            cutGroups={cutGroups}
            targetPiecesMap={targetPiecesMap}
            targetSets={targetSets}
            targetPiecesForStep3={targetPiecesForStep3}
            onOpenTrimmingDecisionModal={onOpenTrimmingDecisionModal}
          />

          {/* Recent Trimming Logs with Show More / Hide */}
          {sortedThreadJobs.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                  Recent Trimming Logs ({sortedThreadJobs.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowTrimmingLogs(!showTrimmingLogs)}
                  className="text-[10px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-teal-50 active:scale-95 transition-all cursor-pointer"
                >
                  <span>{showTrimmingLogs ? 'Hide' : 'Show More'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showTrimmingLogs ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {showTrimmingLogs && (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5 animate-in fade-in duration-150">
                  {sortedThreadJobs.map((tc) => {
                    const isSkipped = tc.isSkippedRecord || tc.status === 'Skipped' || tc.actionType === 'skip' || tc.action_type === 'skip';
                    const isCompleted = tc.status === 'Completed';
                    const isPendingOrInProgress = !isSkipped && !isCompleted;
                    const pcs = parseInt(tc.assignedPSC ?? tc.pieces ?? tc.assignedPieces, 10) || 0;
                    const pName = tc.subPartName || (tc.subPart ? resolvePieceLabel(tc.subPart, struct) : null) || 'Pieces';
                    const dateStr = tc.completionDate || tc.assignedDate || (tc.createdAt && String(tc.createdAt).includes('T') ? tc.createdAt.split('T')[0] : 'Recent');

                    return (
                      <div
                        key={tc.id}
                        className="p-2 bg-white rounded-lg border border-slate-200/70 flex items-center justify-between gap-2 flex-wrap text-xs shadow-2xs hover:border-teal-300 transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${isCompleted
                              ? 'bg-emerald-500'
                              : isSkipped
                                ? 'bg-slate-400'
                                : 'bg-amber-500 animate-pulse'
                              }`}
                          />
                          <span className="font-extrabold text-slate-900">
                            +{pcs} PSC
                          </span>
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-200">
                            ({pName})
                          </span>
                          <span className="text-[11px] text-slate-500 truncate">
                            {isSkipped
                              ? 'Skipped & Locked'
                              : `by ${tc.helperName || 'Helper'}`}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            • {dateStr}
                          </span>
                          {isPendingOrInProgress && tc.completedPSC !== undefined && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              {tc.completedPSC || 0}/{pcs}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isCompleted ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 select-none">
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Trimmed</span>
                            </span>
                          ) : isSkipped ? (
                            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1 select-none">
                              <Lock className="w-2.5 h-2.5 text-slate-500" />
                              <span>Skipped</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 select-none">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                <span>In Progress</span>
                              </span>
                              {updateThreadCuttingProgress && (
                                <button
                                  type="button"
                                  onClick={() => updateThreadCuttingProgress(tc.id, pcs, true)}
                                  className="px-2 py-0.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer transition-all"
                                  title="Mark All Done"
                                >
                                  Done
                                </button>
                              )}
                            </div>
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
