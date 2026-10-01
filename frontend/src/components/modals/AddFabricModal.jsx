import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Layers,
  Truck,
  Ruler,
  Hash,
  IndianRupee,
  Calendar,
  FileText,
  Tag,
  Plus,
  CheckCircle2,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useFactory, useFabric } from '../../context/useManagement';
import AlertModal from './AlertModal';
import { sanitizeInteger, sanitizeDecimal, blockInvalidNumberKeys } from '../../utils/formValidation';

export default function AddFabricModal({
  isOpen,
  onClose,
  fabricToEdit = null,
  onOpenAddSupplier = null,
  onSuccess = null,
}) {
  const { suppliers } = useFactory();
  const { addFabric, updateFabric } = useFabric();

  const isEditing = Boolean(fabricToEdit);
  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState(() => {
    if (fabricToEdit) {
      return {
        supplierId: fabricToEdit.supplierId || '',
        plainMeters: fabricToEdit.plainMeters || '',
        printPieces: fabricToEdit.printPieces ?? fabricToEdit.targetSets ?? '',
        pricePerPiece: fabricToEdit.pricePerPiece ?? fabricToEdit.pricePerSet ?? '',
        color: fabricToEdit.color || '',
        date: fabricToEdit.date || todayStr,
        fabricType: fabricToEdit.fabricType || '',
        status: fabricToEdit.status || 'In Stock',
        notes: fabricToEdit.notes || '',
      };
    }
    return {
      supplierId: suppliers[0]?.id || '',
      plainMeters: '',
      printPieces: '',
      pricePerPiece: '',
      color: '',
      date: todayStr,
      fabricType: '',
      status: 'In Stock',
      notes: '',
    };
  });

  const [prevEditId, setPrevEditId] = useState(fabricToEdit?.id || null);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen || (fabricToEdit && fabricToEdit.id !== prevEditId)) {
    setPrevIsOpen(isOpen);
    setPrevEditId(fabricToEdit?.id || null);
    if (fabricToEdit) {
      setFormData({
        supplierId: fabricToEdit.supplierId || '',
        plainMeters: fabricToEdit.plainMeters !== undefined ? fabricToEdit.plainMeters : '',
        printPieces: fabricToEdit.printPieces !== undefined ? fabricToEdit.printPieces : (fabricToEdit.targetSets !== undefined ? fabricToEdit.targetSets : ''),
        pricePerPiece: fabricToEdit.pricePerPiece !== undefined ? fabricToEdit.pricePerPiece : (fabricToEdit.pricePerSet !== undefined ? fabricToEdit.pricePerSet : ''),
        color: fabricToEdit.color || '',
        date: fabricToEdit.date || todayStr,
        fabricType: fabricToEdit.fabricType || '',
        status: fabricToEdit.status || 'In Stock',
        notes: fabricToEdit.notes || '',
      });
    } else {
      setFormData({
        supplierId: suppliers[0]?.id || '',
        plainMeters: '',
        printPieces: '',
        pricePerPiece: '',
        color: '',
        date: todayStr,
        fabricType: '',
        status: 'In Stock',
        notes: '',
      });
    }
  }

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
  });

  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const supplierDropdownRef = useRef(null);
  const selectedOptionRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
        setIsSupplierDropdownOpen(false);
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
    if (isSupplierDropdownOpen && selectedOptionRef.current) {
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
  }, [isSupplierDropdownOpen]);

  if (!isOpen) return null;

  // Live calculation of batch total amount
  const parsedPieces = parseInt(formData.printPieces, 10) || 0;
  const parsedPrice = parseFloat(formData.pricePerPiece) || 0;
  const computedTotal = parsedPieces > 0 && parsedPrice > 0 ? parsedPieces * parsedPrice : 0;

  const handleClose = () => {
    setAlertModal({
      isOpen: false,
      title: '',
      message: '',
      type: 'warning',
    });
    setIsSupplierDropdownOpen(false);
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.supplierId) {
      setAlertModal({
        isOpen: true,
        title: 'Supplier Required',
        message: 'Please link this fabric lot to a Supplier record.',
        type: 'warning',
      });
      return;
    }

    const trimmedLotName = (formData.fabricType || '').trim();
    if (!trimmedLotName) {
      setAlertModal({
        isOpen: true,
        title: 'Lot Name Required',
        message: 'Please enter the Lot Name before saving.',
        type: 'warning',
      });
      return;
    }

    const plainM = parseFloat(formData.plainMeters) || 0;
    if (!formData.plainMeters || plainM <= 0 || plainM > 500000) {
      setAlertModal({
        isOpen: true,
        title: 'Plain Fabric Meters Required',
        message: 'Please enter a valid Plain Fabric quantity between 0.01 and 500,000 Meters.',
        type: 'warning',
      });
      return;
    }

    const printP = parseInt(formData.printPieces, 10) || 0;
    if (!formData.printPieces || printP <= 0 || printP > 100000) {
      setAlertModal({
        isOpen: true,
        title: 'Target Sets Required',
        message: 'Please enter a valid target number of Sets between 1 and 100,000.',
        type: 'warning',
      });
      return;
    }

    const priceP = parseFloat(formData.pricePerPiece) || 0;
    if (!formData.pricePerPiece || priceP <= 0 || priceP > 100000) {
      setAlertModal({
        isOpen: true,
        title: 'Sales Price Required',
        message: 'Please enter a valid Price per Set between ₹0.01 and ₹100,000.',
        type: 'warning',
      });
      return;
    }

    if (!formData.date) {
      setAlertModal({
        isOpen: true,
        title: 'Received Date Required',
        message: 'Please select the Date when this fabric lot was received.',
        type: 'warning',
      });
      return;
    }

    const parsedPrintPieces = parseInt(formData.printPieces, 10) || 0;
    const parsedPricePerPiece = parseFloat(formData.pricePerPiece) || 0;
    const computedTotalAmount = Math.round(parsedPrintPieces * parsedPricePerPiece);

    const basePayload = {
      supplierId: formData.supplierId,
      plainMeters: formData.plainMeters,
      printPieces: formData.printPieces,
      targetSets: parsedPrintPieces,
      lotSizePrintFabricPsc: parsedPrintPieces,
      pricePerPiece: formData.pricePerPiece,
      pricePerSet: parsedPricePerPiece,
      totalAmount: computedTotalAmount,
      color: formData.color.trim(),
      date: formData.date,
      fabricType: formData.fabricType,
      notes: formData.notes.trim(),
    };

    if (isEditing) {
      // Strictly retain existing status, master, structure, tailor rates, lotNo, and due date
      const editPayload = {
        ...basePayload,
        status: fabricToEdit.status || formData.status || 'In Stock',
        assignedMasterId: fabricToEdit.assignedMasterId !== undefined ? fabricToEdit.assignedMasterId : null,
        assignedMasterName: fabricToEdit.assignedMasterName || null,
        productName: fabricToEdit.productName || '',
        productStructure: fabricToEdit.productStructure || null,
        tailorRates: fabricToEdit.tailorRates || null,
        dueDate: fabricToEdit.dueDate || '',
        lotNo: fabricToEdit.lotNo,
      };
      updateFabric(fabricToEdit.id, editPayload);
      if (onSuccess) onSuccess({ ...fabricToEdit, ...editPayload });
    } else {
      const newLotPayload = {
        ...basePayload,
        status: 'In Stock',
        assignedMasterId: null,
        productName: '',
        productStructure: null,
        tailorRates: null,
      };
      const created = addFabric(newLotPayload);
      if (onSuccess) onSuccess(created?.fabric || created);
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
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/90 via-violet-50/50 to-white flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  {isEditing ? 'Edit Fabric Lot' : 'Add New Fabric Lot'}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  {isEditing ? `Lot #${fabricToEdit?.lotNo || ''}` : 'Stock intake & target sets setup'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-left">
            {/* Supplier Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Supplier *</span>
                </label>
                {suppliers.length > 0 && onOpenAddSupplier && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenAddSupplier();
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New</span>
                  </button>
                )}
              </div>

              {suppliers.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-amber-900">No Suppliers Registered</p>
                    <p className="text-[11px] text-amber-700">Add a supplier first to link this fabric.</p>
                  </div>
                  {onOpenAddSupplier && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onOpenAddSupplier();
                      }}
                      className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      + Add Supplier
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative" ref={supplierDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsSupplierDropdownOpen((prev) => !prev)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSupplierDropdownOpen
                        ? 'border-indigo-500 bg-white ring-2 ring-indigo-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {(() => {
                      const selectedSup = suppliers.find((s) => String(s.id) === String(formData.supplierId));
                      if (selectedSup) {
                        return (
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase shrink-0">
                              {selectedSup.category || 'SUPPLIER'}
                            </span>
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {selectedSup.name}
                            </span>
                            {selectedSup.phone && (
                              <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                                • {selectedSup.phone}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return (
                        <span className="text-xs font-medium text-slate-400">
                          Select Supplier...
                        </span>
                      );
                    })()}
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                        isSupplierDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </button>

                  {isSupplierDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-52 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100">
                      <div className="px-3 py-1 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Select Supplier
                        </span>
                        <span className="text-[10px] font-bold text-indigo-600">
                          {suppliers.length} Available
                        </span>
                      </div>
                      <div className="p-1 space-y-0.5">
                        {suppliers.map((sup) => {
                          const isSelected = String(sup.id) === String(formData.supplierId);
                          return (
                            <button
                              key={sup.id}
                              ref={isSelected ? selectedOptionRef : null}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, supplierId: sup.id });
                                setIsSupplierDropdownOpen(false);
                              }}
                              className={`w-full px-2.5 py-2 text-left rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/80'
                                  : 'text-slate-700 hover:bg-slate-50 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <div
                                  className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {sup.name?.slice(0, 2).toUpperCase() || 'SP'}
                                </div>
                                <div className="truncate">
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate">{sup.name}</span>
                                    <span className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-semibold bg-slate-100 text-slate-600">
                                      {sup.category || 'General'}
                                    </span>
                                  </div>
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
              )}
            </div>

            {/* Lot Name & Optional Color Field */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Fabric Lot Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cotton Twill #102"
                  value={formData.fabricType}
                  onChange={(e) => setFormData({ ...formData, fabricType: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-indigo-500 to-rose-400 inline-block" />
                    <span>Fabric Color</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Navy Blue, Maroon, Black"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
            </div>

            {/* Quantities: Meters & Sets (2-column on all devices) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Plain Fabric *</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="500000"
                    required
                    placeholder="0"
                    value={formData.plainMeters}
                    onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: true })}
                    onChange={(e) => {
                      const sanitized = sanitizeDecimal(e.target.value, { min: 0, max: 500000, maxDecimals: 2 });
                      setFormData({ ...formData, plainMeters: sanitized });
                    }}
                    className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    Meters
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">Target Sets *</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    required
                    placeholder="0"
                    value={formData.printPieces}
                    onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                    onChange={(e) => {
                      const sanitized = sanitizeInteger(e.target.value, { min: 0, max: 100000 });
                      setFormData({ ...formData, printPieces: sanitized });
                    }}
                    className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    Sets
                  </span>
                </div>
              </div>
            </div>

            {/* Price per Set & Inline Live Valuation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Price per Set *</span>
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100000"
                    required
                    placeholder="0.00"
                    value={formData.pricePerPiece}
                    onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: true })}
                    onChange={(e) => {
                      const sanitized = sanitizeDecimal(e.target.value, { min: 0, max: 100000, maxDecimals: 2 });
                      setFormData({ ...formData, pricePerPiece: sanitized });
                    }}
                    className="w-full pl-7 pr-12 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    / Set
                  </span>
                </div>
              </div>

              {/* Live Batch Valuation Inline Badge */}
              <div className="p-2 sm:p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Estimated Value
                  </span>
                  <p className="text-xs sm:text-sm font-black text-emerald-700">
                    ₹ {computedTotal.toLocaleString('en-IN')}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 text-right">
                  {parsedPieces} Sets
                </span>
              </div>
            </div>

            {/* Received Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Received Date *</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-indigo-500 outline-none"
                required
              />
            </div>

            {/* Notes / Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Notes</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </label>
              <textarea
                rows={2}
                placeholder="Quality remarks, roll numbers, or batch details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal resize-none"
              />
            </div>
          </form>

          {/* Footer Actions (Mobile-Optimized Touch Layout) */}
          <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2 sm:justify-end flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-[2] sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-xs font-bold text-white shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Save Changes' : 'Save Fabric Lot'}</span>
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
