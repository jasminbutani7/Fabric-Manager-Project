import React, { useState } from 'react';
import { X, Cog } from 'lucide-react';
import { useFactory } from '../../context/useManagement';
import AlertModal from './AlertModal';

export default function AddMachineModal({
  isOpen,
  onClose,
  machineToEdit = null,
  onSuccess = null,
}) {
  const { addMachine, updateMachine, machines = [] } = useFactory();
  const isEditing = Boolean(machineToEdit);

  const [formData, setFormData] = useState(() => {
    if (machineToEdit) {
      return {
        name: machineToEdit.name || '',
        line: machineToEdit.line || '',
        status: machineToEdit.status || 'Active',
        notes: machineToEdit.notes || '',
      };
    }
    return {
      name: '',
      line: '',
      status: 'Active',
      notes: '',
    };
  });

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
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      setAlertModal({
        isOpen: true,
        title: 'Machine Name Required',
        message: 'Please enter the Machine Name before saving.',
        type: 'warning',
      });
      return;
    }

    // Check duplicate Machine Name (ignore current machine if editing)
    const duplicateName = machines.find(
      (m) =>
        m.name.toLowerCase() === trimmedName.toLowerCase() &&
        (!isEditing || m.id !== machineToEdit.id)
    );
    if (duplicateName) {
      setAlertModal({
        isOpen: true,
        title: 'Duplicate Machine Name',
        message: `Machine "${trimmedName}" already exists! Each machine must have a unique name. Please enter a different name.`,
        type: 'error',
      });
      return;
    }

    const payload = {
      name: trimmedName,
      line: (formData.line || '').trim() || 'Block A',
      status: formData.status || 'Active',
      notes: (formData.notes || '').trim(),
    };

    if (isEditing) {
      updateMachine(machineToEdit.id, payload);
    } else {
      const result = addMachine(payload);
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

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-800 to-indigo-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                <Cog className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {isEditing ? `Edit Machine (${machineToEdit.name || machineToEdit.code})` : 'Add New Machine'}
                </h2>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Machine Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Machine Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>



            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notes / Specs (Optional)
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Buttons */}
            <div className="pt-3 border-t border-slate-100 flex gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all active:scale-95"
              >
                {isEditing ? 'Save Changes' : 'Add Machine'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Validation Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        buttonText="Okay, Let Me Change It"
      />
    </>
  );
}
