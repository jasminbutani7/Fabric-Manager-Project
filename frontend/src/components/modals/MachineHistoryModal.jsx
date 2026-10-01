import React from 'react';
import { X, History, Scissors, Phone, Clock } from 'lucide-react';
import { useFactory } from '../../context/useManagement';

export default function MachineHistoryModal({ isOpen, onClose, machineId }) {
  const { machines, tailors } = useFactory();

  const machine = machines.find((m) => m.id === machineId);
  const currentTailor = tailors.find((t) => t.id === machine?.assignedTailorId);

  if (!isOpen || !machine) return null;

  const history = machine.operatorHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 text-left">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-indigo-300 shadow-inner shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                  Operator History & Log
                </h2>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 shrink-0">
                  {machine.code}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
                {machine.name} • Station Activity Record
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Current Operator Card */}
          <div className="p-3.5 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-200/90 rounded-2xl shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Current Active Operator
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 font-black px-2 py-0.5 rounded-full">
                Active Now
              </span>
            </div>
            {currentTailor ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
                  {currentTailor.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
                    {currentTailor.name}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5 flex-wrap">
                    {currentTailor.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{currentTailor.phone}</span>
                      </span>
                    )}
                    {currentTailor.specialty && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>{currentTailor.specialty}</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Operating since: {currentTailor.joinedDate || 'Recent'}</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-1">
                No active operator currently assigned to this machine.
              </p>
            )}
          </div>

          {/* Timeline of Past Operators */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Past Operator Log ({history.length})</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                Permanent Record
              </span>
            </div>

            {history.length > 0 ? (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div
                    key={h.id || i}
                    className="p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <Scissors className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-extrabold text-slate-900 truncate">{h.tailorName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
                        {h.fromDate} → {h.toDate}
                      </span>
                    </div>

                    {h.phone && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 pl-8">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>Contact: {h.phone}</span>
                      </p>
                    )}

                    {h.reason && (
                      <div className="mt-1 ml-8 p-2 bg-white rounded-lg border border-slate-200/80 text-[11px] text-slate-600">
                        <span className="font-bold text-slate-700">Reason/Note:</span> {h.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500 border border-slate-200/70">
                No past operators logged yet. When an operator is replaced, their history will automatically appear here.
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Actions */}
        <div className="p-2.5 sm:p-3 border-t border-slate-100 bg-white/95 backdrop-blur-xs flex items-center shrink-0 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-800 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
}
