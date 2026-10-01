import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  ChevronDown,
  Check,
  Phone,
  UserMinus,
  Sparkles,
} from 'lucide-react';
import { useFactory } from '../../context/useManagement';
import { sanitizeMobileNumber, validateMobileNumber } from '../../utils/formValidation';

const QUICK_REASONS = [
  'Relieved / Left employment',
  'Seasonal Leave',
  'Transferred to another unit',
  'Medical / Health Leave',
];

export default function ReplaceWorkerModal({
  isOpen,
  onClose,
  machineId,
  currentTailorId,
}) {
  const { machines, tailors, replaceTailorOnMachine, addTailor } = useFactory();

  const machine = machines.find((m) => m.id === machineId);
  const currentTailor = tailors.find((t) => t.id === currentTailorId);

  // Available replacement candidates (active tailors not currently on this machine)
  const availableTailors = tailors.filter(
    (t) => t.status === 'Active' && t.id !== currentTailorId
  );

  const [replacementMode, setReplacementMode] = useState('existing'); // 'existing' | 'new'
  const [selectedNewTailorId, setSelectedNewTailorId] = useState(
    availableTailors.length > 0 ? availableTailors[0].id : ''
  );
  const [markOldAsLeft, setMarkOldAsLeft] = useState(true);
  const [exitReason, setExitReason] = useState('Relieved / Left employment');

  const [isTailorDropdownOpen, setIsTailorDropdownOpen] = useState(false);
  const tailorDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tailorDropdownRef.current && !tailorDropdownRef.current.contains(event.target)) {
        setIsTailorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // New tailor inline fields if creating a new person
  const [newTailorName, setNewTailorName] = useState('');
  const [newTailorPhone, setNewTailorPhone] = useState('');
  const [newTailorSpecialty, setNewTailorSpecialty] = useState('Shirt & Kurti Stitching');

  const [error, setError] = useState('');

  if (!isOpen || !machine) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    let replacementId = selectedNewTailorId;

    if (replacementMode === 'new') {
      if (!newTailorName.trim()) {
        setError('Please enter the new replacement tailor’s name');
        return;
      }
      const phoneVal = validateMobileNumber(newTailorPhone, { fieldName: 'Tailor mobile number' });
      if (!phoneVal.isValid) {
        setError(phoneVal.error);
        return;
      }

      // Create the new tailor first
      const created = addTailor({
        name: newTailorName.trim(),
        phone: phoneVal.cleanedValue,
        specialty: newTailorSpecialty,
        assignedMachineId: null, // will be linked via replaceTailorOnMachine
      });
      replacementId = created.id;
    }

    if (!replacementId) {
      setError('Please select or add a replacement person');
      return;
    }

    replaceTailorOnMachine({
      machineId: machine.id,
      oldTailorId: currentTailorId,
      newTailorId: replacementId,
      markOldTailorAsLeft: markOldAsLeft,
      exitReason,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 text-left">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-black tracking-tight leading-tight">
                  Replace Operator on Machine
                </h2>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 shrink-0">
                  {machine.code}
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-medium truncate mt-0.5">
                {machine.name} • Station Handover
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0 text-left">
          <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1">
            {error && (
              <p className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
                {error}
              </p>
            )}

            {/* Current Operator Card */}
            <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <UserMinus className="w-3.5 h-3.5 text-amber-600" />
                  <span>Current Operator (To be replaced)</span>
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Leaving Machine
                </span>
              </div>
              <div className="flex items-center gap-2.5 pt-0.5">
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                  {currentTailor?.name ? currentTailor.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                    {currentTailor?.name || 'Unassigned'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1.5 mt-0.5">
                    {currentTailor?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{currentTailor.phone}</span>
                      </span>
                    )}
                    {currentTailor?.specialty && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>{currentTailor.specialty}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Reason for Departure */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Reason for Departure / Replacement *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Resigned, Seasonal leave to village, Transferred"
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
              />

              {/* Quick Preset Chips */}
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {QUICK_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setExitReason(reason)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      exitReason === reason
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Data preservation option */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markOldAsLeft}
                  onChange={(e) => setMarkOldAsLeft(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-amber-950 block">
                    Move old worker to "Former Staff" archive
                  </span>
                  <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                    Full records, past piece rates, phone number, and exit date are permanently stored. You can reactivate them anytime!
                  </p>
                </div>
              </label>
            </div>

            {/* Replacement Mode Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Select Replacement Person
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReplacementMode('existing')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    replacementMode === 'existing'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs font-black'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Existing Tailor ({availableTailors.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReplacementMode('new')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    replacementMode === 'new'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs font-black'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Register New Hire</span>
                </button>
              </div>
            </div>

            {/* If Existing */}
            {replacementMode === 'existing' && (
              <div>
                {availableTailors.length > 0 ? (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Choose Tailor to Assign to {machine.code}:
                    </label>
                    <div className="relative" ref={tailorDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsTailorDropdownOpen((prev) => !prev)}
                        className={`w-full px-3 py-2 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isTailorDropdownOpen
                            ? 'border-indigo-500 bg-white ring-2 ring-indigo-100'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {(() => {
                          const sel = availableTailors.find((t) => String(t.id) === String(selectedNewTailorId));
                          if (sel) {
                            return (
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {sel.name?.slice(0, 2).toUpperCase() || 'TL'}
                                </span>
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {sel.name}
                                </span>
                                <span className="text-[11px] text-slate-500 truncate">
                                  ({sel.phone})
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ml-auto ${
                                    sel.assignedMachineId
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {sel.assignedMachineId ? 'On another machine' : 'Free / Available'}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <span className="text-xs font-medium text-slate-500">
                              -- Select Tailor --
                            </span>
                          );
                        })()}
                        <ChevronDown
                          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                            isTailorDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                          }`}
                        />
                      </button>

                      {isTailorDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1 max-h-52 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100">
                          <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              Available Tailor Candidates
                            </span>
                            <span className="text-[10px] font-bold text-indigo-600">
                              {availableTailors.length} Found
                            </span>
                          </div>
                          <div className="p-1 space-y-0.5">
                            {availableTailors.map((t) => {
                              const isSelected = String(t.id) === String(selectedNewTailorId);
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedNewTailorId(t.id);
                                    setIsTailorDropdownOpen(false);
                                  }}
                                  className={`w-full px-2.5 py-1.5 text-left rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/80'
                                      : 'text-slate-700 hover:bg-slate-50 font-medium'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <div
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white shadow-2xs'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {t.name?.slice(0, 2).toUpperCase() || 'TL'}
                                    </div>
                                    <div className="truncate min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="truncate font-bold">{t.name}</span>
                                        <span
                                          className={`text-[8px] px-1.5 py-0.2 rounded font-bold ${
                                            t.assignedMachineId
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-emerald-100 text-emerald-800'
                                          }`}
                                        >
                                          {t.assignedMachineId ? 'Busy' : 'Available'}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 truncate font-normal">
                                        {t.phone}
                                      </p>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                      <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                    <UserMinus className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>No other existing tailors. Choose "+ Register New Hire" above.</span>
                  </div>
                )}
              </div>
            )}

            {/* If New */}
            {replacementMode === 'new' && (
              <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl space-y-2.5 animate-in fade-in">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>New Replacement Tailor Details</span>
                </p>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Suresh Patel"
                    value={newTailorName}
                    onChange={(e) => setNewTailorName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit mobile"
                      value={newTailorPhone}
                      onChange={(e) => setNewTailorPhone(sanitizeMobileNumber(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Specialty
                    </label>
                    <input
                      type="text"
                      placeholder="Shirt / Kurti"
                      value={newTailorSpecialty}
                      onChange={(e) => setNewTailorSpecialty(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Guarantee banner */}
            <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-100 flex items-center gap-2 text-[11px] text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Audit Safe: Machine log & old worker records remain permanently preserved.</span>
            </div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="p-2.5 sm:p-3 border-t border-slate-100 bg-white/95 backdrop-blur-xs flex items-center gap-2 shrink-0 shadow-lg">
            <button
              type="button"
              onClick={onClose}
              className="w-20 sm:w-24 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-md shadow-amber-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span>Confirm Replacement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
