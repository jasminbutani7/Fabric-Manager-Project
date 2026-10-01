import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable, responsive pagination controls for high-volume data tables and cards.
 *
 * @param {Object} props
 * @param {number} props.currentPage - Active 1-indexed page number
 * @param {number} props.totalPages - Total calculated pages
 * @param {number} props.totalItems - Total count of records
 * @param {number} props.pageSize - Number of items displayed per page
 * @param {Function} props.onPageChange - Callback when a page is selected
 * @param {Function} [props.onPageSizeChange] - Optional callback to change items per page
 * @param {number[]} [props.pageSizeOptions=[10, 20, 50, 100]] - Available page size options
 * @param {string} [props.theme='indigo'] - Color theme ('indigo' | 'rose' | 'slate' | 'emerald')
 */
export default function PaginationControls({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  theme = 'indigo',
}) {
  if (totalItems <= 0 || totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const themeClasses = {
    indigo: {
      active: 'bg-indigo-600 text-white shadow-xs shadow-indigo-200 border-indigo-600',
      hover: 'hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    },
    rose: {
      active: 'bg-rose-600 text-white shadow-xs shadow-rose-200 border-rose-600',
      hover: 'hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200',
      badge: 'bg-rose-50 text-rose-700 border-rose-100',
    },
    emerald: {
      active: 'bg-emerald-600 text-white shadow-xs shadow-emerald-200 border-emerald-600',
      hover: 'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    slate: {
      active: 'bg-slate-800 text-white shadow-xs border-slate-800',
      hover: 'hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    purple: {
      active: 'bg-purple-600 text-white shadow-xs shadow-purple-200 border-purple-600',
      hover: 'hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200',
      badge: 'bg-purple-50 text-purple-700 border-purple-100',
    },
    teal: {
      active: 'bg-teal-600 text-white shadow-xs shadow-teal-200 border-teal-600',
      hover: 'hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200',
      badge: 'bg-teal-50 text-teal-700 border-teal-100',
    },
  }[theme] || {
    active: 'bg-indigo-600 text-white shadow-xs shadow-indigo-200 border-indigo-600',
    hover: 'hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  };

  // Compute pagination range with ellipses
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 pb-2 px-1 text-xs">
      {/* Items count summary & optional page size dropdown */}
      <div className="flex items-center gap-2 text-slate-500 font-medium">
        <span>
          Showing <strong className="text-slate-800 font-bold">{startItem}</strong> to{' '}
          <strong className="text-slate-800 font-bold">{endItem}</strong> of{' '}
          <strong className="text-slate-800 font-bold">{totalItems}</strong> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-2">
            <span className="text-[11px]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={`p-1.5 rounded-xl border border-slate-200/90 text-slate-600 transition-all ${
            currentPage === 1
              ? 'opacity-40 cursor-not-allowed bg-slate-50'
              : `bg-white ${themeClasses.hover} active:scale-95 cursor-pointer`
          }`}
          title="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-1.5 rounded-xl border border-slate-200/90 text-slate-600 transition-all ${
            currentPage === 1
              ? 'opacity-40 cursor-not-allowed bg-slate-50'
              : `bg-white ${themeClasses.hover} active:scale-95 cursor-pointer`
          }`}
          title="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1.5 text-slate-400 font-bold select-none">
                  …
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-w-7 h-7 px-2 rounded-xl text-xs font-bold transition-all border ${
                  isActive
                    ? themeClasses.active
                    : `bg-white text-slate-700 border-slate-200/90 ${themeClasses.hover} cursor-pointer`
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-1.5 rounded-xl border border-slate-200/90 text-slate-600 transition-all ${
            currentPage === totalPages
              ? 'opacity-40 cursor-not-allowed bg-slate-50'
              : `bg-white ${themeClasses.hover} active:scale-95 cursor-pointer`
          }`}
          title="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`p-1.5 rounded-xl border border-slate-200/90 text-slate-600 transition-all ${
            currentPage === totalPages
              ? 'opacity-40 cursor-not-allowed bg-slate-50'
              : `bg-white ${themeClasses.hover} active:scale-95 cursor-pointer`
          }`}
          title="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
