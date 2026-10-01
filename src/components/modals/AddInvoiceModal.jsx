import React, { useState } from 'react';
import {
  X,
  FileText,
  Truck,
  Layers,
  Plus,
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
  Scissors,
  Package,
  Calculator,
  RefreshCw,
  Building2,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import { useFabric, useFinance, useProduction } from '../../context/useManagement';
import { getFabricInvoiceMetrics, createItemsForFabric } from '../../utils/invoiceMetrics';
import AlertModal from './AlertModal';
import { sanitizeInteger, sanitizeDecimal, blockInvalidNumberKeys } from '../../utils/formValidation';
import { isEntityArchived } from '../../utils/productUtils';
import { getProductStructure } from '../../services/dbMappers';
import { generateEntityId } from '../../utils/idGenerator';
import CustomSelect from '../common/CustomSelect';

export default function AddInvoiceModal({
  isOpen,
  onClose,
  invoiceToEdit = null,
  initialFabricId = null,
  preselectedFabric = null,
  onSuccess = null,
}) {
  const { fabrics = [] } = useFabric();
  const { invoices = [], addInvoice, updateInvoice } = useFinance();
  const { deliveryLogs = [] } = useProduction();
  const isEditing = Boolean(invoiceToEdit);

  const activeFabrics = fabrics.filter((f) => !isEntityArchived(f, fabrics) || f.id === initialFabricId || f.id === invoiceToEdit?.fabricId);

  // Target fabric ID resolving from props
  const defaultFabricId =
    invoiceToEdit?.fabricId ||
    preselectedFabric?.id ||
    initialFabricId ||
    (activeFabrics.length === 1 ? activeFabrics[0].id : '');

  const [selectedFabricId, setSelectedFabricId] = useState(defaultFabricId);

  // Selected Fabric object
  const currentFabric = activeFabrics.find((f) => f.id === selectedFabricId) || preselectedFabric || null;

  // Helper resolving invoice metrics with system context
  const getMetrics = (fabric) => getFabricInvoiceMetrics(fabric, invoices, deliveryLogs, invoiceToEdit?.id);

  // Current fabric invoice metrics
  const currentMetrics = getMetrics(currentFabric);
  const {
    alreadyInvoicedSets,
    remainingFabricSets,
    existingInvoices: existingFabricInvoices,
  } = currentMetrics;

  const initialSetQty = invoiceToEdit
    ? String(invoiceToEdit.setQuantity || invoiceToEdit.items?.[0]?.quantity || '1')
    : currentFabric
      ? String(remainingFabricSets)
      : '0';

  const initialPricePerSet = invoiceToEdit
    ? String(invoiceToEdit.pricePerSet || currentFabric?.pricePerSet || currentFabric?.pricePerPiece || '0')
    : currentFabric
      ? String(currentFabric.pricePerSet || currentFabric.pricePerPiece || '0')
      : '0';

  const [setQuantity, setSetQuantity] = useState(initialSetQty);
  const [pricePerSet, setPricePerSet] = useState(initialPricePerSet);

  const [formData, setFormData] = useState(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const in15Days = new Date();
    in15Days.setDate(in15Days.getDate() + 15);
    const in15DaysStr = in15Days.toISOString().split('T')[0];
    const nextInvNumber = `INV-${new Date().getFullYear()}-${String(
      invoices.length + 1
    ).padStart(3, '0')}`;

    if (invoiceToEdit) {
      return {
        invoiceNumber: invoiceToEdit.invoiceNumber || nextInvNumber,
        fabricId: invoiceToEdit.fabricId || '',
        supplierName: invoiceToEdit.supplierName || invoiceToEdit.clientName || '',
        supplierPhone: invoiceToEdit.supplierPhone || invoiceToEdit.clientPhone || '',
        supplierGst: invoiceToEdit.clientGst || '',
        supplierAddress: invoiceToEdit.clientAddress || '',
        date: invoiceToEdit.date || todayStr,
        dueDate: invoiceToEdit.dueDate || in15DaysStr,
        items: invoiceToEdit.items && invoiceToEdit.items.length > 0
          ? invoiceToEdit.items.map((it) => ({
              id: it.id || 'it_1',
              description: it.description || '',
              quantity: String(it.quantity || '1'),
              unitPrice: String(it.unitPrice || '0'),
              subPartId: it.subPartId || null,
              subPartName: it.subPartName || null,
              isSubPart: Boolean(it.subPartId || it.subPartName),
            }))
          : [
              {
                id: 'it_1',
                description: '',
                quantity: '1',
                unitPrice: '0',
                isSubPart: false,
              },
            ],
        discount: String(invoiceToEdit.discount || '0'),
        taxPercent: String(invoiceToEdit.taxPercent || '5'),
        hasAdvance: false,
        initialPaymentAmount: '',
        initialPaymentMethod: 'UPI / GPay',
        initialPaymentRef: '',
        notes: invoiceToEdit.notes || '',
      };
    }

    // New invoice initialization with current fabric remaining piece breakdown
    const initialItems = createItemsForFabric(
      currentFabric,
      initialSetQty,
      initialPricePerSet,
      currentMetrics.remainingBySubpart
    );

    return {
      invoiceNumber: nextInvNumber,
      fabricId: defaultFabricId,
      supplierName: currentFabric?.supplierName || '',
      supplierPhone: currentFabric?.supplierPhone || '',
      supplierGst: '',
      supplierAddress: '',
      date: todayStr,
      dueDate: currentFabric?.dueDate || in15DaysStr,
      items: initialItems,
      discount: '0',
      taxPercent: '5',
      hasAdvance: false,
      initialPaymentAmount: '',
      initialPaymentMethod: 'UPI / GPay',
      initialPaymentRef: '',
      notes: 'Fabric order invoice. Payment terms as agreed.',
    };
  });

  // Whenever selected Fabric changes in dropdown, auto-populate supplier & item specifications to remaining
  const handleFabricSelect = (newFabricId) => {
    setSelectedFabricId(newFabricId);
    if (!newFabricId) {
      setFormData((prev) => ({ ...prev, fabricId: '' }));
      return;
    }

    const fabric = fabrics.find((f) => f.id === newFabricId);
    if (!fabric) return;

    const newMetrics = getMetrics(fabric);
    const newQty = String(newMetrics.remainingFabricSets);
    const newRate = String(fabric.pricePerSet || fabric.pricePerPiece || '0');
    setSetQuantity(newQty);
    setPricePerSet(newRate);

    const generatedItems = createItemsForFabric(
      fabric,
      newQty,
      newRate,
      newMetrics.remainingBySubpart
    );

    setFormData((prev) => ({
      ...prev,
      fabricId: fabric.id,
      supplierName: fabric.supplierName || 'Direct Vendor',
      supplierPhone: fabric.supplierPhone || '',
      dueDate: fabric.dueDate || prev.dueDate,
      items: generatedItems,
    }));
  };

  // Reset all line items and set quantity back to remaining configuration
  const handleResetToRemaining = () => {
    if (!currentFabric) return;
    const m = getMetrics(currentFabric);
    const qty = String(m.remainingFabricSets);
    setSetQuantity(qty);
    const syncedItems = createItemsForFabric(
      currentFabric,
      qty,
      pricePerSet,
      m.remainingBySubpart
    );
    const customItems = formData.items.filter((it) => it.isCustom);
    setFormData((prev) => ({
      ...prev,
      items: [...syncedItems, ...customItems],
    }));
  };

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
  });

  if (!isOpen) return null;

  // Real-time Calculations
  const subtotal = (formData.items || []).reduce((acc, it) => {
    const q = parseInt(it.quantity, 10) || 0;
    const p = parseFloat(it.unitPrice) || 0;
    return acc + q * p;
  }, 0);

  const discountVal = parseFloat(formData.discount) || 0;
  const taxableAmount = Math.max(0, subtotal - discountVal);
  const taxPct = parseFloat(formData.taxPercent) || 0;
  const taxAmount = Math.round((taxableAmount * taxPct) / 100);
  const grandTotal = taxableAmount + taxAmount;

  const advanceVal = formData.hasAdvance
    ? parseFloat(formData.initialPaymentAmount) || 0
    : 0;
  const pendingBalance = Math.max(0, grandTotal - advanceVal);

  const struct = currentFabric ? getProductStructure(currentFabric) : null;
  const subParts = struct?.subParts || [];
  const hasSubParts = subParts.length > 1;
  const numSubParts = hasSubParts ? subParts.length : 1;
  const numericSetPrice = parseFloat(pricePerSet) || 0;
  const calculatedPieceRate = Math.round((numericSetPrice / numSubParts) * 100) / 100;

  // Auto-calculated complete sets & extra loose pieces across all subparts
  const subPartItems = (formData.items || []).filter((it) => it.isSubPart);
  const minCompleteSets = subPartItems.length > 0
    ? Math.min(...subPartItems.map((it) => parseInt(it.quantity, 10) || 0))
    : (parseInt(setQuantity, 10) || 0);

  const extraPieces = subPartItems
    .map((it) => {
      const q = parseInt(it.quantity, 10) || 0;
      const diff = q - minCompleteSets;
      if (diff > 0) {
        const label = it.subPartName || (it.description ? it.description.split('-').pop().trim() : 'PC');
        return {
          id: it.id,
          name: label,
          count: diff,
          rate: parseFloat(it.unitPrice) || calculatedPieceRate,
        };
      }
      return null;
    })
    .filter(Boolean);

  const hasExtraPieces = extraPieces.length > 0;

  // Check if any subpart quantity exceeds remaining available lot pieces
  const exceededItems = subPartItems.filter((it) => {
    if (it.isCustom) return false;
    const itemSpKey = it.subPartId || it.subPartName;
    const maxAllowed = itemSpKey && currentMetrics.remainingBySubpart && currentMetrics.remainingBySubpart[itemSpKey] !== undefined
      ? currentMetrics.remainingBySubpart[itemSpKey]
      : currentMetrics.remainingFabricSets;
    if (maxAllowed === undefined || maxAllowed === null) return false;
    const q = parseInt(it.quantity, 10) || 0;
    return q > maxAllowed;
  });
  const anyItemExceeded = exceededItems.length > 0;

  // Derived complete sets count for display: reflects minimum matching subparts
  const displaySetQuantity = hasSubParts && subPartItems.length > 0 ? String(minCompleteSets) : setQuantity;

  // Set-level quantity change: updates setQuantity and syncs all subpart rows to this count
  const handleSetQuantityChange = (val) => {
    const sanitized = sanitizeInteger(val, { min: 1, max: 100000 });
    setSetQuantity(sanitized);

    if (sanitized) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((it) => {
          if (it.isSubPart || (prev.items.length === 1 && !it.isCustom)) {
            return { ...it, quantity: sanitized };
          }
          return it;
        }),
      }));
    }
  };

  // Set-level price change: divides set price across subparts and syncs unitPrice
  const handleSetPriceChange = (val) => {
    const sanitized = sanitizeDecimal(val, { min: 0, max: 1000000, maxDecimals: 2 });
    setPricePerSet(sanitized);

    const numericPrice = parseFloat(sanitized) || 0;
    const splitRate = Math.round((numericPrice / numSubParts) * 100) / 100;

    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((it) => {
        if (it.isSubPart) {
          return { ...it, unitPrice: String(splitRate) };
        }
        if (prev.items.length === 1 && !it.isCustom) {
          return { ...it, unitPrice: sanitized };
        }
        return it;
      }),
    }));
  };

  // Re-sync all subpart rows back to base set configuration
  const handleSyncItemsToSets = () => {
    if (!currentFabric) return;
    const syncedItems = createItemsForFabric(currentFabric, setQuantity, pricePerSet);
    const customItems = formData.items.filter((it) => it.isCustom);
    setFormData((prev) => ({
      ...prev,
      items: [...syncedItems, ...customItems],
    }));
  };

  // Form Handlers: When user modifies individual piece quantities, auto-calculate complete sets
  const handleItemChange = (index, field, value) => {
    let sanitized = value;
    if (field === 'quantity') {
      sanitized = sanitizeInteger(value, { min: 1, max: 100000 });
    } else if (field === 'unitPrice') {
      sanitized = sanitizeDecimal(value, { min: 0, max: 1000000, maxDecimals: 2 });
    }

    const updated = formData.items.map((it, idx) => (idx === index ? { ...it, [field]: sanitized } : it));
    setFormData((prev) => ({ ...prev, items: updated }));

    // When piece quantity changes, automatically calculate complete sets and sync setQuantity
    if (field === 'quantity') {
      const subPartsList = updated.filter((it) => it.isSubPart);
      if (subPartsList.length > 0) {
        const validQtys = subPartsList
          .map((it) => parseInt(it.quantity, 10))
          .filter((n) => !isNaN(n) && n > 0);
        if (validQtys.length > 0) {
          const minSets = Math.min(...validQtys);
          setSetQuantity(String(minSets));
        }
      }
    }
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: generateEntityId('it'),
          description: currentFabric ? `${currentFabric.fabricType} Additional Item` : 'Additional Item',
          quantity: '1',
          unitPrice: '0',
          isCustom: true,
          isSubPart: false,
        },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) {
      setAlertModal({
        isOpen: true,
        title: 'Item Required',
        message: 'Invoice must contain at least one fabric item.',
        type: 'warning',
      });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Form Validation & Submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // 1. Mandatory Fabric Check
    if (!formData.fabricId) {
      setAlertModal({
        isOpen: true,
        title: 'Fabric Required',
        message: 'An Invoice must be created on a Fabric lot. Please select a Fabric from the list.',
        type: 'warning',
      });
      return;
    }

    // 2. Supplier check
    if (!formData.supplierName.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Supplier Missing',
        message: 'Supplier information is required for this fabric invoice.',
        type: 'warning',
      });
      return;
    }

    // 3. Items validation - filter billable items with quantity > 0
    const nonZeroItems = formData.items.filter((it) => {
      const q = parseInt(it.quantity, 10);
      return !isNaN(q) && q > 0;
    });

    if (nonZeroItems.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'No Billable Items',
        message: currentMetrics.allSubPartsFullyInvoiced
          ? `All ${currentMetrics.totalLotSets} sets on this fabric lot have already been fully invoiced. Please enter a quantity greater than 0 if you are billing additional or custom items.`
          : 'Please enter a quantity greater than 0 for at least one item to generate this invoice.',
        type: 'warning',
      });
      return;
    }

    for (let i = 0; i < nonZeroItems.length; i++) {
      const it = nonZeroItems[i];
      if (!it.description.trim()) {
        setAlertModal({
          isOpen: true,
          title: 'Item Description Required',
          message: `Please specify the description for item #${i + 1}.`,
          type: 'warning',
        });
        return;
      }
    }

    // 3.1 Remaining pieces validation for fabric lot items
    if (currentFabric && (currentMetrics.alreadyInvoicedSets > 0 || currentMetrics.hasAnyDelivery || currentMetrics.totalLotSets > 0)) {
      for (let i = 0; i < nonZeroItems.length; i++) {
        const it = nonZeroItems[i];
        if (it.isCustom) continue;

        const itemSpKey = it.subPartId || it.subPartName;
        const maxAllowed = itemSpKey && currentMetrics.remainingBySubpart && currentMetrics.remainingBySubpart[itemSpKey] !== undefined
          ? currentMetrics.remainingBySubpart[itemSpKey]
          : currentMetrics.remainingFabricSets;

        if (maxAllowed !== undefined && maxAllowed !== null) {
          const qty = parseInt(it.quantity, 10) || 0;
          if (qty > maxAllowed) {
            const partLabel = it.subPartName || (it.description ? it.description.split('-').pop().trim() : `Item #${i + 1}`);
            setAlertModal({
              isOpen: true,
              title: 'Quantity Exceeds Remaining Pieces',
              message: `Quantity for "${partLabel}" (${qty} PCs) exceeds remaining available pieces (${maxAllowed} PCs). Please enter a quantity up to ${maxAllowed} PCs.`,
              type: 'warning',
            });
            return;
          }
        }
      }
    }

    // 4. Advance check
    if (formData.hasAdvance && advanceVal > grandTotal) {
      setAlertModal({
        isOpen: true,
        title: 'Invalid Advance Amount',
        message: `Advance payment (₹${advanceVal.toLocaleString('en-IN')}) cannot exceed the Grand Total (₹${grandTotal.toLocaleString('en-IN')}).`,
        type: 'warning',
      });
      return;
    }

    // Payload
    const invoicePayload = {
      invoiceNumber: formData.invoiceNumber.trim(),
      fabricId: formData.fabricId,
      fabricType: currentFabric?.fabricType || '',
      fabricColor: currentFabric?.color || '',
      supplierId: currentFabric?.supplierId || null,
      supplierName: formData.supplierName.trim(),
      supplierPhone: formData.supplierPhone.trim(),
      clientName: formData.supplierName.trim(),
      clientPhone: formData.supplierPhone.trim(),
      clientCompany: `Supplier: ${formData.supplierName.trim()}`,
      clientGst: (formData.supplierGst || '').trim().toUpperCase(),
      clientAddress: (formData.supplierAddress || '').trim(),
      date: formData.date,
      dueDate: formData.dueDate,
      setQuantity: parseInt(setQuantity, 10) || 0,
      pricePerSet: parseFloat(pricePerSet) || 0,
      items: nonZeroItems.map((it) => ({
        id: it.id,
        description: it.description.trim(),
        fabricId: formData.fabricId,
        fabricName: currentFabric?.fabricType || '',
        quantity: parseInt(it.quantity, 10) || 1,
        unitPrice: parseFloat(it.unitPrice) || 0,
        subPartId: it.subPartId || null,
        subPartName: it.subPartName || null,
        isSubPart: Boolean(it.isSubPart),
      })),
      discount: parseFloat(formData.discount) || 0,
      taxPercent: parseFloat(formData.taxPercent) || 0,
      initialPaymentAmount: formData.hasAdvance ? advanceVal : 0,
      initialPaymentMethod: formData.initialPaymentMethod,
      initialPaymentRef: formData.initialPaymentRef,
      notes: formData.notes.trim(),
    };

    if (isEditing) {
      updateInvoice(invoiceToEdit.id, invoicePayload);
    } else {
      addInvoice(invoicePayload);
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full sm:max-w-xl md:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed top */}
        <div className="shrink-0 p-3 sm:p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {isEditing ? `Edit Fabric Invoice #${formData.invoiceNumber}` : 'Create Invoice on Fabric'}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                Invoices linked directly with inward Fabric lot & Supplier details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Form Container with Scrollable Body & Sticky Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* Scrollable Form Body */}
          <div className="p-3 sm:p-4 space-y-2.5 overflow-y-auto flex-1 text-left">
            {/* SECTION 1: MANDATORY FABRIC LOT SELECTOR */}
            <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] sm:text-[11px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Select Fabric Lot * (Required)</span>
                </label>
                <span className="text-[9px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                  Fabric-Exclusive
                </span>
              </div>

              {fabrics.length === 0 ? (
                <div className="p-2 bg-white rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>No Fabrics Found in Inventory</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Invoices must be created on an inward Fabric lot. Please add a Fabric lot in inventory first.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <CustomSelect
                    value={selectedFabricId}
                    onChange={(val) => handleFabricSelect(val)}
                    options={activeFabrics.map((fab) => ({
                      value: fab.id,
                      badge: fab.lotNo ? `#${fab.lotNo}` : 'LOT',
                      label: `${fab.fabricType || 'Fabric Lot'}${fab.color ? ` (${fab.color})` : ''}`,
                      subLabel: `Supplier: ${fab.supplierName || 'General'} • ${fab.printPieces ? `${fab.printPieces} Sets` : `${fab.plainMeters} m`} • ₹${fab.pricePerPiece || 0}/Set`,
                    }))}
                    placeholder="-- Choose Fabric Lot from Inventory * --"
                    theme="indigo"
                  />

                  {/* Compact Preview Card of Chosen Fabric */}
                  {currentFabric && (
                    <div className="bg-white rounded-xl p-2 border border-indigo-100 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-900 truncate">
                              {currentFabric.fabricType || 'Fabric Lot'}
                            </span>
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                              {currentFabric.color || 'Standard'}
                            </span>
                            <span className="text-[10px] text-indigo-700 font-medium truncate flex items-center gap-1">
                              <Truck className="w-2.5 h-2.5 shrink-0" />
                              <span>{currentFabric.supplierName}</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-emerald-700 block">
                            ₹{currentFabric.pricePerPiece || 0} / Set
                          </span>
                        </div>
                      </div>

                      {/* Invoiced Sets vs Remaining for this Lot */}
                      {alreadyInvoicedSets > 0 && (
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="text-amber-900 font-medium">
                            Already Invoiced: <strong>{alreadyInvoicedSets} Sets</strong> ({existingFabricInvoices.length} Inv)
                          </span>
                          <span className="text-emerald-800 font-extrabold bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                            {remainingFabricSets} Sets Remaining to Invoice
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 2: SUPPLIER DETAILS (DECREASED SIZE) */}
            <div className="bg-slate-50/70 rounded-xl p-2 sm:p-2.5 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Supplier Details</span>
                </span>
                {formData.supplierName && (
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Linked</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                    Supplier Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={formData.supplierName}
                      onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                      placeholder="Supplier Name"
                      required
                      className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                    Supplier Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      value={formData.supplierPhone}
                      onChange={(e) => setFormData({ ...formData, supplierPhone: e.target.value })}
                      placeholder="Phone / WhatsApp"
                      className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.supplierGst}
                    onChange={(e) => setFormData({ ...formData, supplierGst: e.target.value.toUpperCase() })}
                    placeholder="24AAAAA0000A1Z5"
                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                    Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.supplierAddress}
                    onChange={(e) => setFormData({ ...formData, supplierAddress: e.target.value })}
                    placeholder="Mill / city"
                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: INVOICE META (NUMBER, DATE & DUE DATE) */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-0.5 truncate">
                  Invoice # *
                </label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  required
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 mb-0.5 flex items-center gap-0.5 truncate">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Date *</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 mb-0.5 flex items-center gap-0.5 truncate">
                  <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>Due Date</span>
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* SECTION 4: UNIFIED FABRIC LOT SETS CONFIGURATION & LINE ITEMS BREAKDOWN */}
            <div className="bg-slate-50/70 rounded-xl p-2.5 sm:p-3 border border-indigo-200/70 shadow-2xs space-y-2">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">
                    Fabric Lot Sets Configuration
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {hasSubParts ? (
                    <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full border border-indigo-200">
                      {subParts.length} PCs / Set
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full border border-slate-200">
                      Standard
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2 py-0.5 rounded shadow-2xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* REMAINING SETS / PIECES LOT STATUS BANNER */}
              {currentFabric && (
                currentMetrics.allSubPartsFullyInvoiced ? (
                  <div className="p-2 bg-emerald-50/90 border border-emerald-300 rounded-xl flex items-center justify-between gap-2 text-xs animate-in fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-extrabold text-emerald-950 block truncate text-[11px] sm:text-xs">
                          All {currentMetrics.totalLotSets} Sets ({currentMetrics.totalLotSets * currentMetrics.numSubParts} PCs) Fully Invoiced
                        </span>
                        <span className="text-[10px] text-emerald-700 block truncate">
                          0 remaining sets across {currentMetrics.existingInvoices.length} invoices. Enter custom sets below if billing extra pieces.
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full border border-emerald-300 shrink-0">
                      0 Remaining
                    </span>
                  </div>
                ) : (currentMetrics.alreadyInvoicedSets > 0 || currentMetrics.hasAnyDelivery) ? (
                  <div className="p-2 bg-indigo-50/90 border border-indigo-200 rounded-xl flex items-center justify-between gap-2 text-xs flex-wrap animate-in fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-indigo-950 text-[11px] sm:text-xs">
                            {currentMetrics.hasPendingDeliveredToInvoice ? 'Delivered to Invoice:' : 'Remaining to Invoice:'}
                          </span>
                          <span className="font-black text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-indigo-200 text-[11px]">
                            {currentMetrics.remainingFabricSets} Sets
                          </span>
                          {hasSubParts && (
                            <span className="text-[10px] text-indigo-600 font-medium">
                              ({subParts.map((sp) => `${currentMetrics.remainingBySubpart[sp.id || sp.name] ?? 0} ${sp.name || 'PC'}`).join(' + ')})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                          {currentMetrics.hasPendingDeliveredToInvoice
                            ? 'Delivered pieces ready to bill supplier. Quantities auto-filled.'
                            : `${currentMetrics.alreadyInvoicedSets} of ${currentMetrics.totalLotSets} sets already invoiced across ${currentMetrics.existingInvoices.length} invoice${currentMetrics.existingInvoices.length > 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={handleResetToRemaining}
                        className="text-[10px] font-bold text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded shadow-2xs cursor-pointer transition-all"
                        title="Reset quantities to remaining pieces"
                      >
                        Use {currentMetrics.hasPendingDeliveredToInvoice ? 'Delivered' : 'Remaining'} ({currentMetrics.remainingFabricSets})
                      </button>
                    </div>
                  </div>
                ) : null
              )}

              {/* Exceeded pieces validation alert banner */}
              {anyItemExceeded && (
                <div className="p-2 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between gap-2 text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-extrabold text-rose-950 block text-[11px] sm:text-xs">
                        Quantity Exceeds Remaining Available Pieces
                      </span>
                      <span className="text-[10px] text-rose-700 block truncate">
                        {exceededItems.map((it) => {
                          const itemSpKey = it.subPartId || it.subPartName;
                          const maxAllowed = currentMetrics.remainingBySubpart[itemSpKey] ?? currentMetrics.remainingFabricSets;
                          const label = it.subPartName || (it.description ? it.description.split('-').pop().trim() : 'PC');
                          return `${label}: ${it.quantity} PCs (Max: ${maxAllowed} PCs)`;
                        }).join(' • ')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToRemaining}
                    className="text-[10px] font-bold text-rose-700 bg-white hover:bg-rose-100 border border-rose-300 px-2 py-0.5 rounded shadow-2xs cursor-pointer transition-all shrink-0"
                  >
                    Fix to Max
                  </button>
                </div>
              )}

              {/* Set Quantity & Set Price inputs side-by-side */}
              <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] font-semibold text-slate-700 block truncate">
                      Lot Sets Quantity
                    </label>
                    {currentMetrics.allSubPartsFullyInvoiced ? (
                      <span className="text-[9px] text-emerald-700 font-bold block truncate">
                        ✓ 0 sets remaining
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 block truncate">
                        {subParts.length > 1 ? 'Auto-synced' : 'Lot sets'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      value={displaySetQuantity}
                      onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                      onChange={(e) => handleSetQuantityChange(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 pointer-events-none">
                      Sets
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] font-semibold text-slate-700 block truncate">
                      Price per Set (₹)
                    </label>
                    {hasSubParts && (
                      <span className="text-[9px] font-bold text-emerald-700 truncate">
                        ₹{calculatedPieceRate}/PC
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="1000000"
                      step="any"
                      value={pricePerSet}
                      onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: true })}
                      onChange={(e) => handleSetPriceChange(e.target.value)}
                      placeholder="150"
                      className="w-full px-2 py-1 pr-11 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 pointer-events-none">
                      ₹/Set
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Piece Breakdown Banner */}
              {hasSubParts && (
                <div className="flex items-center justify-between gap-1.5 px-1 text-[10px] text-slate-600">
                  <div className="flex items-center gap-1 min-w-0">
                    <Calculator className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span className="truncate">
                      1 Set = {subParts.length} PCs ({subParts.map((sp) => sp.name || sp.id).join(' + ')})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncItemsToSets}
                    className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer shrink-0"
                    title="Re-synchronize subpart rows"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Sync</span>
                  </button>
                </div>
              )}

              {/* INTEGRATED LINE ITEMS BREAKDOWN ROWS */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Line Items Breakdown ({formData.items.length})
                  </span>
                  {hasExtraPieces && (
                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                      +{extraPieces.map((e) => `${e.count} ${e.name}`).join(', ')} extra
                    </span>
                  )}
                </div>

                {formData.items.map((item, index) => {
                  const itemQty = parseInt(item.quantity, 10) || 0;
                  const itemPrice = parseFloat(item.unitPrice) || 0;
                  const itemTotal = itemQty * itemPrice;
                  const itemSpKey = item.subPartId || item.subPartName;
                  const itemRemaining = itemSpKey && currentMetrics.remainingBySubpart
                    ? currentMetrics.remainingBySubpart[itemSpKey]
                    : currentMetrics.remainingFabricSets;
                  const isExceeded = !item.isCustom && itemRemaining !== undefined && itemRemaining !== null && itemQty > itemRemaining;

                  return (
                    <div
                      key={item.id || index}
                      className={`p-2 rounded-xl border space-y-1.5 transition-colors ${
                        isExceeded
                          ? 'bg-rose-50/50 border-rose-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Line 1: Description & Badges */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="e.g. Plain fab - top"
                            required
                            className="w-full px-2 py-1 bg-slate-50/60 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="flex items-center gap-1 shrink-0 flex-wrap">
                          {item.isSubPart && (
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                              Garment PC
                            </span>
                          )}
                          {isExceeded && (
                            <span className="text-[9px] font-black text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded flex items-center gap-0.5 animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                              Exceeds by {itemQty - itemRemaining} PCs
                            </span>
                          )}
                          {!isExceeded && item.isSubPart && itemRemaining !== undefined && currentMetrics.alreadyInvoicedSets > 0 && (
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              Rem: {itemRemaining}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Line 2: Quantity, Rate, Amount & Delete */}
                      <div className="flex items-center gap-2">
                        <div className="w-20 sm:w-24 shrink-0">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold mb-0.5">
                            <span>Qty</span>
                            {isExceeded && (
                              <button
                                type="button"
                                onClick={() => handleItemChange(index, 'quantity', String(itemRemaining))}
                                className="text-rose-600 font-bold underline"
                              >
                                Fix
                              </button>
                            )}
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={itemRemaining !== undefined && itemRemaining !== null ? itemRemaining : 100000}
                            value={item.quantity}
                            onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className={`w-full px-2 py-1 bg-slate-50/60 border rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-none ${
                              isExceeded
                                ? 'border-rose-400 bg-rose-50/60 text-rose-950'
                                : 'border-slate-200 text-slate-800 focus:ring-1 focus:ring-indigo-500'
                            }`}
                          />
                        </div>

                        <div className="w-20 sm:w-24 shrink-0">
                          <span className="text-[9px] text-slate-400 font-semibold block mb-0.5">
                            Rate (₹)
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="1000000"
                            step="any"
                            value={item.unitPrice}
                            onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: true })}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            required
                            className="w-full px-2 py-1 bg-slate-50/60 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="flex-1 text-right min-w-0 pr-1">
                          <span className="text-[9px] text-slate-400 font-semibold block mb-0.5">
                            Amount
                          </span>
                          <span className="text-xs font-black text-slate-900 truncate block">
                            ₹{itemTotal.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 self-end mb-0.5 cursor-pointer"
                            title="Remove Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 5: SUBTOTAL, TAX & ADVANCE (DECREASED SIZE) */}
            <div className="bg-slate-50/70 rounded-xl p-2.5 sm:p-3 border border-slate-200 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {/* Extra loose pieces cost explanation */}
              {hasExtraPieces && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-1.5 text-[9px] space-y-0.5">
                  <div className="flex justify-between text-slate-700">
                    <span>{minCompleteSets} Sets @ ₹{numericSetPrice}/Set:</span>
                    <span className="font-bold">₹{(minCompleteSets * numericSetPrice).toLocaleString('en-IN')}</span>
                  </div>
                  {extraPieces.map((ep, i) => (
                    <div key={i} className="flex justify-between text-amber-800 font-semibold">
                      <span>Extra {ep.name} ({ep.count} PCs @ ₹{ep.rate || calculatedPieceRate}/PC):</span>
                      <span className="font-extrabold">+₹{Math.round(ep.count * (ep.rate || calculatedPieceRate)).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={formData.discount}
                    onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: true })}
                    onChange={(e) => {
                      const sanitized = sanitizeDecimal(e.target.value, { min: 0, max: subtotal, maxDecimals: 2 });
                      setFormData({ ...formData, discount: sanitized });
                    }}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-right font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                    GST / Tax (%)
                  </label>
                  <CustomSelect
                    value={formData.taxPercent}
                    onChange={(val) => setFormData({ ...formData, taxPercent: val })}
                    options={[
                      { value: '0', label: '0% (Tax Exempt)' },
                      { value: '5', label: '5% GST' },
                      { value: '12', label: '12% GST' },
                      { value: '18', label: '18% GST' },
                    ]}
                    placeholder="Select Tax %"
                    theme="indigo"
                  />
                </div>
              </div>

              {taxAmount > 0 && (
                <div className="flex justify-between text-xs text-slate-500 pt-0.5">
                  <span>Tax Amount ({taxPct}%)</span>
                  <span>+₹{taxAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-1 border-t border-slate-200 font-black text-xs sm:text-sm text-slate-900">
                <span>Grand Total</span>
                <span className="text-sm font-black text-indigo-700">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>

              {/* Advance payment option */}
              <div className="pt-1 border-t border-slate-200 space-y-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.hasAdvance}
                    onChange={(e) => setFormData({ ...formData, hasAdvance: e.target.checked })}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Record Initial Payment / Advance Received?</span>
                </label>

                {formData.hasAdvance && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-white p-2 rounded-xl border border-indigo-100 animate-in fade-in">
                    <div>
                      <label className="text-[9px] font-semibold text-slate-600 block mb-0.5">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={grandTotal}
                        value={formData.initialPaymentAmount}
                        onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: true })}
                        onChange={(e) => {
                          const sanitized = sanitizeDecimal(e.target.value, { min: 0, max: grandTotal, maxDecimals: 2 });
                          setFormData({ ...formData, initialPaymentAmount: sanitized });
                        }}
                        placeholder="e.g. 5000"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold text-slate-600 block mb-0.5">
                        Payment Mode
                      </label>
                      <CustomSelect
                        value={formData.initialPaymentMethod}
                        onChange={(val) => setFormData({ ...formData, initialPaymentMethod: val })}
                        options={[
                          { value: 'UPI / GPay', label: 'UPI / GPay' },
                          { value: 'Cash', label: 'Cash' },
                          { value: 'Bank Transfer / NEFT', label: 'Bank Transfer' },
                          { value: 'Cheque', label: 'Cheque' },
                        ]}
                        placeholder="Select Mode"
                        theme="indigo"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold text-slate-600 block mb-0.5">
                        Ref / UTR
                      </label>
                      <input
                        type="text"
                        value={formData.initialPaymentRef}
                        onChange={(e) => setFormData({ ...formData, initialPaymentRef: e.target.value })}
                        placeholder="Reference"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-xs pt-0.5">
                  <span className="text-slate-500 font-medium">Pending Balance:</span>
                  <span className={`font-extrabold ${pendingBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    ₹{pendingBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                Invoice Notes / Terms (Optional)
              </label>
              <textarea
                rows="1.5"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Payment terms, fabric lot notes or bank account details..."
                className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              ></textarea>
            </div>
          </div>

          {/* Modal Footer Actions - Bottom Sticky */}
          <div className="shrink-0 p-2.5 sm:p-3 border-t border-slate-100 bg-white flex items-center justify-between gap-2 sticky bottom-0 z-10 shadow-xs">
            <div className="text-left min-w-0">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                Grand Total
              </span>
              <span className="text-sm sm:text-base font-black text-indigo-700 leading-tight block">
                ₹{grandTotal.toLocaleString('en-IN')}
              </span>
              {taxAmount > 0 && (
                <span className="text-[9px] text-slate-400 block truncate">
                  (Incl. {taxPct}% GST: +₹{taxAmount.toLocaleString('en-IN')})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={anyItemExceeded}
                className={`px-3.5 py-2 sm:px-5 sm:py-2 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  anyItemExceeded
                    ? 'bg-slate-400 cursor-not-allowed opacity-75 shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 active:scale-95'
                }`}
                title={anyItemExceeded ? 'Cannot generate invoice: some item quantities exceed remaining available pieces' : ''}
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{isEditing ? 'Save Changes' : 'Generate Invoice'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Alert Warning Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
