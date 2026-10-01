import React, { useState } from 'react';
import { X, HeartHandshake, Phone, User, UserCheck, Briefcase, DollarSign } from 'lucide-react';
import { useFactory } from '../../context/useManagement';
import { sanitizeMobileNumber, validateMobileNumber } from '../../utils/formValidation';
import AlertModal from './AlertModal';
import CustomSelect from '../common/CustomSelect';

export default function AddHelperModal({ isOpen, onClose, helperToEdit = null }) {
  const { addHelper, updateHelper, masters } = useFactory();
  const isEditing = Boolean(helperToEdit);

  const activeMasters = masters.filter((m) => m.status !== 'Left');

  const [formData, setFormData] = useState(() => {
    if (helperToEdit) {
      const cat =
        helperToEdit.helperCategory ||
        (helperToEdit.wageType === 'Piece Rate'
          ? 'external'
          : helperToEdit.assignedMasterId
            ? 'master_assigned'
            : 'internal');
      return {
        name: helperToEdit.name || '',
        phone: helperToEdit.phone || '',
        helperCategory: cat,
        assignedMasterId: helperToEdit.assignedMasterId || activeMasters[0]?.id || '',
        workType: helperToEdit.workType || 'Thread Trimming & General Chores',
        wageType: helperToEdit.wageType || (cat === 'external' ? 'Piece Rate' : 'Monthly Fixed'),
        defaultRatePerPSC: helperToEdit.defaultRatePerPSC || helperToEdit.defaultRatePerPiece || 2.5,
        notes: helperToEdit.notes || '',
      };
    }
    return {
      name: '',
      phone: '',
      helperCategory: 'internal', // 'internal' | 'external' | 'master_assigned'
      assignedMasterId: activeMasters[0]?.id || '',
      workType: 'Thread Trimming & General Chores',
      wageType: 'Monthly Fixed',
      defaultRatePerPSC: 2.5,
      notes: '',
    };
  });

  const [prevEditId, setPrevEditId] = useState(helperToEdit?.id || null);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen || (helperToEdit && helperToEdit.id !== prevEditId)) {
    setPrevIsOpen(isOpen);
    setPrevEditId(helperToEdit?.id || null);
    if (helperToEdit) {
      const cat =
        helperToEdit.helperCategory ||
        (helperToEdit.wageType === 'Piece Rate'
          ? 'external'
          : helperToEdit.assignedMasterId
            ? 'master_assigned'
            : 'internal');
      setFormData({
        name: helperToEdit.name || '',
        phone: helperToEdit.phone || '',
        helperCategory: cat,
        assignedMasterId: helperToEdit.assignedMasterId || activeMasters[0]?.id || '',
        workType: helperToEdit.workType || 'Thread Trimming & General Chores',
        wageType: helperToEdit.wageType || (cat === 'external' ? 'Piece Rate' : 'Monthly Fixed'),
        defaultRatePerPSC: helperToEdit.defaultRatePerPSC || helperToEdit.defaultRatePerPiece || 2.5,
        notes: helperToEdit.notes || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        helperCategory: 'internal',
        assignedMasterId: activeMasters[0]?.id || '',
        workType: 'Thread Trimming & General Chores',
        wageType: 'Monthly Fixed',
        defaultRatePerPSC: 2.5,
        notes: '',
      });
    }
  }

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

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
      helperCategory: 'internal',
      assignedMasterId: activeMasters[0]?.id || '',
      workType: 'Thread Trimming & General Chores',
      wageType: 'Monthly Fixed',
      defaultRatePerPSC: 2.5,
      notes: '',
    });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Helper Name Required',
        message: 'Please enter the Helper’s full name.',
        type: 'warning',
      });
      return;
    }

    if (!formData.phone.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Mobile Number Required',
        message: 'Please enter the mobile phone number for this helper.',
        type: 'warning',
      });
      return;
    }

    const phoneVal = validateMobileNumber(formData.phone, { fieldName: 'Helper mobile number' });
    if (!phoneVal.isValid) {
      setAlertModal({
        isOpen: true,
        title: 'Invalid Mobile Number',
        message: phoneVal.error,
        type: 'warning',
      });
      return;
    }

    if (formData.helperCategory === 'master_assigned' && !formData.assignedMasterId) {
      setAlertModal({
        isOpen: true,
        title: 'Master Selection Required',
        message: 'Please select a Master to assign this helper to, or choose "Other Helper".',
        type: 'warning',
      });
      return;
    }

    if (
      formData.helperCategory === 'external' &&
      (!formData.defaultRatePerPSC || parseFloat(formData.defaultRatePerPSC) <= 0)
    ) {
      setAlertModal({
        isOpen: true,
        title: 'Valid Price per PSC Required',
        message: 'Please enter a valid price per PSC for this external helper.',
        type: 'warning',
      });
      return;
    }

    const payload = {
      ...formData,
      name: formData.name.trim(),
      phone: phoneVal.cleanedValue,
      helperType: formData.helperCategory === 'master_assigned' ? 'master_assigned' : 'general',
      assignedMasterId: formData.helperCategory === 'master_assigned' ? formData.assignedMasterId : null,
      wageType:
        formData.helperCategory === 'external'
          ? 'Piece Rate'
          : formData.helperCategory === 'internal'
            ? 'Monthly Fixed'
            : formData.wageType,
      defaultRatePerPSC:
        formData.helperCategory === 'external' ? parseFloat(formData.defaultRatePerPSC) || 0 : 0,
    };

    if (isEditing) {
      updateHelper(helperToEdit.id, payload);
    } else {
      const result = addHelper(payload);
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
          <div className="px-5 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <HeartHandshake className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {isEditing ? 'Edit Helper Details' : 'Add New Helper'}
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


            {/* Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Helper Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
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
                    className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Work Allocation Type Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Helper Classification & Role *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Other Helper (Internal) */}
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      helperCategory: 'internal',
                      assignedMasterId: '',
                      workType: 'Thread Trimming & General Chores',
                      wageType: 'Monthly Fixed',
                      defaultRatePerPSC: 0,
                    })
                  }
                  className={`p-3 rounded-2xl border text-left transition-all ${formData.helperCategory === 'internal'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase
                      className={`w-4 h-4 ${formData.helperCategory === 'internal' ? 'text-amber-600' : 'text-slate-500'
                        }`}
                    />
                    <span className="text-xs font-bold text-slate-900">Other Helper</span>
                  </div>
                </button>

                {/* 2. External Helper (Price by PSC) */}
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      helperCategory: 'external',
                      assignedMasterId: '',
                      workType: 'Thread Cutting (Piece Rate)',
                      wageType: 'Piece Rate',
                      defaultRatePerPSC: formData.defaultRatePerPSC || 2.5,
                    })
                  }
                  className={`p-3 rounded-2xl border text-left transition-all ${formData.helperCategory === 'external'
                    ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign
                      className={`w-4 h-4 ${formData.helperCategory === 'external' ? 'text-indigo-600' : 'text-slate-500'
                        }`}
                    />
                    <span className="text-xs font-bold text-slate-900">External Helper</span>
                  </div>
                </button>

                {/* 3. Assign to Master */}
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      helperCategory: 'master_assigned',
                      assignedMasterId: formData.assignedMasterId || activeMasters[0]?.id || '',
                      workType: 'Cutting Table Assistant',
                      wageType: 'Daily Wage',
                      defaultRatePerPSC: 0,
                    })
                  }
                  className={`p-3 rounded-2xl border text-left transition-all ${formData.helperCategory === 'master_assigned'
                    ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <UserCheck
                      className={`w-4 h-4 ${formData.helperCategory === 'master_assigned' ? 'text-purple-600' : 'text-slate-500'
                        }`}
                    />
                    <span className="text-xs font-bold text-slate-900">Master Assistant</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Conditional Fields based on Helper Category */}
            {formData.helperCategory === 'master_assigned' && (
              <div className="space-y-3 p-3.5 bg-purple-50/40 border border-purple-200/60 rounded-2xl animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Master *
                  </label>
                  {activeMasters.length === 0 ? (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                      No active masters registered yet. Please create a Master in Setup first or choose "Other Helper".
                    </div>
                  ) : (
                    <CustomSelect
                      value={formData.assignedMasterId}
                      onChange={(val) => setFormData({ ...formData, assignedMasterId: val })}
                      options={activeMasters.map((m) => ({
                        value: m.id,
                        badge: 'MASTER',
                        label: m.name,
                        subLabel: m.phone ? `Phone: ${m.phone}` : null,
                      }))}
                      placeholder="-- Select Master --"
                      theme="purple"
                    />
                  )}
                </div>
              </div>
            )}

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
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-100 transition-all cursor-pointer active:scale-95"
              >
                {isEditing ? 'Save Changes' : 'Add Helper'}
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
