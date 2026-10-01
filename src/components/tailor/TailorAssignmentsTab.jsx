import React from 'react';
import {
  Scissors,
  CheckCircle2,
  Archive,
  Clock,
  PackageCheck,
  IndianRupee,
  Send,
  ChevronDown,
} from 'lucide-react';
import {
  getAssignmentSubPartsList,
  formatPieceName,
} from '../../utils/productUtils';
import { getTailorAssignmentMetrics } from '../../utils/tailorHelpers';

export default function TailorAssignmentsTab({
  activeAssignments = [],
  archivedAssignments = [],
  expandableAssignments = [],
  isAllAssignmentsExpanded,
  toggleAllAssignmentsExpand,
  expandedAssignmentIds = new Set(),
  toggleAssignmentExpand,
  cuttings = [],
  fabrics = [],
  onAcceptAssignment,
  onSubmitStitched,
  onArchiveAssignment,
  setActiveTab,
  setArchiveSubFilter,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Active Workload ({activeAssignments.length})
          </h3>
          <p className="text-[11px] text-slate-500">Fabric Cuts currently assigned to your machine</p>
        </div>
        {expandableAssignments.length > 1 && (
          <button
            type="button"
            onClick={toggleAllAssignmentsExpand}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            title={isAllAssignmentsExpanded ? 'Collapse all jobs' : 'Expand all jobs'}
          >
            <span>{isAllAssignmentsExpanded ? 'Collapse All' : 'Expand All'}</span>
          </button>
        )}
      </div>

      {activeAssignments.length === 0 ? (
        <div className="p-8 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">All Caught Up!</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-0.5">
              No active stitching workload assigned right now. When cutting master assigns new Cut PCs, they will appear here.
            </p>
          </div>
          {archivedAssignments.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (setActiveTab) setActiveTab('archive');
                if (setArchiveSubFilter) setArchiveSubFilter('orders');
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              <span>View {archivedAssignments.length} Completed Orders in Archive</span>
            </button>
          )}
        </div>
      ) : (
        activeAssignments.map((a) => {
          const m = getTailorAssignmentMetrics(a, { cuttings, fabrics });
          const {
            assigned,
            approvedDone,
            pendingReview,
            leftToStitch,
            progress,
            subPartsBreakdown,
            batchApprovedEarned,
            batchPendingEarned,
            totalJobAmount,
            remainingValue,
            pieceType,
            workDetails,
          } = m;

          const cutting = (cuttings || []).find((c) => c.id === a.cuttingId);
          const fabric = (fabrics || []).find((f) => f.id === (cutting?.fabricId || a.fabricId));
          const hasSubmissions = (a.dailySubmissions || []).length > 0;
          const hasActiveProgress =
            hasSubmissions ||
            approvedDone > 0 ||
            pendingReview > 0 ||
            (parseInt(a.completedQuantity, 10) || 0) > 0 ||
            Boolean(a.tailorAccepted);

          const isPendingAcceptance =
            !hasActiveProgress && (a.status === 'Pending Acceptance' || !a.tailorAccepted);
          const isInReview = isPendingAcceptance || (leftToStitch === 0 && pendingReview > 0);
          const isExpanded = !isInReview && expandedAssignmentIds.has(a.id);

          return (
            <div
              key={a.id}
              className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs text-left ${isPendingAcceptance
                ? 'border-amber-300 ring-2 ring-amber-500/10'
                : isExpanded
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                  : 'border-slate-200 hover:border-slate-300'
                }`}
            >
              {/* Collapsed Header Bar (~52px) */}
              <div
                onClick={() => {
                  if (isPendingAcceptance) {
                    if (onAcceptAssignment) onAcceptAssignment(a);
                  } else if (!isInReview) {
                    if (toggleAssignmentExpand) toggleAssignmentExpand(a.id);
                  }
                }}
                className={`p-3 sm:p-4 select-none transition-colors space-y-2.5 ${isPendingAcceptance
                    ? 'cursor-pointer hover:bg-amber-50/60'
                    : !isInReview
                      ? 'cursor-pointer hover:bg-slate-50/70'
                      : 'cursor-default'
                  }`}
              >
                <div className="flex items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${isPendingAcceptance
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                    >
                      {a.fabricName ? a.fabricName.charAt(0).toUpperCase() : 'S'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {a.fabricName}
                        </h4>
                        {isPendingAcceptance ? (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            New Job
                          </span>
                        ) : a.status === 'Completed' ? (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Completed
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {progress}% Done
                          </span>
                        )}
                        {pendingReview > 0 && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5 animate-pulse">
                            <Clock className="w-2.5 h-2.5 text-amber-600" />
                            <span>{pendingReview} in Review</span>
                          </span>
                        )}
                      </div>

                      {isPendingAcceptance ? (
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 flex items-center gap-1 shadow-2xs">
                            <Scissors className="w-3 h-3 text-purple-600" />
                            <span>{workDetails?.totalCutPieces} Cut PCs</span>
                          </span>
                          <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 flex items-center gap-1 shadow-2xs">
                            <PackageCheck className="w-3 h-3 text-indigo-600" />
                            <span>
                              {workDetails?.subPartsSummary ||
                                (workDetails?.pscDescription && !workDetails.pscDescription.toLowerCase().includes('pcs')
                                  ? workDetails.pscDescription
                                  : `${workDetails?.totalTargetPSC || assigned} ${formatPieceName(pieceType, workDetails?.totalTargetPSC || assigned)}`)}
                            </span>
                          </span>
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 shadow-2xs">
                            <IndianRupee className="w-3 h-3 text-emerald-600" />
                            <span>{workDetails?.totalPayout?.toLocaleString('en-IN')}</span>
                          </span>
                          {a.masterName && (
                            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                              • Master {a.masterName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                          {a.masterName && <span className="text-slate-600 font-semibold">Master {a.masterName} • </span>}
                          <span className="text-slate-700 font-semibold">{pieceType}</span>
                          <span className="text-emerald-700 font-bold"> • {approvedDone}/{assigned} {formatPieceName(pieceType, assigned)} verified</span>
                          {pendingReview > 0 && <span className="text-amber-700 font-semibold"> ({pendingReview} {formatPieceName(pieceType, pendingReview)} in review)</span>}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Desktop Right Actions & Chevron */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    {isPendingAcceptance ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAcceptAssignment) onAcceptAssignment(a);
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Review & Accept</span>
                      </button>
                    ) : leftToStitch > 0 ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSubmitStitched) onSubmitStitched(a);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                        title={`Submit stitched ${formatPieceName(pieceType, leftToStitch)} to Master for count & payout`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit {formatPieceName(pieceType, leftToStitch)}</span>
                      </button>
                    ) : pendingReview > 0 ? (
                      <span className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                        <span>In Review</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onArchiveAssignment) onArchiveAssignment(a.id);
                        }}
                        className="px-2.5 py-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                        title="Move to Archive"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Archive</span>
                      </button>
                    )}

                    {!isInReview && (
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Mobile Chevron (Always visible at top right) */}
                  {!isInReview && (
                    <div
                      className={`sm:hidden w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Mobile Action Button Row */}
                <div className="sm:hidden pt-0.5">
                  {isPendingAcceptance ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onAcceptAssignment) onAcceptAssignment(a);
                      }}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Review & Accept</span>
                    </button>
                  ) : leftToStitch > 0 ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSubmitStitched) onSubmitStitched(a);
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition-all cursor-pointer"
                      title={`Submit stitched ${formatPieceName(pieceType, leftToStitch)} to Master for count & payout`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit {formatPieceName(pieceType, leftToStitch)}</span>
                    </button>
                  ) : pendingReview > 0 ? (
                    <div className="w-full py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                      <span>In Review</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onArchiveAssignment) onArchiveAssignment(a.id);
                      }}
                      className="w-full py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-98 transition-all cursor-pointer"
                      title="Move to Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Section */}
              {isExpanded && !isInReview && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  {isPendingAcceptance ? (
                    /* Pending Acceptance Details */
                    <div className="space-y-2.5 text-xs text-slate-700">
                      {/* Sub-Parts: one box per sub-part (e.g. TYU / BYU) */}
                      {(() => {
                        const spList = getAssignmentSubPartsList(a, cutting, fabric);
                        if (spList.length === 0) return null;
                        return (
                          <div>
                            <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                              <Scissors className="w-3 h-3" />
                              Cut PCs to Receive
                              <span className="ml-auto font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full">
                                {workDetails?.totalCutPieces} Cut PCs
                              </span>
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {spList.map((sp, idx) => {
                                const hasComponents = Array.isArray(sp.components) && sp.components.length > 1;
                                return (
                                  <div key={sp.id} className="p-2.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-1.5 text-left">
                                    <div className="flex items-center justify-between gap-1 flex-wrap">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="w-4 h-4 rounded-md bg-purple-200 text-purple-900 text-[10px] font-black flex items-center justify-center shrink-0">
                                          {idx + 1}
                                        </span>
                                        <span className="text-xs font-black text-purple-950 uppercase tracking-wide truncate">
                                          {sp.name}
                                        </span>
                                        {sp.formula && (
                                          <span className="text-[9px] text-purple-700 font-medium truncate">
                                            ({sp.formula})
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-black text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded-md shrink-0">
                                        {sp.count} PCs ready
                                      </span>
                                    </div>
                                    {hasComponents && (
                                      <div className={`grid gap-1.5 ${sp.components.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                        {sp.components.map((comp) => (
                                          <div key={comp.id || comp.name} className="p-1.5 bg-white rounded-xl border border-purple-200/60 text-center shadow-2xs">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                                              {comp.name}
                                            </span>
                                            <span className="text-xs font-black text-purple-950">
                                              {comp.count.toLocaleString('en-IN')}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* PSC to Make + Money side by side */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 bg-indigo-50/70 rounded-2xl border border-indigo-200">
                          <p className="text-[10px] font-extrabold text-indigo-800 flex items-center gap-1 mb-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            {formatPieceName(pieceType, 2)} to Stitch
                          </p>
                          <p className="text-sm font-black text-indigo-950">
                            {workDetails?.totalTargetPSC || assigned} {formatPieceName(pieceType, workDetails?.totalTargetPSC || assigned)}
                          </p>
                          <p className="text-[10px] text-indigo-700 font-medium mt-0.5">
                            {workDetails?.subPartsSummary ||
                              (workDetails?.pscDescription && !workDetails.pscDescription.toLowerCase().includes('pcs')
                                ? workDetails.pscDescription
                                : `${workDetails?.totalTargetPSC || assigned} ${formatPieceName(pieceType, workDetails?.totalTargetPSC || assigned)}`)}
                          </p>
                          {workDetails?.pscFormula && (
                            <p className="text-[9px] text-indigo-500 mt-0.5 truncate">{workDetails.pscFormula}</p>
                          )}
                        </div>
                        <div className="p-2.5 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                          <p className="text-[10px] font-extrabold text-emerald-800 flex items-center gap-1 mb-0.5">
                            <IndianRupee className="w-3 h-3" />
                            Money to Earn
                          </p>
                          <p className="text-sm font-black text-emerald-950">₹{workDetails?.totalPayout?.toLocaleString('en-IN')}</p>
                          {workDetails?.rateBreakdown?.slice(0, 2).map((r, idx) => (
                            <p key={idx} className="text-[9px] text-emerald-700 font-semibold truncate">
                              {r.count} {r.item} @ ₹{r.rate}
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* Metadata bar */}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span>Custodian: <strong className="text-slate-800">Master {a.masterName || 'Unassigned'}</strong></span>
                          {a.assignDate && <span>• Assigned: <strong className="text-slate-800">{a.assignDate}</strong></span>}
                          {a.dueDate && <span>• Due: <strong className="text-slate-800">{a.dueDate}</strong></span>}
                        </div>
                        {a.notes && <span className="italic text-slate-500">"{a.notes}"</span>}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onAcceptAssignment) onAcceptAssignment(a);
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Review & Accept Work</span>
                      </button>
                    </div>
                  ) : (
                    /* Active Job Breakdown with Modern Garment Pieces Lifecycle Table */
                    <div className="space-y-3">
                      {/* Metadata Strip */}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span>Custodian: <strong className="text-slate-800">Master {a.masterName || 'Cutting Master'}</strong></span>
                          <span>• Machine: <strong className="text-slate-800">{a.machineCode || 'Standby'}</strong></span>
                          {a.assignDate && <span>• Assigned: <strong className="text-slate-800">{a.assignDate}</strong></span>}
                          {a.dueDate && <span>• Due: <strong className="text-slate-800">{a.dueDate}</strong></span>}
                        </div>
                        {a.notes && <span className="italic text-slate-500">"{a.notes}"</span>}
                      </div>

                      {/* Garment Pieces Lifecycle Table */}
                      <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs">
                        <table className="w-full min-w-[480px] text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                              <th className="py-2.5 px-3 whitespace-nowrap">Garment PC</th>
                              <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Target</th>
                              <th className="py-2.5 px-2.5 text-center text-emerald-800 whitespace-nowrap">✓ Stitched Done</th>
                              <th className="py-2.5 px-2.5 text-center text-amber-800 whitespace-nowrap">⏳ In Review</th>
                              <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Left to Stitch</th>
                              <th className="py-2.5 px-3 text-right whitespace-nowrap">Rate & Earned</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {subPartsBreakdown.map((sp) => (
                              <tr key={sp.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm">{sp.icon}</span>
                                    <div>
                                      <span className="font-extrabold text-slate-900 block leading-tight">{sp.name}</span>
                                      {sp.formula && (
                                        <span className="text-[10px] text-slate-400 font-medium block">{sp.formula}</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-2.5 text-center font-bold text-slate-700 whitespace-nowrap">
                                  {sp.target} {formatPieceName(sp.name, sp.target)}
                                </td>
                                <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                  <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap inline-block">
                                    {sp.approvedDone} {formatPieceName(sp.name, sp.approvedDone)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                  {sp.pendingReview > 0 ? (
                                    <span className="font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 animate-pulse whitespace-nowrap inline-block">
                                      {sp.pendingReview} {formatPieceName(sp.name, sp.pendingReview)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">0</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2.5 text-center font-bold text-slate-600 whitespace-nowrap">
                                  {sp.leftToStitch > 0 ? (
                                    <span className="text-amber-700 font-extrabold whitespace-nowrap">
                                      {sp.leftToStitch} {formatPieceName(sp.name, sp.leftToStitch)}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 font-extrabold whitespace-nowrap">All Done ✓</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <span className="font-extrabold text-slate-900 block">
                                    ₹{Math.round(sp.approvedEarned).toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium block">
                                    @ ₹{sp.rate}/{formatPieceName(sp.name, 1)}
                                  </span>
                                  {sp.pendingEarned > 0 && (
                                    <span className="text-[10px] text-amber-700 font-semibold block">
                                      +₹{Math.round(sp.pendingEarned)} in rev.
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Consolidated Production & Financial Summary */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
                        {/* Overall progress bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Batch Stitched</span>
                            <span className="font-black text-slate-800">
                              {approvedDone} of {assigned} {formatPieceName(pieceType, assigned)} ({progress}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${progress >= 100 ? 'bg-emerald-500' : 'bg-emerald-600'
                                }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Financial values */}
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-center text-xs">
                          <div className="text-left">
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Job Value</span>
                            <span className="font-extrabold text-slate-800 text-[11px]">
                              ₹{Math.round(totalJobAmount).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Approved</span>
                            <span className="font-black text-emerald-600 text-[11px]">
                              ₹{Math.round(batchApprovedEarned).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-amber-700 font-bold uppercase block">In Review</span>
                            <span className="font-black text-amber-700 text-[11px]">
                              ₹{Math.round(batchPendingEarned).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">To Earn</span>
                            <span className="font-extrabold text-slate-700 text-[11px]">
                              ₹{Math.round(remainingValue).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
