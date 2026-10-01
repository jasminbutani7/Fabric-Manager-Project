import React, { useState } from 'react';
import {
  Check,
  Truck,
  Plus,
  Eye,
  ArrowRight,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { resolvePieceLabel } from '../../../utils/productUtils';

export default function Step5DeliveryInvoice({
  fabric: f,
  struct,
  isStep5Open,
  toggleStep5,
  isDelivered = false,
  totalDeliveredPSC = 0,
  readyPiecesCount = 0,
  totalGoodsCount = 0,
  linkedInvoice = null,
  linkedInvoices = [],
  deliveredPiecesList = [],
  deliveredSubPartsMap = {},
  readyPiecesList = [],
  lotDeliveryLogs = [],
  onOpenDeliverModal,
  onOpenInvoiceModal,
  onOpenInvoiceDetailsModal,
  navigate,
}) {
  const [showInvoiceLogs, setShowInvoiceLogs] = useState(false);

  const allInvoices = (Array.isArray(linkedInvoices) && linkedInvoices.length > 0)
    ? linkedInvoices
    : linkedInvoice
      ? [linkedInvoice]
      : [];

  const subPartsCount = Math.max(1, struct?.subParts?.length || 1);
  const deliveredSets = Math.floor((parseInt(totalDeliveredPSC, 10) || 0) / subPartsCount);
  const expectedSets = parseInt(f.productQuantity || f.printPieces || f.expectedSets, 10) || deliveredSets;
  const totalLotSets = Math.max(deliveredSets, expectedSets);

  const getInvoicePiecesAndBreakdown = (inv) => {
    if (!inv) return { totalPieces: 0, breakdown: null };

    const pieceMap = {};
    let totalPieces = 0;

    if (Array.isArray(inv.items) && inv.items.length > 0) {
      inv.items.forEach((it) => {
        const q = parseInt(it.quantity, 10) || 0;
        if (q <= 0) return;

        const isSet = it.unit === 'Sets' || (typeof it.description === 'string' && it.description.toLowerCase().includes('set') && !it.isSubPart);
        if (isSet) {
          totalPieces += q * subPartsCount;
          if (Array.isArray(struct?.subParts) && struct.subParts.length > 0) {
            struct.subParts.forEach((sp) => {
              const pName = sp.name || resolvePieceLabel(sp.id, struct) || 'Piece';
              pieceMap[pName] = (pieceMap[pName] || 0) + q;
            });
          }
        } else {
          totalPieces += q;
          const rawName = it.subPartName || it.subPartId || it.subPart || (it.description ? it.description.split('-').pop().trim() : 'Piece');
          const pName = resolvePieceLabel(rawName, struct) || rawName;
          pieceMap[pName] = (pieceMap[pName] || 0) + q;
        }
      });
    }

    if (totalPieces === 0) {
      const subs = inv.subParts || inv.subPartQuantities || inv.sub_parts;
      if (subs && typeof subs === 'object') {
        Object.entries(subs).forEach(([k, v]) => {
          const q = parseInt(v, 10) || 0;
          if (q > 0) {
            totalPieces += q;
            const pName = resolvePieceLabel(k, struct);
            pieceMap[pName] = (pieceMap[pName] || 0) + q;
          }
        });
      }
    }

    if (totalPieces === 0) {
      const setQ = parseInt(inv.setQuantity, 10) || 0;
      if (setQ > 0) {
        totalPieces = setQ * subPartsCount;
        if (Array.isArray(struct?.subParts) && struct.subParts.length > 0) {
          struct.subParts.forEach((sp) => {
            const pName = sp.name || resolvePieceLabel(sp.id, struct) || 'Piece';
            pieceMap[pName] = (pieceMap[pName] || 0) + setQ;
          });
        }
      } else {
        totalPieces = parseInt(inv.deliveredPSC || inv.totalPieces, 10) || 0;
      }
    }

    const entries = Object.entries(pieceMap)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => `${name}: ${count} PCs`);

    const breakdown = entries.length > 0 ? entries.join(', ') : null;

    return { totalPieces, breakdown };
  };

  const totalInvoicedPieces = allInvoices.reduce((sum, inv) => {
    const { totalPieces } = getInvoicePiecesAndBreakdown(inv);
    return sum + totalPieces;
  }, 0);

  const totalDelivered = parseInt(totalDeliveredPSC, 10) || 0;
  const deliveredUninvoicedPieces = Math.max(0, totalDelivered - totalInvoicedPieces);
  const totalLotTargetPieces = totalGoodsCount > 0 ? totalGoodsCount : (totalLotSets * subPartsCount);
  const remainingPiecesToInvoice = totalDelivered > 0
    ? deliveredUninvoicedPieces
    : Math.max(0, totalLotTargetPieces - totalInvoicedPieces);

  const getDeliveryBreakdown = (dl) => {
    const subs = dl.subParts || dl.subPartQuantities || dl.sub_parts;
    if (subs && typeof subs === 'object') {
      const entries = Object.entries(subs)
        .map(([k, v]) => {
          const count = parseInt(v, 10) || 0;
          if (count <= 0) return null;
          const pName = resolvePieceLabel(k, struct);
          return `${pName}: ${count} PCs`;
        })
        .filter(Boolean);
      if (entries.length > 0) return entries.join(', ');
    }

    if (Array.isArray(dl.items) && dl.items.length > 0) {
      const entries = dl.items
        .map((it) => {
          const count = parseInt(it.quantity ?? it.count ?? it.pieces, 10) || 0;
          if (count <= 0) return null;
          const rawName = it.pieceName || it.subPart || it.name || it.description;
          const pName = rawName ? resolvePieceLabel(rawName, struct) : 'PCs';
          return `${pName}: ${count} PCs`;
        })
        .filter(Boolean);
      if (entries.length > 0) return entries.join(', ');
    }

    if (lotDeliveryLogs.length === 1 && deliveredPiecesList && deliveredPiecesList.length > 0) {
      return deliveredPiecesList.map((item) => `${item.name?.toLowerCase() || item.name}: ${item.count} PCs`).join(', ');
    }

    if (lotDeliveryLogs.length === 1 && deliveredSubPartsMap && Object.keys(deliveredSubPartsMap).length > 0) {
      return Object.entries(deliveredSubPartsMap).map(([k, v]) => `${k.toLowerCase()}: ${v} PCs`).join(', ');
    }

    return null;
  };
  return (
    <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50/80 overflow-hidden shadow-2xs transition-all">
      {/* Header */}
      <div
        onClick={toggleStep5}
        className="p-2.5 sm:p-3 flex items-start sm:items-center justify-between gap-2 cursor-pointer select-none hover:bg-emerald-100/40 transition-colors"
      >
        <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
          <span
            className={`w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5 sm:mt-0 ${isDelivered || totalDeliveredPSC > 0
              ? 'bg-emerald-600'
              : 'bg-slate-400'
              }`}
          >
            {isDelivered || totalDeliveredPSC > 0 ? (
              <Check className="w-3 h-3 stroke-[3]" />
            ) : (
              <span className="text-[10px] font-black">5</span>
            )}
          </span>
          <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 shrink-0">
                Step 5: Deliver to Supplier
              </span>
              <span className="text-[11px] sm:text-xs font-black text-slate-900 truncate">
                • {readyPiecesCount || 0} PCs Ready • {totalDeliveredPSC} Delivered{totalGoodsCount > 0 ? ` / ${totalGoodsCount} Total` : ''}
              </span>
            </div>
            {readyPiecesList.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                {readyPiecesList.map((item) => (
                  <span
                    key={item.name}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white text-emerald-950 border border-emerald-300 shadow-2xs text-[9.5px] font-bold"
                  >
                    <span className="text-emerald-700 font-semibold">{item.name}:</span>
                    <span className="text-emerald-950 font-black">{item.count.toLocaleString('en-IN')} PCs</span>
                  </span>
                ))}
              </div>
            ) : deliveredPiecesList.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                {deliveredPiecesList.map((item) => (
                  <span
                    key={item.name}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-950 border border-emerald-200 shadow-2xs text-[9.5px] font-bold"
                  >
                    <span className="text-emerald-700 font-semibold">{item.name}:</span>
                    <span className="text-emerald-950 font-black">{item.count.toLocaleString('en-IN')} PCs Delivered</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 self-start sm:self-center mt-0.5 sm:mt-0" onClick={(e) => e.stopPropagation()}>
          {isDelivered || (totalGoodsCount > 0 && totalDeliveredPSC >= totalGoodsCount && readyPiecesCount <= 0) ? (
            allInvoices.length === 0 ? (
              <button
                type="button"
                onClick={() => onOpenInvoiceModal?.(f)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                title="All sets stitched and delivered. Click to create supplier invoice"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Add Invoice</span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpenInvoiceDetailsModal?.(allInvoices[0])}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition-all border border-emerald-200 flex items-center gap-1 cursor-pointer"
                  title="View Latest Invoice"
                >
                  <Eye className="w-3 h-3" />
                  <span className="hidden sm:inline">Invoice</span>
                  {allInvoices.length > 1 && (
                    <span className="bg-emerald-200 text-emerald-900 text-[10px] px-1 rounded-full font-black">
                      {allInvoices.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenInvoiceModal?.(f)}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  title={remainingPiecesToInvoice > 0 ? `Create invoice for remaining ${remainingPiecesToInvoice} pieces` : 'Add another invoice'}
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span className="hidden sm:inline">Add</span>
                </button>
              </div>
            )
          ) : readyPiecesCount > 0 ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpenDeliverModal?.(f.id)}
                className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                title={`Deliver ${readyPiecesCount} ready pieces to supplier`}
              >
                <Truck className="w-3 h-3" />
                <span className="hidden sm:inline">Deliver</span>
                <span className="text-[10px] bg-white/20 px-1 rounded-full font-black">
                  {readyPiecesCount}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled
                className="px-2 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-[11px] font-bold cursor-not-allowed flex items-center gap-1 select-none"
                title="No pieces ready for delivery right now"
              >
                <Truck className="w-3 h-3 text-slate-300" />
                <span className="hidden sm:inline">Deliver</span>
                <span className="text-[10px] bg-slate-200 text-slate-500 px-1 rounded-full font-bold">
                  0
                </span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate('/orders?tab=delivery')}
            className="p-1 sm:px-2 sm:py-1 rounded-lg text-emerald-700 hover:text-emerald-950 hover:bg-emerald-50 transition-all flex items-center gap-1 text-[11px] font-bold border border-emerald-200 bg-white shadow-2xs cursor-pointer"
            title="View Delivery Logs in Production"
          >
            <span className="hidden sm:inline">Show More</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleStep5}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-transform cursor-pointer"
            title={isStep5Open ? 'Collapse Step 5' : 'Expand Step 5'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isStep5Open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isStep5Open && (
        <div className="p-3 pt-0 border-t border-emerald-100 animate-in fade-in duration-150 space-y-2.5">
          <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500">
              Delivery Status & Supplier Dispatch
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-0.5">
            {/* Box 1: Total Delivered */}
            <div className="p-2 sm:p-2.5 bg-white rounded-xl border border-emerald-200 shadow-2xs min-w-0">
              <span className="text-[8px] sm:text-[9px] font-bold text-emerald-800 uppercase block truncate">
                Total Delivered
              </span>
              <span className="text-xs sm:text-base font-black text-emerald-700 block truncate">
                {totalDeliveredPSC} PCs
              </span>
              {deliveredPiecesList.length > 0 ? (
                <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-1 pt-1 border-t border-emerald-200/60">
                  {deliveredPiecesList.map((item) => (
                    <span
                      key={item.name}
                      className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-50/50 text-emerald-950 border border-emerald-200 shadow-2xs text-[8px] sm:text-[9px] font-bold truncate max-w-full"
                      title={`${item.name}: ${item.count.toLocaleString('en-IN')} PCs`}
                    >
                      <span className="text-emerald-700 truncate max-w-[40px] sm:max-w-[70px]">{item.name}:</span>
                      <span className="text-emerald-950 font-black shrink-0">{item.count}</span>
                    </span>
                  ))}
                </div>
              ) : Object.keys(deliveredSubPartsMap).length > 0 ? (
                <span className="text-[8px] sm:text-[9px] text-emerald-800 font-extrabold block mt-0.5 truncate">
                  {Object.entries(deliveredSubPartsMap).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' • ')}
                </span>
              ) : null}
            </div>

            {/* Box 2: Ready For Delivery */}
            <div className="p-2 sm:p-2.5 bg-white rounded-xl border border-teal-200 shadow-2xs min-w-0">
              <span className="text-[8px] sm:text-[9px] font-bold text-teal-800 uppercase block truncate">
                Ready For Delivery
              </span>
              <span className="text-xs sm:text-base font-black text-teal-700 block truncate">
                {readyPiecesCount || 0} PCs
              </span>
              {readyPiecesList.length > 0 ? (
                <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-1 pt-1 border-t border-teal-200/60">
                  {readyPiecesList.map((item) => (
                    <span
                      key={item.name}
                      className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-teal-50/50 text-teal-950 border border-teal-200 shadow-2xs text-[8px] sm:text-[9px] font-bold truncate max-w-full"
                      title={`${item.name}: ${item.count.toLocaleString('en-IN')} PCs`}
                    >
                      <span className="text-teal-700 truncate max-w-[40px] sm:max-w-[70px]">{item.name}:</span>
                      <span className="text-teal-950 font-black shrink-0">{item.count}</span>
                    </span>
                  ))}
                </div>
              ) : readyPiecesCount > 0 ? (
                <span className="text-[8px] sm:text-[9px] text-teal-800 font-extrabold block mt-0.5 truncate">
                  {(f.productName || struct?.productName || 'Garment').toUpperCase()}: {readyPiecesCount}
                </span>
              ) : (
                <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium block mt-0.5 truncate" title="0 PCs ready (awaiting thread trimming)">
                  0 PCs ready
                </span>
              )}
            </div>

            {/* Box 3: Recipient Supplier */}
            <div className="p-2 sm:p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs min-w-0">
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase block truncate">
                Recipient Supplier
              </span>
              <span className="text-xs sm:text-base font-black text-slate-900 truncate block" title={f.supplierName || 'Unknown'}>
                {f.supplierName || 'Unknown'}
              </span>
              {f.supplierPhone && (
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium block mt-0.5 truncate">
                  {f.supplierPhone}
                </span>
              )}
            </div>
          </div>

          {/* Recent Invoices Log with Show More / Hide */}
          {(isDelivered || totalDeliveredPSC > 0 || allInvoices.length > 0) && (
            <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    Recent Invoices Log ({allInvoices.length})
                  </span>
                  {remainingPiecesToInvoice > 0 && allInvoices.length > 0 && (
                    <span className="text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-full">
                      {remainingPiecesToInvoice} PCs Uninvoiced
                    </span>
                  )}
                  {remainingPiecesToInvoice === 0 && totalInvoicedPieces > 0 && totalDelivered > 0 && (
                    <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded-full">
                      All Delivered Invoiced
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenInvoiceModal?.(f)}
                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-md text-[10px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                    title={remainingPiecesToInvoice > 0 ? `Create invoice for remaining ${remainingPiecesToInvoice} pieces` : 'Create another invoice'}
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>Add Invoice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInvoiceLogs(!showInvoiceLogs)}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>{showInvoiceLogs ? 'Hide' : 'Show More'}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showInvoiceLogs ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {showInvoiceLogs && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  {allInvoices.length === 0 ? (
                    <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-amber-950">Goods Delivered • Invoice Not Created</div>
                          <div className="text-[11px] text-amber-700">Delivery log recorded. Click "+ Add Invoice" to bill the supplier.</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenInvoiceModal?.(f)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Add Invoice</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                      {allInvoices.map((inv) => {
                        const { totalPieces: invPieces, breakdown: invBreakdown } = getInvoicePiecesAndBreakdown(inv);
                        const invDateStr = inv.date || (inv.createdAt && String(inv.createdAt).includes('T') ? inv.createdAt.split('T')[0] : 'Recent');
                        const isPaid = inv.status === 'Paid';
                        const isPartial = inv.status === 'Partial';

                        return (
                          <div
                            key={inv.id}
                            className="p-2 bg-white rounded-lg border border-slate-200/70 flex items-center justify-between gap-2 flex-wrap text-xs shadow-2xs hover:border-emerald-300 transition-all"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isPaid ? 'bg-emerald-500' : isPartial ? 'bg-blue-500' : 'bg-amber-500'
                                }`}
                              />
                              <span className="font-extrabold text-slate-900">
                                +{invPieces} PCs
                              </span>
                              {invBreakdown && (
                                <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-200">
                                  ({invBreakdown})
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                {inv.invoiceNumber}
                              </span>
                              <span className="text-[11px] text-slate-500 truncate">
                                to {inv.supplierName || inv.clientName || f.supplierName || 'Supplier'}
                              </span>
                              <span className="text-[10px] text-slate-400">• {invDateStr}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-extrabold text-slate-900">
                                ₹{(parseFloat(inv.totalAmount) || 0).toLocaleString('en-IN')}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 select-none ${
                                  isPaid
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isPartial
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {isPaid && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                                <span>{inv.status || 'Pending'}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => onOpenInvoiceDetailsModal?.(inv)}
                                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                title="View Invoice Details"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Invoice</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Delivery logs if available */}
                  {lotDeliveryLogs && lotDeliveryLogs.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Recent Deliveries ({lotDeliveryLogs.length})
                      </span>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                        {lotDeliveryLogs.map((dl) => {
                          const psc = parseInt(dl.totalPieces ?? dl.total_pieces ?? dl.deliveredPSC ?? dl.quantity, 10) || 0;
                          const dateStr = dl.deliveryDate || dl.date || (dl.createdAt && String(dl.createdAt).includes('T') ? dl.createdAt.split('T')[0] : 'Recent');
                          const breakdown = getDeliveryBreakdown(dl);
                          return (
                            <div
                              key={dl.id}
                              className="p-2 bg-white rounded-lg border border-slate-200/70 flex items-center justify-between gap-2 flex-wrap text-xs shadow-2xs hover:border-emerald-300 transition-all"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="font-extrabold text-slate-900">+{psc} PCs</span>
                                {breakdown && (
                                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-200">
                                    ({breakdown})
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-500 truncate">
                                  to {dl.supplierName || f.supplierName || 'Supplier'}
                                </span>
                                <span className="text-[10px] text-slate-400">• {dateStr}</span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 select-none">
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Delivered</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
