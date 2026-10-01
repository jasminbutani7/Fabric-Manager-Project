import React, { useState } from 'react';
import {
  Scissors,
  Plus,
  Truck,
  Check,
  UserCheck,
  Edit3,
  Trash2,
} from 'lucide-react';
import { sanitizeFabricName } from '../../context/managementContextInstance';
import {
  getCuttingSubPartsList,
  getCuttingTotalPieces,
} from '../../utils/productUtils';
import LotGroupHeader from './LotGroupHeader';
import PaginationControls from '../common/PaginationControls';

export default function FabricCutsTab({
  filteredCuttings,
  groupedCuttings,
  groupingMode,
  collapsedLots,
  toggleLotCollapse,
  fabrics,
  tailorAssignments,
  getCuttingBalance,
  getFabricBalance,
  searchQuery,
  setSelectedCuttingForAssign,
  setShowAssignTailorModal,
  setEditingCutting,
  setShowRecordCutModal,
  setDeleteCuttingConfirm,
  fetchCompletedCuttingsPaginated,
}) {
  const isArchiveMode = groupingMode === 'archive';
  const [flatPage, setFlatPage] = useState(1);
  const [flatPageSize, setFlatPageSize] = useState(25);

  const [dbCompletedData, setDbCompletedData] = useState({
    data: [],
    count: 0,
    totalPages: 1,
    loading: false,
  });

  React.useEffect(() => {
    let isCancelled = false;
    if (!isArchiveMode || typeof fetchCompletedCuttingsPaginated !== 'function') return;

    const loadCompletedData = async () => {
      try {
        setDbCompletedData((prev) => (prev.loading ? prev : { ...prev, loading: true }));
        const res = await fetchCompletedCuttingsPaginated({
          page: flatPage,
          pageSize: flatPageSize,
          searchQuery,
          status: 'all',
        });
        if (!isCancelled && res) {
          setDbCompletedData({
            data: res.data || [],
            count: res.count ?? 0,
            totalPages: Math.max(1, res.totalPages || Math.ceil((res.count || 0) / flatPageSize)),
            loading: false,
          });
        }
      } catch {
        if (!isCancelled) setDbCompletedData((prev) => ({ ...prev, loading: false }));
      }
    };

    loadCompletedData();
    return () => {
      isCancelled = true;
    };
  }, [isArchiveMode, flatPage, flatPageSize, searchQuery, fetchCompletedCuttingsPaginated]);

  const totalFlatPages = isArchiveMode && dbCompletedData.count > 0
    ? dbCompletedData.totalPages
    : Math.max(1, Math.ceil(filteredCuttings.length / flatPageSize));
  const safeFlatPage = Math.min(flatPage, totalFlatPages);
  const pagedCuttings = isArchiveMode && dbCompletedData.data.length > 0
    ? dbCompletedData.data
    : filteredCuttings.slice((safeFlatPage - 1) * flatPageSize, safeFlatPage * flatPageSize);
  const totalFlatItems = isArchiveMode && dbCompletedData.count > 0
    ? dbCompletedData.count
    : filteredCuttings.length;

  const [groupPage, setGroupPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(15);
  const totalGroupPages = Math.max(1, Math.ceil(groupedCuttings.length / groupPageSize));
  const safeGroupPage = Math.min(groupPage, totalGroupPages);
  const pagedGroupedCuttings = groupedCuttings.slice((safeGroupPage - 1) * groupPageSize, safeGroupPage * groupPageSize);

  const renderCuttingCard = (c) => {
    const fabric = (fabrics || []).find((f) => f.id === c.fabricId);
    const balance = getCuttingBalance ? getCuttingBalance(c.id) : null;
    const fabricBalance = getFabricBalance && c.fabricId ? getFabricBalance(c.fabricId) : null;
    const remainingTotal = balance ? balance.remaining.total : c.totalPieces;

    const isFabricFullyAssigned = Boolean(
      fabricBalance && (
        fabricBalance.isFullyAssigned ||
        (fabricBalance.totalCutPieces > 0 && fabricBalance.totalRemainingPieces <= 0) ||
        (fabricBalance.availableSets <= 0 && (!fabricBalance.availableSubParts || Object.values(fabricBalance.availableSubParts).every((v) => typeof v !== 'number' || v <= 0)))
      )
    );

    // Check assignments for this cutting or fabric
    const cuttingAssignments = (tailorAssignments || []).filter(
      (a) => (a.cuttingId === c.id || a.fabricId === c.fabricId) && a.status !== 'Declined'
    );
    const hasAssignments = cuttingAssignments.length > 0;

    // Subparts breakdown
    const subPartsList = getCuttingSubPartsList(c, fabric, balance);

    // Calculate how many complete subparts / sets can still be formed from the remaining cut pieces
    const subPartAvails = subPartsList.map((sp) => {
      if (sp.components && sp.components.length > 0) {
        const minUnits = Math.min(
          ...sp.components.map((comp) => {
            const rem = comp.remaining !== undefined ? comp.remaining : comp.count || 0;
            return Math.floor(rem / (comp.qty || 1));
          })
        );
        return Math.max(0, isFinite(minUnits) ? minUnits : 0);
      }
      const rem = sp.remaining !== undefined ? sp.remaining : sp.count || 0;
      return Math.max(0, rem);
    });

    let assignableRemainingSets = 0;
    if (!isFabricFullyAssigned && remainingTotal > 0) {
      if (subPartAvails.length > 1) {
        assignableRemainingSets = Math.min(...subPartAvails);
      } else if (subPartAvails.length === 1) {
        assignableRemainingSets = subPartAvails[0];
      }
      if (fabricBalance?.availableSets !== undefined && fabricBalance.availableSets < assignableRemainingSets) {
        assignableRemainingSets = Math.max(0, fabricBalance.availableSets);
      }
      if (balance?.availableSubParts?.fullSets !== undefined && balance.availableSubParts.fullSets < assignableRemainingSets) {
        assignableRemainingSets = Math.max(0, balance.availableSubParts.fullSets);
      }
    }

    const isAllAssigned = isFabricFullyAssigned || assignableRemainingSets === 0 || remainingTotal === 0;
    const isPartiallyAssigned = !isAllAssigned && hasAssignments && assignableRemainingSets > 0;
    const totalCutPieces = getCuttingTotalPieces(c, fabric) || c.totalPieces || 0;

    let cutPieceBreakdown = null;
    if (subPartsList && subPartsList.length > 0) {
      const parts = subPartsList
        .map((sp) => {
          const count = sp.count || 0;
          if (count <= 0) return null;
          return `${sp.name.toUpperCase()}: ${count} PCs`;
        })
        .filter(Boolean);
      if (parts.length > 0) cutPieceBreakdown = parts.join(', ');
    } else if (c.combinationFormula) {
      cutPieceBreakdown = c.combinationFormula;
    } else if (c.totalSets > 0) {
      cutPieceBreakdown = `${c.totalSets} Sets`;
    }

    return (
      <div
        key={c.id}
        className="p-2 sm:p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap text-xs shadow-2xs hover:border-purple-300 transition-all"
      >
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              c.isDelivered || isAllAssigned
                ? 'bg-emerald-500'
                : isPartiallyAssigned
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-purple-500'
            }`}
          />
          <span className="font-extrabold text-slate-900">
            +{totalCutPieces} Cut PCs
          </span>
          {cutPieceBreakdown && (
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-200">
              ({cutPieceBreakdown})
            </span>
          )}
          {groupingMode === 'all' && c.fabricName && (
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {sanitizeFabricName(c.fabricName)}
            </span>
          )}
          <span className="text-[11px] text-slate-500 truncate">
            by <strong className="text-slate-700">{c.masterName || 'Master'}</strong>
          </span>
          <span className="text-[10px] text-slate-400">
            • {c.cutDate || (c.createdAt ? c.createdAt.split('T')[0] : 'Recent')}
          </span>
          {c.notes && (
            <span className="text-[10px] text-slate-400 italic truncate max-w-xs" title={c.notes}>
              "{c.notes}"
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {c.isDelivered ? (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 select-none">
              <Truck className="w-2.5 h-2.5 text-emerald-600" />
              <span>Delivered</span>
            </span>
          ) : isAllAssigned ? (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 select-none">
              <Check className="w-2.5 h-2.5 text-emerald-600" />
              <span>Assigned</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSelectedCuttingForAssign(c.id);
                setShowAssignTailorModal(true);
              }}
              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1"
              title={
                assignableRemainingSets > 0
                  ? `Assign remaining ${assignableRemainingSets} sets to tailor`
                  : 'Assign cut pieces to tailor'
              }
            >
              <UserCheck className="w-2.5 h-2.5" />
              <span>
                Assign ({assignableRemainingSets > 0 ? `${assignableRemainingSets} Sets` : `${remainingTotal} PCs`})
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingCutting(c);
              setShowRecordCutModal(true);
            }}
            className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
            title="Edit Cutting Record"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setDeleteCuttingConfirm(c)}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Delete Cutting Record"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-1.5">
      {filteredCuttings.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
            groupingMode === 'archive' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'
          }`}>
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {groupingMode === 'archive' ? 'No Archived Cuts' : 'No Cutting Records Found'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {groupingMode === 'archive'
                ? 'When a fabric lot is moved to archive, its linked cutting batches will appear here.'
                : searchQuery
                  ? 'No fabric cut matches your search query.'
                  : 'Record piece cuts made by Master from received fabric lots.'}
            </p>
          </div>
          {groupingMode !== 'archive' && (
            <button
              onClick={() => {
                setEditingCutting(null);
                setShowRecordCutModal(true);
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 active:scale-95 shadow-md shadow-purple-200 transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Record First Cut</span>
            </button>
          )}
        </div>
      ) : (groupingMode === 'lot' || groupingMode === 'archive') ? (
        <div className="space-y-2">
          {pagedGroupedCuttings.map((group) => {
            const isLotCollapsed = collapsedLots.has(group.lotKey);
            const totalLotCutPieces = group.items.reduce(
              (sum, c) => sum + getCuttingTotalPieces(c, group.fabric),
              0
            );
            const totalLotRemaining = group.items.reduce((sum, c) => {
              const balance = getCuttingBalance(c.id);
              return sum + (balance ? balance.remaining.total : c.totalPieces);
            }, 0);

            const summaryBadge = (
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                <span className="text-[10px] sm:text-xs font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                  {totalLotCutPieces} Cut PCs
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full hidden sm:inline">
                  {group.items.length} {group.items.length === 1 ? 'Cut' : 'Cuts'}
                </span>
                {totalLotRemaining > 0 ? (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full hidden xs:inline">
                    {totalLotRemaining} unassigned
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full hidden xs:inline">
                    ✓ Assigned
                  </span>
                )}
              </div>
            );

            return (
              <div key={group.lotKey} className="space-y-2">
                <LotGroupHeader
                  group={group}
                  activeTab="cuttings"
                  isCollapsed={isLotCollapsed}
                  onToggle={() => toggleLotCollapse(group.lotKey)}
                  summaryBadge={summaryBadge}
                />
                {!isLotCollapsed && (
                  <div className="space-y-1.5 pl-2 sm:pl-3 border-l-2 border-purple-200/80 ml-2">
                    {group.items.map(renderCuttingCard)}
                  </div>
                )}
              </div>
            );
          })}
          <PaginationControls
            currentPage={safeGroupPage}
            totalPages={totalGroupPages}
            totalItems={groupedCuttings.length}
            pageSize={groupPageSize}
            onPageChange={setGroupPage}
            onPageSizeChange={setGroupPageSize}
            pageSizeOptions={[10, 15, 25, 50]}
            theme="purple"
          />
        </div>
      ) : (
        <div className="space-y-2">
          {isArchiveMode && dbCompletedData.loading ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200/80 text-center space-y-2">
              <div className="w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 font-medium">Loading archived cuttings from database...</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {pagedCuttings.map(renderCuttingCard)}
            </div>
          )}
          <PaginationControls
            currentPage={safeFlatPage}
            totalPages={totalFlatPages}
            totalItems={totalFlatItems}
            pageSize={flatPageSize}
            onPageChange={setFlatPage}
            onPageSizeChange={setFlatPageSize}
            pageSizeOptions={[15, 25, 50, 100]}
            theme="purple"
          />
        </div>
      )}
    </div>
  );
}
