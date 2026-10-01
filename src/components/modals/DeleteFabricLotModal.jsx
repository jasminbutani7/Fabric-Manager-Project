import React from 'react';
import { Trash2, AlertTriangle, X, Layers, Scissors, Shirt, CheckCircle2, Truck } from 'lucide-react';

export default function DeleteFabricLotModal({
  isOpen,
  onClose,
  fabric,
  cuttingsCount = 0,
  assignmentsCount = 0,
  handoversCount = 0,
  threadJobsCount = 0,
  deliveriesCount = 0,
  onConfirm,
}) {
  if (!isOpen || !fabric) return null;

  const lotNo = fabric.lotNo ?? fabric.lot_no ?? '—';
  const lotName = fabric.fabricType || fabric.productName || `Lot #${lotNo}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-lot-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/90 via-red-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md bg-rose-600 text-white shadow-rose-200">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-lot-title" className="font-bold text-slate-800 text-base">
                Delete Lot #{lotNo}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {lotName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shadow-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl flex items-start gap-3 border bg-rose-50/70 border-rose-200/80 text-rose-900">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-rose-600" />
            <div className="text-xs leading-relaxed space-y-1">
              <p className="font-semibold text-rose-950">
                Deleting Lot #{lotNo} is permanent and irreversible:
              </p>
              <p className="text-slate-600">
                All linked cuttings, tailor stitching orders, handovers, thread jobs, and delivery records associated with this fabric lot will be permanently deleted from the database.
              </p>
            </div>
          </div>

          {/* Child entities summary */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Linked Production Records
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100">
                <Scissors className="w-4 h-4 text-indigo-500" />
                <span className="text-slate-600 font-medium">Cuttings:</span>
                <span className="font-bold text-slate-800 ml-auto">{cuttingsCount}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100">
                <Shirt className="w-4 h-4 text-violet-500" />
                <span className="text-slate-600 font-medium">Tailor Tasks:</span>
                <span className="font-bold text-slate-800 ml-auto">{assignmentsCount}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-600 font-medium">Handovers:</span>
                <span className="font-bold text-slate-800 ml-auto">{handoversCount}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <span className="text-slate-600 font-medium">Thread Jobs:</span>
                <span className="font-bold text-slate-800 ml-auto">{threadJobsCount}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100 col-span-2">
                <Truck className="w-4 h-4 text-rose-500" />
                <span className="text-slate-600 font-medium">Delivery Logs:</span>
                <span className="font-bold text-slate-800 ml-auto">{deliveriesCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm?.(fabric.id);
              onClose?.();
            }}
            className="px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-md transition-all flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 shadow-rose-200 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Proceed &amp; Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
