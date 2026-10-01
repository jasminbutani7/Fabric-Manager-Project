import React, { useState } from 'react';
import {
  X,
  Truck,
  Building2,
  Calendar,
  DollarSign,
  PackageCheck,
  FileText,
  Clock,
  Phone,
  Layers,
} from 'lucide-react';
import { useFabric, useFactory, useProduction, useFinance } from '../../context/useManagement';
import AlertModal from './AlertModal';
import { calculateReadyProductSets, formatPieceName, isEntityArchived } from '../../utils/productUtils';
import { sanitizeInteger, sanitizeDecimal, blockInvalidNumberKeys } from '../../utils/formValidation';
import CustomSelect from '../common/CustomSelect';

export default function DeliverToSupplierModal({
  isOpen,
  onClose,
  onSuccess,
  initialThreadJobId = null,
  initialCuttingId = null,
  initialFabricId = null,
}) {
  const { cuttings = [], fabrics = [] } = useFabric();
  const { suppliers = [] } = useFactory();
  const {
    threadCuttingAssignments = [],
    masterHandovers = [],
    deliveryLogs = [],
    deliverGoodsToSupplier,
  } = useProduction();
  const { invoices = [] } = useFinance();

  const todayStr = new Date().toISOString().split('T')[0];

  const activeFabrics = fabrics.filter((f) => !isEntityArchived(f, fabrics) || f.id === initialFabricId);

  const [selectedFabricId, setSelectedFabricId] = useState(
    initialFabricId || activeFabrics[0]?.id || ''
  );

  // Resolve linked fabric, cutting, thread job & supplier
  const effectiveFabric =
    activeFabrics.find((f) => f.id === selectedFabricId) ||
    activeFabrics.find((f) => f.id === initialFabricId) ||
    activeFabrics[0] ||
    null;

  const currentFabric = effectiveFabric;

  const linkedCuttings = cuttings.filter((c) => c.fabricId === effectiveFabric?.id);
  const cuttingId = initialCuttingId || linkedCuttings[0]?.id || null;
  const currentCutting = cuttings.find((c) => c.id === cuttingId) || linkedCuttings[0] || null;

  const linkedThreadJobs = threadCuttingAssignments.filter(
    (tc) =>
      tc.fabricId === effectiveFabric?.id ||
      (currentCutting && tc.cuttingId === currentCutting.id)
  );

  const readySetData = calculateReadyProductSets(effectiveFabric, {
    cuttings,
    masterHandovers,
    threadCuttingAssignments,
    invoices,
    deliveryLogs,
  });

  const {
    readyProductsCount,
    totalVerifiedPieces,
  } = readySetData;

  const threadJob =
    threadCuttingAssignments.find((tc) => tc.id === initialThreadJobId) ||
    linkedThreadJobs.find((tc) => tc.status === 'Completed') ||
    linkedThreadJobs[0] ||
    null;

  const fabricId = effectiveFabric?.id || null;

  const supplierId = effectiveFabric?.supplierId || suppliers[0]?.id || '';
  const currentSupplier =
    suppliers.find((s) => s.id === supplierId || s.name === effectiveFabric?.supplierName) ||
    suppliers[0] ||
    null;

  const rawStruct = effectiveFabric?.productStructure || effectiveFabric?.product_structure;
  let struct = rawStruct || null;
  if (typeof rawStruct === 'string') {
    try {
      struct = JSON.parse(rawStruct);
    } catch {
      struct = null;
    }
  }

  const configuredSubParts =
    Array.isArray(struct?.subParts) && struct.subParts.length > 0
      ? struct.subParts
      : Array.isArray(struct?.parts) && struct.parts.length > 0
        ? struct.parts
        : [];

  const piecesPerSet = configuredSubParts.length > 0
    ? configuredSubParts.reduce((sum, sp) => sum + (parseInt(sp.qty || sp.piecesPerSet || sp.ratio, 10) || 1), 0)
    : 1;

  const readySetsPieces = readySetData.readyProductsCount > 0
    ? readySetData.readyProductsCount * piecesPerSet
    : 0;

  const totalReadyPieces =
    configuredSubParts.length === 0
      ? (readySetsPieces > 0 ? readySetsPieces : totalVerifiedPieces)
      : configuredSubParts.reduce((sum, sp, idx) => {
          const normKey = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
          return sum + (readySetData.subPartReadyPieces?.[normKey] ?? 0);
        }, 0);

  const maxDeliverable = totalReadyPieces;

  const defaultQuantity = totalReadyPieces;

  const defaultPrice = effectiveFabric?.pricePerPiece ? String(effectiveFabric.pricePerPiece) : '180';

  // Compute default due date based on payment terms (e.g., 30 Days Credit)
  const computeDefaultDueDate = () => {
    const d = new Date();
    const terms = currentSupplier?.paymentTerms || '30 Days Credit';
    const match = terms.match(/(\d+)\s*Day/i);
    const daysToAdd = match ? parseInt(match[1], 10) : 30;
    d.setDate(d.getDate() + daysToAdd);
    return d.toISOString().split('T')[0];
  };

  const [selectedSupplierId, setSelectedSupplierId] = useState(
    currentSupplier?.id || supplierId
  );
  const [subPartDeliveries, setSubPartDeliveries] = useState(() => {
    if (configuredSubParts.length > 0) {
      const initParts = {};
      configuredSubParts.forEach((sp, idx) => {
        const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
        const readyCnt = readySetData.subPartReadyPieces?.[key] ?? 0;
        initParts[key] = String(readyCnt);
      });
      return initParts;
    }
    return {};
  });
  const [deliveredPSC, setDeliveredPSC] = useState(() => {
    if (configuredSubParts.length > 0) {
      let totalP = 0;
      configuredSubParts.forEach((sp, idx) => {
        const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
        const readyCnt = readySetData.subPartReadyPieces?.[key] ?? 0;
        totalP += readyCnt;
      });
      return String(totalP > 0 ? totalP : '');
    }
    return String(defaultQuantity || '');
  });
  const [pricePerPSC, setPricePerPSC] = useState(defaultPrice);

  const [deliveryDate, setDeliveryDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(computeDefaultDueDate());
  const [vehicleNo, setVehicleNo] = useState('');
  const discountNum = 0;
  const taxPctNum = 0;
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFabricSelect = (fabId) => {
    setSelectedFabricId(fabId);
    const fab = fabrics.find((f) => f.id === fabId);
    if (!fab) return;

    const fabReady = calculateReadyProductSets(fab, {
      cuttings,
      masterHandovers,
      threadCuttingAssignments,
      invoices,
      deliveryLogs,
    });

    const targetSupplier =
      suppliers.find((s) => s.id === fab.supplierId || s.name === fab.supplierName) ||
      suppliers[0] ||
      null;

    if (targetSupplier) {
      setSelectedSupplierId(targetSupplier.id);
    }

    let fStruct = fab.productStructure || fab.product_structure;
    if (typeof fStruct === 'string') {
      try { fStruct = JSON.parse(fStruct); } catch { fStruct = null; }
    }
    const fParts = Array.isArray(fStruct?.subParts) && fStruct.subParts.length > 0
      ? fStruct.subParts
      : Array.isArray(fStruct?.parts) && fStruct.parts.length > 0
        ? fStruct.parts
        : [];

    if (fParts.length > 0) {
      const initParts = {};
      let totalP = 0;
      fParts.forEach((sp, idx) => {
        const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
        const readyCnt = fabReady.subPartReadyPieces?.[key] ?? 0;
        initParts[key] = String(readyCnt);
        totalP += readyCnt;
      });
      setSubPartDeliveries(initParts);
      setDeliveredPSC(String(totalP > 0 ? totalP : ''));
    } else {
      setDeliveredPSC(String(fabReady.totalReadyPieces || 0));
    }

    if (fab.pricePerPiece || fab.pricePerSet) {
      setPricePerPSC(String(fab.pricePerPiece || fab.pricePerSet));
    }
  };

  const pscNum = parseInt(deliveredPSC, 10) || 0;
  const rateNum = parseFloat(pricePerPSC) || 0;

  const setCalculation = (() => {
    const pPerSet = piecesPerSet > 0 ? piecesPerSet : 1;
    const pieceRate = rateNum / pPerSet;

    if (configuredSubParts.length === 0) {
      const sets = Math.floor(pscNum / pPerSet);
      const rem = pscNum % pPerSet;
      const sub = (sets * rateNum) + (rem * pieceRate);
      return {
        completeSets: sets,
        extraPiecesTotal: rem,
        subtotal: Math.round(sub * 100) / 100,
        pieceRate,
      };
    }

    const nonZeroParts = configuredSubParts.map((sp, idx) => {
      const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
      const count = parseInt(subPartDeliveries[key], 10) || 0;
      const ratio = parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1;
      return { key, spName: sp.name || sp.id || `Part ${idx + 1}`, count, ratio };
    });

    const hasAll = configuredSubParts.every((sp, idx) => {
      const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
      return (parseInt(subPartDeliveries[key], 10) || 0) > 0;
    });

    const completeSets = hasAll && nonZeroParts.length > 0
      ? Math.min(...nonZeroParts.map((p) => Math.floor(p.count / p.ratio)))
      : 0;

    let extraPiecesTotal = 0;
    nonZeroParts.forEach((p) => {
      const usedInSets = completeSets * p.ratio;
      const rem = Math.max(0, p.count - usedInSets);
      if (rem > 0) {
        extraPiecesTotal += rem;
      }
    });

    const setsAmount = completeSets * rateNum;
    const extraAmount = extraPiecesTotal * pieceRate;
    const totalSub = Math.round((setsAmount + extraAmount) * 100) / 100;

    return {
      completeSets,
      extraPiecesTotal,
      subtotal: totalSub,
      pieceRate,
    };
  })();

  const deliveredBreakdownSummary = (() => {
    if (configuredSubParts.length === 0) {
      return `${pscNum} PCs`;
    }

    const nonZeroParts = configuredSubParts
      .map((sp, idx) => {
        const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
        const count = parseInt(subPartDeliveries[key], 10) || 0;
        const spName = sp.name || sp.id || `Part ${idx + 1}`;
        const ratio = parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1;
        return { spName, count, ratio };
      })
      .filter((p) => p.count > 0);

    if (nonZeroParts.length === 0) {
      return `${pscNum} PCs`;
    }

    const hasAllParts = nonZeroParts.length === configuredSubParts.length;
    const possibleSets = hasAllParts
      ? Math.min(...nonZeroParts.map((p) => Math.floor(p.count / p.ratio)))
      : 0;

    const partsDetail = nonZeroParts
      .map((p) => `${p.count} ${formatPieceName(p.spName, p.count)}`)
      .join(' + ');

    if (possibleSets > 0 && nonZeroParts.every((p) => p.count === possibleSets * p.ratio)) {
      return `${possibleSets} Complete ${formatPieceName('Set', possibleSets)} (${partsDetail})`;
    }

    if (possibleSets > 0) {
      return `${possibleSets} Complete ${formatPieceName('Set', possibleSets)} + Extra Pieces (${partsDetail})`;
    }

    return partsDetail;
  })();

  const calculatedCompleteSets = (() => {
    if (configuredSubParts.length === 0) {
      return piecesPerSet > 0 ? Math.floor(pscNum / piecesPerSet) : pscNum;
    }
    const parts = configuredSubParts.map((sp, idx) => {
      const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
      const count = parseInt(subPartDeliveries[key], 10) || 0;
      const ratio = parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1;
      return Math.floor(count / ratio);
    });
    return parts.length > 0 ? Math.min(...parts) : 0;
  })();

  const hasExceededAnyComponent =
    configuredSubParts.length === 0
      ? (totalReadyPieces > 0 && pscNum > totalReadyPieces)
      : configuredSubParts.some((sp, idx) => {
          const normKey = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
          const deliveringCount = parseInt(subPartDeliveries[normKey], 10) || 0;
          const readyCnt = readySetData.subPartReadyPieces?.[normKey] ?? 0;
          return deliveringCount > readyCnt;
        });

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

  if (!isOpen) return null;

  const activeSupplier =
    suppliers.find((s) => s.id === selectedSupplierId) ||
    currentSupplier || {
      name: effectiveFabric?.supplierName || 'Primary Supplier',
      phone: effectiveFabric?.supplierPhone || '',
      address: '',
      gstNumber: '',
    };

  const fabricDisplayName =
    effectiveFabric
      ? `${effectiveFabric.fabricType} (${effectiveFabric.color || 'Standard'})`
      : threadJob?.fabricName || currentCutting?.fabricName || 'Garment Batch';

  const handleSubPartChange = (key, val, maxLimit) => {
    // If empty string, keep as empty string so user can clear and type
    if (val === '') {
      const updated = {
        ...subPartDeliveries,
        [key]: '',
      };
      setSubPartDeliveries(updated);
      const totalP = Object.values(updated).reduce(
        (acc, v) => acc + (parseInt(v, 10) || 0),
        0
      );
      setDeliveredPSC(String(totalP));
      return;
    }

    const maxVal = typeof maxLimit === 'number' && maxLimit >= 0 ? maxLimit : 100000;
    const sanitized = sanitizeInteger(val, { min: 0, max: maxVal });
    const updated = {
      ...subPartDeliveries,
      [key]: sanitized,
    };
    setSubPartDeliveries(updated);

    const totalP = Object.values(updated).reduce(
      (acc, v) => acc + (parseInt(v, 10) || 0),
      0
    );
    setDeliveredPSC(String(totalP));
  };

  const handleApplyAllReady = () => {
    if (configuredSubParts.length > 0) {
      const nextParts = {};
      let totalP = 0;
      configuredSubParts.forEach((sp, idx) => {
        const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
        const readyCnt = readySetData.subPartReadyPieces?.[key] ?? 0;
        nextParts[key] = String(readyCnt);
        totalP += readyCnt;
      });
      setSubPartDeliveries(nextParts);
      setDeliveredPSC(String(totalP));
    } else {
      setDeliveredPSC(String(maxDeliverable));
    }
  };

  const handleDeliveredPSCChange = (val) => {
    const sanitized = sanitizeInteger(val, { min: 0, max: maxDeliverable || 100000 });
    setDeliveredPSC(sanitized);

    if (configuredSubParts.length > 0) {
      let rem = parseInt(sanitized, 10) || 0;
      const nextParts = {};

      const readyPerPart = {};
      configuredSubParts.forEach((sp, idx) => {
        const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
        readyPerPart[key] = readySetData.subPartReadyPieces?.[key] ?? 0;
      });

      // Allocate complete sets first up to the maximum complete sets ready
      const maxPossibleSets = readyProductsCount > 0 ? readyProductsCount : (piecesPerSet > 0 ? Math.floor(rem / piecesPerSet) : 0);
      const setsToDeliver = Math.min(maxPossibleSets, piecesPerSet > 0 ? Math.floor(rem / piecesPerSet) : 0);

      configuredSubParts.forEach((sp, idx) => {
        const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
        const ratio = parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1;
        const allocated = setsToDeliver * ratio;
        nextParts[key] = allocated;
        rem -= allocated;
      });

      // Distribute any remaining pieces to subparts that actually have available ready pieces
      if (rem > 0) {
        for (const sp of configuredSubParts) {
          if (rem <= 0) break;
          const key = (sp.id || sp.name).toLowerCase().trim();
          const curAlloc = nextParts[key] || 0;
          const maxAvail = readyPerPart[key] || 0;
          const canAdd = Math.max(0, maxAvail - curAlloc);
          const toAdd = Math.min(rem, canAdd);
          nextParts[key] = curAlloc + toAdd;
          rem -= toAdd;
        }
      }

      // If still remainder (e.g. delivery exceeds ready counts), distribute to first available part
      if (rem > 0) {
        const firstKey = (configuredSubParts[0].id || configuredSubParts[0].name).toLowerCase().trim();
        nextParts[firstKey] = (nextParts[firstKey] || 0) + rem;
      }

      const stringifiedParts = {};
      Object.entries(nextParts).forEach(([k, v]) => {
        stringifiedParts[k] = String(v);
      });
      setSubPartDeliveries(stringifiedParts);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (pscNum <= 0) {
      setAlertModal({
        isOpen: true,
        title: 'Quantity Required',
        message: 'Please enter at least 1 piece to deliver to the supplier.',
        type: 'warning',
      });
      return;
    }

    if (configuredSubParts.length > 0) {
      for (let i = 0; i < configuredSubParts.length; i++) {
        const sp = configuredSubParts[i];
        const key = (sp.id || sp.name || `part_${i + 1}`).toLowerCase().trim();
        const qty = parseInt(subPartDeliveries[key], 10) || 0;
        const readyCnt = readySetData.subPartReadyPieces?.[key] ?? 0;
        if (qty > readyCnt) {
          const spName = sp.name || sp.id || `Part ${i + 1}`;
          setAlertModal({
            isOpen: true,
            title: 'Exceeds Ready Goods',
            message: `You entered ${qty} pieces for ${spName}, but only ${readyCnt} pieces are ready for delivery (thread trimmed or skipped).`,
            type: 'warning',
          });
          return;
        }
      }
    } else if (totalReadyPieces > 0 && pscNum > totalReadyPieces) {
      setAlertModal({
        isOpen: true,
        title: 'Quantity Exceeds Ready Goods',
        message: `You entered ${pscNum} pieces, but only ${totalReadyPieces} are ready for delivery (thread trimmed or skipped).`,
        type: 'warning',
      });
      return;
    }

    if (rateNum <= 0 || rateNum > 100000) {
      setAlertModal({
        isOpen: true,
        title: 'Price Required',
        message: 'Please specify a valid invoice price per piece between ₹0.01 and ₹100,000.',
        type: 'warning',
      });
      return;
    }

    setIsSubmitting(true);

    const autoNotes = [
      notes.trim(),
      `Delivered: ${pscNum} PCs (${deliveredBreakdownSummary})`,
    ].filter(Boolean).join(' • ');

    const cleanSubParts = {};
    if (configuredSubParts.length > 0) {
      configuredSubParts.forEach((sp, idx) => {
        const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
        const q = parseInt(subPartDeliveries[key], 10) || 0;
        if (q > 0) cleanSubParts[key] = q;
      });
    }

    const result = deliverGoodsToSupplier({
      threadJobId: threadJob?.id || null,
      cuttingId: cuttingId || null,
      fabricId: fabricId || null,
      fabricName: fabricDisplayName,
      supplierId: activeSupplier?.id || null,
      supplierName: activeSupplier?.name || currentFabric?.supplierName || 'Supplier',
      supplierPhone: activeSupplier?.phone || currentFabric?.supplierPhone || '',
      supplierAddress: activeSupplier?.address || '',
      supplierGst: activeSupplier?.gstNumber || '',
      deliveredPSC: pscNum,
      subPartQuantities: cleanSubParts,
      pricePerSet: rateNum,
      pricePerPSC: setCalculation.pieceRate,
      discount: discountNum,
      taxPercent: taxPctNum,
      deliveryDate,
      dueDate,
      vehicleNo: vehicleNo.trim(),
      notes: autoNotes,
    });

    setIsSubmitting(false);

    if (!result?.success) {
      setAlertModal({
        isOpen: true,
        title: 'Delivery Failed',
        message: result?.error || 'Failed to process delivery log.',
        type: 'error',
      });
      return;
    }

    if (onSuccess) onSuccess(result);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] text-left animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-3.5 border-b border-slate-100 shrink-0 bg-slate-50/90">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shadow-xs shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                  Deliver Finished Goods to Supplier
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                  Dispatch finished pieces & record deliver log
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            {/* Scrollable Body */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1">
              {/* Fabric Lot Selector */}
              <div className="space-y-1">
                <label className="text-[10px] sm:text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Select Fabric Lot / Garment Batch *</span>
                </label>
                {fabrics.length > 0 ? (
                  <CustomSelect
                    value={selectedFabricId}
                    onChange={(val) => handleFabricSelect(val)}
                    options={fabrics.map((fab) => {
                      const fabStatus = calculateReadyProductSets(fab, {
                        cuttings,
                        masterHandovers,
                        threadCuttingAssignments,
                        invoices,
                        deliveryLogs,
                      });
                      return {
                        value: fab.id,
                        badge: fab.lotNo ? `#${fab.lotNo}` : 'LOT',
                        label: `${fab.fabricType}${fab.color ? ` (${fab.color})` : ''}`,
                        subLabel: `Supplier: ${fab.supplierName || 'General'} • ${
                          fabStatus.totalReadyPieces > 0
                            ? `${fabStatus.totalReadyPieces} PCs Ready`
                            : '0 Ready'
                        }`,
                      };
                    })}
                    placeholder="-- Select Fabric Lot / Batch --"
                    theme="teal"
                  />
                ) : (
                  <input
                    type="text"
                    readOnly
                    value={fabricDisplayName}
                    className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  />
                )}
              </div>

              {/* Supplier Selector */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Recipient Supplier / Client *</span>
                  </label>
                  {activeSupplier?.phone && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Phone className="w-2.5 h-2.5" />
                      <span>{activeSupplier.phone}</span>
                    </span>
                  )}
                </div>
                {suppliers.length > 0 ? (
                  <CustomSelect
                    value={selectedSupplierId}
                    onChange={(val) => setSelectedSupplierId(val)}
                    options={suppliers.map((s) => ({
                      value: s.id,
                      badge: s.category || 'SUPPLIER',
                      label: s.name,
                      subLabel: `${s.phone ? `${s.phone} • ` : ''}${s.paymentTerms || '30 Days'}`,
                    }))}
                    placeholder="-- Select Recipient Supplier --"
                    theme="teal"
                  />
                ) : (
                  <input
                    type="text"
                    readOnly
                    value={activeSupplier?.name || 'Primary Supplier'}
                    className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  />
                )}
              </div>

              {/* Delivered Quantity & Price per Set - Same Row on Mobile & Laptop */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {configuredSubParts.length > 0 ? (
                  /* Multi-Component Garment: Clean Summary Readout */
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 truncate">
                      <PackageCheck className="w-3 h-3 text-teal-600 shrink-0" />
                      <span>Total Dispatched</span>
                    </label>
                    <div className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between border transition-all ${
                      hasExceededAnyComponent || pscNum > totalReadyPieces
                        ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-200'
                        : pscNum === 0
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className={`text-xs font-black truncate ${
                        hasExceededAnyComponent || pscNum > totalReadyPieces
                          ? 'text-rose-600'
                          : pscNum === 0
                            ? 'text-amber-800'
                            : 'text-slate-900'
                      }`}>
                        {pscNum} PCs
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                        hasExceededAnyComponent || pscNum > totalReadyPieces
                          ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                          : 'bg-teal-50 text-teal-700 border-teal-200'
                      }`}>
                        {totalReadyPieces} Ready
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Single Item Garment: Direct Quantity Input */
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 truncate">
                      <PackageCheck className="w-3 h-3 text-teal-600 shrink-0" />
                      <span>Delivered PCs *</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={maxDeliverable > 0 ? maxDeliverable : undefined}
                      value={deliveredPSC}
                      onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                      onChange={(e) => handleDeliveredPSCChange(e.target.value)}
                      placeholder="50"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:border-teal-500 focus:outline-none"
                      required
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 truncate">
                    <DollarSign className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Price / Set (₹) *</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100000"
                    value={pricePerPSC}
                    onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: true })}
                    onChange={(e) => {
                      const sanitized = sanitizeDecimal(e.target.value, { min: 0, max: 100000, maxDecimals: 2 });
                      setPricePerPSC(sanitized);
                    }}
                    placeholder="180"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:border-teal-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* WHICH PIECES ARE BEING DELIVERED - SHORT, SWEET & COMPACT */}
              <div className="p-2.5 sm:p-3 bg-teal-50/50 border border-teal-200/80 rounded-xl sm:rounded-2xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <PackageCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="text-[11px] sm:text-xs font-bold text-teal-950 truncate">
                      Which Pieces Are Being Delivered
                    </span>
                  </div>

                  {configuredSubParts.length > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      {totalReadyPieces > 0 && (
                        <button
                          type="button"
                          onClick={handleApplyAllReady}
                          className="px-2 py-0.5 bg-teal-100 hover:bg-teal-200 text-teal-900 rounded text-[9px] font-bold cursor-pointer transition-colors"
                        >
                          All Ready ({totalReadyPieces})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const cleared = {};
                          configuredSubParts.forEach((sp, idx) => {
                            const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
                            cleared[key] = '0';
                          });
                          setSubPartDeliveries(cleared);
                          setDeliveredPSC('0');
                        }}
                        className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded text-[9px] font-bold cursor-pointer transition-colors"
                      >
                        Clear (0)
                      </button>
                    </div>
                  )}
                </div>

                {configuredSubParts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {configuredSubParts.map((sp, idx) => {
                      const normKey = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
                      const ratio = parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1;
                      const deliveringCount = parseInt(subPartDeliveries[normKey], 10) || 0;
                      const readyCnt = readySetData.subPartReadyPieces?.[normKey] ?? 0;
                      const maxAllowed = readyCnt;
                      const isExceeded = deliveringCount > maxAllowed;
                      const spName = sp.name || sp.id || `Part ${idx + 1}`;

                      return (
                        <div
                          key={sp.id || idx}
                          className={`p-2 rounded-xl border transition-all ${
                            isExceeded
                              ? 'bg-rose-50/80 border-rose-300 shadow-2xs'
                              : deliveringCount > 0
                                ? 'bg-white border-teal-300 shadow-2xs ring-1 ring-teal-200/50'
                                : 'bg-white/80 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                            <span className="text-[11px] font-bold text-slate-800 truncate">
                              {spName} <span className="text-[9px] text-slate-400 font-normal">({ratio}/set)</span>
                            </span>
                            <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 shrink-0">
                              {readyCnt} Ready
                            </span>
                          </div>

                          <div className="pt-1.5 flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSubPartChange(normKey, Math.max(0, deliveringCount - 1), maxAllowed)}
                                disabled={deliveringCount <= 0}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={maxAllowed > 0 ? maxAllowed : 0}
                                value={subPartDeliveries[normKey] ?? ''}
                                onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                                onChange={(e) => handleSubPartChange(normKey, e.target.value, maxAllowed)}
                                placeholder="0"
                                className={`w-12 px-1 py-0.5 text-center rounded-lg text-xs font-black focus:outline-none transition-all ${
                                  isExceeded
                                    ? 'bg-rose-50 border border-rose-500 text-rose-900'
                                    : 'bg-slate-50 border border-slate-300 text-teal-950 focus:bg-white'
                                }`}
                              />
                              <button
                                type="button"
                                disabled={deliveringCount >= maxAllowed}
                                onClick={() => handleSubPartChange(normKey, Math.min(maxAllowed, deliveringCount + 1), maxAllowed)}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSubPartChange(normKey, 0, maxAllowed)}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                                  deliveringCount === 0
                                    ? 'bg-slate-700 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                0
                              </button>
                              {readyCnt > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSubPartChange(normKey, readyCnt, maxAllowed)}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                                    deliveringCount === readyCnt
                                      ? 'bg-teal-600 text-white'
                                      : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                                  }`}
                                >
                                  Max ({readyCnt})
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white p-2 rounded-xl border border-teal-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        {fabricDisplayName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {maxDeliverable} PCs verified ready for delivery
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Delivering</span>
                      <span className="text-xs font-black text-teal-700">
                        {pscNum} PCs
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Date & Payment Due Date - Same Row on Mobile and Desktop */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 truncate">
                    <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>Delivery Date *</span>
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 truncate">
                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>Payment Due Date</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Vehicle / Challan & Delivery Notes - Same Row on Mobile and Desktop */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 truncate">
                    <Truck className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>Vehicle / Challan No.</span>
                  </label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="e.g. GJ-05-AB-1234"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 truncate">
                    <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>Dispatch Notes</span>
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Sent via Tempo"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="p-3 sm:p-3.5 border-t border-slate-100 bg-slate-50 flex items-center gap-2 shrink-0 sticky bottom-0">
              <button
                type="button"
                onClick={onClose}
                className="w-20 sm:w-28 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  pscNum <= 0 ||
                  hasExceededAnyComponent ||
                  totalReadyPieces <= 0 ||
                  pscNum > totalReadyPieces
                }
                className="flex-1 py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-md shadow-teal-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-0"
              >
                <Truck className="w-4 h-4 shrink-0" />
                <span className="truncate">Confirm Delivery & Log</span>
                {pscNum > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-700/90 text-white text-[10px] font-black shrink-0">
                    {pscNum} PCs {configuredSubParts.length > 0 && calculatedCompleteSets > 0 ? `(${calculatedCompleteSets} Sets)` : ''}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
