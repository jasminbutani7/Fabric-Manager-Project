import React, { useState } from 'react';
import {
  X,
  Truck,
  Building2,
  User,
  Phone,
  MessageSquare,
  MapPin,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useFactory } from '../../context/useManagement';
import { sanitizeMobileNumber, validateMobileNumber } from '../../utils/formValidation';
import AlertModal from './AlertModal';

const CATEGORY_PRESETS = [
  'Fabric / Cloth',
  'Sewing Threads',
  'Buttons & Zippers',
  'Interlining & Elastic',
  'Packaging & Bags',
  'Machine Spares & Oil',
  'Other / Custom',
];


export default function AddSupplierModal({ isOpen, onClose, supplierToEdit = null }) {
  const { addSupplier, updateSupplier } = useFactory();

  const isEditing = Boolean(supplierToEdit);
  const isPresetCategory = supplierToEdit ? CATEGORY_PRESETS.includes(supplierToEdit.category) : true;

  const [formData, setFormData] = useState(() => {
    if (supplierToEdit) {
      return {
        name: supplierToEdit.name || '',
        contactPerson: supplierToEdit.contactPerson || '',
        phone: supplierToEdit.phone || '',
        whatsapp: supplierToEdit.whatsapp || '',
        category: isPresetCategory ? supplierToEdit.category : 'Other / Custom',
        customCategory: isPresetCategory ? '' : (supplierToEdit.category || ''),
        address: supplierToEdit.address || '',
        gstNumber: supplierToEdit.gstNumber || '',
        paymentTerms: supplierToEdit.paymentTerms || '30 Days Credit',
        notes: supplierToEdit.notes || '',
      };
    }
    return {
      name: '',
      contactPerson: '',
      phone: '',
      whatsapp: '',
      category: 'Fabric / Cloth',
      customCategory: '',
      address: '',
      gstNumber: '',
      paymentTerms: '30 Days Credit',
      notes: '',
    };
  });

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
  });

  if (!isOpen) return null;

  const handleClose = () => {
    setAlertModal({
      isOpen: false,
      title: '',
      message: '',
      type: 'warning',
    });
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      whatsapp: '',
      category: 'Fabric / Cloth',
      customCategory: '',
      address: '',
      gstNumber: '',
      paymentTerms: '30 Days Credit',
      notes: '',
    });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Supplier Name Required',
        message: 'Please enter the Supplier / Firm Name (e.g. Shreeji Fabrics).',
        type: 'warning',
      });
      return;
    }

    if (!formData.contactPerson.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Contact Person Name Required',
        message: 'Please enter the Contact Person Name (e.g. Owner, Manager, or Sales Agent).',
        type: 'warning',
      });
      return;
    }

    const phoneVal = validateMobileNumber(formData.phone, { fieldName: 'Supplier mobile number' });
    if (!phoneVal.isValid) {
      setAlertModal({
        isOpen: true,
        title: 'Invalid Mobile Number',
        message: phoneVal.error,
        type: 'warning',
      });
      return;
    }

    let cleanWhatsapp = '';
    if (formData.whatsapp && formData.whatsapp.trim()) {
      const waVal = validateMobileNumber(formData.whatsapp, { fieldName: 'WhatsApp number', required: false });
      if (!waVal.isValid) {
        setAlertModal({
          isOpen: true,
          title: 'Invalid WhatsApp Number',
          message: waVal.error,
          type: 'warning',
        });
        return;
      }
      cleanWhatsapp = waVal.cleanedValue;
    }

    const resolvedCategory =
      formData.category === 'Other / Custom'
        ? formData.customCategory.trim() || 'Other / General'
        : formData.category;

    const payload = {
      name: formData.name.trim(),
      contactPerson: formData.contactPerson.trim(),
      phone: phoneVal.cleanedValue,
      whatsapp: cleanWhatsapp,
      category: resolvedCategory,
      address: formData.address.trim(),
      gstNumber: formData.gstNumber.trim().toUpperCase(),
      paymentTerms: formData.paymentTerms,
      notes: formData.notes.trim(),
    };

    let result;
    if (isEditing) {
      result = updateSupplier(supplierToEdit.id, payload);
    } else {
      result = addSupplier(payload);
    }

    if (result && result.success === false) {
      setAlertModal({
        isOpen: true,
        title: 'Duplicate or Invalid Entry',
        message: result.error,
        type: 'error',
      });
      return;
    }

    handleClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
        <div
          className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95"
          role="dialog"
          aria-modal="true"
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  {isEditing ? 'Edit Supplier Contact' : 'Add New Supplier'}
                </h3>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-left">
            {/* Firm / Business Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Supplier / Firm Name *</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                required
              />
            </div>

            {/* Contact Person Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Contact Person Name *</span>
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                required
              />
            </div>

            {/* Phone & WhatsApp Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Primary Mobile *</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit primary mobile"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: sanitizeMobileNumber(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>WhatsApp / Alt Phone</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit WhatsApp (optional)"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: sanitizeMobileNumber(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
            </div>

            {/* Market / City / Address */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Market / Shop / City Address</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            {/* GST Number */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                <span>GSTIN / Tax Number (Optional)</span>
              </label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                maxLength={15}
              />
            </div>

            {/* Notes / Remarks */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Notes & Remarks (Optional)</span>
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal resize-none"
              ></textarea>
            </div>
          </form>

          {/* Modal Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-xs font-bold text-white shadow-md shadow-blue-200 transition-all flex items-center gap-1.5"
            >
              <Truck className="w-4 h-4" />
              <span>{isEditing ? 'Save Changes' : 'Save Supplier Contact'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Validation Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </>
  );
}
