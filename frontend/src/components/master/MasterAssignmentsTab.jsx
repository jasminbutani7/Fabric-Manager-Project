import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Archive,
  ChevronDown,
  PackageCheck,
  CheckCheck,
  Clock,
  CheckCircle2,
  X,
  Calendar,
  MessageSquare,
  Layers,
} from 'lucide-react';
import { sanitizeFabricName, getSubmissionPscDetails } from '../../context/managementContextInstance';
import {
  getAssignmentSubPartsList,
  formatPieceName,
  getAssignmentPieceName,
} from '../../utils/productUtils';
import { groupItemsByLot } from '../../utils/lotGrouping';
import LotGroupHeader from '../orders/LotGroupHeader';

export default function MasterAssignmentsTab({
  activeAssignments = [],
  archivedAssignments = [],
  activeCuttings = [],
  cuttings = [],
  fabrics = [],
  pendingSubmissions = [],
  isPendingWorkExpanded = true,
  setIsPendingWorkExpanded,
  expandedAssignmentIds = new Set(),
  toggleAssignmentExpand,
  isAllAssignmentsExpanded: _isAllAssignmentsExpanded,
  toggleAllAssignmentsExpand: _toggleAllAssignmentsExpand,
  masterName,
  approveDailyTailorSubmission,
  approveAllDailyTailorSubmissions,
  setRejectModal,
  setRejectReason,
  onOpenAssignTailor,
  setActiveTab,
  setArchiveSubFilter,
}) {
  // Group active tailor assignments by Fabric Lot (matching Admin Portal design)
  const groupedAssignments = useMemo(
    () => groupItemsByLot(activeAssignments, fabrics, cuttings),
    [activeAssignments, fabrics, cuttings]
  );

  const [collapsedLots, setCollapsedLots] = useState(() => new Set());

  const toggleLotCollapse = (lotKey) => {
    setCollapsedLots((prev) => {
      const next = new Set(prev);
      if (next.has(lotKey)) next.delete(lotKey);
      else next.add(lotKey);
      return next;
    });
  };

  const isAllLotsCollapsed =
    groupedAssignments.length > 0 && groupedAssignments.every((g) => collapsedLots.has(g.lotKey));

  const toggleAllLots = () => {
    if (isAllLotsCollapsed) {
      setCollapsedLots(new Set());
    } else {
      setCollapsedLots(new Set(groupedAssignments.map((g) => g.lotKey)));
    }
  };

  const renderAssignmentCard = (a) => {
    const cutting = cuttings.find((c) => c.id === a.cuttingId);
    const fabric = fabrics.find((f) => f.id === (cutting?.fabricId || a.fabricId));
    const spList = getAssignmentSubPartsList(a, cutting, fabric);

    let targetPsc = 0;
    if (spList.length > 0) {
      targetPsc = spList.reduce((acc, sp) => acc + (parseInt(sp.count, 10) || 0), 0);
    } else if (a.assignedSubParts && typeof a.assignedSubParts === 'object' && Object.keys(a.assignedSubParts).length > 0) {
      targetPsc = Object.values(a.assignedSubParts).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
    } else {
      targetPsc = parseInt(a.totalAssignedPieces, 10) || 0;
    }
    const aPieceName = getAssignmentPieceName(a, targetPsc, fabric);
    const isExpanded = expandedAssignmentIds.has(a.id);
    const percent = targetPsc > 0
      ? Math.min(100, Math.round(((parseInt(a.completedQuantity, 10) || 0) / targetPsc) * 100))
      : (parseInt(a.completedQuantity, 10) > 0 ? 100 : 0);

    return (
      <div
        key={a.id}
        className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs text-left ${isExpanded ? 'border-emerald-200 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
      >
        {/* Header Summary Row */}
        <div
          onClick={() => toggleAssignmentExpand && toggleAssignmentExpand(a.id)}
          className="p-3.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {a.tailorName}
                </h4>
                {a.machineCode && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-md border border-slate-200 shrink-0">
                    {a.machineCode}
                  </span>
                )}
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${a.status === 'Completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : a.status === 'In Progress' || a.status === 'In Stitching'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                    }`}
                >
                  {a.status || 'Active'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                <span className="font-semibold text-slate-700">{sanitizeFabricName(a.fabricName)}</span>
                {a.assignedDate && <span> • {a.assignedDate}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-xs font-black text-slate-900 block whitespace-nowrap">
                {a.completedQuantity || 0}/{targetPsc} {formatPieceName(aPieceName, targetPsc)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                {percent}% done
              </span>
            </div>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Collapsible Details */}
        {isExpanded && (
          <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Target Breakdown */}
            {spList.length > 0 ? (
              <div className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Garment Parts Assignment:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {spList.map((sp) => (
                    <div
                      key={sp.name}
                      className="p-1.5 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between"
                    >
                      <span className="text-[11px] font-medium text-slate-700">{sp.name}</span>
                      <strong className="text-xs font-extrabold text-slate-900">
                        {sp.count} PCs
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : a.assignedSubParts && typeof a.assignedSubParts === 'object' && Object.keys(a.assignedSubParts).length > 0 ? (
              <div className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Garment Parts Assignment:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {Object.entries(a.assignedSubParts).map(([partKey, count]) => {
                    const cleanName = partKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                    return (
                      <div
                        key={partKey}
                        className="p-1.5 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between"
                      >
                        <span className="text-[11px] font-medium text-slate-700">{cleanName}</span>
                        <strong className="text-xs font-extrabold text-slate-900">
                          {count} PCs
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Daily Stitching Submissions History */}
            {a.dailySubmissions && a.dailySubmissions.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Work Logs History:
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {a.dailySubmissions.map((sub) => {
                    const isApp = sub.approvalStatus === 'Approved';
                    const isRej = sub.approvalStatus === 'Rejected';
                    const subPscInfo = getSubmissionPscDetails(sub);

                    return (
                      <div
                        key={sub.id}
                        className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${isApp
                          ? 'bg-emerald-50/50 border-emerald-200/70 text-emerald-950'
                          : isRej
                            ? 'bg-rose-50/50 border-rose-200/70 text-rose-950'
                            : 'bg-amber-50/60 border-amber-200/70 text-amber-950'
                          }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold block">{sub.date}</span>
                          {sub.notes && (
                            <span className="text-[10px] text-slate-500 italic block truncate">
                              "{sub.notes}"
                            </span>
                          )}
                          {subPscInfo.badges && subPscInfo.badges.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-1">
                              {subPscInfo.badges.map((b) => (
                                <span
                                  key={b.id}
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold border ${isApp
                                    ? 'bg-emerald-100/90 border-emerald-300 text-emerald-900'
                                    : isRej
                                      ? 'bg-rose-100/80 border-rose-300 text-rose-900 line-through'
                                      : 'bg-amber-100/90 border-amber-300 text-amber-900'
                                    }`}
                                >
                                  {b.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`font-bold block ${isRej ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            +{sub.quantity} PCs
                          </span>
                          <span className={`text-[9px] font-bold block ${isApp ? 'text-emerald-700' : isRej ? 'text-rose-600' : 'text-amber-700'
                            }`}>
                            {isApp ? (subPscInfo.pscLabel || 'Accepted') : isRej ? 'Not Counted' : 'Awaiting Count'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            {a.notes && (
              <p className="text-[11px] text-slate-600 italic bg-amber-50/40 border border-amber-100/70 p-2.5 rounded-xl">
                "{a.notes}"
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Tailors Working on Your Fabric Cuts ({activeAssignments.length})
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {groupedAssignments.length > 0 && (
            <button
              type="button"
              onClick={toggleAllLots}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title={isAllLotsCollapsed ? 'Expand all fabric lots' : 'Collapse all fabric lots'}
            >
              <Layers className="w-3 h-3 text-slate-400" />
              <span>{isAllLotsCollapsed ? 'Expand All Lots' : 'Collapse All Lots'}</span>
              <span className="text-[10px] text-slate-400 font-normal">({groupedAssignments.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (onOpenAssignTailor) onOpenAssignTailor(null);
            }}
            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign PCs to Tailor</span>
          </button>
        </div>
      </div>

      {/* Pending Work Verifications Section */}
      {pendingSubmissions.length > 0 && (
        <div className="p-3 sm:p-4 bg-gradient-to-br from-amber-50/80 via-orange-50/30 to-white rounded-2xl border border-amber-200 shadow-xs space-y-3 text-left transition-all">
          {/* Section Header (Clickable to Collapse / Expand) */}
          <div
            onClick={() => setIsPendingWorkExpanded && setIsPendingWorkExpanded((prev) => !prev)}
            className="flex items-center justify-between gap-2.5 cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shadow-amber-200 shrink-0">
                <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide leading-tight">
                    Work Logs Awaiting Verification
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs whitespace-nowrap">
                    {pendingSubmissions.length} Pending
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/70 font-medium truncate mt-0.5 hidden xs:block">
                  Verify physical PC counts delivered by tailors before confirming stock
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isPendingWorkExpanded && pendingSubmissions.length > 1 && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (approveAllDailyTailorSubmissions) {
                      await approveAllDailyTailorSubmissions(pendingSubmissions, masterName);
                    } else if (approveDailyTailorSubmission) {
                      for (const sub of pendingSubmissions) {
                        await approveDailyTailorSubmission(sub.assignmentId, sub.id, masterName);
                      }
                    }
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                  title="Accept all pending work logs in 1-click"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Accept All ({pendingSubmissions.length})</span>
                </button>
              )}
              <span className="hidden sm:inline-block text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                Cutting Dept Handover
              </span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 cursor-pointer ${isPendingWorkExpanded ? 'rotate-180 bg-amber-200/70 text-amber-900' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  }`}
                title={isPendingWorkExpanded ? 'Collapse section' : 'Expand section'}
              >
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Submissions List (Collapsible) */}
          {isPendingWorkExpanded && (
            <div className="space-y-3 pt-2 border-t border-amber-200/60 animate-in fade-in duration-150">
              {pendingSubmissions.map((sub) => {
                const pscInfo = getSubmissionPscDetails(sub);
                const formattedDate = sub.date || sub.submittedAt || null;

                return (
                  <div
                    key={sub.id}
                    className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2.5 hover:border-amber-300 transition-colors"
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
                          {sub.tailorName?.slice(0, 2).toUpperCase() || 'TL'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-black text-slate-900 truncate">
                            {sub.tailorName}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium flex-wrap mt-0.5">
                            <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              {sanitizeFabricName(sub.fabricName)}
                            </span>
                            {formattedDate && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{formattedDate}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <Clock className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                        <span>Awaiting Count</span>
                      </span>
                    </div>

                    {/* Dedicated Verification Box: Clear Physical Pieces Handover */}
                    <div className="p-2.5 sm:p-3 bg-amber-50/40 rounded-xl border border-amber-200/60 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] sm:text-[11px] font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                          <PackageCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Delivered Physical Pieces</span>
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-100/90 text-emerald-900 border border-emerald-300 text-xs font-black shadow-2xs">
                          +{pscInfo.pscCount || sub.quantity} PCs
                        </span>
                      </div>

                      {/* Itemized Piece Breakdown Chips */}
                      {pscInfo.badges && pscInfo.badges.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {pscInfo.badges.map((b) => (
                            <span
                              key={b.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-slate-900 text-xs font-extrabold shadow-2xs"
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>{b.label}</span>
                            </span>
                          ))}
                        </div>
                      ) : sub.subParts && typeof sub.subParts === 'object' && Object.keys(sub.subParts).some((k) => (parseInt(sub.subParts[k], 10) || 0) > 0) ? (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {Object.entries(sub.subParts).map(([k, v]) => {
                            const cnt = parseInt(v, 10) || 0;
                            if (cnt <= 0) return null;
                            const cleanName = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                            return (
                              <span
                                key={k}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-slate-900 text-xs font-extrabold shadow-2xs"
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>{cnt} {formatPieceName(cleanName, cnt)}</span>
                              </span>
                            );
                          })}
                        </div>
                      ) : sub.pieceType ? (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-slate-900 text-xs font-extrabold shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{sub.quantity} {formatPieceName(sub.pieceType, sub.quantity)}</span>
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Submitter Note if present */}
                    {sub.notes && (
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-600 text-[11px] flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">"{sub.notes}"</span>
                      </div>
                    )}

                    {/* Bottom Action Buttons: Fully Mobile-Friendly & PC Responsive */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          if (setRejectModal) setRejectModal(sub);
                          if (setRejectReason) setRejectReason('');
                        }}
                        className="flex-1 sm:flex-initial px-3.5 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-95 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        title="Reject submission if count mismatch or defective"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (approveDailyTailorSubmission) {
                            approveDailyTailorSubmission(sub.assignmentId, sub.id, masterName);
                          }
                        }}
                        className="flex-2 sm:flex-initial sm:ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title={`Physically verify and accept ${pscInfo.pscLabel || `${sub.quantity} Pieces`} from ${sub.tailorName}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept &amp; Confirm</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeAssignments.length === 0 ? (
        <div className="p-8 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">
            {archivedAssignments.length > 0 ? 'All Tailor Jobs Completed' : 'No Tailor Assignments Yet'}
          </h4>
          <p className="text-xs text-slate-500">
            {archivedAssignments.length > 0
              ? `All ${archivedAssignments.length} tailor jobs have completed stitching and are safely archived.`
              : 'When you assign PCs to tailors or machines, they will be listed here.'}
          </p>
          {archivedAssignments.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setActiveTab('archive');
                if (setArchiveSubFilter) setArchiveSubFilter('assignments');
              }}
              className="mt-2 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>View Completed Tailor Jobs ({archivedAssignments.length})</span>
            </button>
          ) : (
            activeCuttings.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenAssignTailor) onOpenAssignTailor(null);
                }}
                className="mt-2 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-emerald-200 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign First Tailor</span>
              </button>
            )
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {groupedAssignments.map((group) => {
            const isCollapsed = collapsedLots.has(group.lotKey);
            let lotTotalPSC = 0;
            let lotCompletedPSC = 0;
            group.items.forEach((a) => {
              const cutting = cuttings.find((c) => c.id === a.cuttingId);
              const fabric = fabrics.find((f) => f.id === (cutting?.fabricId || a.fabricId));
              const spList = getAssignmentSubPartsList(a, cutting, fabric);
              let targetPsc = 0;
              if (spList.length > 0) {
                targetPsc = spList.reduce((acc, sp) => acc + (parseInt(sp.count, 10) || 0), 0);
              } else if (a.assignedSubParts && typeof a.assignedSubParts === 'object' && Object.keys(a.assignedSubParts).length > 0) {
                targetPsc = Object.values(a.assignedSubParts).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
              } else {
                targetPsc = parseInt(a.totalAssignedPieces, 10) || 0;
              }
              lotTotalPSC += targetPsc;
              lotCompletedPSC += (parseInt(a.completedQuantity, 10) || 0);
            });

            return (
              <div key={group.lotKey} className="space-y-2">
                <LotGroupHeader
                  group={group}
                  activeTab="assignments"
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleLotCollapse(group.lotKey)}
                  summaryBadge={
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      {lotCompletedPSC}/{lotTotalPSC} PCs ({group.items.length} {group.items.length === 1 ? 'assignment' : 'assignments'})
                    </span>
                  }
                />
                {!isCollapsed && (
                  <div className="space-y-2 pl-2 sm:pl-3 border-l-2 border-emerald-200 ml-2 sm:ml-3">
                    {group.items.map((a) => renderAssignmentCard(a))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
