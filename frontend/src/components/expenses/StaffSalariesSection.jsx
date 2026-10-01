import React from 'react';
import { Users, Scissors, ChevronDown, CreditCard } from 'lucide-react';
import CustomSelect from '../common/CustomSelect';

export default function StaffSalariesSection({
  staffSalaries = { masters: [], helpers: [] },
  selectedMonth,
  setSelectedMonth,
  availableMonths = [],
  currentYearMonth,
  expandedCardIds,
  toggleCardExpand,
  handleExpandAll,
  handleCollapseAll,
  handleOpenAdd,
}) {
  const allStaffIds = [
    ...staffSalaries.masters.map((m) => `master-${m.workerId}`),
    ...staffSalaries.helpers.map((h) => `helper-${h.workerId}`),
  ];
  const allExpanded =
    allStaffIds.length > 0 &&
    allStaffIds.every((id) => expandedCardIds.has(id));

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-purple-950">
                Master &amp; Helper Monthly Salary Obligations
              </h3>
              <p className="text-[11px] text-purple-700 mt-0.5 leading-snug">
                Live balance tracking: Standard monthly salaries vs salary payments recorded below.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 self-end sm:self-center">
            {/* Month selector */}
            <div className="min-w-[150px] sm:w-44">
              <CustomSelect
                value={selectedMonth}
                onChange={(val) => setSelectedMonth(val)}
                options={[
                  { value: 'all', label: 'All Time' },
                  ...availableMonths.map((ym) => ({
                    value: ym,
                    badge: ym === currentYearMonth ? 'CURRENT' : null,
                    label: ym === currentYearMonth ? `This Month (${ym})` : ym,
                  })),
                ]}
                placeholder="Filter Month"
                theme="purple"
              />
            </div>

            {allStaffIds.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  allExpanded ? handleCollapseAll() : handleExpandAll(allStaffIds)
                }
                className="px-2.5 py-1.5 bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
                title={allExpanded ? 'Collapse All Cards' : 'Expand All Cards'}
              >
                <span>{allExpanded ? '▲ Collapse All' : '▼ Expand All'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                handleOpenAdd('Salary');
              }}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              + Record Salary
            </button>
          </div>
        </div>
      </div>

      {/* Masters Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Scissors className="w-3.5 h-3.5 text-indigo-500" />
          <span>Cutting Department Masters ({staffSalaries.masters.length})</span>
        </h4>

        {staffSalaries.masters.length === 0 ? (
          <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            No active Masters found. Add Masters in the Setup screen.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {staffSalaries.masters.map((master) => {
              const cardId = `master-${master.workerId}`;
              const isExpanded = expandedCardIds.has(cardId);
              return (
                <div
                  key={master.workerId}
                  onClick={() => toggleCardExpand(cardId)}
                  className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs hover:border-purple-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {master.name?.charAt(0)?.toUpperCase() || 'M'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-slate-900 truncate">
                            {master.name}
                          </h5>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              master.status === 'Fully Paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : master.status === 'Partial'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {master.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          📞 {master.phone || 'No phone'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block leading-tight">
                          Pending Due
                        </span>
                        <span className="text-xs font-bold text-rose-600">
                          ₹{master.pending.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAdd('Salary');
                        }}
                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                        title="Record Salary Payment"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span className="hidden xs:inline">Pay</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCardExpand(cardId);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                        title={isExpanded ? 'Collapse' : 'Expand Details'}
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-purple-600' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Breakdown */}
                  {isExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/70 rounded-xl p-2.5 text-xs space-y-1.5 cursor-default"
                    >
                      <div className="flex justify-between">
                        <span className="text-slate-600">Standard Monthly Base:</span>
                        <span className="font-semibold text-slate-800">
                          ₹{master.standardSalary.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-700 font-medium">Paid This Period:</span>
                        <span className="font-bold text-emerald-700">
                          ₹{master.paid.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200/70">
                        <span className="text-rose-700 font-medium">Pending Due:</span>
                        <span className="font-extrabold text-rose-700">
                          ₹{master.pending.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Helpers Section */}
      <div className="space-y-2 pt-2">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-teal-500" />
          <span>Helpers ({staffSalaries.helpers.length})</span>
        </h4>

        {staffSalaries.helpers.length === 0 ? (
          <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            No active Helpers found. Add Helpers in the Setup screen.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {staffSalaries.helpers.map((helper) => {
              const cardId = `helper-${helper.workerId}`;
              const isExpanded = expandedCardIds.has(cardId);
              return (
                <div
                  key={helper.workerId}
                  onClick={() => toggleCardExpand(cardId)}
                  className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs hover:border-teal-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {helper.name?.charAt(0)?.toUpperCase() || 'H'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-slate-900 truncate">
                            {helper.name}
                          </h5>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              helper.status === 'Fully Paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : helper.status === 'Partial'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {helper.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          📞 {helper.phone || 'No phone'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block leading-tight">
                          Pending Due
                        </span>
                        <span className="text-xs font-bold text-rose-600">
                          ₹{helper.pending.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAdd('Salary');
                        }}
                        className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                        title="Record Salary Payment"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span className="hidden xs:inline">Pay</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCardExpand(cardId);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                        title={isExpanded ? 'Collapse' : 'Expand Details'}
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-teal-600' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Breakdown */}
                  {isExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/70 rounded-xl p-2.5 text-xs space-y-1.5 cursor-default"
                    >
                      <div className="flex justify-between">
                        <span className="text-slate-600">Standard Monthly Base:</span>
                        <span className="font-semibold text-slate-800">
                          ₹{helper.standardSalary.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-700 font-medium">Paid This Period:</span>
                        <span className="font-bold text-emerald-700">
                          ₹{helper.paid.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200/70">
                        <span className="text-rose-700 font-medium">Pending Due:</span>
                        <span className="font-extrabold text-rose-700">
                          ₹{helper.pending.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
