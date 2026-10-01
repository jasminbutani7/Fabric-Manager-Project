import React, { useState } from 'react';
import { X, UserMinus, ShieldCheck } from 'lucide-react';
import { useFactory } from '../../context/useManagement';

export default function RelieveWorkerModal({
  isOpen,
  onClose,
  workerType, // 'tailor' | 'master' | 'helper'
  workerId,
}) {
  const { tailors, masters, helpers, relieveWorker, machines } = useFactory();

  const worker =
    workerType === 'tailor'
      ? tailors.find((t) => t.id === workerId)
      : workerType === 'master'
      ? masters.find((m) => m.id === workerId)
      : (helpers || []).find((h) => h.id === workerId);

  const assignedMachine =
    workerType === 'tailor' && worker?.assignedMachineId
      ? machines.find((m) => m.id === worker.assignedMachineId)
      : null;

  const [exitReason, setExitReason] = useState('Resigned / Seasonal break');
  const [error, setError] = useState('');

  if (!isOpen || !worker) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!exitReason.trim()) {
      setError('Please provide a reason or note for the departure');
      return;
    }

    relieveWorker(workerType, worker.id, exitReason.trim());
    onClose();
  };

  const commonReasons = [
    'Seasonal harvest break / Returned to village',
    'Resigned for personal / family reasons',
    'Found other employment',
    'Health / Medical leave',
    'Contract term completed',
    'Relocated to another city',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <UserMinus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Relieve {worker.role}</h2>
              <p className="text-[11px] text-rose-100 font-medium">{worker.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <p className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </p>
          )}

          {/* Machine liberation notice if assigned */}
          {assignedMachine && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">
                Machine Impact
              </span>
              <p className="text-xs font-semibold text-amber-950 mt-0.5">
                Machine <span className="font-bold">{assignedMachine.code}</span> ({assignedMachine.name}) will be freed up for a new operator.
              </p>
            </div>
          )}

          {/* Reason selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Departure Reason / Note
            </label>
            <input
              type="text"
              required
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Quick Suggestions:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {commonReasons.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setExitReason(r)}
                  className="text-[10px] py-1 px-2 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-medium transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Guarantee banner */}
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1 text-xs text-emerald-900">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Historical Data Retained</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              {worker.name} will be archived under <strong>"Former Staff"</strong>. Contact details, past tenure, and machine history remain intact. You can reactivate them with 1 click if they return.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 border-t border-slate-100 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-100 transition-all active:scale-95"
            >
              Relieve & Archive Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
