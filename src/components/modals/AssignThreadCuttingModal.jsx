import React, { useState } from 'react';
import {
  X,
  Scissors,
  IndianRupee,
  Briefcase,
  Calendar,
  FileText,
  AlertTriangle,
  Plus,
  Layers,
  DollarSign,
  Truck,
} from 'lucide-react';
import { useFabric, useFactory, useProduction } from '../../context/useManagement';
import AlertModal from './AlertModal';
import AddHelperModal from './AddHelperModal';
import { sanitizeInteger, sanitizeDecimal, blockInvalidNumberKeys } from '../../utils/formValidation';
import { isEntityArchived } from '../../utils/productUtils';
import CustomSelect from '../common/CustomSelect';

export default function AssignThreadCuttingModal({
  isOpen,
  onClose,
  onSuccess,
  initialCuttingId = null,
  initialHandoverId = null,
  initialSubPart = null,
  initialQuantity = null,
  initialSubPartQuantities = null,
  initialMode = 'assign', // 'assign' | 'skip'
}) {
  const { cuttings = [], fabrics = [] } = useFabric();
  const { helpers = [] } = useFactory();
  const {
    assignThreadCutting,
    setFabricThreadCuttingDecision,
    getThreadCuttingStats,
  } = useProduction();

  const todayStr = new Date().toISOString().split('T')[0];

  // Group available verified targets ONLY by Fabric Lot (not batch-wise)
  const assignmentTargets = [];
  const processedFabricIds = new Set();

  fabrics.forEach((f) => {
    if (isEntityArchived(f, fabrics) && f.id !== initialCuttingId) return;
    const fStats = getThreadCuttingStats(f.id);
    const linkedCuttings = cuttings.filter((c) => (c.fabricId || c.fabric_id) === f.id);
    const isTargetMatch =
      f.id === initialCuttingId ||
      linkedCuttings.some((c) => c.id === initialCuttingId);
    const totalSubPartsAvail = Object.values(fStats?.subPartStats || {}).reduce(
      (acc, sp) => acc + (sp.available || 0),
      0
    );
    const hasAvailable =
      (fStats?.availableToAssignPSC || 0) > 0 || totalSubPartsAvail > 0;
    if (!hasAvailable && !isTargetMatch) return;

    processedFabricIds.add(f.id);
    const fName = f.productName || f.fabricType || 'Fabric Lot';
    const effectiveAvailPSC = Math.max(fStats?.availableToAssignPSC || 0, totalSubPartsAvail || 0);

    // ONLY Fabric Lot wise selection (no individual batches)
    assignmentTargets.push({
      id: f.id,
      isFabricLot: true,
      fabricId: f.id,
      fabricName: fName,
      color: f.color,
      lotNo: f.lotNo ?? f.lotNumber ?? f.lot_no,
      label: `${fName}${f.color ? ` (${f.color})` : ''} • ${effectiveAvailPSC} verified PSC ready`,
      availableToAssignPSC: effectiveAvailPSC,
      totalVerifiedPSC: fStats?.totalVerifiedPSC || 0,
      productStructure: f.productStructure || linkedCuttings[0]?.productStructure,
      cuttingsCount: linkedCuttings.length,
    });
  });

  // Also include any orphan cuttings whose fabric isn't in fabrics list, grouped as fabric lots
  cuttings.forEach((c) => {
    const fId = c.fabricId || c.fabric_id;
    if (fId && processedFabricIds.has(fId)) return;
    const stats = getThreadCuttingStats(c.id);
    const cSubAvail = Object.values(stats?.subPartStats || {}).reduce(
      (acc, sp) => acc + (sp.available || 0),
      0
    );
    const cAvail = Math.max(stats.availableToAssignPSC || 0, cSubAvail || 0);
    if (cAvail > 0 || c.id === initialCuttingId) {
      if (fId) processedFabricIds.add(fId);
      assignmentTargets.push({
        id: c.id,
        isFabricLot: true,
        fabricId: fId || c.id,
        fabricName: c.fabricName || 'Fabric Lot',
        color: c.color,
        lotNo: c.lotNo ?? c.lotNumber ?? c.lot_no,
        label: `${c.fabricName || 'Fabric Lot'} • ${cAvail} verified PSC ready`,
        availableToAssignPSC: cAvail,
        totalVerifiedPSC: stats.totalVerifiedPSC || 0,
        productStructure: c.productStructure,
        cuttingsCount: 1,
      });
    }
  });

  const resolveTarget = (targetId) => {
    if (!targetId) return assignmentTargets[0] || null;
    const initialCutting = cuttings.find((c) => c.id === targetId);
    const resolvedFabricId = initialCutting?.fabricId || initialCutting?.fabric_id;

    const found =
      assignmentTargets.find((t) => t.id === targetId) ||
      (resolvedFabricId && assignmentTargets.find((t) => t.fabricId === resolvedFabricId)) ||
      assignmentTargets.find((t) => t.fabricId === targetId) ||
      assignmentTargets.find((t) => t.cuttingId === targetId) ||
      assignmentTargets[0];
    if (found) return found;

    const fallbackF = fabrics.find((f) => f.id === targetId || f.id === initialCuttingId || f.id === resolvedFabricId);
    if (fallbackF) {
      const fStats = getThreadCuttingStats(fallbackF.id);
      const totalSubPartsAvail = Object.values(fStats?.subPartStats || {}).reduce(
        (acc, sp) => acc + (sp.available || 0),
        0
      );
      return {
        id: fallbackF.id,
        isFabricLot: true,
        fabricId: fallbackF.id,
        fabricName: fallbackF.productName || fallbackF.fabricType || 'Fabric Lot',
        color: fallbackF.color,
        lotNo: fallbackF.lotNo ?? fallbackF.lotNumber ?? fallbackF.lot_no,
        label: `${fallbackF.productName || fallbackF.fabricType || 'Fabric Lot'} (Verified PSC)`,
        availableToAssignPSC: Math.max(fStats?.availableToAssignPSC || 0, totalSubPartsAvail || 0),
        totalVerifiedPSC: fStats?.totalVerifiedPSC || 0,
        productStructure: fallbackF.productStructure,
        cuttingsCount: 1,
      };
    }
    return null;
  };

  const initialTarget = resolveTarget(initialCuttingId);
  const [selectedTargetId, setSelectedTargetId] = useState(initialTarget?.id || '');
  const [selectedSubPart, setSelectedSubPart] = useState(initialSubPart || '');
  const [helperTypeFilter, setHelperTypeFilter] = useState('all'); // 'all' | 'internal' | 'external'
  const [selectedHelperId, setSelectedHelperId] = useState('');
  const [ratePerPSC, setRatePerPSC] = useState('2.5');

  // Selected target stats
  const activeTarget = resolveTarget(selectedTargetId) || initialTarget;
  const activeStats = activeTarget ? getThreadCuttingStats(activeTarget.id) : null;
  const currentCutting = cuttings.find((c) => c.id === (activeTarget?.cuttingId || activeTarget?.id));

  const subPartStats = activeStats?.subPartStats || {};
  let currentStructure = activeTarget?.productStructure || currentCutting?.productStructure;
  if (typeof currentStructure === 'string') {
    try {
      currentStructure = JSON.parse(currentStructure);
    } catch {
      currentStructure = null;
    }
  }
  const configuredParts =
    Array.isArray(currentStructure?.subParts) && currentStructure.subParts.length > 0
      ? currentStructure.subParts
      : Array.isArray(currentStructure?.parts) && currentStructure.parts.length > 0
        ? currentStructure.parts
        : [];

  const availableSubPartsMap = new Map();

  // Populate from configured parts first
  configuredParts.forEach((cp, idx) => {
    const key = (cp.id || cp.name || `part_${idx + 1}`).toLowerCase().trim();
    const name = cp.name || cp.id || `Part ${idx + 1}`;
    const pNorm = name.toLowerCase().replace(/[^a-z0-9]+/g, '');

    let stat = subPartStats[key];
    if (!stat) {
      for (const [sk, sv] of Object.entries(subPartStats)) {
        if (sk.toLowerCase().replace(/[^a-z0-9]+/g, '') === pNorm) {
          stat = sv;
          break;
        }
      }
    }

    let avail = stat?.available ?? 0;
    if (initialSubPartQuantities?.[key] !== undefined) {
      avail = Math.max(avail, parseInt(initialSubPartQuantities[key], 10) || 0);
    } else if (
      initialSubPart &&
      (initialSubPart.toLowerCase().trim() === key ||
        initialSubPart.toLowerCase().replace(/[^a-z0-9]+/g, '') === pNorm)
    ) {
      avail = Math.max(avail, parseInt(initialQuantity, 10) || 0);
    }

    availableSubPartsMap.set(key, {
      key,
      name,
      available: avail,
      totalVerified: stat?.totalVerified ?? avail,
      assigned: stat?.assigned ?? 0,
      skipped: stat?.skipped ?? 0,
      completed: stat?.completed ?? 0,
      inProgress: stat?.inProgress ?? 0,
    });
  });

  // Also include any parts present in subPartStats not configured in structure
  Object.entries(subPartStats).forEach(([key, info]) => {
    if (!availableSubPartsMap.has(key)) {
      let name = key.toUpperCase();
      if (currentStructure?.subParts) {
        const sp = currentStructure.subParts.find(
          (p) => (p.id || p.name).toLowerCase().trim() === key
        );
        if (sp?.name) name = sp.name;
      }
      let avail = info.available || 0;
      if (initialSubPartQuantities?.[key] !== undefined) {
        avail = Math.max(avail, parseInt(initialSubPartQuantities[key], 10) || 0);
      }
      availableSubPartsMap.set(key, {
        key,
        name,
        available: avail,
        ...info,
      });
    }
  });

  const availableSubParts = Array.from(availableSubPartsMap.values());
  const isMultiComponent = availableSubParts.length > 1 || configuredParts.length > 1;

  const totalSubPartsAvail = availableSubParts.reduce((acc, sp) => acc + (sp.available || 0), 0);

  const availablePSC =
    selectedSubPart && selectedSubPart !== 'all' && subPartStats[selectedSubPart]
      ? subPartStats[selectedSubPart].available
      : totalSubPartsAvail > 0
        ? totalSubPartsAvail
        : (activeStats ? activeStats.availableToAssignPSC : 0);

  // Multi-component quantity state: { [subPartKey]: string }
  const [subPartQuantities, setSubPartQuantities] = useState(() => {
    const initialMap = {};
    if (
      initialSubPartQuantities &&
      typeof initialSubPartQuantities === 'object' &&
      Object.keys(initialSubPartQuantities).length > 0
    ) {
      Object.entries(initialSubPartQuantities).forEach(([k, v]) => {
        initialMap[k.toLowerCase().trim()] = String(v);
      });
    } else if (initialSubPart && initialQuantity) {
      const k = initialSubPart.toLowerCase().trim();
      initialMap[k] = String(initialQuantity);
    } else if (initialQuantity) {
      let remaining = parseInt(initialQuantity, 10) || 0;
      Object.entries(subPartStats).forEach(([key, spData]) => {
        const avail = spData.available || 0;
        const alloc = Math.min(avail, remaining);
        initialMap[key] = String(alloc);
        remaining -= alloc;
      });
    } else {
      Object.entries(subPartStats).forEach(([key, spData]) => {
        initialMap[key] = String(spData.available || 0);
      });
    }

    availableSubParts.forEach((sp) => {
      if (initialMap[sp.key] === undefined) {
        initialMap[sp.key] = '0';
      }
    });

    return initialMap;
  });

  // Action mode: 'assign' (assign to helper) vs 'skip' (skip trimming / direct delivery)
  const [actionMode, setActionMode] = useState(initialMode || 'assign');
  const [skipSubPartQuantities, setSkipSubPartQuantities] = useState(() => ({ ...subPartQuantities }));
  const [skipPSC, setSkipPSC] = useState(() =>
    initialQuantity ? String(initialQuantity) : availablePSC > 0 ? String(availablePSC) : ''
  );
  const [skipNotes, setSkipNotes] = useState('');

  const [assignedPSC, setAssignedPSC] = useState(() =>
    initialQuantity ? String(initialQuantity) : availablePSC > 0 ? String(availablePSC) : ''
  );
  const [assignedDate, setAssignedDate] = useState(todayStr);
  const [notes, setNotes] = useState('');

  // Total pieces computed across either multiple components or single component
  const totalAssignedPieces = isMultiComponent
    ? Object.values(subPartQuantities).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0)
    : (parseInt(assignedPSC, 10) || 0);

  const totalSkippedPieces = isMultiComponent
    ? Object.values(skipSubPartQuantities).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0)
    : (parseInt(skipPSC, 10) || 0);

  const [showAddHelperModal, setShowAddHelperModal] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

  // Active helpers
  const activeHelpers = helpers.filter(
    (h) =>
      h.status !== 'Left' &&
      h.helperCategory !== 'master_assigned' &&
      h.helperType !== 'master_assigned'
  );

  const internalHelpers = activeHelpers.filter(
    (h) =>
      h.helperCategory === 'internal' ||
      (h.helperCategory !== 'external' && h.wageType !== 'Piece Rate')
  );

  const externalHelpers = activeHelpers.filter(
    (h) => h.helperCategory === 'external' || h.wageType === 'Piece Rate'
  );

  const filteredHelpers =
    helperTypeFilter === 'internal'
      ? internalHelpers
      : helperTypeFilter === 'external'
        ? externalHelpers
        : activeHelpers;

  const selectedHelper = helpers.find((h) => h.id === selectedHelperId);
  const isSelectedHelperExternal =
    selectedHelper?.helperCategory === 'external' || selectedHelper?.wageType === 'Piece Rate';

  const handleHelperChange = (helperId) => {
    setSelectedHelperId(helperId);
    const h = helpers.find((item) => item.id === helperId);
    const isExt = h?.helperCategory === 'external' || h?.wageType === 'Piece Rate';
    if (isExt) {
      setRatePerPSC(String(h?.defaultRatePerPSC || 2.5));
    } else {
      setRatePerPSC('0');
    }
  };

  const handleTargetChange = (targetId) => {
    setSelectedTargetId(targetId);
    setSelectedSubPart('');
    setSubPartQuantities({});
    setSkipSubPartQuantities({});
    const stats = getThreadCuttingStats(targetId);
    if (stats?.availableToAssignPSC > 0) {
      setAssignedPSC(String(stats.availableToAssignPSC));
      setSkipPSC(String(stats.availableToAssignPSC));
    } else {
      setAssignedPSC('');
      setSkipPSC('');
    }
  };

  const handleQuickSubPartAdd = (key, qty, maxVal) => {
    const current = parseInt(subPartQuantities[key], 10) || 0;
    const next = Math.min(maxVal, current + qty);
    setSubPartQuantities((prev) => ({ ...prev, [key]: String(next) }));
  };

  const handleSetSubPartMax = (key, maxVal) => {
    setSubPartQuantities((prev) => ({ ...prev, [key]: String(maxVal) }));
  };

  const handleFillAllMax = () => {
    const next = {};
    availableSubParts.forEach((sp) => {
      if (sp.available > 0) {
        next[sp.key] = String(sp.available);
      }
    });
    setSubPartQuantities(next);
  };

  const handleClearAll = () => {
    const next = {};
    availableSubParts.forEach((sp) => {
      next[sp.key] = '';
    });
    setSubPartQuantities(next);
  };

  const handleQuickSkipAdd = (key, qty, maxVal) => {
    const current = parseInt(skipSubPartQuantities[key], 10) || 0;
    const next = Math.min(maxVal, current + qty);
    setSkipSubPartQuantities((prev) => ({ ...prev, [key]: String(next) }));
  };

  const handleSetSkipSubPartMax = (key, maxVal) => {
    setSkipSubPartQuantities((prev) => ({ ...prev, [key]: String(maxVal) }));
  };

  const handleSkipFillAllMax = () => {
    const next = {};
    availableSubParts.forEach((sp) => {
      if (sp.available > 0) {
        next[sp.key] = String(sp.available);
      }
    });
    setSkipSubPartQuantities(next);
  };

  const handleSkipClearAll = () => {
    const next = {};
    availableSubParts.forEach((sp) => {
      next[sp.key] = '';
    });
    setSkipSubPartQuantities(next);
  };

  const handleSkipSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!activeTarget) {
      setAlertModal({
        isOpen: true,
        title: 'Target Required',
        message: 'Please select a cutting batch or fabric lot with verified PSC ready for thread trimming.',
        type: 'warning',
      });
      return;
    }

    const fabricId = activeTarget.fabricId;
    if (!fabricId) {
      setAlertModal({
        isOpen: true,
        title: 'Fabric Batch Missing',
        message: 'Could not resolve the fabric batch linked to this selection.',
        type: 'error',
      });
      return;
    }

    if (isMultiComponent) {
      const entriesToSkip = [];
      for (const sp of availableSubParts) {
        const qty = parseInt(skipSubPartQuantities[sp.key], 10) || 0;
        if (qty > sp.available) {
          setAlertModal({
            isOpen: true,
            title: 'Skip Exceeds Available',
            message: `You entered ${qty} PCs for ${sp.name}, but only ${sp.available} are available.`,
            type: 'error',
          });
          return;
        }
        if (qty > 0) {
          entriesToSkip.push({ key: sp.key, name: sp.name, qty });
        }
      }

      if (entriesToSkip.length === 0) {
        setAlertModal({
          isOpen: true,
          title: 'Valid Quantity Required',
          message: 'Please enter at least 1 PC for one of the components to skip trimming.',
          type: 'warning',
        });
        return;
      }

      const skippedMap = {};
      const decisionsMap = {};
      entriesToSkip.forEach((entry) => {
        skippedMap[entry.key] = entry.qty;
        decisionsMap[entry.key] = 'skipped';
      });

      setFabricThreadCuttingDecision(fabricId, {
        subPartSkippedPieces: skippedMap,
        subPartTrimmingDecisions: decisionsMap,
        accumulate: true,
      });

      if (onSuccess) onSuccess({ skipped: true, entries: entriesToSkip });
      onClose();
      return;
    }

    // Single Component Flow
    const qty = parseInt(skipPSC, 10);
    if (!qty || qty <= 0) {
      setAlertModal({
        isOpen: true,
        title: 'Valid Quantity Required',
        message: 'Please enter a valid number of PCs to skip trimming (greater than 0).',
        type: 'warning',
      });
      return;
    }

    if (qty > availablePSC) {
      setAlertModal({
        isOpen: true,
        title: 'Skip Exceeds Available',
        message: `You entered ${qty} PCs, but only ${availablePSC} are available.`,
        type: 'error',
      });
      return;
    }

    const defaultSubKey = availableSubParts[0]?.key || (activeTarget?.fabricName || 'piece').toLowerCase();
    setFabricThreadCuttingDecision(fabricId, 'skipped', defaultSubKey, qty, true);

    if (onSuccess) onSuccess({ skipped: true, quantity: qty });
    onClose();
  };

  const handleQuickAdd = (qty) => {
    const current = parseInt(assignedPSC, 10) || 0;
    const next = Math.min(availablePSC, current + qty);
    setAssignedPSC(String(next));
  };

  const handleSetMax = () => {
    setAssignedPSC(String(availablePSC));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!activeTarget) {
      setAlertModal({
        isOpen: true,
        title: 'Batch or Fabric Lot Required',
        message: 'Please select a batch or fabric lot with verified PSC ready for thread trimming.',
        type: 'warning',
      });
      return;
    }

    if (!selectedHelperId) {
      setAlertModal({
        isOpen: true,
        title: 'Helper Selection Required',
        message: 'Please choose an internal or external helper to perform thread cutting.',
        type: 'warning',
      });
      return;
    }

    const helperType = isSelectedHelperExternal ? 'external' : 'internal';
    const rate = isSelectedHelperExternal ? parseFloat(ratePerPSC) || 0 : 0;

    if (isSelectedHelperExternal && (rate <= 0 || rate > 10000)) {
      setAlertModal({
        isOpen: true,
        title: 'Price per PSC Required',
        message: 'Please specify a valid rate per PSC between ₹0.01 and ₹10,000 for this external helper.',
        type: 'warning',
      });
      return;
    }

    if (isMultiComponent) {
      // Validate multi-component inputs
      const entriesToAssign = [];
      for (const sp of availableSubParts) {
        const qty = parseInt(subPartQuantities[sp.key], 10) || 0;
        if (qty > sp.available) {
          setAlertModal({
            isOpen: true,
            title: 'Allocation Exceeds Balance',
            message: `You entered ${qty} PCs for ${sp.name}, but only ${sp.available} are available.`,
            type: 'error',
          });
          return;
        }
        if (qty > 0) {
          entriesToAssign.push({ key: sp.key, name: sp.name, qty });
        }
      }

      if (entriesToAssign.length === 0) {
        setAlertModal({
          isOpen: true,
          title: 'Valid Quantity Required',
          message: 'Please enter at least 1 PC for one of the components to assign.',
          type: 'warning',
        });
        return;
      }

      let lastResult = null;
      for (const entry of entriesToAssign) {
        const result = assignThreadCutting({
          cuttingId: activeTarget.isFabricLot ? null : activeTarget.cuttingId || activeTarget.id,
          fabricId: activeTarget.fabricId,
          fabricName: activeTarget.fabricName,
          isFabricLot: activeTarget.isFabricLot,
          handoverId: initialHandoverId,
          subPart: entry.key,
          subPartName: entry.name,
          helperId: selectedHelperId,
          helperName: selectedHelper?.name || 'Helper',
          helperPhone: selectedHelper?.phone || '',
          helperType,
          assignedPSC: entry.qty,
          ratePerPSC: rate,
          assignedDate,
          createdByRole: 'admin',
          notes: notes ? `${notes} (${entry.name}: ${entry.qty} PCs)` : `${entry.name}: ${entry.qty} PCs`,
        });

        if (result && result.success === false) {
          setAlertModal({
            isOpen: true,
            title: 'Assignment Failed',
            message: result.error,
            type: 'error',
          });
          return;
        }
        lastResult = result;
      }

      if (onSuccess) onSuccess(lastResult?.assignment);
      onClose();
      return;
    }

    // Single Component Flow
    const qty = parseInt(assignedPSC, 10);
    if (!qty || qty <= 0) {
      setAlertModal({
        isOpen: true,
        title: 'Valid Quantity Required',
        message: 'Please enter a valid number of complete PSCs to assign (greater than 0).',
        type: 'warning',
      });
      return;
    }

    if (qty > availablePSC) {
      setAlertModal({
        isOpen: true,
        title: 'Allocation Exceeds Balance',
        message: `You can assign at most ${availablePSC} verified PSC from this selection.`,
        type: 'error',
      });
      return;
    }

    const targetSubPartObj = availableSubParts.find((p) => p.key === selectedSubPart);

    const result = assignThreadCutting({
      cuttingId: activeTarget.isFabricLot ? null : activeTarget.cuttingId || activeTarget.id,
      fabricId: activeTarget.fabricId,
      fabricName: activeTarget.fabricName,
      isFabricLot: activeTarget.isFabricLot,
      handoverId: initialHandoverId,
      subPart: selectedSubPart && selectedSubPart !== 'all' ? selectedSubPart : (availableSubParts[0]?.key || null),
      subPartName: selectedSubPart && selectedSubPart !== 'all' ? (targetSubPartObj?.name || selectedSubPart.toUpperCase()) : (availableSubParts[0]?.name || null),
      helperId: selectedHelperId,
      helperName: selectedHelper?.name || 'Helper',
      helperPhone: selectedHelper?.phone || '',
      helperType,
      assignedPSC: qty,
      ratePerPSC: rate,
      assignedDate,
      createdByRole: 'admin',
      notes,
    });

    if (result && result.success === false) {
      setAlertModal({
        isOpen: true,
        title: 'Assignment Failed',
        message: result.error,
        type: 'error',
      });
      return;
    }

    if (onSuccess) onSuccess(result?.assignment);
    onClose();
  };

  const pscNum = totalAssignedPieces;
  const rateNum = isSelectedHelperExternal ? parseFloat(ratePerPSC) || 0 : 0;
  const estimatedCost = Math.round(pscNum * rateNum * 100) / 100;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 flex flex-col max-h-[92vh] sm:max-h-[88vh]">
          {/* Modal Header */}
          <div className={`px-4 py-3 sm:px-5 sm:py-3.5 text-white flex items-center justify-between shrink-0 transition-colors ${actionMode === 'skip'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-700'
              : 'bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-700'
            }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                {actionMode === 'skip' ? (
                  <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                ) : (
                  <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold truncate">
                  {actionMode === 'skip' ? 'Skip Thread Trimming' : 'Assign Thread Cutting'}
                </h2>
                <p className="text-[10px] sm:text-[11px] text-teal-100 font-medium truncate">
                  {actionMode === 'skip'
                    ? 'Mark specific pieces to skip trimming & unlock for direct supplier delivery'
                    : 'Allocate verified pieces to helper (set partial quantities on each component)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form with Sticky Footer */}
          <form onSubmit={actionMode === 'skip' ? handleSkipSubmit : handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-left">
            <div className="p-3.5 sm:p-4 space-y-3 sm:space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
              {/* 1. Fabric Lot Selection & Balance Card (Fabric Lot Wise Only) */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Fabric Lot (Verified PSC) *
                </label>
                {assignmentTargets.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">No Verified PSC Available:</span>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Thread cutting requires complete PSCs verified and accepted from the Cutting Master. Once you verify incoming handovers, they will appear here for assignment.
                      </p>
                    </div>
                  </div>
                ) : (
                  <CustomSelect
                    value={activeTarget?.id || ''}
                    onChange={(val) => handleTargetChange(val)}
                    options={assignmentTargets.map((t) => ({
                      value: t.id,
                      badge: t.lotNo ? `#${t.lotNo}` : 'LOT',
                      label: t.label,
                    }))}
                    placeholder="-- Select Verified Fabric Lot --"
                    theme="emerald"
                  />
                )}

                {/* Fabric Lot Context Card (Compact & Clean) */}
                {activeTarget && (
                  <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs shadow-2xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-extrabold text-slate-900 truncate">
                          {activeTarget.fabricName}
                        </span>
                        {activeTarget.color && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-white text-slate-700 rounded border border-slate-200 shrink-0">
                            {activeTarget.color}
                          </span>
                        )}
                        {activeTarget.lotNo && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 bg-teal-50 text-teal-800 rounded border border-teal-200 shrink-0">
                            #{activeTarget.lotNo}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                        {activeTarget.cuttingsCount > 1 ? `${activeTarget.cuttingsCount} Cutting Batches Combined` : 'Cutting Verified'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                        Ready to Trim
                      </span>
                      <span className="text-sm sm:text-base font-black text-emerald-700">
                        {activeStats?.availableToAssignPSC ?? activeTarget?.availableToAssignPSC ?? 0} PSC
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Mode Toggle: Assign to Helper vs Skip Trimming */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActionMode('assign')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${actionMode === 'assign'
                      ? 'bg-white text-teal-800 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Scissors className="w-3.5 h-3.5 text-teal-600" />
                  <span>Assign to Helper</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionMode('skip')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${actionMode === 'skip'
                      ? 'bg-white text-emerald-800 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Skip Trimming (Direct Delivery)</span>
                </button>
              </div>

              {actionMode === 'assign' && (
                <>
                  {/* 2. Helper Type Filter & Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Select Helper *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddHelperModal(true)}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add New Helper</span>
                      </button>
                    </div>

                    {/* Filter Tabs: All vs Internal vs External */}
                    <div className="flex bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setHelperTypeFilter('all')}
                        className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${helperTypeFilter === 'all'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        All ({activeHelpers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setHelperTypeFilter('internal')}
                        className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${helperTypeFilter === 'internal'
                            ? 'bg-white text-amber-800 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        <span className="hidden sm:inline">Other </span>Internal ({internalHelpers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setHelperTypeFilter('external')}
                        className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${helperTypeFilter === 'external'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        External<span className="hidden sm:inline"> (Price/PSC)</span> ({externalHelpers.length})
                      </button>
                    </div>

                    {/* Helpers Dropdown */}
                    {filteredHelpers.length === 0 ? (
                      <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-1.5">
                        <p className="text-xs text-slate-500">
                          No helpers found under this filter.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowAddHelperModal(true)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Register New Helper</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <CustomSelect
                          value={selectedHelperId}
                          onChange={(val) => handleHelperChange(val)}
                          options={filteredHelpers.map((h) => {
                            const isExt =
                              h.helperCategory === 'external' || h.wageType === 'Piece Rate';
                            return {
                              value: h.id,
                              badge: isExt ? 'EXTERNAL' : 'INTERNAL',
                              label: h.name,
                              subLabel: isExt
                                ? `Price by PSC: ₹${h.defaultRatePerPSC || 2.5}`
                                : 'Internal Helper (Monthly Salary & Chores)',
                            };
                          })}
                          placeholder="-- Choose a Helper for this Job --"
                          theme="emerald"
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. Rate per PSC (Only if External Helper) */}
                  {isSelectedHelperExternal && (
                    <div className="space-y-1.5 p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Price per PSC (₹) *
                        </label>
                        <span className="text-[10px] font-bold text-indigo-600">
                          Calculated Piece Rate
                        </span>
                      </div>
                      <div className="relative">
                        <IndianRupee className="w-4 h-4 text-indigo-600 absolute left-3 top-2.5" />
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10000"
                          required
                          value={ratePerPSC}
                          onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: true })}
                          onChange={(e) => {
                            const sanitized = sanitizeDecimal(e.target.value, { min: 0.1, max: 10000, maxDecimals: 2 });
                            setRatePerPSC(sanitized);
                          }}
                          placeholder="e.g. 2.5"
                          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-500 font-medium">
                          {pscNum} PSC × ₹{rateNum} / PSC
                        </span>
                        <span className="font-extrabold text-indigo-900">
                          Total Estimated Amount: ₹{estimatedCost}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 4. QUANTITY SELECTION: Multi-Component vs Single Component */}
                  {isMultiComponent ? (
                    /* Multi-Component Partial Allocation Section (Simple & Decreased Size) */
                    <div className="space-y-2 p-3 bg-slate-50/60 border border-slate-200/80 rounded-2xl animate-in fade-in">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-slate-500" />
                          <span>Assign Partial PCs per Component *</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleFillAllMax}
                            className="text-[10px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 transition-colors cursor-pointer"
                          >
                            Fill All
                          </button>
                          <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 pt-0.5">
                        {availableSubParts.map((sp) => {
                          const curVal = subPartQuantities[sp.key] || '';
                          const enteredVal = parseInt(curVal, 10) || 0;
                          return (
                            <div
                              key={sp.key}
                              className={`p-2 sm:p-2.5 bg-white rounded-xl border shadow-2xs space-y-1.5 transition-all ${enteredVal > sp.available
                                  ? 'border-rose-300 ring-1 ring-rose-100'
                                  : enteredVal > 0
                                    ? 'border-teal-300 bg-teal-50/10'
                                    : 'border-slate-200'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black text-slate-900 truncate">{sp.name}</span>
                                <span className="text-[10px] font-bold text-slate-500">
                                  Ready: <strong className="text-emerald-700 font-extrabold">{sp.available} PCs</strong>
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap">
                                {/* Quick increment buttons */}
                                <div className="flex items-center gap-1 flex-wrap">
                                  {[10, 25, 50].map((step) => (
                                    <button
                                      key={step}
                                      type="button"
                                      onClick={() => handleQuickSubPartAdd(sp.key, step, sp.available)}
                                      disabled={sp.available === 0 || enteredVal >= sp.available}
                                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 rounded text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-30"
                                    >
                                      +{step}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => handleSetSubPartMax(sp.key, sp.available)}
                                    disabled={sp.available === 0 || enteredVal >= sp.available}
                                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded border transition-colors cursor-pointer disabled:opacity-30 ${enteredVal === sp.available
                                        ? 'bg-teal-600 text-white border-teal-600'
                                        : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200'
                                      }`}
                                  >
                                    Max ({sp.available})
                                  </button>
                                  {enteredVal > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setSubPartQuantities((prev) => ({ ...prev, [sp.key]: '' }))}
                                      className="px-1 py-0.5 text-[10px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>

                                {/* Compact Input */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <input
                                    type="number"
                                    min="0"
                                    max={sp.available}
                                    value={curVal}
                                    placeholder="0"
                                    onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                                    onChange={(e) => {
                                      const sanitized = sanitizeInteger(e.target.value, { min: 0, max: sp.available });
                                      setSubPartQuantities((prev) => ({ ...prev, [sp.key]: sanitized }));
                                    }}
                                    className="w-14 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center focus:outline-none focus:ring-1 focus:ring-teal-500"
                                  />
                                  <span className="text-[10px] font-bold text-slate-400">PCs</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Live Allocation Summary */}
                      <div className="mt-2 p-2 bg-teal-50/70 border border-teal-200/80 rounded-xl flex items-center justify-between text-xs flex-wrap gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-teal-700 block">Total Pieces to Assign</span>
                          <span className="font-black text-slate-900 text-xs sm:text-sm">
                            {totalAssignedPieces} Complete PSC
                            {Object.entries(subPartQuantities).filter(([, v]) => (parseInt(v, 10) || 0) > 0).length > 0 && (
                              <span className="text-[11px] font-medium text-slate-600 ml-1.5">
                                ({Object.entries(subPartQuantities)
                                  .filter(([, v]) => (parseInt(v, 10) || 0) > 0)
                                  .map(([k, v]) => {
                                    const spObj = availableSubParts.find((p) => p.key === k);
                                    return `${v} ${spObj?.name || k.toUpperCase()}`;
                                  })
                                  .join(' • ')})
                              </span>
                            )}
                          </span>
                        </div>
                        {isSelectedHelperExternal && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-indigo-700 block">Estimated Wage</span>
                            <span className="font-black text-indigo-900 text-xs sm:text-sm">
                              ₹{estimatedCost}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Single Component Allocation */
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Complete PSCs to Assign *
                        </label>
                        <span className="text-[10px] text-slate-500">
                          Available:{' '}
                          <strong className="text-emerald-700 font-bold">{availablePSC} PSC</strong>
                        </span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max={availablePSC}
                        required
                        value={assignedPSC}
                        onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                        onChange={(e) => {
                          const sanitized = sanitizeInteger(e.target.value, { min: 1, max: availablePSC });
                          setAssignedPSC(sanitized);
                        }}
                        placeholder={`1 to ${availablePSC}`}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />

                      {/* Quick shortcut buttons */}
                      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-bold">Quick:</span>
                        {[10, 25, 50, 100].map((qty) => (
                          <button
                            type="button"
                            key={qty}
                            onClick={() => handleQuickAdd(qty)}
                            disabled={availablePSC === 0}
                            className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-md font-bold transition-all cursor-pointer"
                          >
                            +{qty}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={handleSetMax}
                          disabled={availablePSC === 0}
                          className="text-[10px] px-2.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md font-black transition-all cursor-pointer"
                        >
                          Max All ({availablePSC})
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 5. Date & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Assignment Date *
                      </label>
                      <div className="relative">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="date"
                          required
                          value={assignedDate}
                          onChange={(e) => setAssignedDate(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Remarks / Notes
                      </label>
                      <div className="relative">
                        <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="e.g. Priority trimming, urgent"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Skip Trimming Mode UI */}
              {actionMode === 'skip' && (
                <div className="space-y-3.5 animate-in fade-in">
                  {/* Banner */}
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
                    <Truck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold">Direct Supplier Delivery:</span>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Specify how many pieces of each component type to skip thread trimming. These pieces will immediately be unlocked and ready for supplier delivery without helper assignment.
                      </p>
                    </div>
                  </div>

                  {/* Multi-Component Skip Inputs (Simple & Decreased Size) */}
                  {isMultiComponent ? (
                    <div className="space-y-2 p-3 bg-slate-50/60 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                          <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Skip Trimming PCs per Component
                          </label>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleSkipFillAllMax}
                            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer"
                          >
                            Skip All
                          </button>
                          <button
                            type="button"
                            onClick={handleSkipClearAll}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 pt-0.5">
                        {availableSubParts.map((sp) => {
                          const curVal = skipSubPartQuantities[sp.key] || '';
                          const enteredVal = parseInt(curVal, 10) || 0;
                          return (
                            <div
                              key={sp.key}
                              className={`p-2 sm:p-2.5 bg-white rounded-xl border shadow-2xs space-y-1.5 transition-all ${enteredVal > sp.available
                                  ? 'border-rose-300 ring-1 ring-rose-100'
                                  : enteredVal > 0
                                    ? 'border-emerald-300 bg-emerald-50/10'
                                    : 'border-slate-200'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black text-slate-900 truncate">{sp.name}</span>
                                <span className="text-[10px] font-bold text-slate-500">
                                  Ready: <strong className="text-emerald-700 font-extrabold">{sp.available} PCs</strong>
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap">
                                {/* Quick increment buttons */}
                                <div className="flex items-center gap-1 flex-wrap">
                                  {[10, 25, 50].map((step) => (
                                    <button
                                      key={step}
                                      type="button"
                                      onClick={() => handleQuickSkipAdd(sp.key, step, sp.available)}
                                      disabled={sp.available === 0 || enteredVal >= sp.available}
                                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-30"
                                    >
                                      +{step}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => handleSetSkipSubPartMax(sp.key, sp.available)}
                                    disabled={sp.available === 0 || enteredVal >= sp.available}
                                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded border transition-colors cursor-pointer disabled:opacity-30 ${enteredVal === sp.available
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                      }`}
                                  >
                                    Max ({sp.available})
                                  </button>
                                  {enteredVal > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setSkipSubPartQuantities((prev) => ({ ...prev, [sp.key]: '' }))}
                                      className="px-1 py-0.5 text-[10px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>

                                {/* Compact Input */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <input
                                    type="number"
                                    min="0"
                                    max={sp.available}
                                    value={curVal}
                                    placeholder="0"
                                    onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                                    onChange={(e) => {
                                      const sanitized = sanitizeInteger(e.target.value, { min: 0, max: sp.available });
                                      setSkipSubPartQuantities((prev) => ({ ...prev, [sp.key]: sanitized }));
                                    }}
                                    className="w-14 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                  <span className="text-[10px] font-bold text-slate-400">PCs</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Redesigned Total Pieces to Skip Summary Strip */}
                      <div className="mt-2 p-2.5 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white rounded-xl border border-emerald-200/90 shadow-2xs flex items-center justify-between gap-3 flex-wrap text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                            <Truck className="w-4 h-4 text-emerald-700" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-100/80 text-emerald-800 rounded-md border border-emerald-200/60">
                                Total to Skip
                              </span>
                              <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                                {totalSkippedPieces} Complete PCs
                              </span>
                            </div>
                            {Object.entries(skipSubPartQuantities).filter(([, v]) => (parseInt(v, 10) || 0) > 0).length > 0 && (
                              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                {Object.entries(skipSubPartQuantities)
                                  .filter(([, v]) => (parseInt(v, 10) || 0) > 0)
                                  .map(([k, v]) => {
                                    const spObj = availableSubParts.find((p) => p.key === k);
                                    return `${v} ${spObj?.name || k.toUpperCase()}`;
                                  })
                                  .join(' • ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                          <span className="text-xs font-black text-emerald-700">
                            Unlocks for Delivery
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Single Component Skip UI */}
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Number of PCs to Skip Trimming *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max={availablePSC}
                          placeholder={`Max ${availablePSC}`}
                          value={skipPSC}
                          onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                          onChange={(e) => setSkipPSC(sanitizeInteger(e.target.value, { min: 1, max: availablePSC }))}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="absolute right-2 top-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const cur = parseInt(skipPSC, 10) || 0;
                              setSkipPSC(String(Math.min(availablePSC, cur + 10)));
                            }}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = parseInt(skipPSC, 10) || 0;
                              setSkipPSC(String(Math.min(availablePSC, cur + 25)));
                            }}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                          >
                            +25
                          </button>
                          <button
                            type="button"
                            onClick={() => setSkipPSC(String(availablePSC))}
                            className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded cursor-pointer"
                          >
                            Max ({availablePSC})
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Remarks / Reason for Skipping */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Remarks / Reason for Skipping (Optional)
                    </label>
                    <div className="relative">
                      <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="e.g. Buyer requested untrimmed, direct delivery approved"
                        value={skipNotes}
                        onChange={(e) => setSkipNotes(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Bar / Footer */}
            <div className="p-3 sm:p-4 bg-slate-50/95 backdrop-blur-xs border-t border-slate-200/80 flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-24 sm:w-28 py-2.5 sm:py-3 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold active:scale-95 transition-all shrink-0 cursor-pointer shadow-2xs"
              >
                Cancel
              </button>

              {actionMode === 'skip' ? (
                <button
                  type="button"
                  onClick={handleSkipSubmit}
                  disabled={totalSkippedPieces === 0}
                  className={`flex-1 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${totalSkippedPieces > 0
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-200 active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                >
                  <Truck className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    Confirm Skip Trimming {totalSkippedPieces > 0 ? `(${totalSkippedPieces} PCs)` : ''}
                  </span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={totalAssignedPieces === 0 || !selectedHelperId}
                  className={`flex-1 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${totalAssignedPieces > 0 && selectedHelperId
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                >
                  <Scissors className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    Confirm Assignment {totalAssignedPieces > 0 ? `(${totalAssignedPieces} PSC)` : ''}
                  </span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Nested Add Helper Modal */}
      <AddHelperModal
        isOpen={showAddHelperModal}
        onClose={() => setShowAddHelperModal(false)}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        buttonText="Got it"
      />
    </>
  );
}
