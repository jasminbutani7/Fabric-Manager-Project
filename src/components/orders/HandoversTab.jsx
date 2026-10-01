import React, { useState } from 'react';
import {
  PackageCheck,
  Check,
  Clock,
  Trash2,
} from 'lucide-react';
import { resolvePieceLabel, getCleanDisplayNote } from '../../utils/productUtils';
import LotGroupHeader from './LotGroupHeader';
import PaginationControls from '../common/PaginationControls';

export default function HandoversTab({
  filteredHandovers,
  groupedHandovers,
  groupingMode,
  collapsedLots,
  toggleLotCollapse,
  searchQuery,
  handoverStatusFilter,
  verifyingHandoverId,
  setVerifyingHandoverId,
  verifyMasterHandover,
  setRejectHandoverReason,
  setRejectHandoverModal,
  setDeleteHandoverConfirm,
}) {
  const [flatPage, setFlatPage] = useState(1);
  const [flatPageSize, setFlatPageSize] = useState(25);
  const totalFlatPages = Math.max(1, Math.ceil(filteredHandovers.length / flatPageSize));
  const safeFlatPage = Math.min(flatPage, totalFlatPages);
  const pagedHandovers = filteredHandovers.slice((safeFlatPage - 1) * flatPageSize, safeFlatPage * flatPageSize);

  const [groupPage, setGroupPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(15);
  const totalGroupPages = Math.max(1, Math.ceil(groupedHandovers.length / groupPageSize));
  const safeGroupPage = Math.min(groupPage, totalGroupPages);
  const pagedGroupedHandovers = groupedHandovers.slice((safeGroupPage - 1) * groupPageSize, safeGroupPage * groupPageSize);

  const renderHandoverCard = (h) => {
    const isPending = h.status === 'Pending Verification' || h.status === 'Pending' || !h.status;
    const isVerified = h.status === 'Verified';
    const isRejected = h.status === 'Rejected';

    // Robust parsing of sub-parts and total piece count
    const rawSubParts = h.subParts && typeof h.subParts === 'object' ? h.subParts : {};
    const cleanSubParts = {};
    Object.entries(rawSubParts).forEach(([k, v]) => {
      const num = parseInt(v, 10);
      if (!isNaN(num) && num > 0) {
        cleanSubParts[k] = num;
      }
    });

    if (Object.keys(cleanSubParts).length === 0 && h.parts && typeof h.parts === 'object') {
      Object.entries(h.parts).forEach(([k, v]) => {
        const num = parseInt(v, 10);
        if (!isNaN(num) && num > 0) {
          cleanSubParts[k] = num;
        }
      });
    }

    const displayPieces = parseInt(h.pieces ?? h.piecesCount ?? h.pieces_count ?? h.receivedQuantity, 10) || 0;
    const subVals = Object.values(cleanSubParts).filter((v) => v > 0);
    const calculatedPieces = subVals.length > 0 ? Math.min(...subVals) : 0;
    const finalPieces = displayPieces || calculatedPieces || 0;

    const struct = h.struct || h.fabric?.productStructure || null;

    let hPieceBreakdown = null;
    if (Object.keys(cleanSubParts).length > 0) {
      const entries = Object.entries(cleanSubParts)
        .map(([k, v]) => {
          const pLabel = resolvePieceLabel ? resolvePieceLabel(k, struct) : k;
          return `${pLabel.toUpperCase()}: ${v} PCs`;
        })
        .filter(Boolean);
      if (entries.length > 0) hPieceBreakdown = entries.join(', ');
    } else if (h.combinationFormula && typeof h.combinationFormula === 'string' && h.combinationFormula.trim()) {
      hPieceBreakdown = h.combinationFormula;
    } else if (h.subPart || h.sub_part || h.partName) {
      const pName = (resolvePieceLabel ? resolvePieceLabel(h.subPart || h.sub_part || h.partName, struct) : (h.subPart || h.sub_part || h.partName)).toUpperCase();
      hPieceBreakdown = finalPieces > 0 ? `${pName}: ${finalPieces} PCs` : pName;
    }

    const cleanNote = getCleanDisplayNote(h.notes);

    return (
      <div
        key={h.id}
        className="p-2 sm:p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap text-xs shadow-2xs hover:border-indigo-300 transition-all"
      >
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isVerified ? 'bg-emerald-500' : isPending ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="font-extrabold text-slate-900">
            +{finalPieces} PCs
          </span>
          {hPieceBreakdown && (
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-200">
              ({hPieceBreakdown})
            </span>
          )}
          {groupingMode === 'all' && h.fabricName && (
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {h.fabricName}
            </span>
          )}
          <span className="text-[11px] text-slate-500 truncate">
            from <strong className="text-slate-700">{h.masterName || 'Master'}</strong>
          </span>
          <span className="text-[10px] text-slate-400">
            • {h.handoverDate || (h.createdAt ? h.createdAt.split('T')[0] : 'Recent')}
          </span>
          {cleanNote && (
            <span className="text-[10px] text-slate-400 italic truncate max-w-xs" title={cleanNote}>
              "{cleanNote}"
            </span>
          )}
          {isRejected && h.rejectionReason && (
            <span className="text-[10px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
              Reason: {h.rejectionReason}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isVerified ? (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 select-none">
              <Check className="w-2.5 h-2.5 text-emerald-600" />
              <span>Verified</span>
            </span>
          ) : isPending ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 select-none">
                <Clock className="w-2.5 h-2.5 text-amber-600" />
                <span>Pending</span>
              </span>
              <button
                type="button"
                disabled={verifyingHandoverId === h.id}
                onClick={() => {
                  setVerifyingHandoverId(h.id);
                  verifyMasterHandover(h.id, 'Factory Admin');
                  setTimeout(() => setVerifyingHandoverId(null), 300);
                }}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1"
                title="Verify and Accept Handover"
              >
                <Check className="w-2.5 h-2.5" />
                <span>{verifyingHandoverId === h.id ? 'Accepting...' : 'Accept'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejectHandoverReason('');
                  setRejectHandoverModal(h);
                }}
                className="px-1.5 py-0.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                title="Reject Handover"
              >
                Reject
              </button>
            </div>
          ) : (
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              {h.status || 'Rejected'}
            </span>
          )}
          <button
            type="button"
            onClick={() => setDeleteHandoverConfirm(h)}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Delete handover record"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {filteredHandovers.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
            groupingMode === 'archive' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
          }`}>
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {groupingMode === 'archive' ? 'No Archived Handovers' : 'No Master Handovers Found'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {groupingMode === 'archive'
                ? 'When a fabric lot is moved to archive, its linked handover records will appear here.'
                : searchQuery || handoverStatusFilter !== 'all'
                  ? 'No handover records match your active search or status filter.'
                  : 'When Masters receive finished pieces from tailors and submit them to Admin, they will appear here for verification.'}
            </p>
          </div>
        </div>
      ) : (groupingMode === 'lot' || groupingMode === 'archive') ? (
        <div className="space-y-2">
          {pagedGroupedHandovers.map((group) => {
            const isLotCollapsed = collapsedLots.has(group.lotKey);
            const verifiedLotPieces = group.items
              .filter((h) => h.status === 'Verified')
              .reduce((sum, h) => {
                const displayPieces = parseInt(h.pieces ?? h.piecesCount ?? h.pieces_count ?? h.receivedQuantity, 10) || 0;
                return sum + displayPieces;
              }, 0);

            const pendingLotPieces = group.items
              .filter((h) => h.status === 'Pending Verification' || h.status === 'Pending' || !h.status)
              .reduce((sum, h) => {
                const displayPieces = parseInt(h.pieces ?? h.piecesCount ?? h.pieces_count ?? h.receivedQuantity, 10) || 0;
                return sum + displayPieces;
              }, 0);

            const rejectedLotPieces = group.items
              .filter((h) => h.status === 'Rejected')
              .reduce((sum, h) => {
                const displayPieces = parseInt(h.pieces ?? h.piecesCount ?? h.pieces_count ?? h.receivedQuantity, 10) || 0;
                return sum + displayPieces;
              }, 0);

            const pendingCount = group.items.filter((h) => h.status === 'Pending Verification' || h.status === 'Pending' || !h.status).length;
            const verifiedCount = group.items.filter((h) => h.status === 'Verified').length;
            const rejectedCount = group.items.filter((h) => h.status === 'Rejected').length;

            const totalLotHandoverPieces = handoverStatusFilter === 'rejected'
              ? rejectedLotPieces
              : handoverStatusFilter === 'pending'
                ? pendingLotPieces
                : (verifiedLotPieces + pendingLotPieces);

            const summaryBadge = (
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                <span className="text-[10px] sm:text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {totalLotHandoverPieces} PCs
                </span>
                {pendingCount > 0 && (
                  <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
                    {pendingCount} Review
                  </span>
                )}
                {verifiedCount > 0 && (
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-full hidden xs:inline">
                    {verifiedCount} Verified
                  </span>
                )}
                {rejectedCount > 0 && (
                  <span className="text-[10px] font-extrabold text-rose-800 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded-full hidden xs:inline">
                    {rejectedCount} Rejected
                  </span>
                )}
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full hidden sm:inline">
                  {group.items.length} {group.items.length === 1 ? 'Batch' : 'Batches'}
                </span>
              </div>
            );

            return (
              <div key={group.lotKey} className="space-y-2">
                <LotGroupHeader
                  group={group}
                  activeTab="handovers"
                  isCollapsed={isLotCollapsed}
                  onToggle={() => toggleLotCollapse(group.lotKey)}
                  summaryBadge={summaryBadge}
                />
                {!isLotCollapsed && (
                  <div className="space-y-1.5 pl-2 sm:pl-3 border-l-2 border-indigo-200/80 ml-2">
                    {group.items.map(renderHandoverCard)}
                  </div>
                )}
              </div>
            );
          })}
          <PaginationControls
            currentPage={safeGroupPage}
            totalPages={totalGroupPages}
            totalItems={groupedHandovers.length}
            pageSize={groupPageSize}
            onPageChange={setGroupPage}
            onPageSizeChange={setGroupPageSize}
            pageSizeOptions={[10, 15, 25, 50]}
            theme="indigo"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1.5">
            {pagedHandovers.map(renderHandoverCard)}
          </div>
          <PaginationControls
            currentPage={safeFlatPage}
            totalPages={totalFlatPages}
            totalItems={filteredHandovers.length}
            pageSize={flatPageSize}
            onPageChange={setFlatPage}
            onPageSizeChange={setFlatPageSize}
            pageSizeOptions={[15, 25, 50, 100]}
            theme="indigo"
          />
        </div>
      )}
    </div>
  );
}
