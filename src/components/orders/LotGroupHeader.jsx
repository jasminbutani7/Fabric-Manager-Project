import React from 'react';
import { Layers, ChevronDown, Archive } from 'lucide-react';

/**
 * Reusable Lot Group Header component for all 5 production subtabs
 */
export default function LotGroupHeader({
  group,
  activeTab,
  isCollapsed,
  onToggle,
  summaryBadge = null,
}) {
  const lotNo = group.lotNo;
  const fabricType = group.fabricType;
  const color = group.color;
  const supplierName = group.supplierName;
  const targetSets = group.targetSets;
  const isArchived = Boolean(
    group.isArchived ||
    group.fabric?.isArchived ||
    group.fabric?.is_archived ||
    (group.items && group.items.length > 0 && group.items.every((it) => it.isArchived || it.is_archived))
  );

  const getTheme = () => {
    switch (activeTab) {
      case 'cuttings':
        return {
          border: 'border-l-purple-600',
          badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
          iconBg: 'bg-purple-100 text-purple-700',
        };
      case 'assignments':
        return {
          border: 'border-l-emerald-600',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          iconBg: 'bg-emerald-100 text-emerald-700',
        };
      case 'handovers':
        return {
          border: 'border-l-indigo-600',
          badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          iconBg: 'bg-indigo-100 text-indigo-700',
        };
      case 'thread_cutting':
        return {
          border: 'border-l-teal-600',
          badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
          iconBg: 'bg-teal-100 text-teal-700',
        };
      case 'delivery':
        return {
          border: 'border-l-emerald-600',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          iconBg: 'bg-emerald-100 text-emerald-700',
        };
      default:
        return {
          border: 'border-l-slate-600',
          badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
          iconBg: 'bg-slate-100 text-slate-700',
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      onClick={onToggle}
      className={`bg-white hover:bg-slate-50/90 border border-slate-200/90 border-l-4 ${theme.border} rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 cursor-pointer transition-all shadow-2xs hover:shadow-xs`}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0`}>
          <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {lotNo ? (
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md border shrink-0 ${theme.badgeBg}`}>
                LOT #{lotNo}
              </span>
            ) : (
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md border bg-slate-100 text-slate-700 border-slate-200 shrink-0">
                LOT
              </span>
            )}
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
              {fabricType}
            </h4>
            {color && (
              <span className="text-xs font-semibold text-slate-500 truncate">
                ({color})
              </span>
            )}
            {targetSets > 0 && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0 hidden xs:inline">
                {targetSets} Sets
              </span>
            )}
            {isArchived && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md border bg-amber-100 text-amber-800 border-amber-200 shrink-0 flex items-center gap-1">
                <Archive className="w-2.5 h-2.5" />
                Archived
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
            {supplierName && (
              <span className="truncate flex items-center gap-1">
                <span>🏢</span>
                <span className="font-medium text-slate-600">{supplierName}</span>
              </span>
            )}
            {group.productName && group.productName !== fabricType && (
              <span className="truncate text-slate-400">
                • Design: <strong className="text-slate-600 font-semibold">{group.productName}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {summaryBadge}
        <button
          type="button"
          onClick={onToggle}
          className={`p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-transform duration-200 cursor-pointer ${
            isCollapsed ? '' : 'rotate-180'
          }`}
          title={isCollapsed ? 'Expand Lot Cards' : 'Collapse Lot Cards'}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
