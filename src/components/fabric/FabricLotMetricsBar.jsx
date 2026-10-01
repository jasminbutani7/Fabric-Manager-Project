import React from 'react';
import {
  Ruler,
  IndianRupee,
  Layers,
  Scissors,
  Shirt,
  PackageCheck,
  CheckCircle2,
  Truck,
} from 'lucide-react';

/**
 * FabricLotMetricsBar
 * Deconstructed 4-card overview metrics strip:
 * 1. Raw Fabric Stock Received
 * 2. Cost & Sales Price Valuation
 * 3. Combined Cutting & Stitching Progress
 * 4. Completed & Delivered Sets Progress
 */
export default function FabricLotMetricsBar({
  fabric: f,
  targetSets = 0,
  cutPercent = 0,
  stitchingPercent = 0,
  completedSets = 0,
  completedPercent = 0,
  deliveredSets = 0,
  deliveredPercent = 0,
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
      {/* Card 1: Raw Stock */}
      <div className="p-2 sm:p-3 bg-slate-50/80 border border-slate-200/70 rounded-xl flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
          <Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            <span className="sm:hidden">Fabric Stock</span>
            <span className="hidden sm:inline">Fabric Stock Received</span>
          </span>
          <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate mt-0.5">
            {f.plainMeters ? `${f.plainMeters} m` : ''}
            {!f.plainMeters && f.printPieces ? `${f.printPieces} Sets` : ''}
            {!f.plainMeters && !f.printPieces ? '0 m' : ''}
          </p>
          {targetSets > 0 && (
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-normal truncate mt-0.5">
              Expected {targetSets.toLocaleString('en-IN')} Sets
            </p>
          )}
        </div>
      </div>

      {/* Card 2: Cost & Valuation */}
      <div className="p-2 sm:p-3 bg-slate-50/80 border border-slate-200/70 rounded-xl flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
          <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            Sales Price
          </span>
          <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate mt-0.5">
            {f.pricePerPiece || f.pricePerSet ? `₹${f.pricePerPiece || f.pricePerSet} / Set` : 'Rate not set'}
          </p>
          {(f.totalAmount > 0 || (f.printPieces > 0 && (f.pricePerPiece || f.pricePerSet) > 0)) && (
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-normal truncate mt-0.5">
              Total ₹{(f.totalAmount || (f.printPieces * (f.pricePerPiece || f.pricePerSet))).toLocaleString('en-IN')}
            </p>
          )}
        </div>
      </div>

      {/* Card 3: Combined Cutting & Stitching Output */}
      <div className="p-2 sm:p-3 bg-slate-50/80 border border-slate-200/70 rounded-xl flex flex-col justify-between">
        <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Layers className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5" />
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
            <span className="sm:hidden">Cut & Stitch</span>
            <span className="hidden sm:inline">Cutting & Stitching</span>
          </span>
        </div>

        <div className="space-y-1.5">
          {/* Cutting Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="flex items-center gap-1 font-bold text-slate-700 text-[10px] sm:text-[11px] shrink-0">
                <Scissors className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-500 shrink-0" />
                <span>Cutting:</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-purple-700 bg-purple-50 px-1 sm:px-1.5 py-0.2 rounded border border-purple-200/50 shrink-0">
                {cutPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, cutPercent))}%` }}
              />
            </div>
          </div>

          {/* Stitching Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="flex items-center gap-1 font-bold text-slate-700 text-[10px] sm:text-[11px] shrink-0">
                <Shirt className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500 shrink-0" />
                <span>Stitching:</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-blue-700 bg-blue-50 px-1 sm:px-1.5 py-0.2 rounded border border-blue-200/50 shrink-0">
                {stitchingPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, stitchingPercent))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 4: Completed & Delivered Sets */}
      <div className="p-2 sm:p-3 bg-slate-50/80 border border-slate-200/70 rounded-xl flex flex-col justify-between">
        <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
          <div
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center shrink-0 ${completedSets > 0
              ? 'bg-teal-50 border border-teal-200 text-teal-600'
              : 'bg-slate-100 border border-slate-200 text-slate-500'
              }`}
          >
            <PackageCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
            <span className="sm:hidden">Done & Delivered</span>
            <span className="hidden sm:inline">Completed & Delivered</span>
          </span>
        </div>

        <div className="space-y-1.5">
          {/* Completed Sets Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="flex items-center gap-1 font-bold text-slate-700 text-[10px] sm:text-[11px] shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-teal-500 shrink-0" />
                <span>Done:</span>
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-extrabold px-1 sm:px-1.5 py-0.2 rounded border shrink-0 ${completedSets > 0
                  ? 'text-teal-700 bg-teal-50 border-teal-200/60'
                  : 'text-slate-500 bg-slate-100 border-slate-200'
                  }`}
              >
                {completedPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-teal-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, completedPercent))}%` }}
              />
            </div>
          </div>

          {/* Delivered Sets Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="flex items-center gap-1 font-bold text-slate-700 text-[10px] sm:text-[11px] shrink-0">
                <Truck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500 shrink-0" />
                <span>Deliv:</span>
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-extrabold px-1 sm:px-1.5 py-0.2 rounded border shrink-0 ${deliveredSets > 0
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
                  : 'text-slate-500 bg-slate-100 border-slate-200'
                  }`}
              >
                {deliveredPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, deliveredPercent))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
