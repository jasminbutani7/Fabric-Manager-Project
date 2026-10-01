import {
  resolveWorkDetails,
  getPieceValueFromObject,
  getAssignmentSubPartsList,
  getAssignmentPieceName,
  isEntityArchived,
} from './productUtils';

/**
 * Computes financial rates and totals for an assignment.
 */
export const getAssignmentFinancials = (a) => {
  if (!a) {
    return { rate: 25, earned: 0, totalJobAmount: 0, pieceType: 'PCs' };
  }

  let rate = parseFloat(a.ratePerPiece) || 0;
  const piecesMap = a.assignedPieces || {};
  const totalPieces =
    parseInt(a.totalAssignedPieces, 10) ||
    Object.values(piecesMap).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);

  if (rate <= 0) {
    const rates = a.tailorRates || null;
    if (rates && totalPieces > 0) {
      let val = 0;
      Object.entries(piecesMap).forEach(([k, q]) => {
        val += (parseInt(q, 10) || 0) * (parseFloat(rates[k]) || 0);
      });
      if (val > 0) {
        rate = Math.round((val / totalPieces) * 100) / 100;
      } else {
        const sum = Object.values(rates).reduce((acc, r) => acc + (parseFloat(r) || 0), 0);
        rate = sum > 0 ? sum : 25;
      }
    } else {
      rate = 25;
    }
  }

  const completed = parseInt(a.completedQuantity, 10) || 0;
  let earned = parseFloat(a.totalEarned) || 0;
  if (earned <= 0) {
    if (a.dailySubmissions && a.dailySubmissions.length > 0) {
      earned = a.dailySubmissions.reduce(
        (acc, s) =>
          acc +
          (parseFloat(s.earnedAmount) ||
            (parseInt(s.quantity, 10) || 0) * (parseFloat(s.ratePerPiece) || rate)),
        0
      );
    } else {
      earned = completed * rate;
    }
  }

  const totalJobAmount = parseFloat(a.totalJobAmount) || (totalPieces * rate);

  return {
    rate,
    earned,
    totalJobAmount,
    pieceType: (!a.pieceType || a.pieceType.toLowerCase().includes('suit set')) ? 'PCs' : a.pieceType,
  };
};

/**
 * Checks if an assignment matches the given tailor and machine identifiers.
 */
export const isAssignmentForTailor = (a, tailor, machine, tailorId, queryName) => {
  if (!a) return false;
  const aTailorId = String(a.tailorId || a.tailor_id || '').trim();
  const aTailorName = String(a.tailorName || a.tailor_name || '').trim().toLowerCase();
  const aMachineId = String(a.machineId || a.machine_id || '').trim();

  const targetTailorId = String(tailor?.id || tailorId || '').trim();
  const targetTailorName = String(tailor?.name || queryName || '').trim().toLowerCase();
  const targetMachineId = String(tailor?.assignedMachineId || machine?.id || '').trim();
  const targetMachineCode = String(machine?.code || '').trim().toLowerCase();

  // 1. Strict Tenant / Account Isolation
  const aUserId = String(a.user_id || a.userId || '').trim();
  const targetUserId = String(tailor?.user_id || tailor?.userId || tailor?.adminUserId || '').trim();
  if (targetUserId) {
    if (!aUserId || aUserId !== targetUserId) {
      return false;
    }
  } else if (aUserId) {
    // If the assignment belongs to a tenant but tailor object has no resolved tenant, reject to prevent leaks
    return false;
  }

  // 2. Authoritative Tailor ID match: if both IDs are known, ID equality is required
  if (aTailorId && targetTailorId) {
    return aTailorId === targetTailorId;
  }

  // 3. Fallback when one side lacks tailor ID:
  // Strict Exact Name match ONLY when verified within the same tenant
  if (targetUserId && aTailorName && targetTailorName && targetTailorName !== 'tailor' && aTailorName !== 'tailor') {
    if (aTailorName === targetTailorName) return true;
  }

  // 4. Machine match fallback ONLY if allocation is by machine AND no conflicting tailor ID
  const isByMachine = a.allocationMode === 'by_machine' || a.allocation_mode === 'by_machine';
  if (isByMachine && !aTailorId) {
    if (targetMachineId && aMachineId && (targetMachineId === aMachineId || targetMachineId.toLowerCase() === aMachineId.toLowerCase())) {
      return true;
    }
    if (targetMachineCode && aMachineId && targetMachineCode === aMachineId.toLowerCase()) {
      return true;
    }
    const aMachineCode = String(a.machineCode || a.machine_code || '').trim().toLowerCase();
    if (targetMachineCode && aMachineCode && targetMachineCode === aMachineCode) {
      return true;
    }
  }

  return false;
};

/**
 * Checks if an assignment belongs to active workload.
 */
export const isAssignmentActive = (a, fabricsList = []) => {
  if (!a) return false;
  if (a.isArchived) return false;
  if (isEntityArchived(a, fabricsList)) return false;
  if (a.restoredAt && !a.isArchived) return true;
  if (a.status === 'Completed' || a.status === 'Declined') return false;
  const total = parseInt(a.totalAssignedPieces, 10) || 0;
  const done = parseInt(a.completedQuantity, 10) || 0;
  if (total > 0 && done >= total) return false;
  return true;
};

/**
 * Computes full metrics for an assignment (subparts, approvals, pendings, earnings).
 */
export const getTailorAssignmentMetrics = (a, { cuttings = [], fabrics = [] } = {}) => {
  if (!a) {
    return {
      assigned: 0,
      approvedDone: 0,
      pendingReview: 0,
      leftToStitch: 0,
      progress: 0,
      subPartsBreakdown: [],
      batchApprovedEarned: 0,
      batchPendingEarned: 0,
      totalJobAmount: 0,
      remainingValue: 0,
      rate: 25,
      pieceType: 'PCs',
      workDetails: null,
    };
  }

  const cutting = (cuttings || []).find((c) => c.id === a.cuttingId);
  const fabric = (fabrics || []).find((f) => f.id === (cutting?.fabricId || a.fabricId));
  const workDetails = resolveWorkDetails(a, fabric);
  const spList = getAssignmentSubPartsList(a, cutting, fabric);
  const rates = a.tailorRates || cutting?.tailorRates || fabric?.tailorRates || {};

  let defaultRate = parseFloat(a.ratePerPiece) || 0;
  if (defaultRate <= 0) {
    const fin = getAssignmentFinancials(a);
    defaultRate = fin.rate || 25;
  }

  const totalTargetPcs = workDetails?.totalTargetPSC > 0 ? workDetails.totalTargetPSC : (parseInt(a.totalAssignedPieces, 10) || 0);
  const subs = a.dailySubmissions || [];

  const subPartsBreakdown = [];

  if (spList && spList.length > 0) {
    spList.forEach((sp) => {
      const target = parseInt(sp.count, 10) || 0;
      const spRate =
        parseFloat(sp.rate) > 0
          ? parseFloat(sp.rate)
          : (parseFloat(rates[sp.id]) || parseFloat(rates[sp.name?.toLowerCase()]) || defaultRate);

      let approvedDone = 0;
      let pendingReview = 0;

      subs.forEach((sub) => {
        if (sub.approvalStatus === 'Rejected') return;
        let qty = 0;
        const hasExplicitSubParts = sub.subParts && typeof sub.subParts === 'object' && Object.keys(sub.subParts).length > 0;
        const hasExplicitParts = sub.parts && typeof sub.parts === 'object' && Object.keys(sub.parts).length > 0;

        if (hasExplicitSubParts) {
          qty = parseInt(
            sub.subParts[sp.id] ??
            sub.subParts[sp.name] ??
            sub.subParts[sp.name?.toLowerCase()] ??
            sub.subParts[sp.id?.toLowerCase()],
            10
          ) || 0;
          if (qty === 0) {
            qty = getPieceValueFromObject(sub.subParts, sp.name, sp.id) || 0;
          }
        } else if (hasExplicitParts) {
          qty = getPieceValueFromObject(sub.parts, sp.name, sp.id) || 0;
        } else if (sub.quantity > 0 && target > 0) {
          // Legacy single-quantity submissions without subparts breakdown
          const totalGarmentTarget = totalTargetPcs > 0 ? totalTargetPcs : (parseInt(a.totalAssignedPieces, 10) || 1);
          const r = Math.min(1, parseInt(sub.quantity, 10) / Math.max(1, totalGarmentTarget));
          qty = Math.round(target * r);
        }

        const isApproved = sub.approvalStatus === 'Approved';
        const isPending = sub.approvalStatus === 'Pending Approval' || sub.approvalStatus === 'Pending';

        if (isApproved) {
          approvedDone += qty;
        } else if (isPending) {
          pendingReview += qty;
        }
      });

      const leftToStitch = Math.max(0, target - approvedDone - pendingReview);
      const approvedEarned = Math.round(approvedDone * spRate * 100) / 100;
      const pendingEarned = Math.round(pendingReview * spRate * 100) / 100;

      const icon = sp.icon || '🪡';

      subPartsBreakdown.push({
        id: sp.id,
        name: sp.name,
        icon,
        target,
        approvedDone,
        pendingReview,
        leftToStitch,
        rate: spRate,
        approvedEarned,
        pendingEarned,
        formula: sp.formula || '',
      });
    });
  } else {
    let approvedDone = 0;
    let pendingReview = 0;
    subs.forEach((sub) => {
      if (sub.approvalStatus === 'Rejected') return;
      const qty = parseInt(sub.pscQuantity, 10) || parseInt(sub.quantity, 10) || 0;
      const isApproved = sub.approvalStatus === 'Approved';
      const isPending = sub.approvalStatus === 'Pending Approval' || sub.approvalStatus === 'Pending';
      if (isApproved) {
        approvedDone += qty;
      } else if (isPending) {
        pendingReview += qty;
      }
    });

    const target = totalTargetPcs;
    const leftToStitch = Math.max(0, target - approvedDone - pendingReview);
    const approvedEarned = Math.round(approvedDone * defaultRate * 100) / 100;
    const pendingEarned = Math.round(pendingReview * defaultRate * 100) / 100;

    subPartsBreakdown.push({
      id: 'default',
      name: a.pieceType || 'Garment Set',
      icon: '🪡',
      target,
      approvedDone,
      pendingReview,
      leftToStitch,
      rate: defaultRate,
      approvedEarned,
      pendingEarned,
      formula: '',
    });
  }

  let batchApprovedEarned = 0;
  let batchPendingEarned = 0;

  if (subPartsBreakdown.length > 0) {
    batchApprovedEarned = subPartsBreakdown.reduce((sum, sp) => sum + sp.approvedEarned, 0);
    batchPendingEarned = subPartsBreakdown.reduce((sum, sp) => sum + sp.pendingEarned, 0);
  } else {
    subs.forEach((s) => {
      if (s.approvalStatus === 'Rejected') return;
      const qty = parseInt(s.quantity, 10) || 0;
      const sRate = parseFloat(s.ratePerPiece) > 0 ? parseFloat(s.ratePerPiece) : defaultRate;
      const amt = parseFloat(s.earnedAmount) || Math.round(qty * sRate * 100) / 100;
      const isApproved = s.approvalStatus === 'Approved';
      const isPending = s.approvalStatus === 'Pending Approval' || s.approvalStatus === 'Pending';
      if (isApproved) {
        batchApprovedEarned += amt;
      } else if (isPending) {
        batchPendingEarned += amt;
      }
    });
  }

  const assigned = subPartsBreakdown.reduce((sum, sp) => sum + sp.target, 0) || totalTargetPcs;
  const approvedDone = subPartsBreakdown.reduce((sum, sp) => sum + sp.approvedDone, 0);
  const pendingReview = subPartsBreakdown.reduce((sum, sp) => sum + sp.pendingReview, 0);
  const leftToStitch = Math.max(0, assigned - approvedDone - pendingReview);
  const progress = assigned > 0 ? Math.min(100, Math.round((approvedDone / assigned) * 100)) : 0;

  const totalJobAmount = workDetails?.totalPayout > 0 ? workDetails.totalPayout : (assigned * defaultRate);
  const remainingValue = Math.max(0, totalJobAmount - batchApprovedEarned - batchPendingEarned);

  return {
    assigned,
    approvedDone,
    pendingReview,
    leftToStitch,
    progress,
    subPartsBreakdown,
    batchApprovedEarned,
    batchPendingEarned,
    totalJobAmount,
    remainingValue,
    rate: defaultRate,
    pieceType: getAssignmentPieceName(a, assigned, fabric),
    workDetails,
  };
};

/**
 * Convenience summary extractor.
 */
export const getAssignmentPcsSummary = (a, deps) => {
  const m = getTailorAssignmentMetrics(a, deps);
  return {
    assigned: m.assigned,
    completed: m.approvedDone,
    pending: m.pendingReview,
    remaining: m.leftToStitch,
    progress: m.progress,
  };
};
