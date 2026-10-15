import React from 'react';
import { Scissors, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import CustomSelect from '../common/CustomSelect';
import { buildWhatsAppUrl } from '../../utils/whatsappNotification';

export default function TailorLedgerSection({
  tailorPayroll = [],
  selectedMonth,
  setSelectedMonth,
  availableMonths = [],
  currentYearMonth,
  formatMonthName,
  expandedCardIds,
  toggleCardExpand,
  handleExpandAll,
  handleCollapseAll,
  currentUser,
}) {
  const currentItemIds = tailorPayroll.map((t) => t.tailorId);
  const isAllExpanded =
    currentItemIds.length > 0 &&
    currentItemIds.every((id) => expandedCardIds.has(id));

  return (
    <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-3.5 sm:p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-indigo-950">
              Tailor Monthly Stitching Payroll Ledger
            </h3>
            <p className="text-xs text-indigo-700">
              Total pieces stitched × piece rates for garment pieces in {formatMonthName(selectedMonth)}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
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
              theme="indigo"
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
              className="px-3 py-1.5 bg-white hover:bg-indigo-100/60 border border-indigo-200 rounded-xl text-[11px] font-bold text-indigo-700 transition-all flex items-center gap-1.5 shadow-2xs shrink-0 active:scale-95 cursor-pointer"
              title="Toggle expand / collapse for all tailor records"
            >
              <span>{isAllExpanded ? 'Collapse All' : 'Expand All'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isAllExpanded ? 'rotate-180 text-indigo-600' : 'text-slate-400'
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {tailorPayroll.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 text-center space-y-2">
          <Scissors className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">No Tailors Active</h4>
          <p className="text-xs text-slate-500">
            Register tailors in the Setup tab and assign work in Production to calculate monthly stitching payroll.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tailorPayroll.map((tailor) => {
            const isExpanded = expandedCardIds.has(tailor.tailorId);
            const totalPieces = tailor.piecesCompleted?.total || 0;
            const earnings = tailor.stitchingEarnings || 0;

            return (
              <div
                key={tailor.tailorId}
                onClick={() => toggleCardExpand(tailor.tailorId)}
                className={`bg-white rounded-2xl border transition-all text-left cursor-pointer ${
                  isExpanded
                    ? 'p-4 border-indigo-300 shadow-md ring-2 ring-indigo-500/10'
                    : 'p-2.5 sm:p-3 border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-xs'
                }`}
              >
                {!isExpanded ? (
                  /* --- COMPACT COLLAPSED ROW --- */
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                        {tailor.tailorName ? tailor.tailorName.charAt(0) : 'T'}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {tailor.tailorName}
                      </h4>
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded shrink-0">
                        M: {tailor.machineCode}
                      </span>
                    </div>

                    <div
                      className="flex items-center gap-1 sm:gap-1.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-black text-indigo-600 block leading-tight">
                          ₹{earnings.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block">
                          {totalPieces} pcs
                        </span>
                      </div>

                      {tailor.tailorPhone && (
                        <a
                          href={buildWhatsAppUrl(
                            tailor.tailorPhone,
                            `Hello ${tailor.tailorName},\n\nYour stitching earnings statement for ${formatMonthName(
                              selectedMonth
                            )}:\nTotal Pieces Completed: ${totalPieces}\nTotal Stitching Payment: ₹${earnings.toLocaleString(
                              'en-IN'
                            )}.\n\nThank you, ${currentUser?.companyName || 'Management'}`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center cursor-pointer shrink-0"
                          title="Send WhatsApp Statement"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleCardExpand(tailor.tailorId)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-2xs"
                        title="Expand full tailor details"
                      >
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* --- EXPANDED DETAILED CARD --- */
                  <div
                    className="space-y-3 animate-in fade-in duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {tailor.tailorName}
                          </h4>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md">
                            Machine: {tailor.machineCode}
                          </span>
                        </div>
                        {tailor.tailorPhone && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            📞 {tailor.tailorPhone}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                            Total Labor Earned
                          </span>
                          <span className="text-base font-extrabold text-indigo-600">
                            ₹{earnings.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCardExpand(tailor.tailorId)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer ml-1"
                          title="Collapse"
                        >
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    </div>

                    {/* Pieces Stitched Breakdown */}
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs">
                      <div className="flex justify-between items-center text-slate-700 font-semibold mb-1">
                        <span>Pieces Stitched This Period:</span>
                        <span className="text-indigo-600 font-bold">
                          {totalPieces} Total Pieces
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Based on verified tailor work completed in Production workflow.
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500">
                        Status:{' '}
                        <span className="font-semibold text-emerald-600">Active</span>
                      </span>

                      {tailor.tailorPhone && (
                        <a
                          href={buildWhatsAppUrl(
                            tailor.tailorPhone,
                            `Hello ${tailor.tailorName},\n\nYour stitching earnings statement for ${formatMonthName(
                              selectedMonth
                            )}:\nTotal Pieces Completed: ${totalPieces}\nTotal Stitching Payment: ₹${earnings.toLocaleString(
                              'en-IN'
                            )}.\n\nThank you, ${currentUser?.companyName || 'Management'}`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Send Statement</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
