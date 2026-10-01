import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Calendar,
  Plus,
  UserCheck,
  Archive,
  Edit3,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { sanitizeFabricName } from '../../context/managementContextInstance';
import {
  getCuttingTotalPieces,
  getAssignmentSubPartsList,
  getCuttingSubPartsList,
  formatPieceName,
  getAssignmentPieceName,
} from '../../utils/productUtils';
import { groupItemsByLot } from '../../utils/lotGrouping';
import LotGroupHeader from '../orders/LotGroupHeader';

export default function MasterCuttingsTab({
  activeCuttings = [],
  archivedCuttings = [],
  fabrics = [],
  tailorAssignments = [],
  expandedCuttingIds = new Set(),
  toggleCuttingExpand,
  isAllCuttingsExpanded: _isAllCuttingsExpanded,
  toggleAllCuttingsExpand: _toggleAllCuttingsExpand,
  getCuttingBalance,
  onOpenNewCut,
  onEditCutting,
  setActiveTab,
  setArchiveSubFilter,
}) {
  // Group active cuttings by Fabric Lot (matching Admin Portal design)
  const groupedCuttings = useMemo(
    () => groupItemsByLot(activeCuttings, fabrics, activeCuttings),
    [activeCuttings, fabrics]
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
    groupedCuttings.length > 0 && groupedCuttings.every((g) => collapsedLots.has(g.lotKey));

  const toggleAllLots = () => {
    if (isAllLotsCollapsed) {
      setCollapsedLots(new Set());
    } else {
      setCollapsedLots(new Set(groupedCuttings.map((g) => g.lotKey)));
    }
  };

  const renderCuttingCard = (c) => {
    const f = fabrics.find((fab) => fab.id === c.fabricId);
    const balance = getCuttingBalance ? getCuttingBalance(c.id) : null;
    const batchAssignments = tailorAssignments.filter((a) => a.cuttingId === c.id);
    const isExpanded = expandedCuttingIds.has(c.id);
    const formattedDate = c.cutDate || (c.createdAt ? c.createdAt.split('T')[0] : (c.date || 'Recent'));

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
                className="text-[11px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg"
                title={`Product: ${c.productName || 'Garment'} • Cut PCs: ${getCuttingTotalPieces(c, f)}`}
              >
                {getCuttingTotalPieces(c, f)} Cut PCs
              </span>
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onEditCutting) onEditCutting(c);
              }}
              className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all cursor-pointer"
              title="Modify this cutting batch"
            >
              <Edit3 className="w-4 h-4" />
            </button>
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
            {(() => {
              const subPartsList = getCuttingSubPartsList(c, f, balance);
              return (
                <div className="space-y-2">
                  {subPartsList.map((sp, spIdx) => {
                    const totalCutInGroup = sp.components && sp.components.length > 0
                      ? sp.components.reduce((sum, comp) => sum + (parseInt(comp.count, 10) || 0), 0)
                      : (sp.count || 0);

                    return (
                      <div
                        key={sp.id || spIdx}
                        className="p-2 sm:p-2.5 bg-slate-50/80 border border-slate-200/70 rounded-xl space-y-1.5 text-left"
                      >
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider">
                              {sp.name}
                            </span>
                            {sp.formula && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({sp.formula})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 bg-white/90 px-1.5 py-0.2 rounded border border-slate-200/60 shadow-2xs shrink-0">
                            {totalCutInGroup.toLocaleString('en-IN')} Cut PCs
                          </span>
                        </div>

                        {/* Inner Cut Pieces as Compact, Mobile-Friendly Chips */}
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
                    );
                  })}
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
                  {batchAssignments.map((a) => {
                    const cutting = c;
                    const fabric = fabrics.find((fab) => fab.id === (cutting?.fabricId || a.fabricId));
                    const spList = getAssignmentSubPartsList(a, cutting, fabric);
                    let targetPsc = 0;
                    if (spList.length > 0) {
                      targetPsc = spList.reduce((acc, sp) => acc + (parseInt(sp.count, 10) || 0), 0);
                    } else if (a.assignedSubParts && typeof a.assignedSubParts === 'object') {
                      targetPsc = Object.values(a.assignedSubParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
                    } else {
                      targetPsc = parseInt(a.totalAssignedPieces, 10) || 0;
                    }
                    const aPieceName = getAssignmentPieceName(a, targetPsc, fabric);

                    return (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-lg text-[11px] font-semibold border border-emerald-100"
                      >
                        <UserCheck className="w-3 h-3 text-emerald-600" />
                        <span>{a.tailorName} ({a.completedQuantity || 0}/{targetPsc} {formatPieceName(aPieceName, targetPsc)})</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
              <span className="text-[11px] text-slate-500">
                Total: <strong className="text-slate-900 font-extrabold">{getCuttingTotalPieces(c, f)} Cut PCs</strong>
              </span>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (onEditCutting) onEditCutting(c);
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                  title="Modify this cutting record"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Tab Top Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Production Fabric Cuts{activeCuttings && activeCuttings.length > 0 ? ` (${activeCuttings.length})` : ''}
        </h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          {groupedCuttings.length > 0 && (
            <button
              type="button"
              onClick={toggleAllLots}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title={isAllLotsCollapsed ? 'Expand all fabric lots' : 'Collapse all fabric lots'}
            >
              <Layers className="w-3 h-3 text-slate-400" />
              <span>{isAllLotsCollapsed ? 'Expand All Lots' : 'Collapse All Lots'}</span>
              <span className="text-[10px] text-slate-400 font-normal">({groupedCuttings.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenNewCut}
            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Cut</span>
          </button>
        </div>
      </div>

      {activeCuttings.length === 0 ? (
        <div className="p-8 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Scissors className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">
            {archivedCuttings.length > 0 ? 'All Fabric Cuts Completed' : 'No Fabric Cuts Logged'}
          </h4>
          <p className="text-xs text-slate-500">
            {archivedCuttings.length > 0
              ? `All ${archivedCuttings.length} fabric cuts are fully assigned and finished. View or restore them in the Archive.`
              : 'Cut PCs logged by you will be recorded here for tailor assignment.'}
          </p>
          {archivedCuttings.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('archive');
                if (setArchiveSubFilter) setArchiveSubFilter('cuttings');
              }}
              className="mt-2 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>View Archived Fabric Cuts ({archivedCuttings.length})</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {groupedCuttings.map((group) => {
            const isCollapsed = collapsedLots.has(group.lotKey);
            const lotTotalCutPieces = group.items.reduce((sum, c) => {
              const f = fabrics.find((fab) => fab.id === c.fabricId);
              return sum + (getCuttingTotalPieces(c, f) || 0);
            }, 0);

            return (
              <div key={group.lotKey} className="space-y-2">
                <LotGroupHeader
                  group={group}
                  activeTab="cuttings"
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleLotCollapse(group.lotKey)}
                  summaryBadge={
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                      {lotTotalCutPieces} Cut PCs ({group.items.length} {group.items.length === 1 ? 'cut' : 'cuts'})
                    </span>
                  }
                />
                {!isCollapsed && (
                  <div className="space-y-2 pl-2 sm:pl-3 border-l-2 border-purple-200 ml-2 sm:ml-3">
                    {group.items.map((c) => renderCuttingCard(c))}
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
