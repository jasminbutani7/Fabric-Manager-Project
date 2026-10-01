import { useMemo } from 'react';
import {
  calculateReadyProductSets,
  formatPieceName,
  resolvePieceLabel,
  getPieceValueFromObject,
  getAssignmentSubPartsList,
  getFabricSubPartSkippedPieces,
  getMasterVerifiedTrimmedPiecesForSubPart,
  isLotFullyDelivered as checkLotFullyDelivered,
} from '../utils/productUtils';

export function getDueDateStatus(dueDate, status) {
  if (!dueDate) return null;
  const today = new Date().toISOString().split('T')[0];
  if (status === 'Delivered') {
    return {
      label: 'Completed',
      className: 'bg-teal-50 text-teal-700 border-teal-200/80',
      isWarning: false,
    };
  }
  const daysDiff = Math.ceil((new Date(dueDate) - new Date(today)) / (1000 * 60 * 60 * 24));
  if (daysDiff < 0) {
    return {
      label: `Overdue by ${Math.abs(daysDiff)}d`,
      className: 'bg-rose-50 text-rose-700 border-rose-200/80 font-bold',
      isWarning: true,
    };
  }
  if (daysDiff === 0) {
    return {
      label: 'Due Today',
      className: 'bg-amber-50 text-amber-700 border-amber-200/80 font-bold',
      isWarning: true,
    };
  }
  if (daysDiff <= 3) {
    return {
      label: `Due in ${daysDiff}d`,
      className: 'bg-amber-50 text-amber-700 border-amber-200/80 font-semibold',
      isWarning: false,
    };
  }
  return {
    label: `Due: ${dueDate}`,
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    isWarning: false,
  };
}

/**
 * Custom hook to calculate and memoize all derived production, cutting,
 * stitching, trimming, and delivery metrics for a specific fabric lot.
 *
 * Prevents heavy array aggregations and nested traversals on every render.
 */
export function useFabricLotMetrics(fabric, {
  cuttings = [],
  tailorAssignments = [],
  masterHandovers = [],
  threadCuttingAssignments = [],
  invoices = [],
  deliveryLogs = [],
} = {}) {
  return useMemo(() => {
    const f = fabric || {};
    const dueStatus = getDueDateStatus(f.dueDate, f.status);

    const linkedCuttings = (cuttings || []).filter((c) => c.fabricId === f.id);
    const linkedCuttingIds = linkedCuttings.map((c) => c.id);

    const linkedThreadJobs = (threadCuttingAssignments || []).filter(
      (tc) => tc.fabricId === f.id || linkedCuttingIds.includes(tc.cuttingId)
    );

    const readySetData = calculateReadyProductSets(f, {
      cuttings,
      masterHandovers,
      threadCuttingAssignments,
      invoices,
      deliveryLogs,
    });

    const {
      readyProductsCount = 0,
      missingSubParts = [],
      totalVerifiedPieces = 0,
    } = readySetData || {};

    const piecesAwaitingTrimming =
      readySetData?.totalPendingPieces !== undefined
        ? readySetData.totalPendingPieces
        : Math.max(0, totalVerifiedPieces - (readySetData?.completedTrimmedPieces || 0));

    let struct = f.productStructure || f.product_structure;
    if (typeof struct === 'string') {
      try {
        struct = JSON.parse(struct);
      } catch {
        struct = null;
      }
    }
    const lotSubParts = Array.isArray(struct?.subParts) && struct.subParts.length > 0
      ? struct.subParts
      : Array.isArray(struct?.parts) && struct.parts.length > 0
        ? struct.parts
        : [];

    const isProductConfigured = Boolean(
      lotSubParts.length > 0 &&
      Boolean(String(f.productName || struct?.productName || '').trim())
    );

    const readyPiecesCount =
      readySetData?.totalReadyPieces !== undefined
        ? readySetData.totalReadyPieces
        : (readyProductsCount > 0 ? readyProductsCount * Math.max(1, lotSubParts.length) : 0);

    const isLotFullyCompletedAndDelivered = checkLotFullyDelivered(f, {
      cuttings,
      tailorAssignments,
      masterHandovers,
      threadCuttingAssignments,
      invoices,
      deliveryLogs,
    });

    const isDelivered = Boolean(isLotFullyCompletedAndDelivered);

    const linkedInvoices = (invoices || []).filter(
      (inv) =>
        inv.id === f.invoiceId ||
        inv.fabricId === f.id ||
        linkedCuttings.some((c) => c.invoiceId === inv.id) ||
        linkedThreadJobs.some((tc) => tc.invoiceId === inv.id)
    );
    const linkedInvoice = linkedInvoices[0] || null;

    const isMasterAccepted = Boolean(
      f.acceptedByMaster ||
      f.masterAcceptedAt ||
      (f.status && f.status !== 'In Stock') ||
      linkedCuttings.length > 0
    );
    const isUnderMasterReview = Boolean(f.status === 'In Stock' && f.assignedMasterId && !isMasterAccepted);

    const isDeliveryValid =
      !isDelivered &&
      (readyPiecesCount > 0 ||
        readyProductsCount > 0 ||
        (!readySetData?.isAwaitingTrimmingDecision &&
          !readySetData?.isTrimmingInProgress &&
          (readySetData?.isCompleteProductReady || (readySetData?.isTrimmingSkipped && totalVerifiedPieces > 0))));

    const deliveryDisabledReason = isDelivered
      ? 'Goods already delivered to supplier.'
      : !isProductConfigured
        ? 'Configure product design & rates first.'
        : !f.assignedMasterId
          ? 'Assign to Cutting Master first.'
          : linkedCuttings.length === 0
            ? 'Cutting not recorded yet.'
            : totalVerifiedPieces === 0
              ? 'Awaiting finished goods from floor (verify handover first).'
              : readyProductsCount === 0 && readySetData?.isAwaitingTrimmingDecision
                ? 'Make Thread Trimming Decision first.'
                : readyProductsCount === 0 && readySetData?.isTrimmingInProgress
                  ? 'Complete Thread Trimming first.'
                  : '';

    const totalCutPieces = linkedCuttings.reduce(
      (acc, c) => acc + (parseInt(c.totalPieces, 10) || 0),
      0
    );

    let cutPiecesPerSet = 0;
    if (lotSubParts.length > 0) {
      lotSubParts.forEach((sp) => {
        const comps = Array.isArray(sp.components) && sp.components.length > 0 ? sp.components : [];
        if (comps.length > 0) {
          comps.forEach((c) => {
            cutPiecesPerSet += Math.max(1, parseInt(c.qty, 10) || 1);
          });
        } else {
          cutPiecesPerSet += 1;
        }
      });
    } else {
      cutPiecesPerSet = 1;
    }

    const cutSubPartsBreakdown = {};
    const cutGroups = [];

    if (lotSubParts.length > 0) {
      lotSubParts.forEach((sp, spIdx) => {
        const spId = sp.id || sp.name?.toLowerCase() || `part_${spIdx}`;
        const spName = sp.name || resolvePieceLabel(spId, struct) || 'Piece';
        const comps = Array.isArray(sp.components) && sp.components.length > 0 ? sp.components : [];

        const compItems = [];
        let subPartTotalCut = 0;

        if (comps.length > 0) {
          comps.forEach((comp) => {
            const compId = comp.id || comp.name?.toLowerCase();
            const compName = comp.name || resolvePieceLabel(compId, struct) || 'Cut Piece';
            const compQty = Math.max(1, parseInt(comp.qty, 10) || 1);
            let compCutCount = 0;

            linkedCuttings.forEach((c) => {
              const rawPieces = c.cutPieces || c.subParts || c.parts || {};
              compCutCount += getPieceValueFromObject(rawPieces, compName, compId);
            });

            subPartTotalCut += compCutCount;
            compItems.push({
              id: compId,
              name: compName,
              count: compCutCount,
              qty: compQty,
            });
          });
        } else {
          let directCut = 0;
          linkedCuttings.forEach((c) => {
            const rawPieces = c.cutPieces || c.subParts || c.parts || {};
            directCut += getPieceValueFromObject(rawPieces, spName, spId);
          });
          subPartTotalCut = directCut;
          compItems.push({
            id: spId,
            name: spName,
            count: directCut,
            qty: 1,
          });
        }

        cutSubPartsBreakdown[spName] = subPartTotalCut;
        cutGroups.push({
          id: spId,
          name: spName,
          totalCut: subPartTotalCut,
          components: compItems,
        });
      });
    }

    const derivedFullCutSets = cutGroups.length > 0
      ? Math.min(
          ...cutGroups.map((grp) => {
            if (!grp.components || grp.components.length === 0) {
              return grp.totalCut || 0;
            }
            return Math.min(
              ...grp.components.map((c) => Math.floor((c.count || 0) / (c.qty || 1)))
            );
          })
        )
      : (cutPiecesPerSet > 0 && totalCutPieces > 0 ? Math.floor(totalCutPieces / cutPiecesPerSet) : 0);

    const rawCutSets = linkedCuttings.reduce(
      (acc, c) => acc + (parseInt(c.setsCount || c.totalSets, 10) || 0),
      0
    );

    const totalCutSets = totalCutPieces > 0 && cutGroups.length > 0
      ? derivedFullCutSets
      : rawCutSets;

    const targetSets = parseInt(f.printPieces || f.productQuantity, 10) || totalCutSets || 0;
    const totalTargetCutPieces = targetSets > 0
      ? targetSets * cutPiecesPerSet
      : (totalCutSets > 0 ? totalCutSets * cutPiecesPerSet : totalCutPieces);
    const cutPercent = totalTargetCutPieces > 0
      ? Math.min(100, Math.round((totalCutPieces / totalTargetCutPieces) * 100))
      : totalCutSets > 0 && targetSets > 0
        ? Math.min(100, Math.round((totalCutSets / targetSets) * 100))
        : totalCutPieces > 0
          ? 100
          : 0;

    const linkedTailorAssignments = (tailorAssignments || []).filter(
      (a) => a.fabricId === f.id || linkedCuttingIds.includes(a.cuttingId)
    );

    let totalTailorAssignedPieces = 0;
    let totalStitchedPieces = 0;
    const stitchedSubPartsBreakdown = {};
    const pendingTailorSubPartsBreakdown = {};
    const assignedTailorSubPartsBreakdown = {};

    linkedTailorAssignments.forEach((a) => {
      const cutting = linkedCuttings.find((c) => c.id === a.cuttingId);
      const spList = getAssignmentSubPartsList(a, cutting, f);
      const subs = a.dailySubmissions || [];

      if (spList && spList.length > 0) {
        spList.forEach((sp) => {
          const spName = sp.name || resolvePieceLabel(sp.id, struct) || 'Piece';
          const targetCount = parseInt(sp.count, 10) || 0;
          totalTailorAssignedPieces += targetCount;
          assignedTailorSubPartsBreakdown[spName] =
            (assignedTailorSubPartsBreakdown[spName] || 0) + targetCount;

          let approvedCount = 0;
          subs.forEach((s) => {
            if (s.approvalStatus === 'Approved') {
              if (s.subParts && typeof s.subParts === 'object') {
                approvedCount += getPieceValueFromObject(s.subParts, sp.name, sp.id);
              } else if (s.parts && typeof s.parts === 'object') {
                approvedCount += getPieceValueFromObject(s.parts, sp.name, sp.id);
              } else if (spList.length === 1) {
                approvedCount += parseInt(s.pscQuantity, 10) || parseInt(s.quantity, 10) || 0;
              }
            }
          });

          if (approvedCount === 0 && spList.length === 1) {
            approvedCount = parseInt(a.completedQuantity || a.completedPieces, 10) || 0;
          }

          if (approvedCount > 0) {
            stitchedSubPartsBreakdown[spName] =
              (stitchedSubPartsBreakdown[spName] || 0) + approvedCount;
          }
          totalStitchedPieces += approvedCount;

          const pendingCount = Math.max(0, targetCount - approvedCount);
          if (pendingCount > 0) {
            pendingTailorSubPartsBreakdown[spName] =
              (pendingTailorSubPartsBreakdown[spName] || 0) + pendingCount;
          }
        });
      } else {
        const aTotal = parseInt(a.totalAssignedPieces, 10) || 0;
        totalTailorAssignedPieces += aTotal;

        const approvedSubs = subs
          .filter((s) => s.approvalStatus === 'Approved')
          .reduce(
            (sSum, s) =>
              sSum + (parseInt(s.pscQuantity, 10) || parseInt(s.quantity, 10) || 0),
            0
          );
        const aStitched =
          parseInt(a.completedQuantity || a.completedPieces, 10) || approvedSubs;
        totalStitchedPieces += aStitched;

        const pName =
          resolvePieceLabel(a.subPart || a.sub_part, struct) || a.subPart || 'Piece';
        if (aStitched > 0) {
          stitchedSubPartsBreakdown[pName] =
            (stitchedSubPartsBreakdown[pName] || 0) + aStitched;
        }
        const pendingCount = Math.max(0, aTotal - aStitched);
        if (pendingCount > 0) {
          pendingTailorSubPartsBreakdown[pName] =
            (pendingTailorSubPartsBreakdown[pName] || 0) + pendingCount;
        }
      }
    });

    const totalPendingTailorPieces = Math.max(
      0,
      totalTailorAssignedPieces - totalStitchedPieces
    );

    const subPartsCount = Math.max(1, lotSubParts.length);
    const totalTargetGarmentPieces = targetSets > 0
      ? targetSets * subPartsCount
      : (totalCutSets > 0 ? totalCutSets * subPartsCount : totalStitchedPieces);

    const stitchingPercent = totalTargetGarmentPieces > 0
      ? Math.min(100, Math.round((totalStitchedPieces / totalTargetGarmentPieces) * 100))
      : 0;

    const completedSets =
      readySetData?.totalCompletedSets !== undefined
        ? readySetData.totalCompletedSets
        : (readyProductsCount + Math.floor((readySetData?.alreadyDeliveredPieces || 0) / subPartsCount));

    const completedPercent = targetSets > 0
      ? Math.min(100, Math.round((completedSets / targetSets) * 100))
      : totalCutSets > 0
        ? Math.min(100, Math.round((completedSets / totalCutSets) * 100))
        : completedSets > 0
          ? 100
          : 0;

    const lotDeliveryLogs = (deliveryLogs || []).filter(
      (dl) => dl.fabricId === f.id || dl.fabric_id === f.id
    );
    const totalDeliveredFromLogs = lotDeliveryLogs.reduce(
      (sum, dl) => sum + (parseInt(dl.totalPieces ?? dl.total_pieces ?? dl.deliveredPSC, 10) || 0),
      0
    );

    const lotDeliveredPieces = Math.max(
      totalDeliveredFromLogs,
      readySetData?.alreadyDeliveredPieces || 0,
      parseInt(f.deliveredPSC || f.delivered_psc, 10) || 0
    );

    let deliveredSets = 0;
    const subPartsDeliveredRaw = f.subPartsDelivered || f.sub_parts_delivered;
    if (subPartsDeliveredRaw && typeof subPartsDeliveredRaw === 'object' && Object.keys(subPartsDeliveredRaw).length > 0) {
      const counts = lotSubParts.map((sp) => {
        const spKey = (sp.id || sp.name || '').toLowerCase().trim();
        const match = Object.entries(subPartsDeliveredRaw).find(
          ([k]) => k.toLowerCase().trim() === spKey
        );
        const q = parseInt(match?.[1], 10) || 0;
        return Math.floor(q / (parseInt(sp.qty || 1, 10) || 1));
      });
      if (counts.length > 0 && counts.every((c) => c >= 0)) {
        deliveredSets = Math.min(...counts);
      }
    }
    if (deliveredSets === 0 && lotDeliveredPieces > 0) {
      deliveredSets = Math.floor(lotDeliveredPieces / subPartsCount);
    }

    const deliveredPercent = targetSets > 0
      ? Math.min(100, Math.round((deliveredSets / targetSets) * 100))
      : totalCutSets > 0
        ? Math.min(100, Math.round((deliveredSets / totalCutSets) * 100))
        : completedSets > 0
          ? Math.min(100, Math.round((deliveredSets / completedSets) * 100))
          : 0;

    const isAllSetsDelivered = Boolean(
      (deliveredPercent >= 100 && deliveredSets > 0) ||
      (targetSets > 0 && deliveredSets >= targetSets) ||
      (totalTargetGarmentPieces > 0 && lotDeliveredPieces >= totalTargetGarmentPieces) ||
      isLotFullyCompletedAndDelivered
    );

    const isAllWorkDoneAndDelivered = Boolean(
      isDelivered ||
      isLotFullyCompletedAndDelivered ||
      (
        isAllSetsDelivered &&
        (readyPiecesCount <= 0 || (readySetData?.readyProductsCount || 0) <= 0) &&
        totalPendingTailorPieces <= 0 &&
        !readySetData?.isAwaitingTrimmingDecision &&
        !readySetData?.isTrimmingInProgress
      )
    );

    const isAllWorkDone = !isDelivered && !isAllWorkDoneAndDelivered && (
      !readySetData?.isAwaitingTrimmingDecision &&
      !readySetData?.isTrimmingInProgress &&
      readyPiecesCount > 0 &&
      (
        (completedPercent >= 100) ||
        (targetSets > 0 && readyProductsCount >= targetSets) ||
        (targetSets > 0 && completedSets >= targetSets) ||
        (cutPercent >= 100 && stitchingPercent >= 100) ||
        readySetData?.isCompleteProductReady
      )
    );

    const isCuttingDone = Boolean(
      cutPercent >= 100 ||
      (totalTargetCutPieces > 0 && totalCutPieces >= totalTargetCutPieces)
    );
    const hasInvoice = Boolean(linkedInvoice || f.invoiceId || f.invoice_id);
    const isTrimmingActionAvailable = Boolean(piecesAwaitingTrimming > 0);

    // ==========================================
    // EXTENDED STEP DETAILS (Steps 1 to 5)
    // ==========================================
    const lotHandovers = (masterHandovers || [])
      .filter(
        (mh) =>
          mh.fabricId === f.id ||
          mh.fabric_id === f.id ||
          linkedCuttingIds.includes(mh.cuttingId) ||
          linkedCuttingIds.includes(mh.cutting_id)
      )
      .sort(
        (a, b) =>
          new Date(b.handoverDate || b.createdAt || b.date || 0) -
          new Date(a.handoverDate || a.createdAt || a.date || 0)
      );

    const verifiedFromMaster = lotHandovers
      .filter((h) => h.status === 'Verified')
      .reduce(
        (sum, h) => sum + (parseInt(h.piecesCount ?? h.pieces ?? h.receivedQuantity, 10) || 0),
        0
      );
    const pendingFromMaster = lotHandovers
      .filter(
        (h) =>
          h.status === 'Pending Verification' ||
          h.status === 'Pending' ||
          !h.status
      )
      .reduce(
        (sum, h) => sum + (parseInt(h.piecesCount ?? h.pieces ?? h.receivedQuantity, 10) || 0),
        0
      );
    const rejectedFromMaster = lotHandovers
      .filter((h) => h.status === 'Rejected')
      .reduce(
        (sum, h) => sum + (parseInt(h.piecesCount ?? h.pieces ?? h.receivedQuantity, 10) || 0),
        0
      );
    // Only non-rejected handovers (verified + pending) count towards received from Master
    const totalReceivedFromMaster = verifiedFromMaster + pendingFromMaster;

    const subPartsList =
      Array.isArray(struct?.subParts) && struct.subParts.length > 0
        ? struct.subParts
        : Array.isArray(struct?.parts) && struct.parts.length > 0
          ? struct.parts
          : [];

    const fullSetRate =
      struct?.fullSetRate ||
      subPartsList.reduce(
        (acc, p) => acc + (parseFloat(p.rate || p.stitchingRate) || 0),
        0
      );
    const roundedFullSet = Math.round(fullSetRate * 100) / 100;

    const receivedSubPartsMap = {};
    const verifiedSubPartsMap = {};
    const pendingSubPartsMap = {};

    lotHandovers.forEach((h) => {
      // Exclude rejected handovers from received piece counts and custody maps
      if (h.status === 'Rejected') return;

      const parts =
        h.subParts && typeof h.subParts === 'object'
          ? h.subParts
          : h.parts && typeof h.parts === 'object'
            ? h.parts
            : null;
      const isVerified = h.status === 'Verified';

      if (parts) {
        Object.entries(parts).forEach(([k, v]) => {
          const cleanKey = resolvePieceLabel(k, struct) || formatPieceName(k);
          const count = parseInt(v, 10) || 0;
          if (count > 0) {
            receivedSubPartsMap[cleanKey] = (receivedSubPartsMap[cleanKey] || 0) + count;
            if (isVerified) {
              verifiedSubPartsMap[cleanKey] = (verifiedSubPartsMap[cleanKey] || 0) + count;
            } else {
              pendingSubPartsMap[cleanKey] = (pendingSubPartsMap[cleanKey] || 0) + count;
            }
          }
        });
      } else if (h.subPart || h.sub_part || h.partName) {
        const cleanKey = resolvePieceLabel(h.subPart || h.sub_part || h.partName, struct);
        const count = parseInt(h.piecesCount ?? h.pieces ?? h.receivedQuantity, 10) || 0;
        if (count > 0) {
          receivedSubPartsMap[cleanKey] = (receivedSubPartsMap[cleanKey] || 0) + count;
          if (isVerified) {
            verifiedSubPartsMap[cleanKey] = (verifiedSubPartsMap[cleanKey] || 0) + count;
          } else {
            pendingSubPartsMap[cleanKey] = (pendingSubPartsMap[cleanKey] || 0) + count;
          }
        }
      }
    });

    const targetPiecesMap = {};
    if (subPartsList.length > 0) {
      subPartsList.forEach((sp) => {
        const pName = resolvePieceLabel(sp.name || sp.id, struct) || sp.name || 'Piece';
        const qtyPerSet = parseInt(sp.qty, 10) || 1;
        targetPiecesMap[pName] = (targetPiecesMap[pName] || 0) + (targetSets > 0 ? targetSets * qtyPerSet : 0);
      });
    } else if (targetSets > 0) {
      const defaultName = f.productName || struct?.productName || 'PCs';
      targetPiecesMap[defaultName] = targetSets;
    }

    const allPieceNames = Array.from(
      new Set([
        ...Object.keys(targetPiecesMap),
        ...Object.keys(receivedSubPartsMap),
        ...Object.keys(verifiedSubPartsMap),
      ])
    );
    if (allPieceNames.length === 0) {
      allPieceNames.push(f.productName || struct?.productName || 'PCs');
    }

    const remainingPiecesMap = {};
    allPieceNames.forEach((pName) => {
      const t = targetPiecesMap[pName] || 0;
      const r = receivedSubPartsMap[pName] || 0;
      remainingPiecesMap[pName] = Math.max(0, t - r);
    });

    const totalExpectedFromPieces = Object.values(targetPiecesMap).reduce((a, b) => a + b, 0);
    const targetPiecesForStep3 = totalExpectedFromPieces > 0
      ? totalExpectedFromPieces
      : totalTargetGarmentPieces > 0
        ? totalTargetGarmentPieces
        : (totalTargetCutPieces > 0 ? totalTargetCutPieces : targetSets);

    const remainingFromMaster = Math.max(0, (targetPiecesForStep3 || 0) - totalReceivedFromMaster);
    const receivedPercent = targetPiecesForStep3 > 0
      ? Math.min(100, Math.round((totalReceivedFromMaster / targetPiecesForStep3) * 100))
      : (totalReceivedFromMaster > 0 ? 100 : 0);

    const step4AdminReceived = verifiedFromMaster > 0
      ? verifiedFromMaster
      : (readySetData?.totalGrossVerifiedPieces > 0
          ? readySetData.totalGrossVerifiedPieces
          : (Object.values(verifiedSubPartsMap).reduce((s, v) => s + (parseInt(v, 10) || 0), 0) || totalVerifiedPieces));

    const hasAdminCustody = step4AdminReceived > 0;

    let threadCuttedCount = 0;
    let totalSkippedCount = 0;
    let inProgressThreadCount = 0;
    const threadCuttedSubPartsMap = {};
    const inProgressSubPartsMap = {};
    const skippedMap = {};
    const awaitingTrimmingSubPartsMap = {};
    let lotThreadJobs = [];
    let lotThreadJobsForStep4 = [];

    if (hasAdminCustody) {
      const masterTrimmedSubPartsMap = {};
      allPieceNames.forEach((pName) => {
        const spObj = lotSubParts.find(
          (sp) => resolvePieceLabel(sp.id || sp.name, struct).toLowerCase().trim() === pName.toLowerCase().trim()
        );
        const count = getMasterVerifiedTrimmedPiecesForSubPart(
          lotHandovers,
          pName,
          spObj?.name || pName,
          spObj?.id || pName,
          lotSubParts,
          threadCuttingAssignments
        );
        if (count > 0) {
          masterTrimmedSubPartsMap[pName] = count;
        }
      });

      lotThreadJobs = (threadCuttingAssignments || [])
        .filter(
          (tc) =>
            (tc.fabricId === f.id || linkedCuttingIds.includes(tc.cuttingId)) &&
            tc.createdByRole !== 'master'
        )
        .sort(
          (a, b) =>
            new Date(b.assignedDate || b.createdAt || 0) -
            new Date(a.assignedDate || a.createdAt || 0)
        );

      lotThreadJobsForStep4 = lotThreadJobs;

      const isSkip = (tc) =>
        tc.status === 'Skipped' ||
        tc.actionType === 'skip' ||
        tc.action_type === 'skip';
      const lotAssignJobs = lotThreadJobs.filter((tc) => !isSkip(tc));

      const adminCuttedSubPartsMap = {};
      lotAssignJobs.forEach((tj) => {
        const pName = resolvePieceLabel(tj.subPart || tj.sub_part || tj.part || 'All Parts', struct);
        const c = parseInt(tj.completedPieces ?? tj.completedPSC, 10) || 0;
        if (c > 0) {
          adminCuttedSubPartsMap[pName] = (adminCuttedSubPartsMap[pName] || 0) + c;
        }
      });

      lotAssignJobs
        .filter((tc) => tc.status !== 'Completed')
        .forEach((tc) => {
          const pName = resolvePieceLabel(tc.subPart || tc.sub_part || tc.part || 'All Parts', struct);
          const rem = Math.max(
            0,
            (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0) -
            (parseInt(tc.completedPieces ?? tc.completedPSC, 10) || 0)
          );
          if (rem > 0) {
            inProgressSubPartsMap[pName] = (inProgressSubPartsMap[pName] || 0) + rem;
          }
        });

      inProgressThreadCount = Object.values(inProgressSubPartsMap).reduce(
        (s, v) => s + v,
        0
      );

      const rawSkippedMap = getFabricSubPartSkippedPieces(f, lotThreadJobs);
      Object.entries(rawSkippedMap).forEach(([k, v]) => {
        const pName = resolvePieceLabel(k, struct);
        skippedMap[pName] = (skippedMap[pName] || 0) + (parseInt(v, 10) || 0);
      });

      allPieceNames.forEach((pName) => {
        const verifiedCount = verifiedSubPartsMap[pName] || 0;
        const mTrimmed = masterTrimmedSubPartsMap[pName] || 0;
        const aCutted = adminCuttedSubPartsMap[pName] || 0;
        const totalCutted = Math.min(verifiedCount, mTrimmed + aCutted);
        if (totalCutted > 0) {
          threadCuttedSubPartsMap[pName] = totalCutted;
        }

        const pKey = pName.toLowerCase().trim();
        const skipped = Object.entries(skippedMap).find(
          ([sk]) => resolvePieceLabel(sk, struct).toLowerCase().trim() === pKey
        )?.[1] || 0;

        const assignedInProgress = inProgressSubPartsMap[pName] || 0;
        const remaining = Math.max(
          0,
          (parseInt(verifiedCount, 10) || 0) -
          (parseInt(skipped, 10) || 0) -
          (parseInt(totalCutted, 10) || 0) -
          (parseInt(assignedInProgress, 10) || 0)
        );
        if (remaining > 0) {
          awaitingTrimmingSubPartsMap[pName] = remaining;
        }
      });

      threadCuttedCount = Object.values(threadCuttedSubPartsMap).reduce(
        (sum, v) => sum + (parseInt(v, 10) || 0),
        0
      );

      totalSkippedCount = Object.values(skippedMap).reduce(
        (sum, v) => sum + (parseInt(v, 10) || 0),
        0
      );
    }

    const lotInvoices = (invoices || [])
      .filter((inv) => {
        if (inv.fabricId === f.id || inv.fabric_id === f.id) return true;
        if (inv.id === f.invoiceId || inv.id === f.invoice_id) return true;
        if (
          linkedCuttingIds.includes(inv.cuttingId) ||
          linkedCuttingIds.includes(inv.cutting_id)
        )
          return true;
        if (
          Array.isArray(inv.items) &&
          inv.items.some(
            (it) => it.fabricId === f.id || it.fabric_id === f.id
          )
        )
          return true;
        return false;
      })
      .sort(
        (a, b) =>
          new Date(b.date || b.createdAt || 0) -
          new Date(a.date || a.createdAt || 0)
      );

    const totalDeliveredFromInvoices = lotInvoices.reduce((sum, inv) => {
      const itemPsc = (inv.items || [])
        .filter((it) => !it.fabricId || it.fabricId === f.id)
        .reduce((s, it) => s + (parseInt(it.quantity, 10) || 0), 0);
      return (
        sum +
        (itemPsc ||
          parseInt(inv.deliveredPSC || inv.totalPieces, 10) ||
          0)
      );
    }, 0);

    const totalDeliveredPSC = Math.max(
      totalDeliveredFromLogs,
      totalDeliveredFromInvoices,
      parseInt(f.deliveredPSC || f.delivered_psc, 10) || 0
    );

    const deliveredSubPartsMap = {};

    lotDeliveryLogs.forEach((dl) => {
      const subs = dl.subParts || dl.subPartQuantities || dl.sub_parts || {};
      Object.entries(subs).forEach(([k, v]) => {
        const q = parseInt(v, 10) || 0;
        if (q > 0) {
          const pName = resolvePieceLabel(k, struct);
          deliveredSubPartsMap[pName] = (deliveredSubPartsMap[pName] || 0) + q;
        }
      });
    });

    if (f.subPartsDelivered && typeof f.subPartsDelivered === 'object') {
      Object.entries(f.subPartsDelivered).forEach(([k, v]) => {
        const q = parseInt(v, 10) || 0;
        if (q > 0) {
          const pName = resolvePieceLabel(k, struct);
          deliveredSubPartsMap[pName] = Math.max(deliveredSubPartsMap[pName] || 0, q);
        }
      });
    }

    lotInvoices.forEach((inv) => {
      if (Array.isArray(inv.items)) {
        inv.items.forEach((it) => {
          if (!it.fabricId || it.fabricId === f.id) {
            const pName = resolvePieceLabel(it.subPart || it.pieceName || it.description || it.fabricName, struct);
            const q = parseInt(it.quantity, 10) || 0;
            if (q > 0) {
              deliveredSubPartsMap[pName] = Math.max(deliveredSubPartsMap[pName] || 0, q);
            }
          }
        });
      }
    });

    const totalGoodsPiecesList = (() => {
      const list = [];
      allPieceNames.forEach((pName) => {
        const normK = pName.toLowerCase().trim();
        const count = verifiedSubPartsMap[pName] ||
          verifiedSubPartsMap[normK] ||
          readySetData?.grossSubPartVerifiedCounts?.[normK] ||
          0;
        if (count > 0) {
          list.push({ name: pName.toUpperCase(), count });
        }
      });
      if (list.length === 0 && readySetData?.grossSubPartVerifiedCounts) {
        Object.entries(readySetData.grossSubPartVerifiedCounts).forEach(([k, v]) => {
          const count = parseInt(v, 10) || 0;
          if (count > 0) {
            list.push({ name: resolvePieceLabel(k, struct).toUpperCase(), count });
          }
        });
      }
      if (list.length === 0 && f.subPartsVerified) {
        Object.entries(f.subPartsVerified).forEach(([k, v]) => {
          const count = parseInt(v, 10) || 0;
          if (count > 0) {
            list.push({ name: resolvePieceLabel(k, struct).toUpperCase(), count });
          }
        });
      }
      return list;
    })();

    const totalGoodsSubPartsBreakdown = totalGoodsPiecesList.length > 0
      ? totalGoodsPiecesList.map((it) => `${it.name}: ${it.count} PCs`).join(' • ')
      : null;

    const totalGoodsCount =
      totalTargetGarmentPieces > 0
        ? totalTargetGarmentPieces
        : (totalGoodsPiecesList.reduce((s, it) => s + it.count, 0) ||
           verifiedFromMaster ||
           (readySetData?.totalGrossVerifiedPieces || 0) ||
           Object.values(verifiedSubPartsMap).reduce((s, v) => s + (parseInt(v, 10) || 0), 0));

    const deliveredPiecesList = (() => {
      const list = [];
      allPieceNames.forEach((pName) => {
        const normK = pName.toLowerCase().trim();
        const count = deliveredSubPartsMap[pName] || deliveredSubPartsMap[normK] || 0;
        if (count > 0) {
          list.push({ name: pName.toUpperCase(), count });
        }
      });
      if (list.length === 0 && Object.keys(deliveredSubPartsMap).length > 0) {
        Object.entries(deliveredSubPartsMap).forEach(([k, v]) => {
          const count = parseInt(v, 10) || 0;
          if (count > 0) {
            list.push({ name: resolvePieceLabel(k, struct).toUpperCase(), count });
          }
        });
      }
      return list;
    })();

    const readyPiecesList = (() => {
      const list = [];
      const readyMap = readySetData?.subPartReadyPieces || {};
      Object.entries(readyMap).forEach(([k, v]) => {
        const count = parseInt(v, 10) || 0;
        if (count > 0) {
          list.push({ name: resolvePieceLabel(k, struct).toUpperCase(), count });
        }
      });
      return list;
    })();

    const isStep2Active = Boolean(f.assignedMasterId || linkedCuttings.length > 0);
    const isStep3Active = Boolean(
      isStep2Active && (
        isMasterAccepted ||
        f.status === 'In Cutting' ||
        f.acceptedByMaster ||
        lotHandovers.length > 0 ||
        totalReceivedFromMaster > 0 ||
        linkedCuttings.length > 0
      )
    );
    const isStep4Active = Boolean(
      isStep3Active && (
        totalSkippedCount > 0 ||
        threadCuttedCount > 0 ||
        lotThreadJobs.length > 0 ||
        readySetData?.isAwaitingTrimmingDecision ||
        readySetData?.isTrimmingInProgress ||
        readySetData?.isTrimmingCompleted ||
        readySetData?.isTrimmingSkipped ||
        piecesAwaitingTrimming > 0 ||
        verifiedFromMaster > 0
      )
    );
    const isStep5Active = Boolean(
      totalDeliveredPSC > 0 ||
      lotInvoices.length > 0 ||
      lotDeliveryLogs.length > 0 ||
      isDelivered ||
      readyPiecesCount > 0 ||
      readyProductsCount > 0 ||
      readySetData?.isCompleteProductReady
    );

    const step5Enabled = isStep5Active;
    const step4Enabled = step5Enabled || isStep4Active;
    const step3Enabled = step4Enabled || isStep3Active;
    const step2Enabled = step3Enabled || isStep2Active;
    const step1Enabled = true;

    const activeStepIds = [];
    if (step5Enabled) activeStepIds.push(5);
    if (step4Enabled) activeStepIds.push(4);
    if (step3Enabled) activeStepIds.push(3);
    if (step2Enabled) activeStepIds.push(2);
    if (step1Enabled) activeStepIds.push(1);

    return {
      dueStatus,
      linkedCuttings,
      linkedCuttingIds,
      linkedThreadJobs,
      readySetData,
      readyProductsCount,
      missingSubParts,
      totalVerifiedPieces,
      piecesAwaitingTrimming,
      struct,
      lotSubParts,
      isProductConfigured,
      readyPiecesCount,
      isLotFullyCompletedAndDelivered,
      isDelivered,
      linkedInvoices: (lotInvoices && lotInvoices.length > 0) ? lotInvoices : linkedInvoices,
      linkedInvoice: (lotInvoices && lotInvoices[0]) || linkedInvoice,
      isMasterAccepted,
      isUnderMasterReview,
      isDeliveryValid,
      deliveryDisabledReason,
      totalCutPieces,
      cutPiecesPerSet,
      cutSubPartsBreakdown,
      cutGroups,
      totalCutSets,
      targetSets,
      totalTargetCutPieces,
      cutPercent,
      linkedTailorAssignments,
      totalTailorAssignedPieces,
      totalStitchedPieces,
      stitchedSubPartsBreakdown,
      pendingTailorSubPartsBreakdown,
      assignedTailorSubPartsBreakdown,
      totalPendingTailorPieces,
      subPartsCount,
      totalTargetGarmentPieces,
      stitchingPercent,
      completedSets,
      completedPercent,
      lotDeliveryLogs,
      totalDeliveredFromLogs,
      lotDeliveredPieces,
      deliveredSets,
      deliveredPercent,
      isAllSetsDelivered,
      isAllWorkDoneAndDelivered,
      isAllWorkDone,
      isCuttingDone,
      hasInvoice,
      isTrimmingActionAvailable,
      // Extended details
      lotHandovers,
      totalReceivedFromMaster,
      verifiedFromMaster,
      pendingFromMaster,
      rejectedFromMaster,
      subPartsList,
      fullSetRate,
      roundedFullSet,
      receivedSubPartsMap,
      verifiedSubPartsMap,
      pendingSubPartsMap,
      targetPiecesMap,
      allPieceNames,
      remainingPiecesMap,
      totalExpectedFromPieces,
      targetPiecesForStep3,
      remainingFromMaster,
      receivedPercent,
      step4AdminReceived,
      hasAdminCustody,
      lotThreadJobs,
      lotThreadJobsForStep4,
      inProgressThreadCount,
      inProgressSubPartsMap,
      skippedMap,
      threadCuttedSubPartsMap,
      awaitingTrimmingSubPartsMap,
      totalAwaitingCount: Object.values(awaitingTrimmingSubPartsMap).reduce((s, v) => s + v, 0),
      threadCuttedCount,
      totalSkippedCount,
      lotInvoices,
      totalDeliveredFromInvoices,
      totalDeliveredPSC,
      deliveredSubPartsMap,
      totalGoodsPiecesList,
      totalGoodsSubPartsBreakdown,
      totalGoodsCount,
      deliveredPiecesList,
      readyPiecesList,
      isStep2Active,
      isStep3Active,
      isStep4Active,
      isStep5Active,
      step5Enabled,
      step4Enabled,
      step3Enabled,
      step2Enabled,
      step1Enabled,
      activeStepIds,
    };
  }, [
    fabric,
    cuttings,
    tailorAssignments,
    masterHandovers,
    threadCuttingAssignments,
    invoices,
    deliveryLogs,
  ]);
}
