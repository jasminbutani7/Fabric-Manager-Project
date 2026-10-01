import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Scissors,
  Cog,
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { useFabric, useFactory, useProduction } from '../../context/useManagement';
import { useAuth } from '../../context/useAuth';
import AlertModal from './AlertModal';
import {
  resolvePieceLabel,
  getNormalizedCutPiecesList,
  getPieceValueFromObject,
  isEntityArchived,
} from '../../utils/productUtils';
import { sanitizeInteger, blockInvalidNumberKeys } from '../../utils/formValidation';
import CustomSelect from '../common/CustomSelect';

const EMPTY_OBJECT = Object.freeze({});

function AssignTailorDialog({
  onClose,
  initialCuttingId = null,
  fabricId = null,
  initialFabricId = null,
  masterId = null,
  isMasterView = false,
  onSuccess = null,
}) {
  const { cuttings = [], fabrics = [], getCuttingBalance, getFabricBalance } = useFabric();
  const { machines = [], tailors = [] } = useFactory();
  const { addTailorAssignment } = useProduction();
  const { currentUser } = useAuth();
  const isMaster = isMasterView || currentUser?.role === 'Master';
  const effectiveMasterId = masterId || (isMaster ? currentUser?.id : null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Candidates for this view (filtered for Master if in Master view)
  const candidateFabrics = useMemo(() => {
    let list = fabrics.filter((f) => !isEntityArchived(f, fabrics) || f.id === initialFabricId || f.id === fabricId);
    const initialCutting = initialCuttingId ? cuttings.find((c) => c.id === initialCuttingId) : null;
    const initialCuttingFabricId = initialCutting?.fabricId;

    if (isMaster && effectiveMasterId) {
      const masterCuttingFabricIds = new Set(
        cuttings.filter((c) => !isEntityArchived(c, fabrics) && c.masterId === effectiveMasterId).map((c) => c.fabricId)
      );
      list = list.filter(
        (f) =>
          masterCuttingFabricIds.has(f.id) ||
          f.user_id === currentUser?.id ||
          f.id === initialFabricId ||
          f.id === fabricId ||
          f.id === initialCuttingFabricId
      );
    }
    // Filter out fabric lots where all cut pieces are already assigned to tailors
    return list.filter((f) => {
      // If modal was explicitly opened for this fabric, include it so the modal can show its current/assigned state
      if (f.id === fabricId || f.id === initialFabricId || f.id === initialCuttingFabricId) return true;
      if (getFabricBalance) {
        const b = getFabricBalance(f.id);
        if (b && b.totalCutPieces > 0 && (b.isFullyAssigned || b.totalRemainingPieces <= 0)) {
          return false;
        }
      }
      return true;
    });
  }, [fabrics, cuttings, isMaster, effectiveMasterId, currentUser, initialFabricId, fabricId, initialCuttingId, getFabricBalance]);

  // Default selection: auto-select fabric lot when available
  const [formData, setFormData] = useState(() => {
    let defaultFabricId = fabricId || initialFabricId || '';
    if (!defaultFabricId && initialCuttingId) {
      const c = cuttings.find((item) => item.id === initialCuttingId);
      if (c) defaultFabricId = c.fabricId;
    }
    if (!defaultFabricId && candidateFabrics.length > 0) {
      defaultFabricId = candidateFabrics[0]?.id || '';
    }
    const findBestCutting = (fId) => {
      if (!fId) return '';
      const fCuts = cuttings.filter((c) => c.fabricId === fId);
      if (fCuts.length === 0) return '';
      if (getCuttingBalance) {
        const readyCut = fCuts.find((c) => (getCuttingBalance(c.id)?.remaining?.total || 0) > 0);
        if (readyCut) return readyCut.id;
      }
      return fCuts[fCuts.length - 1].id;
    };

    const defaultCuttingId =
      initialCuttingId ||
      findBestCutting(defaultFabricId) ||
      '';

    return {
      fabricId: defaultFabricId,
      cuttingId: defaultCuttingId,
      allocationMode: 'by_machine', // 'by_machine' | 'by_tailor'
      machineId: '',
      tailorId: '',
      partQuantities: {}, // { [subPartId]: string }
      assignDate: todayStr,
      dueDate: '',
      notes: '',
    };
  });

  // Auto-select first candidate fabric if not yet selected
  useEffect(() => {
    if (!formData.fabricId && candidateFabrics.length > 0) {
      const defaultId = candidateFabrics[0].id;
      const fCuts = cuttings.filter((c) => c.fabricId === defaultId);
      // oxlint-disable-next-line react/set-state-in-effect
      setFormData((prev) => ({
        ...prev,
        fabricId: defaultId,
        cuttingId: fCuts[0]?.id || '',
      }));
    }
  }, [candidateFabrics, formData.fabricId, cuttings]);

  // Keep cuttingId synced whenever fabricId changes or loads
  useEffect(() => {
    if (formData.fabricId) {
      const currentBelongsToFabric = cuttings.some(
        (c) => c.id === formData.cuttingId && c.fabricId === formData.fabricId
      );
      if (!currentBelongsToFabric) {
        const fCuts = cuttings.filter((c) => c.fabricId === formData.fabricId);
        if (fCuts.length > 0) {
          const readyCut = getCuttingBalance ? fCuts.find((c) => (getCuttingBalance(c.id)?.remaining?.total || 0) > 0) : null;
          const targetCut = readyCut || fCuts[fCuts.length - 1];
          // oxlint-disable-next-line react/set-state-in-effect
          setFormData((prev) => ({ ...prev, cuttingId: targetCut.id }));
        }
      }
    }
  }, [formData.fabricId, cuttings, formData.cuttingId, getCuttingBalance]);

  // Calculate current balance for selected Fabric Lot directly
  const balance = useMemo(() => {
    if (formData.fabricId && getFabricBalance) {
      return getFabricBalance(formData.fabricId);
    }
    if (formData.cuttingId && getCuttingBalance) {
      return getCuttingBalance(formData.cuttingId);
    }
    return null;
  }, [formData.fabricId, formData.cuttingId, getFabricBalance, getCuttingBalance]);

  // Check if selected fabric or cutting is already fully assigned to tailors
  const isFabricAlreadyFullyAssigned = useMemo(() => {
    if (!balance) return false;
    if (balance.isFullyAssigned) return true;
    if (
      balance.totalCutPieces > 0 &&
      (balance.totalRemainingPieces ?? balance.remaining?.total ?? 0) <= 0
    ) {
      return true;
    }
    return false;
  }, [balance]);

  const fabric = balance?.fabric || fabrics.find((f) => f.id === formData.fabricId);
  const fabricCuttings = balance?.cuttings || cuttings.filter((c) => c.fabricId === (formData.fabricId || fabric?.id));
  const cutting = fabricCuttings[0] || (formData.cuttingId ? cuttings.find((c) => c.id === formData.cuttingId) : null);
  const productName = fabric?.productName || cutting?.productName || 'Garment';
  const tailorRates = fabric?.tailorRates || cutting?.tailorRates || EMPTY_OBJECT;

  // Filter active tailors and active machines for allocation
  const activeTailors = tailors.filter((t) => t.status !== 'Left');
  const activeMachines = machines.filter((m) => !m.status || m.status === 'Active');

  // Dynamically derive sub-parts list based on configured Product Structure
  const subPartsList = useMemo(() => {
    if (!fabric && !cutting) return [];
    const struct = fabric?.productStructure || cutting?.productStructure;
    const subParts = struct?.subParts || [];

    if (Array.isArray(subParts) && subParts.length > 0) {
      return subParts.map((sp) => {
        const spId = sp.id || sp.name;
        const name = sp.name || 'Sub-Part';
        const spDerivedId = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : '';

        // Check available count in balance.availableSubParts (by id, by name, by slug, or via getPieceValueFromObject)
        const avail =
          balance?.availableSubParts?.[spId] !== undefined
            ? balance.availableSubParts[spId]
            : balance?.availableSubParts?.[name] !== undefined
              ? balance.availableSubParts[name]
              : balance?.availableSubParts?.[name.toLowerCase()] !== undefined
                ? balance.availableSubParts[name.toLowerCase()]
                : spDerivedId && balance?.availableSubParts?.[spDerivedId] !== undefined
                  ? balance.availableSubParts[spDerivedId]
                  : (getPieceValueFromObject(balance?.availableSubParts || {}, name, spId) || 0);

        const rate =
          parseFloat(tailorRates?.[spId]) ||
          parseFloat(tailorRates?.[name]) ||
          parseFloat(sp.rate) ||
          0;

        const comps = Array.isArray(sp.components) ? sp.components : [];
        const fullRatioText =
          comps.length > 0
            ? comps.map((c) => `${c.qty || 1} ${resolvePieceLabel(c.name, struct)}`).join(' + ')
            : name;

        const compactRatioText =
          comps.length > 0
            ? comps.map((c) => `${c.qty || 1}${resolvePieceLabel(c.name, struct).charAt(0)}`).join('+')
            : name;

        return {
          id: spId,
          name,
          avail: Math.max(0, avail),
          rate,
          fullRatioText,
          compactRatioText,
          components: comps,
        };
      });
    }

    // Fallback if no explicit subParts array configured: map dynamically from norm cut pieces across all fabric cuttings
    const aggregatedFabricCutPieces = {};
    fabricCuttings.forEach((c) => {
      if (c.cutPieces && typeof c.cutPieces === 'object') {
        Object.entries(c.cutPieces).forEach(([k, v]) => {
          const val = parseInt(v, 10) || 0;
          if (val > 0) {
            aggregatedFabricCutPieces[k] = (aggregatedFabricCutPieces[k] || 0) + val;
          }
        });
      }
    });
    const combinedCutting = {
      ...(cutting || fabricCuttings[0] || {}),
      cutPieces: Object.keys(aggregatedFabricCutPieces).length > 0
        ? aggregatedFabricCutPieces
        : (cutting?.cutPieces || {}),
    };
    const norm = getNormalizedCutPiecesList(combinedCutting, fabric);
    const fallbackParts = [];
    if (norm.length > 0) {
      norm.forEach((item) => {
        const itemRem = balance?.availableSubParts?.[item.key] ?? balance?.remaining?.[item.key] ?? item.val;
        fallbackParts.push({
          id: item.key.toLowerCase(),
          name: item.label,
          avail: Math.max(0, itemRem),
          rate: parseFloat(tailorRates?.[item.key]) || 25,
          compactRatioText: `1 ${item.label}`,
          fullRatioText: `1 ${item.label}`,
          components: [{ name: item.label, qty: 1 }],
        });
      });
    } else {
      const availSets = Math.max(0, balance?.availableSets || cutting?.totalSets || cutting?.totalPieces || 0);
      fallbackParts.push({
        id: 'piece',
        name: productName || 'Garment PC',
        avail: availSets,
        rate: parseFloat(tailorRates?.ratePerPiece) || 40,
        compactRatioText: '1 PC',
        fullRatioText: '1 PC',
        components: [{ name: productName || 'PC', qty: 1 }],
      });
    }

    return fallbackParts;
  }, [cutting, fabric, balance, tailorRates, productName, fabricCuttings]);

  const totalAvailableSubPartsCount = useMemo(() => {
    return subPartsList.reduce((acc, p) => acc + p.avail, 0);
  }, [subPartsList]);

  const hasAnyAvailable = totalAvailableSubPartsCount > 0;

  const partQuantities = formData.partQuantities || EMPTY_OBJECT;

  const totalAssignedSubParts = useMemo(() => {
    return Object.values(partQuantities).reduce(
      (acc, v) => acc + (parseInt(v, 10) || 0),
      0
    );
  }, [partQuantities]);

  const { totalAssignedPieces, pieceBreakdownText, assignedPiecesMap, assignedSubPartsMap } = useMemo(() => {
    let pieceSum = 0;
    const piecesMap = {};
    const subPartsMap = {};
    const breakdownParts = [];

    subPartsList.forEach((sp) => {
      const q = parseInt(partQuantities[sp.id], 10) || 0;
      if (q <= 0) return;

      subPartsMap[sp.id] = q;

      if (sp.components && sp.components.length > 0) {
        sp.components.forEach((c) => {
          const compQty = (parseInt(c.qty, 10) || 1) * q;
          pieceSum += compQty;
          const compName = c.name || 'Piece';
          const targetKey = c.id || compName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          piecesMap[targetKey] = (piecesMap[targetKey] || 0) + compQty;
          breakdownParts.push(`${compQty} ${compName}`);
        });
      } else {
        pieceSum += q;
        const spName = sp.name || 'Piece';
        const targetKey = sp.id || spName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        piecesMap[targetKey] = (piecesMap[targetKey] || 0) + q;
        breakdownParts.push(`${q} ${spName}`);
      }
    });

    return {
      totalAssignedPieces: pieceSum,
      pieceBreakdownText: breakdownParts.join(' + '),
      assignedPiecesMap: piecesMap,
      assignedSubPartsMap: subPartsMap,
    };
  }, [subPartsList, partQuantities]);

  const estimatedPayout = useMemo(() => {
    return subPartsList.reduce((sum, sp) => {
      const q = parseInt(partQuantities[sp.id], 10) || 0;
      return sum + q * sp.rate;
    }, 0);
  }, [subPartsList, partQuantities]);

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
  });

  // Selected Machine operator derivation
  const selectedMachine = machines.find((m) => m.id === formData.machineId);
  const operatorOfSelectedMachine = selectedMachine?.assignedTailorId
    ? tailors.find((t) => t.id === selectedMachine.assignedTailorId)
    : null;

  // Selected Tailor machine derivation
  const selectedTailor = tailors.find((t) => t.id === formData.tailorId);
  const machineOfSelectedTailor = selectedTailor?.assignedMachineId
    ? machines.find((m) => m.id === selectedTailor.assignedMachineId)
    : null;

  const handleStepPart = (spId, delta, maxAvail) => {
    if (!balance) return;
    const current = parseInt(partQuantities[spId], 10) || 0;
    const next = delta > 0 ? Math.min(maxAvail, current + delta) : Math.max(0, current + delta);
    setFormData((prev) => ({
      ...prev,
      partQuantities: {
        ...prev.partQuantities,
        [spId]: next > 0 ? String(next) : '',
      },
    }));
  };

  const handleSetExact = (spId, qty, maxAvail) => {
    if (!balance) return;
    const clamped = Math.max(0, Math.min(maxAvail, qty));
    setFormData((prev) => ({
      ...prev,
      partQuantities: {
        ...prev.partQuantities,
        [spId]: clamped > 0 ? String(clamped) : '',
      },
    }));
  };

  const handleAddDelta = (spId, delta, maxAvail) => {
    const current = parseInt(partQuantities[spId], 10) || 0;
    handleSetExact(spId, current + delta, maxAvail);
  };

  const handleFillMaxPart = (spId, maxAvail) => {
    handleSetExact(spId, maxAvail, maxAvail);
  };

  const handleClearQuantities = () => {
    setFormData((prev) => ({
      ...prev,
      partQuantities: {},
    }));
  };

  const rawBalanceSummaryText = useMemo(() => {
    if (!balance) return '';
    const norm = getNormalizedCutPiecesList(cutting, fabric);
    if (norm.length > 0) {
      return norm
        .map(
          (item) =>
            `${balance.remaining?.[item.key] !== undefined ? balance.remaining[item.key] : item.val} ${item.label}`
        )
        .join(' • ');
    }
    if (balance.remaining && typeof balance.remaining === 'object') {
      const entries = Object.entries(balance.remaining);
      if (entries.length > 0) {
        return entries.map(([k, v]) => `${v} ${resolvePieceLabel(k)}`).join(' • ');
      }
    }
    return '0 Cut PCs remaining';
  }, [balance, cutting, fabric]);

  // Validation state for submit button
  const effectiveCuttingId = formData.cuttingId || fabricCuttings[0]?.id;
  const isAllocationTargetValid =
    formData.allocationMode === 'by_machine'
      ? Boolean(operatorOfSelectedMachine)
      : Boolean(formData.tailorId);
  const isSubmitDisabled =
    isFabricAlreadyFullyAssigned ||
    !effectiveCuttingId ||
    !isAllocationTargetValid ||
    totalAssignedSubParts <= 0;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isFabricAlreadyFullyAssigned) {
      setAlertModal({
        isOpen: true,
        title: 'Fabric Lot Already Assigned',
        message: 'All Cut PCs for this fabric lot have already been assigned to tailors. Once assigned, pieces cannot be re-assigned.',
        type: 'warning',
      });
      return;
    }

    if (!formData.fabricId && !formData.cuttingId) {
      setAlertModal({
        isOpen: true,
        title: 'Fabric Lot Required',
        message: 'Please select a fabric lot to allocate pieces from.',
        type: 'warning',
      });
      return;
    }

    if (totalAssignedSubParts <= 0) {
      setAlertModal({
        isOpen: true,
        title: 'PC Quantity Required',
        message: 'Please specify the quantity of PCs to assign to this tailor.',
        type: 'warning',
      });
      return;
    }

    if (balance) {
      for (const sp of subPartsList) {
        const entered = parseInt(partQuantities[sp.id], 10) || 0;
        if (entered > sp.avail) {
          setAlertModal({
            isOpen: true,
            title: 'Quantity Exceeded Available PCs',
            message: `You entered ${entered} ${sp.name}, but only ${sp.avail} ${sp.name} PCs are available in this fabric lot.`,
            type: 'warning',
          });
          return;
        }
      }
    }

    // Determine final tailorId and machineId
    let targetMachineId = null;
    let targetTailorId = null;

    if (formData.allocationMode === 'by_machine') {
      if (!formData.machineId) {
        setAlertModal({
          isOpen: true,
          title: 'Machine Number Required',
          message: 'Please select a machine number to allocate these pieces.',
          type: 'warning',
        });
        return;
      }
      if (!operatorOfSelectedMachine) {
        setAlertModal({
          isOpen: true,
          title: 'No Tailor Assigned to Machine',
          message: `Machine ${selectedMachine?.code} does not have a linked tailor operator. Please select "By Tailor Name" or assign an operator to this machine in Setup.`,
          type: 'warning',
        });
        return;
      }
      targetMachineId = formData.machineId;
      targetTailorId = operatorOfSelectedMachine.id;
    } else {
      if (!formData.tailorId) {
        setAlertModal({
          isOpen: true,
          title: 'Tailor Required',
          message: 'Please select a tailor to allocate these pieces.',
          type: 'warning',
        });
        return;
      }
      targetTailorId = formData.tailorId;
      targetMachineId = machineOfSelectedTailor ? machineOfSelectedTailor.id : null;
    }

    const tailorRatesForAssignment = {
      ...(fabric?.tailorRates || cutting?.tailorRates || {}),
    };
    subPartsList.forEach((sp) => {
      if (sp.rate > 0) {
        if (sp.id) tailorRatesForAssignment[sp.id] = sp.rate;
        if (sp.name) tailorRatesForAssignment[sp.name] = sp.rate;
      }
    });

    const targetCuttingId = formData.cuttingId || fabricCuttings[0]?.id || null;

    const result = addTailorAssignment({
      fabricId: formData.fabricId || fabric?.id,
      cuttingId: targetCuttingId,
      masterId: effectiveMasterId,
      allocationMode: formData.allocationMode,
      machineId: targetMachineId,
      tailorId: targetTailorId,
      assignedSubParts: assignedSubPartsMap,
      assignedPieces: assignedPiecesMap,
      allocatedParts: subPartsList.map((sp) => sp.name),
      totalAssignedPieces,
      tailorRates: tailorRatesForAssignment,
      assignDate: formData.assignDate,
      dueDate: formData.dueDate,
      notes: formData.notes,
    });

    if (result && result.success) {
      if (onSuccess) onSuccess(result.assignment);
      onClose();
    } else {
      setAlertModal({
        isOpen: true,
        title: 'Assignment Blocked',
        message: result?.error || 'Failed to allocate pieces to tailor.',
        type: 'error',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom sm:zoom-in-95 text-left"
        role="dialog"
        aria-modal="true"
      >
        {/* Header (Sticky Top) */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  Assign PCs to Tailor
                </h2>
                <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Floor Allocation
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">
                Allocate PC bundles to machines & tailors with real-time stock
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form with Scrollable Body and Sticky Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-left">
          <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto flex-1 min-h-0">
            {/* SECTION 1: Select Fabric Lot (Compact & Simple) */}
            {fabric || cutting ? (
              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/90 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-extrabold text-slate-900 truncate">
                      {fabric?.fabricName || cutting?.fabricName || 'Fabric Lot'}
                      {fabric?.color ? ` (${fabric.color})` : ''}
                    </span>
                    {(fabric?.lotNo || fabric?.lotNumber) && (
                      <span className="text-[9px] font-black bg-white text-indigo-800 border border-indigo-200 px-1.5 py-0.2 rounded shrink-0">
                        #{fabric?.lotNo || fabric?.lotNumber}
                      </span>
                    )}
                    <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 shrink-0">
                      {productName}
                    </span>
                  </div>
                  {balance && (
                    <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full shrink-0">
                      {balance.totalRemainingPieces ?? balance.remaining?.total ?? 0} unassigned Cut PCs left
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 pt-0.5">
                  <span>Lot Target: <strong className="text-slate-800">{fabric?.printPieces || cutting?.printPieces || '—'} Sets</strong></span>
                  <span>Logged Cut: <strong className="text-indigo-700">{balance?.totalCutPieces || 0} Cut PCs</strong></span>
                  {candidateFabrics.length > 1 && (
                    <select
                      value={formData.fabricId}
                      onChange={(e) => {
                        const newFabId = e.target.value;
                        const matchingCuttings = cuttings.filter((c) => c.fabricId === newFabId);
                        setFormData((prev) => ({
                          ...prev,
                          fabricId: newFabId,
                          cuttingId: matchingCuttings[0]?.id || '',
                          partQuantities: {},
                        }));
                      }}
                      className="text-[10px] font-bold text-indigo-600 bg-white border border-indigo-200 rounded px-1.5 py-0.5 cursor-pointer focus:outline-none"
                    >
                      {candidateFabrics.map((f) => (
                        <option key={f.id} value={f.id}>
                          Switch Lot: #{f.lotNo || 'LOT'} - {f.fabricName || f.lotNo}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ) : candidateFabrics.length === 0 ? (
              <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs border border-amber-200 font-medium">
                {isMaster
                  ? 'No fabric lots found. Please record fabric cutting first.'
                  : 'No fabric lots available in factory.'}
              </div>
            ) : null}

            {/* Already Fully Assigned Alert Banner */}
            {isFabricAlreadyFullyAssigned && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-[11px]">Fabric Lot Already Assigned</strong>
                  <p className="text-[10px] text-amber-800 mt-0.5 leading-tight">
                    All Cut PCs for this fabric lot have already been assigned to tailors. Once assigned, pieces cannot be re-assigned.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 2: Floor Allocation Target (Light Color & Proper Contrast) */}
            <div className="p-3 sm:p-3.5 bg-slate-50/50 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-slate-500" />
                  <span>2. Assign To Sewing Machine / Tailor *</span>
                </label>

                {/* Segmented Mode Toggle (Light Slate Style) */}
                <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, allocationMode: 'by_machine' })}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${formData.allocationMode === 'by_machine'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    ⚙️ By Machine No.
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, allocationMode: 'by_tailor' })}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${formData.allocationMode === 'by_tailor'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    👤 By Tailor Name
                  </button>
                </div>
              </div>

              {formData.allocationMode === 'by_machine' ? (
                <div className="space-y-2">
                  {activeMachines.length === 0 ? (
                    <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs border border-amber-200">
                      No active sewing machines found in Setup.
                    </div>
                  ) : (
                    <CustomSelect
                      value={formData.machineId}
                      onChange={(val) => setFormData({ ...formData, machineId: val })}
                      options={activeMachines.map((m) => {
                        const op = tailors.find((t) => t.id === m.assignedTailorId);
                        return {
                          value: m.id,
                          badge: m.code,
                          label: m.name,
                          subLabel: op ? `Operator: ${op.name}` : 'No Operator Linked',
                        };
                      })}
                      placeholder="-- Select Machine Number --"
                      theme="neutral"
                    />
                  )}

                  {/* Machine Operator Preview Card (Light Color) */}
                  {!formData.machineId ? (
                    <div className="p-2.5 bg-white/80 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      Select a machine number above to auto-link its assigned tailor operator.
                    </div>
                  ) : operatorOfSelectedMachine ? (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                          {operatorOfSelectedMachine.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-xs">
                              {operatorOfSelectedMachine.name}
                            </span>
                            {operatorOfSelectedMachine.phone && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                ({operatorOfSelectedMachine.phone})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate">
                            Op Machine: <strong className="text-slate-700">{selectedMachine?.code} ({selectedMachine?.name})</strong>
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-50 text-slate-700 text-[10px] font-bold rounded-full border border-slate-200 shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Auto-Linked</span>
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-amber-950 font-medium text-xs">
                          No tailor is linked to machine {selectedMachine?.code}.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, allocationMode: 'by_tailor' }))}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer transition-all"
                      >
                        Choose Tailor
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {activeTailors.length === 0 ? (
                    <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs border border-amber-200">
                      No active tailors found in Setup.
                    </div>
                  ) : (
                    <CustomSelect
                      value={formData.tailorId}
                      onChange={(val) => setFormData({ ...formData, tailorId: val })}
                      options={activeTailors.map((t) => {
                        const mach = machines.find((m) => m.id === t.assignedMachineId);
                        return {
                          value: t.id,
                          badge: mach ? mach.code : 'FLOAT',
                          label: t.name,
                          subLabel: `${t.phone || 'No phone'}${mach ? ` • Machine ${mach.code}` : ' • Standby Float'}`,
                        };
                      })}
                      placeholder="-- Select Tailor Name --"
                      theme="neutral"
                    />
                  )}

                  {!formData.tailorId ? (
                    <div className="p-2.5 bg-white/80 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      Select a tailor name above to link their operating machine.
                    </div>
                  ) : (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                          <Cog className="w-3.5 h-3.5 text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-xs truncate">
                              {machineOfSelectedTailor
                                ? `${machineOfSelectedTailor.code} - ${machineOfSelectedTailor.name}`
                                : 'Free Roaming / Any Machine'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate">
                            Tailor: {selectedTailor?.name} ({selectedTailor?.phone || 'No phone'})
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${machineOfSelectedTailor
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                      >
                        {machineOfSelectedTailor ? 'Linked Machine' : 'No Fixed Machine'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 3: Sub-Parts Quantity Allocation (Simple & Compact Size) */}
            <div className="p-3 sm:p-3.5 bg-slate-50/50 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3. Allocate PCs to Tailor ({productName}) *</span>
                </label>

                {totalAssignedSubParts > 0 && (
                  <button
                    type="button"
                    onClick={handleClearQuantities}
                    className="text-[10px] font-bold text-slate-500 hover:text-rose-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                    title="Clear entered quantities"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {!formData.fabricId && !formData.cuttingId ? (
                <div className="p-5 bg-white/80 rounded-xl border border-dashed border-slate-200 text-center space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    Select a Fabric Lot in Step 1
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Choose a fabric lot above to load cut stock and assign pieces.
                  </p>
                </div>
              ) : !hasAnyAvailable ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>No Complete PCs Available in This Batch</span>
                  </div>
                  <p className="text-[10px] text-amber-700">
                    All complete PCs for this batch have already been assigned to tailors.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {subPartsList.map((sp) => {
                    const enteredQty = parseInt(partQuantities[sp.id], 10) || 0;
                    const isOver = enteredQty > sp.avail;

                    // Zero cut in stock - slim 1-line tag
                    if (sp.avail === 0) {
                      return (
                        <div
                          key={sp.id}
                          className="py-1.5 px-2.5 bg-slate-50/80 rounded-lg border border-dashed border-slate-200 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-bold text-slate-600 truncate">{sp.name}</span>
                            {sp.compactRatioText && (
                              <span className="text-[9px] font-semibold text-slate-400 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                {sp.compactRatioText}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              • 0 in stock (Requires cut)
                            </span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            Pending Cut
                          </span>
                        </div>
                      );
                    }

                    // Available for allocation - compact size
                    return (
                      <div
                        key={sp.id}
                        className={`p-2 sm:p-2.5 bg-white rounded-xl border shadow-2xs space-y-1.5 transition-all ${
                          isOver
                            ? 'border-rose-300 ring-2 ring-rose-100'
                            : enteredQty > 0
                              ? 'border-indigo-300 ring-1 ring-indigo-100 bg-indigo-50/10'
                              : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Header row */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-900">{sp.name}</span>
                            <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">
                              1 PC = {sp.fullRatioText}
                            </span>
                            {!isMaster && sp.rate > 0 && (
                              <span className="text-[9px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded">
                                ₹{sp.rate}/PC
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">
                            Ready: <strong className="text-emerald-700 font-extrabold">{sp.avail} PCs</strong>
                          </span>
                        </div>

                        {/* Controls row */}
                        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-100">
                          {/* Quick Chips */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {sp.avail >= 25 && (
                              <button
                                type="button"
                                onClick={() => handleAddDelta(sp.id, 25, sp.avail)}
                                disabled={enteredQty >= sp.avail || isFabricAlreadyFullyAssigned}
                                className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 disabled:opacity-30 active:scale-95 transition-all cursor-pointer"
                              >
                                +25
                              </button>
                            )}
                            {sp.avail >= 50 && (
                              <button
                                type="button"
                                onClick={() => handleAddDelta(sp.id, 50, sp.avail)}
                                disabled={enteredQty >= sp.avail || isFabricAlreadyFullyAssigned}
                                className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 disabled:opacity-30 active:scale-95 transition-all cursor-pointer"
                              >
                                +50
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleFillMaxPart(sp.id, sp.avail)}
                              disabled={sp.avail <= 0 || enteredQty >= sp.avail || isFabricAlreadyFullyAssigned}
                              className={`px-2 py-0.5 text-[10px] font-extrabold rounded border transition-all cursor-pointer active:scale-95 disabled:opacity-30 ${
                                enteredQty === sp.avail
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              Max ({sp.avail})
                            </button>
                            {enteredQty > 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetExact(sp.id, 0, sp.avail)}
                                disabled={isFabricAlreadyFullyAssigned}
                                className="px-1.5 py-0.5 text-[10px] font-bold rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          {/* Stepper */}
                          <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStepPart(sp.id, -1, sp.avail)}
                              disabled={enteredQty <= 0 || isFabricAlreadyFullyAssigned}
                              className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 disabled:opacity-30 border border-slate-200 active:scale-95 transition-all cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <input
                              type="number"
                              min="0"
                              max={sp.avail}
                              placeholder="0"
                              disabled={isFabricAlreadyFullyAssigned || sp.avail <= 0}
                              value={partQuantities[sp.id] || ''}
                              onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                              onChange={(e) => {
                                const sanitized = sanitizeInteger(e.target.value, { min: 0, max: sp.avail });
                                setFormData((prev) => ({
                                  ...prev,
                                  partQuantities: {
                                    ...prev.partQuantities,
                                    [sp.id]: sanitized,
                                  },
                                }));
                              }}
                              className={`w-11 py-0.5 text-center font-bold text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 ${
                                isOver ? 'text-rose-600 font-bold border-rose-300' : 'text-slate-900'
                              }`}
                            />

                            <button
                              type="button"
                              onClick={() => handleStepPart(sp.id, 1, sp.avail)}
                              disabled={enteredQty >= sp.avail || isFabricAlreadyFullyAssigned}
                              className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 disabled:opacity-30 border border-slate-200 active:scale-95 transition-all cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Subpart Allocation Feedback */}
                        {enteredQty > 0 && (
                          <div className="text-[10px] font-semibold text-indigo-900 bg-indigo-50/70 px-2 py-0.5 rounded border border-indigo-100 flex items-center justify-between">
                            <span>
                              Allocating <strong>{enteredQty} {sp.name} PCs</strong> ({enteredQty * (sp.components?.reduce((s, c) => s + (parseInt(c.qty, 10) || 1), 0) || 1)} Cut PCs)
                            </span>
                            {!isMaster && sp.rate > 0 && (
                              <span className="font-bold text-slate-600">
                                ₹{(enteredQty * sp.rate).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 4: Dates & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Assign Date *</span>
                </label>
                <input
                  type="date"
                  value={formData.assignDate}
                  onChange={(e) => setFormData({ ...formData, assignDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Target Due Date (Optional)</span>
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Stitching Instructions */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Stitching Instructions / Notes (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Urgent lot, attach brand tags, priority stitching..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            {/* Live Handover Summary Strip */}
            {totalAssignedSubParts > 0 && (
              <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white rounded-2xl border border-emerald-200 shadow-2xs flex items-center justify-between gap-3 flex-wrap text-xs animate-in fade-in">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-[10px] text-emerald-800 font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-100 rounded-md">
                    Handover
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-900">
                    {totalAssignedSubParts} PCs ({totalAssignedPieces} Cut PCs: {pieceBreakdownText})
                  </span>
                </div>
                {!isMaster && estimatedPayout > 0 && (
                  <span className="text-xs sm:text-sm font-black text-emerald-800 shrink-0">
                    ₹{estimatedPayout.toLocaleString('en-IN')} Est. Payout
                  </span>
                )}
              </div>
            )}

          </div>

          {/* 100% STICKY BOTTOM FOOTER (Mobile Touch Friendly) */}
          <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2 sm:justify-end flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-[2] sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-0"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {isFabricAlreadyFullyAssigned
                  ? 'Already Assigned'
                  : 'Confirm Allocation'}
              </span>
              {totalAssignedSubParts > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-white text-[10px] font-black shrink-0">
                  {totalAssignedSubParts} PCs
                </span>
              )}
            </button>
          </div>
        </form>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}

export default function AssignTailorModal(props) {
  if (!props.isOpen) return null;
  return <AssignTailorDialog {...props} />;
}
