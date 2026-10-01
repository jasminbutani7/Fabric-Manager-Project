import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  TrendingUp,
  Archive,
  Calendar,
  CheckCircle2,
  X,
  Trash2,
  Layers,
} from 'lucide-react';
import { formatPieceName } from '../../utils/productUtils';
import { groupItemsByLot } from '../../utils/lotGrouping';
import LotGroupHeader from '../orders/LotGroupHeader';

export default function TailorHistoryTab({
  activeSubmissions = [],
  archivedSubmissions = [],
  pendingSubmissionsCount: _pendingSubmissionsCount = 0,
  rejectedSubmissionsCount: _rejectedSubmissionsCount = 0,
  rejectedPcsCount = 0,
  tailorAssignments = [],
  cuttings = [],
  fabrics = [],
  onDeleteSubmission,
  setActiveTab,
  setArchiveSubFilter,
}) {
  const [subStatusFilter, setSubStatusFilter] = useState('all'); // 'all' | 'verified' | 'pending' | 'rejected'
  const [collapsedLots, setCollapsedLots] = useState(() => new Set());

  const approvedSubs = activeSubmissions.filter((s) => s.approvalStatus === 'Approved');
  const pendingSubs = activeSubmissions.filter(
    (s) => s.approvalStatus === 'Pending Approval' || s.approvalStatus === 'Pending'
  );
  const rejectedSubs = activeSubmissions.filter((s) => s.approvalStatus === 'Rejected');

  const displayedSubmissions = activeSubmissions.filter((s) => {
    if (subStatusFilter === 'verified') return s.approvalStatus === 'Approved';
    if (subStatusFilter === 'pending')
      return s.approvalStatus === 'Pending Approval' || s.approvalStatus === 'Pending';
    if (subStatusFilter === 'rejected') return s.approvalStatus === 'Rejected';
    return true;
  });

  // Group work submissions by Fabric Lot (matching Master & Admin portal)
  const groupedSubmissions = useMemo(
    () => groupItemsByLot(displayedSubmissions, fabrics, cuttings),
    [displayedSubmissions, fabrics, cuttings]
  );

  const isAllLotsCollapsed =
    groupedSubmissions.length > 0 &&
    groupedSubmissions.every((g) => collapsedLots.has(g.lotKey));

  const toggleLotCollapse = (lotKey) => {
    setCollapsedLots((prev) => {
      const next = new Set(prev);
      if (next.has(lotKey)) next.delete(lotKey);
      else next.add(lotKey);
      return next;
    });
  };

  const toggleAllLotsCollapse = () => {
    if (isAllLotsCollapsed) {
      setCollapsedLots(new Set());
    } else {
      setCollapsedLots(new Set(groupedSubmissions.map((g) => g.lotKey)));
    }
  };

  const renderSubmissionCard = (s, idx) => {
    let subQty = parseInt(s.pscQuantity, 10) || 0;
    if (subQty === 0 && s.subParts && typeof s.subParts === 'object') {
      subQty = Object.values(s.subParts).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
    }
    if (subQty === 0) subQty = parseInt(s.quantity, 10) || 0;

    const parentAssignment = tailorAssignments.find((ta) => ta.id === s.assignmentId || ta.fabricName === s.fabricName);
    const parentRates = parentAssignment?.tailorRates || {};

    let subTotal = 0;
    const hasSubParts = s.subParts && typeof s.subParts === 'object' && Object.keys(s.subParts).some((k) => (parseInt(s.subParts[k], 10) || 0) > 0);

    if (hasSubParts) {
      Object.entries(s.subParts).forEach(([k, v]) => {
        const cnt = parseInt(v, 10) || 0;
        const normKey = k.toLowerCase().trim();
        const pRate = parseFloat(parentRates[k]) || parseFloat(parentRates[normKey]) || parseFloat(s.ratePerPiece) || 25;
        subTotal += cnt * pRate;
      });
    } else {
      subTotal = s.earnedAmount !== undefined ? parseFloat(s.earnedAmount) : subQty * (parseFloat(s.ratePerPiece) || 0);
    }

    // Clean display label for total quantity
    let subLabel = 'PCs';
    if (hasSubParts) {
      const activeKeys = Object.keys(s.subParts).filter((k) => (parseInt(s.subParts[k], 10) || 0) > 0);
      if (activeKeys.length === 1) {
        const singleName = activeKeys[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        subLabel = formatPieceName(singleName, subQty);
      } else {
        subLabel = 'PCs Total';
      }
    } else {
      const cleanPt = (s.pieceType || 'PCs').replace(/\d+/g, '').replace(/\+/g, '&').trim();
      subLabel = formatPieceName(cleanPt || 'PCs', subQty);
    }

    const isPending = s.approvalStatus === 'Pending Approval' || s.approvalStatus === 'Pending';
    const isApproved = s.approvalStatus === 'Approved';
    const isRejected = s.approvalStatus === 'Rejected';

    return (
      <div
        key={s.id || idx}
        className={`p-3.5 sm:p-4 bg-white rounded-2xl border shadow-2xs transition-all space-y-2.5 text-left ${isRejected
          ? 'border-rose-200 bg-rose-50/15'
          : isPending
            ? 'border-amber-200/90 bg-gradient-to-b from-amber-50/20 to-white'
            : 'border-slate-200 hover:border-slate-300'
          }`}
      >
        {/* Top Row: Title, Date, Status Badge & Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                {s.fabricName}
              </h4>
              {s.pieceType && !hasSubParts && (
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                  {s.pieceType}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-slate-600 font-medium">
                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{s.date}</span>
              </span>
              {s.masterName && (
                <span className="whitespace-nowrap text-slate-500">
                  • Master <strong className="text-slate-700 font-semibold">{s.masterName}</strong>
                </span>
              )}
              {s.notes && <span className="italic truncate text-slate-500">• "{s.notes}"</span>}
            </p>
          </div>

          {/* Right Header: Status Badge & Delete Icon */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isPending ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0 animate-pulse whitespace-nowrap">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Pending Verification</span>
              </span>
            ) : isApproved ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0 whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Verified{s.approvedBy ? ` by ${s.approvedBy}` : ''}</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shrink-0 whitespace-nowrap">
                <X className="w-3 h-3 text-rose-600" />
                <span> Rejected</span>
              </span>
            )}

            {(isPending || isRejected) && (
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSubmission) {
                    onDeleteSubmission({
                      assignmentId: s.assignmentId,
                      submissionId: s.id,
                      qty: subQty,
                      earned: subTotal,
                      fabricName: s.fabricName,
                      isRejected,
                    });
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                title={isRejected ? "Dismiss rejected log" : "Cancel/Delete pending submission"}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Prominent rejection reason alert box if rejected */}
        {isRejected && s.rejectionReason && (
          <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Rejection Reason: "{s.rejectionReason}"</span>
              <span className="text-[10px] text-rose-600 font-medium">Pieces returned to your stitch quota. You can re-count and submit again.</span>
            </div>
          </div>
        )}

        {/* Middle: Sub-parts Chips */}
        {hasSubParts ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(s.subParts).map(([k, v]) => {
              const count = parseInt(v, 10) || 0;
              if (count <= 0) return null;
              const label = k.charAt(0).toUpperCase() + k.slice(1);
              const normKey = k.toLowerCase().trim();
              const partRate = parseFloat(parentRates[k]) || parseFloat(parentRates[normKey]) || 0;
              return (
                <span
                  key={k}
                  className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${isRejected
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                >
                  <span>{label}: {count}</span>
                  {partRate > 0 && <span className="opacity-75 font-semibold">@ ₹{partRate}</span>}
                </span>
              );
            })}
          </div>
        ) : s.parts && typeof s.parts === 'object' && Object.keys(s.parts).some((k) => (parseInt(s.parts[k], 10) || 0) > 0) ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(s.parts).map(([k, v]) => {
              const pCount = parseInt(v, 10) || 0;
              if (pCount <= 0) return null;
              const label = k.charAt(0).toUpperCase() + k.slice(1);
              return (
                <span
                  key={k}
                  className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${isRejected
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                >
                  <span>{label}: {pCount}</span>
                </span>
              );
            })}
          </div>
        ) : null}

        {/* Bottom Summary Strip: Quantity Submitted & Financial Value */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">Submitted:</span>
            <span
              className={`font-black text-xs ${isRejected
                ? 'text-rose-600'
                : isPending
                  ? 'text-amber-700'
                  : 'text-emerald-700'
                }`}
            >
              {isRejected ? '✕ ' : '+'}{subQty} {subLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`font-black text-xs ${isRejected
                ? 'text-rose-500'
                : isPending
                  ? 'text-amber-800'
                  : 'text-slate-800'
                }`}
            >
              {isRejected ? (
                <span>₹{Math.round(subTotal).toLocaleString('en-IN')} (Rejected)</span>
              ) : (
                <span>+₹{Math.round(subTotal).toLocaleString('en-IN')}</span>
              )}
            </span>
            {isPending && (
              <span className="text-[9px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded border border-amber-200">
                Pending
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Work Submissions ({activeSubmissions.length})
          </h3>
          <p className="text-[11px] text-slate-500">Submissions handed over to Master for physical verification</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {pendingSubs.length > 0 && (
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
              <span>{pendingSubs.length} pending master count</span>
            </span>
          )}
          {rejectedSubs.length > 0 && (
            <span className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>{rejectedSubs.length} rejected</span>
            </span>
          )}
        </div>
      </div>

      {/* Sub-status Quick Filter Tabs & Lot Group Expand/Collapse */}
      {activeSubmissions.length > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 w-fit flex-wrap">
            <button
              type="button"
              onClick={() => setSubStatusFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                subStatusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({activeSubmissions.length})
            </button>
            <button
              type="button"
              onClick={() => setSubStatusFilter('verified')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                subStatusFilter === 'verified'
                  ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Verified ({approvedSubs.length})</span>
            </button>
            {pendingSubs.length > 0 && (
              <button
                type="button"
                onClick={() => setSubStatusFilter('pending')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  subStatusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-2xs font-extrabold'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                <Clock className="w-3 h-3 animate-pulse" />
                <span>Pending ({pendingSubs.length})</span>
              </button>
            )}
            {rejectedSubs.length > 0 && (
              <button
                type="button"
                onClick={() => setSubStatusFilter('rejected')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  subStatusFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                    : 'text-rose-700 hover:text-rose-900'
                }`}
              >
                <X className="w-3 h-3" />
                <span>Rejected ({rejectedSubs.length})</span>
              </button>
            )}
          </div>

          {groupedSubmissions.length > 0 && (
            <button
              type="button"
              onClick={toggleAllLotsCollapse}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>{isAllLotsCollapsed ? 'Expand All Lots' : `Collapse All Lots (${groupedSubmissions.length})`}</span>
            </button>
          )}
        </div>
      )}

      {/* Explanatory Banner for Rejected Submissions */}
      {rejectedSubs.length > 0 && (subStatusFilter === 'all' || subStatusFilter === 'rejected') && (
        <div className="p-3.5 bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-rose-500/15 rounded-2xl border border-rose-300 shadow-xs space-y-1.5 text-left animate-in fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                Rejected by Master ({rejectedSubs.length})
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                Quota Restored
              </span>
              {onDeleteSubmission && (
                <button
                  type="button"
                  onClick={() => {
                    rejectedSubs.forEach((s) => {
                      onDeleteSubmission({
                        assignmentId: s.assignmentId,
                        submissionId: s.id,
                        qty: parseInt(s.pscQuantity, 10) || parseInt(s.quantity, 10) || 0,
                        earned: s.earnedAmount || 0,
                        fabricName: s.fabricName,
                        isRejected: true,
                      });
                    });
                  }}
                  className="text-[10px] font-bold text-rose-800 hover:text-rose-950 bg-white hover:bg-rose-50 px-2 py-0.5 rounded-full border border-rose-300 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                  title="Dismiss all rejected logs from view"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Dismiss All</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-rose-900/90 leading-relaxed">
            Master identified a count mismatch or defect on {rejectedPcsCount} PC(s). These pieces have been returned to your remaining stitch quota so you can re-count and re-submit.
          </p>
        </div>
      )}

      {displayedSubmissions.length === 0 ? (
        <div className="p-8 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">
            {subStatusFilter === 'rejected'
              ? 'No Rejected Submissions'
              : subStatusFilter === 'pending'
                ? 'No Submissions Pending Count'
                : subStatusFilter === 'verified'
                  ? 'No Verified Submissions Yet'
                  : 'No Active Work Logged'}
          </h4>
          <p className="text-xs text-slate-500">
            {subStatusFilter === 'all'
              ? 'Tap "Submit" on any active stitching assignment to report PCs stitched today.'
              : 'Switch filter to "All" to view all work submissions.'}
          </p>
          {archivedSubmissions.length > 0 && subStatusFilter === 'all' && (
            <button
              type="button"
              onClick={() => {
                if (setActiveTab) setActiveTab('archive');
                if (setArchiveSubFilter) setArchiveSubFilter('logs');
              }}
              className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              <span>View {archivedSubmissions.length} Approved Submissions in Archive</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {groupedSubmissions.map((group) => {
            const isCollapsed = collapsedLots.has(group.lotKey);
            let lotTotalQty = 0;
            let lotTotalEarned = 0;

            group.items.forEach((s) => {
              let subQty = parseInt(s.pscQuantity, 10) || 0;
              if (subQty === 0 && s.subParts && typeof s.subParts === 'object') {
                subQty = Object.values(s.subParts).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
              }
              if (subQty === 0) subQty = parseInt(s.quantity, 10) || 0;
              lotTotalQty += subQty;

              const parentAssignment = tailorAssignments.find((ta) => ta.id === s.assignmentId || ta.fabricName === s.fabricName);
              const parentRates = parentAssignment?.tailorRates || {};

              let subTotal = 0;
              const hasSubParts = s.subParts && typeof s.subParts === 'object' && Object.keys(s.subParts).some((k) => (parseInt(s.subParts[k], 10) || 0) > 0);

              if (hasSubParts) {
                Object.entries(s.subParts).forEach(([k, v]) => {
                  const cnt = parseInt(v, 10) || 0;
                  const normKey = k.toLowerCase().trim();
                  const pRate = parseFloat(parentRates[k]) || parseFloat(parentRates[normKey]) || parseFloat(s.ratePerPiece) || 25;
                  subTotal += cnt * pRate;
                });
              } else {
                subTotal = s.earnedAmount !== undefined ? parseFloat(s.earnedAmount) : subQty * (parseFloat(s.ratePerPiece) || 0);
              }

              if (s.approvalStatus !== 'Rejected') {
                lotTotalEarned += subTotal;
              }
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
                      +{lotTotalQty} PCs • ₹{Math.round(lotTotalEarned).toLocaleString('en-IN')} ({group.items.length} {group.items.length === 1 ? 'log' : 'logs'})
                    </span>
                  }
                />
                {!isCollapsed && (
                  <div className="space-y-2.5 pl-2 sm:pl-3 border-l-2 border-emerald-200 ml-2 sm:ml-3">
                    {group.items.map((s, idx) => renderSubmissionCard(s, idx))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Link to Archive for past approved submissions */}
      {archivedSubmissions.length > 0 && (
        <div className="p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200 text-center space-y-1 mt-3">
          <p className="text-xs text-slate-600 font-medium">
            {archivedSubmissions.length} approved submissions from completed jobs are safely archived.
          </p>
          <button
            type="button"
            onClick={() => {
              if (setActiveTab) setActiveTab('archive');
              if (setArchiveSubFilter) setArchiveSubFilter('logs');
            }}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View approved log history in Archive</span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
