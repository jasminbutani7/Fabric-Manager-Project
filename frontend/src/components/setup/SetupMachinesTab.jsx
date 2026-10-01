import React, { useState, useRef, useEffect } from 'react';
import {
  Cog,
  Plus,
  Search,
  ChevronDown,
  Edit2,
  Trash2,
  Scissors,
  History,
  RefreshCw,
  Check,
} from 'lucide-react';
import { useFactorySetup } from '../../context/domain';

const MACHINE_STATUS_CONFIG = {
  Active: {
    label: 'Active',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100',
    dot: 'bg-emerald-500',
    activeBg: 'bg-emerald-50 text-emerald-900 font-bold',
  },
  Idle: {
    label: 'Idle',
    bg: 'bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100',
    dot: 'bg-amber-500',
    activeBg: 'bg-amber-50 text-amber-900 font-bold',
  },
  Maintenance: {
    label: 'Maint',
    bg: 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100',
    dot: 'bg-rose-500',
    activeBg: 'bg-rose-50 text-rose-900 font-bold',
  },
};

function MachineStatusSelector({ currentStatus, onSelectStatus }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const currentConfig = MACHINE_STATUS_CONFIG[currentStatus] || MACHINE_STATUS_CONFIG.Idle;

  return (
    <div className="relative shrink-0" ref={containerRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer shadow-2xs active:scale-95 ${currentConfig.bg}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${currentConfig.dot}`} />
        <span>{currentConfig.label}</span>
        <ChevronDown className={`w-2.5 h-2.5 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-0.5">
            Set Status
          </div>
          {Object.entries(MACHINE_STATUS_CONFIG).map(([statusKey, config]) => {
            const isSelected = currentStatus === statusKey;
            return (
              <button
                type="button"
                key={statusKey}
                onClick={() => {
                  onSelectStatus(statusKey);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer hover:bg-slate-50 ${isSelected ? config.activeBg : 'text-slate-700'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                  <span className="font-medium">{statusKey}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-slate-700" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SetupMachinesTab({
  onAddMachine,
  onEditMachine,
  onDeleteMachine,
  onOpenHistory,
  onOpenReplace,
}) {
  const { machines = [], tailors = [], updateMachine } = useFactorySetup();

  const [machineSearch, setMachineSearch] = useState('');
  const [selectedMachineFilter, setSelectedMachineFilter] = useState('all');
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

  const filteredMachines = machines.filter((m) => {
    const query = machineSearch.toLowerCase();
    const matchesSearch =
      (m.code && m.code.toLowerCase().includes(query)) ||
      (m.name && m.name.toLowerCase().includes(query)) ||
      (m.line && m.line.toLowerCase().includes(query)) ||
      (m.type && m.type.toLowerCase().includes(query)) ||
      (m.brand && m.brand.toLowerCase().includes(query));
    const matchesFilter =
      selectedMachineFilter === 'all' || m.status?.toLowerCase() === selectedMachineFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Factory Machines</h2>
          <p className="text-[11px] text-slate-500">
            {machines.filter((m) => m.status === 'Active').length} Active •{' '}
            {machines.filter((m) => m.assignedTailorId).length} Assigned
          </p>
        </div>
        <button
          type="button"
          onClick={onAddMachine}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-100 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Machine</span>
        </button>
      </div>

      {/* Search & Filter pills */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by machine name, code, or block..."
            value={machineSearch}
            onChange={(e) => setMachineSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1">
          <div className="flex gap-1.5 overflow-x-auto">
            {['all', 'active', 'idle', 'maintenance'].map((filter) => (
              <button
                type="button"
                key={filter}
                onClick={() => setSelectedMachineFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors cursor-pointer ${selectedMachineFilter === filter
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {filteredMachines.length > 0 && (() => {
            const allMachineIds = filteredMachines.map((m) => `machine-${m.id}`);
            const allExpanded = allMachineIds.every((id) => expandedCardIds.has(id));
            return (
              <button
                type="button"
                onClick={() => (allExpanded ? handleCollapseAll() : handleExpandAll(allMachineIds))}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1 shrink-0 ml-auto cursor-pointer"
                title={allExpanded ? 'Collapse All Cards' : 'Expand All Cards'}
              >
                <span>{allExpanded ? '▲ Collapse All' : '▼ Expand All'}</span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Machines List */}
      <div className="space-y-2.5">
        {filteredMachines.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Cog className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Machines Added Yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Your machine directory is clean. Tap "+ Add Machine" above to register your sewing, cutting, or finishing machines.
            </p>
          </div>
        ) : (
          filteredMachines.map((m) => {
            const cardId = `machine-${m.id}`;
            const isExpanded = expandedCardIds.has(cardId);
            const assignedTailor = tailors.find((t) => t.id === m.assignedTailorId);
            const pastOperatorsCount = (m.operatorHistory || []).length;
            return (
              <div
                key={m.id}
                onClick={() => toggleCardExpand(cardId)}
                className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="px-2.5 h-8 min-w-[38px] rounded-xl bg-indigo-50 border border-indigo-100/70 flex items-center justify-center text-indigo-700 font-extrabold text-xs shrink-0 whitespace-nowrap tracking-tight shadow-2xs">
                      {m.code}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-slate-900 truncate">{m.name}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] mt-0.5 flex-wrap">
                        {assignedTailor ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded-md shrink-0 whitespace-nowrap">
                            <Scissors className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[110px] sm:max-w-none">{assignedTailor.name}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100/80 border border-slate-200/60 px-1.5 py-0.2 rounded-md shrink-0 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                            <span>Available</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <MachineStatusSelector
                      currentStatus={m.status}
                      onSelectStatus={(newStatus) => updateMachine(m.id, { status: newStatus })}
                    />

                    <button
                      type="button"
                      onClick={() => onEditMachine(m)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Edit Machine Specifications"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteMachine(m)}
                      className="w-7 h-7 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Delete Machine"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleCardExpand(cardId)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-2xs"
                      title={isExpanded ? 'Collapse' : 'Expand Details'}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-600' : 'text-slate-400'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Expandable Details */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 pt-3 border-t border-slate-100 space-y-2 cursor-default animate-in fade-in duration-150"
                  >
                    {m.notes && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                        <b className="text-slate-900">Notes: </b>{m.notes}
                      </p>
                    )}

                    {/* Tailor Assignment & History Section */}
                    <div className="flex items-center justify-between text-xs">
                      {assignedTailor ? (
                        <div className="flex items-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-slate-600 text-[11px]">Operator:</span>
                          <span className="font-bold text-slate-900 text-xs">
                            {assignedTailor.name}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                          <span>Available (No Operator Assigned)</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {/* Operator History Button */}
                        <button
                          type="button"
                          onClick={() => onOpenHistory(m.id)}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md cursor-pointer"
                        >
                          <History className="w-3 h-3" />
                          <span>Log ({pastOperatorsCount})</span>
                        </button>

                        {/* Replace Operator Button */}
                        {assignedTailor && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenReplace({
                                machineId: m.id,
                                currentTailorId: assignedTailor.id,
                              })
                            }
                            className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md active:scale-95 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Replace</span>
                          </button>
                        )}
                      </div>
                    </div>
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
