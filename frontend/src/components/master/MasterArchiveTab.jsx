import React, { useState, useMemo } from 'react';
import {
  Archive,
  Layers,
  Scissors,
  UserCheck,
  PackageCheck,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { sanitizeFabricName } from '../../context/managementContextInstance';
import {
  getCuttingTotalPieces,
  getCuttingSubPartsList,
  formatPieceName,
  getCleanDisplayNote,
} from '../../utils/productUtils';
import { getFabricTailorPscDetails } from '../../utils/masterHelpers';
import { groupItemsByLot } from '../../utils/lotGrouping';
import LotGroupHeader from '../orders/LotGroupHeader';
import PaginationControls from '../common/PaginationControls';

export default function MasterArchiveTab({
  archivedFabrics = [],
  archivedCuttings = [],
  archivedAssignments = [],
  archivedThreadJobs = [],
  _archivedMasterHandovers = [],
  fabrics = [],
  cuttings = [],
  tailorAssignments = [],
  totalArchivedCount = 0,
  archiveSubFilter = 'fabrics',
  setArchiveSubFilter,
  getMasterHandoverStats,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Group archived items by Fabric Lot
  const groupedArchivedCuttings = useMemo(
    () => groupItemsByLot(archivedCuttings, fabrics, cuttings),
    [archivedCuttings, fabrics, cuttings]
  );
  const groupedArchivedAssignments = useMemo(
    () => groupItemsByLot(archivedAssignments, fabrics, cuttings),
    [archivedAssignments, fabrics, cuttings]
  );
  const groupedArchivedThreadJobs = useMemo(
    () => groupItemsByLot(archivedThreadJobs, fabrics, cuttings),
    [archivedThreadJobs, fabrics, cuttings]
  );

  const { currentItems, totalItems, totalPages } = useMemo(() => {
    let list = [];
    if (archiveSubFilter === 'cuttings') list = groupedArchivedCuttings;
    else if (archiveSubFilter === 'assignments') list = groupedArchivedAssignments;
    else if (archiveSubFilter === 'trimming') list = groupedArchivedThreadJobs;
    else list = archivedFabrics;

    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(currentPage, pages);
    const from = (safePage - 1) * pageSize;
    return {
      currentItems: list.slice(from, from + pageSize),
      totalItems: total,
      totalPages: pages,
    };
  }, [archiveSubFilter, groupedArchivedCuttings, groupedArchivedAssignments, groupedArchivedThreadJobs, archivedFabrics, currentPage, pageSize]);

  const [collapsedCuttingLots, setCollapsedCuttingLots] = useState(() => new Set());
  const [collapsedAssignmentLots, setCollapsedAssignmentLots] = useState(() => new Set());
  const [collapsedTrimmingLots, setCollapsedTrimmingLots] = useState(() => new Set());
  const [expandedCuttingIds, setExpandedCuttingIds] = useState(() => new Set());

  const toggleCuttingExpand = (cuttingId) => {
    setExpandedCuttingIds((prev) => {
      const next = new Set(prev);
      if (next.has(cuttingId)) next.delete(cuttingId);
      else next.add(cuttingId);
      return next;
    });
  };

  const toggleCuttingLot = (lotKey) => {
    setCollapsedCuttingLots((prev) => {
      const next = new Set(prev);
      if (next.has(lotKey)) next.delete(lotKey);
      else next.add(lotKey);
      return next;
    });
  };
  const isAllCuttingLotsCollapsed =
    groupedArchivedCuttings.length > 0 &&
    groupedArchivedCuttings.every((g) => collapsedCuttingLots.has(g.lotKey));
  const toggleAllCuttingLots = () => {
    if (isAllCuttingLotsCollapsed) setCollapsedCuttingLots(new Set());
    else setCollapsedCuttingLots(new Set(groupedArchivedCuttings.map((g) => g.lotKey)));
  };

  const toggleAssignmentLot = (lotKey) => {
    setCollapsedAssignmentLots((prev) => {
      const next = new Set(prev);
      if (next.has(lotKey)) next.delete(lotKey);
      else next.add(lotKey);
      return next;
    });
  };
  const isAllAssignmentLotsCollapsed =
    groupedArchivedAssignments.length > 0 &&
    groupedArchivedAssignments.every((g) => collapsedAssignmentLots.has(g.lotKey));
  const toggleAllAssignmentLots = () => {
    if (isAllAssignmentLotsCollapsed) setCollapsedAssignmentLots(new Set());
    else setCollapsedAssignmentLots(new Set(groupedArchivedAssignments.map((g) => g.lotKey)));
  };

  const toggleTrimmingLot = (lotKey) => {
    setCollapsedTrimmingLots((prev) => {
      const next = new Set(prev);
      if (next.has(lotKey)) next.delete(lotKey);
      else next.add(lotKey);
      return next;
    });
  };
  const isAllTrimmingLotsCollapsed =
    groupedArchivedThreadJobs.length > 0 &&
    groupedArchivedThreadJobs.every((g) => collapsedTrimmingLots.has(g.lotKey));
  const toggleAllTrimmingLots = () => {
    if (isAllTrimmingLotsCollapsed) setCollapsedTrimmingLots(new Set());
    else setCollapsedTrimmingLots(new Set(groupedArchivedThreadJobs.map((g) => g.lotKey)));
  };

  const renderArchivedCuttingCard = (c) => {
    const f = fabrics.find((fab) => fab.id === c.fabricId);
    const batchAssignments = tailorAssignments.filter((a) => a.cuttingId === c.id);
    const stats = getMasterHandoverStats ? getMasterHandoverStats(c.id) : null;
    const isDone = c.masterWorkDone || (stats && stats.isMasterWorkDone);
    const isExpanded = expandedCuttingIds.has(c.id);
    const formattedDate = c.cutDate || (c.createdAt ? c.createdAt.split('T')[0] : (c.date || 'Recent'));
    const totalCutPsc = getCuttingTotalPieces(c, f);

    return (
      <div
        key={c.id}
        className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs text-left ${
          isExpanded ? 'border-purple-200 ring-2 ring-purple-500/10' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Collapsible Header Summary Row */}
        <div
          onClick={() => toggleCuttingExpand(c.id)}
          className="p-3.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-slate-900 truncate">{sanitizeFabricName(c.fabricName)}</h4>
              <span
                className="text-[11px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg shrink-0"
                title={`Product: ${c.productName || 'Garment'} • Cut PCs: ${totalCutPsc}`}
              >
                {totalCutPsc} Cut PCs
              </span>
              {isDone ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 flex items-center gap-1">
                  <PackageCheck className="w-3 h-3 text-emerald-600" />
                  <span>Master Work Complete</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-slate-500" />
                  <span>Completed Batch</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-slate-600 font-medium">
                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{formattedDate}</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-purple-900 font-semibold">
                Master Cut Log
              </span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 hidden xs:inline">
              Archived
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 ${
                isExpanded ? 'rotate-180 bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Expandable Details Section */}
        {isExpanded && (
          <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-100 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Piece totals as Chips */}
            {(() => {
              const subPartsList = getCuttingSubPartsList(c, f);
              return (
                <div className="space-y-2">
                  {subPartsList.map((sp, spIdx) => (
                    <div
                      key={sp.id || spIdx}
                      className="p-2 sm:p-2.5 bg-slate-50/80 border border-slate-200/70 rounded-xl space-y-1.5 text-left"
                    >
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider truncate">
                            {sp.name}
                          </span>
                          {sp.formula && (
                            <span className="text-[9px] text-slate-400 font-medium truncate">
                              ({sp.formula})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded-md shrink-0">
                          {sp.count} PCs ready
                        </span>
                      </div>

                      {/* Inner Cut Pieces as Compact Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(sp.components || []).map((comp) => (
                          <span
                            key={comp.id || comp.name}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-slate-200/90 shadow-2xs text-xs"
                          >
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                              {comp.name}:
                            </span>
                            <strong className="text-xs font-black text-slate-900">
                              {(comp.count || 0).toLocaleString('en-IN')}
                            </strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Assigned Tailors summary badge */}
            {batchAssignments.length > 0 && (
              <div className="pt-1 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Assigned Tailors:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {batchAssignments.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-semibold"
                    >
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      <span>{a.tailorName} ({a.completedQuantity || 0}/{a.totalAssignedPieces} {formatPieceName(a.pieceType || c.productName || 'Pieces', a.totalAssignedPieces)})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Handover to Admin verification stats */}
            {stats && stats.submittedPSC > 0 && (
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium flex items-center gap-1">
                  <PackageCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Handed over to Admin:</span>
                </span>
                <span className="font-bold text-slate-800">
                  {stats.submittedPSC} / {stats.totalExpectedPSC} {formatPieceName(c.productName || 'Pieces', stats.totalExpectedPSC)}
                  <span className="text-emerald-700 ml-1">({stats.verifiedPSC} verified)</span>
                  {stats.pendingPSC > 0 && (
                    <span className="text-amber-600 ml-1">({stats.pendingPSC} pending)</span>
                  )}
                </span>
              </div>
            )}

            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Total: <strong>{totalCutPsc} Cut PCs</strong> ({c.totalSets} Sets)</span>
              {c.archivedAt && <span>Archived: {new Date(c.archivedAt).toLocaleDateString()}</span>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderArchivedAssignmentCard = (a) => {
    const assigned = parseInt(a.totalAssignedPieces, 10) || 0;
    const completed = parseInt(a.completedQuantity, 10) || 0;

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
                <span>Completed &amp; Verified</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {a.pieceType || 'PCs'}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">{a.tailorName}</h4>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              <span className="font-semibold text-slate-700">{sanitizeFabricName(a.fabricName)}</span>
              {a.machineCode && <span>• Machine: <strong>{a.machineCode}</strong></span>}
            </p>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
            Archived
          </span>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Stitched</span>
            <span className="font-extrabold text-slate-900">{completed} of {assigned} PCs (100%)</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Assigned Date</span>
            <span className="font-semibold text-slate-700">{a.assignDate || '—'}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderArchivedTrimmingCard = (tc) => {
    const isSkip = tc.status === 'Skipped' || tc.actionType === 'skip';
    const pcs = parseInt(tc.assignedPSC ?? tc.assignedPieces, 10) || 0;
    const completed = parseInt(tc.completedPSC ?? tc.completedPieces, 10) || 0;

    return (
      <div
        key={tc.id}
        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-left opacity-95 hover:opacity-100 transition-opacity"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSkip
                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                {isSkip ? 'Skipped & Locked' : 'Trimmed & Archived'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                {tc.subPartName || tc.subPart || 'Pieces'}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              +{pcs} PSC {tc.fabricName ? `• ${sanitizeFabricName(tc.fabricName)}` : ''}
            </h4>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              <span>by <strong>{tc.helperName || 'Helper'}</strong></span>
              {tc.helperType && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {tc.helperType === 'external' ? 'External' : 'Staff'}
                </span>
              )}
              <span>• {tc.completionDate || tc.assignedDate || 'Recent'}</span>
            </p>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
            Archived
          </span>
        </div>

        {!isSkip && (
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Trimmed Output</span>
              <span className="font-extrabold text-slate-900">
                {completed} of {pcs} PSC ({Math.min(100, Math.round((completed / (pcs || 1)) * 100))}%)
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Helper</span>
              <span className="font-semibold text-slate-700">{tc.helperName || 'Helper'}</span>
            </div>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="space-y-3">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-left">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 truncate">
            <Archive className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>Master Archive &amp; Completed Work</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            Completed fabrics archived after full production and Admin approval.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200/80 rounded-xl shadow-2xs">
          <span className="text-xs font-black">{totalArchivedCount}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Archived</span>
        </div>
      </div>

      {/* Archive Sub-Filter Switcher: 4 Tabs - Matching Main Tab Selector (Top Icon, Center Title, Bottom Count) */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
        {[
          { id: 'fabrics', label: 'Fabrics', count: archivedFabrics.length, icon: Layers },
          { id: 'cuttings', label: 'Cuts', count: archivedCuttings.length, icon: Scissors },
          { id: 'assignments', label: 'Tailors', count: archivedAssignments.length, icon: UserCheck },
          { id: 'trimming', label: 'Trimming', count: archivedThreadJobs.length, icon: Scissors },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = archiveSubFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setCurrentPage(1);
                if (setArchiveSubFilter) setArchiveSubFilter(tab.id);
              }}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 relative cursor-pointer ${
                isActive
                  ? 'bg-white text-purple-700 shadow-xs ring-1 ring-black/5 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] sm:text-xs truncate font-bold">{tab.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold leading-none shrink-0 ${
                  isActive
                    ? 'bg-purple-50 text-purple-700'
                    : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-view: Archived Fabric Cuts */}
      {archiveSubFilter === 'cuttings' && (
        <div className="space-y-3">
          {archivedCuttings.length === 0 ? (
            <div className="p-6 sm:p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <Scissors className="w-5 h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800">No Archived Fabric Cuts</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 max-w-sm mx-auto">
                When all Cut PCs of a fabric cut are finished and assigned, it will appear here.
              </p>
            </div>
          ) : (
            <>
              {groupedArchivedCuttings.length > 0 && (
                <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Archived Lots ({groupedArchivedCuttings.length})
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        if (expandedCuttingIds.size === archivedCuttings.length) {
                          setExpandedCuttingIds(new Set());
                        } else {
                          setExpandedCuttingIds(new Set(archivedCuttings.map((c) => c.id)));
                        }
                      }}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <span>
                        {expandedCuttingIds.size === archivedCuttings.length
                          ? 'Collapse All Cuts'
                          : 'Expand All Cuts'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleAllCuttingLots}
                      className="text-[11px] font-bold text-purple-700 hover:text-purple-900 px-2 py-0.5 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3 h-3 text-purple-600" />
                      <span>
                        {isAllCuttingLotsCollapsed
                          ? 'Expand All Lots'
                          : `Collapse All Lots (${groupedArchivedCuttings.length})`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {currentItems.map((group) => {
                const isCollapsed = collapsedCuttingLots.has(group.lotKey);
                const lotTotalCutPieces = group.items.reduce((sum, c) => {
                  const f = fabrics.find((fab) => fab.id === c.fabricId);
                  return sum + (getCuttingTotalPieces(c, f) || 0);
                }, 0);

                return (
                  <div key={group.lotKey} className="space-y-2">
                    <LotGroupHeader
                      group={{ ...group, isArchived: true }}
                      activeTab="cuttings"
                      isCollapsed={isCollapsed}
                      onToggle={() => toggleCuttingLot(group.lotKey)}
                      summaryBadge={
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                          {lotTotalCutPieces} Cut PCs ({group.items.length} {group.items.length === 1 ? 'cut' : 'cuts'})
                        </span>
                      }
                    />
                    {!isCollapsed && (
                      <div className="space-y-2 pl-2 sm:pl-3 border-l-2 border-purple-200 ml-2 sm:ml-3">
                        {group.items.map((c) => renderArchivedCuttingCard(c))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Sub-view: Archived Fabrics */}
      {archiveSubFilter === 'fabrics' && (
        <div className="space-y-3">
          {archivedFabrics.length === 0 ? (
            <div className="p-6 sm:p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800">No Archived Fabric Lots</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 max-w-sm mx-auto">
                Completed fabric lots that have been archived will be listed here.
              </p>
            </div>
          ) : (
            currentItems.map((f) => (
              <div
                key={f.id}
                className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5 sm:space-y-3 text-left opacity-95 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{f.status === 'Completed' ? 'Completed' : 'Archived'}</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {f.color || 'Standard Color'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 truncate">{f.fabricType}</h4>
                    {f.dueDate && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Due: {f.dueDate}</span>
                      </p>
                    )}
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    Archived
                  </span>
                </div>

                {/* Details grid */}
                {(() => {
                  const tailorDetails = getFabricTailorPscDetails(f.id, {
                    fabrics,
                    cuttings,
                    tailorAssignments,
                    getMasterHandoverStats,
                  });
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-1 text-center">
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Color</span>
                        <span className="text-xs font-extrabold text-slate-800 truncate block mt-0.5">{f.color || 'Standard'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Plain</span>
                        <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{f.plainMeters ? `${f.plainMeters} m` : '—'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Target</span>
                        <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{f.printPieces ? `${f.printPieces} Sets` : '—'}</span>
                      </div>
                      <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-emerald-700 font-bold uppercase block">Tailor Output</span>
                        <span className="text-xs font-black text-emerald-800 block mt-0.5">{tailorDetails.totalPscReceived} {formatPieceName(tailorDetails.pieceName || f.productName || 'Pieces', tailorDetails.totalPscReceived)}</span>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const cleanNote = getCleanDisplayNote(f.notes);
                  if (!cleanNote) return null;
                  return (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                      "{cleanNote}"
                    </p>
                  );
                })()}
              </div>
            ))
          )}
        </div>
      )}

      {/* Sub-view: Archived Tailor Assignments */}
      {archiveSubFilter === 'assignments' && (
        <div className="space-y-3">
          {archivedAssignments.length === 0 ? (
            <div className="p-6 sm:p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <UserCheck className="w-5 h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800">No Archived Tailor Jobs</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 max-w-sm mx-auto">
                Completed tailor assignments for your fabric cuts will be archived here.
              </p>
            </div>
          ) : (
            <>
              {groupedArchivedAssignments.length > 0 && (
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Archived Lots ({groupedArchivedAssignments.length})
                  </span>
                  <button
                    type="button"
                    onClick={toggleAllAssignmentLots}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 px-2 py-0.5 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3 h-3 text-emerald-600" />
                    <span>
                      {isAllAssignmentLotsCollapsed
                        ? 'Expand All Lots'
                        : `Collapse All Lots (${groupedArchivedAssignments.length})`}
                    </span>
                  </button>
                </div>
              )}

              {currentItems.map((group) => {
                const isCollapsed = collapsedAssignmentLots.has(group.lotKey);
                const lotTotalPieces = group.items.reduce(
                  (sum, a) => sum + (parseInt(a.totalAssignedPieces, 10) || 0),
                  0
                );
                const lotCompletedPieces = group.items.reduce(
                  (sum, a) => sum + (parseInt(a.completedQuantity, 10) || 0),
                  0
                );

                return (
                  <div key={group.lotKey} className="space-y-2">
                    <LotGroupHeader
                      group={{ ...group, isArchived: true }}
                      activeTab="assignments"
                      isCollapsed={isCollapsed}
                      onToggle={() => toggleAssignmentLot(group.lotKey)}
                      summaryBadge={
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          {lotCompletedPieces} / {lotTotalPieces} Stitched ({group.items.length} {group.items.length === 1 ? 'job' : 'jobs'})
                        </span>
                      }
                    />
                    {!isCollapsed && (
                      <div className="space-y-2 pl-2 sm:pl-3 border-l-2 border-emerald-200 ml-2 sm:ml-3">
                        {group.items.map((a) => renderArchivedAssignmentCard(a))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Sub-view: Archived Trimming Jobs */}
      {archiveSubFilter === 'trimming' && (
        <div className="space-y-3">
          {archivedThreadJobs.length === 0 ? (
            <div className="p-6 sm:p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <Scissors className="w-5 h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800">No Archived Trimming Jobs</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 max-w-sm mx-auto">
                Completed or locked trimming batches from archived lots will appear here.
              </p>
            </div>
          ) : (
            <>
              {groupedArchivedThreadJobs.length > 0 && (
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Archived Lots ({groupedArchivedThreadJobs.length})
                  </span>
                  <button
                    type="button"
                    onClick={toggleAllTrimmingLots}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900 px-2 py-0.5 rounded-lg hover:bg-teal-50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3 h-3 text-teal-600" />
                    <span>
                      {isAllTrimmingLotsCollapsed
                        ? 'Expand All Lots'
                        : `Collapse All Lots (${groupedArchivedThreadJobs.length})`}
                    </span>
                  </button>
                </div>
              )}

              {currentItems.map((group) => {
                const isCollapsed = collapsedTrimmingLots.has(group.lotKey);
                const lotAssignedPieces = group.items.reduce(
                  (sum, tc) => sum + (parseInt(tc.assignedPSC ?? tc.assignedPieces, 10) || 0),
                  0
                );
                const lotCompletedPieces = group.items.reduce(
                  (sum, tc) => sum + (parseInt(tc.completedPSC ?? tc.completedPieces, 10) || 0),
                  0
                );

                return (
                  <div key={group.lotKey} className="space-y-2">
                    <LotGroupHeader
                      group={{ ...group, isArchived: true }}
                      activeTab="thread_cutting"
                      isCollapsed={isCollapsed}
                      onToggle={() => toggleTrimmingLot(group.lotKey)}
                      summaryBadge={
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                          {lotCompletedPieces} / {lotAssignedPieces} Trimmed ({group.items.length} {group.items.length === 1 ? 'job' : 'jobs'})
                        </span>
                      }
                    />
                    {!isCollapsed && (
                      <div className="space-y-2 pl-2 sm:pl-3 border-l-2 border-teal-200 ml-2 sm:ml-3">
                        {group.items.map((tc) => renderArchivedTrimmingCard(tc))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        pageSizeOptions={[10, 15, 30, 50]}
        theme="purple"
      />
    </div>
  );
}
