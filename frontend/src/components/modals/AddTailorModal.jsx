import React, { useState, useRef, useEffect } from 'react';
import { X, UserPlus, Phone, Lock, CheckCircle2, ChevronDown, Check, AlertCircle, Copy, Info } from 'lucide-react';
import { useFactory } from '../../context/useManagement';
import { sanitizeMobileNumber, validateMobileNumber } from '../../utils/formValidation';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

export default function AddTailorModal({ isOpen, onClose, tailorToEdit = null }) {
  const { addTailor, updateTailor, machines = [], tailors = [] } = useFactory();
  const isEditing = Boolean(tailorToEdit);

  const [formData, setFormData] = useState(() => {
    if (tailorToEdit) {
      return {
        name: tailorToEdit.name || '',
        phone: tailorToEdit.phone || '',
        assignedMachineId: tailorToEdit.assignedMachineId || '',
        status: tailorToEdit.status || 'Active',
        specialty: tailorToEdit.specialty || 'Stitching',
        password: tailorToEdit.password || 'tailor123',
      };
    }
    return {
      name: '',
      phone: '',
      assignedMachineId: '',
      status: 'Active',
      specialty: 'Stitching',
      password: 'tailor123',
    };
  });

  const [prevEditId, setPrevEditId] = useState(tailorToEdit?.id || null);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen || (tailorToEdit && tailorToEdit.id !== prevEditId)) {
    setPrevIsOpen(isOpen);
    setPrevEditId(tailorToEdit?.id || null);
    if (tailorToEdit) {
      setFormData({
        name: tailorToEdit.name || '',
        phone: tailorToEdit.phone || '',
        assignedMachineId: tailorToEdit.assignedMachineId || '',
        status: tailorToEdit.status || 'Active',
        specialty: tailorToEdit.specialty || 'Stitching',
        password: tailorToEdit.password || 'tailor123',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        assignedMachineId: '',
        status: 'Active',
        specialty: 'Stitching',
        password: 'tailor123',
      });
    }
  }

  const [error, setError] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedOptionRef = useRef(null);

  // Directly fetch stored password from Supabase if not yet present in memory
  useEffect(() => {
    if (!isOpen || !tailorToEdit?.id || tailorToEdit.password) return;
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;
    const fetchStoredTailorPassword = async () => {
      try {
        const { data, error } = await supabase
          .from('tailors')
          .select('password')
          .eq('id', tailorToEdit.id)
          .maybeSingle();

        if (isMounted && !error && data?.password) {
          setFormData((prev) => ({ ...prev, password: data.password }));
        }
      } catch (err) {
        console.warn('Could not fetch stored tailor password:', err);
      }
    };

    fetchStoredTailorPassword();
    return () => {
      isMounted = false;
    };
  }, [isOpen, tailorToEdit?.id, tailorToEdit?.password]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isDropdownOpen && selectedOptionRef.current) {
      const timer = setTimeout(() => {
        if (selectedOptionRef.current) {
          selectedOptionRef.current.scrollIntoView({
            block: 'center',
            behavior: 'smooth',
          });
          selectedOptionRef.current.focus({ preventScroll: true });
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isDropdownOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setFormData({
      name: '',
      phone: '',
      password: 'tailor123',
      assignedMachineId: '',
      status: 'Active',
      specialty: 'Stitching',
    });
    setError('');
    setIsDropdownOpen(false);
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter the Tailor’s full name');
      return;
    }
    const phoneVal = validateMobileNumber(formData.phone, { fieldName: 'Tailor mobile number' });
    if (!phoneVal.isValid) {
      setError(phoneVal.error);
      return;
    }

    if (isEditing) {
      updateTailor(tailorToEdit.id, {
        ...formData,
        name: formData.name.trim(),
        phone: phoneVal.cleanedValue,
        assignedMachineId: formData.assignedMachineId || null,
      });
    } else {
      addTailor({
        ...formData,
        name: formData.name.trim(),
        phone: phoneVal.cleanedValue,
        assignedMachineId: formData.assignedMachineId || null,
        specialty: formData.specialty || 'Stitching',
        salaryType: 'Piece Rate',
      });
    }
    handleClose();
  };

  // Only show machines that are NOT already assigned to any other tailor
  const unassignedMachines = machines.filter((m) => {
    if (tailorToEdit && m.id === tailorToEdit.assignedMachineId) return true;
    if (m.assignedTailorId && m.assignedTailorId !== tailorToEdit?.id) return false;
    const isOccupied = tailors.some(
      (t) => t.id !== tailorToEdit?.id && t.status === 'Active' && t.assignedMachineId === m.id
    );
    return !isOccupied;
  });

  const selectedMachine = unassignedMachines.find((m) => m.id === formData.assignedMachineId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isEditing ? 'Edit Tailor Profile' : 'Add New Tailor'}
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form with Scrollable Body and Sticky Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 space-y-3.5 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tailor Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mobile Number *
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: sanitizeMobileNumber(e.target.value) })}
                  className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                {formData.password && (
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(formData.password);
                        setCopiedPassword(true);
                        setTimeout(() => setCopiedPassword(false), 2000);
                      }
                    }}
                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Copy password to clipboard"
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-extrabold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                <Info className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>Plain text password from database.</span>
              </p>
            </div>
          </div>

          {/* Machine Assignment Section */}
          <div className="p-3 border border-slate-200/90 rounded-2xl space-y-2" ref={dropdownRef}>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Assign to Machine
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                {unassignedMachines.length} Available
              </span>
            </div>

            {/* Custom Interactive Dropdown (Zero Mobile OS Dialogs) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border outline-none cursor-pointer ${
                  isDropdownOpen
                    ? 'border-emerald-500 ring-2 ring-emerald-100 bg-white shadow-xs'
                    : selectedMachine
                    ? 'border-emerald-300 bg-emerald-50/40 text-slate-900 shadow-2xs'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {selectedMachine ? (
                    <>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono font-bold text-[11px] shrink-0 border border-emerald-200">
                        {selectedMachine.code}
                      </span>
                      <span className="font-bold text-slate-900 truncate">
                        {selectedMachine.name}
                      </span>
                      <span className="text-[10px] text-slate-500 bg-white/80 border border-slate-200/60 px-1.5 py-0.5 rounded font-medium shrink-0">
                        {selectedMachine.line ? (selectedMachine.line.toLowerCase().startsWith('block') ? selectedMachine.line : `Block ${selectedMachine.line}`) : 'Block A'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                      <span className="text-slate-600 font-medium truncate">-- No Machine Assigned (Float / Standby) --</span>
                    </>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180 text-emerald-600' : ''
                  }`}
                />
              </button>

              {/* Dropdown Options Menu */}
              {isDropdownOpen && (
                <div className="mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 z-30">
                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                    {/* Standby / No Machine Option */}
                    <button
                      ref={!formData.assignedMachineId ? selectedOptionRef : null}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, assignedMachineId: '' });
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer outline-none focus:bg-emerald-50/90 focus:ring-1 focus:ring-emerald-400 ${
                        !formData.assignedMachineId
                          ? 'bg-emerald-50 text-emerald-900 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            !formData.assignedMachineId
                              ? 'bg-emerald-500 ring-4 ring-emerald-100'
                              : 'bg-slate-300'
                          }`}
                        ></span>
                        <div>
                          <p className="text-xs font-semibold leading-tight">No Machine Assigned (Float / Standby)</p>
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">Flexible operator (can be assigned anytime)</p>
                        </div>
                      </div>
                      {!formData.assignedMachineId && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </button>

                    {/* Machine Options List */}
                    {unassignedMachines.length > 0 ? (
                      unassignedMachines.map((m) => {
                        const isSelected = m.id === formData.assignedMachineId;
                        return (
                          <button
                            key={m.id}
                            ref={isSelected ? selectedOptionRef : null}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, assignedMachineId: m.id });
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer outline-none focus:bg-emerald-50/90 focus:ring-1 focus:ring-emerald-400 ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-900 font-bold'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`px-2 py-0.5 rounded-lg font-mono text-xs font-bold shrink-0 border ${
                                  isSelected
                                    ? 'bg-emerald-200 border-emerald-300 text-emerald-900'
                                    : 'bg-slate-100 border-slate-200 text-slate-700'
                                }`}
                              >
                                {m.code}
                              </span>
                              <div className="min-w-0 truncate">
                                <p className="text-xs font-bold text-slate-900 truncate leading-tight">{m.name}</p>
                                <p className="text-[10px] text-slate-500 font-normal truncate mt-0.5">
                                  {m.type || 'Single Needle'} • {m.line ? (m.line.toLowerCase().startsWith('block') ? m.line : `Block ${m.line}`) : 'Block A'}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3.5 py-3 text-center text-xs text-slate-400 font-medium">
                        No machines currently available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Machine Confirmation Banner */}
            {selectedMachine && !isDropdownOpen && (
              <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-slate-900">{selectedMachine.code}</span>
                    <span className="text-slate-600 ml-1.5 text-[11px]">
                      {selectedMachine.name} • {selectedMachine.line ? (selectedMachine.line.toLowerCase().startsWith('block') ? selectedMachine.line : `Block ${selectedMachine.line}`) : 'Block A'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-md">
                  Active Link
                </span>
              </div>
            )}
          </div>

            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2.5 shrink-0 shadow-xs z-10">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition-all cursor-pointer active:scale-95"
              >
                {isEditing ? 'Save Changes' : 'Save Tailor'}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}
