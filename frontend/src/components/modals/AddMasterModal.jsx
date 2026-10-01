import React, { useState, useEffect } from 'react';
import { X, UserCheck, Phone, Lock, Copy, Check, Info } from 'lucide-react';
import { useFactory } from '../../context/useManagement';
import { sanitizeMobileNumber, validateMobileNumber } from '../../utils/formValidation';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import AlertModal from './AlertModal';

export default function AddMasterModal({ isOpen, onClose, masterToEdit = null }) {
  const { addMaster, updateMaster } = useFactory();
  const isEditing = Boolean(masterToEdit);

  const [formData, setFormData] = useState(() => {
    if (masterToEdit) {
      return {
        name: masterToEdit.name || '',
        phone: masterToEdit.phone || '',
        specialization: masterToEdit.specialization || '',
        experience: masterToEdit.experience || '',
        password: masterToEdit.password || 'master123',
        status: masterToEdit.status || 'Active',
      };
    }
    return {
      name: '',
      phone: '',
      specialization: '',
      experience: '',
      password: 'master123',
      status: 'Active',
    };
  });

  const [prevEditId, setPrevEditId] = useState(masterToEdit?.id || null);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen || (masterToEdit && masterToEdit.id !== prevEditId)) {
    setPrevIsOpen(isOpen);
    setPrevEditId(masterToEdit?.id || null);
    if (masterToEdit) {
      setFormData({
        name: masterToEdit.name || '',
        phone: masterToEdit.phone || '',
        specialization: masterToEdit.specialization || '',
        experience: masterToEdit.experience || '',
        password: masterToEdit.password || 'master123',
        status: masterToEdit.status || 'Active',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        specialization: '',
        experience: '',
        password: 'master123',
        status: 'Active',
      });
    }
  }

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

  const [copiedPassword, setCopiedPassword] = useState(false);

  // Directly fetch stored password from Supabase if not yet present in memory
  useEffect(() => {
    if (!isOpen || !masterToEdit?.id || masterToEdit.password) return;
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;
    const fetchStoredMasterPassword = async () => {
      try {
        const { data, error } = await supabase
          .from('masters')
          .select('password')
          .eq('id', masterToEdit.id)
          .maybeSingle();

        if (isMounted && !error && data?.password) {
          setFormData((prev) => ({ ...prev, password: data.password }));
        }
      } catch (err) {
        console.warn('Could not fetch stored master password:', err);
      }
    };

    fetchStoredMasterPassword();
    return () => {
      isMounted = false;
    };
  }, [isOpen, masterToEdit?.id, masterToEdit?.password]);

  if (!isOpen) return null;

  const handleClose = () => {
    setAlertModal({
      isOpen: false,
      title: '',
      message: '',
      type: 'error',
    });
    setFormData({
      name: '',
      phone: '',
      specialization: '',
      experience: '',
      password: 'master123',
      status: 'Active',
    });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Master Name Required',
        message: 'Please enter the Master’s full name before saving.',
        type: 'warning',
      });
      return;
    }
    const phoneVal = validateMobileNumber(formData.phone, { fieldName: 'Master mobile number' });
    if (!phoneVal.isValid) {
      setAlertModal({
        isOpen: true,
        title: 'Invalid Mobile Number',
        message: phoneVal.error,
        type: 'warning',
      });
      return;
    }

    if (isEditing) {
      updateMaster(masterToEdit.id, {
        ...formData,
        name: formData.name.trim(),
        phone: phoneVal.cleanedValue,
      });
    } else {
      const result = addMaster({
        ...formData,
        name: formData.name.trim(),
        phone: phoneVal.cleanedValue,
      });
      if (result && result.success === false) {
        setAlertModal({
          isOpen: true,
          title: 'Validation Error',
          message: result.error,
          type: 'error',
        });
        return;
      }
    }

    handleClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {isEditing ? 'Edit Master Lead' : 'Add New Master'}
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
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Master Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

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
                  className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Specialization
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pattern, Cutting"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Experience
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8 Years"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Login Password
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
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
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
                        <span>Copy Password</span>
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
                  className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                <Info className="w-3 h-3 text-indigo-500 shrink-0" />
                <span>Actual worker password stored in database (plain text for admin access).</span>
              </p>
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
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all cursor-pointer active:scale-95"
              >
                {isEditing ? 'Save Changes' : 'Save Master'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        buttonText="Okay, Got it"
      />
    </>
  );
}
