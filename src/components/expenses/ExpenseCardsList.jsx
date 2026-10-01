import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  CreditCard,
  Trash2,
  ChevronDown,
  ChevronUp,
  Cog,
  Hash,
} from 'lucide-react';
import { getCategoryBadge } from './expenseBadgeUtils';
import CustomSelect from '../common/CustomSelect';
import PaginationControls from '../common/PaginationControls';

export default function ExpenseCardsList({
  activeTab,
  filteredExpenses = [],
  searchQuery,
  setSearchQuery,
  monthFilter,
  setMonthFilter,
  categoryFilter,
  setCategoryFilter,
  expandedCardIds,
  toggleCardExpand,
  handleExpandAll,
  handleCollapseAll,
  setDeleteConfirm,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [prevFilterKey, setPrevFilterKey] = useState('');
  const currentFilterKey = `${activeTab}_${searchQuery}_${monthFilter}_${categoryFilter}`;

  if (prevFilterKey !== currentFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedExpenses = filteredExpenses.slice((safePage - 1) * pageSize, safePage * pageSize);

  const currentItemIds = filteredExpenses.map((e) => e.id);
  const isAllExpanded =
    currentItemIds.length > 0 &&
    currentItemIds.every((id) => expandedCardIds.has(id));

  return (
    <div className="space-y-4">
      {activeTab === 'salaries' && (
        <div className="pt-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-purple-600" />
            <span>Recorded Salary Payout Entries ({filteredExpenses.length})</span>
          </h4>
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
            />
          </div>

          {/* Month Filter Selector */}
          <div className="w-28 shrink-0">
            <CustomSelect
              value={monthFilter}
              onChange={(val) => setMonthFilter(val)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'this_month', label: 'This Mo.' },
              ]}
              placeholder="Filter"
              theme="rose"
              searchable={false}
            />
          </div>

          {/* Global Expand All / Collapse All Toggle */}
          {currentItemIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (isAllExpanded) {
                  handleCollapseAll();
                } else {
                  handleExpandAll(currentItemIds);
                }
              }}
              className="px-2.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-[11px] font-bold text-slate-700 hover:text-rose-600 transition-all flex items-center gap-1 shadow-2xs shrink-0 active:scale-95 cursor-pointer"
              title="Toggle expand / collapse for all expenses"
            >
              <span>{isAllExpanded ? 'Collapse' : 'Expand'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isAllExpanded ? 'rotate-180 text-rose-600' : 'text-slate-400'
                }`}
              />
            </button>
          )}
        </div>

        {/* Category Pills (Contextual to activeTab) */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          {(activeTab === 'all'
            ? [
                { id: 'all', label: 'All' },
                { id: 'Rent', label: 'Rent' },
                { id: 'Maintainance', label: 'Maint' },
                { id: 'Light Bill', label: 'Light' },
                { id: 'Salary', label: 'Salaries' },
                { id: 'Salary_Master', label: 'Master' },
                { id: 'Salary_Helper', label: 'Helper' },
                { id: 'Other', label: 'Other' },
              ]
            : activeTab === 'factory'
            ? [
                { id: 'all', label: 'All Factory' },
                { id: 'Rent', label: 'Rent' },
                { id: 'Maintainance', label: 'Maint' },
                { id: 'Light Bill', label: 'Light' },
              ]
            : activeTab === 'salaries'
            ? [
                { id: 'all', label: 'All Salaries' },
                { id: 'Salary_Master', label: 'Master' },
                { id: 'Salary_Helper', label: 'Helper' },
              ]
            : [
                { id: 'all', label: 'All Other' },
                { id: 'Other', label: 'Other' },
              ]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto shadow-2xs">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">No Expenses Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {searchQuery || categoryFilter !== 'all' || monthFilter !== 'all'
                ? 'No expense matches your search query or selected filter.'
                : 'Start tracking factory operational costs: Rent, Maintenance, Light Bill, and Wages.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pagedExpenses.map((exp) => {
            const isExpanded = expandedCardIds.has(exp.id);
            const badge = getCategoryBadge(exp.expenseType, exp.salarySubType);
            const Icon = badge.icon;
            const amt = parseFloat(exp.amount) || 0;

            return (
              <div
                key={exp.id}
                onClick={() => toggleCardExpand(exp.id)}
                className={`bg-white rounded-2xl border transition-all text-left cursor-pointer ${
                  isExpanded
                    ? 'p-3.5 sm:p-4 border-rose-300 shadow-md ring-2 ring-rose-500/10'
                    : 'p-2.5 sm:p-3 border-slate-200/90 shadow-2xs hover:border-rose-300 hover:shadow-xs'
                }`}
              >
                {!isExpanded ? (
                  /* --- ULTRA-COMPACT COLLAPSED CARD (~50px) --- */
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <div className={`w-7 h-7 rounded-xl ${badge.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      <span
                        className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 ${badge.badgeClass}`}
                      >
                        {badge.label}
                      </span>

                      <h3 className="text-xs font-extrabold text-slate-900 truncate">
                        {exp.expenseType === 'Salary'
                          ? (exp.workerName || exp.paidTo)
                          : (exp.paidTo || exp.expenseType)}
                      </h3>

                      {exp.expenseType === 'Maintainance' && exp.machineCode && (
                        <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 shrink-0">
                          M-{exp.machineCode}
                        </span>
                      )}
                    </div>

                    {/* Right: Amount, Date, Delete & Chevron */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight block">
                          ₹{amt.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block">
                          {exp.date}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(exp)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleCardExpand(exp.id)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-2xs"
                        title="Expand full expense details"
                      >
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* --- EXPANDED FULL EXPENSE CARD (Detailed View - Mobile Friendly) --- */
                  <div className="space-y-3 animate-in fade-in duration-150" onClick={(e) => e.stopPropagation()}>
                    {/* Top Row: Category Icon, Badges, Amount & Action Icons */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-xl ${badge.iconBg} flex items-center justify-center shrink-0 shadow-2xs mt-0.5`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${badge.badgeClass}`}
                            >
                              {badge.label}
                            </span>

                            {exp.month && (
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                {exp.month}
                              </span>
                            )}

                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-slate-400" />
                              <span>{exp.paymentMethod}</span>
                            </span>
                          </div>

                          {/* Recipient / Beneficiary / Worker Header */}
                          <h3 className="text-sm font-extrabold text-slate-900 mt-1 truncate">
                            {exp.expenseType === 'Salary'
                              ? `${exp.salarySubType}: ${exp.workerName || exp.paidTo}`
                              : exp.paidTo || exp.expenseType}
                          </h3>

                          {/* Clean date row under beneficiary */}
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{exp.date}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right: Amount on top, Delete & Collapse below (No squishing) */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-base sm:text-lg font-black text-slate-900 leading-tight whitespace-nowrap">
                          ₹{amt.toLocaleString('en-IN')}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(exp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Delete expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleCardExpand(exp.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="Collapse"
                          >
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Machine Link Badge if Maintainance */}
                    {exp.expenseType === 'Maintainance' && exp.machineCode && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold text-amber-800">
                        <Cog className="w-3.5 h-3.5 text-amber-600" />
                        <span>Machine {exp.machineCode}</span>
                      </div>
                    )}

                    {/* Reference & Notes */}
                    {(exp.referenceNo || exp.notes) && (
                      <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                        {exp.referenceNo && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Hash className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-[11px]">
                              Ref/Bill: <strong>{exp.referenceNo}</strong>
                            </span>
                          </div>
                        )}
                        {exp.notes && (
                          <p className="text-[11px] text-slate-600 italic">
                            "{exp.notes}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <PaginationControls
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredExpenses.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            theme="rose"
          />
        </div>
      )}
    </div>
  );
}
