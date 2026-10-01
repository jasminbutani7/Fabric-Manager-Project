import { supabase, isSupabaseConfigured } from '../../../lib/supabaseClient';
import {
  calculateAssignmentFinancials,
  mapAssignmentToDb,
  mapCuttingToDb,
  normalizeTailorAssignment,
} from '../../../services/dbMappers';
import { broadcastAssignmentUpdate, mergeAssignmentSafely } from '../../../services/realtimeSync';
import {
  formatPieceName,
} from '../../../utils/productUtils';
import { executeAtomicTailorAssignment } from '../../../services/atomicTransactions';
import { generateEntityId } from '../../../utils/idGenerator';

export function useTailorAssignmentOps(params) {
  const {
    tailorAssignments,
    setTailorAssignments,
    tailorAssignmentsRef,
    fabrics,
    setFabrics,
    cuttings,
    setCuttings,
    machines,
    tailors,
    masters,
    recentAssignmentUpdatesRef,
    getFabricBalance,
    saveToDb,
    ownerUserId,
    currentUser,
  } = params;
  const addTailorAssignment = (data) => {
    const cutting = cuttings.find((c) => c.id === data.cuttingId);
    const machine = machines.find((m) => m.id === data.machineId);
    const tailor = tailors.find((t) => t.id === data.tailorId);
    const fabric = fabrics.find((f) => f.id === (cutting?.fabricId || data.fabricId));
    const master = masters?.find((m) => m.id === (data.masterId || cutting?.masterId));

    const struct = cutting?.productStructure || fabric?.productStructure;
    const tailorRates = {
      ...(cutting?.tailorRates || fabric?.tailorRates || data.tailorRates || {}),
    };
    if (struct?.subParts && Array.isArray(struct.subParts)) {
      struct.subParts.forEach((sp) => {
        const r = parseFloat(sp.rate);
        if (r > 0) {
          if (sp.id) tailorRates[sp.id] = r;
          if (sp.name) tailorRates[sp.name] = r;
          if (sp.name) tailorRates[sp.name.toLowerCase()] = r;
        }
      });
    }

    // Build full assignedPieces map from incoming data (preserving all custom piece names)
    const fullAssignedPieces = {};
    if (data.assignedPieces && typeof data.assignedPieces === 'object') {
      Object.entries(data.assignedPieces).forEach(([k, v]) => {
        const num = Math.max(0, parseInt(v, 10) || 0);
        if (num > 0) fullAssignedPieces[k] = num;
      });
    }

    // Calculate totalAssignedPieces from ALL piece values
    const totalAssignedPieces =
      parseInt(data.totalAssignedPieces, 10) > 0
        ? parseInt(data.totalAssignedPieces, 10)
        : Object.values(fullAssignedPieces).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);

    // Strict Guardrail: Check that cutting lot or fabric lot has remaining unassigned cut pieces
    const targetFabricId = cutting?.fabricId || data.fabricId;
    if (targetFabricId) {
      const balance = getFabricBalance(targetFabricId);
      if (balance && balance.totalCutPieces > 0) {
        if (balance.isFullyAssigned || balance.totalRemainingPieces <= 0) {
          return {
            success: false,
            error: 'All cut pieces for this fabric lot have already been assigned to tailors. Once assigned, pieces cannot be re-assigned.',
          };
        }
        if (totalAssignedPieces > balance.totalRemainingPieces) {
          return {
            success: false,
            error: `Cannot assign ${totalAssignedPieces} pieces. Only ${balance.totalRemainingPieces} unassigned cut pieces remain for this fabric lot.`,
          };
        }
      }
    } else if (cutting) {
      const prevAssigned = tailorAssignments
        .filter((a) => a.cuttingId === cutting.id && a.status !== 'Declined')
        .reduce((acc, a) => acc + (parseInt(a.totalAssignedPieces, 10) || 0), 0);
      const remainingInCutting = Math.max(0, (parseInt(cutting.totalPieces, 10) || 0) - prevAssigned);
      if (remainingInCutting <= 0 && (parseInt(cutting.totalPieces, 10) || 0) > 0) {
        return {
          success: false,
          error: 'All pieces for this cutting batch have already been assigned to tailors. Once assigned, pieces cannot be re-assigned.',
        };
      }
      if (totalAssignedPieces > remainingInCutting && remainingInCutting > 0) {
        return {
          success: false,
          error: `Cannot assign ${totalAssignedPieces} pieces. Only ${remainingInCutting} unassigned pieces remain for this cutting batch.`,
        };
      }
    }

    let assignedSubParts = null;
    if (data.assignedSubParts && typeof data.assignedSubParts === 'object') {
      assignedSubParts = {};
      Object.entries(data.assignedSubParts).forEach(([k, v]) => {
        const cnt = parseInt(v, 10);
        if (!isNaN(cnt) && cnt >= 0) {
          assignedSubParts[k] = cnt;
        }
      });
    }

    const financials = calculateAssignmentFinancials(
      fullAssignedPieces,
      tailorRates,
      assignedSubParts
    );

    const productName = cutting?.productName || fabric?.productName || 'Garment';

    const targetUserId =
      (currentUser?.role === 'Admin' ? currentUser?.id : null) ||
      currentUser?.user_id ||
      currentUser?.adminUserId ||
      cutting?.user_id ||
      cutting?.userId ||
      fabric?.user_id ||
      fabric?.userId ||
      master?.user_id ||
      master?.userId ||
      tailor?.user_id ||
      tailor?.userId;

    const validTargetUserId =
      targetUserId && !targetUserId.startsWith('mst_') && !targetUserId.startsWith('tlr_') && !targetUserId.startsWith('hlp_')
        ? targetUserId
        : ownerUserId;

    const newAssignment = {
      id: generateEntityId('asgn'),
      user_id: validTargetUserId,
      cuttingId: data.cuttingId || null,
      fabricId: cutting?.fabricId || data.fabricId || null,
      fabricName: cutting?.fabricName || data.fabricName || 'Fabric Lot',
      fabricColor: cutting?.fabricColor || data.fabricColor || '',
      productName,
      masterId: data.masterId || master?.id || cutting?.masterId || null,
      masterName: cutting?.masterName || master?.name || data.masterName || '',
      tailorRates,
      subPartRates: financials.subPartRates,
      ratePerPiece: financials.ratePerPiece,
      totalJobAmount: financials.totalJobAmount,
      pieceType: financials.pieceType,
      totalEarned: 0,
      allocationMode: data.allocationMode || 'by_machine',
      machineId: machine?.id || data.machineId || null,
      machineCode: machine?.code || data.machineCode || '',
      machineName: machine?.name || data.machineName || '',
      tailorId: tailor?.id || data.tailorId || null,
      tailorName: tailor ? tailor.name : (data.tailorName || 'Assigned Tailor'),
      tailorPhone: tailor?.phone || '',
      assignedSubParts,
      assignedPieces: fullAssignedPieces,
      allocatedParts: data.allocatedParts || Object.keys(fullAssignedPieces),
      totalAssignedPieces,
      completedQuantity: 0,
      dailySubmissions: [],
      assignDate: data.assignDate || new Date().toISOString().split('T')[0],
      dueDate: data.dueDate || '',
      tailorAccepted: false,
      acceptedAt: null,
      declinedAt: null,
      status: 'Pending Acceptance',
      notes: (data.notes || '').trim(),
      createdAt: new Date().toISOString(),
    };

    setTailorAssignments((prev) => [newAssignment, ...prev]);

    // Update in-memory cutting status
    if (cutting) {
      setCuttings((prev) =>
        prev.map((c) => {
          if (c.id === cutting.id) {
            const prevAssigned = tailorAssignments
              .filter((a) => a.cuttingId === cutting.id && a.status !== 'Declined')
              .reduce((acc, a) => acc + (parseInt(a.totalAssignedPieces, 10) || 0), 0);
            const newTotalAssigned = prevAssigned + totalAssignedPieces;
            const status = newTotalAssigned >= c.totalPieces ? 'Fully Assigned' : 'Partially Assigned';
            return { ...c, status };
          }
          return c;
        })
      );
    }

    // Attempt atomic stored procedure execution first; fallback to client sequence if offline/unavailable
    const activeSupabase = params.supabase || supabase;
    executeAtomicTailorAssignment(activeSupabase, newAssignment).then((rpcRes) => {
      if (rpcRes.rpcExecuted && rpcRes.success) {
        return;
      }
      saveToDb('tailor_assignments', mapAssignmentToDb, newAssignment);
      if (cutting) {
        const prevAssigned = tailorAssignments
          .filter((a) => a.cuttingId === cutting.id && a.status !== 'Declined')
          .reduce((acc, a) => acc + (parseInt(a.totalAssignedPieces, 10) || 0), 0);
        const newTotalAssigned = prevAssigned + totalAssignedPieces;
        const status = newTotalAssigned >= cutting.totalPieces ? 'Fully Assigned' : 'Partially Assigned';
        saveToDb('cuttings', mapCuttingToDb, { ...cutting, status });
      }
    }).catch(() => {
      saveToDb('tailor_assignments', mapAssignmentToDb, newAssignment);
    });

    return { success: true, assignment: newAssignment };
  };

  /**
   * Tailor accepts an assignment
   */
  const acceptTailorAssignment = (assignmentId) => {
    let updatedAssignment = null;
    setTailorAssignments((prev) =>
      prev.map((a) => {
        if (a.id === assignmentId) {
          const completed = parseInt(a.completedQuantity, 10) || 0;
          const total = parseInt(a.totalAssignedPieces, 10) || 0;
          const newStatus =
            completed >= total && total > 0
              ? 'Completed'
              : 'In Stitching';

          updatedAssignment = {
            ...a,
            tailorAccepted: true,
            acceptedAt: new Date().toISOString(),
            status: newStatus,
          };
          saveToDb('tailor_assignments', mapAssignmentToDb, updatedAssignment);
          return updatedAssignment;
        }
        return a;
      })
    );
    return { success: true, assignment: updatedAssignment };
  };

  /**
   * Tailor declines an assignment
   */
  const rejectTailorAssignment = (assignmentId, reason = '') => {
    let toReject = null;
    setTailorAssignments((prev) =>
      prev.map((a) => {
        if (a.id === assignmentId) {
          toReject = {
            ...a,
            tailorAccepted: false,
            status: 'Declined',
            rejectionReason: (reason || '').trim(),
            declinedAt: new Date().toISOString(),
          };
          saveToDb('tailor_assignments', mapAssignmentToDb, toReject);
          return toReject;
        }
        return a;
      })
    );

    if (toReject?.cuttingId) {
      setCuttings((prev) =>
        prev.map((c) => {
          if (c.id === toReject.cuttingId) {
            const activeAssigned = tailorAssignments
              .filter((a) => a.cuttingId === c.id && a.id !== assignmentId && a.status !== 'Declined')
              .reduce((acc, a) => acc + (parseInt(a.totalAssignedPieces, 10) || 0), 0);
            const status =
              activeAssigned >= c.totalPieces
                ? 'Fully Assigned'
                : activeAssigned > 0
                  ? 'Partially Assigned'
                  : 'Ready for Stitching';
            const updatedCutting = { ...c, status };
            saveToDb('cuttings', mapCuttingToDb, updatedCutting);
            return updatedCutting;
          }
          return c;
        })
      );
    }
    return { success: true };
  };

  /**
   * Archive or unarchive a tailor assignment
   */
  const toggleArchiveTailorAssignment = (assignmentId, explicitValue = null) => {
    setTailorAssignments((prev) =>
      prev.map((a) => {
        if (a.id === assignmentId) {
          const nextArchived = explicitValue !== null ? Boolean(explicitValue) : !a.isArchived;
          const updatedAssignment = {
            ...a,
            isArchived: nextArchived,
            archivedAt: nextArchived ? new Date().toISOString() : null,
            restoredAt: !nextArchived ? new Date().toISOString() : null,
            status: !nextArchived && (a.status === 'Completed' || a.status === 'Declined') ? 'In Stitching' : a.status,
          };
          saveToDb('tailor_assignments', mapAssignmentToDb, updatedAssignment);
          return updatedAssignment;
        }
        return a;
      })
    );
    return { success: true };
  };

  /**
   * Log daily tailor work submission (marked as Pending Approval)
   */
  const logDailyTailorSubmission = async (assignmentId, data) => {
    const hasAnySubParts = Boolean(
      data.subParts && typeof data.subParts === 'object' && Object.keys(data.subParts).length > 0
    );

    let qty = parseInt(data.quantity, 10) || 0;
    if (hasAnySubParts) {
      const subSum = Object.values(data.subParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
      if (subSum <= 0 && qty <= 0) {
        return { success: false, error: 'Completed pieces must be greater than 0.' };
      }
      if (qty <= 0) {
        qty = subSum;
      }
    } else if (qty <= 0) {
      return { success: false, error: 'Completed quantity must be greater than 0.' };
    }

    let dbSubmissions = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbRow } = await supabase
          .from('tailor_assignments')
          .select('daily_submissions')
          .eq('id', assignmentId)
          .maybeSingle();
        if (dbRow?.daily_submissions && Array.isArray(dbRow.daily_submissions)) {
          dbSubmissions = dbRow.daily_submissions;
        }
      } catch (err) {
        console.error('Failed to fetch latest submissions from Supabase:', err);
      }
    }

    let cachedSubmissions = null;
    try {
      const cached = localStorage.getItem('fm_sync_asgn_' + assignmentId);
      if (cached) {
        const parsed = JSON.parse(cached);
        const asgn = parsed.assignment || parsed;
        if (Array.isArray(asgn?.dailySubmissions)) {
          cachedSubmissions = asgn.dailySubmissions;
        }
      }
    } catch {}

    let updatedAssignment = null;
    let createdSubmission = null;

    const targetA = (tailorAssignments || []).find((a) => a.id === assignmentId);
    const cutting = (cuttings || []).find((c) => c.id === targetA?.cuttingId);
    const fabric = (fabrics || []).find((f) => f.id === (targetA?.fabricId || cutting?.fabricId));
    const effectiveRates = targetA?.tailorRates || cutting?.tailorRates || fabric?.tailorRates || {};

    let rate = parseFloat(targetA?.ratePerPiece) || 0;
    if (rate <= 0 && targetA) {
      const financials = calculateAssignmentFinancials(
        targetA.assignedPieces,
        effectiveRates,
        targetA.assignedSubParts
      );
      rate = financials.ratePerPiece;
    }

    let earned = 0;
    const tailorRates = effectiveRates;
    const subPartRates = targetA?.subPartRates || effectiveRates || {};

    let derivedParts = data.parts || null;
    if (hasAnySubParts) {
      let subEarned = 0;
      Object.entries(data.subParts).forEach(([partKey, countVal]) => {
        const cnt = parseInt(countVal, 10) || 0;
        const normKey = partKey.toLowerCase().trim();
        const pRate =
          parseFloat(subPartRates[partKey]) ||
          parseFloat(subPartRates[normKey]) ||
          parseFloat(tailorRates[partKey]) ||
          parseFloat(tailorRates[normKey]) ||
          rate;
        subEarned += cnt * pRate;
      });
      earned = Math.round(subEarned * 100) / 100;
    } else if (data.parts && typeof data.parts === 'object') {
      let partEarned = 0;
      Object.entries(data.parts).forEach(([partKey, countVal]) => {
        const cnt = parseInt(countVal, 10) || 0;
        const normKey = partKey.toLowerCase().trim();
        const pRate =
          parseFloat(tailorRates[partKey]) ||
          parseFloat(tailorRates[normKey]) ||
          rate;
        partEarned += cnt * pRate;
      });
      earned = Math.round(partEarned * 100) / 100;
    } else {
      earned = Math.round(qty * rate * 100) / 100;
    }

    let subPieceType = targetA?.pieceType || 'Garment Piece';
    if (hasAnySubParts) {
      const desc = [];
      Object.entries(data.subParts).forEach(([k, v]) => {
        const cnt = parseInt(v, 10) || 0;
        if (cnt > 0) {
          const cleanName = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          desc.push(`${cnt} ${formatPieceName(cleanName, cnt)}`);
        }
      });
      if (desc.length > 0) {
        subPieceType = desc.join(' + ');
      }
    }

    const pscQuantity = hasAnySubParts
      ? Object.values(data.subParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0)
      : (data.pscQuantity || qty);

    const effectiveSubRate = qty > 0 ? Math.round((earned / qty) * 100) / 100 : rate;

    const submissionId = generateEntityId('sub');
    const newSubmission = {
      id: submissionId,
      date: data.date || new Date().toISOString().split('T')[0],
      quantity: qty,
      pscQuantity,
      subParts: data.subParts || null,
      parts: derivedParts,
      pieceType: subPieceType,
      ratePerPiece: effectiveSubRate,
      earnedAmount: earned,
      approvalStatus: 'Pending Approval',
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      notes: (data.notes || '').trim(),
      createdAt: new Date().toISOString(),
    };
    createdSubmission = newSubmission;

    const baseA =
      (recentAssignmentUpdatesRef?.current?.get(assignmentId)) ||
      targetA ||
      tailorAssignments.find((a) => a.id === assignmentId);

    if (baseA) {
      const deletedIds = new Set(baseA.deletedSubmissionIds || []);
      const subsMap = new Map();
      (dbSubmissions || []).forEach((s) => {
        if (s && s.id && !deletedIds.has(s.id)) subsMap.set(s.id, s);
      });
      (cachedSubmissions || []).forEach((s) => {
        if (s && s.id && !deletedIds.has(s.id)) {
          if (subsMap.has(s.id)) {
            const cur = subsMap.get(s.id);
            if (cur.approvalStatus === 'Approved' || cur.approvalStatus === 'Rejected') return;
          }
          subsMap.set(s.id, { ...(subsMap.get(s.id) || {}), ...s });
        }
      });
      (baseA.dailySubmissions || []).forEach((localSub) => {
        if (!localSub || !localSub.id || deletedIds.has(localSub.id)) return;
        if (subsMap.has(localSub.id)) {
          const cur = subsMap.get(localSub.id);
          if (
            (cur.approvalStatus === 'Approved' || cur.approvalStatus === 'Rejected') &&
            (localSub.approvalStatus === 'Pending' || localSub.approvalStatus === 'Pending Approval')
          ) {
            return;
          }
        }
        subsMap.set(localSub.id, { ...(subsMap.get(localSub.id) || {}), ...localSub });
      });

      const existingSubs = Array.from(subsMap.values()).filter((s) => s.id !== newSubmission.id);
      const updatedSubmissions = [newSubmission, ...existingSubs].sort(
        (x, y) => new Date(y.createdAt || y.date) - new Date(x.createdAt || x.date)
      );

      const newCompleted = updatedSubmissions
        .filter((s) => s.approvalStatus === 'Approved')
        .reduce((acc, s) => acc + (parseInt(s.quantity, 10) || 0), 0);
      const newTotalEarned = updatedSubmissions
        .filter((s) => s.approvalStatus === 'Approved')
        .reduce(
          (acc, s) => acc + (parseFloat(s.earnedAmount) || (parseInt(s.quantity, 10) || 0) * rate),
          0
        );
      const totalAssigned = (baseA.assignedSubParts && typeof baseA.assignedSubParts === 'object' && Object.keys(baseA.assignedSubParts).length > 0)
        ? Object.values(baseA.assignedSubParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0)
        : (parseInt(baseA.totalAssignedPieces, 10) || 0);

      let newStatus = baseA.status;
      if (newCompleted >= totalAssigned && totalAssigned > 0) {
        newStatus = 'Completed';
      } else {
        newStatus = 'In Stitching';
      }

      const isArchived = Boolean(baseA.isArchived);

      updatedAssignment = {
        ...baseA,
        tailorAccepted: true,
        acceptedAt: baseA.acceptedAt || new Date().toISOString(),
        ratePerPiece: rate,
        completedQuantity: newCompleted,
        totalEarned: newTotalEarned,
        dailySubmissions: updatedSubmissions,
        status: newStatus,
        isArchived,
        archivedAt: baseA.archivedAt || (isArchived ? new Date().toISOString() : null),
      };

      if (recentAssignmentUpdatesRef?.current) {
        recentAssignmentUpdatesRef.current.set(assignmentId, updatedAssignment);
      }

      setTailorAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? updatedAssignment : a))
      );

      saveToDb('tailor_assignments', mapAssignmentToDb, updatedAssignment);
      broadcastAssignmentUpdate(updatedAssignment);

      if (isSupabaseConfigured && supabase) {
        const itemUserId = updatedAssignment.user_id || updatedAssignment.userId;
        const validItemUserId =
          itemUserId && !itemUserId.startsWith('mst_') && !itemUserId.startsWith('tlr_') && !itemUserId.startsWith('hlp_')
            ? itemUserId
            : null;
        const fabricItem = fabrics.find((f) => f.id === (updatedAssignment.fabricId || updatedAssignment.fabric_id));
        const fabricUserId = fabricItem?.user_id || fabricItem?.userId;
        const validFabricUserId =
          fabricUserId && !fabricUserId.startsWith('mst_') && !fabricUserId.startsWith('tlr_') && !fabricUserId.startsWith('hlp_')
            ? fabricUserId
            : null;
        const effectiveUserId = validItemUserId || validFabricUserId || ownerUserId;
        const dbObj = mapAssignmentToDb(updatedAssignment, effectiveUserId);
        supabase.from('tailor_assignments').upsert([dbObj]).then(({ error }) => {
          if (error) console.error('Supabase direct upsert error on submit work:', error);
        });
      }
    }

    return { success: true, submission: createdSubmission, assignment: updatedAssignment };
  };

  const computeApprovedDailyTailorSubmission = (a, submissionId, approvedBy = 'Cutting Master') => {
    if (!a) return null;
    const targetIds = Array.isArray(submissionId) ? new Set(submissionId) : new Set([submissionId]);
    let matchCount = 0;
    const updatedSubmissions = (a.dailySubmissions || []).map((s) => {
      if (targetIds.has(s.id)) {
        matchCount++;
        return {
          ...s,
          approvalStatus: 'Approved',
          approvedBy: approvedBy || 'Cutting Master',
          approvedAt: new Date().toISOString(),
          rejectionReason: null,
        };
      }
      return s;
    });

    if (matchCount === 0) {
      console.warn(`[computeApprovedDailyTailorSubmission] No matching submissions found in ${a.id}`);
      return null;
    }

    const rate = parseFloat(a.ratePerPiece) || 0;
    const newCompleted = updatedSubmissions
      .filter((s) => s.approvalStatus === 'Approved')
      .reduce((acc, s) => acc + (parseInt(s.quantity, 10) || 0), 0);
    const newTotalEarned = updatedSubmissions
      .filter((s) => s.approvalStatus === 'Approved')
      .reduce(
        (acc, s) => acc + (parseFloat(s.earnedAmount) || (parseInt(s.quantity, 10) || 0) * rate),
        0
      );
    const totalAssigned = (a.assignedSubParts && typeof a.assignedSubParts === 'object' && Object.keys(a.assignedSubParts).length > 0)
      ? Object.values(a.assignedSubParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0)
      : (parseInt(a.totalAssignedPieces, 10) || 0);

    let newStatus = a.status;
    if (newCompleted >= totalAssigned && totalAssigned > 0) {
      newStatus = 'Completed';
    } else {
      newStatus = 'In Stitching';
    }

    const isArchived = Boolean(a.isArchived);

    return {
      ...a,
      tailorAccepted: true,
      deletedSubmissionIds: a.deletedSubmissionIds || [],
      completedQuantity: newCompleted,
      totalEarned: newTotalEarned,
      dailySubmissions: updatedSubmissions,
      status: newStatus,
      isArchived,
      archivedAt: a.archivedAt || (isArchived ? new Date().toISOString() : null),
    };
  };

  const computeRejectedDailyTailorSubmission = (a, submissionId, reason = '') => {
    if (!a) return null;
    let matchCount = 0;
    const updatedSubmissions = (a.dailySubmissions || []).map((s) => {
      if (s.id === submissionId) {
        matchCount++;
        return {
          ...s,
          approvalStatus: 'Rejected',
          rejectionReason: (reason || 'Piece count mismatch').trim(),
          rejectedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    if (matchCount === 0) {
      console.warn(`[computeRejectedDailyTailorSubmission] submission ${submissionId} not found in ${a.id}`);
      return null;
    }

    const rate = parseFloat(a.ratePerPiece) || 0;
    const newCompleted = updatedSubmissions
      .filter((s) => s.approvalStatus === 'Approved')
      .reduce((acc, s) => acc + (parseInt(s.quantity, 10) || 0), 0);
    const newTotalEarned = updatedSubmissions
      .filter((s) => s.approvalStatus === 'Approved')
      .reduce(
        (acc, s) => acc + (parseFloat(s.earnedAmount) || (parseInt(s.quantity, 10) || 0) * rate),
        0
      );
    const totalAssigned = (a.assignedSubParts && typeof a.assignedSubParts === 'object' && Object.keys(a.assignedSubParts).length > 0)
      ? Object.values(a.assignedSubParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0)
      : (parseInt(a.totalAssignedPieces, 10) || 0);

    const hasSubs = updatedSubmissions.length > 0;
    let newStatus = 'In Stitching';
    if (newCompleted >= totalAssigned && totalAssigned > 0) {
      newStatus = 'Completed';
    } else if (newCompleted === 0 && !hasSubs && !a.tailorAccepted) {
      newStatus = 'Pending Acceptance';
    } else {
      newStatus = 'In Stitching';
    }

    const wasArchived = Boolean(a.isArchived);

    return {
      ...a,
      tailorAccepted: Boolean(a.tailorAccepted || hasSubs || newCompleted > 0),
      deletedSubmissionIds: a.deletedSubmissionIds || [],
      completedQuantity: newCompleted,
      totalEarned: newTotalEarned,
      dailySubmissions: updatedSubmissions,
      status: wasArchived && a.status === 'Completed' ? 'Completed' : newStatus,
      isArchived: wasArchived,
      archivedAt: a.archivedAt || (wasArchived ? new Date().toISOString() : null),
    };
  };

  const computeDeletedDailyTailorSubmission = (a, submissionId) => {
    if (!a) return null;
    const exists = (a.dailySubmissions || []).some((s) => s.id === submissionId);
    if (!exists) {
      console.warn(`[computeDeletedDailyTailorSubmission] submission ${submissionId} not found in ${a.id}`);
      return null;
    }
    const updatedSubmissions = (a.dailySubmissions || []).filter((s) => s.id !== submissionId);
    const deletedSubmissionIds = Array.from(new Set([...(a.deletedSubmissionIds || []), submissionId]));
    const rate = parseFloat(a.ratePerPiece) || 0;
    const newCompleted = updatedSubmissions
      .filter((s) => s.approvalStatus === 'Approved')
      .reduce((acc, s) => acc + (parseInt(s.quantity, 10) || 0), 0);
    const newTotalEarned = updatedSubmissions
      .filter((s) => s.approvalStatus === 'Approved')
      .reduce(
        (acc, s) => acc + (parseFloat(s.earnedAmount) || (parseInt(s.quantity, 10) || 0) * rate),
        0
      );
    const totalAssigned = (a.assignedSubParts && typeof a.assignedSubParts === 'object' && Object.keys(a.assignedSubParts).length > 0)
      ? Object.values(a.assignedSubParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0)
      : (parseInt(a.totalAssignedPieces, 10) || 0);

    const hasSubs = updatedSubmissions.length > 0;
    let newStatus = (a.tailorAccepted || hasSubs) ? 'In Stitching' : 'Pending Acceptance';
    if (newCompleted >= totalAssigned && totalAssigned > 0) {
      newStatus = 'Completed';
    } else if (newCompleted > 0 || hasSubs || a.tailorAccepted) {
      newStatus = 'In Stitching';
    }

    const wasArchived = Boolean(a.isArchived);

    return {
      ...a,
      tailorAccepted: Boolean(a.tailorAccepted || hasSubs || newCompleted > 0),
      deletedSubmissionIds,
      completedQuantity: newCompleted,
      totalEarned: newTotalEarned,
      dailySubmissions: updatedSubmissions,
      status: wasArchived && a.status === 'Completed' ? 'Completed' : newStatus,
      isArchived: wasArchived,
      archivedAt: a.archivedAt || (wasArchived ? new Date().toISOString() : null),
    };
  };

  /**
   * Helper to safely resolve the latest target assignment across local React state,
   * recent updates cache, and database.
   */
  const resolveTargetAssignment = async (assignmentId) => {
    const list = tailorAssignmentsRef?.current || tailorAssignments || [];
    const localA = list.find((a) => a.id === assignmentId);
    const cachedA = recentAssignmentUpdatesRef?.current?.get(assignmentId);
    let baseA = mergeAssignmentSafely(localA, cachedA);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbRow } = await supabase
          .from('tailor_assignments')
          .select('*')
          .eq('id', assignmentId)
          .maybeSingle();
        if (dbRow) {
          const cutPieces = dbRow.assigned_cut_pieces || dbRow.assigned_pieces;
          const rawGarmentPcs = dbRow.assigned_garment_pcs || dbRow.assigned_sub_parts || {};
          const meta = (rawGarmentPcs && typeof rawGarmentPcs === 'object' && rawGarmentPcs._meta) ? rawGarmentPcs._meta : {};
          const garmentPcs = (rawGarmentPcs && typeof rawGarmentPcs === 'object') ? { ...rawGarmentPcs } : {};
          delete garmentPcs._meta;
          const normalized = {
            id: dbRow.id,
            userId: dbRow.user_id,
            user_id: dbRow.user_id,
            fabricId: dbRow.fabric_id,
            fabricName: dbRow.fabric_name,
            cuttingId: dbRow.cutting_id,
            masterId: dbRow.master_id || meta.masterId || null,
            masterName: dbRow.master_name,
            tailorId: dbRow.tailor_id,
            tailorName: dbRow.tailor_name,
            machineId: dbRow.machine_id || meta.machineId || null,
            machineCode: dbRow.machine_code || meta.machineCode || '',
            machineName: dbRow.machine_name || meta.machineName || '',
            allocationMode: dbRow.allocation_mode || meta.allocationMode || 'by_machine',
            assignedCutPieces: cutPieces,
            assignedGarmentPcs: garmentPcs,
            assignedPieces: cutPieces,
            assignedSubParts: garmentPcs,
            totalAssignedPieces: dbRow.total_assigned_pieces,
            ratePerPiece: dbRow.rate_per_piece,
            totalJobAmount: dbRow.total_job_amount,
            tailorRates: dbRow.tailor_rates || meta.tailorRates || null,
            subPartRates: dbRow.sub_part_rates || meta.subPartRates || null,
            productStructure: dbRow.product_structure,
            pieceType: dbRow.piece_type,
            completedQuantity: dbRow.completed_quantity,
            totalEarned: dbRow.total_earned,
            dailySubmissions: dbRow.daily_submissions || [],
            tailorAccepted: dbRow.tailor_accepted,
            acceptedAt: dbRow.accepted_at,
            notes: dbRow.notes || meta.notes || null,
            status: dbRow.status,
            isArchived: dbRow.is_archived,
            createdAt: dbRow.created_at,
            updatedAt: dbRow.updated_at,
          };
          const normalizedWithRates = normalizeTailorAssignment(normalized, fabrics, cuttings);
          baseA = mergeAssignmentSafely(baseA, normalizedWithRates);
        }
      } catch (err) {
        console.warn('Failed to fetch assignment from Supabase in resolveTargetAssignment:', err);
      }
    }

    return baseA;
  };

  /**
   * Helper to commit and broadcast assignment changes
   */
  const commitAssignmentChange = (updatedAssignment) => {
    if (!updatedAssignment || !updatedAssignment.id) return;
    const assignmentId = updatedAssignment.id;

    if (recentAssignmentUpdatesRef?.current) {
      recentAssignmentUpdatesRef.current.set(assignmentId, updatedAssignment);
    }

    setTailorAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? updatedAssignment : a))
    );

    saveToDb('tailor_assignments', mapAssignmentToDb, updatedAssignment);
    broadcastAssignmentUpdate(updatedAssignment);

    if (isSupabaseConfigured && supabase) {
      const itemUserId = updatedAssignment.user_id || updatedAssignment.userId;
      const validItemUserId =
        itemUserId && !itemUserId.startsWith('mst_') && !itemUserId.startsWith('tlr_') && !itemUserId.startsWith('hlp_')
          ? itemUserId
          : null;
      const fabricItem = fabrics.find((f) => f.id === (updatedAssignment.fabricId || updatedAssignment.fabric_id));
      const fabricUserId = fabricItem?.user_id || fabricItem?.userId;
      const validFabricUserId =
        fabricUserId && !fabricUserId.startsWith('mst_') && !fabricUserId.startsWith('tlr_') && !fabricUserId.startsWith('hlp_')
          ? fabricUserId
          : null;
      const effectiveUserId = validItemUserId || validFabricUserId || ownerUserId;
      const dbObj = mapAssignmentToDb(updatedAssignment, effectiveUserId);
      supabase
        .from('tailor_assignments')
        .upsert([dbObj])
        .then(({ error }) => {
          if (error) console.error('Supabase direct upsert error on assignment change:', error);
        });
    }

    if (updatedAssignment.cuttingId) {
      const targetCutting = cuttings.find((c) => c.id === updatedAssignment.cuttingId);
      if (targetCutting?.fabricId) {
        setFabrics((prev) =>
          prev.map((f) =>
            f.id === targetCutting.fabricId && (f.status === 'In Stock' || f.status === 'In Cutting')
              ? { ...f, status: 'In Stitching' }
              : f
          )
        );
      }
    }
  };

  /**
   * Cutting Master approves daily tailor work submission
   */
  const approveDailyTailorSubmission = async (assignmentId, submissionId, approvedBy = 'Cutting Master') => {
    const baseA = await resolveTargetAssignment(assignmentId);
    if (!baseA) {
      console.error(`Assignment ${assignmentId} not found`);
      return { success: false, error: 'Assignment not found' };
    }

    const updatedAssignment = computeApprovedDailyTailorSubmission(baseA, submissionId, approvedBy);
    if (updatedAssignment) {
      commitAssignmentChange(updatedAssignment);
      return { success: true, assignment: updatedAssignment };
    }

    return { success: false, error: 'Submission not found or already processed' };
  };

  /**
   * Cutting Master approves multiple daily tailor work submissions in a single atomic pass
   */
  const approveAllDailyTailorSubmissions = async (submissionsList, approvedBy = 'Cutting Master') => {
    if (!submissionsList || submissionsList.length === 0) return { success: true, count: 0 };

    const byAssignment = new Map();
    submissionsList.forEach((sub) => {
      if (!sub?.assignmentId || !sub?.id) return;
      if (!byAssignment.has(sub.assignmentId)) {
        byAssignment.set(sub.assignmentId, []);
      }
      byAssignment.get(sub.assignmentId).push(sub.id);
    });

    const updatedAssignments = [];
    for (const [assignmentId, subIds] of byAssignment.entries()) {
      const baseA = await resolveTargetAssignment(assignmentId);
      if (!baseA) continue;

      const updatedAssignment = computeApprovedDailyTailorSubmission(baseA, subIds, approvedBy);
      if (updatedAssignment) {
        commitAssignmentChange(updatedAssignment);
        updatedAssignments.push(updatedAssignment);
      }
    }

    return { success: true, count: updatedAssignments.length };
  };

  /**
   * Cutting Master rejects daily tailor work submission
   */
  const rejectDailyTailorSubmission = async (assignmentId, submissionId, reason = '') => {
    const baseA = await resolveTargetAssignment(assignmentId);
    if (!baseA) {
      return { success: false, error: 'Assignment not found' };
    }

    const updatedAssignment = computeRejectedDailyTailorSubmission(baseA, submissionId, reason);
    if (updatedAssignment) {
      commitAssignmentChange(updatedAssignment);
      return { success: true, assignment: updatedAssignment };
    }

    return { success: false, error: 'Submission not found' };
  };

  /**
   * Delete daily tailor work submission
   */
  const deleteDailyTailorSubmission = async (assignmentId, submissionId) => {
    const baseA = await resolveTargetAssignment(assignmentId);
    if (!baseA) {
      return { success: false, error: 'Assignment not found' };
    }

    const updatedAssignment = computeDeletedDailyTailorSubmission(baseA, submissionId);
    if (updatedAssignment) {
      commitAssignmentChange(updatedAssignment);
      return { success: true, assignment: updatedAssignment };
    }

    return { success: false, error: 'Submission not found' };
  };

  const updateAssignmentStatus = (id, newStatus) => {
    setTailorAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
    return { success: true };
  };

  const deleteAssignment = (id) => {
    const toDelete = tailorAssignments.find((a) => a.id === id);
    setTailorAssignments((prev) => prev.filter((a) => a.id !== id));

    if (toDelete?.cuttingId) {
      setCuttings((prev) =>
        prev.map((c) => {
          if (c.id === toDelete.cuttingId) {
            const remainingAssignments = tailorAssignments.filter(
              (a) => a.cuttingId === c.id && a.id !== id
            );
            if (remainingAssignments.length === 0) {
              return { ...c, status: 'Ready for Stitching' };
            }
            const totalAssigned = remainingAssignments.reduce(
              (acc, a) => acc + (parseInt(a.totalAssignedPieces, 10) || 0),
              0
            );
            return {
              ...c,
              status: totalAssigned >= c.totalPieces ? 'Fully Assigned' : 'Partially Assigned',
            };
          }
          return c;
        })
      );
    }
    return { success: true };
  };

  /**
   * MASTER HANDOVER / PIECE SUBMISSION TO ADMIN MANAGEMENT
   */

  return {
    addTailorAssignment,
    acceptTailorAssignment,
    rejectTailorAssignment,
    toggleArchiveTailorAssignment,
    updateAssignmentStatus,
    deleteAssignment,
    logDailyTailorSubmission,
    approveDailyTailorSubmission,
    approveAllDailyTailorSubmissions,
    rejectDailyTailorSubmission,
    deleteDailyTailorSubmission,
  };
}
