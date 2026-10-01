import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Scissors,
  Layers,
  UserCheck,
  Calendar,
  Sparkles,
  CheckCircle2,
  FileText,
  Edit3,
  Plus,
  Minus,
  AlertTriangle,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useFactory, useFabric } from '../../context/useManagement';
import { useAuth } from '../../context/useAuth';
import AlertModal from './AlertModal';
import SetProductStructureModal from './SetProductStructureModal';
import { getCuttingSubPartsList, isEntityArchived } from '../../utils/productUtils';
import { sanitizeInteger, blockInvalidNumberKeys } from '../../utils/formValidation';
import CustomSelect from '../common/CustomSelect';

function RecordCuttingDialog({
  onClose,
  initialFabricId = null,
  masterId = null,
  isMasterView = false,
  onSuccess = null,
  cuttingToEdit = null,
}) {
  const navigate = useNavigate();
  const {
    fabrics = [],
    cuttings = [],
    addCutting,
    updateCutting,
    getProductStructure,
    getCuttingBalance,
  } = useFabric();
  const { masters = [] } = useFactory();
  const { currentUser } = useAuth();
  const isMaster = isMasterView || currentUser?.role === 'Master';
  const isEditing = Boolean(cuttingToEdit);

  const activeMasters = masters.filter((m) => m.status !== 'Left');
  const todayStr = new Date().toISOString().split('T')[0];

  const effectiveMasterId = masterId || (isMaster ? currentUser?.id : null);
  const effectiveMasterName = isMaster ? currentUser?.name : null;
  const displayFabrics =
    isMaster && (effectiveMasterId || effectiveMasterName)
      ? fabrics.filter(
        (f) =>
          (!isEntityArchived(f, fabrics) || f.id === initialFabricId || f.id === cuttingToEdit?.fabricId) &&
          ((f.assignedMasterId && effectiveMasterId && String(f.assignedMasterId) === String(effectiveMasterId)) ||
            (f.assignedMasterName && effectiveMasterName && f.assignedMasterName.trim().toLowerCase() === effectiveMasterName.trim().toLowerCase()) ||
            f.id === initialFabricId ||
            f.id === cuttingToEdit?.fabricId)
      )
      : fabrics.filter(
        (f) =>
          !isEntityArchived(f, fabrics) ||
          f.id === initialFabricId ||
          f.id === cuttingToEdit?.fabricId
      );

  const targetFabricId =
    cuttingToEdit?.fabricId ||
    (initialFabricId && (!isEntityArchived(fabrics.find(f => f.id === initialFabricId), fabrics) || cuttingToEdit) ? initialFabricId : null) ||
    displayFabrics[0]?.id ||
    '';
  const initialFabric = fabrics.find((f) => f.id === targetFabricId);
  const defaultMasterId =
    cuttingToEdit?.masterId ||
    effectiveMasterId ||
    initialFabric?.assignedMasterId ||
    activeMasters[0]?.id ||
    '';

  const [formData, setFormData] = useState(() => {
    const initialPieces = {};
    if (cuttingToEdit?.cutPieces) {
      Object.entries(cuttingToEdit.cutPieces).forEach(([k, v]) => {
        initialPieces[k] = String(v);
      });
    }
    return {
      fabricId: targetFabricId,
      masterId: defaultMasterId,
      cutDate: cuttingToEdit?.cutDate || todayStr,
      pieces: initialPieces,
      metersUsed: cuttingToEdit?.metersUsed ? String(cuttingToEdit.metersUsed) : '',
      notes: cuttingToEdit?.notes || '',
    };
  });

  // Auto-sync fabricId when displayFabrics finish loading asynchronously
  useEffect(() => {
    if (!formData.fabricId && displayFabrics.length > 0) {
      const autoId = targetFabricId || displayFabrics[0]?.id;
      if (autoId) {
        const fab = fabrics.find((f) => f.id === autoId);
        const timer = setTimeout(() => {
          setFormData((prev) => {
            if (prev.fabricId) return prev;
            return {
              ...prev,
              fabricId: autoId,
              masterId: prev.masterId || fab?.assignedMasterId || defaultMasterId,
            };
          });
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [displayFabrics, targetFabricId, defaultMasterId, formData.fabricId, fabrics]);

  const [showProductModal, setShowProductModal] = useState(false);

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
  });


  // If editing, check if any pieces have already been assigned to tailors
  const existingBalance = useMemo(() => {
    if (!isEditing || !cuttingToEdit?.id) return null;
    return getCuttingBalance ? getCuttingBalance(cuttingToEdit.id) : null;
  }, [isEditing, cuttingToEdit, getCuttingBalance]);

  const assignedPieces = useMemo(() => {
    return existingBalance?.assigned || {};
  }, [existingBalance]);

  const selectedFabric = fabrics.find((f) => f.id === formData.fabricId);
  const productName =
    cuttingToEdit?.productName ||
    selectedFabric?.productName ||
    selectedFabric?.productStructure?.productName ||
    'Garment';
  const productStructure =
    cuttingToEdit?.productStructure ||
    selectedFabric?.productStructure ||
    (getProductStructure ? getProductStructure(selectedFabric) : null);

  // Existing cuttings from this fabric lot
  const fabricExistingCuttings = useMemo(() => {
    if (!formData.fabricId) return [];
    return cuttings.filter(
      (c) => c.fabricId === formData.fabricId && c.id !== cuttingToEdit?.id
    );
  }, [cuttings, formData.fabricId, cuttingToEdit]);

  const totalAlreadyCutPieces = useMemo(() => {
    return fabricExistingCuttings.reduce(
      (acc, c) => acc + (parseInt(c.totalPieces, 10) || 0),
      0
    );
  }, [fabricExistingCuttings]);

  const totalAlreadyUsedMeters = useMemo(() => {
    return fabricExistingCuttings.reduce(
      (acc, c) => acc + (parseFloat(c.metersUsed) || 0),
      0
    );
  }, [fabricExistingCuttings]);

  // Derive cut pieces required based on garment product structure
  const requiredPieces = useMemo(() => {
    if (!selectedFabric && !cuttingToEdit) {
      return [];
    }
    const subParts = productStructure?.subParts || [];
    if (subParts.length === 0) {
      const prodName = productStructure?.productName || selectedFabric?.productName || 'Garment PC';
      return [
        { id: 'piece', name: prodName, partName: prodName, partId: 'piece', qtyPerGarment: 1, isDirect: true },
      ];
    }

    const list = [];
    subParts.forEach((sp) => {
      const comps = Array.isArray(sp.components) ? sp.components : [];
      const spDerivedId = sp.name ? sp.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : '';
      const spId = (!sp.id || sp.id.startsWith('custom_part_')) ? (spDerivedId || 'part') : sp.id;
      if (comps.length > 0) {
        comps.forEach((c) => {
          list.push({
            id: c.id || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
            name: c.name,
            partId: spId,
            partName: sp.name,
            qtyPerGarment: Math.max(1, parseInt(c.qty, 10) || 1),
            isDirect: false,
          });
        });
      } else {
        list.push({
          id: spId,
          name: sp.name,
          partId: spId,
          partName: sp.name,
          qtyPerGarment: 1,
          isDirect: true,
        });
      }
    });

    return list;
  }, [productStructure, selectedFabric, cuttingToEdit]);

  // Piece-by-piece totals already cut across other batches of this fabric lot
  const lotPieceAlreadyCut = useMemo(() => {
    const totals = {};
    requiredPieces.forEach((p) => {
      totals[p.id] = fabricExistingCuttings.reduce(
        (acc, c) => acc + (parseInt(c.cutPieces?.[p.id], 10) || 0),
        0
      );
    });
    return totals;
  }, [requiredPieces, fabricExistingCuttings]);

  const lotMaxCapacity = useMemo(() => {
    if (!selectedFabric) {
      return {
        rawPrintPieces: 0,
        rawPlainMeters: 0,
        maxSets: null,
        basis: '',
        hasLimit: false,
        isFullyCut: false,
        pieceTargets: {},
        pieceRemaining: {},
      };
    }

    const rawPrintPieces =
      parseInt(
        selectedFabric.printPieces ||
        selectedFabric.productQuantity ||
        selectedFabric.totalPieces,
        10
      ) || 0;
    const rawPlainMeters = parseFloat(selectedFabric.plainMeters) || 0;

    let maxSets = null;
    let basis = '';
    let isFullyCut = false;
    const pieceTargets = {};
    const pieceRemaining = {};

    if (rawPrintPieces > 0) {
      // Calculate remaining needed for each component piece in this fabric lot
      requiredPieces.forEach((p) => {
        const target = rawPrintPieces * (p.qtyPerGarment || 1);
        const alreadyCut = lotPieceAlreadyCut[p.id] || 0;
        const rem = Math.max(0, target - alreadyCut);
        pieceTargets[p.id] = target;
        pieceRemaining[p.id] = rem;
      });

      // The maximum sets any component piece still needs to fulfill the lot target
      const maxSetsRemainingToCut =
        requiredPieces.length > 0
          ? Math.max(
            ...requiredPieces.map((p) => {
              const rem = pieceRemaining[p.id] ?? 0;
              return Math.ceil(rem / (p.qtyPerGarment || 1));
            })
          )
          : 0;

      maxSets = maxSetsRemainingToCut;
      isFullyCut = maxSetsRemainingToCut <= 0;

      const partsCutSummary = [];
      requiredPieces.forEach((p) => {
        const cut = lotPieceAlreadyCut[p.id] || 0;
        if (cut > 0) {
          partsCutSummary.push(`${cut} ${p.name} cut`);
        }
      });

      basis = `${maxSetsRemainingToCut} Sets remaining to cut (Target: ${rawPrintPieces} Sets${partsCutSummary.length > 0 ? ` • ${partsCutSummary.join(', ')}` : ''
        })`;
    } else if (rawPlainMeters > 0) {
      const remainingPlain = Math.max(0, rawPlainMeters - totalAlreadyUsedMeters);
      maxSets = Math.floor(remainingPlain / 2.5);
      basis = `${remainingPlain.toFixed(1)}m plain fabric remaining (~2.5m/Set)`;
      isFullyCut = remainingPlain <= 0;
    }

    return {
      rawPrintPieces,
      rawPlainMeters,
      maxSets,
      basis,
      hasLimit: maxSets !== null && maxSets >= 0,
      isFullyCut,
      pieceTargets,
      pieceRemaining,
    };
  }, [
    selectedFabric,
    requiredPieces,
    lotPieceAlreadyCut,
    totalAlreadyUsedMeters,
  ]);



  const getPieceVal = (id) => formData.pieces?.[id] ?? '';

  // Smart Piece Analysis & Bottleneck Detection
  const balanceAnalysis = useMemo(() => {
    if (requiredPieces.length === 0) return null;

    const pieceAnalysis = requiredPieces.map((p) => {
      const rawCount = parseInt(formData.pieces?.[p.id], 10) || 0;
      const perGarment = p.qtyPerGarment || 1;
      const possibleSets = Math.floor(rawCount / perGarment);
      const minAssigned = assignedPieces[p.id] || 0;
      return {
        ...p,
        rawCount,
        possibleSets,
        minAssigned,
      };
    });

    const hasAnyCuts = pieceAnalysis.some((p) => p.rawCount > 0);
    const fullSets = hasAnyCuts ? Math.min(...pieceAnalysis.map((p) => p.possibleSets)) : 0;
    const maxSets = hasAnyCuts ? Math.max(...pieceAnalysis.map((p) => p.possibleSets)) : 0;
    const isBalanced = hasAnyCuts && fullSets === maxSets;

    const bottlenecks = pieceAnalysis.filter(
      (p) => p.possibleSets === fullSets && p.possibleSets < maxSets
    );
    const surplusPieces = pieceAnalysis.filter((p) => p.possibleSets > fullSets);

    return {
      pieceAnalysis,
      fullSets,
      maxSets,
      isBalanced,
      bottlenecks,
      surplusPieces,
      hasAnyCuts,
    };
  }, [requiredPieces, formData.pieces, assignedPieces]);

  // Total raw cut pieces sum
  const totalPieces = useMemo(() => {
    return requiredPieces.reduce(
      (acc, p) => acc + (parseInt(formData.pieces?.[p.id], 10) || 0),
      0
    );
  }, [requiredPieces, formData.pieces]);

  // Sub-parts breakdown
  const subPartsBreakdown = useMemo(() => {
    if (!selectedFabric && !cuttingToEdit) {
      return { parts: [], fullSets: 0 };
    }
    const subParts = productStructure?.subParts || [];
    if (subParts.length === 0) {
      const prodName = productStructure?.productName || selectedFabric?.productName || 'PC';
      const pieceCount = Object.values(formData.pieces || {}).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
      return {
        parts: [
          { id: 'piece', name: prodName, available: pieceCount, recipe: `1 ${prodName}` },
        ],
        fullSets: pieceCount,
      };
    }

    const parts = subParts.map((sp) => {
      const comps = Array.isArray(sp.components) ? sp.components : [];
      let available = 0;
      if (comps.length > 0) {
        const pieceAvails = comps.map((c) => {
          const pieceId = c.id || c.name.toLowerCase().replace(/\s+/g, '_');
          const count = parseInt(formData.pieces?.[pieceId], 10) || 0;
          const perG = Math.max(1, parseInt(c.qty, 10) || 1);
          return Math.floor(count / perG);
        });
        available = pieceAvails.length > 0 ? Math.min(...pieceAvails) : 0;
      } else {
        const pieceId = sp.id || sp.name.toLowerCase().replace(/\s+/g, '_');
        available = parseInt(formData.pieces?.[pieceId], 10) || 0;
      }
      return {
        id: sp.id,
        name: sp.name,
        available,
        recipe: sp.recipeLabel,
      };
    });

    const fullSets = parts.length > 0 ? Math.min(...parts.map((p) => p.available)) : 0;
    return { parts, fullSets };
  }, [productStructure, formData.pieces, selectedFabric, cuttingToEdit]);

  // Group pieces by their garment subpart / component group
  const groupedPieces = useMemo(() => {
    if (!selectedFabric && !cuttingToEdit) {
      return [];
    }
    const groups = [];
    const groupMap = new Map();

    const partsInfo = subPartsBreakdown?.parts || [];
    partsInfo.forEach((sp) => {
      const g = {
        id: sp.id,
        name: sp.name,
        recipe: sp.recipe,
        available: sp.available ?? 0,
        pieces: [],
      };
      groups.push(g);
      groupMap.set(sp.id, g);
    });

    // Populate pieces into their corresponding group
    requiredPieces.forEach((piece) => {
      const gId = piece.partId || 'other';
      let targetGroup = groupMap.get(gId);
      if (!targetGroup) {
        targetGroup = {
          id: gId,
          name: piece.partName || 'Cut PCs',
          recipe: '',
          available: 0,
          pieces: [],
        };
        groups.push(targetGroup);
        groupMap.set(gId, targetGroup);
      }
      targetGroup.pieces.push(piece);
    });

    return groups.filter((g) => g.pieces.length > 0);
  }, [subPartsBreakdown, requiredPieces, selectedFabric, cuttingToEdit]);

  // Apply preset sets across all pieces (Fill All fills remaining needed per piece)
  const handleApplyPresetSets = (count) => {
    if (!selectedFabric && !cuttingToEdit) return;
    const qty = Math.max(0, parseInt(count, 10) || 0);
    const nextPieces = {};
    requiredPieces.forEach((p) => {
      const minAssigned = assignedPieces[p.id] || 0;
      const pieceRem = lotMaxCapacity?.pieceRemaining?.[p.id];
      const maxAllowed = (pieceRem !== undefined && pieceRem !== null) ? pieceRem : Infinity;
      const targetCount = Math.min(maxAllowed, qty * (p.qtyPerGarment || 1));
      nextPieces[p.id] = String(Math.max(targetCount, isEditing ? minAssigned : 0));
    });

    setFormData((prev) => ({
      ...prev,
      pieces: nextPieces,
    }));
  };

  // Manual individual piece change - strictly prevents adding extra beyond target
  const handlePieceChange = (id, val) => {
    if (!selectedFabric && !cuttingToEdit) return;
    const hasPieceLimit = lotMaxCapacity?.hasLimit && lotMaxCapacity?.rawPrintPieces > 0;
    const maxRem = lotMaxCapacity?.pieceRemaining?.[id];
    const maxCap = (hasPieceLimit && maxRem !== undefined && maxRem !== null) ? maxRem : 100000;
    const sanitized = sanitizeInteger(val, { min: 0, max: maxCap });
    setFormData((prev) => ({
      ...prev,
      pieces: {
        ...prev.pieces,
        [id]: sanitized,
      },
    }));
  };

  // Step an individual piece (+1 or -1) - strictly capped at lot target
  const handlePieceStep = (id, delta, qtyPerGarment = 1) => {
    if (!selectedFabric && !cuttingToEdit) return;
    const minAssigned = assignedPieces[id] || 0;
    const current = parseInt(formData.pieces?.[id], 10) || 0;
    const step = qtyPerGarment > 1 ? qtyPerGarment : 1;
    let next = Math.max(isEditing ? minAssigned : 0, current + delta * step);
    const hasPieceLimit = lotMaxCapacity?.hasLimit && lotMaxCapacity?.rawPrintPieces > 0;
    const maxRem = lotMaxCapacity?.pieceRemaining?.[id];
    if (hasPieceLimit && maxRem !== undefined && maxRem !== null && next > maxRem) {
      next = maxRem;
    }
    handlePieceChange(id, String(next));
  };

  // Quick-fix: Bring bottleneck pieces up to match the max sets cut
  const handleFixBottleneckToMax = () => {
    if (!balanceAnalysis || balanceAnalysis.maxSets <= 0) return;
    handleApplyPresetSets(balanceAnalysis.maxSets);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.fabricId || !selectedFabric) {
      setAlertModal({
        isOpen: true,
        title: 'Fabric Lot Required',
        message: 'Please select an available fabric lot from inventory before recording cutting output.',
        type: 'warning',
      });
      return;
    }

    const resolvedMasterId = isMaster
      ? (effectiveMasterId || formData.masterId)
      : (formData.masterId || defaultMasterId);

    if (!resolvedMasterId) {
      setAlertModal({
        isOpen: true,
        title: 'Cutting Master Required',
        message: 'Please select the Cutting Master who prepared these pieces.',
        type: 'warning',
      });
      return;
    }

    if (!isEditing && lotMaxCapacity?.isFullyCut) {
      setAlertModal({
        isOpen: true,
        title: 'Fabric Lot Target Reached',
        message: `This fabric lot has already reached its cutting target of ${lotMaxCapacity.rawPrintPieces || 0} Sets. Additional cutting cannot be recorded.`,
        type: 'warning',
      });
      return;
    }

    if (totalPieces <= 0) {
      setAlertModal({
        isOpen: true,
        title: 'Cut PCs Missing',
        message: `Please specify the number of Cut PCs cut for ${requiredPieces.map((p) => p.name).join(', ')}.`,
        type: 'warning',
      });
      return;
    }

    // Safety validation: check for negative counts
    for (const piece of requiredPieces) {
      const enteredCount = parseInt(formData.pieces?.[piece.id], 10) || 0;
      if (enteredCount < 0) {
        setAlertModal({
          isOpen: true,
          title: 'Invalid Cut PC Count',
          message: `Cut PC count for "${piece.name}" cannot be negative.`,
          type: 'warning',
        });
        return;
      }
    }

    // Safety validation for editing: cannot reduce below already assigned pieces
    if (isEditing) {
      for (const piece of requiredPieces) {
        const minAssigned = assignedPieces[piece.id] || 0;
        const enteredCount = parseInt(formData.pieces?.[piece.id], 10) || 0;
        if (enteredCount < minAssigned) {
          setAlertModal({
            isOpen: true,
            title: 'Cut PC Count Below Assigned',
            message: `Cannot reduce "${piece.name}" to ${enteredCount} Cut PCs because ${minAssigned} Cut PCs are already assigned to tailors. Please enter at least ${minAssigned}.`,
            type: 'warning',
          });
          return;
        }
      }
    }

    // Safety validation: master can only cut up to remaining lot target per piece (no extra allowed)
    if (lotMaxCapacity?.hasLimit && lotMaxCapacity.rawPrintPieces > 0) {
      for (const piece of requiredPieces) {
        const enteredQty = parseInt(formData.pieces?.[piece.id], 10) || 0;
        const pieceRemaining =
          lotMaxCapacity?.pieceRemaining?.[piece.id] !== undefined
            ? lotMaxCapacity.pieceRemaining[piece.id]
            : (lotMaxCapacity?.maxSets != null ? lotMaxCapacity.maxSets * (piece.qtyPerGarment || 1) : null);

        if (pieceRemaining !== null && enteredQty > pieceRemaining) {
          setAlertModal({
            isOpen: true,
            title: 'Exceeds Lot Target',
            message: `Cannot cut ${enteredQty} ${piece.name} Cut PCs. Only ${pieceRemaining} Cut PCs remain available to cut for this fabric lot (Lot Target: ${lotMaxCapacity.rawPrintPieces} Sets). Extra cutting beyond target is not allowed.`,
            type: 'warning',
          });
          return;
        }
      }
    }

    // Safety validation: plain fabric meters cannot be negative or exceed remaining meters
    if (formData.metersUsed) {
      const enteredMeters = parseFloat(formData.metersUsed) || 0;
      if (enteredMeters < 0) {
        setAlertModal({
          isOpen: true,
          title: 'Invalid Meters',
          message: 'Meters used cannot be negative.',
          type: 'warning',
        });
        return;
      }
      const rawPlainMeters = parseFloat(selectedFabric.plainMeters) || 0;
      if (rawPlainMeters > 0) {
        const availableMeters = Math.max(0, rawPlainMeters - totalAlreadyUsedMeters);
        if (enteredMeters > availableMeters) {
          setAlertModal({
            isOpen: true,
            title: 'Meters Exceeded',
            message: `Cannot use ${enteredMeters}m. Only ${availableMeters.toFixed(1)}m remain available in this fabric lot (Lot Total: ${rawPlainMeters}m).`,
            type: 'warning',
          });
          return;
        }
      }
    }

    // Safety validation: prevent cutting on already completed lots
    if (lotMaxCapacity?.isFullyCut && !isEditing) {
      setAlertModal({
        isOpen: true,
        title: 'Lot Already Completed',
        message: `This fabric lot has already reached its full target of ${lotMaxCapacity.rawPrintPieces} Sets. No additional cutting can be recorded.`,
        type: 'warning',
      });
      return;
    }

    const cutPiecesPayload = {};
    requiredPieces.forEach((p) => {
      const val = parseInt(formData.pieces?.[p.id], 10) || 0;
      if (p.id) cutPiecesPayload[p.id] = val;
    });

    const currentCuttingObj = {
      cutPieces: cutPiecesPayload,
      productStructure,
    };
    const subPartsList = getCuttingSubPartsList(currentCuttingObj, selectedFabric);

    const minCutSubPartsReady = Array.isArray(subPartsList) && subPartsList.length > 0
      ? Math.min(...subPartsList.map((sp) => parseInt(sp.count, 10) || 0))
      : 0;

    const firstPieceVal = requiredPieces[0]?.id ? (cutPiecesPayload[requiredPieces[0].id] || 0) : 0;
    const derivedProductSets =
      minCutSubPartsReady ||
      firstPieceVal ||
      0;

    const payload = {
      fabricId: formData.fabricId,
      masterId: resolvedMasterId,
      cutDate: !isMaster && formData.cutDate ? formData.cutDate : (formData.cutDate || todayStr),
      cutPieces: cutPiecesPayload,
      productName,
      productStructure,
      totalSets: derivedProductSets,
      metersUsed: formData.metersUsed ? parseFloat(formData.metersUsed) || null : null,
      notes: formData.notes,
    };

    try {
      if (isEditing) {
        const result = updateCutting(cuttingToEdit.id, payload);
        if (result?.success) {
          if (onSuccess) onSuccess(result.cutting);
          onClose();
        }
      } else {
        const result = addCutting(payload);
        if (result?.success) {
          if (onSuccess) onSuccess(result.cutting);
          onClose();
        }
      }
    } catch (err) {
      console.error('Error saving cutting batch:', err);
      setAlertModal({
        isOpen: true,
        title: 'Error Saving Cutting',
        message: err?.message || 'An unexpected error occurred while saving the cutting batch.',
        type: 'warning',
      });
    }
  };

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const cuttingProgressPct = useMemo(() => {
    if (!lotMaxCapacity?.rawPrintPieces || lotMaxCapacity.rawPrintPieces <= 0) return 0;
    const targetTotal = lotMaxCapacity.rawPrintPieces * (requiredPieces.length > 0 ? requiredPieces.reduce((sum, p) => sum + (p.qtyPerGarment || 1), 0) : 1);
    if (targetTotal <= 0) return 0;
    return Math.min(100, Math.round(((totalAlreadyCutPieces + totalPieces) / targetTotal) * 100));
  }, [lotMaxCapacity, requiredPieces, totalAlreadyCutPieces, totalPieces]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-2xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom sm:zoom-in-95 text-left"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header (Sticky Top) */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/90 via-indigo-50/40 to-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200 shrink-0">
              {isEditing ? <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Scissors className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight truncate">
                  {isEditing ? 'Modify Master Cutting' : 'Record Master Cutting'}
                </h2>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                  Cutting
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {selectedFabric
                  ? `${selectedFabric.fabricType || selectedFabric.productName} • Lot #${selectedFabric.lotNo ?? selectedFabric.lotNumber ?? selectedFabric.lot_no ?? '1'} • ${productName}`
                  : `Record Cut PCs cut from fabric lay for ${productName}`}
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

        {/* Form Container with Flex Layout for 100% Sticky Bottom Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0 text-left">
          {/* Scrollable Inner Body */}
          <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto flex-1 min-h-0">
            {/* SECTION 1: Auto-Selected Fabric Lot & Live Progress (Compact) */}
            {selectedFabric ? (
              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/90 text-xs space-y-1.5 shadow-2xs">
                {/* Lot Header: Lot Name, Color, Lot #, Custodian */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="font-extrabold text-slate-900 truncate">
                      {selectedFabric.fabricType || selectedFabric.productName || 'Fabric Lot'}
                      {selectedFabric.color ? ` (${selectedFabric.color})` : ''}
                    </span>
                    {(selectedFabric.lotNo || selectedFabric.lotNumber) && (
                      <span className="text-[9px] font-black bg-white text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded shrink-0">
                        #{selectedFabric.lotNo || selectedFabric.lotNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-slate-600">
                      {selectedFabric.assignedMasterName ? `✂ ${selectedFabric.assignedMasterName}` : 'In Cutting'}
                    </span>
                    {!isMaster ? (
                      <button
                        type="button"
                        onClick={() => setShowProductModal(true)}
                        className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 cursor-pointer"
                        title="Configure garment components and stitching rates"
                      >
                        {productName} ({requiredPieces.length} PCs)
                      </button>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                        {productName} ({requiredPieces.length} PCs)
                      </span>
                    )}
                  </div>
                </div>

                {/* Compact Stats Row & Progress */}
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 pt-0.5">
                  <span>Target: <strong className="text-slate-800">{lotMaxCapacity?.rawPrintPieces || 0} Sets</strong></span>
                  <span>Cut: <strong className="text-purple-700">{totalAlreadyCutPieces} PCs</strong></span>
                  <span>Available: <strong className="text-emerald-700">{lotMaxCapacity?.maxSets ?? 0} Sets</strong></span>
                  <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">{cuttingProgressPct}% Done</span>
                </div>
                <div className="h-1 w-full bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${cuttingProgressPct}%` }}
                  />
                </div>
              </div>
            ) : displayFabrics.length === 0 ? (
              <div className="p-2.5 bg-amber-50 text-amber-900 rounded-xl text-xs border border-amber-200 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium">No active fabric lots found in inventory.</span>
                {!isMaster && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/fabrics');
                    }}
                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <span>Go to Fabrics</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : null}

            {/* SECTION 2: Master Selection (Admin only) & Date with Quick Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {!isMaster && (
                <div>
                  <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-purple-600" />
                    <span>Cutting Master *</span>
                  </label>
                  {activeMasters.length === 0 ? (
                    <div className="p-1.5 bg-amber-50 text-amber-800 rounded-lg text-xs border border-amber-200">
                      No active master found.
                    </div>
                  ) : (
                    <CustomSelect
                      value={formData.masterId}
                      onChange={(val) => setFormData({ ...formData, masterId: val })}
                      options={activeMasters.map((m) => ({
                        value: m.id,
                        badge: 'MASTER',
                        label: m.name,
                        subLabel: m.phone ? `Phone: ${m.phone}` : null,
                      }))}
                      placeholder="-- Choose Cutting Master --"
                      theme="purple"
                    />
                  )}
                </div>
              )}

              <div className={isMaster ? 'sm:col-span-2' : ''}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>Cutting Date *</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, cutDate: todayStr }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        formData.cutDate === todayStr
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, cutDate: yesterdayStr }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        formData.cutDate === yesterdayStr
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Yesterday
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={formData.cutDate}
                  onChange={(e) => setFormData({ ...formData, cutDate: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* SECTION 3: Cut PCs Prepared Today (Compact) */}
            {!selectedFabric && !cuttingToEdit ? (
              <div className="p-4 bg-white rounded-xl border-2 border-dashed border-slate-200 text-center space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100 shadow-2xs">
                  <Scissors className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {displayFabrics.length === 0 ? 'No Fabric Lots in Inventory' : 'No Fabric Lot Selected'}
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Please select an active fabric lot to record cut pieces.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header Strip */}
                <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1">
                  <div className="flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
                      Cut PCs Prepared Today *
                    </span>
                    {lotMaxCapacity?.hasLimit && lotMaxCapacity?.maxSets != null && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                        Target: {lotMaxCapacity.maxSets} Sets
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {balanceAnalysis?.hasAnyCuts ? (
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-2xs flex items-center gap-1 ${
                          balanceAnalysis.isBalanced
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                        <span>
                          {balanceAnalysis.fullSets} / {lotMaxCapacity?.maxSets || balanceAnalysis.fullSets} Sets Ready ({totalPieces} PCs)
                        </span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">
                        0 Cut PCs
                      </span>
                    )}
                  </div>
                </div>

                {/* Subpart Cards */}
                <div className="space-y-2">
                  {groupedPieces.map((group, gIdx) => {
                    const groupPieceTargets = group.pieces.map((piece) => {
                      const target =
                        lotMaxCapacity?.pieceTargets?.[piece.id] !== undefined
                          ? lotMaxCapacity.pieceTargets[piece.id]
                          : (lotMaxCapacity?.maxSets != null)
                            ? lotMaxCapacity.maxSets * (piece.qtyPerGarment || 1)
                            : null;
                      const alreadyCut = lotPieceAlreadyCut[piece.id] || 0;
                      const rem =
                        lotMaxCapacity?.pieceRemaining?.[piece.id] !== undefined
                          ? lotMaxCapacity.pieceRemaining[piece.id]
                          : target !== null
                            ? Math.max(0, target - alreadyCut)
                            : null;
                      const neededSets = rem !== null ? Math.ceil(rem / (piece.qtyPerGarment || 1)) : null;
                      const alreadySets = Math.floor(alreadyCut / (piece.qtyPerGarment || 1));
                      return { piece, target, alreadyCut, rem, neededSets, alreadySets };
                    });

                    const groupTarget =
                      groupPieceTargets.some((p) => p.neededSets !== null)
                        ? Math.max(...groupPieceTargets.map((p) => p.neededSets ?? 0))
                        : lotMaxCapacity?.maxSets ?? null;

                    const isGroupAlreadyMetInLot =
                      groupPieceTargets.length > 0 &&
                      groupPieceTargets.every((p) => p.alreadyCut > 0 && p.rem === 0);

                    const alreadyCutCount =
                      groupPieceTargets.length > 0
                        ? Math.min(...groupPieceTargets.map((p) => p.alreadySets))
                        : 0;

                    const isGroupCompleteInBatch =
                      groupTarget !== null && groupTarget > 0 && group.available >= groupTarget;

                    return (
                      <div
                        key={group.id || gIdx}
                        className="rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5 shadow-2xs space-y-1.5"
                      >
                        {/* Subpart Card Header */}
                        <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center font-black text-[10px] uppercase shadow-2xs shrink-0">
                              {(group.name || 'P').trim().charAt(0).toUpperCase()}
                            </span>
                            <span className="text-xs font-black text-slate-900 uppercase tracking-wide truncate">
                              {group.name}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                              PC {gIdx + 1}
                            </span>
                            {group.recipe && (
                              <span className="text-[10px] text-slate-400 font-medium truncate hidden sm:inline">
                                ({group.recipe})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isGroupAlreadyMetInLot && group.available === 0 ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs flex items-center gap-1">
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                <span>{alreadyCutCount} Cut in Lot</span>
                              </span>
                            ) : (
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-2xs flex items-center gap-1 ${
                                  isGroupCompleteInBatch
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : group.available > 0
                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                      : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                              >
                                {isGroupCompleteInBatch ? (
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                                )}
                                <span>
                                  {group.available}
                                  {groupTarget !== null ? ` / ${groupTarget}` : ''} Sets Ready
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Components for this Subpart */}
                        <div className="space-y-1.5">
                          {group.pieces.map((piece) => {
                            const minAssigned = assignedPieces[piece.id] || 0;
                            const rawVal = parseInt(formData.pieces?.[piece.id], 10) || 0;
                            const possiblePieceSets = Math.floor(rawVal / (piece.qtyPerGarment || 1));
                            const isBottleneck =
                              balanceAnalysis?.bottlenecks?.some((b) => b.id === piece.id) &&
                              balanceAnalysis?.hasAnyCuts;
                            const pieceTarget =
                              lotMaxCapacity?.pieceTargets?.[piece.id] !== undefined
                                ? lotMaxCapacity.pieceTargets[piece.id]
                                : (lotMaxCapacity?.maxSets != null)
                                  ? lotMaxCapacity.maxSets * (piece.qtyPerGarment || 1)
                                  : null;
                            const alreadyCutInOtherBatches = lotPieceAlreadyCut[piece.id] || 0;
                            const neededPieceQty =
                              lotMaxCapacity?.pieceRemaining?.[piece.id] !== undefined
                                ? lotMaxCapacity.pieceRemaining[piece.id]
                                : pieceTarget !== null
                                  ? Math.max(0, pieceTarget - alreadyCutInOtherBatches)
                                  : null;

                            const isComplete = neededPieceQty !== null && neededPieceQty > 0 && rawVal === neededPieceQty;
                            const isOverTarget = neededPieceQty !== null && neededPieceQty > 0 && rawVal > neededPieceQty;

                            return (
                              <div
                                key={piece.id}
                                className={`p-2 rounded-xl border transition-all space-y-1.5 ${
                                  isOverTarget
                                    ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-200'
                                    : isBottleneck
                                      ? 'border-amber-300 bg-amber-50/30'
                                      : isComplete
                                        ? 'border-emerald-300 bg-emerald-50/30 shadow-2xs'
                                        : rawVal > 0
                                          ? 'border-purple-300/80 bg-purple-50/15 shadow-2xs'
                                          : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                {/* Row 1: Component Name & Multiplier (Left) + Stepper (Right) */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-xs font-bold text-slate-900 truncate">
                                      {piece.name}
                                    </span>
                                    {piece.qtyPerGarment > 1 && (
                                      <span className="text-[9px] font-black text-purple-700 bg-purple-100 px-1 py-0.2 rounded border border-purple-200 shrink-0">
                                        ×{piece.qtyPerGarment}/PC
                                      </span>
                                    )}
                                    {possiblePieceSets > 0 && (
                                      <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded shrink-0">
                                        {possiblePieceSets} Sets
                                      </span>
                                    )}
                                  </div>

                                  {/* Compact Stepper */}
                                  <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shrink-0 shadow-2xs">
                                    <button
                                      type="button"
                                      disabled={!isEditing && (lotMaxCapacity?.isFullyCut || rawVal <= 0)}
                                      onClick={() => handlePieceStep(piece.id, -1, piece.qtyPerGarment)}
                                      className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-purple-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer active:scale-95 shrink-0"
                                      title={`Subtract ${piece.qtyPerGarment || 1}`}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>

                                    <input
                                      type="number"
                                      disabled={!isEditing && lotMaxCapacity?.isFullyCut}
                                      min={isEditing ? minAssigned : 0}
                                      max={neededPieceQty !== null && neededPieceQty >= 0 ? neededPieceQty : undefined}
                                      placeholder="0"
                                      value={getPieceVal(piece.id)}
                                      onWheel={(e) => e.target.blur()}
                                      onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                                      onChange={(e) => handlePieceChange(piece.id, e.target.value)}
                                      className={`w-11 bg-transparent text-center font-black text-xs focus:outline-none disabled:opacity-50 ${
                                        isComplete
                                          ? 'text-emerald-700'
                                          : rawVal > 0
                                            ? 'text-purple-900'
                                            : 'text-slate-800'
                                      }`}
                                    />

                                    <button
                                      type="button"
                                      disabled={!isEditing && (lotMaxCapacity?.isFullyCut || (neededPieceQty !== null && rawVal >= neededPieceQty))}
                                      onClick={() => handlePieceStep(piece.id, 1, piece.qtyPerGarment)}
                                      className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-purple-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer active:scale-95 shrink-0"
                                      title={`Add ${piece.qtyPerGarment || 1}`}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Row 2: Status & Progress (Left) + Quick Preset Chips (Right) */}
                                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 text-[10px]">
                                  <div className="text-slate-500 font-medium truncate">
                                    {isComplete ? (
                                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                                        <span>Target Met ({alreadyCutInOtherBatches + rawVal} PCs)</span>
                                      </span>
                                    ) : isOverTarget ? (
                                      <span className="text-amber-700 font-bold">
                                        +{rawVal - neededPieceQty} over target
                                      </span>
                                    ) : (
                                      <span>
                                        <strong className="text-slate-800 font-bold">{Math.max(0, (neededPieceQty || 0) - rawVal)}</strong> left
                                        <span className="text-slate-400"> ({alreadyCutInOtherBatches + rawVal}/{pieceTarget || neededPieceQty || 0})</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Quick Chips */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    {[10, 25, 50].map((step) => {
                                      const canAdd = !isEditing && (neededPieceQty !== null && rawVal + step > neededPieceQty);
                                      return (
                                        <button
                                          key={step}
                                          type="button"
                                          disabled={!isEditing && (lotMaxCapacity?.isFullyCut || canAdd)}
                                          onClick={() => handlePieceStep(piece.id, step, 1)}
                                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 disabled:opacity-30 disabled:cursor-not-allowed rounded text-[10px] font-bold active:scale-95 transition-all cursor-pointer"
                                        >
                                          +{step}
                                        </button>
                                      );
                                    })}

                                    {neededPieceQty !== null && neededPieceQty > 0 && !isComplete && (!lotMaxCapacity?.isFullyCut || isEditing) && (
                                      <button
                                        type="button"
                                        onClick={() => handlePieceChange(piece.id, String(neededPieceQty))}
                                        className="px-1.5 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-black active:scale-95 transition-all cursor-pointer shrink-0"
                                        title={`Set to maximum needed count (${neededPieceQty})`}
                                      >
                                        Max
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Assembly Balance & Bottleneck Notification Bar */}
                {balanceAnalysis?.hasAnyCuts && (
                  <div className="pt-0.5">
                    {balanceAnalysis.isBalanced ? (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-emerald-900 text-xs font-bold">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-[11px]">
                            Balanced: <strong>{balanceAnalysis.fullSets} Sets</strong> ready ({totalPieces} Cut PCs).
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-1.5 flex-wrap text-amber-900 text-xs font-bold">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate text-[11px]">
                            Bottleneck: {balanceAnalysis.bottlenecks.map((b) => b.name).join(', ')} caps to <strong>{balanceAnalysis.fullSets} Sets</strong>.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleFixBottleneckToMax}
                          className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
                        >
                          Balance to {balanceAnalysis.maxSets} Sets
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 4: Production Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Cutting Notes (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Size 38, Batch #1, Extra margin"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
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
              disabled={!selectedFabric || totalPieces <= 0 || (!isEditing && lotMaxCapacity?.isFullyCut)}
              className="flex-[2] sm:flex-none px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-0"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {!selectedFabric
                  ? 'Select Fabric Lot First'
                  : (!isEditing && lotMaxCapacity?.isFullyCut)
                    ? 'Lot Target Reached'
                    : isEditing
                      ? 'Save Changes'
                      : 'Record Cutting'}
              </span>
              {selectedFabric && balanceAnalysis?.fullSets > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-purple-800 text-white text-[10px] font-black shrink-0">
                  {balanceAnalysis.fullSets} Sets
                </span>
              ) : selectedFabric && totalPieces > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-purple-800 text-white text-[10px] font-black shrink-0">
                  {totalPieces} PCs
                </span>
              ) : null}
            </button>
          </div>
        </form>
      </div>

    {/* Product Structure Modal (Admin only - NEVER expose pricing/rates to Master user) */}
    {!isMaster && showProductModal && selectedFabric && (
      <SetProductStructureModal
        key={`record-cut-prod-struct-${selectedFabric.id}`}
        isOpen={showProductModal}
        fabric={selectedFabric}
        onClose={() => setShowProductModal(false)}
        onSaved={() => setShowProductModal(false)}
      />
    )}

    {/* Alert Warning Modal */}
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

export default function RecordCuttingModal(props) {
  if (!props.isOpen) return null;
  return (
    <RecordCuttingDialog
      key={props.cuttingToEdit?.id || props.initialFabricId || 'new_cut'}
      {...props}
    />
  );
}
