import React, { useState } from 'react';
import {
  Scissors,
  Plus,
  Lock,
  CheckCircle2,
  Check,
  Trash2,
  PackageCheck,
  X,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { resolvePieceLabel, getCleanDisplayNote } from '../../utils/productUtils';
import LotGroupHeader from './LotGroupHeader';
import PaginationControls from '../common/PaginationControls';

export default function TrimmingTab({
  _totalAdminReceivedPSC,
  _totalSkippedPSC,
  globalThreadStats,
  searchQuery,
  recordedExpenseSuccess,
  setRecordedExpenseSuccess,
  threadCuttingFilter,
  filteredSkippedBatches,
  filteredVerifiedHandovers,
  filteredThreadJobs,
  groupedVerifiedHandovers,
  groupedThreadJobs,
  groupingMode,
  collapsedLots,
  toggleLotCollapse,
  fabrics,
  today,
  setSelectedCuttingForThreadCutting,
  setSelectedHandoverForThreadCutting,
  setShowAssignThreadCuttingModal,
  setFabricThreadCuttingDecision,
  setProgressModalJob,
  setProgressModalPSC,
  updateThreadCuttingProgress,
  addExpense,
  linkThreadCuttingExpense,
  setDeleteThreadJobConfirm,
  _navigate,
}) {
  const [flatPage, setFlatPage] = useState(1);
  const [flatPageSize, setFlatPageSize] = useState(25);
  const [groupPage, setGroupPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(15);

  const renderSkippedCard = (rec) => {
    const pcs = parseInt(rec.totalSkipped ?? rec.pieces ?? rec.assignedPSC ?? rec.assignedPieces, 10) || 0;
    const pName = rec.subPartName || (rec.subPart ? rec.subPart.toUpperCase() : null);
    const skippedList = Object.entries(rec.skippedMap || {});
    const skippedBreakdown = pName && pcs
      ? `${pName.toUpperCase()}: ${pcs} PCs`
      : (skippedList.length > 0
        ? skippedList.map(([k, count]) => `${(resolvePieceLabel ? resolvePieceLabel(k, null) : k).toUpperCase()}: ${count} PCs`).join(', ')
        : `${pcs} PCs`);

    const formattedTime = rec.time
      ? rec.time
      : rec.timestamp && String(rec.timestamp).includes('T')
        ? new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        : rec.createdAt && String(rec.createdAt).includes('T')
          ? new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
          : '';

    const formattedDate = rec.date
      ? rec.date
      : rec.timestamp && String(rec.timestamp).includes('T')
        ? new Date(rec.timestamp).toLocaleDateString('en-CA')
        : rec.assignedDate || (rec.createdAt && String(rec.createdAt).includes('T') ? rec.createdAt.split('T')[0] : 'Recent');

    const displayFabric = rec.fabricName || rec.fabric?.fabricType || rec.fabric?.productName || '';
    const isMasterCreated = rec.createdByRole === 'master' || Boolean(rec.masterId);

    return (
      <div
        key={rec.id}
        className="p-2.5 bg-white rounded-xl border border-slate-200/80 text-xs shadow-2xs hover:border-slate-300 transition-all space-y-1.5"
      >
        {/* Top Row: Status Dot, Pieces, Breakdown, Creator Badge & Anchored Top-Right Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
            <span className="w-2 h-2 rounded-full shrink-0 bg-slate-400" />
            <span className="font-extrabold text-slate-900 text-xs sm:text-sm shrink-0">
              +{pcs} PSC
            </span>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
              ({skippedBreakdown})
            </span>
            {/* Creator Badge: Master vs Admin */}
            {isMasterCreated ? (
              <span
                className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
                title={`Skipped on floor by Master ${rec.masterName || ''}`}
              >
                <Scissors className="w-2.5 h-2.5 text-purple-600" />
                <span>By Master{rec.masterName ? `: ${rec.masterName}` : ''}</span>
              </span>
            ) : (
              <span
                className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
                title="Skipped by Factory Admin"
              >
                <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
                <span>By Admin</span>
              </span>
            )}
          </div>

          {/* Right Action Group - Anchored Top-Right */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300 flex items-center gap-1 select-none">
              <Lock className="w-2.5 h-2.5 text-slate-500" />
              <span>Skipped & Locked</span>
            </span>
            {setDeleteThreadJobConfirm && (
              <button
                type="button"
                onClick={() => setDeleteThreadJobConfirm(rec)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Delete skipped record"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sub Row: Details & Date */}
        <div className="flex items-center gap-2 flex-wrap text-slate-500 text-[11px] pt-0.5">
          <span>Skipped from trimming process</span>
          {groupingMode === 'all' && displayFabric && (
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {displayFabric}
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            • {formattedDate}{formattedTime ? ` ${formattedTime}` : ''}
          </span>
        </div>
      </div>
    );
  };

  const renderThreadJobCard = (tc) => {
    if (tc.isSkippedRecord || tc.status === 'Skipped' || tc.actionType === 'skip' || tc.action_type === 'skip') {
      return renderSkippedCard(tc);
    }
    const isCompleted = tc.status === 'Completed';
    const isExternal = tc.helperType === 'external';
    const linkedFabric = fabrics.find((f) => f.id === tc.fabricId);
    const displayFabricName =
      linkedFabric?.fabricType ||
      tc.fabricName ||
      linkedFabric?.productName ||
      'Fabric Batch';
    const progressPct =
      tc.assignedPSC > 0
        ? Math.min(100, Math.round(((tc.completedPSC || 0) / tc.assignedPSC) * 100))
        : 0;

    const compLabel = tc.subPartName || (tc.subPart ? tc.subPart.toUpperCase() : 'PSC');

    const cleanNote = tc.notes
      ? String(tc.notes).trim().replace(/^["']+|["']+$/g, '').trim()
      : '';
    const showNote = cleanNote && !cleanNote.startsWith('{') &&
      cleanNote.toLowerCase() !== `${tc.subPartName || tc.subPart || ''}: ${tc.assignedPSC} pcs`.toLowerCase() &&
      cleanNote.toLowerCase() !== (tc.subPartName || tc.subPart || '').toLowerCase();

    const isMasterCreated = tc.createdByRole === 'master' || Boolean(tc.masterId);

    return (
      <div
        key={tc.id}
        className="p-2.5 bg-white rounded-xl border border-slate-200/80 text-xs shadow-2xs hover:border-teal-300 transition-all space-y-1.5"
      >
        {/* Top Row: Status Dot, Pieces, Component Badge, Creator Badge, and Anchored Top-Right Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isCompleted ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="font-extrabold text-slate-900 text-xs sm:text-sm shrink-0">
              +{tc.assignedPSC} PSC
            </span>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
              ({compLabel})
            </span>
            {/* Creator Badge: Master vs Admin */}
            {isMasterCreated ? (
              <span
                className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
                title={`Assigned on floor by Master ${tc.masterName || ''}`}
              >
                <Scissors className="w-2.5 h-2.5 text-purple-600" />
                <span>By Master{tc.masterName ? `: ${tc.masterName}` : ''}</span>
              </span>
            ) : (
              <span
                className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
                title="Assigned by Factory Admin"
              >
                <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
                <span>By Admin</span>
              </span>
            )}
          </div>

          {/* Right Action Group - Anchored Top-Right */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {!isCompleted ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setProgressModalJob(tc);
                    setProgressModalPSC(String(tc.completedPSC || 0));
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Update progress"
                >
                  <span>Progress</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateThreadCuttingProgress(tc.id, tc.assignedPSC, true);
                  }}
                  className="px-2 py-0.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  title="Mark All Done"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Done</span>
                </button>
              </>
            ) : (
              <>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 select-none">
                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Trimmed</span>
                </span>

                {/* External Helper Expense Recording Action */}
                {isExternal && tc.totalEstimatedAmount > 0 && (
                  tc.expenseId ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-0.5 select-none" title="Expense Recorded">
                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                      <span>₹{tc.totalEstimatedAmount} Exp</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const expRes = addExpense({
                          expenseType: 'Salary',
                          salarySubType: 'Helper',
                          workerId: tc.helperId,
                          workerName: tc.helperName,
                          amount: tc.totalEstimatedAmount,
                          date: today,
                          paymentMethod: 'Cash',
                          notes: `Thread cutting (${tc.assignedPSC} PSC @ ₹${tc.ratePerPSC}/PSC) for ${tc.fabricName}`,
                        });
                        if (expRes?.success && expRes.expense?.id) {
                          linkThreadCuttingExpense(tc.id, expRes.expense.id);
                          setRecordedExpenseSuccess(
                            `₹${tc.totalEstimatedAmount} recorded under Helper Salary Expense for ${tc.helperName}!`
                          );
                          setTimeout(() => setRecordedExpenseSuccess(null), 5000);
                        }
                      }}
                      className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer transition-all"
                      title={`Record ₹${tc.totalEstimatedAmount} as Helper Salary Expense`}
                    >
                      <span>₹{tc.totalEstimatedAmount} Exp</span>
                    </button>
                  )
                )}
              </>
            )}

            {/* Delete Assignment Action */}
            <button
              type="button"
              onClick={() => setDeleteThreadJobConfirm(tc)}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Delete assignment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sub Row: Helper, External/Staff rate, Date, Progress if in-progress, and Notes */}
        <div className="flex items-center gap-2 flex-wrap text-slate-600 text-[11px] pt-0.5">
          <span className="font-bold text-slate-800">
            by <strong className="text-slate-900">{tc.helperName}</strong>
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${
              isExternal
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {isExternal ? `Ext (₹${tc.ratePerPSC}/PSC)` : 'Staff'}
          </span>
          {groupingMode === 'all' && displayFabricName && (
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {displayFabricName}
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            • {isCompleted && tc.completionDate ? tc.completionDate : tc.assignedDate}
          </span>
          {!isCompleted && (
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
              {tc.completedPSC || 0}/{tc.assignedPSC} ({progressPct}%)
            </span>
          )}
          {showNote && (
            <span className="text-[10px] text-slate-400 italic truncate max-w-xs" title={cleanNote}>
              "{cleanNote}"
            </span>
          )}
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-4">
      {/* Quick Assign Callout Banner if there are verified PSCs ready */}
      {globalThreadStats.totalAvailableToAssignPSC > 0 && !searchQuery && (
        <div className="p-3 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/15 border border-teal-200 rounded-2xl flex items-center justify-between gap-3 text-left shadow-2xs flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black text-teal-950 uppercase tracking-wider">
                {globalThreadStats.totalAvailableToAssignPSC} Verified Pieces Ready for Trimming
              </h3>
              <p className="text-[11px] text-teal-900/80 truncate">
                Ready to assign to helpers for thread trimming.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCuttingForThreadCutting(null);
              setSelectedHandoverForThreadCutting(null);
              setShowAssignThreadCuttingModal(true);
            }}
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Now</span>
          </button>
        </div>
      )}

      {/* Toast / Alert banner when an expense is successfully recorded */}
      {recordedExpenseSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{recordedExpenseSuccess}</span>
          </span>
          <button
            type="button"
            onClick={() => setRecordedExpenseSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}



      {/* FILTER: ADMIN RECEIVED FROM MASTER VIEW */}
      {threadCuttingFilter === 'received' && (
        <div className="space-y-3">
          {filteredVerifiedHandovers.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">No Admin Received Pieces Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  When Admin verifies pieces from Cutting Master Handovers, they count and log here ready for thread trimming or skipping.
                </p>
              </div>
            </div>
          ) : (() => {
            const renderVerifiedCard = (h) => {
              const linkedFabric = fabrics.find((f) => f.id === h.fabricId);
              const isMasterTrimmed = h.trimmingStatus === 'trimmed' || Boolean(h.trimmedByMaster);
              const isMasterSkipped = h.trimmingStatus === 'skipped' || Boolean(h.skippedByMaster);

              return (
                <div
                  key={h.id}
                  className={`bg-white rounded-2xl p-3 sm:p-4 shadow-2xs text-left space-y-2.5 transition-all ${isMasterSkipped
                    ? 'border-2 border-amber-300 bg-amber-50/20'
                    : isMasterTrimmed
                      ? 'border border-emerald-200/90'
                      : 'border border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                        <PackageCheck className="w-3 h-3 text-emerald-600" />
                        <span>Admin Received</span>
                      </span>

                      {/* Floor Trimming Status Badge */}
                      {h.trimmingStatus === 'mixed' || (h.trimmedPieces > 0 && h.skippedTrimmingPieces > 0) ? (
                        <>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1 shrink-0" title="Trimmed on floor before handover">
                            <Scissors className="w-3 h-3 text-teal-600" />
                            <span>✂️ {h.trimmedPieces} Trimmed</span>
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shrink-0" title="Master skipped trimming for these pieces">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>⏭️ {h.skippedTrimmingPieces} Skipped</span>
                          </span>
                        </>
                      ) : (
                        <>
                          {isMasterTrimmed && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1 shrink-0" title="Trimmed on floor before handover">
                              <Scissors className="w-3 h-3 text-teal-600" />
                              <span>✂️ Trimmed by Master</span>
                            </span>
                          )}

                          {isMasterSkipped && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shrink-0" title="Master skipped trimming for this batch">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>⏭️ Trimming Skipped on Floor</span>
                            </span>
                          )}
                        </>
                      )}

                      <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        +{h.piecesCount || h.pieces} PCs from {h.masterName || 'Cutting Master'}
                      </span>
                      {linkedFabric && (
                        <span className="text-slate-500 font-bold text-[11px] bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                          {linkedFabric.fabricType}
                        </span>
                      )}
                      <span className="text-slate-400 font-normal text-[11px] hidden sm:inline">
                        • {h.handoverDate || h.date ? new Date(h.handoverDate || h.date).toISOString().split('T')[0] : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isMasterTrimmed ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 border border-emerald-200 select-none">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Trimmed & Ready</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCuttingForThreadCutting(h.cuttingId || null);
                              setSelectedHandoverForThreadCutting(h.id);
                              setShowAssignThreadCuttingModal(true);
                            }}
                            className="px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-[11px] font-medium transition-all"
                            title="Re-assign helper if touch-up trimming is needed"
                          >
                            <span>Re-trim</span>
                          </button>
                        </div>
                      ) : !isMasterSkipped ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCuttingForThreadCutting(h.cuttingId || null);
                            setSelectedHandoverForThreadCutting(h.id);
                            setShowAssignThreadCuttingModal(true);
                          }}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Assign Helper to Trim Pieces"
                        >
                          <Scissors className="w-3 h-3" />
                          <span>Assign Helper</span>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Subpart breakdown */}
                  <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-bold text-slate-700">Received Breakdown:</span>
                      {h.subParts && typeof h.subParts === 'object' && Object.keys(h.subParts).length > 0 ? (
                        Object.entries(h.subParts).map(([k, v]) => (
                          <span
                            key={k}
                            className="px-2 py-0.5 bg-white border border-slate-200 text-slate-800 rounded font-black text-[11px]"
                          >
                            {resolvePieceLabel(k, null)}: {v} PCs
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-800 font-bold">{h.piecesCount || h.pieces} PCs Total</span>
                      )}
                    </div>
                    {getCleanDisplayNote(h.notes) && (
                      <span className="text-[11px] text-slate-500 italic max-w-xs truncate" title={getCleanDisplayNote(h.notes)}>
                        "{getCleanDisplayNote(h.notes)}"
                      </span>
                    )}
                  </div>

                  {/* Master Skipped Trimming Action Prompt */}
                  {isMasterSkipped && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-amber-950">
                            {h.trimmedPieces > 0
                              ? `Master skipped trimming for ${h.skippedTrimmingPieces || (h.piecesCount || h.pieces)} PCs in this batch (${h.trimmedPieces} PCs already trimmed on floor).`
                              : `Master skipped trimming on the cutting floor for this batch (${h.piecesCount || h.pieces} PCs).`}
                          </p>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            Do you want to assign factory helpers to trim {h.trimmedPieces > 0 ? `the ${h.skippedTrimmingPieces || 'skipped'} pieces` : 'this batch'}, or proceed directly to delivery without trimming?
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCuttingForThreadCutting(h.cuttingId || null);
                            setSelectedHandoverForThreadCutting(h.id);
                            setShowAssignThreadCuttingModal(true);
                          }}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          title="Assign Factory Helper to Trim this batch"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                          <span>Assign Helper</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (setFabricThreadCuttingDecision && h.fabricId) {
                              if (h.subParts && typeof h.subParts === 'object' && Object.keys(h.subParts).length > 0) {
                                Object.entries(h.subParts).forEach(([k, count]) => {
                                  setFabricThreadCuttingDecision(h.fabricId, 'skipped', k, parseInt(count, 10) || 0, true);
                                });
                              } else {
                                setFabricThreadCuttingDecision(
                                  h.fabricId,
                                  'skipped',
                                  null,
                                  parseInt(h.piecesCount || h.pieces, 10) || 0,
                                  true
                                );
                              }
                            }
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-amber-100/60 active:scale-95 text-slate-800 rounded-lg text-xs font-bold transition-all border border-amber-300 flex items-center gap-1.5 cursor-pointer"
                          title="Lock as Skipped Trimming (Direct Delivery)"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Keep Skipped</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            };

            const totalGroupPages = Math.max(1, Math.ceil(groupedVerifiedHandovers.length / groupPageSize));
            const safeGroupPage = Math.min(groupPage, totalGroupPages);
            const pagedGrouped = groupedVerifiedHandovers.slice((safeGroupPage - 1) * groupPageSize, safeGroupPage * groupPageSize);

            const totalFlatPages = Math.max(1, Math.ceil(filteredVerifiedHandovers.length / flatPageSize));
            const safeFlatPage = Math.min(flatPage, totalFlatPages);
            const pagedFlat = filteredVerifiedHandovers.slice((safeFlatPage - 1) * flatPageSize, safeFlatPage * flatPageSize);

            return (groupingMode === 'lot' || groupingMode === 'archive') ? (
              <div className="space-y-2">
                {pagedGrouped.map((group) => {
                  const isLotCollapsed = collapsedLots.has(group.lotKey);
                  const totalLotPieces = group.items.reduce(
                    (sum, h) => sum + (parseInt(h.piecesCount || h.pieces, 10) || 0),
                    0
                  );

                  const summaryBadge = (
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                      <span className="text-[10px] sm:text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {totalLotPieces} PCs Received
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full hidden sm:inline">
                        {group.items.length} {group.items.length === 1 ? 'Batch' : 'Batches'}
                      </span>
                    </div>
                  );

                  return (
                    <div key={group.lotKey} className="space-y-2">
                      <LotGroupHeader
                        group={group}
                        activeTab="thread_cutting"
                        isCollapsed={isLotCollapsed}
                        onToggle={() => toggleLotCollapse(group.lotKey)}
                        summaryBadge={summaryBadge}
                      />
                      {!isLotCollapsed && (
                        <div className="space-y-2.5 pl-2 sm:pl-3 border-l-2 border-emerald-200/80 ml-2">
                          {group.items.map(renderVerifiedCard)}
                        </div>
                      )}
                    </div>
                  );
                })}
                <PaginationControls
                  currentPage={safeGroupPage}
                  totalPages={totalGroupPages}
                  totalItems={groupedVerifiedHandovers.length}
                  pageSize={groupPageSize}
                  onPageChange={setGroupPage}
                  onPageSizeChange={setGroupPageSize}
                  pageSizeOptions={[10, 15, 25, 50]}
                  theme="emerald"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="space-y-2">
                  {pagedFlat.map(renderVerifiedCard)}
                </div>
                <PaginationControls
                  currentPage={safeFlatPage}
                  totalPages={totalFlatPages}
                  totalItems={filteredVerifiedHandovers.length}
                  pageSize={flatPageSize}
                  onPageChange={setFlatPage}
                  onPageSizeChange={setFlatPageSize}
                  pageSizeOptions={[15, 25, 50, 100]}
                  theme="emerald"
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* List of Thread Cutting Jobs & Skipped Records (for 'all', 'In Progress', 'Completed', 'skipped', 'external', 'internal') */}
      {threadCuttingFilter !== 'received' && (
        filteredThreadJobs.length === 0 && (threadCuttingFilter !== 'all' || (filteredSkippedBatches.length === 0 && filteredVerifiedHandovers.length === 0)) ? (
          <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
            <div className={`w-12 h-12 rounded-2xl ${threadCuttingFilter === 'skipped' ? 'bg-slate-100 text-slate-600' : 'bg-teal-50 text-teal-600'} flex items-center justify-center mx-auto`}>
              {threadCuttingFilter === 'skipped' ? <Lock className="w-6 h-6" /> : <Scissors className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {groupingMode === 'archive'
                  ? 'No Archived Trimming Jobs'
                  : threadCuttingFilter === 'skipped'
                    ? 'No Skipped & Locked Pieces Found'
                    : 'No Thread Cutting Jobs Found'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {groupingMode === 'archive'
                  ? 'When a fabric lot is moved to archive, its linked trimming and thread cutting tasks will appear here.'
                  : threadCuttingFilter === 'skipped'
                    ? 'When fabric subparts are skipped during trimming setup, they will appear here logged as locked from trimming.'
                    : (searchQuery || threadCuttingFilter !== 'all'
                      ? 'No jobs match your selected filter criteria.'
                      : globalThreadStats.totalAvailableToAssignPSC > 0
                        ? 'You have verified complete PSCs waiting. Click below to assign them to helpers.'
                        : 'Once Admin verifies complete PSCs from Master Handovers, you can assign them here for thread cutting.')}
              </p>
            </div>
            {groupingMode !== 'archive' && globalThreadStats.totalAvailableToAssignPSC > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCuttingForThreadCutting(null);
                  setSelectedHandoverForThreadCutting(null);
                  setShowAssignThreadCuttingModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 active:scale-95 shadow-md shadow-teal-200 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Assign First Job</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {(() => {
              const totalGroupPages = Math.max(1, Math.ceil(groupedThreadJobs.length / groupPageSize));
              const safeGroupPage = Math.min(groupPage, totalGroupPages);
              const pagedGrouped = groupedThreadJobs.slice((safeGroupPage - 1) * groupPageSize, safeGroupPage * groupPageSize);

              const totalFlatPages = Math.max(1, Math.ceil(filteredThreadJobs.length / flatPageSize));
              const safeFlatPage = Math.min(flatPage, totalFlatPages);
              const pagedFlatJobs = filteredThreadJobs.slice((safeFlatPage - 1) * flatPageSize, safeFlatPage * flatPageSize);

              return (groupingMode === 'lot' || groupingMode === 'archive') ? (
                <div className="space-y-2">
                  {pagedGrouped.map((group) => {
                  const isLotCollapsed = collapsedLots.has(group.lotKey);
                  const isItemSkip = (tc) =>
                    tc.isSkippedRecord ||
                    tc.status === 'Skipped' ||
                    tc.actionType === 'skip' ||
                    tc.action_type === 'skip';

                  const totalLotAssignedPSC = group.items.reduce(
                    (sum, tc) => (isItemSkip(tc) ? sum : sum + (parseInt(tc.assignedPSC || tc.assigned_pieces || tc.assignedPieces, 10) || 0)),
                    0
                  );
                  const totalLotCompletedPSC = group.items.reduce(
                    (sum, tc) => (isItemSkip(tc) ? sum : sum + (parseInt(tc.completedPSC || tc.completed_pieces || tc.completedPieces, 10) || 0)),
                    0
                  );
                  const skippedCountInGroup = group.items.filter(isItemSkip).length;
                  const jobsCountInGroup = group.items.length - skippedCountInGroup;

                  const summaryBadge = (
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                      <span className="text-[10px] sm:text-xs font-extrabold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                        {totalLotCompletedPSC} / {totalLotAssignedPSC} Trimmed
                      </span>
                      {jobsCountInGroup > 0 && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full hidden sm:inline">
                          {jobsCountInGroup} {jobsCountInGroup === 1 ? 'Job' : 'Jobs'}
                        </span>
                      )}
                      {skippedCountInGroup > 0 && (
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                          <span>Locked</span>
                        </span>
                      )}
                    </div>
                  );

                  return (
                    <div key={group.lotKey} className="space-y-2">
                      <LotGroupHeader
                        group={group}
                        activeTab="thread_cutting"
                        isCollapsed={isLotCollapsed}
                        onToggle={() => toggleLotCollapse(group.lotKey)}
                        summaryBadge={summaryBadge}
                      />
                      {!isLotCollapsed && (
                        <div className="space-y-1.5 pl-2 sm:pl-3 border-l-2 border-teal-200/80 ml-2">
                          {group.items.map((item) =>
                            item.isSkippedRecord || item.status === 'Skipped' || item.actionType === 'skip' || item.action_type === 'skip'
                              ? renderSkippedCard(item)
                              : renderThreadJobCard(item)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <PaginationControls
                  currentPage={safeGroupPage}
                  totalPages={totalGroupPages}
                  totalItems={groupedThreadJobs.length}
                  pageSize={groupPageSize}
                  onPageChange={setGroupPage}
                  onPageSizeChange={setGroupPageSize}
                  pageSizeOptions={[10, 15, 25, 50]}
                  theme="teal"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  {pagedFlatJobs.map((item) =>
                    item.isSkippedRecord || item.status === 'Skipped' || item.actionType === 'skip' || item.action_type === 'skip'
                      ? renderSkippedCard(item)
                      : renderThreadJobCard(item)
                  )}
                </div>
                <PaginationControls
                  currentPage={safeFlatPage}
                  totalPages={totalFlatPages}
                  totalItems={filteredThreadJobs.length}
                  pageSize={flatPageSize}
                  onPageChange={setFlatPage}
                  onPageSizeChange={setFlatPageSize}
                  pageSizeOptions={[15, 25, 50, 100]}
                  theme="teal"
                />
              </div>
            );
          })()}
          </div>
        )
      )}
    </div>
  );
}
