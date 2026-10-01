import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  TrendingUp,
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Calendar,
  Check,
} from 'lucide-react';
import { getSubmissionPscDetails } from '../../context/managementContextInstance';
import {
  getAssignmentWorkDetails,
  getNormalizedCutPiecesList,
  getPieceValueFromObject,
} from '../../utils/productUtils';
import {
  getDueDateStatus,
} from '../../utils/productionHelpers';
import LotGroupHeader from './LotGroupHeader';
import PaginationControls from '../common/PaginationControls';

export default function StitchingTab({
  filteredAssignments,
  groupedAssignments,
  groupingMode,
  collapsedLots,
  toggleLotCollapse,
  cuttings,
  fabrics,
  searchQuery,
  statusFilter,
  expandedCardIds,
  toggleCardExpand,
  _expandedHistoryId,
  _setExpandedHistoryId,
  setAssignmentToAccept,
  setSelectedAssignmentForDailyLog,
  setDeleteAssignConfirm,
  updateAssignmentStatus,
  deleteDailyTailorSubmission,
  setShowAssignTailorModal,
  setSelectedCuttingForAssign,
  today,
}) {
  const [flatPage, setFlatPage] = useState(1);
  const [flatPageSize, setFlatPageSize] = useState(25);
  const totalFlatPages = Math.max(1, Math.ceil(filteredAssignments.length / flatPageSize));
  const safeFlatPage = Math.min(flatPage, totalFlatPages);
  const pagedAssignments = filteredAssignments.slice((safeFlatPage - 1) * flatPageSize, safeFlatPage * flatPageSize);

  const [groupPage, setGroupPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(15);
  const totalGroupPages = Math.max(1, Math.ceil(groupedAssignments.length / groupPageSize));
  const safeGroupPage = Math.min(groupPage, totalGroupPages);
  const pagedGroupedAssignments = groupedAssignments.slice((safeGroupPage - 1) * groupPageSize, safeGroupPage * groupPageSize);

  const renderAssignmentCard = (a) => {
    const cutting = cuttings.find((c) => c.id === a.cuttingId);
    const fabric = fabrics.find((f) => f.id === (cutting?.fabricId || a.fabricId));
    const workDetails = getAssignmentWorkDetails(a, cutting, fabric);
    const isExpanded = expandedCardIds.has(a.id);
    const dueStatus = getDueDateStatus(a.dueDate, a.status, today);
    const totalAssignedGarmentPcs = workDetails?.totalTargetPSC > 0
      ? workDetails.totalTargetPSC
      : (parseInt(a.totalTargetPieces, 10) || parseInt(a.totalTargetPSC, 10) || parseInt(a.totalAssignedPieces, 10) || 0);
    const totalCutPieces = workDetails?.totalCutPieces > 0
      ? workDetails.totalCutPieces
      : (parseInt(a.totalAssignedPieces, 10) || 0);
    const completed = parseInt(a.completedQuantity, 10) || 0;
    const progressPercent = totalAssignedGarmentPcs > 0 ? Math.min(100, Math.round((completed / totalAssignedGarmentPcs) * 100)) : 0;
    const remainingPcs = Math.max(0, totalAssignedGarmentPcs - completed);
    const dailySubs = a.dailySubmissions || [];
    const estPayout = workDetails?.totalPayout || 0;
    const displayDate = a.assignDate || a.assign_date || (a.createdAt ? a.createdAt.split('T')[0] : '');

    // Extract subparts breakdown (matching amber pill)
    const assignedPiecesMap = a.assignedPieces || a.assigned_pieces || a.assigned_cut_pieces || {};
    const displayList = getNormalizedCutPiecesList(
      cutting ? { ...cutting, cutPieces: assignedPiecesMap } : { cutPieces: assignedPiecesMap },
      fabric
    );

    const pieceParts = displayList
      .map(({ key, id, label, val }) => {
        const pieceVal = (val !== undefined && val !== null && val > 0)
          ? val
          : getPieceValueFromObject(assignedPiecesMap, key, id);
        if (!pieceVal || pieceVal <= 0) return null;
        return `${label.toUpperCase()}: ${pieceVal}`;
      })
      .filter(Boolean);

    const cutPieceBreakdown = pieceParts.length > 0 ? pieceParts.join(', ') : null;

    const piecePartsWithRates = displayList
      .map(({ key, id, label, val }) => {
        const pieceVal = (val !== undefined && val !== null && val > 0)
          ? val
          : getPieceValueFromObject(assignedPiecesMap, key, id);
        if (!pieceVal || pieceVal <= 0) return null;
        const rate = a.tailorRates?.[key] || a.tailorRates?.[key?.toLowerCase()] || a.tailorRates?.[id] || 0;
        return rate > 0 ? `${label.toUpperCase()}: ${pieceVal} (₹${rate}/PC)` : `${label.toUpperCase()}: ${pieceVal}`;
      })
      .filter(Boolean);
    const cutPieceBreakdownWithRates = piecePartsWithRates.length > 0 ? piecePartsWithRates.join(', ') : cutPieceBreakdown;

    const masterName = a.masterName || cutting?.masterName;

    return (
      <div
        key={a.id}
        className={`bg-white rounded-2xl border transition-all text-xs shadow-2xs overflow-hidden ${
          isExpanded ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-slate-200/80 hover:border-emerald-300'
        }`}
      >
        {/* Main Header Row - Super Clean & Mobile-Optimized */}
        <div
          className="p-2.5 sm:p-3 cursor-pointer select-none space-y-1.5"
          onClick={() => toggleCardExpand(a.id)}
        >
          {/* Top Row: Status Dot, Cut PCs count, Desktop Amber Pill, and Anchored Top-Right Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
              {/* Status dot */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  a.status === 'Completed'
                    ? 'bg-emerald-500'
                    : a.status === 'In Stitching'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-indigo-500'
                }`}
              />

              {/* Pieces count */}
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm shrink-0">
                +{totalCutPieces > 0 ? totalCutPieces : totalAssignedGarmentPcs} Cut PCs
              </span>

              {/* Amber pill for subparts breakdown (desktop inline) */}
              {cutPieceBreakdown && (
                <span
                  className="hidden sm:inline-block text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200 truncate max-w-xs"
                  title={cutPieceBreakdownWithRates || cutPieceBreakdown}
                >
                  ({cutPieceBreakdown})
                </span>
              )}
            </div>

            {/* Right Action Group - Always anchored top-right */}
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Status Pill */}
              {a.status === 'Completed' ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 select-none">
                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Completed</span>
                </span>
              ) : a.status === 'In Stitching' ? (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 select-none">
                  <TrendingUp className="w-2.5 h-2.5 text-amber-600" />
                  <span>In Stitching</span>
                </span>
              ) : (!a.tailorAccepted || a.status === 'Pending Acceptance') && !(Array.isArray(a.dailySubmissions) && a.dailySubmissions.length > 0) && (parseInt(a.completedQuantity, 10) || 0) === 0 ? (
                <button
                  type="button"
                  onClick={() => setAssignmentToAccept(a)}
                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1"
                  title="Review & Accept Work Allocation"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Accept</span>
                </button>
              ) : (
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1 select-none">
                  <Check className="w-2.5 h-2.5 text-indigo-600" />
                  <span>Assigned</span>
                </span>
              )}

              {/* Expand / Collapse Chevron */}
              <button
                type="button"
                onClick={() => toggleCardExpand(a.id)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                title={isExpanded ? 'Hide work history' : 'Show work history'}
              >
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => setDeleteAssignConfirm(a)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Delete Assignment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile-only Amber Pill row */}
          {cutPieceBreakdown && (
            <div className="sm:hidden">
              <span
                className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200 inline-block"
                title={cutPieceBreakdownWithRates || cutPieceBreakdown}
              >
                ({cutPieceBreakdown})
              </span>
            </div>
          )}

          {/* Sub Row: Tailor, Machine, Master, Progress, Payout, Date & Logs */}
          <div className="flex items-center gap-2 flex-wrap text-slate-600 text-[11px] pt-0.5">
            {/* Tailor & Machine */}
            <span className="font-bold text-slate-800 flex items-center gap-1">
              to <strong className="text-slate-900 font-extrabold">{a.tailorName || 'Tailor'}</strong>
              {a.machineCode && (
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                  M: {a.machineCode}
                </span>
              )}
            </span>

            {/* Master */}
            {masterName && (
              <span className="text-slate-500 truncate">
                by <strong className="text-slate-700">{masterName}</strong>
              </span>
            )}

            {/* Stitching Progress */}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                progressPercent >= 100
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title={`Progress: ${completed} / ${totalAssignedGarmentPcs} PCs (${progressPercent}%)`}
            >
              <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />
              <span>{completed}/{totalAssignedGarmentPcs} PCs ({progressPercent}%)</span>
            </span>

            {/* Est Payout */}
            {estPayout > 0 && (
              <span
                className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100"
                title="Estimated Payout"
              >
                Est: ₹{estPayout.toLocaleString('en-IN')}
              </span>
            )}

            {/* Date */}
            <span className="text-[10px] text-slate-400">
              • {displayDate || 'Recent'}
            </span>

            {/* Daily log count */}
            {dailySubs.length > 0 && (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {dailySubs.length} log{dailySubs.length > 1 ? 's' : ''}
              </span>
            )}

            {/* Due status warning */}
            {dueStatus && dueStatus.isWarning && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border flex items-center gap-0.5 shrink-0 ${dueStatus.className}`}
                title={dueStatus.label}
              >
                <AlertTriangle className="w-2.5 h-2.5 text-current" />
                <span>{dueStatus.label}</span>
              </span>
            )}
          </div>
        </div>

        {/* Expanded Drawer: ONLY Daily WORK HISTORY & Action Footer */}
        {isExpanded && (
          <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-3.5 space-y-3 animate-in fade-in duration-150">
            {/* Daily Work History Title Header */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Daily Work History ({dailySubs.length} {dailySubs.length === 1 ? 'entry' : 'entries'})</span>
              </span>
              {a.status === 'In Stitching' && (
                <button
                  type="button"
                  onClick={() => setSelectedAssignmentForDailyLog(a)}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1"
                >
                  <TrendingUp className="w-2.5 h-2.5" />
                  <span>+ Log Work</span>
                </button>
              )}
            </div>

            {/* Daily Work Entries List (Directly Visible) */}
            {dailySubs.length === 0 ? (
              <div className="text-center py-3.5 px-3 text-slate-400 text-xs bg-white rounded-xl border border-dashed border-slate-200">
                No daily work logged yet.
              </div>
            ) : (
              <div className="space-y-1.5">
                {dailySubs.map((sub) => {
                  const pscInfo = getSubmissionPscDetails(sub);
                  return (
                    <div
                      key={sub.id}
                      className="p-2.5 bg-white rounded-xl border border-slate-200/80 text-xs flex items-center justify-between shadow-2xs hover:border-emerald-200 transition-all"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <strong className="text-emerald-800 font-extrabold text-xs">
                            +{pscInfo.pscCount} {pscInfo.pieceName || 'pcs'}
                          </strong>
                          <span className="text-[11px] text-slate-400">
                            {sub.date}
                          </span>
                        </div>
                        {pscInfo.badges.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap mt-1">
                            {pscInfo.badges.map((b) => (
                              <span
                                key={b.id}
                                className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200"
                              >
                                {b.icon} {b.label}
                              </span>
                            ))}
                            {pscInfo.fullSetsCount > 0 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 border border-purple-200">
                                ✨ {pscInfo.fullSetsCount} Sets
                              </span>
                            )}
                          </div>
                        ) : sub.parts && typeof sub.parts === 'object' && Object.values(sub.parts).some((v) => (parseInt(v, 10) || 0) > 0) ? (
                          <div className="flex items-center gap-1 flex-wrap mt-1">
                            {Object.entries(sub.parts).map(([part, count]) => {
                              const pCount = parseInt(count, 10) || 0;
                              if (pCount <= 0) return null;
                              return (
                                <span
                                  key={part}
                                  className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 capitalize"
                                >
                                  {part}: {pCount}
                                </span>
                              );
                            })}
                          </div>
                        ) : null}
                        {sub.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-1">"${sub.notes}"</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteDailyTailorSubmission(a.id, sub.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Remove this submission"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Notes if any */}
            {a.notes && (
              <div className="text-[11px] text-slate-500 italic bg-white p-2 rounded-xl border border-slate-200/80">
                "${a.notes}"
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Given: <strong>{displayDate || '—'}</strong></span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(!a.tailorAccepted || a.status === 'Pending Acceptance' || a.status === 'Assigned') && !(Array.isArray(a.dailySubmissions) && a.dailySubmissions.length > 0) && (parseInt(a.completedQuantity, 10) || 0) === 0 ? (
                  <button
                    type="button"
                    onClick={() => setAssignmentToAccept(a)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 active:scale-95 shadow-md shadow-amber-200 transition-all cursor-pointer animate-pulse"
                    title="Review & Accept Work Allocation"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Review & Accept</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedAssignmentForDailyLog(a)}
                      disabled={a.status === 'Completed' || remainingPcs === 0}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1 active:scale-95 shadow-2xs transition-all cursor-pointer ${
                        a.status === 'Completed' || remainingPcs === 0
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Log Daily Work</span>
                    </button>

                    {a.status === 'In Stitching' && (
                      <button
                        type="button"
                        onClick={() => updateAssignmentStatus(a.id, 'Completed')}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 active:scale-95 shadow-xs transition-all cursor-pointer"
                        title="Finish lot"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Finish</span>
                      </button>
                    )}

                    {a.status === 'Completed' && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Done</span>
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
            groupingMode === 'archive' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {groupingMode === 'archive' ? 'No Archived Tailor Tasks' : 'No Tailor Assignments Found'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {groupingMode === 'archive'
                ? 'When a fabric lot is moved to archive, its linked tailor tasks will appear here.'
                : searchQuery || statusFilter !== 'all'
                  ? 'No tailor allocation matches your search or filter.'
                  : 'Allocate cut pieces to a machine number or tailor to start stitching.'}
            </p>
          </div>
          {groupingMode !== 'archive' && (
            <button
              onClick={() => {
                setSelectedCuttingForAssign(null);
                setShowAssignTailorModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-200 transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Assign First Tailor</span>
            </button>
          )}
        </div>
      ) : (groupingMode === 'lot' || groupingMode === 'archive') ? (
        <div className="space-y-2">
          {pagedGroupedAssignments.map((group) => {
            const isLotCollapsed = collapsedLots.has(group.lotKey);
            const totalLotAssigned = group.items.reduce((sum, a) => {
              const cutting = cuttings.find((c) => c.id === a.cuttingId);
              const fabric = fabrics.find((f) => f.id === (cutting?.fabricId || a.fabricId));
              const workDetails = getAssignmentWorkDetails(a, cutting, fabric);
              const assigned = workDetails?.totalTargetPSC > 0
                ? workDetails.totalTargetPSC
                : (parseInt(a.totalTargetPieces, 10) || parseInt(a.totalAssignedPieces, 10) || 0);
              return sum + assigned;
            }, 0);

            const totalLotDone = group.items.reduce(
              (sum, a) => sum + (parseInt(a.completedQuantity, 10) || 0),
              0
            );

            const summaryBadge = (
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                <span className="text-[10px] sm:text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {totalLotDone} / {totalLotAssigned} PCs Done
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full hidden sm:inline">
                  {group.items.length} {group.items.length === 1 ? 'Tailor' : 'Tailors'}
                </span>
              </div>
            );

            return (
              <div key={group.lotKey} className="space-y-2">
                <LotGroupHeader
                  group={group}
                  activeTab="assignments"
                  isCollapsed={isLotCollapsed}
                  onToggle={() => toggleLotCollapse(group.lotKey)}
                  summaryBadge={summaryBadge}
                />
                {!isLotCollapsed && (
                  <div className="space-y-2.5 pl-2 sm:pl-3 border-l-2 border-emerald-200/80 ml-2">
                    {group.items.map(renderAssignmentCard)}
                  </div>
                )}
              </div>
            );
          })}
          <PaginationControls
            currentPage={safeGroupPage}
            totalPages={totalGroupPages}
            totalItems={groupedAssignments.length}
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
            {pagedAssignments.map(renderAssignmentCard)}
          </div>
          <PaginationControls
            currentPage={safeFlatPage}
            totalPages={totalFlatPages}
            totalItems={filteredAssignments.length}
            pageSize={flatPageSize}
            onPageChange={setFlatPage}
            onPageSizeChange={setFlatPageSize}
            pageSizeOptions={[15, 25, 50, 100]}
            theme="emerald"
          />
        </div>
      )}
    </div>
  );
}
