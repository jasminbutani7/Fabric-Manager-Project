import React, { useState } from 'react';
import {
  X,
  Printer,
  CreditCard,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Layers,
  Truck,
  Trash2,
  Receipt,
  Download,
  Loader2,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useFinance } from '../../context/useManagement';
import RecordInvoicePaymentModal from './RecordInvoicePaymentModal';
import ThermalReceipt from '../common/ThermalReceipt';
import { downloadA4Pdf, downloadThermalPdf, triggerCleanPrint } from '../../utils/pdfExport';

const formatCurrency = (val) => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? '0' : num.toLocaleString('en-IN');
};

export default function InvoiceDetailsModal({
  isOpen,
  onClose,
  invoice,
  onRecordPaymentSuccess = null,
  onDelete = null,
}) {
  const { currentUser } = useAuth();
  const { invoices = [] } = useFinance();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [viewMode, setViewMode] = useState('standard'); // 'standard' | 'thermal'
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [paymentOverride, setPaymentOverride] = useState(null);

  if (!isOpen || !invoice) return null;

  // Auto-sync with live finance context or invoice prop
  const liveInvoice = invoice?.id ? invoices.find((inv) => inv.id === invoice.id) : null;
  const effectiveInvoice =
    (paymentOverride?.id === invoice?.id ? paymentOverride : null) ||
    liveInvoice ||
    invoice;

  const todayStr = new Date().toISOString().split('T')[0];
  const totalAmount = parseFloat(effectiveInvoice.totalAmount) || 0;
  const paidAmount = parseFloat(effectiveInvoice.paidAmount) || 0;
  const pendingAmount =
    effectiveInvoice.pendingAmount !== undefined && effectiveInvoice.pendingAmount !== null
      ? parseFloat(effectiveInvoice.pendingAmount)
      : Math.max(0, totalAmount - paidAmount);
  const subtotal =
    effectiveInvoice.subtotal !== undefined && effectiveInvoice.subtotal !== null
      ? parseFloat(effectiveInvoice.subtotal)
      : totalAmount;
  const discount = parseFloat(effectiveInvoice.discount) || 0;
  const taxAmount = parseFloat(effectiveInvoice.taxAmount) || 0;
  const isOverdue =
    effectiveInvoice.dueDate && effectiveInvoice.dueDate < todayStr && pendingAmount > 0;

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      if (viewMode === 'thermal') {
        const receiptNo = effectiveInvoice.invoiceNumber || effectiveInvoice.id || 'receipt';
        await downloadThermalPdf('printable-thermal-receipt', `ThermalReceipt_${receiptNo}.pdf`);
      } else {
        const invNo = effectiveInvoice.invoiceNumber || effectiveInvoice.id || 'invoice';
        await downloadA4Pdf('printable-invoice', `Invoice_${invNo}.pdf`);
      }
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = (mode = viewMode) => {
    triggerCleanPrint(
      mode === 'thermal' ? 'printable-thermal-receipt' : 'printable-invoice',
      mode === 'thermal' ? 'thermal' : 'invoice'
    );
  };

  const supplierName = effectiveInvoice.supplierName || effectiveInvoice.clientName || 'Supplier';
  const supplierPhone = effectiveInvoice.supplierPhone || effectiveInvoice.clientPhone || '';

  const handleWhatsAppReminder = () => {
    const text = `Hello ${supplierName},\n\nThis is a polite reminder from ${
      currentUser?.companyName || 'Fabric Manager'
    } regarding Fabric Invoice *#${effectiveInvoice.invoiceNumber || 'INV'}* for ${
      effectiveInvoice.fabricType ? `*${effectiveInvoice.fabricType}* ` : ''
    }(₹${formatCurrency(totalAmount)}).\n\nPending Balance Due: *₹${formatCurrency(
      pendingAmount
    )}*\nDue Date: ${effectiveInvoice.dueDate || 'Immediate'}\n\nPlease settle the balance via UPI or bank transfer at your earliest convenience.\n\nThank you!`;
    const cleanPhone = supplierPhone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = () => {
    if (effectiveInvoice.status === 'Paid' || (totalAmount > 0 && pendingAmount <= 0)) {
      return (
        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-extrabold rounded-full border border-emerald-300 flex items-center gap-1 shrink-0">
          <CheckCircle2 className="w-3 h-3" />
          <span>PAID FULLY</span>
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] sm:text-xs font-extrabold rounded-full border border-rose-300 flex items-center gap-1 shrink-0">
          <AlertTriangle className="w-3 h-3" />
          <span>OVERDUE (₹{formatCurrency(pendingAmount)})</span>
        </span>
      );
    }
    if (effectiveInvoice.status === 'Partial' || (paidAmount > 0 && pendingAmount > 0)) {
      return (
        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] sm:text-xs font-extrabold rounded-full border border-amber-300 flex items-center gap-1 shrink-0">
          <span>PARTIAL (₹{formatCurrency(pendingAmount)})</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] sm:text-xs font-extrabold rounded-full border border-blue-300 flex items-center gap-1 shrink-0">
        <span>PENDING (₹{formatCurrency(pendingAmount)})</span>
      </span>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
          {/* Top Header Bar - Clean Single Row with Format Switcher & Close (hidden on print) */}
          <div className="p-2.5 sm:p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                  #{effectiveInvoice.invoiceNumber || 'INV'}
                </span>
                {getStatusBadge()}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* View Mode Toggle: Standard A4 vs 80mm Thermal */}
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-[10px] sm:text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('standard')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'standard'
                      ? 'bg-white text-indigo-700 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Standard A4
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('thermal')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'thermal'
                      ? 'bg-white text-indigo-700 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="hidden xs:inline">80mm Thermal</span>
                  <span className="xs:hidden">Thermal</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {viewMode === 'thermal' ? (
            /* 80mm Thermal Receipt View */
            <div className="p-4 sm:p-6 bg-slate-100/80 flex-1 overflow-y-auto flex justify-center items-start">
              <ThermalReceipt invoice={effectiveInvoice} currentUser={currentUser} />
            </div>
          ) : (
            /* Printable Standard Invoice Sheet */
            <div id="printable-invoice" className="p-4 sm:p-8 space-y-5 overflow-y-auto text-left print:p-0 print:space-y-3.5 print:overflow-visible flex-1">
            {/* Header: Company & Invoice Stamp */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                  {currentUser?.companyName || 'FABRIC FACTORY'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Textile Manufacturing, Cutting & Stitching Unit
                </p>
                {currentUser?.phone && (
                  <p className="text-[11px] text-slate-400">Phone: {currentUser.phone}</p>
                )}
                <p className="text-[11px] text-slate-400">Admin: {currentUser?.name || 'Factory Admin'}</p>
              </div>

              <div className="text-right space-y-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 block">
                  TAX INVOICE
                </span>
                <p className="text-sm sm:text-lg font-extrabold text-indigo-700">
                  {effectiveInvoice.invoiceNumber}
                </p>
                <div className="mt-1">{getStatusBadge()}</div>
              </div>
            </div>

            {/* Bill To & Invoice Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Truck className="w-3 h-3 text-emerald-600" />
                  <span>Supplier (from Fabric)</span>
                </span>
                <p className="font-extrabold text-sm text-slate-900">{effectiveInvoice.supplierName || effectiveInvoice.clientName}</p>
                {effectiveInvoice.fabricType && (
                  <p className="font-semibold text-indigo-700 text-[11px] flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-500" />
                    <span>Fabric: {effectiveInvoice.fabricType} ({effectiveInvoice.fabricColor || 'Standard'})</span>
                  </p>
                )}
                {(effectiveInvoice.supplierPhone || effectiveInvoice.clientPhone) && (
                  <p className="text-slate-600 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{effectiveInvoice.supplierPhone || effectiveInvoice.clientPhone}</span>
                  </p>
                )}
                {effectiveInvoice.clientGst && (
                  <p className="text-slate-500 font-mono text-[11px]">GSTIN: {effectiveInvoice.clientGst}</p>
                )}
                {effectiveInvoice.clientAddress && (
                  <p className="text-slate-500 mt-1">{effectiveInvoice.clientAddress}</p>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Invoice Timeline
                </span>
                <div className="flex items-center justify-end gap-1.5 text-xs text-slate-700">
                  <span className="text-slate-400">Invoice Date:</span>
                  <strong>{effectiveInvoice.date}</strong>
                </div>
                {effectiveInvoice.dueDate && (
                  <div className="flex items-center justify-end gap-1.5 text-xs text-slate-700">
                    <span className="text-slate-400">Payment Due:</span>
                    <strong className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                      {effectiveInvoice.dueDate}
                    </strong>
                  </div>
                )}
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Remaining Balance Due
                  </span>
                  <p className="text-sm font-black text-rose-600">
                    ₹{formatCurrency(pendingAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                    <th className="py-2.5 px-2">#</th>
                    <th className="py-2.5 px-2">Description / Fabric Lot</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-2 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(effectiveInvoice.items || []).map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-2 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-2">
                        <span className="font-bold text-slate-900 block">{it.description}</span>
                        {it.fabricName && (
                          <span className="text-[10px] text-indigo-600 block">
                            Lot: {it.fabricName}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-800">
                        {it.quantity}
                        {it.unit ? (
                          <span className="text-[10px] text-slate-500 font-normal ml-1">
                            {it.unit}
                          </span>
                        ) : ''}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-600">
                        ₹{formatCurrency(it.unitPrice)}
                        {it.unit ? (
                          <span className="text-[9px] text-slate-400 block font-normal leading-tight">
                            /{it.unit.toLowerCase().replace(/s$/, '')}
                          </span>
                        ) : ''}
                      </td>
                      <td className="py-2.5 px-2 text-right font-extrabold text-slate-900">
                        ₹{formatCurrency(it.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div className="flex justify-end pt-2 border-t border-slate-200">
              <div className="w-full sm:w-64 space-y-1.5 text-xs text-right">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-900">
                    ₹{formatCurrency(subtotal)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Discount:</span>
                    <span className="text-emerald-700">-₹{formatCurrency(discount)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>GST ({effectiveInvoice.taxPercent || 0}%):</span>
                    <span>+₹{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-300">
                  <span>Grand Total:</span>
                  <span className="text-indigo-700">₹{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-700 font-bold pt-1">
                  <span>Total Paid:</span>
                  <span>₹{formatCurrency(paidAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-extrabold text-rose-600 pt-1">
                  <span>Balance Due:</span>
                  <span>₹{formatCurrency(pendingAmount)}</span>
                </div>
              </div>
            </div>

            {/* Payments Ledger History */}
            {effectiveInvoice.payments && effectiveInvoice.payments.length > 0 && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Collections History ({effectiveInvoice.payments.length} Payments)</span>
                </span>
                <div className="space-y-1.5 text-xs">
                  {effectiveInvoice.payments.map((p, i) => (
                    <div
                      key={p.id || i}
                      className="p-2 bg-white rounded-xl border border-slate-100 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-emerald-800">
                            +₹{formatCurrency(p.amount)}
                          </strong>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                            {p.method}
                          </span>
                        </div>
                        {p.referenceNo && (
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                            Ref: {p.referenceNo}
                          </span>
                        )}
                        {p.notes && (
                          <span className="text-[11px] text-slate-500 italic block">{p.notes}</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">{p.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terms & Notes */}
            {effectiveInvoice.notes && (
              <div className="p-3 bg-slate-50 rounded-2xl text-[11px] text-slate-600 border border-slate-100">
                <strong className="text-slate-800 block mb-0.5 font-bold uppercase tracking-wider text-[10px]">
                  Terms & Conditions:
                </strong>
                {effectiveInvoice.notes}
              </div>
            )}

            {/* Signature Stamp Footer */}
            <div className="pt-6 print:pt-3 border-t border-slate-200 flex items-end justify-between text-xs text-slate-500">
              <div>
                <p className="text-[10px] text-slate-400">Generated on Fabric Manager</p>
                <p className="text-[10px] text-slate-400">{effectiveInvoice.createdAt ? new Date(effectiveInvoice.createdAt).toLocaleString() : todayStr}</p>
              </div>
              <div className="text-right">
                <div className="w-32 h-10 border-b border-slate-300 mx-auto mb-1"></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase block">
                  Authorized Signatory
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Bottom Actions Footer - Perfectly formatted for Mobile & Laptop */}
        <div className="p-2.5 sm:p-3 border-t border-slate-200/80 bg-white/95 backdrop-blur-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 print:hidden shrink-0 shadow-lg">
          {/* Quick Actions Group: PDF, Print, WhatsApp, Delete */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-0.5 sm:pb-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              title="Download PDF"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrint()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>

            {supplierPhone && pendingAmount > 0 && (
              <button
                type="button"
                onClick={handleWhatsAppReminder}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                title="Send WhatsApp Reminder"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(effectiveInvoice)}
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shrink-0"
                title="Delete Invoice"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Primary Action: Record Payment or Close */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {pendingAmount > 0 ? (
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Record Payment</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold active:scale-95 transition-all cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Record Payment Sub-modal with Auto-sync */}
      <RecordInvoicePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={effectiveInvoice}
        onSuccess={(updated) => {
          setPaymentOverride(updated);
          if (onRecordPaymentSuccess) onRecordPaymentSuccess(updated);
          setShowPaymentModal(false);
        }}
      />
    </>
  );
}
