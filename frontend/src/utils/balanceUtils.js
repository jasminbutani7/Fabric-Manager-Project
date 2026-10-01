/**
 * @file balanceUtils.js
 * Pure calculation utilities for cutting balance, fabric lot balance, scrap analytics, and invoice settlement.
 */

import { getProductStructure } from '../services/dbMappers';
import { getNormalizedCutPiecesList, getPieceValueFromObject } from './productUtils';

/**
 * Calculates remaining balance and assigned piece counts for a specific cutting record.
 *
 * @param {Object} params
 * @param {import('../types/models').Cutting} params.cutting
 * @param {import('../types/models').Fabric} [params.fabric]
 * @param {import('../types/models').TailorAssignment[]} [params.tailorAssignments]
 * @param {import('../types/models').Cutting[]} [params.cuttings]
 * @returns {import('../types/models').BalanceResult|null}
 */
export function calculateCuttingBalance({
  cutting,
  fabric,
  tailorAssignments = [],
  cuttings = [],
}) {
  if (!cutting) return null;

  const resolvedFabric = fabric || (cuttings.length > 0 ? null : undefined);
  const normalizedList = getNormalizedCutPiecesList(cutting, resolvedFabric);

  const cuttingAssignments = (tailorAssignments || []).filter(
    (a) => a && a.cuttingId === cutting.id && a.status !== 'Declined'
  );

  const assigned = {};
  const remaining = {};

  let assignedTotal = 0;
  let remainingTotal = 0;

  normalizedList.forEach(({ key, id: compId, spId, val }) => {
    const pieceId = key.toLowerCase().replace(/\s+/g, '_');
    const lowerKey = key.toLowerCase();
    const cId = (compId || '').toLowerCase().trim();
    const sId = (spId || '').toLowerCase().trim();

    const assignedCount = cuttingAssignments.reduce((acc, a) => {
      if (a.assignedPieces?.[key] !== undefined) {
        return acc + (parseInt(a.assignedPieces[key], 10) || 0);
      }
      if (a.assignedPieces?.[pieceId] !== undefined) {
        return acc + (parseInt(a.assignedPieces[pieceId], 10) || 0);
      }
      if (a.assignedPieces?.[lowerKey] !== undefined) {
        return acc + (parseInt(a.assignedPieces[lowerKey], 10) || 0);
      }
      if (cId && a.assignedPieces?.[cId] !== undefined) {
        return acc + (parseInt(a.assignedPieces[cId], 10) || 0);
      }
      if (sId && a.assignedPieces?.[sId] !== undefined) {
        return acc + (parseInt(a.assignedPieces[sId], 10) || 0);
      }
      if (a.assignedSubParts && typeof a.assignedSubParts === 'object') {
        const struct = cutting.productStructure || resolvedFabric?.productStructure;
        const subParts = struct?.subParts || [];
        for (const sp of subParts) {
          const spQty = parseInt(a.assignedSubParts[sp.id] ?? a.assignedSubParts[sp.name], 10) || 0;
          if (spQty > 0) {
            if (Array.isArray(sp.components) && sp.components.length > 0) {
              const matchedComp = sp.components.find((c) => {
                const checkId = (c.id || c.name?.toLowerCase().replace(/\s+/g, '_'))?.toLowerCase().trim();
                return checkId === pieceId || checkId === cId || c.name?.toLowerCase().trim() === lowerKey;
              });
              if (matchedComp) {
                return acc + spQty * (parseInt(matchedComp.qty, 10) || 1);
              }
            } else if (sp.id === pieceId || sp.id === cId || sp.name?.toLowerCase().trim() === lowerKey) {
              return acc + spQty;
            }
          }
        }
        if (a.assignedSubParts[pieceId] !== undefined) {
          return acc + (parseInt(a.assignedSubParts[pieceId], 10) || 0);
        }
        if (cId && a.assignedSubParts[cId] !== undefined) {
          return acc + (parseInt(a.assignedSubParts[cId], 10) || 0);
        }
        if (sId && a.assignedSubParts[sId] !== undefined) {
          return acc + (parseInt(a.assignedSubParts[sId], 10) || 0);
        }
      }
      return acc;
    }, 0);

    const remVal = Math.max(0, val - assignedCount);
    assigned[key] = assignedCount;
    assigned[pieceId] = assignedCount;
    assigned[lowerKey] = assignedCount;
    if (cId) assigned[cId] = assignedCount;
    if (sId) assigned[sId] = assignedCount;

    remaining[key] = remVal;
    remaining[pieceId] = remVal;
    remaining[lowerKey] = remVal;
    if (cId) remaining[cId] = remVal;
    if (sId) remaining[sId] = remVal;

    assignedTotal += assignedCount;
    remainingTotal += remVal;
  });

  assigned.total = assignedTotal;
  remaining.total = remainingTotal;

  assigned.subParts = {};
  cuttingAssignments.forEach((a) => {
    if (a.assignedSubParts && typeof a.assignedSubParts === 'object') {
      Object.entries(a.assignedSubParts).forEach(([spKey, spCount]) => {
        const cnt = parseInt(spCount, 10) || 0;
        assigned.subParts[spKey] = (assigned.subParts[spKey] || 0) + cnt;
      });
    }
  });

  const getRem = (nameOrId, secondId = null) => {
    if (!nameOrId && !secondId) return 0;
    if (nameOrId && remaining[nameOrId] !== undefined) return remaining[nameOrId];
    if (secondId && remaining[secondId] !== undefined) return remaining[secondId];

    const v = getPieceValueFromObject(remaining, nameOrId, secondId);
    if (v > 0) return v;

    const norm = (nameOrId || secondId || '').toLowerCase().trim();
    if (remaining[norm] !== undefined) return remaining[norm];
    const lower = norm.replace(/\s+/g, '_');
    if (remaining[lower] !== undefined) return remaining[lower];

    const matchKey = Object.keys(remaining).find((k) => {
      const kn = k.toLowerCase().trim();
      const kl = kn.replace(/\s+/g, '_');
      return kn === norm || kl === lower || (lower && kl.includes(lower)) || (norm && kn.includes(norm));
    });
    return matchKey !== undefined ? remaining[matchKey] : 0;
  };

  const availableSubParts = {};
  const struct = cutting.productStructure || resolvedFabric?.productStructure || getProductStructure(cutting);
  const subParts = struct?.subParts || [];

  if (subParts.length > 0) {
    subParts.forEach((sp) => {
      const comps = Array.isArray(sp.components) ? sp.components : [];
      if (comps.length > 0) {
        const pieceAvails = comps.map((c) => {
          const rem = Math.max(getRem(c.name, c.id), getRem(c.id, c.name));
          const perG = Math.max(1, parseInt(c.qty, 10) || 1);
          return Math.floor(rem / perG);
        });
        availableSubParts[sp.id] = pieceAvails.length > 0 ? Math.min(...pieceAvails) : 0;
      } else {
        availableSubParts[sp.id] = Math.max(getRem(sp.name, sp.id), getRem(sp.id, sp.name));
      }
      if (sp.name) availableSubParts[sp.name] = availableSubParts[sp.id];
      if (sp.name) availableSubParts[sp.name.toLowerCase()] = availableSubParts[sp.id];
      const spDerivedId = sp.name ? sp.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : '';
      if (spDerivedId) availableSubParts[spDerivedId] = availableSubParts[sp.id];
    });
  } else {
    Object.entries(remaining).forEach(([k, v]) => {
      if (k !== 'total') availableSubParts[k] = v;
    });
  }

  // Cross-cutting fabric check: cap remaining if total fabric has fewer unassigned pieces
  if (cutting.fabricId && cuttings && cuttings.length > 0) {
    const fabricCuttings = cuttings.filter((c) => c.fabricId === cutting.fabricId);
    const allFabricAssignments = tailorAssignments.filter(
      (a) => (a.fabricId === cutting.fabricId || fabricCuttings.some((fc) => fc.id === a.cuttingId)) && a.status !== 'Declined'
    );
    const totalFabricAssigned = allFabricAssignments.reduce((acc, a) => acc + (parseInt(a.totalAssignedPieces, 10) || 0), 0);
    const totalFabricCut = fabricCuttings.reduce((acc, c) => {
      if (c.cutPieces && typeof c.cutPieces === 'object') {
        return acc + Object.values(c.cutPieces).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
      }
      return acc + (parseInt(c.totalPieces, 10) || 0);
    }, 0);
    const fabricRemainingPieces = Math.max(0, totalFabricCut - totalFabricAssigned);

    if (fabricRemainingPieces === 0) {
      remainingTotal = 0;
      remaining.total = 0;
      Object.keys(remaining).forEach((k) => { remaining[k] = 0; });
      Object.keys(availableSubParts).forEach((k) => { availableSubParts[k] = 0; });
      availableSubParts.fullSets = 0;
    } else if (remainingTotal > fabricRemainingPieces) {
      remainingTotal = fabricRemainingPieces;
      remaining.total = fabricRemainingPieces;
    }
  }

  const subPartAvailVals = Object.values(availableSubParts).filter((v) => typeof v === 'number');
  const availableFullSets = subPartAvailVals.length > 0 ? Math.min(...subPartAvailVals) : 0;
  availableSubParts.fullSets = availableFullSets;

  return {
    cutting,
    assigned,
    remaining,
    availableSubParts,
    isFullyAssigned: remainingTotal === 0,
    isPartiallyAssigned: remainingTotal > 0 && assignedTotal > 0,
    isUnassigned: assignedTotal === 0,
  };
}

/**
 * Calculates remaining unassigned balance aggregated across an entire fabric lot.
 *
 * @param {Object} params
 * @param {import('../types/models').Fabric} params.fabric
 * @param {import('../types/models').Cutting[]} [params.cuttings]
 * @param {import('../types/models').TailorAssignment[]} [params.tailorAssignments]
 * @returns {import('../types/models').BalanceResult|null}
 */
export function calculateFabricBalance({
  fabric,
  cuttings = [],
  tailorAssignments = [],
}) {
  if (!fabric) return null;

  const fabricCuttings = (cuttings || []).filter((c) => c && c.fabricId === fabric.id);
  const fabricAssignments = (tailorAssignments || []).filter(
    (a) => a && (a.fabricId === fabric.id || fabricCuttings.some((c) => c.id === a.cuttingId)) && a.status !== 'Declined'
  );

  const aggregatedCutPieces = {};
  fabricCuttings.forEach((c) => {
    if (c.cutPieces && typeof c.cutPieces === 'object') {
      Object.entries(c.cutPieces).forEach(([k, v]) => {
        const count = parseInt(v, 10) || 0;
        if (count > 0) {
          const normKey = k.toLowerCase().trim();
          aggregatedCutPieces[normKey] = (aggregatedCutPieces[normKey] || 0) + count;
        }
      });
    } else {
      const norm = getNormalizedCutPiecesList(c, fabric);
      norm.forEach(({ key, val }) => {
        const count = parseInt(val, 10) || 0;
        if (count > 0) {
          const normKey = key.toLowerCase().trim();
          aggregatedCutPieces[normKey] = (aggregatedCutPieces[normKey] || 0) + count;
        }
      });
    }
  });

  const assigned = {};
  const remaining = {};

  const allKeys = new Set(Object.keys(aggregatedCutPieces));

  allKeys.forEach((key) => {
    const pieceId = key.toLowerCase().replace(/\s+/g, '_');
    const lowerKey = key.toLowerCase();
    const cutVal = aggregatedCutPieces[key] || 0;

    const assignedCount = fabricAssignments.reduce((acc, a) => {
      if (a.assignedPieces?.[key] !== undefined) return acc + (parseInt(a.assignedPieces[key], 10) || 0);
      if (a.assignedPieces?.[pieceId] !== undefined) return acc + (parseInt(a.assignedPieces[pieceId], 10) || 0);
      if (a.assignedPieces?.[lowerKey] !== undefined) return acc + (parseInt(a.assignedPieces[lowerKey], 10) || 0);

      if (a.assignedSubParts && typeof a.assignedSubParts === 'object') {
        const struct = fabric.productStructure || fabricCuttings.find((c) => c.productStructure)?.productStructure || getProductStructure(fabric);
        const subParts = struct?.subParts || [];
        for (const sp of subParts) {
          const spQty = parseInt(a.assignedSubParts[sp.id] ?? a.assignedSubParts[sp.name], 10) || 0;
          if (spQty > 0) {
            if (Array.isArray(sp.components) && sp.components.length > 0) {
              const matchedComp = sp.components.find((c) => {
                const cId = (c.id || c.name?.toLowerCase().replace(/\s+/g, '_'))?.toLowerCase().trim();
                return cId === pieceId || cId === key || c.name?.toLowerCase().trim() === lowerKey;
              });
              if (matchedComp) {
                return acc + spQty * (parseInt(matchedComp.qty, 10) || 1);
              }
            } else if (sp.id === pieceId || sp.name?.toLowerCase().trim() === lowerKey) {
              return acc + spQty;
            }
          }
        }
        if (a.assignedSubParts[pieceId] !== undefined) {
          return acc + (parseInt(a.assignedSubParts[pieceId], 10) || 0);
        }
        if (a.assignedSubParts[key] !== undefined) {
          return acc + (parseInt(a.assignedSubParts[key], 10) || 0);
        }
      }
      return acc;
    }, 0);

    const remVal = Math.max(0, cutVal - assignedCount);
    assigned[key] = assignedCount;
    assigned[pieceId] = assignedCount;
    assigned[lowerKey] = assignedCount;

    remaining[key] = remVal;
    remaining[pieceId] = remVal;
    remaining[lowerKey] = remVal;
  });

  const totalCutPieces = Object.values(aggregatedCutPieces).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
  const assignedTotal = fabricAssignments.reduce((sum, a) => sum + (parseInt(a.totalAssignedPieces, 10) || 0), 0);
  const remainingTotal = Math.max(0, totalCutPieces - assignedTotal);

  assigned.total = assignedTotal;
  remaining.total = remainingTotal;

  const getRem = (nameOrId, secondId = null) => {
    if (!nameOrId && !secondId) return 0;
    if (nameOrId && remaining[nameOrId] !== undefined) return remaining[nameOrId];
    if (secondId && remaining[secondId] !== undefined) return remaining[secondId];

    const v = getPieceValueFromObject(remaining, nameOrId, secondId);
    if (v > 0) return v;

    const norm = (nameOrId || secondId || '').toLowerCase().trim();
    if (remaining[norm] !== undefined) return remaining[norm];
    const lower = norm.replace(/\s+/g, '_');
    if (remaining[lower] !== undefined) return remaining[lower];

    const matchKey = Object.keys(remaining).find((k) => {
      const kn = k.toLowerCase().trim();
      const kl = kn.replace(/\s+/g, '_');
      return kn === norm || kl === lower || (lower && kl.includes(lower)) || (norm && kn.includes(norm));
    });
    return matchKey !== undefined ? remaining[matchKey] : 0;
  };

  const availableSubParts = {};
  const struct = fabric.productStructure || fabricCuttings.find((c) => c.productStructure)?.productStructure || getProductStructure(fabric);
  const subParts = struct?.subParts || [];

  if (subParts.length > 0) {
    subParts.forEach((sp) => {
      const comps = Array.isArray(sp.components) ? sp.components : [];
      if (comps.length > 0) {
        const pieceAvails = comps.map((c) => {
          const rem = Math.max(getRem(c.name, c.id), getRem(c.id, c.name));
          const perG = Math.max(1, parseInt(c.qty, 10) || 1);
          return Math.floor(rem / perG);
        });
        availableSubParts[sp.id] = pieceAvails.length > 0 ? Math.min(...pieceAvails) : 0;
      } else {
        availableSubParts[sp.id] = Math.max(getRem(sp.name, sp.id), getRem(sp.id, sp.name));
      }
      if (sp.name) availableSubParts[sp.name] = availableSubParts[sp.id];
      if (sp.name) availableSubParts[sp.name.toLowerCase()] = availableSubParts[sp.id];
      const spDerivedId = sp.name ? sp.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : '';
      if (spDerivedId) availableSubParts[spDerivedId] = availableSubParts[sp.id];
    });
  } else {
    Object.entries(remaining).forEach(([k, v]) => {
      if (k !== 'total') availableSubParts[k] = v;
    });
  }

  const subPartAvailVals = Object.values(availableSubParts).filter((v) => typeof v === 'number');
  const availableFullSets = subPartAvailVals.length > 0 ? Math.min(...subPartAvailVals) : 0;
  availableSubParts.fullSets = availableFullSets;

  return {
    fabric,
    cuttings: fabricCuttings,
    assignments: fabricAssignments,
    assigned,
    remaining,
    availableSubParts,
    availableSets: availableFullSets,
    totalCutPieces,
    totalAssignedPieces: assignedTotal,
    totalRemainingPieces: remainingTotal,
    isFullyAssigned: remainingTotal === 0 && totalCutPieces > 0,
    isPartiallyAssigned: remainingTotal > 0 && assignedTotal > 0,
    isUnassigned: assignedTotal === 0,
  };
}

/**
 * Calculates fabric utilization efficiency, leftover scrap meters, and rejection analytics.
 *
 * @param {Object} params
 * @param {import('../types/models').Fabric} params.fabric
 * @param {import('../types/models').Cutting[]} [params.cuttings]
 * @param {import('../types/models').MasterHandover[]} [params.masterHandovers]
 * @returns {import('../types/models').ScrapAnalysis}
 */
export function calculateFabricScrap({
  fabric,
  cuttings = [],
  masterHandovers = [],
}) {
  const plainMeters = Math.max(0, parseFloat(fabric?.plainMeters) || 0);

  const fabricCuttings = (cuttings || []).filter((c) => c && c.fabricId === fabric?.id);
  const fabricHandovers = (masterHandovers || []).filter((h) => h && h.fabricId === fabric?.id);

  const metersUsed = fabricCuttings.reduce((sum, c) => sum + (parseFloat(c.metersUsed) || 0), 0);
  const unusedMeters = Math.max(0, Math.round((plainMeters - metersUsed) * 100) / 100);

  const totalCutPieces = fabricCuttings.reduce((sum, c) => {
    if (c.cutPieces && typeof c.cutPieces === 'object') {
      return sum + Object.values(c.cutPieces).reduce((pSum, v) => pSum + (parseInt(v, 10) || 0), 0);
    }
    return sum + (parseInt(c.totalPieces, 10) || 0);
  }, 0);

  const metersPerPiece = totalCutPieces > 0 ? Math.round((metersUsed / totalCutPieces) * 1000) / 1000 : 0;

  const totalAcceptedPieces = fabricHandovers.reduce((sum, h) => {
    if (h.status === 'Rejected') return sum;
    return sum + (parseInt(h.acceptedQuantity ?? h.piecesCount ?? h.pieces, 10) || 0);
  }, 0);

  const totalRejectedPieces = fabricHandovers.reduce((sum, h) => {
    if (h.status === 'Rejected') {
      return sum + (parseInt(h.rejectedQuantity ?? h.piecesCount ?? h.pieces, 10) || 0);
    }
    return sum + (parseInt(h.rejectedQuantity, 10) || 0);
  }, 0);

  const totalInspected = totalAcceptedPieces + totalRejectedPieces;
  const rejectionRatePercent = totalInspected > 0
    ? Math.round((totalRejectedPieces / totalInspected) * 1000) / 10
    : 0;

  const fabricUtilizationRatePercent = plainMeters > 0
    ? Math.min(100, Math.round((metersUsed / plainMeters) * 1000) / 10)
    : 0;

  return {
    plainMeters,
    metersUsed,
    unusedMeters,
    totalCutPieces,
    metersPerPiece,
    totalAcceptedPieces,
    totalRejectedPieces,
    rejectionRatePercent,
    fabricUtilizationRatePercent,
  };
}

/**
 * Calculates updated invoice state upon recording a payment.
 *
 * @param {import('../types/models').Invoice} invoice
 * @param {number} paymentAmount
 * @param {string} [paymentDate]
 * @returns {{ invoice: import('../types/models').Invoice, paidDelta: number, isOverpayment: boolean }}
 */
export function calculateInvoiceSettlement(invoice, paymentAmount, paymentDate = new Date().toISOString()) {
  if (!invoice) throw new Error('Invoice is required for settlement calculation.');

  const total = Math.max(0, parseFloat(invoice.totalAmount) || 0);
  const currentPaid = Math.max(0, parseFloat(invoice.paidAmount) || 0);
  const amountToApply = Math.max(0, parseFloat(paymentAmount) || 0);

  const newPaidAmount = Math.round((currentPaid + amountToApply) * 100) / 100;
  const newPendingAmount = Math.max(0, Math.round((total - newPaidAmount) * 100) / 100);

  let newStatus = 'Pending';
  if (newPaidAmount >= total && total > 0) {
    newStatus = 'Paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'Partial';
  }

  const updatedInvoice = {
    ...invoice,
    paidAmount: newPaidAmount,
    pendingAmount: newPendingAmount,
    dueAmount: newPendingAmount,
    status: newStatus,
    updatedAt: paymentDate,
  };

  return {
    invoice: updatedInvoice,
    paidDelta: amountToApply,
    isOverpayment: newPaidAmount > total,
  };
}
