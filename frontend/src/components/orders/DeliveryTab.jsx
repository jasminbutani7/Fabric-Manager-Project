import React, { useState } from 'react';
import { Truck, Check, Printer, Receipt, X, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { resolvePieceLabel } from '../../utils/productUtils';
import LotGroupHeader from './LotGroupHeader';
import PaginationControls from '../common/PaginationControls';
import ThermalReceipt from '../common/ThermalReceipt';
import { downloadThermalPdf, triggerCleanPrint } from '../../utils/pdfExport';

export default function DeliveryTab({
  _deliveryLotsStats,
  filteredDeliveryLogs,
  groupedDeliveryLogs,
  groupingMode,
  collapsedLots,
  toggleLotCollapse,
  searchQuery,
  deliveryStatusFilter,
  navigate,
}) {
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedLogForReceipt, setSelectedLogForReceipt] = useState(null);
  const [isExportingGatePass, setIsExportingGatePass] = useState(false);

  const totalPages = Math.max(1, Math.ceil(filteredDeliveryLogs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedLogs = filteredDeliveryLogs.slice((safePage - 1) * pageSize, safePage * pageSize);
  const renderDeliveryCard = (log, idx) => {
    const cardId = log.id || log.invoiceNumber || `delivery-log-${idx}`;
    const hasItems = Array.isArray(log.items) && log.items.length > 0;
    const hasSubParts = log.subParts && Object.keys(log.subParts).length > 0;

    const rawPieces = parseInt(log.totalPieces ?? log.quantity ?? log.pieces, 10) || 0;
    const itemsSum = hasItems
      ? log.items.reduce((s, it) => s + (parseInt(it.quantity, 10) || 0), 0)
      : hasSubParts
        ? Object.values(log.subParts).reduce((s, v) => s + (parseInt(v, 10) || 0), 0)
        : 0;
    const totalPieces = rawPieces || itemsSum || 0;

    let breakdown = null;
    if (hasItems) {
      const parts = log.items
        .map((it) => {
          const name = it.pieceName || it.subPart || it.description;
          const count = parseInt(it.quantity, 10) || 0;
          return name ? `${name.toUpperCase()}: ${count} PCs` : `${count} PCs`;
        })
        .filter(Boolean);
      if (parts.length > 0) breakdown = parts.join(', ');
    } else if (hasSubParts) {
      const parts = Object.entries(log.subParts)
        .map(([subPart, qty]) => {
          const count = parseInt(qty, 10) || 0;
          if (count <= 0) return null;
          const pLabel = resolvePieceLabel ? resolvePieceLabel(subPart, log.struct) : subPart;
          return `${pLabel.toUpperCase()}: ${count} PCs`;
        })
        .filter(Boolean);
      if (parts.length > 0) breakdown = parts.join(', ');
    } else if (log.productName || log.design || log.fabricName) {
      breakdown = log.productName || log.design || log.fabricName;
    }

    return (
      <div
        key={cardId}
        className="p-2 sm:p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap text-xs shadow-2xs hover:border-emerald-300 transition-all"
      >
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
          <span className="font-extrabold text-slate-900">
            +{totalPieces} PCs
          </span>
          {breakdown && (
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-200">
              ({breakdown})
            </span>
          )}
          {groupingMode === 'all' && log.fabricName && (
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {log.fabricName}
            </span>
          )}
          {log.supplierName && log.supplierName !== 'Unknown Supplier' && (
            <span className="text-[11px] text-slate-500 truncate">
              to <strong className="text-slate-700">{log.supplierName}</strong>
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            • {log.deliveryDate || 'Recent'}
          </span>
          {log.invoiceNumber && (
            <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
              Inv #{log.invoiceNumber}
            </span>
          )}
          {log.vehicleNo && (
            <span className="text-[10px] text-slate-400 truncate">
              🚚 {log.vehicleNo}
            </span>
          )}
          {log.notes && (
            <span className="text-[10px] text-slate-400 italic truncate max-w-xs" title={log.notes}>
              "{log.notes}"
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 select-none">
            <Check className="w-2.5 h-2.5 text-emerald-600" />
            <span>Delivered</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLogForReceipt(log);
            }}
            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-all cursor-pointer"
            title="Print 80mm Thermal Delivery Gate Pass Slip"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">


      {/* Delivery Logs List */}
      {filteredDeliveryLogs.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${groupingMode === 'archive' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {groupingMode === 'archive' ? 'No Archived Deliveries' : 'No Delivery Logs Found'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {groupingMode === 'archive'
                ? 'When a fabric lot is moved to archive, its linked delivery and dispatch records will appear here.'
                : searchQuery || deliveryStatusFilter !== 'all'
                  ? 'No delivery records match your search or filter.'
                  : 'When finished garments or pieces are dispatched to suppliers, their full delivery challans and logs appear here.'}
            </p>
          </div>
          {groupingMode !== 'archive' && (
            <button
              type="button"
              onClick={() => navigate('/fabrics')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-200 transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Deliver Goods from Fabrics</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {(groupingMode === 'lot' || groupingMode === 'archive') ? (
            groupedDeliveryLogs.map((group) => {
              const isLotCollapsed = collapsedLots.has(group.lotKey);
              const totalLotDeliveredPieces = group.items.reduce(
                (sum, dl) => sum + (parseInt(dl.totalPieces, 10) || 0),
                0
              );

              const summaryBadge = (
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                  <span className="text-[10px] sm:text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {totalLotDeliveredPieces} PCs Delivered
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full hidden sm:inline">
                    {group.items.length} {group.items.length === 1 ? 'Dispatch' : 'Dispatches'}
                  </span>
                </div>
              );

              return (
                <div key={group.lotKey} className="space-y-2">
                  <LotGroupHeader
                    group={group}
                    activeTab="delivery"
                    isCollapsed={isLotCollapsed}
                    onToggle={() => toggleLotCollapse(group.lotKey)}
                    summaryBadge={summaryBadge}
                  />
                  {!isLotCollapsed && (
                    <div className="space-y-1.5 pl-2 sm:pl-3 border-l-2 border-emerald-200/80 ml-2">
                      {group.items.map(renderDeliveryCard)}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="space-y-2">
              <div className="space-y-1.5">
                {pagedLogs.map(renderDeliveryCard)}
              </div>
              <PaginationControls
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={filteredDeliveryLogs.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                theme="emerald"
              />
            </div>
          )}
        </div>
      )}

      {/* 80mm Thermal Delivery Gate Pass Modal */}
      {selectedLogForReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Delivery Gate Pass (80mm Slip)</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForReceipt(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-100/70 overflow-x-auto max-h-[70vh] flex justify-center">
              <ThermalReceipt
                deliveryLog={selectedLogForReceipt}
                currentUser={currentUser}
              />
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => setSelectedLogForReceipt(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!selectedLogForReceipt || isExportingGatePass) return;
                  setIsExportingGatePass(true);
                  try {
                    const logId = selectedLogForReceipt.invoiceNumber || selectedLogForReceipt.id || 'slip';
                    await downloadThermalPdf('printable-thermal-receipt', `GatePass_${logId}.pdf`);
                  } catch (err) {
                    console.error('Error generating gate pass PDF:', err);
                  } finally {
                    setIsExportingGatePass(false);
                  }
                }}
                disabled={isExportingGatePass}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Download 80mm Gate Pass Slip as PDF"
              >
                {isExportingGatePass ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => triggerCleanPrint('printable-thermal-receipt', 'thermal')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Gate Pass Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

