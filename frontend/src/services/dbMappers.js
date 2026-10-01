/**
 * @typedef {import('../types/domain').ProductStructure} ProductStructure
 * @typedef {import('../types/domain').FabricLot} FabricLot
 * @typedef {import('../types/domain').CuttingRecord} CuttingRecord
 * @typedef {import('../types/domain').TailorAssignment} TailorAssignment
 * @typedef {import('../types/domain').Invoice} Invoice
 */

import { sanitizeFabricName } from '../context/managementContextInstance';
import {
  validateProductStructure,
  validateTailorRates,
  validatePieceCounts,
} from '../utils/schemaValidators';

export const cleanNoteString = (val) => {
  if (typeof val !== 'string') return null;
  const t = val.trim();
  if (!t) return null;
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      const parsed = JSON.parse(t);
      if (parsed && typeof parsed.userNotes === 'string') {
        const u = parsed.userNotes.trim();
        if (u && !u.startsWith('{') && !u.startsWith('[')) return u;
      }
    } catch {}
    return null;
  }
  return t;
};

export const getProductStructure = (source = {}) => {
  const struct = source?.productStructure || source?.product_structure || (source?.subParts || source?.parts ? source : null);
  const productName = source?.productName || source?.product_name || 'Garment';
  const fallbackRate = parseFloat(source?.pricePerPiece) || parseFloat(source?.price_per_piece) || parseFloat(source?.tailorRate) || parseFloat(source?.fullSetRate) || 0;
  return validateProductStructure(struct, productName, fallbackRate);
};

export const calculateAssignmentFinancials = (
  assignedPieces,
  tailorRates,
  assignedSubParts = null
) => {
  const rates = tailorRates || {};
  let totalJobAmount = 0;
  let totalAssignedQuantity = 0;
  const subPartsDescriptions = [];
  const dynamicSubPartRates = { ...rates };

  // 1. Process assignedSubParts dynamically
  if (assignedSubParts && typeof assignedSubParts === 'object') {
    Object.entries(assignedSubParts).forEach(([partKey, rawQty]) => {
      const qty = parseInt(rawQty, 10);
      if (!isNaN(qty) && qty > 0) {
        totalAssignedQuantity += qty;
        const partRate =
          parseFloat(rates[partKey]) ||
          parseFloat(rates[partKey.toLowerCase()]) ||
          parseFloat(rates[partKey.replace(/\s+/g, '_').toLowerCase()]) ||
          0;
        dynamicSubPartRates[partKey] = partRate;
        totalJobAmount += qty * partRate;
        const label = partKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        subPartsDescriptions.push(`${qty} ${label}`);
      }
    });
  }

  // 2. Process assignedPieces dynamically if not already calculated via subParts
  if (totalAssignedQuantity === 0 && assignedPieces && typeof assignedPieces === 'object') {
    Object.entries(assignedPieces).forEach(([partKey, rawQty]) => {
      const qty = parseInt(rawQty, 10);
      if (!isNaN(qty) && qty > 0) {
        totalAssignedQuantity += qty;
        const partRate =
          parseFloat(rates[partKey]) ||
          parseFloat(rates[partKey.toLowerCase()]) ||
          0;
        totalJobAmount += qty * partRate;
        const label = partKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        subPartsDescriptions.push(`${qty} ${label}`);
      }
    });
  }

  const roundedTotalAmount = Math.round(totalJobAmount * 100) / 100;
  const ratePerPiece =
    totalAssignedQuantity > 0 ? Math.round((roundedTotalAmount / totalAssignedQuantity) * 100) / 100 : 0;
  const pieceType =
    subPartsDescriptions.length > 0 ? subPartsDescriptions.join(' + ') : 'Garment Work';

  return {
    totalJobAmount: roundedTotalAmount,
    ratePerPiece,
    pieceType,
    subPartRates: dynamicSubPartRates,
  };
};

export const normalizeTailorAssignment = (a, fabricsList = [], cuttingsList = []) => {
  if (!a) return a;
  const cutting = cuttingsList.find((c) => c.id === a.cuttingId);
  const fabric = fabricsList.find((f) => f.id === (a.fabricId || cutting?.fabricId));
  const rates = a.tailorRates || cutting?.tailorRates || fabric?.tailorRates || null;
  const financials = calculateAssignmentFinancials(a.assignedPieces, rates, a.assignedSubParts);

  const ratePerPiece =
    parseFloat(a.ratePerPiece) > 0 ? parseFloat(a.ratePerPiece) : financials.ratePerPiece;
  const totalJobAmount =
    parseFloat(a.totalJobAmount) > 0 ? parseFloat(a.totalJobAmount) : financials.totalJobAmount;
  const pieceType = a.pieceType || financials.pieceType;
  const subPartRates = a.subPartRates || financials.subPartRates || rates || {};

  const updatedSubmissions = (a.dailySubmissions || []).map((sub) => {
    const qty = parseInt(sub.quantity, 10) || 0;
    const subRate =
      parseFloat(sub.ratePerPiece) > 0 ? parseFloat(sub.ratePerPiece) : ratePerPiece;

    const hasSubParts =
      sub.subParts && typeof sub.subParts === 'object' && Object.keys(sub.subParts).length > 0;
    const hasParts =
      sub.parts && typeof sub.parts === 'object' && Object.keys(sub.parts).length > 0;

    let subEarned = null;

    if (hasSubParts) {
      let earnedSum = 0;
      Object.entries(sub.subParts).forEach(([partKey, countVal]) => {
        const count = parseInt(countVal, 10) || 0;
        const normKey = partKey.toLowerCase().trim();
        const partRate =
          parseFloat(subPartRates?.[partKey]) ||
          parseFloat(subPartRates?.[normKey]) ||
          parseFloat(rates?.[partKey]) ||
          parseFloat(rates?.[normKey]) ||
          ratePerPiece;
        earnedSum += count * partRate;
      });
      subEarned = Math.round(earnedSum * 100) / 100;
    } else if (sub.earnedAmount !== undefined && sub.earnedAmount !== null) {
      subEarned = parseFloat(sub.earnedAmount);
    } else if (hasParts && rates) {
      let earnedSum = 0;
      Object.entries(sub.parts).forEach(([partKey, countVal]) => {
        const count = parseInt(countVal, 10) || 0;
        const normKey = partKey.toLowerCase().trim();
        const partRate = parseFloat(rates[partKey]) || parseFloat(rates[normKey]) || subRate;
        earnedSum += count * partRate;
      });
      subEarned = Math.round(earnedSum * 100) / 100;
    } else {
      subEarned = Math.round(qty * subRate * 100) / 100;
    }

    const effectiveSubRate = qty > 0 ? Math.round((subEarned / qty) * 100) / 100 : subRate;

    return {
      ...sub,
      subParts: sub.subParts || null,
      parts: sub.parts || null,
      ratePerPiece: effectiveSubRate,
      earnedAmount: subEarned,
      approvalStatus: sub.approvalStatus || 'Approved',
      approvedBy:
        sub.approvedBy ||
        (sub.approvalStatus === 'Approved' ? a.masterName || 'Cutting Master' : null),
      approvedAt:
        sub.approvedAt ||
        (sub.approvalStatus === 'Approved' ? sub.createdAt || new Date().toISOString() : null),
      rejectionReason: sub.rejectionReason || null,
    };
  });

  const effectiveCompleted =
    updatedSubmissions.length > 0
      ? updatedSubmissions
          .filter((s) => s.approvalStatus === 'Approved')
          .reduce((acc, s) => acc + (parseInt(s.quantity, 10) || 0), 0)
      : parseInt(a.completedQuantity, 10) || 0;

  const totalEarned =
    updatedSubmissions.length > 0
      ? updatedSubmissions
          .filter((s) => s.approvalStatus === 'Approved')
          .reduce(
            (acc, s) =>
              acc + (parseFloat(s.earnedAmount) || (parseInt(s.quantity, 10) || 0) * ratePerPiece),
            0
          )
      : a.totalEarned !== undefined && parseFloat(a.totalEarned) > 0
        ? parseFloat(a.totalEarned)
        : effectiveCompleted * ratePerPiece;

  const hasSubmissions = updatedSubmissions.length > 0;
  const tailorAccepted = Boolean(
    a.tailorAccepted ||
      effectiveCompleted > 0 ||
      hasSubmissions ||
      a.status === 'Completed' ||
      a.status === 'In Stitching'
  );

  const targetPiecesCount =
    a.assignedSubParts &&
    typeof a.assignedSubParts === 'object' &&
    Object.keys(a.assignedSubParts).length > 0
      ? Object.values(a.assignedSubParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0)
      : parseInt(a.totalAssignedPieces, 10) || 0;

  let status = a.status || 'Pending Acceptance';
  if (!tailorAccepted && status !== 'Declined') {
    status = 'Pending Acceptance';
  } else if (tailorAccepted) {
    if (effectiveCompleted >= targetPiecesCount && targetPiecesCount > 0) {
      status = 'Completed';
    } else if (status === 'Completed' && effectiveCompleted < targetPiecesCount) {
      status = 'In Stitching';
    } else if (!status || status === 'Pending Acceptance') {
      status = 'In Stitching';
    }
  }

  const isArchived =
    a.restoredAt && !a.isArchived ? false : Boolean(a.isArchived);

  return {
    ...a,
    fabricName: sanitizeFabricName(
      a.fabricName || cutting?.fabricName || fabric?.fabricType || 'Fabric Lot'
    ),
    tailorRates: rates,
    ratePerPiece,
    totalJobAmount,
    pieceType,
    tailorAccepted,
    acceptedAt: a.acceptedAt || (tailorAccepted ? a.createdAt || null : null),
    status,
    isArchived,
    archivedAt: a.archivedAt || (isArchived ? a.updatedAt || a.createdAt || null : null),
    restoredAt: isArchived ? null : a.restoredAt || null,
    completedQuantity: effectiveCompleted,
    totalTargetPieces: targetPiecesCount,
    totalTargetPSC: targetPiecesCount,
    totalEarned,
    dailySubmissions: updatedSubmissions,
    deletedSubmissionIds: a.deletedSubmissionIds || a._meta?.deletedSubmissionIds || a.assignedSubParts?._meta?.deletedSubmissionIds || [],
  };
};

// ----------------- TO DATABASE MAPPERS -----------------

export const mapMasterToDb = (m, userId) => ({
  id: m.id,
  user_id: m.user_id || m.userId || userId || null,
  role: m.role || 'Master',
  name: m.name,
  phone: m.phone || null,
  specialization: m.specialization || null,
  experience: m.experience || null,
  status: m.status || 'Active',
  joined_date: m.joinedDate || null,
  left_date: m.leftDate || null,
  exit_reason: m.exitReason || null,
  password: m.password || null,
  created_at: m.createdAt || new Date().toISOString(),
});

export const mapMachineToDb = (m, userId) => ({
  id: m.id,
  user_id: m.user_id || m.userId || userId || null,
  code: m.code,
  name: m.name,
  type: m.type || null,
  brand: m.brand || null,
  line: m.line || null,
  status: m.status || 'Active',
  assigned_tailor_id: m.assignedTailorId || null,
  notes: m.notes || null,
  operator_history: m.operatorHistory || [],
  created_at: m.createdAt || new Date().toISOString(),
});

export const mapTailorToDb = (t, userId) => ({
  id: t.id,
  user_id: t.user_id || t.userId || userId || null,
  role: t.role || 'Tailor',
  name: t.name,
  phone: t.phone || null,
  assigned_machine_id: t.assignedMachineId || null,
  specialty: t.specialty || null,
  status: t.status || 'Active',
  joined_date: t.joinedDate || null,
  left_date: t.leftDate || null,
  exit_reason: t.exitReason || null,
  password: t.password || null,
  created_at: t.createdAt || new Date().toISOString(),
});

export const mapHelperToDb = (h, userId) => ({
  id: h.id,
  user_id: h.user_id || h.userId || userId || null,
  role: h.role || 'Helper',
  name: h.name,
  phone: h.phone || null,
  helper_category: h.helperCategory || null,
  helper_type: h.helperType || null,
  assigned_master_id: h.assignedMasterId || null,
  work_type: h.workType || null,
  wage_type: h.wageType || null,
  default_rate_per_piece: parseFloat(h.defaultRatePerPiece || h.defaultRatePerPSC) || 0,
  default_rate_per_psc: parseFloat(h.defaultRatePerPiece || h.defaultRatePerPSC) || 0,
  notes: h.notes || null,
  status: h.status || 'Active',
  joined_date: h.joinedDate || null,
  left_date: h.leftDate || null,
  exit_reason: h.exitReason || null,
  created_at: h.createdAt || new Date().toISOString(),
});

export const mapSupplierToDb = (s, userId) => ({
  id: s.id,
  user_id: s.user_id || s.userId || userId || null,
  name: s.name,
  category: s.category || null,
  contact_person: s.contactPerson || null,
  phone: s.phone || null,
  whatsapp: s.whatsapp || null,
  gst_number: s.gstNumber || null,
  address: s.address || null,
  payment_terms: s.paymentTerms || null,
  notes: s.notes || null,
  status: s.status || 'Active',
  created_at: s.createdAt || new Date().toISOString(),
});

export const mapFabricToDb = (f, userId) => {
  const cleanNotes = cleanNoteString(f.notes) || cleanNoteString(f._userNotes) || null;

  return {
    id: f.id,
    user_id: f.user_id || f.userId || userId || null,
    lot_no: parseInt(f.lotNo ?? f.lot_no, 10) || null,
    supplier_id: f.supplierId || f.supplier_id || null,
    supplier_name: f.supplierName || f.supplier_name || null,
    supplier_phone: f.supplierPhone || f.supplier_phone || null,
    assigned_master_id: f.assignedMasterId || f.assigned_master_id || null,
    assigned_master_name: f.assignedMasterName || f.assigned_master_name || null,
    plain_meters: parseFloat(f.plainMeters ?? f.plain_meters) || 0,
    target_sets: parseInt(f.targetSets ?? f.printPieces ?? f.lotSizePrintFabricPsc ?? f.target_sets, 10) || 0,
    print_pieces: parseInt(f.printPieces ?? f.targetSets ?? f.lotSizePrintFabricPsc ?? f.print_pieces, 10) || 0,
    lot_size_print_fabric_psc: parseInt(f.lotSizePrintFabricPsc ?? f.targetSets ?? f.printPieces ?? f.lot_size_print_fabric_psc, 10) || 0,
    price_per_set: parseFloat(f.pricePerSet ?? f.pricePerPiece ?? f.price_per_set) || 0,
    price_per_piece: parseFloat(f.pricePerPiece ?? f.pricePerSet ?? f.price_per_piece) || 0,
    total_amount: parseFloat(f.totalAmount ?? f.total_amount) || 0,
    product_name: f.productName || f.product_name || null,
    product_structure: f.productStructure || f.product_structure || null,
    color: f.color || null,
    date: f.date || f.purchaseDate || null,
    due_date: f.dueDate || f.due_date || null,
    fabric_type: f.fabricType || f.fabric_type || null,
    status: f.status || 'In Stock',
    notes: cleanNotes,
    tailor_rates: f.tailorRates || f.tailor_rates || null,
    delivered_psc: parseInt(f.deliveredPSC ?? f.delivered_psc, 10) || 0,
    thread_cutting_decision: f.threadCuttingDecision || f.thread_cutting_decision || null,
    sub_part_trimming_decisions: f.subPartTrimmingDecisions || f.sub_part_trimming_decisions || null,
    sub_part_skipped_pieces: f.subPartSkippedPieces || f.sub_part_skipped_pieces || null,
    skipped_trimming_logs: f.skippedTrimmingLogs || f.skipped_trimming_logs || null,
    sub_parts_delivered: f.subPartsDelivered || f.sub_parts_delivered || null,
    is_archived: Boolean(f.isArchived ?? f.is_archived),
    archived_at: (f.isArchived ?? f.is_archived) ? (f.archivedAt || f.archived_at || new Date().toISOString()) : null,
    restored_at: !(f.isArchived ?? f.is_archived) ? (f.restoredAt || f.restored_at || null) : null,
    created_at: f.createdAt || f.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const mapCuttingToDb = (c, userId) => ({
  id: c.id,
  user_id: c.user_id || c.userId || userId || null,
  fabric_id: c.fabricId || null,
  fabric_name: c.fabricName || null,
  fabric_color: c.fabricColor || null,
  master_id: c.masterId || null,
  master_name: c.masterName || null,
  product_name: c.productName || null,
  cut_pieces: c.cutPieces || null,
  total_pieces: parseInt(c.totalPieces, 10) || 0,
  sets_count: parseInt(c.setsCount !== undefined ? c.setsCount : c.totalSets, 10) || 0,
  meters_used: parseFloat(c.metersUsed) || 0,
  tailor_rates: c.tailorRates || null,
  product_structure: c.productStructure || null,
  notes: cleanNoteString(c.notes) || null,
  status: c.status || 'Active',
  is_archived: Boolean(c.isArchived ?? c.is_archived),
  archived_at: (c.isArchived ?? c.is_archived) ? (c.archivedAt || c.archived_at || new Date().toISOString()) : null,
  restored_at: !(c.isArchived ?? c.is_archived) ? (c.restoredAt || c.restored_at || null) : null,
  created_at: c.createdAt || new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const mapAssignmentToDb = (a, userId) => {
  let targetUserId = a.user_id || a.userId || userId || null;
  if (
    targetUserId &&
    (targetUserId.startsWith('mst_') ||
      targetUserId.startsWith('tlr_') ||
      targetUserId.startsWith('hlp_'))
  ) {
    targetUserId =
      userId &&
      !userId.startsWith('mst_') &&
      !userId.startsWith('tlr_') &&
      !userId.startsWith('hlp_')
        ? userId
        : null;
  }
  const baseSubParts = a.assignedSubParts || a.assignedGarmentPcs || {};
  const meta = {
    notes: cleanNoteString(a.notes) || cleanNoteString(a._userNotes) || null,
    machineId: a.machineId || null,
    machineCode: a.machineCode || '',
    machineName: a.machineName || '',
    allocationMode: a.allocationMode || 'by_machine',
    assignDate: a.assignDate || '',
    dueDate: a.dueDate || '',
    tailorRates: a.tailorRates || null,
    subPartRates: a.subPartRates || null,
    masterId: a.masterId || null,
    deletedSubmissionIds: a.deletedSubmissionIds || [],
    archivedAt: (a.isArchived ?? a.is_archived) ? (a.archivedAt || a.archived_at || new Date().toISOString()) : null,
    restoredAt: !(a.isArchived ?? a.is_archived) ? (a.restoredAt || a.restored_at || null) : null,
  };

  const garmentPcsWithMeta = {
    ...baseSubParts,
    _meta: meta,
  };

  return {
    id: a.id,
    user_id: targetUserId,
    cutting_id: a.cuttingId || null,
    fabric_id: a.fabricId || null,
    fabric_name: a.fabricName || null,
    master_name: a.masterName || null,
    tailor_id: a.tailorId || null,
    tailor_name: a.tailorName || null,
    assigned_cut_pieces: a.assignedCutPieces || a.assignedPieces || null,
    assigned_garment_pcs: garmentPcsWithMeta,
    assigned_pieces: a.assignedPieces || a.assignedCutPieces || null,
    assigned_sub_parts: garmentPcsWithMeta,
    total_assigned_pieces: parseInt(a.totalAssignedPieces, 10) || 0,
    rate_per_piece: parseFloat(a.ratePerPiece) || 0,
    total_job_amount: parseFloat(a.totalJobAmount) || 0,
    piece_type: a.pieceType || null,
    completed_quantity: parseInt(a.completedQuantity, 10) || 0,
    total_earned: parseFloat(a.totalEarned) || 0,
    daily_submissions: a.dailySubmissions || [],
    tailor_accepted: Boolean(
      a.tailorAccepted ||
        (Array.isArray(a.dailySubmissions) && a.dailySubmissions.length > 0) ||
        (parseInt(a.completedQuantity, 10) || 0) > 0 ||
        a.status === 'In Stitching' ||
        a.status === 'Completed'
    ),
    accepted_at: a.acceptedAt || null,
    status:
      (!a.tailorAccepted && !(Array.isArray(a.dailySubmissions) && a.dailySubmissions.length > 0))
        ? (a.status || 'Pending Acceptance')
        : (a.status === 'Pending Acceptance' ? 'In Stitching' : (a.status || 'In Stitching')),
    is_archived: Boolean(a.isArchived ?? a.is_archived),
    created_at: a.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const mapHandoverToDb = (h, userId) => {
  const cleanNotes = cleanNoteString(h.notes) || cleanNoteString(h._userNotes) || null;
  const meta = {
    userNotes: cleanNotes,
    subParts: h.subParts || null,
    parts: h.parts || null,
    combinationFormula: h.combinationFormula || null,
    handoverDate: h.handoverDate || h.date || null,
    fabricName: h.fabricName || null,
    productName: h.productName || null,
    verifiedBy: h.verifiedBy || null,
    verifiedAt: h.verifiedAt || null,
    rejectionReason: h.rejectionReason || null,
    rejectedAt: h.rejectedAt || null,
    trimmingStatus: h.trimmingStatus || (h.trimmedByMaster ? 'trimmed' : h.skippedByMaster ? 'skipped' : null),
    trimmedByMaster: Boolean(h.trimmedByMaster || h.trimmingStatus === 'trimmed'),
    skippedByMaster: Boolean(h.skippedByMaster || h.trimmingStatus === 'skipped'),
    trimmedPieces: parseInt(h.trimmedPieces, 10) || 0,
    skippedTrimmingPieces: parseInt(h.skippedTrimmingPieces, 10) || 0,
    trimmedSubParts: h.trimmedSubParts || null,
    skippedSubParts: h.skippedSubParts || null,
    trimmingHelperName: h.trimmingHelperName || null,
    trimmingHelperType: h.trimmingHelperType || null,
  };

  return {
    id: h.id,
    user_id: h.user_id || h.userId || userId || null,
    fabric_id: h.fabricId || null,
    cutting_id: h.cuttingId || null,
    master_id: h.masterId || null,
    master_name: h.masterName || null,
    pieces_count: parseInt(h.piecesCount ?? h.pieces ?? h.receivedQuantity, 10) || 0,
    sub_parts: h.subParts || null,
    parts: h.parts || null,
    combination_formula: h.combinationFormula || h.combination_formula || null,
    handover_date: h.handoverDate || h.handover_date || h.date || null,
    fabric_name: h.fabricName || h.fabric_name || null,
    product_name: h.productName || h.product_name || null,
    verified_by: h.verifiedBy || h.verified_by || null,
    verified_at: h.verifiedAt || h.verified_at || null,
    rejection_reason: h.rejectionReason || h.rejection_reason || null,
    rejected_at: h.rejectedAt || h.rejected_at || null,
    notes: cleanNotes || JSON.stringify(meta),
    status: h.status || 'Pending Verification',
    is_archived: Boolean(h.isArchived ?? h.is_archived),
    archived_at: (h.isArchived ?? h.is_archived) ? (h.archivedAt || h.archived_at || new Date().toISOString()) : null,
    restored_at: !(h.isArchived ?? h.is_archived) ? (h.restoredAt || h.restored_at || null) : null,
    created_at: h.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const mapThreadAssignmentToDb = (tc, userId) => {
  const assigned =
    parseInt(
      tc.assignedPieces ?? tc.assignedPSC ?? tc.assignedPsc ?? tc.piecesAssigned,
      10
    ) || 0;
  const completed =
    parseInt(
      tc.completedPieces ?? tc.completedPSC ?? tc.completedPsc ?? tc.piecesCompleted,
      10
    ) || 0;
  const rate = parseFloat(tc.ratePerPiece ?? tc.ratePerPSC ?? tc.ratePerPsc) || 0;
  const total = parseFloat(tc.totalEarned ?? tc.totalEstimatedAmount) || 0;
  const actionType =
    tc.actionType ||
    tc.action_type ||
    (tc.status === 'Skipped' || tc.helperType === 'skip' ? 'skip' : 'assign');

  const cleanNotes = cleanNoteString(tc.notes) || cleanNoteString(tc._userNotes) || null;
  const meta = {
    userNotes: cleanNotes,
    helperPhone: tc.helperPhone || tc.helper_phone || null,
    subPart: tc.subPart || tc.sub_part || null,
    subPartName: tc.subPartName || tc.sub_part_name || null,
    actionType,
    fabricName: tc.fabricName || tc.fabric_name || null,
    productName: tc.productName || null,
    handoverId: tc.handoverId || tc.handover_id || null,
    expenseId: tc.expenseId || null,
    assignedDate: tc.assignedDate || null,
    completionDate: tc.completionDate || null,
    skippedLogs: tc.skippedLogs || null,
    masterId: tc.masterId || tc.master_id || null,
    masterName: tc.masterName || tc.master_name || null,
    createdByRole: tc.createdByRole || (tc.masterId ? 'master' : 'admin'),
  };

  return {
    id: tc.id,
    user_id: tc.user_id || tc.userId || userId || null,
    fabric_id: tc.fabricId || tc.fabric_id || null,
    cutting_id: tc.cuttingId || tc.cutting_id || null,
    helper_id: tc.helperId || tc.helper_id || null,
    helper_name: tc.helperName || tc.helper_name || null,
    helper_type: tc.helperType || tc.helper_type || null,
    helper_phone: tc.helperPhone || tc.helper_phone || null,
    sub_part: tc.subPart || tc.sub_part || null,
    sub_part_name: tc.subPartName || tc.sub_part_name || null,
    action_type: actionType,
    fabric_name: tc.fabricName || tc.fabric_name || null,
    product_name: tc.productName || tc.product_name || null,
    handover_id: tc.handoverId || tc.handover_id || null,
    expense_id: tc.expenseId || tc.expense_id || null,
    assigned_pieces: assigned,
    completed_pieces: completed,
    rate_per_piece: rate,
    assigned_psc: assigned,
    completed_psc: completed,
    rate_per_psc: rate,
    total_estimated_amount: total,
    status: tc.status || (actionType === 'skip' ? 'Skipped' : 'In Progress'),
    is_archived: Boolean(tc.isArchived ?? tc.is_archived),
    archived_at: (tc.isArchived ?? tc.is_archived) ? (tc.archivedAt || tc.archived_at || new Date().toISOString()) : null,
    restored_at: !(tc.isArchived ?? tc.is_archived) ? (tc.restoredAt || tc.restored_at || null) : null,
    notes: cleanNotes || JSON.stringify(meta),
    created_at: tc.createdAt || tc.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const mapExpenseToDb = (e, userId) => {
  const expenseType = e.expenseType || e.expense_type || e.category || 'Other';
  return {
    id: e.id,
    user_id: e.user_id || e.userId || userId || null,
    expense_type: expenseType,
    category: expenseType,
    title: e.title || expenseType,
    salary_sub_type: e.salarySubType || e.salary_sub_type || null,
    worker_id: e.workerId || e.worker_id || null,
    worker_name: e.workerName || e.worker_name || null,
    machine_id: e.machineId || e.machine_id || null,
    machine_code: e.machineCode || e.machine_code || null,
    amount: parseFloat(e.amount) || 0,
    date: e.date || new Date().toISOString().split('T')[0],
    month: e.month || (e.date ? e.date.slice(0, 7) : null),
    payment_method: e.paymentMethod || e.payment_method || 'Cash',
    paid_to: e.paidTo || e.paid_to || e.recipient || null,
    reference_no: e.referenceNo || e.reference_no || null,
    notes: e.notes || e.description || null,
    fabric_id: e.fabricId || e.fabric_id || null,
    cutting_id: e.cuttingId || e.cutting_id || null,
    description: e.description || e.notes || '',
    recipient: e.paidTo || e.paid_to || e.recipient || null,
    created_at: e.createdAt || e.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const mapInvoiceToDb = (inv, userId) => {
  const totalAmount = parseFloat(inv.totalAmount ?? inv.total_amount) || 0;
  const paidAmount = parseFloat(inv.paidAmount ?? inv.paid_amount) || 0;
  const rawDue = inv.pendingAmount ?? inv.dueAmount ?? inv.due_amount ?? inv.pending_amount;
  const dueAmount =
    rawDue !== undefined && rawDue !== null && !isNaN(parseFloat(rawDue))
      ? parseFloat(rawDue)
      : Math.max(0, totalAmount - paidAmount);

  return {
    id: inv.id,
    user_id: inv.user_id || inv.userId || userId || null,
    invoice_number: inv.invoiceNumber || inv.invoice_number || null,
    client_name: inv.clientName || inv.client_name || inv.supplierName || null,
    client_phone: inv.clientPhone || inv.client_phone || inv.supplierPhone || null,
    client_address: inv.clientAddress || inv.client_address || null,
    date: inv.date ? String(inv.date).split('T')[0] : new Date().toISOString().split('T')[0],
    due_date: inv.dueDate || inv.due_date || null,
    items: inv.items || [],
    subtotal: parseFloat(inv.subtotal) || 0,
    discount: parseFloat(inv.discount) || 0,
    tax: parseFloat(inv.tax ?? inv.taxAmount) || 0,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    due_amount: dueAmount,
    status:
      inv.status ||
      (paidAmount >= totalAmount && totalAmount > 0
        ? 'Paid'
        : paidAmount > 0
          ? 'Partial'
          : 'Pending'),
    notes: inv.notes || null,
    payments: inv.payments || [],
    created_at: inv.createdAt || inv.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const mapTemplateToDb = (t, userId) => ({
  id: t.id,
  user_id: t.user_id || t.userId || userId || null,
  name: t.name || null,
  product_name: t.productName || null,
  full_set_rate: parseFloat(t.fullSetRate) || 0,
  sub_parts: t.subParts || [],
  is_default: Boolean(t.isDefault),
  created_at: t.createdAt || new Date().toISOString(),
});

export const mapDeliveryLogToDb = (d, userId) => {
  const payload = {
    id: d.id,
    user_id: d.user_id || d.userId || userId || null,
    fabric_id: d.fabricId || d.fabric_id || null,
    cutting_id: d.cuttingId || d.cutting_id || null,
    thread_job_id: d.threadJobId || d.thread_job_id || null,
    invoice_id: d.invoiceId || d.invoice_id || null,
    invoice_number: d.invoiceNumber || d.invoice_number || null,
    supplier_id: d.supplierId || d.supplier_id || null,
    supplier_name: d.supplierName || d.supplier_name || null,
    supplier_phone: d.supplierPhone || d.supplier_phone || null,
    total_pieces: parseInt(d.totalPieces ?? d.total_pieces ?? d.deliveredPSC, 10) || 0,
    sub_parts: d.subParts || d.subPartQuantities || d.sub_parts || {},
    price_per_piece: parseFloat(d.pricePerPSC ?? d.price_per_piece) || 0,
    total_amount: parseFloat(d.totalAmount ?? d.total_amount) || 0,
    delivery_date: d.deliveryDate || d.delivery_date || new Date().toISOString().split('T')[0],
    due_date: d.dueDate || d.due_date || null,
    vehicle_no: d.vehicleNo || d.vehicle_no || null,
    notes: d.notes || null,
    created_at: d.createdAt || d.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (d.isArchived !== undefined || d.is_archived !== undefined) {
    payload.is_archived = Boolean(d.isArchived || d.is_archived);
  }
  if (d.archivedAt || d.archived_at) {
    payload.archived_at = d.archivedAt || d.archived_at;
  }
  if (d.restoredAt || d.restored_at) {
    payload.restored_at = d.restoredAt || d.restored_at;
  }

  return payload;
};

export const mapInvoiceExpenseToDb = (ie, userId) => ({
  id: ie.id,
  user_id: ie.user_id || ie.userId || userId || null,
  invoice_id: ie.invoiceId || ie.invoice_id || null,
  expense_id: ie.expenseId || ie.expense_id || null,
  fabric_id: ie.fabricId || ie.fabric_id || null,
  cutting_id: ie.cuttingId || ie.cutting_id || null,
  cost_type: ie.costType || ie.cost_type || 'direct_cost',
  allocated_amount: parseFloat(ie.allocatedAmount ?? ie.allocated_amount) || 0,
  notes: ie.notes || null,
  created_at: ie.createdAt || new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const mapLoadedFabric = (f) => {
  const sets = parseInt(f.target_sets ?? f.print_pieces ?? f.lot_size_print_fabric_psc ?? f.printPieces, 10) || 0;
  const setPrice = parseFloat(f.price_per_set ?? f.price_per_piece ?? f.pricePerPiece) || 0;
  let parsedNotes = null;
  if (f.notes) {
    try { parsedNotes = typeof f.notes === 'string' ? JSON.parse(f.notes) : f.notes; } catch { }
  }
  const cleanUserNotes = parsedNotes && typeof parsedNotes === 'object'
    ? (typeof parsedNotes.userNotes === 'string' && parsedNotes.userNotes.trim() ? parsedNotes.userNotes.trim() : null)
    : (typeof f.notes === 'string' && !f.notes.trim().startsWith('{') && !f.notes.trim().startsWith('[') ? f.notes.trim() : null);

  const threadCuttingDecision = parsedNotes?.threadCuttingDecision || f.thread_cutting_decision || f.threadCuttingDecision || null;
  const subPartTrimmingDecisions = parsedNotes?.subPartTrimmingDecisions || parsedNotes?.threadCuttingDecisions || f.subPartTrimmingDecisions || {};
  const subPartSkippedPieces = parsedNotes?.subPartSkippedPieces || parsedNotes?.skippedPieces || f.subPartSkippedPieces || {};
  const skippedTrimmingLogs = Array.isArray(parsedNotes?.skippedTrimmingLogs)
    ? parsedNotes.skippedTrimmingLogs
    : (Array.isArray(f.skippedTrimmingLogs) ? f.skippedTrimmingLogs : []);
  const deliveredPSC = parseInt(parsedNotes?.deliveredPSC ?? f.delivered_psc ?? f.deliveredPSC, 10) || 0;
  const fabricDeliveryLogs = Array.isArray(parsedNotes?.deliveryLogs)
    ? parsedNotes.deliveryLogs
    : (Array.isArray(f.delivery_logs) ? f.delivery_logs : (Array.isArray(f.deliveryLogs) ? f.deliveryLogs : []));

  const rawStructure = f.product_structure || f.productStructure;
  let parsedRaw = rawStructure;
  if (typeof parsedRaw === 'string') {
    try {
      parsedRaw = JSON.parse(parsedRaw);
    } catch {
      parsedRaw = null;
    }
  }

  const hasSubParts = Boolean(
    parsedRaw &&
    typeof parsedRaw === 'object' &&
    ((Array.isArray(parsedRaw.subParts) && parsedRaw.subParts.length > 0) ||
     (Array.isArray(parsedRaw.parts) && parsedRaw.parts.length > 0))
  );

  const parsedProductStructure = hasSubParts
    ? validateProductStructure(
        parsedRaw,
        f.product_name || f.productName || 'Garment'
      )
    : null;
  const parsedTailorRates = validateTailorRates(f.tailor_rates || f.tailorRates);
  const validatedSubPartsDelivered = validatePieceCounts(
    parsedNotes?.subPartsDelivered || f.sub_parts_delivered || f.subPartsDelivered
  );

  const lotNum = f.lot_no !== undefined && f.lot_no !== null ? f.lot_no : (f.lotNo ?? f.lotNumber);
  const resolvedProductName = (f.product_name || f.productName || (hasSubParts ? parsedProductStructure?.productName : '') || '').trim();

  return {
    ...f,
    lotNo: lotNum,
    lotNumber: lotNum,
    fabricType: f.fabric_type || f.fabricType || 'Fabric Lot',
    fabric_type: f.fabric_type || f.fabricType || 'Fabric Lot',
    productName: resolvedProductName,
    product_name: resolvedProductName,
    productStructure: parsedProductStructure,
    product_structure: parsedProductStructure,
    tailorRates: parsedTailorRates,
    tailor_rates: parsedTailorRates,
    dueDate: f.due_date || f.dueDate || null,
    due_date: f.due_date || f.dueDate || null,
    productQuantity: sets,
    targetSets: sets,
    printPieces: sets,
    pricePerSet: setPrice,
    pricePerPiece: setPrice,
    plainMeters: parseFloat(f.plain_meters ?? f.plainMeters) || 0,
    totalAmount: parseFloat(f.total_amount ?? f.totalAmount) || 0,
    totalPaidAmount: parseFloat(f.total_paid_amount ?? f.totalPaidAmount) || 0,
    notes: cleanUserNotes,
    _rawNotes: typeof f.notes === 'string' ? f.notes : (parsedNotes ? JSON.stringify(parsedNotes) : null),
    supplierId: f.supplier_id || f.supplierId,
    supplierName: f.supplier_name || f.supplierName,
    supplierPhone: f.supplier_phone || f.supplierPhone,
    assignedMasterId: f.assigned_master_id || f.assignedMasterId,
    assignedMasterName: f.assigned_master_name || f.assignedMasterName,
    assignedMasterPhone: f.assigned_master_phone || f.assignedMasterPhone,
    threadCuttingDecision,
    thread_cutting_decision: threadCuttingDecision,
    subPartTrimmingDecisions,
    subPartSkippedPieces,
    skippedTrimmingLogs,
    deliveredPSC,
    subPartsDelivered: validatedSubPartsDelivered,
    deliveryLogs: fabricDeliveryLogs,
    isArchived: Boolean(f.is_archived ?? f.isArchived),
    archivedAt: (f.is_archived ?? f.isArchived) ? (f.archived_at || f.archivedAt || null) : null,
    restoredAt: f.restored_at || f.restoredAt || null,
  };
};

export const mapLoadedCutting = (c) => {
  const rawStructure = c.product_structure || c.productStructure;
  let parsedRaw = rawStructure;
  if (typeof parsedRaw === 'string') {
    try {
      parsedRaw = JSON.parse(parsedRaw);
    } catch {
      parsedRaw = null;
    }
  }

  const hasSubParts = Boolean(
    parsedRaw &&
    typeof parsedRaw === 'object' &&
    ((Array.isArray(parsedRaw.subParts) && parsedRaw.subParts.length > 0) ||
     (Array.isArray(parsedRaw.parts) && parsedRaw.parts.length > 0))
  );

  const parsedStructure = hasSubParts
    ? validateProductStructure(
        parsedRaw,
        c.product_name || c.productName || 'Garment'
      )
    : null;
  const parsedRates = validateTailorRates(c.tailor_rates || c.tailorRates);
  const parsedCutPieces = validatePieceCounts(c.cut_pieces || c.cutPieces);

  return {
    ...c,
    fabricId: c.fabric_id || c.fabricId,
    fabricName: sanitizeFabricName(c.fabric_name || c.fabricName),
    fabricColor: c.fabric_color || c.fabricColor,
    masterId: c.master_id || c.masterId,
    masterName: c.master_name || c.masterName,
    productName: (c.product_name || c.productName || (hasSubParts ? parsedStructure?.productName : '') || '').trim(),
    cutPieces: parsedCutPieces,
    totalPieces: parseInt(c.total_pieces ?? c.totalPieces, 10) || 0,
    setsCount: parseInt(c.sets_count ?? c.setsCount ?? c.totalSets, 10) || 0,
    metersUsed: parseFloat(c.meters_used ?? c.metersUsed) || 0,
    tailorRates: parsedRates,
    productStructure: parsedStructure,
    product_structure: parsedStructure,
    isArchived: Boolean(c.is_archived ?? c.isArchived),
    archivedAt: (c.is_archived ?? c.isArchived) ? (c.archived_at || c.archivedAt || null) : null,
    restoredAt: c.restored_at || c.restoredAt || null,
  };
};

export const mapLoadedInvoice = (inv) => {
  let parsedItems = [];
  if (Array.isArray(inv.items)) {
    parsedItems = inv.items;
  } else if (typeof inv.items === 'string') {
    try { parsedItems = JSON.parse(inv.items); } catch { }
  }
  const firstFabricId = parsedItems.find((it) => it.fabricId || it.fabric_id)?.fabricId || null;

  const totalAmount = parseFloat(inv.total_amount ?? inv.totalAmount) || 0;
  const paidAmount = parseFloat(inv.paid_amount ?? inv.paidAmount) || 0;
  const rawDue = inv.due_amount ?? inv.dueAmount ?? inv.pending_amount ?? inv.pendingAmount;
  const pendingAmount =
    rawDue !== undefined && rawDue !== null && !isNaN(parseFloat(rawDue))
      ? parseFloat(rawDue)
      : Math.max(0, totalAmount - paidAmount);

  const status =
    inv.status ||
    (paidAmount >= totalAmount && totalAmount > 0
      ? 'Paid'
      : paidAmount > 0
        ? 'Partial'
        : 'Pending');

  return {
    ...inv,
    invoiceNumber: inv.invoice_number || inv.invoiceNumber,
    clientName: inv.client_name || inv.customerName || inv.clientName || 'Supplier',
    customerName: inv.client_name || inv.customer_name || inv.customerName,
    supplierName: inv.client_name || inv.supplier_name || inv.supplierName || inv.customerName || 'Supplier',
    clientPhone: inv.client_phone || inv.customerPhone || inv.clientPhone || '',
    customerPhone: inv.client_phone || inv.customer_phone || inv.customerPhone,
    supplierPhone: inv.client_phone || inv.supplier_phone || inv.supplierPhone || '',
    date: inv.date ? String(inv.date).split('T')[0] : '',
    dueDate: inv.due_date || inv.dueDate || null,
    fabricId: inv.fabric_id || inv.fabricId || firstFabricId,
    items: parsedItems,
    totalAmount,
    paidAmount,
    dueAmount: pendingAmount,
    pendingAmount,
    status,
  };
};
