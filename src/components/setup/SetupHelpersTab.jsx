import React, { useState } from 'react';
import {
  HeartHandshake,
  Plus,
  Search,
  ChevronDown,
  Phone,
  Trash2,
  UserMinus,
  RotateCcw,
  UserCheck,
  DollarSign,
  Briefcase,
  Edit2,
} from 'lucide-react';
import { useFactorySetup } from '../../context/domain';
import CustomSelect from '../common/CustomSelect';

export default function SetupHelpersTab({
  onAddHelper,
  onEditHelper,
  onRelieveHelper,
}) {
  const {
    helpers = [],
    masters = [],
    reactivateWorker,
    deleteWorkerPermanent,
  } = useFactorySetup();

  const [helperSubFilter, setHelperSubFilter] = useState('active'); // 'active' | 'former'
  const [helperAssignmentFilter, setHelperAssignmentFilter] = useState('all'); // 'all' | 'master' | 'internal' | 'external'
  const [helperSearch, setHelperSearch] = useState('');
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());

  const toggleCardExpand = (id) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = (ids) => setExpandedCardIds(new Set(ids));
  const handleCollapseAll = () => setExpandedCardIds(new Set());

  const activeHelpers = helpers.filter((h) => h.status !== 'Left');
  const formerHelpers = helpers.filter((h) => h.status === 'Left');

  const displayedHelpers = (helperSubFilter === 'active' ? activeHelpers : formerHelpers).filter(
    (h) => {
      const isMasterAssigned =
        h.helperCategory === 'master_assigned' || h.helperType === 'master_assigned';
      const isExternal =
        h.helperCategory === 'external' || h.wageType === 'Piece Rate';
      const isInternal = !isMasterAssigned && !isExternal;

      // Filter by assignment / category
      if (helperAssignmentFilter === 'master' && !isMasterAssigned) return false;
      if (helperAssignmentFilter === 'internal' && !isInternal) return false;
      if (helperAssignmentFilter === 'external' && !isExternal) return false;

      // Filter by search query
      const query = helperSearch.toLowerCase();
      const assignedMaster = masters.find((m) => m.id === h.assignedMasterId);
      const masterName = assignedMaster ? assignedMaster.name.toLowerCase() : '';

      return (
        h.name.toLowerCase().includes(query) ||
        h.phone.includes(query) ||
        (h.workType && h.workType.toLowerCase().includes(query)) ||
        masterName.includes(query)
      );
    }
  );

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Floor Helpers & Assistants</h2>
          <p className="text-[11px] text-slate-500">
            Support staff assigned to masters or handling other small factory work
          </p>
        </div>
        <button
          type="button"
          onClick={onAddHelper}
          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-200 flex items-center gap-1.5 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Helper</span>
        </button>
      </div>

      {/* Active vs Former Toggle */}
      <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold w-fit">
        <button
          type="button"
          onClick={() => setHelperSubFilter('active')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            helperSubFilter === 'active'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Active Helpers ({activeHelpers.length})
        </button>
        <button
          type="button"
          onClick={() => setHelperSubFilter('former')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            helperSubFilter === 'former'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Former Staff ({formerHelpers.length})
        </button>
      </div>

      {/* Search and Work Type Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by helper name, phone, task, or assigned master..."
            value={helperSearch}
            onChange={(e) => setHelperSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* One Unified Filter Button for Helpers */}
          <div className="min-w-[170px]">
            <CustomSelect
              value={helperAssignmentFilter}
              onChange={(val) => setHelperAssignmentFilter(val)}
              options={[
                { value: 'all', label: 'All Helpers' },
                { value: 'internal', label: 'Internal Helpers (Monthly Salary)' },
                { value: 'external', label: 'External Helpers (Price by PSC)' },
                { value: 'master', label: 'Assigned to Master' },
              ]}
              placeholder="Filter Role"
              theme="amber"
            />
          </div>

          {displayedHelpers.length > 0 && (() => {
            const allHelperIds = displayedHelpers.map((h) => `helper-${h.id}`);
            const allExpanded = allHelperIds.every((id) => expandedCardIds.has(id));
            return (
              <button
                type="button"
                onClick={() => (allExpanded ? handleCollapseAll() : handleExpandAll(allHelperIds))}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ml-auto cursor-pointer"
                title={allExpanded ? 'Collapse All Cards' : 'Expand All Cards'}
              >
                <span>{allExpanded ? '▲ Collapse All' : '▼ Expand All'}</span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Helpers List */}
      <div className="space-y-2.5">
        {displayedHelpers.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {helperSubFilter === 'active' ? 'No Helpers Added Yet' : 'No Former Helpers in Archive'}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {helperSubFilter === 'active'
                ? 'Register helpers to assist your cutting masters or handle thread trimming, packing, and small work.'
                : 'When a helper leaves, their complete history is safely preserved here.'}
            </p>
            {helperSubFilter === 'active' && (
              <button
                type="button"
                onClick={onAddHelper}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-amber-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Helper</span>
              </button>
            )}
          </div>
        ) : (
          displayedHelpers.map((h) => {
            const cardId = `helper-${h.id}`;
            const isExpanded = expandedCardIds.has(cardId);
            const assignedMaster = masters.find((m) => m.id === h.assignedMasterId);
            const isFormer = h.status === 'Left';
            const isMasterAssigned =
              h.helperCategory === 'master_assigned' || h.helperType === 'master_assigned';
            const isExternal =
              h.helperCategory === 'external' || h.wageType === 'Piece Rate';
            const isInternal = !isMasterAssigned && !isExternal;

            return (
              <div
                key={h.id}
                onClick={() => toggleCardExpand(cardId)}
                className={`p-3 bg-white rounded-2xl border shadow-xs transition-all cursor-pointer ${
                  isFormer
                    ? 'border-slate-300/80 bg-slate-50/50 hover:border-slate-400'
                    : 'border-slate-200/80 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                        isExternal
                          ? 'bg-indigo-100 text-indigo-800'
                          : isInternal
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {h.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-xs font-bold text-slate-900 truncate">{h.name}</h3>
                        {isFormer ? (
                          <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 font-extrabold uppercase px-1.5 py-0.2 rounded-full shrink-0">
                            Former
                          </span>
                        ) : isExternal ? (
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-extrabold uppercase px-1.5 py-0.2 rounded-full shrink-0">
                            External
                          </span>
                        ) : isInternal ? (
                          <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200/60 font-extrabold uppercase px-1.5 py-0.2 rounded-full shrink-0">
                            Internal
                          </span>
                        ) : (
                          <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200/60 font-extrabold uppercase px-1.5 py-0.2 rounded-full shrink-0">
                            Assistant
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap mt-0.5">
                        <span className="text-slate-600 font-medium truncate max-w-[150px] sm:max-w-none">
                          {h.workType || (isExternal ? 'Thread Cutting (Piece Rate)' : 'Floor Support & Chores')}
                        </span>
                        {isExternal && (
                          <span className="inline-flex items-center text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-1.5 py-0.2 rounded-md shrink-0 whitespace-nowrap">
                            ₹{h.defaultRatePerPSC || 2.5}/PSC
                          </span>
                        )}
                        {isMasterAssigned && assignedMaster && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100/80 px-1.5 py-0.2 rounded-md shrink-0 whitespace-nowrap">
                            <span>Master: {assignedMaster.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {h.phone && (
                      <a
                        href={`tel:${h.phone}`}
                        className="w-7 h-7 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg flex items-center justify-center transition-colors shrink-0"
                        title={`Call ${h.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-amber-600" />
                      </a>
                    )}

                    {!isFormer ? (
                      <>
                        {onEditHelper && (
                          <button
                            type="button"
                            onClick={() => onEditHelper(h)}
                            title="Edit Helper Details"
                            className="w-7 h-7 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRelieveHelper(h.id)}
                          title="Mark as Left (Archive records)"
                          className="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Permanently delete record for ${h.name}?`)) {
                            deleteWorkerPermanent('helper', h.id);
                          }
                        }}
                        title="Permanently remove"
                        className="w-7 h-7 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleCardExpand(cardId)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-600 text-slate-500 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-2xs"
                      title={isExpanded ? 'Collapse' : 'Expand Details'}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-amber-600' : 'text-slate-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Expandable Details */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 cursor-default animate-in fade-in duration-150"
                  >
                    {/* Allocation Info Pill */}
                    <div className="bg-slate-50/90 p-2.5 rounded-xl text-[11px] flex items-center justify-between flex-wrap gap-1">
                      {isMasterAssigned ? (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span>
                            Assigned to Master:{' '}
                            <strong className="text-purple-900 font-bold">
                              {assignedMaster ? assignedMaster.name : 'Master Unassigned'}
                            </strong>
                          </span>
                        </div>
                      ) : isExternal ? (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            Piece Rate:{' '}
                            <strong className="text-indigo-900 font-bold">
                              ₹{h.defaultRatePerPSC || 2.5} / PSC
                            </strong>{' '}
                            (Thread Cutting)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            Role: <strong className="font-bold text-slate-900">{h.workType}</strong>
                          </span>
                        </div>
                      )}

                      <span className="font-semibold text-slate-600 text-[10px] bg-white px-2 py-0.5 rounded-md border border-slate-200/60">
                        {isExternal
                          ? 'Price by PSC'
                          : isInternal
                            ? 'Monthly Salary + Chores'
                            : h.wageType || 'Daily Wage'}
                      </span>
                    </div>

                    {/* Footer Contact & Departure */}
                    {isFormer ? (
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <div className="p-2 bg-amber-50/60 border border-amber-100 rounded-xl text-[11px] text-amber-900">
                          <span className="font-semibold">Left on: {h.leftDate || 'Recorded'}</span>
                          {h.exitReason && (
                            <p className="text-[10px] text-amber-800 mt-0.5">
                              <span className="font-bold">Reason:</span> {h.exitReason}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            reactivateWorker('helper', h.id);
                            setHelperSubFilter('active');
                          }}
                          className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reactivate {h.name} (Returning Helper)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <a
                          href={`tel:${h.phone}`}
                          className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-amber-700"
                        >
                          <Phone className="w-3.5 h-3.5 text-amber-600" />
                          <span>{h.phone}</span>
                        </a>
                        {h.notes ? (
                          <span className="text-[10px] text-slate-500 italic truncate max-w-[180px]">
                            {h.notes}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Joined {h.joinedDate}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
