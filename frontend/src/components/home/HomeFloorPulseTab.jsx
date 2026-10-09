import React from 'react';
import {
  PackageCheck,
  Scissors,
  Truck,
  TrendingUp,
  ChevronDown,
  Layers,
} from 'lucide-react';
import FabricLotCard from '../fabric/FabricLotCard';
import PaginationControls from '../common/PaginationControls';

export default function HomeFloorPulseTab({
  pendingMasterHandovers = [],
  pendingMasterBreakdown = '',
  lotsAwaitingTrimming = [],
  totalPendingTrimmingPieces = 0,
  lotsReadyForDelivery = [],
  totalReadyDeliveryPieces = 0,
  setDeliverFabricId,
  setShowDeliverModal,
  runningLots = [],
  paginatedRunningLots = [],
  expandedLotIds,
  toggleLotExpand,
  isAllLotsExpanded,
  handleCollapseAllLots,
  handleExpandAllLots,
  safeRunningLotsPage = 1,
  runningLotsTotalPages = 1,
  runningLotsPageSize = 10,
  setRunningLotsPage,
  setRunningLotsPageSize,
  modalActions,
  setShowAddFabric,
  navigate,
}) {
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Pending Master Handover Alert Banner */}
      {pendingMasterHandovers.length > 0 && (
        <div
          onClick={() => navigate('/orders/handovers')}
          className="p-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/15 border border-amber-300 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer hover:border-amber-400 transition-all shadow-xs text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1 flex-wrap">
                <span>Finished Handovers</span>
                <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full text-[9px] font-black">
                  {pendingMasterHandovers.length} New
                </span>
              </h4>
              <p className="text-[11px] text-slate-600 truncate">
                {pendingMasterBreakdown} ready for verification
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
            Review →
          </span>
        </div>
      )}

      {/* Trimming Decisions Needed Alert Banner */}
      {lotsAwaitingTrimming.length > 0 && (
        <div
          onClick={() => {
            const targetLot = lotsAwaitingTrimming[0];
            navigate(`/orders/thread_cutting?search=${encodeURIComponent(targetLot.fabricType || targetLot.productName || '')}`);
          }}
          className="p-3 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 border border-amber-300 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer hover:border-amber-400 transition-all shadow-xs text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1 flex-wrap">
                <span>Trimming Decisions Needed</span>
                <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full text-[9px] font-black">
                  {totalPendingTrimmingPieces} PCs Awaiting
                </span>
              </h4>
              <p className="text-[11px] text-slate-600 truncate">
                {lotsAwaitingTrimming.map((l) => l.fabricType || l.productName).filter(Boolean).slice(0, 2).join(', ')}
                {lotsAwaitingTrimming.length > 2 ? ` +${lotsAwaitingTrimming.length - 2} more` : ''} • Choose trim vs skip per component
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-300 shrink-0 shadow-2xs">
            Decide Trimming →
          </span>
        </div>
      )}

      {/* Ready for Supplier Delivery Alert Banner */}
      {lotsReadyForDelivery.length > 0 && (
        <div
          onClick={() => {
            const targetLot = lotsReadyForDelivery[0];
            setDeliverFabricId(targetLot.id);
            setShowDeliverModal(true);
          }}
          className="p-3 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-300 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer hover:border-emerald-400 transition-all shadow-xs text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1 flex-wrap">
                <span>Ready for Supplier Delivery</span>
                <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-950 rounded-full text-[9px] font-black">
                  {totalReadyDeliveryPieces} PCs Ready
                </span>
              </h4>
              <p className="text-[11px] text-slate-600 truncate">
                {lotsReadyForDelivery.map((l) => l.fabricType || l.productName).filter(Boolean).slice(0, 2).join(', ')}
                {lotsReadyForDelivery.length > 2 ? ` +${lotsReadyForDelivery.length - 2} more` : ''} • Finished pieces ready for dispatch
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shrink-0 shadow-2xs">
            Deliver Goods →
          </span>
        </div>
      )}

      {/* Running Lot Information Overview (Admin Floor Pulse) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Running Lots
            </h3>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {runningLots.length > 0 ? `${runningLots.length} Active` : 'Idle'}
            </span>
          </div>
          {runningLots.length > 0 && (
            <button
              type="button"
              onClick={isAllLotsExpanded ? handleCollapseAllLots : handleExpandAllLots}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              <span>{isAllLotsExpanded ? 'Collapse All' : 'Expand All'}</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${
                  isAllLotsExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>

        {/* List of Fabric Lot Cards */}
        {runningLots.length > 0 ? (
          <div className="space-y-3">
            {paginatedRunningLots.map((lot) => (
              <FabricLotCard
                key={lot.id}
                fabric={lot}
                isExpanded={expandedLotIds.has(lot.id)}
                onToggleExpand={() => toggleLotExpand(lot.id)}
                modalActions={modalActions}
              />
            ))}
            <PaginationControls
              currentPage={safeRunningLotsPage}
              totalPages={runningLotsTotalPages}
              totalItems={runningLots.length}
              pageSize={runningLotsPageSize}
              onPageChange={setRunningLotsPage}
              onPageSizeChange={(newSize) => {
                setRunningLotsPageSize(newSize);
                setRunningLotsPage(1);
              }}
              pageSizeOptions={[5, 10, 20]}
              theme="indigo"
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs text-center space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">No Active Lots</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">
                No lots currently on cutting or stitching floor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddFabric(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Add Fabric</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
