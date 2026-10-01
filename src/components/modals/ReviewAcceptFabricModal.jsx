import React from 'react';
import {
  X,
  Scissors,
  CheckCircle2,
  Ruler,
  Palette,
  Hash,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { useFabric } from '../../context/useManagement';
import { getCleanDisplayNote } from '../../utils/productUtils';

export default function ReviewAcceptFabricModal({
  isOpen,
  onClose,
  fabric,
  onAccept,
}) {
  const { getProductStructure } = useFabric();

  if (!isOpen || !fabric) return null;

  const fabName =
    fabric.fabricName ||
    fabric.name ||
    fabric.productName ||
    fabric.title ||
    'Fabric Lot';

  const fabColor =
    fabric.color ||
    fabric.fabricColor ||
    fabric.colorName ||
    'Standard';

  const plainQty =
    fabric.plainMeters ||
    fabric.quantityMeters ||
    fabric.plain_meters ||
    fabric.meters ||
    0;

  const printQty =
    fabric.printPieces ||
    fabric.quantityPieces ||
    fabric.print_pieces ||
    fabric.pieces ||
    0;

  // Resolve Product Structure & Sub-Parts
  const struct =
    fabric.productStructure ||
    (getProductStructure ? getProductStructure(fabric) : null) || {
      productName: fabric.productName || 'Garment Piece',
      fullSetRate: parseFloat(fabric.tailorRate || fabric.pricePerPiece || 25),
      subParts: [
        {
          id: 'piece',
          name: fabric.productName || 'Garment Piece',
          rate: parseFloat(fabric.tailorRate || fabric.pricePerPiece || 25),
          components: [],
        },
      ],
    };

  const subParts = Array.isArray(struct?.subParts) && struct.subParts.length > 0 ? struct.subParts : [];
  const prodName = struct?.productName || fabric.productName || 'Garment';

  const totalCompsPerSet = subParts.reduce((total, sp) => {
    if (Array.isArray(sp.components) && sp.components.length > 0) {
      return total + sp.components.reduce((cSum, comp) => cSum + (parseInt(comp.qty, 10) || 1), 0);
    }
    return total + 1;
  }, 0);

  const totalCutPiecesForLot = printQty > 0 ? totalCompsPerSet * printQty : 0;

  const handleConfirm = () => {
    if (onAccept) onAccept(fabric.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 text-left">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-black tracking-tight leading-tight">
                  Review Fabric Allocation
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-300/30 shrink-0">
                  Pending Acceptance
                </span>
              </div>
              <p className="text-[11px] text-purple-100 font-medium truncate mt-0.5">
                {fabName} {fabColor && fabColor !== 'Standard' ? `(${fabColor})` : ''} • Lot #{fabric.id ? fabric.id.slice(-6) : 'LOT'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1 text-left">
          {/* Tip Callout */}
          <div className="p-2.5 bg-purple-50/80 border border-purple-100/90 rounded-xl flex items-center gap-2 text-xs text-purple-900">
            <Info className="w-4 h-4 text-purple-600 shrink-0" />
            <div className="leading-snug text-[11px] sm:text-xs">
              <span className="font-bold">Check rolls before accepting.</span> Allocation status will change to <strong className="text-purple-700 font-black">"In Cutting"</strong>.
            </div>
          </div>

          {/* Cohesive Lot Specification Card */}
          <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Lot Name & Type
                </span>
                <p className="text-xs sm:text-sm font-black text-slate-900 truncate mt-0.5">
                  {fabName}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs shrink-0">
                <Palette className="w-3 h-3 text-rose-500" />
                <span>{fabColor}</span>
              </span>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-indigo-600" />
                  Plain Fabric
                </span>
                <span className="text-xs sm:text-sm font-black text-indigo-700 block mt-0.5">
                  {plainQty ? `${plainQty} m` : '—'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Hash className="w-3 h-3 text-purple-600" />
                  Est. Products
                </span>
                <span className="text-xs sm:text-sm font-black text-purple-700 block mt-0.5">
                  {printQty ? `${printQty} Products` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Product Structure & Garment Breakdown */}
          {subParts.length > 0 && (
            <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Scissors className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                    Product Structure
                  </span>
                </div>
                <span className="text-[10px] font-black text-purple-700 bg-purple-100/90 px-2 py-0.5 rounded-lg border border-purple-200/80 shrink-0">
                  {prodName}
                </span>
              </div>

              {/* Sub-Parts Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subParts.map((sp, idx) => {
                  const comps = Array.isArray(sp.components) && sp.components.length > 0 ? sp.components : null;
                  const spPiecesPerSet = comps
                    ? comps.reduce((acc, c) => acc + (parseInt(c.qty, 10) || 1), 0)
                    : 1;

                  return (
                    <div
                      key={sp.id || idx}
                      className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {sp.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60 shrink-0">
                          {spPiecesPerSet} PC / set
                        </span>
                      </div>

                      {/* Cut Pieces Recipe */}
                      {comps ? (
                        <div className="space-y-1 pt-0.5">
                          <div className="flex flex-wrap gap-1">
                            {comps.map((comp, cIdx) => {
                              const cQty = parseInt(comp.qty, 10) || 1;
                              const totalCompPsc = printQty > 0 ? cQty * printQty : 0;
                              return (
                                <span
                                  key={comp.id || cIdx}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/60"
                                >
                                  <span>{comp.name} × {cQty}</span>
                                  {totalCompPsc > 0 && (
                                    <span className="text-[9px] text-purple-700 font-bold">
                                      ({totalCompPsc})
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                          {printQty > 0 && (
                            <p className="text-[10px] text-purple-700 font-semibold pt-0.5">
                              {spPiecesPerSet * printQty} Cut PCs for lot
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5">
                          <span>1 Cut PC (Direct)</span>
                          {printQty > 0 && (
                            <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">
                              {printQty} Cut PCs
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total Cutting Requirement Banner */}
              {printQty > 0 && totalCompsPerSet > 0 && (
                <div className="p-2.5 bg-purple-50/90 rounded-xl border border-purple-200/80 flex items-center justify-between text-[11px] font-bold text-purple-950 flex-wrap gap-1.5">
                  <span className="text-slate-700">Lot Cutting Target ({printQty} Products):</span>
                  <span className="font-black text-purple-700 bg-white px-2 py-0.5 rounded-lg border border-purple-200 shadow-2xs">
                    {totalCutPiecesForLot} Cut PCs ({totalCompsPerSet} per Product)
                  </span>
                </div>
              )}
            </div>
          )}

          {(() => {
            const cleanNote = getCleanDisplayNote(fabric.notes);
            if (!cleanNote) return null;
            return (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 italic">
                "{cleanNote}"
              </div>
            );
          })()}
        </div>

        {/* Sticky Action Footer */}
        <div className="p-2.5 sm:p-3 border-t border-slate-100 bg-white/95 backdrop-blur-xs flex items-center justify-between gap-2 shrink-0 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            className="w-20 sm:w-24 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black shadow-md shadow-purple-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Accept Fabric</span>
          </button>
        </div>
      </div>
    </div>
  );
}
