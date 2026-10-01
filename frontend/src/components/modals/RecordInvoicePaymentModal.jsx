import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Calendar,
  FileText,
  CheckCircle2,
  Hash,
  IndianRupee,
} from 'lucide-react';
import { useFinance } from '../../context/useManagement';
import AlertModal from './AlertModal';
import { sanitizeDecimal, blockInvalidNumberKeys } from '../../utils/formValidation';
import CustomSelect from '../common/CustomSelect';

const PAYMENT_METHODS = [
  'Cash',
  'UPI / GPay',
  'Bank Transfer / NEFT',
  'Cheque',
];

export default function RecordInvoicePaymentModal({
  isOpen,
  onClose,
  invoice,
  onSuccess = null,
}) {
  const { recordInvoicePayment } = useFinance();
  const todayStr = new Date().toISOString().split('T')[0];

  const total = invoice ? parseFloat(invoice.totalAmount) || 0 : 0;
  const paid = invoice ? parseFloat(invoice.paidAmount) || 0 : 0;
  const pending = invoice ? parseFloat(invoice.pendingAmount) || 0 : 0;

  const [formData, setFormData] = useState({
    amount: pending > 0 ? String(pending) : '',
    date: todayStr,
    method: 'UPI / GPay',
    referenceNo: '',
    notes: '',
  });

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
  });

  if (!isOpen || !invoice) return null;

  const handleFillFull = () => {
    setFormData((prev) => ({ ...prev, amount: String(pending) }));
  };

  const handleFillHalf = () => {
    setFormData((prev) => ({ ...prev, amount: String(Math.round(pending / 2)) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const amt = parseFloat(formData.amount);
    if (!amt || amt <= 0) {
      setAlertModal({
        isOpen: true,
        title: 'Valid Amount Required',
        message: 'Please enter a valid collection amount in ₹.',
        type: 'warning',
      });
      return;
    }

    if (amt > pending) {
      setAlertModal({
        isOpen: true,
        title: 'Amount Exceeds Pending Balance',
        message: `The entered payment (₹${amt}) exceeds the remaining pending balance of ₹${pending}.`,
        type: 'warning',
      });
      return;
    }

    const result = recordInvoicePayment(invoice.id, {
      amount: amt,
      date: formData.date,
      method: formData.method,
      referenceNo: formData.referenceNo,
      notes: formData.notes,
    });

    if (result.success) {
      if (onSuccess) onSuccess(result.invoice);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 text-left">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
                  Record Payment Collection
                </h2>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  #{invoice.invoiceNumber} • {invoice.supplierName || invoice.clientName}
                  {invoice.fabricType ? ` (${invoice.fabricType})` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0 text-left">
            <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1">
              {/* Invoice Balance Summary Banner */}
              <div className="p-2.5 sm:p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block leading-tight">Total Bill</span>
                  <span className="text-xs font-black text-slate-800 leading-tight">₹{total.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-x border-slate-200/70">
                  <span className="text-[9px] text-emerald-600 font-bold uppercase block leading-tight">Paid So Far</span>
                  <span className="text-xs font-black text-emerald-700 leading-tight">₹{paid.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[9px] text-rose-600 font-bold uppercase block leading-tight">Remaining Due</span>
                  <span className="text-xs font-black text-rose-700 leading-tight">₹{pending.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Payment Amount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Collected Amount (₹) *</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleFillHalf}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={handleFillFull}
                      className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-black transition-all active:scale-95 cursor-pointer"
                    >
                      Full Balance
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max={pending}
                    placeholder="0.00"
                    value={formData.amount}
                    onWheel={(e) => e.target.blur()}
                    onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: true })}
                    onChange={(e) => {
                      const sanitized = sanitizeDecimal(e.target.value, { min: 0, max: pending, maxDecimals: 2 });
                      setFormData({ ...formData, amount: sanitized });
                    }}
                    className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200/90 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Payment Date & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Received Date *</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    <span>Payment Method *</span>
                  </label>
                  <CustomSelect
                    value={formData.method}
                    onChange={(val) => setFormData({ ...formData, method: val })}
                    options={PAYMENT_METHODS.map((m) => ({
                      value: m,
                      label: m,
                    }))}
                    placeholder="Select Method"
                    theme="emerald"
                  />
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  <span>UPI Ref / Transaction ID / Cheque No. (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI-2093847291 or Chq #002341"
                  value={formData.referenceNo}
                  onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Payment Remarks (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received via PhonePe from Ramesh Bhai"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                />
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
                disabled={!formData.amount || parseFloat(formData.amount) <= 0}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Confirm Payment (₹{parseFloat(formData.amount || 0).toLocaleString('en-IN')})
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

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
