import React, { useState, useMemo } from 'react';
import {
  X,
  Send,
  Calendar,
  Sparkles,
  AlertTriangle,
  FileText,
  PackageCheck,
  Plus,
  Minus,
  UserCheck,
  Scissors,
  Lock,
} from 'lucide-react';
import { useFabric, useProduction } from '../../context/useManagement';
import { sanitizeFabricName } from '../../context/managementContextInstance';
import { formatPieceName, getCuttingSubPartsList } from '../../utils/productUtils';
import { sanitizeInteger, blockInvalidNumberKeys } from '../../utils/formValidation';
import { getFabricTrimmingDetails } from '../../utils/masterHelpers';

function SubmitToAdminDialog({ onClose, cutting: initialCutting, fabric, master, onOpenTrimming }) {
  const { getProductStructure, cuttings = [] } = useFabric();
  const {
    submitMasterHandover,
    getMasterHandoverStats,
    tailorAssignments = [],
    masterHandovers = [],
    threadCuttingAssignments = [],
  } = useProduction();

  // Find all cutting batches linked to this fabric
  const fabricCuttings = cuttings.filter((c) =>
    fabric
      ? c.fabricId === fabric.id ||
        (fabric?.fabricName &&
          c.fabricName &&
          sanitizeFabricName(c.fabricName) === sanitizeFabricName(fabric?.fabricName)) ||
        (fabric?.fabricType &&
          c.fabricName &&
          sanitizeFabricName(c.fabricName) === sanitizeFabricName(fabric?.fabricType))
      : c.id === initialCutting?.id
  );

  const targetFabricId = fabric?.id || initialCutting?.fabricId;
  const fabricName = sanitizeFabricName(fabric?.fabricType || initialCutting?.fabricName || 'Fabric Lot');
  const linkedCutting = initialCutting || fabricCuttings[0] || null;

  // Product sub-parts defined by Admin
  const struct =
    fabric?.productStructure ||
    initialCutting?.productStructure ||
    (getProductStructure ? getProductStructure(fabric || initialCutting) : null);

  const productName = fabric?.productName || struct?.productName || 'Product';

  const subParts = useMemo(() => {
    if (struct?.subParts && Array.isArray(struct.subParts) && struct.subParts.length > 0) {
      return struct.subParts.map((sp) => ({
        id: sp.id || (sp.name ? sp.name.toLowerCase().replace(/\s+/g, '_') : 'part'),
        name: sp.name || 'Part',
        recipeLabel: sp.recipeLabel || null,
        components: sp.components || [],
      }));
    }
    return [
      { id: 'piece', name: productName || 'Piece', recipeLabel: null, components: [] },
    ];
  }, [struct, productName]);

  // Tailor metrics for this fabric / cutting
  const fabricTailorMetrics = useMemo(() => {
    const cuttingIds = new Set(fabricCuttings.map((c) => c.id));
    const assignments = (tailorAssignments || []).filter(
      (a) =>
        cuttingIds.has(a.cuttingId) ||
        (targetFabricId && String(a.fabricId) === String(targetFabricId))
    );

    const receivedByPart = {};
    subParts.forEach((sp) => {
      receivedByPart[sp.id] = 0;
    });

    let totalPsc = 0;

    assignments.forEach((a) => {
      (a.dailySubmissions || []).forEach((s) => {
        if (s.approvalStatus === 'Approved') {
          subParts.forEach((sp) => {
            const count =
              parseInt(s.subParts?.[sp.id] ?? s.subParts?.[sp.name] ?? s.parts?.[sp.id] ?? s.parts?.[sp.name], 10) ||
              0;
            receivedByPart[sp.id] += count;
          });

          const psc =
            parseInt(s.pscQuantity, 10) ||
            (s.subParts
              ? Object.values(s.subParts).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0)
              : 0) ||
            (parseInt(s.quantity, 10) || 0);
          totalPsc += psc;
        }
      });

      if (totalPsc === 0 && (a.completedQuantity || 0) > 0) {
        const direct = parseInt(a.completedQuantity, 10) || 0;
        totalPsc += direct;
        subParts.forEach((sp) => {
          receivedByPart[sp.id] += direct;
        });
      }
    });

    return { receivedByPart, totalPsc };
  }, [fabricCuttings, tailorAssignments, targetFabricId, subParts]);

  // Handovers already submitted for this fabric
  const fabricHandovers = useMemo(() => {
    return (masterHandovers || []).filter(
      (h) =>
        (String(h.fabricId) === String(targetFabricId) ||
          fabricCuttings.some((c) => c.id === h.cuttingId)) &&
        h.status !== 'Rejected'
    );
  }, [masterHandovers, targetFabricId, fabricCuttings]);

  const submittedPSC = fabricHandovers.reduce(
    (acc, h) => acc + (parseInt(h.piecesCount || h.pieces, 10) || 0),
    0
  );

  const submittedByPart = useMemo(() => {
    const res = {};
    subParts.forEach((sp) => {
      res[sp.id] = 0;
    });
    fabricHandovers.forEach((h) => {
      if (h.subParts) {
        subParts.forEach((sp) => {
          res[sp.id] += parseInt(h.subParts[sp.id] ?? h.subParts[sp.name], 10) || 0;
        });
      } else if (h.parts) {
        subParts.forEach((sp) => {
          res[sp.id] += parseInt(h.parts[sp.id] ?? h.parts[sp.name] ?? h.pieces, 10) || 0;
        });
      } else {
        const count = parseInt(h.pieces, 10) || 0;
        subParts.forEach((sp) => {
          res[sp.id] += count;
        });
      }
    });
    return res;
  }, [fabricHandovers, subParts]);

  // Floor trimming details: only pieces trimmed or skipped on floor can be handed over to Admin
  const fabricTrimmingDetails = useMemo(() => {
    return getFabricTrimmingDetails(targetFabricId, {
      cuttings: fabricCuttings,
      threadCuttingAssignments,
      tailorDetails: { totalPscReceived: fabricTailorMetrics.totalPsc },
      totalSubmittedPSC: submittedPSC,
      masterId: master?.id,
    });
  }, [targetFabricId, fabricCuttings, threadCuttingAssignments, fabricTailorMetrics.totalPsc, submittedPSC, master?.id]);

  // Available by sub-part (only pieces trimmed or skipped on floor are available for Admin)
  const availableByPart = useMemo(() => {
    const res = {};
    const totalProcessed = fabricTrimmingDetails.totalProcessedPSC;
    if (totalProcessed <= 0) {
      subParts.forEach((sp) => {
        res[sp.id] = 0;
      });
      return res;
    }

    let specificProcessedSum = 0;
    subParts.forEach((sp) => {
      const spKey = (sp.id || sp.name || '').toLowerCase().trim();
      const trimmed = fabricTrimmingDetails.trimmedBySubPart[spKey] || 0;
      const skipped = fabricTrimmingDetails.skippedBySubPart[spKey] || 0;
      specificProcessedSum += (trimmed + skipped);
    });

    const generalProcessed = Math.max(0, totalProcessed - specificProcessedSum);

    subParts.forEach((sp) => {
      const spKey = (sp.id || sp.name || '').toLowerCase().trim();
      const trimmed = fabricTrimmingDetails.trimmedBySubPart[spKey] || 0;
      const skipped = fabricTrimmingDetails.skippedBySubPart[spKey] || 0;
      const specificProcessed = trimmed + skipped;
      const rec = fabricTailorMetrics.receivedByPart[sp.id] || 0;
      const sub = submittedByPart[sp.id] || 0;

      if (specificProcessed > 0) {
        res[sp.id] = Math.max(0, Math.min(rec - sub, specificProcessed - sub));
      } else if (generalProcessed > 0) {
        // Fallback for general lot-level trimming: available up to generalProcessed or received - sub
        res[sp.id] = Math.max(0, Math.min(generalProcessed, rec - sub));
      } else {
        res[sp.id] = 0;
      }
    });
    return res;
  }, [subParts, fabricTrimmingDetails, submittedByPart, fabricTailorMetrics]);

  // Target pieces for the cutting batch (or fabric if whole lot)
  const targetPiecesCount = useMemo(() => {
    if (linkedCutting && getMasterHandoverStats) {
      const stats = getMasterHandoverStats(linkedCutting.id);
      if (stats?.totalExpectedPSC > 0) return stats.totalExpectedPSC;
    }
    const sumCuttings = fabricCuttings.reduce((acc, c) => {
      const stats = getMasterHandoverStats ? getMasterHandoverStats(c.id) : null;
      return acc + (stats?.totalExpectedPSC || parseInt(c.totalSets, 10) || 0);
    }, 0);
    if (sumCuttings > 0) return sumCuttings;
    return parseInt(fabric?.printPieces, 10) || 0;
  }, [linkedCutting, fabricCuttings, fabric, getMasterHandoverStats]);

  // Filter subparts to only those that were cut in this batch or received from tailors
  const relevantSubParts = useMemo(() => {
    const list = subParts.filter((sp) => {
      const avail = availableByPart[sp.id] || 0;
      const rec = fabricTailorMetrics.receivedByPart[sp.id] || 0;
      const sub = submittedByPart[sp.id] || 0;
      let isCutInLinked = false;
      if (linkedCutting) {
        if ((parseInt(linkedCutting.cutPieces?.[sp.id], 10) || 0) > 0) isCutInLinked = true;
        const cutSubList = getCuttingSubPartsList(linkedCutting, fabric);
        if (
          cutSubList.some(
            (csp) =>
              (csp.id === sp.id || csp.name?.toLowerCase() === sp.name?.toLowerCase()) &&
              csp.count > 0
          )
        ) {
          isCutInLinked = true;
        }
      }
      return avail > 0 || rec > 0 || sub > 0 || isCutInLinked;
    });
    return list.length > 0 ? list : subParts;
  }, [subParts, availableByPart, fabricTailorMetrics, submittedByPart, linkedCutting, fabric]);

  // Primary piece name
  const primaryPieceName = useMemo(() => {
    if (relevantSubParts.length === 1) {
      const name = relevantSubParts[0].name;
      return name.toLowerCase().includes('pc') ? formatPieceName(name, 2) : `${name} PCs`;
    }
    return 'PCs';
  }, [relevantSubParts]);

  // Accurate available pieces count (only trimmed or skipped pieces)
  const availablePSC = useMemo(() => {
    if (relevantSubParts.length === 1) {
      return availableByPart[relevantSubParts[0].id] || 0;
    }
    return fabricTrimmingDetails.readyForAdminPSC;
  }, [relevantSubParts, availableByPart, fabricTrimmingDetails.readyForAdminPSC]);

  // Accurate received from tailors count
  const receivedPSC = useMemo(() => {
    if (relevantSubParts.length === 1) {
      return fabricTailorMetrics.receivedByPart[relevantSubParts[0].id] || 0;
    }
    return fabricTailorMetrics.totalPsc;
  }, [relevantSubParts, fabricTailorMetrics]);

  // Accurate already submitted count
  const submittedPieces = useMemo(() => {
    if (relevantSubParts.length === 1) {
      return submittedByPart[relevantSubParts[0].id] || 0;
    }
    return submittedPSC;
  }, [relevantSubParts, submittedByPart, submittedPSC]);

  // Previously submitted trimmed and skipped pieces per subpart
  const previouslySubmittedByPart = useMemo(() => {
    const trimmed = {};
    const skipped = {};
    subParts.forEach((sp) => {
      trimmed[sp.id] = 0;
      skipped[sp.id] = 0;
    });

    fabricHandovers.forEach((h) => {
      const isTrim = h.trimmingStatus === 'trimmed' || (h.trimmedByMaster && !h.skippedByMaster);
      const isSkip = h.trimmingStatus === 'skipped' || (!h.trimmedByMaster && h.skippedByMaster);
      const isMixed = h.trimmingStatus === 'mixed' || (h.trimmedPieces > 0 && h.skippedTrimmingPieces > 0);

      subParts.forEach((sp) => {
        const count =
          parseInt(h.subParts?.[sp.id] ?? h.subParts?.[sp.name], 10) ||
          parseInt(h.parts?.[sp.id] ?? h.parts?.[sp.name], 10) ||
          (subParts.length === 1 ? (parseInt(h.piecesCount || h.pieces, 10) || 0) : 0);

        if (count > 0) {
          if (isTrim) {
            trimmed[sp.id] += count;
          } else if (isSkip) {
            skipped[sp.id] += count;
          } else if (isMixed) {
            if (h.trimmedSubParts?.[sp.id] !== undefined) {
              trimmed[sp.id] += parseInt(h.trimmedSubParts[sp.id], 10) || 0;
              skipped[sp.id] += parseInt(h.skippedSubParts?.[sp.id], 10) || 0;
            } else {
              const totalH = parseInt(h.piecesCount || h.pieces, 10) || 1;
              const tRatio = (parseInt(h.trimmedPieces, 10) || 0) / totalH;
              const tCount = Math.round(count * tRatio);
              trimmed[sp.id] += tCount;
              skipped[sp.id] += Math.max(0, count - tCount);
            }
          } else {
            trimmed[sp.id] += count;
          }
        }
      });
    });

    return { trimmed, skipped };
  }, [fabricHandovers, subParts]);

  // Subpart-level availability for Trimmed vs Skipped pieces
  const subPartAvailability = useMemo(() => {
    const res = {};
    const totalFloorTrimmed = fabricTrimmingDetails.trimmedPSC;
    const totalFloorSkipped = fabricTrimmingDetails.skippedPSC;

    let specificTrimmedSum = 0;
    let specificSkippedSum = 0;
    subParts.forEach((sp) => {
      const spKey = (sp.id || sp.name || '').toLowerCase().trim();
      specificTrimmedSum += (fabricTrimmingDetails.trimmedBySubPart[spKey] || 0);
      specificSkippedSum += (fabricTrimmingDetails.skippedBySubPart[spKey] || 0);
    });

    const generalTrimmed = Math.max(0, totalFloorTrimmed - specificTrimmedSum);
    const generalSkipped = Math.max(0, totalFloorSkipped - specificSkippedSum);

    subParts.forEach((sp) => {
      const spKey = (sp.id || sp.name || '').toLowerCase().trim();
      const rawTrimmed = fabricTrimmingDetails.trimmedBySubPart[spKey] || 0;
      const rawSkipped = fabricTrimmingDetails.skippedBySubPart[spKey] || 0;
      const subTrimmed = previouslySubmittedByPart.trimmed[sp.id] || 0;
      const subSkipped = previouslySubmittedByPart.skipped[sp.id] || 0;
      const rec = fabricTailorMetrics.receivedByPart[sp.id] || 0;

      const maxSubPartAvail = Math.max(0, rec - subTrimmed - subSkipped);
      let availTrimmed = 0;
      let availSkipped = 0;

      if (rawTrimmed > 0) {
        availTrimmed = Math.max(0, Math.min(maxSubPartAvail, rawTrimmed - subTrimmed));
      } else if (generalTrimmed > 0) {
        availTrimmed = Math.max(0, Math.min(generalTrimmed, maxSubPartAvail));
      }

      const remainingForSkipped = Math.max(0, maxSubPartAvail - availTrimmed);

      if (rawSkipped > 0) {
        availSkipped = Math.max(0, Math.min(remainingForSkipped, rawSkipped - subSkipped));
      } else if (generalSkipped > 0) {
        availSkipped = Math.max(0, Math.min(generalSkipped, remainingForSkipped));
      }

      res[sp.id] = {
        trimmed: availTrimmed,
        skipped: availSkipped,
        total: availTrimmed + availSkipped,
      };
    });
    return res;
  }, [subParts, fabricTrimmingDetails, previouslySubmittedByPart, fabricTailorMetrics]);

  // Trimmed quantities per subpart
  const [trimmedQuantities, setTrimmedQuantities] = useState(() => {
    const init = {};
    relevantSubParts.forEach((sp) => {
      const avail = subPartAvailability[sp.id]?.trimmed || 0;
      init[sp.id] = avail > 0 ? String(avail) : '';
    });
    return init;
  });

  // Skipped quantities per subpart
  const [skippedQuantities, setSkippedQuantities] = useState(() => {
    const init = {};
    relevantSubParts.forEach((sp) => {
      const avail = subPartAvailability[sp.id]?.skipped || 0;
      init[sp.id] = avail > 0 ? String(avail) : '';
    });
    return init;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Steppers and inputs for Trimmed
  const handleTrimmedChange = (partId, value) => {
    setErrorMessage('');
    const maxVal = subPartAvailability[partId]?.trimmed !== undefined ? subPartAvailability[partId].trimmed : 100000;
    const sanitized = sanitizeInteger(value, { min: 0, max: maxVal });
    setTrimmedQuantities((prev) => ({
      ...prev,
      [partId]: sanitized,
    }));
  };

  const handleTrimmedStep = (partId, delta) => {
    setErrorMessage('');
    const current = parseInt(trimmedQuantities[partId], 10) || 0;
    const maxVal = subPartAvailability[partId]?.trimmed || 0;
    const next = Math.max(0, Math.min(maxVal, current + delta));
    setTrimmedQuantities((prev) => ({
      ...prev,
      [partId]: next > 0 ? String(next) : '',
    }));
  };

  const handleTrimmedSetMax = (partId) => {
    setErrorMessage('');
    const maxVal = subPartAvailability[partId]?.trimmed || 0;
    if (maxVal > 0) {
      setTrimmedQuantities((prev) => ({
        ...prev,
        [partId]: String(maxVal),
      }));
    }
  };

  // Steppers and inputs for Skipped
  const handleSkippedChange = (partId, value) => {
    setErrorMessage('');
    const maxVal = subPartAvailability[partId]?.skipped !== undefined ? subPartAvailability[partId].skipped : 100000;
    const sanitized = sanitizeInteger(value, { min: 0, max: maxVal });
    setSkippedQuantities((prev) => ({
      ...prev,
      [partId]: sanitized,
    }));
  };

  const handleSkippedStep = (partId, delta) => {
    setErrorMessage('');
    const current = parseInt(skippedQuantities[partId], 10) || 0;
    const maxVal = subPartAvailability[partId]?.skipped || 0;
    const next = Math.max(0, Math.min(maxVal, current + delta));
    setSkippedQuantities((prev) => ({
      ...prev,
      [partId]: next > 0 ? String(next) : '',
    }));
  };

  const handleSkippedSetMax = (partId) => {
    setErrorMessage('');
    const maxVal = subPartAvailability[partId]?.skipped || 0;
    if (maxVal > 0) {
      setSkippedQuantities((prev) => ({
        ...prev,
        [partId]: String(maxVal),
      }));
    }
  };

  // Batch fill & clear actions
  const handleFillAllTrimmed = () => {
    setErrorMessage('');
    const updated = {};
    relevantSubParts.forEach((sp) => {
      const avail = subPartAvailability[sp.id]?.trimmed || 0;
      updated[sp.id] = avail > 0 ? String(avail) : '';
    });
    setTrimmedQuantities(updated);
  };

  const handleFillAllSkipped = () => {
    setErrorMessage('');
    const updated = {};
    relevantSubParts.forEach((sp) => {
      const avail = subPartAvailability[sp.id]?.skipped || 0;
      updated[sp.id] = avail > 0 ? String(avail) : '';
    });
    setSkippedQuantities(updated);
  };

  const handleFillAllBoth = () => {
    setErrorMessage('');
    handleFillAllTrimmed();
    handleFillAllSkipped();
  };

  const handleClearAllBoth = () => {
    setErrorMessage('');
    const empty = {};
    relevantSubParts.forEach((sp) => {
      empty[sp.id] = '';
    });
    setTrimmedQuantities(empty);
    setSkippedQuantities(empty);
  };

  // Totals calculations
  const trimmedTotal = relevantSubParts.reduce(
    (sum, sp) => sum + (parseInt(trimmedQuantities[sp.id], 10) || 0),
    0
  );
  const skippedTotal = relevantSubParts.reduce(
    (sum, sp) => sum + (parseInt(skippedQuantities[sp.id], 10) || 0),
    0
  );
  const totalEntered = trimmedTotal + skippedTotal;

  const totalTrimmedAvail = relevantSubParts.reduce(
    (sum, sp) => sum + (subPartAvailability[sp.id]?.trimmed || 0),
    0
  );
  const totalSkippedAvail = relevantSubParts.reduce(
    (sum, sp) => sum + (subPartAvailability[sp.id]?.skipped || 0),
    0
  );

  const combinedSubParts = useMemo(() => {
    const res = {};
    relevantSubParts.forEach((sp) => {
      const t = parseInt(trimmedQuantities[sp.id], 10) || 0;
      const s = parseInt(skippedQuantities[sp.id], 10) || 0;
      res[sp.id] = t + s;
    });
    return res;
  }, [relevantSubParts, trimmedQuantities, skippedQuantities]);

  const partNumberValues = relevantSubParts.map((sp) => combinedSubParts[sp.id] || 0);
  const minPartEntered = relevantSubParts.length > 0 && partNumberValues.length > 0 ? Math.min(...partNumberValues) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (totalEntered <= 0) {
      setErrorMessage(`Please enter the number of pieces to handover.`);
      return;
    }

    for (const sp of relevantSubParts) {
      const tQty = parseInt(trimmedQuantities[sp.id], 10) || 0;
      const sQty = parseInt(skippedQuantities[sp.id], 10) || 0;
      const tMax = subPartAvailability[sp.id]?.trimmed || 0;
      const sMax = subPartAvailability[sp.id]?.skipped || 0;

      if (tQty > tMax) {
        setErrorMessage(`You entered ${tQty} Trimmed ${sp.name}, but only ${tMax} are available on the floor.`);
        return;
      }
      if (sQty > sMax) {
        setErrorMessage(`You entered ${sQty} Skipped ${sp.name}, but only ${sMax} are available on the floor.`);
        return;
      }
    }

    setIsSubmitting(true);

    const subPartsData = {};
    const trimmedSubPartsData = {};
    const skippedSubPartsData = {};

    relevantSubParts.forEach((sp) => {
      const t = parseInt(trimmedQuantities[sp.id], 10) || 0;
      const s = parseInt(skippedQuantities[sp.id], 10) || 0;
      subPartsData[sp.id] = t + s;
      trimmedSubPartsData[sp.id] = t;
      skippedSubPartsData[sp.id] = s;
    });

    const partsData = {};
    relevantSubParts.forEach((sp) => {
      const spQty = subPartsData[sp.id] || 0;
      if (sp.components && Array.isArray(sp.components) && sp.components.length > 0) {
        sp.components.forEach((c) => {
          const compKey = c.id || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          partsData[compKey] = (partsData[compKey] || 0) + spQty * (parseInt(c.qty, 10) || 1);
        });
      } else {
        partsData[sp.id] = (partsData[sp.id] || 0) + spQty;
      }
    });

    const formulaStr = relevantSubParts
      .map((sp) => `${subPartsData[sp.id] || 0} ${formatPieceName(sp.name, subPartsData[sp.id] || 0)}`)
      .join(' + ');

    const computedStatus =
      trimmedTotal > 0 && skippedTotal > 0
        ? 'mixed'
        : trimmedTotal > 0
        ? 'trimmed'
        : 'skipped';

    const res = submitMasterHandover({
      cuttingId: linkedCutting?.id || null,
      fabricId: targetFabricId || null,
      fabricName,
      productName,
      masterId: master?.id || linkedCutting?.masterId || null,
      masterName: master?.name || linkedCutting?.masterName || 'Cutting Master',
      piecesCount: totalEntered,
      pieces: totalEntered,
      totalSets: minPartEntered,
      subParts: subPartsData,
      trimmedSubParts: trimmedSubPartsData,
      skippedSubParts: skippedSubPartsData,
      parts: partsData,
      combinationFormula: formulaStr,
      date,
      notes: notes.trim(),
      trimmingStatus: computedStatus,
      trimmedByMaster: trimmedTotal > 0,
      skippedByMaster: skippedTotal > 0,
      trimmedPieces: trimmedTotal,
      skippedTrimmingPieces: skippedTotal,
    });

    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to submit to Admin.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 text-left">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 text-left">
        {/* Header - Streamlined Gradient */}
        <div className="p-3 sm:p-3.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
              <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-black tracking-tight leading-tight">
                  Submit Stitched {primaryPieceName} to Admin
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 shrink-0">
                  Master Handover
                </span>
              </div>
              <p className="text-[11px] text-purple-100 font-medium truncate mt-0.5">
                {fabricName} • Batch #{linkedCutting?.id ? linkedCutting.id.slice(-6) : 'N/A'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form with Scrollable Body + Sticky Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0 text-left">
          {/* Scrollable Content */}
          <div className="p-3 sm:p-3.5 space-y-2.5 overflow-y-auto flex-1 text-left">
            {/* Custodian & Destination Compact Strip */}
            <div className="px-2.5 py-1.5 bg-slate-50/90 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="font-extrabold text-slate-800 truncate text-[11px] sm:text-xs">
                  {master?.name || linkedCutting?.masterName || 'Cutting Master'}
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">• Floor Custody</span>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-lg shrink-0">
                To: Factory Admin
              </span>
            </div>

            {/* 4 Overview Metric Cards - Unified Slim Bar */}
            <div className="p-2 bg-slate-50/90 rounded-xl border border-slate-200/80 grid grid-cols-4 divide-x divide-slate-200/80 text-center">
              <div className="px-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Target</span>
                <span className="text-xs sm:text-sm font-black text-slate-800 block">{targetPiecesCount}</span>
                <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold truncate block">Sets</span>
              </div>
              <div className="px-1">
                <span className="text-[9px] text-purple-600 font-bold uppercase block">Received</span>
                <span className="text-xs sm:text-sm font-black text-purple-700 block">{receivedPSC}</span>
                <span className="text-[8px] sm:text-[9px] text-purple-600 font-bold truncate block">{primaryPieceName}</span>
              </div>
              <div className="px-1">
                <span className="text-[9px] text-indigo-600 font-bold uppercase block">Submitted</span>
                <span className="text-xs sm:text-sm font-black text-indigo-700 block">{submittedPieces}</span>
                <span className="text-[8px] sm:text-[9px] text-indigo-600 font-bold truncate block">{primaryPieceName}</span>
              </div>
              <div className="px-1">
                <span className="text-[9px] text-emerald-600 font-bold uppercase block">Available</span>
                <span className="text-xs sm:text-sm font-black text-emerald-700 block">{availablePSC}</span>
                <span className="text-[8px] sm:text-[9px] text-emerald-700 font-bold truncate block">{primaryPieceName}</span>
              </div>
            </div>

            {availablePSC === 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900 text-xs">
                      0 pieces ready for Admin Handover.
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-amber-800/90 mt-0.5">
                      {receivedPSC} pieces received from tailors must be trimmed or skipped in Trimming tab before handover.
                    </p>
                  </div>
                </div>
                {onOpenTrimming && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTrimming();
                    }}
                    className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs shrink-0 self-end sm:self-center cursor-pointer flex items-center gap-1"
                  >
                    <Scissors className="w-3 h-3" />
                    <span>Go to Trimming</span>
                  </button>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Handover Section Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1.5 pt-0.5">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <span>Quantity to Handover to Admin</span>
                  <span className="text-rose-500">*</span>
                </label>

                <div className="flex items-center gap-1.5">
                  {availablePSC > 0 && (
                    <button
                      type="button"
                      onClick={handleFillAllBoth}
                      className="text-[11px] font-black text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200/80 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                      title="Fill all parts to maximum available"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      <span>Max All ({availablePSC})</span>
                    </button>
                  )}
                  {totalEntered > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllBoth}
                      className="text-[11px] font-bold text-slate-500 hover:text-rose-600 px-2 py-0.5 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* 1ST SUB-SECTION: Trimmed by Master */}
              <div className="rounded-xl border border-teal-200/90 bg-teal-50/20 p-2 sm:p-2.5 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-teal-600 text-white flex items-center justify-center shadow-xs">
                      <Scissors className="w-3 h-3" />
                    </div>
                    <span className="text-[11px] font-black text-teal-950 uppercase tracking-wide">
                      1. Trimmed by Master
                    </span>
                    <span className="text-[10px] text-teal-700 font-bold">
                      ({totalTrimmedAvail} Avail)
                    </span>
                  </div>

                  {totalTrimmedAvail > 0 && (
                    <button
                      type="button"
                      onClick={handleFillAllTrimmed}
                      className="text-[10px] font-bold text-teal-800 hover:bg-teal-100 bg-white border border-teal-200 px-2 py-0.5 rounded-md transition-all cursor-pointer active:scale-95"
                    >
                      Max ({totalTrimmedAvail})
                    </button>
                  )}
                </div>

                {/* Subparts list for Trimmed */}
                <div className="space-y-1">
                  {relevantSubParts.map((sp) => {
                    const val = trimmedQuantities[sp.id] || '';
                    const numVal = parseInt(val, 10) || 0;
                    const avail = subPartAvailability[sp.id]?.trimmed || 0;
                    const isMax = numVal === avail && avail > 0;
                    const isOver = numVal > avail;
                    const isDisabled = avail === 0;

                    return (
                      <div
                        key={sp.id}
                        className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                          numVal > 0
                            ? 'bg-white border-teal-300 ring-1 ring-teal-200/60 shadow-2xs'
                            : isDisabled
                            ? 'bg-slate-50/60 border-slate-200/60 opacity-60'
                            : 'bg-white border-slate-200/90'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-1.5 truncate">
                          <span className="text-xs font-black text-slate-800 truncate">
                            {sp.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                            ({avail} in custody)
                          </span>
                        </div>

                        {/* Right: Max button + Tactile Stepper */}
                        <div className="flex items-center gap-1 shrink-0 ml-auto">
                          {avail > 0 && (
                            <button
                              type="button"
                              onClick={() => handleTrimmedSetMax(sp.id)}
                              className={`text-[10px] font-black px-1.5 py-0.5 rounded border transition-all active:scale-95 cursor-pointer ${
                                isMax
                                  ? 'bg-teal-600 text-white border-teal-600'
                                  : 'bg-white hover:bg-teal-50 text-teal-700 border-teal-200'
                              }`}
                            >
                              MAX
                            </button>
                          )}

                          <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleTrimmedStep(sp.id, -1)}
                              disabled={numVal <= 0}
                              className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 active:scale-95 transition-all cursor-pointer font-bold"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>

                            <input
                              type="number"
                              min="0"
                              max={avail || undefined}
                              placeholder="0"
                              value={val}
                              disabled={isDisabled}
                              onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                              onChange={(e) => handleTrimmedChange(sp.id, e.target.value)}
                              className={`w-11 sm:w-12 py-0.5 text-center font-black text-xs bg-transparent focus:outline-none ${
                                isOver ? 'text-rose-600 font-black' : numVal > 0 ? 'text-teal-900 font-black' : 'text-slate-800'
                              }`}
                            />

                            <button
                              type="button"
                              onClick={() => handleTrimmedStep(sp.id, 1)}
                              disabled={isDisabled || numVal >= avail}
                              className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 active:scale-95 transition-all cursor-pointer font-bold"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2ND SUB-SECTION: Trimming Skipped */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-2 sm:p-2.5 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-slate-800 text-white flex items-center justify-center shadow-xs">
                      <Lock className="w-3 h-3" />
                    </div>
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                      2. Trimming Skipped
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold">
                      ({totalSkippedAvail} Avail)
                    </span>
                  </div>

                  {totalSkippedAvail > 0 && (
                    <button
                      type="button"
                      onClick={handleFillAllSkipped}
                      className="text-[10px] font-bold text-slate-800 hover:bg-slate-200 bg-white border border-slate-300 px-2 py-0.5 rounded-md transition-all cursor-pointer active:scale-95"
                    >
                      Max ({totalSkippedAvail})
                    </button>
                  )}
                </div>

                {/* Subparts list for Skipped */}
                <div className="space-y-1">
                  {relevantSubParts.map((sp) => {
                    const val = skippedQuantities[sp.id] || '';
                    const numVal = parseInt(val, 10) || 0;
                    const avail = subPartAvailability[sp.id]?.skipped || 0;
                    const isMax = numVal === avail && avail > 0;
                    const isOver = numVal > avail;
                    const isDisabled = avail === 0;

                    return (
                      <div
                        key={sp.id}
                        className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                          numVal > 0
                            ? 'bg-white border-slate-400 ring-1 ring-slate-300 shadow-2xs'
                            : isDisabled
                            ? 'bg-slate-50/60 border-slate-200/60 opacity-60'
                            : 'bg-white border-slate-200/90'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-1.5 truncate">
                          <span className="text-xs font-black text-slate-800 truncate">
                            {sp.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                            ({avail} in custody)
                          </span>
                        </div>

                        {/* Right: Max button + Tactile Stepper */}
                        <div className="flex items-center gap-1 shrink-0 ml-auto">
                          {avail > 0 && (
                            <button
                              type="button"
                              onClick={() => handleSkippedSetMax(sp.id)}
                              className={`text-[10px] font-black px-1.5 py-0.5 rounded border transition-all active:scale-95 cursor-pointer ${
                                isMax
                                  ? 'bg-slate-800 text-white border-slate-800'
                                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                              }`}
                            >
                              MAX
                            </button>
                          )}

                          <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleSkippedStep(sp.id, -1)}
                              disabled={numVal <= 0}
                              className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 active:scale-95 transition-all cursor-pointer font-bold"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>

                            <input
                              type="number"
                              min="0"
                              max={avail || undefined}
                              placeholder="0"
                              value={val}
                              disabled={isDisabled}
                              onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                              onChange={(e) => handleSkippedChange(sp.id, e.target.value)}
                              className={`w-11 sm:w-12 py-0.5 text-center font-black text-xs bg-transparent focus:outline-none ${
                                isOver ? 'text-rose-600 font-black' : numVal > 0 ? 'text-slate-900 font-black' : 'text-slate-800'
                              }`}
                            />

                            <button
                              type="button"
                              onClick={() => handleSkippedStep(sp.id, 1)}
                              disabled={isDisabled || numVal >= avail}
                              className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 active:scale-95 transition-all cursor-pointer font-bold"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Combined Submitting to Admin Summary Strip */}
              {totalEntered > 0 && (
                <div className="p-2 bg-gradient-to-r from-purple-50 via-indigo-50/40 to-purple-50/30 rounded-xl border border-purple-100/90 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 font-extrabold text-purple-950 text-[11px]">
                      <PackageCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Submitting:</span>
                      <span className="font-black text-purple-800">{totalEntered} PCs Total</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {trimmedTotal > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-900 font-black text-[10px]">
                          ✂️ {trimmedTotal} Trimmed
                        </span>
                      )}
                      {skippedTotal > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-900 font-black text-[10px]">
                          🔒 {skippedTotal} Skipped
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 pt-0.5 border-t border-purple-100/70">
                    {trimmedTotal > 0 && skippedTotal > 0 ? (
                      <>✓ {trimmedTotal} PCs received as Trimmed. {skippedTotal} PCs flagged for Admin trimming.</>
                    ) : trimmedTotal > 0 ? (
                      <>✓ All {trimmedTotal} PCs ready for packing/delivery.</>
                    ) : (
                      <>⚠️ Admin notified trimming was skipped for all {skippedTotal} PCs.</>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Handover Date & Notes Grid - Compact */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Date</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-800 bg-white"
                  required
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>Notes</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-800 bg-white placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="p-2.5 sm:p-3 border-t border-slate-100 bg-white/95 backdrop-blur-xs flex items-center justify-between gap-2 shrink-0 shadow-lg">
            <button
              type="button"
              onClick={onClose}
              className="w-20 sm:w-24 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availablePSC === 0 || (totalEntered <= 0 && !partNumberValues.some((v) => v > 0))}
              className="flex-1 py-2.5 px-3 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-md shadow-purple-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-0"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Submit to Admin</span>
              {totalEntered > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-700/80 text-white text-[10px] font-black shrink-0">
                  {totalEntered} PCs
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SubmitToAdminModal({ isOpen, onClose, cutting, fabric, master, onOpenTrimming }) {
  if (!isOpen || (!cutting && !fabric)) return null;
  return (
    <SubmitToAdminDialog
      onClose={onClose}
      cutting={cutting}
      fabric={fabric}
      master={master}
      onOpenTrimming={onOpenTrimming}
    />
  );
}
