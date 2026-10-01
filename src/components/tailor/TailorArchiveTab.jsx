import React, { useState, useMemo } from 'react';
import {
  Archive,
  Scissors,
  TrendingUp,
  CheckCircle2,
  UserCheck,
  ArchiveRestore,
  Calendar,
  Layers,
  X,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  resolveWorkDetails,
  getAssignmentSubPartsList,
  getPieceValueFromObject,
  formatPieceName,
  getAssignmentPieceName,
} from '../../utils/productUtils';
import {
  getAssignmentPcsSummary,
  getAssignmentFinancials,
} from '../../utils/tailorHelpers';
import { groupItemsByLot } from '../../utils/lotGrouping';
import LotGroupHeader from '../orders/LotGroupHeader';

export default function TailorArchiveTab({
  archivedAssignments = [],
  archivedSubmissions = [],
  archiveSubFilter = 'orders',
  setArchiveSubFilter,
  totalApprovedEarned = 0,
  cuttings = [],
  fabrics = [],
  tailorAssignments = [],
  toggleArchiveTailorAssignment,
}) {
  const [logStatusFilter, setLogStatusFilter] = useState('all'); // 'all' | 'verified' | 'rejected'
  const [collapsedOrderLots, setCollapsedOrderLots] = useState(() => new Set());
  const [collapsedLogLots, setCollapsedLogLots] = useState(() => new Set());

  const approvedArchivedSubs = archivedSubmissions.filter((s) => s.approvalStatus === 'Approved');
  const rejectedArchivedSubs = archivedSubmissions.filter((s) => s.approvalStatus === 'Rejected');

  const displayedArchivedSubmissions = archivedSubmissions.filter((s) => {
    if (logStatusFilter === 'verified') return s.approvalStatus === 'Approved';
    if (logStatusFilter === 'rejected') return s.approvalStatus === 'Rejected';
    return true;
  });

  // Fabric lot grouping for Completed Orders
  const groupedArchivedAssignments = useMemo(
    () => groupItemsByLot(archivedAssignments, fabrics, cuttings),
    [archivedAssignments, fabrics, cuttings]
  );

  // Fabric lot grouping for Archived Logs
  const groupedArchivedSubmissions = useMemo(
    () => groupItemsByLot(displayedArchivedSubmissions, fabrics, cuttings),
    [displayedArchivedSubmissions, fabrics, cuttings]
  );

  // Order lot collapse/expand helpers
  const isAllOrderLotsCollapsed =
    groupedArchivedAssignments.length > 0 &&
    groupedArchivedAssignments.every((g) => collapsedOrderLots.has(g.lotKey));

  const toggleOrderLotCollapse = (lotKey) => {
    setCollapsedOrderLots((prev) => {
      const next = new Set(prev);
      if (next.has(lotKey)) next.delete(lotKey);
      else next.add(lotKey);
      return next;
    });
  };

  const toggleAllOrderLotsCollapse = () => {
    if (isAllOrderLotsCollapsed) {
      setCollapsedOrderLots(new Set());
    } else {
      setCollapsedOrderLots(new Set(groupedArchivedAssignments.map((g) => g.lotKey)));
    }
  };

  // Log lot collapse/expand helpers
  const isAllLogLotsCollapsed =
    groupedArchivedSubmissions.length > 0 &&
    groupedArchivedSubmissions.every((g) => collapsedLogLots.has(g.lotKey));

  const toggleLogLotCollapse = (lotKey) => {
    setCollapsedLogLots((prev) => {
      const next = new Set(prev);
      if (next.has(lotKey)) next.delete(lotKey);
      else next.add(lotKey);
      return next;
    });
  };

  const toggleAllLogLotsCollapse = () => {
    if (isAllLogLotsCollapsed) {
      setCollapsedLogLots(new Set());
    } else {
      setCollapsedLogLots(new Set(groupedArchivedSubmissions.map((g) => g.lotKey)));
    }
  };

  const renderOrderCard = (a) => {
    const cutting = (cuttings || []).find((c) => c.id === a.cuttingId);
    const fabric = (fabrics || []).find((f) => f.id === (a.fabricId || cutting?.fabricId));
    const workDetails = resolveWorkDetails(a, cutting, fabric);
    const spList = getAssignmentSubPartsList(a, cutting, fabric);
    const rates = a.tailorRates || cutting?.tailorRates || fabric?.tailorRates || {};

    const pcsSummary = getAssignmentPcsSummary(a, { cuttings, fabrics });
    const assigned = workDetails?.totalTargetPSC > 0 ? workDetails.totalTargetPSC : pcsSummary.assigned;
    const completed = parseInt(a.completedQuantity, 10) || pcsSummary.completed || assigned;
    const fin = getAssignmentFinancials(a);
    const archivePieceName = getAssignmentPieceName(a, assigned, fabric);

    // Build piece-wise rates and earnings breakdown
    const pieceWiseList = [];
    if (spList && spList.length > 0) {
      spList.forEach((sp) => {
        const target = parseInt(sp.count, 10) || 0;
        const spRate =
          parseFloat(sp.rate) > 0
            ? parseFloat(sp.rate)
            : (parseFloat(rates[sp.id]) || parseFloat(rates[sp.name?.toLowerCase()]) || parseFloat(a.ratePerPiece) || 25);

        let doneCount = 0;
        (a.dailySubmissions || []).forEach((sub) => {
          if (sub.approvalStatus === 'Rejected') return;
          if (sub.subParts && typeof sub.subParts === 'object') {
            doneCount += parseInt(
              sub.subParts[sp.id] ??
              sub.subParts[sp.name] ??
              sub.subParts[sp.name?.toLowerCase()] ??
              sub.subParts[sp.id?.toLowerCase()],
              10
            ) || 0;
          } else if (sub.parts && typeof sub.parts === 'object') {
            doneCount += getPieceValueFromObject(sub.parts, sp.name, sp.id) || 0;
          }
        });

        if (doneCount === 0 && (a.status === 'Completed' || a.isArchived)) {
          doneCount = target;
        }

        const earnedForThis = Math.round(doneCount * spRate * 100) / 100;
        pieceWiseList.push({
          id: sp.id,
          name: sp.name,
          target,
          done: doneCount,
          rate: spRate,
          earned: earnedForThis,
        });
      });
    } else if (workDetails?.rateBreakdown && workDetails.rateBreakdown.length > 0) {
      workDetails.rateBreakdown.forEach((rb) => {
        pieceWiseList.push({
          id: rb.item,
          name: rb.item,
          target: rb.count,
          done: rb.count,
          rate: rb.rate,
          earned: rb.total,
        });
      });
    } else {
      pieceWiseList.push({
        id: 'default',
        name: archivePieceName,
        target: assigned,
        done: completed,
        rate: fin.rate,
        earned: completed * fin.rate,
      });
    }

    const totalSettledEarned = pieceWiseList.reduce((acc, p) => acc + p.earned, 0) || Math.round(fin.earned);
    const calcFormula = pieceWiseList.length > 1
      ? pieceWiseList.map((p) => `${p.done}×₹${p.rate}`).join(' + ')
      : `${completed}×₹${pieceWiseList[0]?.rate || fin.rate}`;

    return (
      <div
        key={a.id}
        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-left opacity-95 hover:opacity-100 transition-opacity"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Completed &amp; Settled</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {archivePieceName}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">{a.fabricName}</h4>
            {a.masterName && (
              <p className="text-xs text-purple-600 font-semibold flex items-center gap-1 mt-0.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Master: {a.masterName}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (toggleArchiveTailorAssignment) toggleArchiveTailorAssignment(a.id, false);
            }}
            className="px-2.5 py-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            title="Restore this order to active work"
          >
            <ArchiveRestore className="w-3.5 h-3.5" />
            <span>Restore</span>
          </button>
        </div>

        {/* Breakdown banner */}
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-3 gap-2 text-xs text-center items-center">
          <div className="text-left">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Stitched</span>
            <span className="font-extrabold text-slate-900 block truncate">
              {completed} of {assigned} {formatPieceName(archivePieceName, assigned)}
            </span>
            {pieceWiseList.length > 1 && (
              <span className="text-[10px] text-slate-500 font-medium block truncate mt-0.5">
                {pieceWiseList.map((p) => `${p.done} ${formatPieceName(p.name, p.done)}`).join(' + ')}
              </span>
            )}
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">
              {pieceWiseList.length > 1 ? 'PCS Rate' : 'PC Rate'}
            </span>
            {pieceWiseList.length > 1 ? (
              <div className="flex flex-wrap items-center justify-center gap-1 mt-0.5">
                {pieceWiseList.map((p) => (
                  <span
                    key={p.id || p.name}
                    className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs"
                  >
                    <span className="capitalize text-slate-500">{p.name}:</span>
                    <strong className="text-indigo-700">₹{p.rate}</strong>
                  </span>
                ))}
              </div>
            ) : (
              <span className="font-extrabold text-slate-700 block mt-0.5">
                ₹{pieceWiseList[0]?.rate || fin.rate}/{formatPieceName(archivePieceName, 1)}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Earned</span>
            <span className="font-black text-emerald-700 block text-sm">
              ₹{Math.round(totalSettledEarned).toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] text-slate-500 font-bold block mt-0.5 truncate" title={`Base: ${calcFormula}`}>
              Base: {calcFormula}
            </span>
          </div>
        </div>

        {/* Piece-Wise Settlement Breakdown */}
        {pieceWiseList.length > 1 && (
          <div className="p-2.5 bg-emerald-50/40 rounded-xl border border-emerald-100/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-950 uppercase tracking-wider">
              <span>Piece-Wise Settlement Breakdown</span>
              <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified &amp; Approved</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {pieceWiseList.map((p) => (
                <div
                  key={p.id || p.name}
                  className="p-2 bg-white rounded-lg border border-emerald-200/60 flex items-center justify-between text-xs shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-900 capitalize truncate">{p.name}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      ({p.done} pcs @ ₹{p.rate})
                    </span>
                  </div>
                  <span className="font-black text-emerald-800 shrink-0 ml-2">
                    ₹{Math.round(p.earned).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderArchivedLogCard = (s, idx) => {
    let subQty = parseInt(s.pscQuantity, 10) || 0;
    if (subQty === 0 && s.subParts && typeof s.subParts === 'object') {
      subQty = Object.values(s.subParts).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
    }
    if (subQty === 0) subQty = parseInt(s.quantity, 10) || 0;

    const parentAssignment = tailorAssignments.find((ta) => ta.id === s.assignmentId || ta.fabricName === s.fabricName);
    const parentRates = parentAssignment?.tailorRates || {};

    let subTotal = 0;
    if (s.subParts && typeof s.subParts === 'object' && Object.keys(s.subParts).length > 0) {
      Object.entries(s.subParts).forEach(([k, v]) => {
        const cnt = parseInt(v, 10) || 0;
        const normKey = k.toLowerCase().trim();
        const pRate = parseFloat(parentRates[k]) || parseFloat(parentRates[normKey]) || parseFloat(s.ratePerPiece) || 25;
        subTotal += cnt * pRate;
      });
    } else {
      subTotal = s.earnedAmount !== undefined ? parseFloat(s.earnedAmount) : subQty * (parseFloat(s.ratePerPiece) || 0);
    }

    const hasSubParts = s.subParts && typeof s.subParts === 'object' && Object.keys(s.subParts).some((k) => (parseInt(s.subParts[k], 10) || 0) > 0);

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

    const isRejected = s.approvalStatus === 'Rejected';
    const isPending = s.approvalStatus === 'Pending Approval' || s.approvalStatus === 'Pending';

    return (
      <div
        key={s.id || idx}
        className={`p-3.5 sm:p-4 bg-white rounded-2xl border shadow-2xs space-y-2.5 text-left transition-all ${
          isRejected
            ? 'border-rose-200 bg-rose-50/15 hover:border-rose-300'
            : isPending
              ? 'border-amber-200/90 bg-amber-50/10 hover:border-amber-300'
              : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Top Row: Title, Date & Status Badge */}
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
              {s.notes && <span className="italic truncate text-slate-500">• "{s.notes}"</span>}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isRejected ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shrink-0">
                <X className="w-3 h-3 text-rose-600" />
                <span>Rejected</span>
              </span>
            ) : isPending ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0 animate-pulse">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Pending Approval</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Verified{s.approvedBy ? ` by ${s.approvedBy}` : ''}</span>
              </span>
            )}
          </div>
        </div>

        {/* Rejection notice if rejected */}
        {isRejected && s.rejectionReason && (
          <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Rejected by Master: {s.rejectionReason}</span>
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
                  className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${
                    isRejected
                      ? 'bg-rose-50 text-rose-700 border-rose-200 line-through opacity-75'
                      : isPending
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
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
                  className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${
                    isRejected
                      ? 'bg-rose-50 text-rose-700 border-rose-200 line-through opacity-75'
                      : isPending
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  <span>{label}: {pCount}</span>
                </span>
              );
            })}
          </div>
        ) : null}

        {/* Bottom Summary Bar: Total & Value */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">Submitted:</span>
            <span
              className={`font-black text-xs ${
                isRejected
                  ? 'text-rose-600'
                  : isPending
                    ? 'text-amber-700'
                    : 'text-emerald-700'
              }`}
            >
              +{subQty} {subLabel} {isRejected && '(Not Counted)'}
            </span>
          </div>

          {isRejected ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 line-through">
                +₹{Math.round(subTotal).toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-black text-rose-600">
                ₹0 (Rejected)
              </span>
            </div>
          ) : (
            <span className="text-xs font-black text-slate-800">
              +₹{Math.round(subTotal).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Archive Summary Header */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3 text-left">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Archived Records</h3>
              <p className="text-[11px] text-slate-500">
                Completed stitching fabric cuts &amp; verified approved work logs
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Verified</span>
            <span className="text-sm font-black text-emerald-700">
              ₹{Math.round(totalApprovedEarned).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Sub-Filter Switcher */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              if (setArchiveSubFilter) setArchiveSubFilter('orders');
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${archiveSubFilter === 'orders'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Completed Orders ({archivedAssignments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (setArchiveSubFilter) setArchiveSubFilter('logs');
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${archiveSubFilter === 'logs'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Archived Logs ({archivedSubmissions.length})</span>
          </button>
        </div>
      </div>

      {/* Sub-view: Completed Orders */}
      {archiveSubFilter === 'orders' && (
        <div className="space-y-3">
          {archivedAssignments.length > 0 && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={toggleAllOrderLotsCollapse}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>{isAllOrderLotsCollapsed ? 'Expand All Lots' : `Collapse All Lots (${groupedArchivedAssignments.length})`}</span>
              </button>
            </div>
          )}

          {archivedAssignments.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Scissors className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">No Completed Orders in Archive</h4>
              <p className="text-xs text-slate-500">
                When you finish stitching all PCs of an assigned batch, it will be safely archived here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedArchivedAssignments.map((group) => {
                const isCollapsed = collapsedOrderLots.has(group.lotKey);
                let lotCompletedPSC = 0;
                let lotTotalPSC = 0;
                let lotTotalSettledEarned = 0;

                group.items.forEach((a) => {
                  const cutting = (cuttings || []).find((c) => c.id === a.cuttingId);
                  const fabric = (fabrics || []).find((f) => f.id === (a.fabricId || cutting?.fabricId));
                  const workDetails = resolveWorkDetails(a, cutting, fabric);
                  const pcsSummary = getAssignmentPcsSummary(a, { cuttings, fabrics });
                  const assigned = workDetails?.totalTargetPSC > 0 ? workDetails.totalTargetPSC : pcsSummary.assigned;
                  const completed = parseInt(a.completedQuantity, 10) || pcsSummary.completed || assigned;
                  const fin = getAssignmentFinancials(a);
                  lotTotalPSC += assigned;
                  lotCompletedPSC += completed;
                  lotTotalSettledEarned += fin.earned;
                });

                return (
                  <div key={group.lotKey} className="space-y-2">
                    <LotGroupHeader
                      group={group}
                      activeTab="assignments"
                      isCollapsed={isCollapsed}
                      onToggle={() => toggleOrderLotCollapse(group.lotKey)}
                      summaryBadge={
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          {lotCompletedPSC}/{lotTotalPSC} PCs • ₹{Math.round(lotTotalSettledEarned).toLocaleString('en-IN')} ({group.items.length} {group.items.length === 1 ? 'order' : 'orders'})
                        </span>
                      }
                    />
                    {!isCollapsed && (
                      <div className="space-y-3 pl-2 sm:pl-3 border-l-2 border-emerald-200 ml-2 sm:ml-3">
                        {group.items.map((a) => renderOrderCard(a))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-view: Approved / Archived Work Logs */}
      {archiveSubFilter === 'logs' && (
        <div className="space-y-3">
          {archivedSubmissions.length > 0 && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 w-fit flex-wrap">
                <button
                  type="button"
                  onClick={() => setLogStatusFilter('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    logStatusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs font-extrabold ring-1 ring-black/5'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({archivedSubmissions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLogStatusFilter('verified')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    logStatusFilter === 'verified'
                      ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                      : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified ({approvedArchivedSubs.length})</span>
                </button>
                {rejectedArchivedSubs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLogStatusFilter('rejected')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      logStatusFilter === 'rejected'
                        ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                        : 'text-rose-700 hover:text-rose-900'
                    }`}
                  >
                    <X className="w-3 h-3" />
                    <span>Rejected ({rejectedArchivedSubs.length})</span>
                  </button>
                )}
              </div>

              {groupedArchivedSubmissions.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllLogLotsCollapse}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isAllLogLotsCollapsed ? 'Expand All Lots' : `Collapse All Lots (${groupedArchivedSubmissions.length})`}</span>
                </button>
              )}
            </div>
          )}

          {displayedArchivedSubmissions.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">
                No {logStatusFilter === 'rejected' ? 'Rejected' : logStatusFilter === 'verified' ? 'Verified' : ''} Logs in Archive
              </h4>
              <p className="text-xs text-slate-500">
                Daily submissions from completed fabric cuts will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedArchivedSubmissions.map((group) => {
                const isCollapsed = collapsedLogLots.has(group.lotKey);
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
                  if (s.subParts && typeof s.subParts === 'object' && Object.keys(s.subParts).length > 0) {
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
                      onToggle={() => toggleLogLotCollapse(group.lotKey)}
                      summaryBadge={
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          +{lotTotalQty} PCs • ₹{Math.round(lotTotalEarned).toLocaleString('en-IN')} ({group.items.length} {group.items.length === 1 ? 'log' : 'logs'})
                        </span>
                      }
                    />
                    {!isCollapsed && (
                      <div className="space-y-2.5 pl-2 sm:pl-3 border-l-2 border-emerald-200 ml-2 sm:ml-3">
                        {group.items.map((s, idx) => renderArchivedLogCard(s, idx))}
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
  );
}
