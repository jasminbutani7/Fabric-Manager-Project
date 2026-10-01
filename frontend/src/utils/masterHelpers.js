import { getPieceValueFromObject, getAssignmentPieceName } from './productUtils';

export const getSubPartCountFromAssignment = (a, group) => {
  if (!a || a.status === 'Declined') return 0;
  const aTotal = parseInt(a.totalAssignedPieces || a.total_assigned_pieces, 10) || 0;

  // 1. Direct piece check in assignedPieces
  const pVal = getPieceValueFromObject(a.assignedPieces || a.assigned_pieces, group.spName, group.spId);
  if (pVal > 0) {
    return aTotal > 0 ? Math.min(pVal, aTotal) : pVal;
  }

  // 2. Component breakdown in assignedPieces (for composite subparts like Top with components)
  if (group.items && group.items.length > 1) {
    const rawMap = a.assignedPieces || a.assigned_pieces || {};
    const compDerived = Math.min(
      ...group.items.map((c) => {
        const val = getPieceValueFromObject(rawMap, c.name, c.id);
        return Math.floor(val / (c.ratio || 1));
      })
    );
    if (compDerived > 0) {
      return aTotal > 0 ? Math.min(compDerived, aTotal) : compDerived;
    }
  }

  // 3. Subparts map check
  const subMap = a.assignedSubParts || a.assigned_sub_parts;
  if (subMap && typeof subMap === 'object') {
    const spVal = getPieceValueFromObject(subMap, group.spId, group.spName);
    if (spVal > 0) {
      return aTotal > 0 ? Math.min(spVal, aTotal) : spVal;
    }
  }

  // 4. pieceType check
  const pt = (a.pieceType || a.piece_type || '').toLowerCase();
  if (
    pt &&
    ((group.spName && pt.includes(group.spName.toLowerCase())) ||
      (group.spId && pt.includes(group.spId.toLowerCase())))
  ) {
    return aTotal;
  }

  return 0;
};

export const isFabricAssignedToMaster = (f, master, masterId, queryName, queryPhone) => {
  if (!f) return false;
  // 1. Strict Tenant Isolation
  const fUserId = String(f.user_id || f.userId || '').trim();
  const targetUserId = String(master?.user_id || master?.userId || master?.adminUserId || '').trim();
  if (targetUserId) {
    if (!fUserId || fUserId !== targetUserId) return false;
  } else if (fUserId) {
    return false;
  }

  const fMasterId = String(f.assignedMasterId || f.assigned_master_id || '').trim();
  const fMasterName = String(f.assignedMasterName || f.assigned_master_name || '').trim().toLowerCase();
  const fMasterPhone = String(f.assignedMasterPhone || f.assigned_master_phone || '').replace(/\D/g, '');

  const targetId = String(master?.id || masterId || '').trim();
  const targetName = String(master?.name || queryName || '').trim().toLowerCase();
  const targetPhone = String(master?.phone || queryPhone || '').replace(/\D/g, '');

  if (fMasterId && targetId && fMasterId === targetId) return true;
  if (targetUserId && fMasterName && targetName && fMasterName === targetName) return true;
  if (targetUserId && targetPhone && fMasterPhone && fMasterPhone === targetPhone) return true;

  return false;
};

export const isCuttingForMaster = (c, master, masterId, queryName) => {
  if (!c) return false;
  // 1. Strict Tenant Isolation
  const cUserId = String(c.user_id || c.userId || '').trim();
  const targetUserId = String(master?.user_id || master?.userId || master?.adminUserId || '').trim();
  if (targetUserId) {
    if (!cUserId || cUserId !== targetUserId) return false;
  } else if (cUserId) {
    return false;
  }

  const cMasterId = String(c.masterId || c.master_id || '').trim();
  const cMasterName = String(c.masterName || c.master_name || '').trim().toLowerCase();

  const targetId = String(master?.id || masterId || '').trim();
  const targetName = String(master?.name || queryName || '').trim().toLowerCase();

  if (cMasterId && targetId && cMasterId === targetId) return true;
  if (targetUserId && cMasterName && targetName && cMasterName === targetName) return true;

  return false;
};

export const isExternalHelper = (h) => {
  if (!h) return false;
  return Boolean(
    h.helperCategory === 'external' ||
    h.wageType === 'Piece Rate' ||
    h.helperType === 'external' ||
    h.isExternal
  );
};

export const isAssistantHelper = (h) => {
  if (!h) return false;
  return Boolean(
    h.helperCategory === 'master_assigned' ||
    h.helperType === 'master_assigned' ||
    h.assignedMasterId ||
    h.assignedMasterName
  );
};

export const isInternalHelper = (h) => {
  if (!h) return false;
  return Boolean(
    h.helperCategory === 'internal' ||
    h.helperType === 'internal' ||
    (!isExternalHelper(h) && !isAssistantHelper(h))
  );
};

export const isHelperForMaster = (h, master, masterId, queryName) => {
  if (!h) return false;
  // 1. Strict Tenant Isolation
  const hUserId = String(h.user_id || h.userId || '').trim();
  const targetUserId = String(master?.user_id || master?.userId || master?.adminUserId || '').trim();
  if (targetUserId) {
    if (!hUserId || hUserId !== targetUserId) return false;
  } else if (hUserId) {
    return false;
  }

  const hMasterId = String(h.assignedMasterId || h.assigned_master_id || '').trim();
  const hMasterName = String(h.assignedMasterName || h.assigned_master_name || '').trim().toLowerCase();

  const targetId = String(master?.id || masterId || '').trim();
  const targetName = String(master?.name || queryName || '').trim().toLowerCase();

  if (hMasterId && targetId && hMasterId === targetId) return true;
  if (targetUserId && hMasterName && targetName && hMasterName === targetName) return true;

  return false;
};

export const isHelperAvailableToMaster = (h, master, masterId, queryName) => {
  if (!h || h.status === 'Left' || h.isArchived) return false;
  // User requirement: Master portal shows all Assistant & Internal helpers, and NEVER external helpers
  if (isExternalHelper(h)) return false;
  if (isInternalHelper(h)) return true;
  if (isHelperForMaster(h, master, masterId, queryName)) return true;
  if (isAssistantHelper(h)) return true;
  return false;
};

export const getFabricArchivalStatus = (f, { cuttings = [], tailorAssignments = [], masterHandovers = [], getMasterHandoverStats }) => {
  if (!f) return { eligible: false, reason: 'Fabric not found.' };

  const fabricCuttings = cuttings.filter((c) => c.fabricId === f.id);
  if (fabricCuttings.length === 0) {
    return {
      eligible: false,
      reason: 'No fabric cuts recorded for this fabric lot yet.',
    };
  }

  // Check remaining plain meters
  const plainMeters = parseFloat(f.plainMeters) || 0;
  const usedMeters = fabricCuttings.reduce(
    (sum, c) => sum + (parseFloat(c.metersUsed) || 0),
    0
  );
  const remainingMeters = Math.max(0, plainMeters - usedMeters);
  if (plainMeters > 0 && remainingMeters > 0 && f.status !== 'Completed') {
    return {
      eligible: false,
      reason: `Fabric still has ${remainingMeters.toFixed(1)}m uncut meterage remaining.`,
    };
  }

  // Check cuttings & tailor assignments
  for (const cutting of fabricCuttings) {
    const batchAssignments = tailorAssignments.filter((a) => a.cuttingId === cutting.id);
    if (batchAssignments.length === 0) {
      return {
        eligible: false,
        reason: `Cutting lot #${cutting.lotNumber || cutting.id.slice(0, 6)} has no tailors assigned.`,
      };
    }

    // Check if tailors have finished stitching
    const hasUnfinishedTailor = batchAssignments.some((a) => {
      const total = parseInt(a.totalAssignedPieces, 10) || 0;
      const done = parseInt(a.completedQuantity, 10) || 0;
      return a.status !== 'Completed' && (total === 0 || done < total);
    });
    if (hasUnfinishedTailor) {
      return {
        eligible: false,
        reason: `Tailor stitching still in progress for lot #${cutting.lotNumber || cutting.id.slice(0, 6)}.`,
      };
    }

    // Check for pending daily work logs awaiting Master acceptance
    const hasPendingLogs = batchAssignments.some((a) =>
      (a.dailySubmissions || []).some(
        (s) => s.approvalStatus === 'Pending' || s.approvalStatus === 'Pending Approval'
      )
    );
    if (hasPendingLogs) {
      return {
        eligible: false,
        reason: `Work logs awaiting verification for lot #${cutting.lotNumber || cutting.id.slice(0, 6)}.`,
      };
    }

    // Check handover statistics
    const stats = getMasterHandoverStats ? getMasterHandoverStats(cutting.id) : null;
    if (stats) {
      if (stats.availableToSubmitPSC > 0) {
        return {
          eligible: false,
          reason: `${stats.availableToSubmitPSC} stitched PCs awaiting handover submission to Admin.`,
        };
      }
      if (stats.pendingPSC > 0) {
        return {
          eligible: false,
          reason: `${stats.pendingPSC} PCs submitted and pending Admin verification.`,
        };
      }
      if (!stats.isFullyVerified) {
        return {
          eligible: false,
          reason: `Admin approval incomplete (${stats.verifiedPSC || 0}/${stats.totalExpectedPSC || 0} PCs verified).`,
        };
      }
    }
  }

  // Check handovers associated with this fabric or its cuttings
  const fabricHandovers = masterHandovers.filter(
    (h) => h.fabricId === f.id || fabricCuttings.some((c) => c.id === h.cuttingId)
  );

  if (fabricHandovers.length === 0) {
    return {
      eligible: false,
      reason: 'No completed production handovers submitted to Admin yet.',
    };
  }

  const hasPendingAdmin = fabricHandovers.some((h) => h.status === 'Pending Verification');
  if (hasPendingAdmin) {
    return {
      eligible: false,
      reason: 'Some handovers are awaiting Admin verification & approval.',
    };
  }

  const hasRejected = fabricHandovers.some((h) => h.status === 'Rejected');
  if (hasRejected) {
    return {
      eligible: false,
      reason: 'Some handovers were rejected by Admin. Please resolve before archiving.',
    };
  }

  const allVerified = fabricHandovers.every((h) => h.status === 'Verified');
  if (!allVerified) {
    return {
      eligible: false,
      reason: 'All production handovers must be verified and approved by Admin.',
    };
  }

  return {
    eligible: true,
    reason: 'All cutting, tailor stitching, and admin handovers are verified and approved by Admin.',
  };
};

export const getFabricTailorPscDetails = (fabricId, { fabrics = [], cuttings = [], tailorAssignments = [], getMasterHandoverStats }) => {
  const fabric = fabrics.find((f) => f.id === fabricId);
  const fabricCuttings = cuttings.filter((c) => c.fabricId === fabricId);
  const fabricAssignments = tailorAssignments.filter((a) =>
    String(a.fabricId) === String(fabricId) ||
    fabricCuttings.some((c) => c.id === a.cuttingId)
  );

  const struct = fabric?.productStructure || fabricCuttings[0]?.productStructure;
  const subParts = struct?.subParts || [];

  const receivedSubPartsMap = {};
  let totalPscReceived = 0;
  let pendingPsc = 0;
  let pendingCount = 0;

  fabricAssignments.forEach((a) => {
    (a.dailySubmissions || []).forEach((sub) => {
      let psc = parseInt(sub.pscQuantity, 10) || 0;
      if (psc === 0 && sub.subParts && typeof sub.subParts === 'object') {
        psc = Object.values(sub.subParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
      }
      if (psc === 0) {
        psc = parseInt(sub.quantity, 10) || 0;
      }

      if (sub.approvalStatus === 'Approved') {
        if (subParts.length > 0) {
          subParts.forEach((sp) => {
            const spKey = sp.id || sp.name;
            let count = 0;
            const hasExplicitSubParts = sub.subParts && typeof sub.subParts === 'object' && Object.keys(sub.subParts).length > 0;
            const hasExplicitParts = sub.parts && typeof sub.parts === 'object' && Object.keys(sub.parts).length > 0;

            if (hasExplicitSubParts) {
              count =
                parseInt(sub.subParts?.[sp.id], 10) ||
                parseInt(sub.subParts?.[sp.name], 10) ||
                parseInt(sub.subParts?.[sp.name?.toLowerCase()], 10) ||
                parseInt(sub.subParts?.[spKey], 10) ||
                0;
            } else if (hasExplicitParts) {
              count =
                parseInt(sub.parts?.[sp.id], 10) ||
                parseInt(sub.parts?.[sp.name], 10) ||
                0;
            } else if (sub.quantity > 0) {
              count = psc;
            }
            receivedSubPartsMap[spKey] = (receivedSubPartsMap[spKey] || 0) + count;
          });
        } else if (sub.subParts && typeof sub.subParts === 'object') {
          Object.entries(sub.subParts).forEach(([k, v]) => {
            receivedSubPartsMap[k] = (receivedSubPartsMap[k] || 0) + (parseInt(v, 10) || 0);
          });
        }
        totalPscReceived += psc;
      } else if (sub.approvalStatus === 'Pending' || sub.approvalStatus === 'Pending Approval') {
        pendingPsc += psc;
        pendingCount += 1;
      }
    });
  });

  let receivedSubParts = [];
  if (subParts.length > 0) {
    receivedSubParts = subParts.map((sp) => {
      const spKey = sp.id || sp.name;
      const name = sp.name || spKey;
      const count = receivedSubPartsMap[spKey] || 0;
      const rate = parseFloat(sp.rate) || 0;
      return { id: sp.id || spKey, name, count, rate };
    });
  } else if (Object.keys(receivedSubPartsMap).length > 0) {
    receivedSubParts = Object.entries(receivedSubPartsMap).map(([k, count]) => ({
      id: k,
      name: k.charAt(0).toUpperCase() + k.slice(1),
      count,
      rate: 0,
    }));
  } else {
    receivedSubParts = [
      { id: 'piece', name: fabric?.productName || 'Piece', count: totalPscReceived, rate: 0 },
    ];
  }

  let completeSets = 0;
  if (receivedSubParts.length > 0 && receivedSubParts.every((sp) => sp.count > 0)) {
    completeSets = Math.min(...receivedSubParts.map((sp) => sp.count));
  } else {
    completeSets = fabricCuttings.reduce(
      (acc, c) => acc + (getMasterHandoverStats ? getMasterHandoverStats(c.id)?.stitchedPSC || 0 : 0),
      0
    ) || totalPscReceived;
  }

  const pieceName = getAssignmentPieceName(null, totalPscReceived || pendingPsc || 1, fabric);

  return {
    totalPscReceived,
    receivedSubParts,
    completeSets,
    pendingPsc,
    pendingCount,
    pieceName,
  };
};

/**
 * Calculate Trimming (Thread Cutting) lifecycle details for a fabric lot on Master floor
 * Stitched pieces from tailors must first be trimmed or marked skipped before ready for Admin
 */
export const getFabricTrimmingDetails = (
  fabricId,
  { cuttings = [], threadCuttingAssignments = [], tailorDetails = null, totalSubmittedPSC = 0, masterId = null }
) => {
  const fabricCuttingIds = new Set(
    (cuttings || [])
      .filter((c) => (c.fabricId || c.fabric_id) === fabricId)
      .map((c) => c.id)
  );

  const assignments = (threadCuttingAssignments || []).filter((tc) => {
    const matchesFabric =
      (tc.fabricId && String(tc.fabricId) === String(fabricId)) ||
      (tc.cuttingId && fabricCuttingIds.has(tc.cuttingId));
    if (!matchesFabric) return false;

    // Only count trimming jobs done on Master floor (exclude Admin post-handover trimming jobs)
    if (tc.createdByRole && tc.createdByRole !== 'master') return false;
    if (tc.createdByRole === 'master') {
      if (masterId && tc.masterId) return String(tc.masterId) === String(masterId);
      return true;
    }

    // Fallback for legacy records without createdByRole
    if (tc.masterId) {
      if (masterId) return String(tc.masterId) === String(masterId);
      return true;
    }

    return false;
  });

  let trimmedPSC = 0;
  let skippedPSC = 0;
  let inTrimmingPSC = 0;

  const trimmedBySubPart = {};
  const skippedBySubPart = {};

  assignments.forEach((tc) => {
    const isSkip =
      tc.status === 'Skipped' ||
      tc.actionType === 'skip' ||
      tc.action_type === 'skip';
    const assigned = parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0;
    const completed =
      parseInt(tc.completedPieces ?? tc.completedPSC, 10) ||
      (tc.status === 'Completed' ? assigned : 0);
    const spKey = (tc.subPart || tc.sub_part || '').toLowerCase().trim();

    if (isSkip) {
      skippedPSC += assigned;
      if (spKey) {
        skippedBySubPart[spKey] = (skippedBySubPart[spKey] || 0) + assigned;
      }
    } else {
      trimmedPSC += completed;
      inTrimmingPSC += Math.max(0, assigned - completed);
      if (spKey) {
        trimmedBySubPart[spKey] = (trimmedBySubPart[spKey] || 0) + completed;
      }
    }
  });

  const rawProcessedPSC = trimmedPSC + skippedPSC;
  const totalStitchedReceived = tailorDetails?.totalPscReceived || 0;

  // Total processed on floor cannot exceed actual stitched goods received from tailors
  const totalProcessedPSC = totalStitchedReceived > 0
    ? Math.min(totalStitchedReceived, rawProcessedPSC)
    : rawProcessedPSC;

  // Stitched pieces accepted from tailors but not yet assigned to helpers or skipped
  const pendingTrimmingPSC = Math.max(
    0,
    totalStitchedReceived - (trimmedPSC + skippedPSC + inTrimmingPSC)
  );

  // Maximum physically possible remaining pieces in Master floor custody
  const maxPossibleRemaining = totalStitchedReceived > 0
    ? Math.max(0, totalStitchedReceived - totalSubmittedPSC)
    : Math.max(0, totalProcessedPSC - totalSubmittedPSC);

  // Ready for Admin = pieces that finished floor trimming or were skipped, minus already submitted, capped by physical custody
  const readyForAdminPSC = Math.min(
    maxPossibleRemaining,
    Math.max(0, totalProcessedPSC - totalSubmittedPSC)
  );

  return {
    trimmedPSC,
    skippedPSC,
    inTrimmingPSC,
    totalProcessedPSC,
    pendingTrimmingPSC,
    readyForAdminPSC,
    trimmedBySubPart,
    skippedBySubPart,
  };
};
