import {
  mapHandoverToDb,
  mapCuttingToDb,
  mapFabricToDb,
} from '../../../services/dbMappers';
import {
  getCuttingSubPartsList,
} from '../../../utils/productUtils';
import { generateEntityId } from '../../../utils/idGenerator';

export function useMasterHandoverOps(params) {
  const {
    tailorAssignments,
    masterHandovers,
    setMasterHandovers,
    threadCuttingAssignments,
    fabrics,
    setFabrics,
    cuttings,
    setCuttings,
    saveToDb,
    dbRemove,
  } = params;
  const submitMasterHandover = (data) => {
    const piecesCount = parseInt(data.piecesCount || data.pieces, 10) || 0;
    if (piecesCount <= 0) {
      return { success: false, error: 'Number of complete PSC must be greater than 0.' };
    }

    const cutting = cuttings.find((c) => c.id === data.cuttingId);

    let pscCombinationParts = data.parts;
    if (!pscCombinationParts && data.subParts) {
      pscCombinationParts = { ...data.subParts };
    }
    if (!pscCombinationParts) {
      pscCombinationParts = { total: piecesCount };
    }

    const newHandover = {
      id: generateEntityId('mh'),
      cuttingId: data.cuttingId,
      fabricId: data.fabricId || cutting?.fabricId || null,
      fabricName: data.fabricName || cutting?.fabricName || 'Garment Batch',
      productName: data.productName || cutting?.productName || 'Product',
      masterId: data.masterId || cutting?.masterId || null,
      masterName: data.masterName || cutting?.masterName || 'Cutting Master',
      piecesCount,
      pieces: piecesCount,
      subParts: data.subParts || null,
      trimmedSubParts: data.trimmedSubParts || null,
      skippedSubParts: data.skippedSubParts || null,
      parts: pscCombinationParts,
      combinationFormula: data.combinationFormula || 'Combined Cut PSC per Product Unit',
      date: data.date || new Date().toISOString().split('T')[0],
      notes: (data.notes || '').trim(),
      status: 'Pending Verification',
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
      trimmingStatus: data.trimmingStatus || (data.trimmedByMaster ? 'trimmed' : data.skippedByMaster ? 'skipped' : null),
      trimmedByMaster: Boolean(data.trimmedByMaster || data.trimmingStatus === 'trimmed'),
      skippedByMaster: Boolean(data.skippedByMaster || data.trimmingStatus === 'skipped'),
      trimmedPieces: parseInt(data.trimmedPieces, 10) || 0,
      skippedTrimmingPieces: parseInt(data.skippedTrimmingPieces, 10) || 0,
      trimmingHelperName: data.trimmingHelperName || null,
      trimmingHelperType: data.trimmingHelperType || null,
      createdAt: new Date().toISOString(),
    };

    setMasterHandovers((prev) => [newHandover, ...prev]);
    saveToDb('master_handovers', mapHandoverToDb, newHandover);

    if (data.cuttingId) {
      const existingSubmitted = masterHandovers
        .filter((h) => h.cuttingId === data.cuttingId && h.status !== 'Rejected')
        .reduce((acc, h) => acc + (parseInt(h.piecesCount || h.pieces, 10) || 0), 0);
      const totalSubmitted = existingSubmitted + piecesCount;
      let targetPSC = parseInt(cutting?.totalSets, 10) || 0;
      if (!targetPSC && cutting?.cutPieces && typeof cutting.cutPieces === 'object') {
        const partsCut = Object.values(cutting.cutPieces).map((v) => parseInt(v, 10) || 0).filter((v) => v > 0);
        if (partsCut.length > 0) targetPSC = Math.min(...partsCut);
      }
      if (!targetPSC) {
        targetPSC = parseInt(cutting?.totalPieces, 10) || 0;
      }

      if (targetPSC > 0 && totalSubmitted >= targetPSC) {
        setCuttings((prev) =>
          prev.map((c) => {
            if (c.id === data.cuttingId) {
              const updatedCutting = { ...c, masterWorkDone: true };
              saveToDb('cuttings', mapCuttingToDb, updatedCutting);
              return updatedCutting;
            }
            return c;
          })
        );
      }
    }

    return { success: true, handover: newHandover };
  };

  const verifyMasterHandover = (handoverId, adminName = 'Factory Admin') => {
    let targetCuttingId = null;
    let targetFabricId = null;

    setMasterHandovers((prev) =>
      prev.map((h) => {
        if (h.id === handoverId) {
          targetCuttingId = h.cuttingId;
          targetFabricId = h.fabricId;
          const updatedHandover = {
            ...h,
            status: 'Verified',
            verifiedBy: adminName,
            verifiedAt: new Date().toISOString(),
            rejectionReason: null,
          };
          saveToDb('master_handovers', mapHandoverToDb, updatedHandover);
          return updatedHandover;
        }
        return h;
      })
    );

    if (targetCuttingId) {
      setCuttings((prev) =>
        prev.map((c) => {
          if (c.id === targetCuttingId) {
            const batchHandovers = masterHandovers
              .map((h) => (h.id === handoverId ? { ...h, status: 'Verified' } : h))
              .filter((h) => h.cuttingId === targetCuttingId && h.status === 'Verified');

            const totalVerified = batchHandovers.reduce(
              (acc, h) => acc + (parseInt(h.piecesCount || h.pieces, 10) || 0),
              0
            );

            const partsCut = c.cutPieces && typeof c.cutPieces === 'object' ? c.cutPieces : {};
            const partEntries = Object.entries(partsCut).filter(([, v]) => (parseInt(v, 10) || 0) > 0);
            let isCuttingComplete = false;

            if (partEntries.length > 1) {
              const verifiedByPart = {};
              batchHandovers.forEach((h) => {
                const subs = h.subParts && typeof h.subParts === 'object' ? h.subParts : {};
                Object.entries(subs).forEach(([k, v]) => {
                  const cleanK = k.toLowerCase().trim();
                  verifiedByPart[cleanK] = (verifiedByPart[cleanK] || 0) + (parseInt(v, 10) || 0);
                });
              });
              isCuttingComplete = partEntries.every(([partName, reqCount]) => {
                const cleanK = partName.toLowerCase().trim();
                const req = parseInt(reqCount, 10) || 0;
                return (verifiedByPart[cleanK] || 0) >= req;
              });
            } else {
              const targetPieces =
                parseInt(c.totalPieces, 10) ||
                partEntries.reduce((sum, [, v]) => sum + (parseInt(v, 10) || 0), 0) ||
                ((parseInt(c.totalSets, 10) || 0) * (parseInt(c.piecesPerSet, 10) || 1));
              isCuttingComplete = targetPieces > 0 && totalVerified >= targetPieces;
            }

            if (isCuttingComplete) {
              const updatedCutting = {
                ...c,
                status: 'Completed',
                masterWorkDone: true,
                completedAt: new Date().toISOString(),
              };
              saveToDb('cuttings', mapCuttingToDb, updatedCutting);
              return updatedCutting;
            }
          }
          return c;
        })
      );
    }

    if (targetFabricId) {
      setFabrics((prev) =>
        prev.map((f) => {
          if (f.id === targetFabricId) {
            const fabricCuttings = cuttings.filter((c) => c.fabricId === targetFabricId);
            const allCuttingsDone =
              fabricCuttings.length > 0 &&
              fabricCuttings.every((c) => c.status === 'Completed' || (c.id === targetCuttingId && c.masterWorkDone));
            if (allCuttingsDone) {
              const updatedFabric = { ...f, status: 'Completed' };
              saveToDb('fabrics', mapFabricToDb, updatedFabric);
              return updatedFabric;
            }
          }
          return f;
        })
      );
    }

    return { success: true };
  };

  const rejectMasterHandover = (handoverId, reason = 'Piece count mismatch or quality issue') => {
    setMasterHandovers((prev) =>
      prev.map((h) => {
        if (h.id === handoverId) {
          const updatedHandover = {
            ...h,
            status: 'Rejected',
            rejectionReason: (reason || 'Count mismatch or quality issue').trim(),
            rejectedAt: new Date().toISOString(),
          };
          saveToDb('master_handovers', mapHandoverToDb, updatedHandover);
          return updatedHandover;
        }
        return h;
      })
    );
    return { success: true };
  };

  const deleteMasterHandover = (handoverId) => {
    setMasterHandovers((prev) => prev.filter((h) => h.id !== handoverId));
    dbRemove('master_handovers', handoverId);
    return { success: true };
  };

  const getMasterHandoverStats = (cuttingId) => {
    const cutting = cuttings.find((c) => c.id === cuttingId);
    const fabric = fabrics.find((f) => f.id === cutting?.fabricId);
    const cutPieces = cutting ? parseInt(cutting.totalPieces, 10) || 0 : 0;
    const subPartsList = getCuttingSubPartsList(cutting, fabric);

    let totalExpectedPSC = 0;
    if (subPartsList && subPartsList.length > 0) {
      const sumSubPartsReady = subPartsList.reduce(
        (acc, sp) => acc + (parseInt(sp.count, 10) || 0),
        0
      );
      if (sumSubPartsReady > 0) {
        totalExpectedPSC = sumSubPartsReady;
      }
    }

    if (!totalExpectedPSC) {
      totalExpectedPSC = parseInt(cutting?.totalSets, 10) || 0;
    }

    if (!totalExpectedPSC && cutting?.cutPieces && typeof cutting.cutPieces === 'object') {
      const partsCut = Object.values(cutting.cutPieces).map((v) => parseInt(v, 10) || 0).filter((v) => v > 0);
      if (partsCut.length > 0) {
        totalExpectedPSC = Math.min(...partsCut);
      }
    }
    if (!totalExpectedPSC) {
      totalExpectedPSC = cutPieces;
    }

    const batchAssignments = tailorAssignments.filter((a) => a.cuttingId === cuttingId);
    const stitchedParts = {};
    const approvedSubPartCounts = {};
    let tailorCompletedPieces = 0;
    let approvedPscDirect = 0;

    batchAssignments.forEach((a) => {
      const compQty = parseInt(a.completedQuantity, 10) || 0;
      tailorCompletedPieces += compQty;

      const submissions = a.dailySubmissions || [];
      if (submissions.length > 0) {
        submissions.forEach((sub) => {
          if (sub.approvalStatus !== 'Approved') return;

          const psc =
            parseInt(sub.pscQuantity, 10) ||
            (sub.subParts
              ? Object.values(sub.subParts).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0)
              : 0) ||
            (parseInt(sub.quantity, 10) || 0);

          approvedPscDirect += psc;

          if (sub.subParts && typeof sub.subParts === 'object') {
            Object.entries(sub.subParts).forEach(([k, v]) => {
              const qty = parseInt(v, 10) || 0;
              approvedSubPartCounts[k] = (approvedSubPartCounts[k] || 0) + qty;
              stitchedParts[k] = (stitchedParts[k] || 0) + qty;
            });
          }

          if (sub.parts && typeof sub.parts === 'object') {
            Object.entries(sub.parts).forEach(([k, v]) => {
              const qty = parseInt(v, 10) || 0;
              stitchedParts[k] = (stitchedParts[k] || 0) + qty;
            });
          }
        });
      } else if (compQty > 0) {
        approvedPscDirect += compQty;
      }
    });

    let stitchedPSC = 0;
    if (subPartsList && subPartsList.length > 0) {
      const counts = subPartsList.map((sp) => approvedSubPartCounts[sp.id] || approvedSubPartCounts[sp.name] || 0);
      if (counts.length > 0 && counts.every((c) => c > 0)) {
        stitchedPSC = Math.min(...counts);
      } else {
        stitchedPSC = approvedPscDirect || Math.max(...counts, 0) || tailorCompletedPieces;
      }
    } else {
      stitchedPSC = approvedPscDirect || tailorCompletedPieces;
    }

    let unmatchedSummary = '';
    if (subPartsList && subPartsList.length > 0) {
      const partsPending = [];
      subPartsList.forEach((sp) => {
        const count = approvedSubPartCounts[sp.id] || approvedSubPartCounts[sp.name] || 0;
        if (count > stitchedPSC) {
          partsPending.push(`${count - stitchedPSC} ${sp.name || sp.id}`);
        }
      });
      if (partsPending.length > 0) {
        unmatchedSummary = `${partsPending.join(', ')} pending matching parts`;
      }
    }
    const hasUnmatchedParts = Boolean(unmatchedSummary && unmatchedSummary.trim());

    const activeHandovers = masterHandovers.filter(
      (h) => h.cuttingId === cuttingId && h.status !== 'Rejected'
    );
    const submittedPSC = activeHandovers.reduce(
      (acc, h) => acc + (parseInt(h.piecesCount || h.pieces, 10) || 0),
      0
    );
    const verifiedPSC = activeHandovers
      .filter((h) => h.status === 'Verified')
      .reduce((acc, h) => acc + (parseInt(h.piecesCount || h.pieces, 10) || 0), 0);
    const pendingPSC = activeHandovers
      .filter((h) => h.status === 'Pending Verification')
      .reduce((acc, h) => acc + (parseInt(h.piecesCount || h.pieces, 10) || 0), 0);

    let fabricRemainingToSubmit = Infinity;
    if (cutting?.fabricId) {
      const allFabricCuttings = cuttings.filter((c) => c.fabricId === cutting.fabricId);
      const allFabricHandovers = masterHandovers.filter(
        (h) => (h.fabricId === cutting.fabricId || allFabricCuttings.some((fc) => fc.id === h.cuttingId)) && h.status !== 'Rejected'
      );
      const totalFabricSubmitted = allFabricHandovers.reduce((acc, h) => {
        if (h.subParts && typeof h.subParts === 'object' && Object.keys(h.subParts).length > 0) {
          return acc + Object.values(h.subParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
        }
        return acc + (parseInt(h.piecesCount || h.pieces, 10) || 0);
      }, 0);

      const allFabricAssignments = tailorAssignments.filter(
        (a) => a.fabricId === cutting.fabricId || allFabricCuttings.some((fc) => fc.id === a.cuttingId)
      );
      let totalFabricStitched = 0;
      allFabricAssignments.forEach((a) => {
        (a.dailySubmissions || []).forEach((sub) => {
          if (sub.approvalStatus === 'Approved') {
            let psc = parseInt(sub.pscQuantity, 10) || 0;
            if (psc === 0 && sub.subParts && typeof sub.subParts === 'object') {
              psc = Object.values(sub.subParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
            }
            if (psc === 0) psc = parseInt(sub.quantity, 10) || 0;
            totalFabricStitched += psc;
          }
        });
      });
      fabricRemainingToSubmit = Math.max(0, totalFabricStitched - totalFabricSubmitted);
    }

    // Floor trimming status for this cutting batch
    const cuttingThreadJobs = (threadCuttingAssignments || []).filter(
      (tc) =>
        tc.cuttingId === cuttingId ||
        (cutting?.fabricId && (tc.fabricId === cutting.fabricId || tc.fabric_id === cutting.fabricId))
    );

    let floorTrimmedPSC = 0;
    let floorSkippedPSC = 0;
    let floorInTrimmingPSC = 0;

    cuttingThreadJobs.forEach((tc) => {
      const isSkip =
        tc.status === 'Skipped' ||
        tc.actionType === 'skip' ||
        tc.action_type === 'skip';
      const assigned = parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0;
      const completed =
        parseInt(tc.completedPieces ?? tc.completedPSC, 10) ||
        (tc.status === 'Completed' ? assigned : 0);

      if (isSkip) {
        floorSkippedPSC += assigned;
      } else {
        floorTrimmedPSC += completed;
        floorInTrimmingPSC += Math.max(0, assigned - completed);
      }
    });

    const totalFloorProcessed = floorTrimmedPSC + floorSkippedPSC;

    // Only pieces that have completed floor trimming or were marked skipped are ready for Admin handover
    let availableToSubmitPSC = 0;
    if (totalFloorProcessed > 0) {
      availableToSubmitPSC = Math.min(
        Math.max(0, totalFloorProcessed - submittedPSC),
        fabricRemainingToSubmit
      );
    }

    const pendingFloorTrimmingPSC = Math.max(
      0,
      stitchedPSC - (floorTrimmedPSC + floorSkippedPSC + floorInTrimmingPSC)
    );

    const targetPSC = totalExpectedPSC > 0 ? totalExpectedPSC : cutPieces;
    const isMasterWorkDone =
      (targetPSC > 0 && submittedPSC >= targetPSC) || Boolean(cutting?.masterWorkDone);
    const isFullyVerified = targetPSC > 0 && verifiedPSC >= targetPSC;

    return {
      cutPieces,
      totalExpectedPSC,
      stitchedParts,
      stitchedPSC,
      floorTrimmedPSC,
      floorSkippedPSC,
      floorInTrimmingPSC,
      pendingFloorTrimmingPSC,
      totalFloorProcessed,
      tailorCompletedPieces,
      submittedPieces: submittedPSC,
      submittedPSC,
      verifiedPieces: verifiedPSC,
      verifiedPSC,
      pendingPieces: pendingPSC,
      pendingPSC,
      remainingToSubmit: availableToSubmitPSC,
      availableToSubmitPSC,
      readyForAdminPSC: availableToSubmitPSC,
      canSubmitMore: availableToSubmitPSC > 0,
      isMasterWorkDone,
      isFullyVerified,
      hasUnmatchedParts,
      unmatchedSummary,
      handovers: masterHandovers.filter((h) => h.cuttingId === cuttingId),
    };
  };


  return {
    submitMasterHandover,
    verifyMasterHandover,
    rejectMasterHandover,
    deleteMasterHandover,
    getMasterHandoverStats,
  };
}
