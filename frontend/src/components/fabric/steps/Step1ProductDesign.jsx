import React from 'react';
import { Check, Edit2, UserCheck, ChevronDown, Scissors } from 'lucide-react';

export default function Step1ProductDesign({
  fabric: f,
  isProductConfigured,
  isStep1Open,
  toggleStep1,
  struct,
  subPartsList = [],
  roundedFullSet = 0,
  onOpenProductStructureModal,
  onOpenAssignMasterModal,
}) {
  if (!isProductConfigured) {
    return (
      <div className="p-2.5 sm:p-3 bg-amber-50/80 border-2 border-dashed border-amber-300 rounded-xl flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-2xs">
            1
          </span>
          <div className="min-w-0">
            <h4 className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5 flex-wrap">
              <span>Step 1: Setup Product Design & Rates</span>
              <span className="text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded">
                Required
              </span>
            </h4>
            <p className="text-[10px] sm:text-[11px] text-amber-800/90 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Configure product parts (e.g. Top, Bottom) and tailor stitching rates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onOpenProductStructureModal?.(f)}
            className="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Setup Design</span>
          </button>
        </div>
      </div>
    );
  }

  const productName = f.productName || struct?.productName || 'Garment';

  return (
    <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50/80 overflow-hidden shadow-2xs transition-all">
      {/* Header: Clickable to toggle */}
      <div
        onClick={toggleStep1}
        className="p-2 sm:p-2.5 cursor-pointer select-none hover:bg-indigo-100/30 transition-colors"
      >
        {/* Mobile: 2 clean compact rows | Desktop: 1 unified row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
          {/* Row 1 on mobile: Step Title on left, Chevron on right */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-indigo-950 truncate">
                Step 1: Product Design
              </span>
              {/* Desktop inline product name & parts */}
              <span className="hidden sm:inline-block text-xs font-extrabold text-slate-800 truncate max-w-[160px] lg:max-w-[220px]">
                • {productName}
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold text-slate-500 shrink-0">
                ({subPartsList.length} PC{subPartsList.length !== 1 ? 's' : ''})
              </span>
            </div>

            {/* Mobile-only Chevron */}
            <div className="flex sm:hidden items-center shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={toggleStep1}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-transform cursor-pointer"
                title={isStep1Open ? 'Collapse Step 1' : 'Expand Step 1'}
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isStep1Open ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Row 2 on mobile: Product Name + Parts on left, Cost + Actions on right */}
          <div
            className="flex items-center justify-between sm:justify-end gap-1.5 min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile-only Product name & parts badge */}
            <div className="flex sm:hidden items-center gap-1.5 min-w-0 flex-1">
              <span className="text-xs font-extrabold text-slate-800 truncate">
                • {productName}
              </span>
              <span className="text-[10px] font-bold text-slate-600 bg-white/80 px-1.5 py-0.2 rounded border border-indigo-100 shrink-0">
                {subPartsList.length} PC{subPartsList.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Cost badge (on mobile on row 2 right side, on desktop unified right) */}
            <span className="font-black text-indigo-700 bg-white px-2 py-0.5 rounded-md sm:rounded-lg border border-indigo-200 text-[11px] sm:text-xs shadow-2xs shrink-0">
              Cost: ₹{roundedFullSet} / Set
            </span>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {(!f.assignedMasterId && !f.assigned_master_id) && (
                <button
                  type="button"
                  onClick={() => onOpenProductStructureModal?.(f)}
                  className="px-2 py-1 text-[11px] sm:text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 hover:text-indigo-900 rounded-lg border border-indigo-200 flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Edit garment parts and rates"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              )}

              {!f.assignedMasterId && (
                <button
                  type="button"
                  onClick={() => onOpenAssignMasterModal?.(f)}
                  className="px-2 py-1 text-[11px] sm:text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Next: Assign Cutting Master"
                >
                  <UserCheck className="w-3 h-3" />
                  <span>Assign Master</span>
                </button>
              )}

              {/* Desktop Chevron */}
              <button
                type="button"
                onClick={toggleStep1}
                className="hidden sm:inline-flex p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-transform cursor-pointer"
                title={isStep1Open ? 'Collapse Step 1' : 'Expand Step 1'}
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isStep1Open ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Content */}
      {isStep1Open && (
        <div className="p-2.5 sm:p-3 pt-0 border-t border-indigo-100/80 animate-in fade-in duration-150 space-y-2">
          <div className="flex flex-wrap gap-1.5 pt-2">
            {subPartsList.map((part, idx) => {
              const recipeText =
                part.recipeLabel ||
                (Array.isArray(part.components) && part.components.length > 0
                  ? part.components
                    .map((c) => `${c.qty || 1} ${c.name || 'part'}`)
                    .join(' + ')
                  : null);

              return (
                <span
                  key={part.id || idx}
                  className="px-2 py-1 bg-white rounded-lg border border-indigo-100 text-[11px] font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs flex-wrap"
                >
                  <span className="text-slate-900 font-extrabold">{part.name}</span>
                  <span className="text-emerald-700 font-black">
                    ₹{parseFloat(part.rate || part.stitchingRate) || 0} / PC
                  </span>
                  {recipeText && (
                    <span className="text-[10px] text-slate-500 font-medium bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                      ({recipeText})
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
