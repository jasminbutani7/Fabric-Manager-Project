import {
  cleanNoteString,
  mapThreadAssignmentToDb,
  mapFabricToDb,
} from '../../../services/dbMappers';
import {
  formatPieceName,
  resolvePieceLabel,
  getFabricSubPartSkippedPieces,
  getMasterVerifiedTrimmedPiecesForSubPart,
  getMasterVerifiedSkippedPiecesForSubPart,
} from '../../../utils/productUtils';
import { generateEntityId } from '../../../utils/idGenerator';

export function useThreadCuttingOps(params) {
  const {
    masterHandovers,
    threadCuttingAssignments,
    setThreadCuttingAssignments,
    fabrics,
    setFabrics,
    cuttings,
    helpers,
    saveToDb,
    dbRemove,
    ownerUserId,
    currentUser,
  } = params;
  // ==================== THREAD CUTTING OPERATIONS ====================
  const assignThreadCutting = (data) => {
    const isSkip =
      data.status === 'Skipped' ||
      data.actionType === 'skip' ||
      data.action_type === 'skip' ||
      data.helperType === 'skip';

    const trimmedHelperId = data.helperId ? String(data.helperId).trim() : '';
    const pscToAssign = parseInt(data.assignedPSC, 10);

    if (!data.cuttingId && !data.fabricId) {
      return { success: false, error: 'Cutting batch or fabric lot is required.' };
    }
    if (!isSkip && !trimmedHelperId) {
      return { success: false, error: 'Please select a helper for thread cutting.' };
    }
    if (!pscToAssign || pscToAssign <= 0) {
      return { success: false, error: 'Please enter a valid number of PSC to assign.' };
    }

    const helper = !isSkip && trimmedHelperId ? helpers.find((h) => String(h.id) === String(trimmedHelperId)) : null;
    const helperType = isSkip
      ? 'skip'
      : data.helperType ||
        (helper?.helperCategory === 'external' || helper?.wageType === 'Piece Rate'
          ? 'external'
          : 'internal');

    const ratePerPSC = !isSkip && helperType === 'external'
      ? parseFloat(data.ratePerPSC !== undefined ? data.ratePerPSC : (helper?.defaultRatePerPiece || helper?.defaultRatePerPSC)) || 0
      : 0;

    const isFabricLotAssign = Boolean(
      data.isFabricLot ||
      (!data.cuttingId && data.fabricId) ||
      (data.cuttingId && (data.cuttingId === data.fabricId || data.cuttingId.startsWith('fab_')))
    );

    const targetFabricId = data.fabricId || (data.cuttingId?.startsWith('fab_') ? data.cuttingId : '');
    const linkedFabric = fabrics.find((f) => f.id === targetFabricId);
    const fabricName = data.fabricName || linkedFabric?.productName || linkedFabric?.fabricType || 'Fabric Lot';

    if (isFabricLotAssign && targetFabricId) {
      const fabricCuttings = cuttings.filter(
        (c) => (c.fabricId || c.fabric_id) === targetFabricId
      );

      let remainingToAssign = pscToAssign;
      const createdAssignments = [];

      for (const cutting of fabricCuttings) {
        if (remainingToAssign <= 0) break;
        const cStats = getThreadCuttingStats(cutting.id, data.subPart);
        const availableInCut = data.subPart && cStats.subPartStats[data.subPart]
          ? cStats.subPartStats[data.subPart].available
          : cStats.availableToAssignPSC;

        if (availableInCut > 0) {
          const allocQty = Math.min(remainingToAssign, availableInCut);
          const allocAmount = Math.round(allocQty * ratePerPSC * 100) / 100;
          const allocStatus = isSkip ? 'Skipped' : (data.status || 'In Progress');
          const allocActionType = isSkip ? 'skip' : (data.actionType || 'assign');
          const allocCompleted = isSkip ? allocQty : (parseInt(data.completedPSC, 10) || 0);

          const assignment = {
            id: generateEntityId('tc'),
            cuttingId: cutting.id,
            fabricId: targetFabricId,
            fabricName,
            handoverId: data.handoverId || null,
            subPart: data.subPart ? data.subPart.toLowerCase().trim() : null,
            subPartName: data.subPartName || (data.subPart ? data.subPart.toUpperCase() : null),
            helperId: isSkip ? null : (trimmedHelperId || null),
            helperName: isSkip ? (data.helperName || 'Direct Handover (Skipped Trimming)') : (data.helperName || helper?.name || 'Helper'),
            helperPhone: isSkip ? '' : (data.helperPhone || helper?.phone || ''),
            helperType,
            actionType: allocActionType,
            assignedPSC: allocQty,
            assignedPieces: allocQty,
            ratePerPSC,
            ratePerPiece: ratePerPSC,
            totalEstimatedAmount: allocAmount,
            totalEarned: allocAmount,
            completedPSC: allocCompleted,
            completedPieces: allocCompleted,
            status: allocStatus,
            assignedDate: data.assignedDate || new Date().toISOString().split('T')[0],
            completionDate: isSkip ? (data.assignedDate || new Date().toISOString().split('T')[0]) : null,
            masterId: data.masterId || null,
            masterName: data.masterName || null,
            createdByRole: data.createdByRole || (data.masterId ? 'master' : 'admin'),
            notes: data.notes?.trim() || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          createdAssignments.push(assignment);
          remainingToAssign -= allocQty;
        }
      }

      if (remainingToAssign > 0) {
        const fallbackCuttingId = fabricCuttings[0]?.id || data.cuttingId || null;
        const allocAmount = Math.round(remainingToAssign * ratePerPSC * 100) / 100;
        const allocStatus = isSkip ? 'Skipped' : (data.status || 'In Progress');
        const allocActionType = isSkip ? 'skip' : (data.actionType || 'assign');
        const allocCompleted = isSkip ? remainingToAssign : (parseInt(data.completedPSC, 10) || 0);

        const assignment = {
          id: generateEntityId('tc'),
          cuttingId: fallbackCuttingId,
          fabricId: targetFabricId,
          fabricName,
          handoverId: data.handoverId || null,
          subPart: data.subPart ? data.subPart.toLowerCase().trim() : null,
          subPartName: data.subPartName || (data.subPart ? data.subPart.toUpperCase() : null),
          helperId: isSkip ? null : (trimmedHelperId || null),
          helperName: isSkip ? (data.helperName || 'Direct Handover (Skipped Trimming)') : (data.helperName || helper?.name || 'Helper'),
          helperPhone: isSkip ? '' : (data.helperPhone || helper?.phone || ''),
          helperType,
          actionType: allocActionType,
          assignedPSC: remainingToAssign,
          assignedPieces: remainingToAssign,
          ratePerPSC,
          ratePerPiece: ratePerPSC,
          totalEstimatedAmount: allocAmount,
          totalEarned: allocAmount,
          completedPSC: allocCompleted,
          completedPieces: allocCompleted,
          status: allocStatus,
          assignedDate: data.assignedDate || new Date().toISOString().split('T')[0],
          completionDate: isSkip ? (data.assignedDate || new Date().toISOString().split('T')[0]) : null,
          masterId: data.masterId || null,
          masterName: data.masterName || null,
          createdByRole: data.createdByRole || (data.masterId ? 'master' : 'admin'),
          notes: data.notes?.trim() || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        createdAssignments.push(assignment);
      }

      setThreadCuttingAssignments((prev) => [...createdAssignments, ...prev]);
      createdAssignments.forEach((a) => {
        saveToDb('thread_cutting_assignments', mapThreadAssignmentToDb, a);
      });

      return { success: true, assignment: createdAssignments[0], assignments: createdAssignments };
    }

    const cutting = cuttings.find((c) => c.id === data.cuttingId);
    const totalEstimatedAmount = Math.round(pscToAssign * ratePerPSC * 100) / 100;
    const allocStatus = isSkip ? 'Skipped' : (data.status || 'In Progress');
    const allocActionType = isSkip ? 'skip' : (data.actionType || 'assign');
    const allocCompleted = isSkip ? pscToAssign : (parseInt(data.completedPSC, 10) || 0);

    const newAssignment = {
      id: generateEntityId('tc'),
      cuttingId: data.cuttingId,
      fabricId: data.fabricId || cutting?.fabricId || '',
      fabricName: data.fabricName || cutting?.fabricName || 'Fabric Batch',
      handoverId: data.handoverId || null,
      subPart: data.subPart ? data.subPart.toLowerCase().trim() : null,
      subPartName: data.subPartName || (data.subPart ? data.subPart.toUpperCase() : null),
      helperId: isSkip ? null : (trimmedHelperId || null),
      helperName: isSkip ? (data.helperName || 'Direct Handover (Skipped Trimming)') : (data.helperName || helper?.name || 'Helper'),
      helperPhone: isSkip ? '' : (data.helperPhone || helper?.phone || ''),
      helperType,
      actionType: allocActionType,
      assignedPSC: pscToAssign,
      assignedPieces: pscToAssign,
      ratePerPSC,
      ratePerPiece: ratePerPSC,
      totalEstimatedAmount,
      totalEarned: totalEstimatedAmount,
      completedPSC: allocCompleted,
      completedPieces: allocCompleted,
      status: allocStatus,
      assignedDate: data.assignedDate || new Date().toISOString().split('T')[0],
      completionDate: isSkip ? (data.assignedDate || new Date().toISOString().split('T')[0]) : null,
      masterId: data.masterId || null,
      masterName: data.masterName || null,
      createdByRole: data.createdByRole || (data.masterId ? 'master' : 'admin'),
      notes: data.notes?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setThreadCuttingAssignments((prev) => [newAssignment, ...prev]);
    saveToDb('thread_cutting_assignments', mapThreadAssignmentToDb, newAssignment);

    return { success: true, assignment: newAssignment };
  };

  const setFabricThreadCuttingDecision = (
    fabricId,
    decision = 'skipped',
    subPartKey = null,
    pcsCount = null,
    accumulate = false,
    explicitDelta = null
  ) => {
    if (!fabricId) return;
    if (decision !== 'skipped' && decision !== null && typeof decision !== 'object') {
      return;
    }

    const targetFabric = fabrics.find((f) => f.id === fabricId);
    const linkedCutting = cuttings.find(
      (c) => (c.fabricId || c.fabric_id) === fabricId
    );

    let struct =
      targetFabric?.productStructure ||
      targetFabric?.product_structure ||
      linkedCutting?.productStructure;
    if (typeof struct === 'string') {
      try {
        struct = JSON.parse(struct);
      } catch {}
    }
    const configuredSubParts =
      Array.isArray(struct?.subParts) && struct.subParts.length > 0
        ? struct.subParts
        : Array.isArray(struct?.parts) && struct.parts.length > 0
        ? struct.parts
        : [];

    const isSkipJob = (tc) =>
      tc.status === 'Skipped' ||
      tc.actionType === 'skip' ||
      tc.action_type === 'skip';

    // Collect all subparts to update: Array<{ key, name, num, delta, isReset, isAccum }>
    const updates = [];

    if (subPartKey) {
      const cleanK = subPartKey.toLowerCase().trim();
      const spObj = configuredSubParts.find(
        (sp) => (sp.id || sp.name || '').toLowerCase().trim() === cleanK
      );
      const spName =
        spObj?.name ||
        (typeof resolvePieceLabel === 'function'
          ? resolvePieceLabel(cleanK, struct)
          : cleanK.toUpperCase());

      const isReset = decision === null || pcsCount === 0;
      const num = pcsCount !== null && pcsCount !== undefined ? Math.max(0, parseInt(pcsCount, 10) || 0) : null;

      updates.push({
        key: cleanK,
        name: spName,
        num,
        explicitDelta,
        isReset,
        isAccum: Boolean(accumulate),
      });
    } else if (decision && typeof decision === 'object') {
      const isAccum = Boolean(decision.accumulate || accumulate);
      if (decision.subPartSkippedPieces) {
        Object.entries(decision.subPartSkippedPieces).forEach(([k, v]) => {
          const cleanK = k.toLowerCase().trim();
          const spObj = configuredSubParts.find(
            (sp) => (sp.id || sp.name || '').toLowerCase().trim() === cleanK
          );
          const spName =
            spObj?.name ||
            (typeof resolvePieceLabel === 'function'
              ? resolvePieceLabel(cleanK, struct)
              : cleanK.toUpperCase());
          const num = Math.max(0, parseInt(v, 10) || 0);
          updates.push({
            key: cleanK,
            name: spName,
            num,
            explicitDelta: null,
            isReset: num === 0,
            isAccum,
          });
        });
      }
    } else if (typeof decision === 'string' && !subPartKey) {
      // Lot-wide decision string
      if (configuredSubParts.length > 0) {
        configuredSubParts.forEach((sp) => {
          const cleanK = (sp.id || sp.name).toLowerCase().trim();
          const spName = sp.name || cleanK.toUpperCase();
          updates.push({
            key: cleanK,
            name: spName,
            num: null, // will derive from verified count if skipping
            explicitDelta: null,
            isReset: decision === null,
            isAccum: false,
          });
        });
      } else {
        const cleanK = (
          targetFabric?.productName ||
          targetFabric?.fabricType ||
          'piece'
        )
          .toLowerCase()
          .trim();
        updates.push({
          key: cleanK,
          name: targetFabric?.productName || 'Garment Piece',
          num: null,
          explicitDelta: null,
          isReset: decision === null,
          isAccum: false,
        });
      }
    }

    if (updates.length === 0) return;

    let currentAssignments = [...threadCuttingAssignments];
    const skipsToDelete = [];
    const newSkipsToCreate = [];

    updates.forEach((u) => {
      if (u.isReset) {
        const toDelete = currentAssignments.filter(
          (tc) =>
            (tc.fabricId === fabricId || tc.fabric_id === fabricId) &&
            ((tc.subPart || tc.sub_part || '').toLowerCase().trim() === u.key) &&
            isSkipJob(tc)
        );
        skipsToDelete.push(...toDelete);
        currentAssignments = currentAssignments.filter(
          (tc) => !toDelete.some((st) => st.id === tc.id)
        );
        return;
      }

      // Calculate the exact quantity skipped in THIS individual action
      let piecesForThisAction = 0;
      if (u.explicitDelta !== null && u.explicitDelta !== undefined) {
        piecesForThisAction = Math.max(0, parseInt(u.explicitDelta, 10) || 0);
      } else if (u.isAccum) {
        piecesForThisAction = Math.max(0, parseInt(u.num, 10) || 0);
      } else {
        const priorSkippedTotal = currentAssignments
          .filter(
            (tc) =>
              (tc.fabricId === fabricId || tc.fabric_id === fabricId) &&
              ((tc.subPart || tc.sub_part || '').toLowerCase().trim() === u.key) &&
              isSkipJob(tc)
          )
          .reduce((sum, tc) => sum + (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0), 0);

        if (u.num !== null) {
          piecesForThisAction = Math.max(0, u.num - priorSkippedTotal);
        } else {
          const verifiedForPart = masterHandovers
            .filter(
              (h) =>
                ((h.fabricId && h.fabricId === fabricId) ||
                  (h.cuttingId && linkedCutting && h.cuttingId === linkedCutting.id)) &&
                h.status === 'Verified'
            )
            .reduce((sum, h) => {
              if (h.subParts && typeof h.subParts === 'object') {
                return sum + (parseInt(h.subParts[u.key], 10) || 0);
              }
              return sum + (parseInt(h.piecesCount || h.pieces, 10) || 0);
            }, 0);
          piecesForThisAction = Math.max(0, verifiedForPart - priorSkippedTotal);
        }
      }

      if (piecesForThisAction <= 0) return;

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-CA');

      // Always create a separate entry for each skip process
      const newSkip = {
        id: generateEntityId('tc_skip'),
        user_id:
          targetFabric?.user_id ||
          targetFabric?.userId ||
          currentUser?.id ||
          ownerUserId ||
          null,
        fabricId,
        fabric_id: fabricId,
        cuttingId: linkedCutting?.id || null,
        cutting_id: linkedCutting?.id || null,
        fabricName:
          targetFabric?.productName ||
          targetFabric?.fabricType ||
          'Fabric Lot',
        helperId: null,
        helperName: 'Direct Delivery (Skipped)',
        helperType: 'skip',
        subPart: u.key,
        sub_part: u.key,
        subPartName: u.name,
        sub_part_name: u.name,
        actionType: 'skip',
        action_type: 'skip',
        status: 'Skipped',
        assignedPieces: piecesForThisAction,
        assignedPSC: piecesForThisAction,
        completedPieces: piecesForThisAction,
        completedPSC: piecesForThisAction,
        ratePerPiece: 0,
        ratePerPSC: 0,
        totalEstimatedAmount: 0,
        totalEarned: 0,
        assignedDate: dateStr,
        completionDate: dateStr,
        notes: `Skipped thread trimming for ${u.name} (${piecesForThisAction} PCs) by Admin`,
        createdByRole: 'admin',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      newSkipsToCreate.push(newSkip);
      currentAssignments.unshift(newSkip);
    });

    if (skipsToDelete.length === 0 && newSkipsToCreate.length === 0) return;

    // Execute persistent DB side-effects ONCE outside setState (prevents StrictMode duplication)
    skipsToDelete.forEach((tc) => {
      dbRemove('thread_cutting_assignments', tc.id);
    });
    newSkipsToCreate.forEach((newSkip) => {
      saveToDb('thread_cutting_assignments', mapThreadAssignmentToDb, newSkip);
    });

    setThreadCuttingAssignments((prev) => {
      const delIds = new Set(skipsToDelete.map((s) => s.id));
      const filtered = prev.filter((tc) => !delIds.has(tc.id));
      const newIds = new Set(newSkipsToCreate.map((s) => s.id));
      const deduped = filtered.filter((tc) => !newIds.has(tc.id));
      return [...newSkipsToCreate, ...deduped];
    });

    // Clean up fabrics table: Ensure no thread trimming metadata remains in fabrics.notes
    setFabrics((prev) =>
      prev.map((f) => {
        if (f.id === fabricId) {
          const cleanUserNotes =
            cleanNoteString(f.notes) || cleanNoteString(f._userNotes) || null;
          const cleanedFabric = {
            ...f,
            notes: cleanUserNotes,
            _userNotes: cleanUserNotes,
            threadCuttingDecision: null,
            subPartTrimmingDecisions: {},
            subPartSkippedPieces: {},
            skippedTrimmingLogs: [],
            updatedAt: new Date().toISOString(),
          };
          saveToDb('fabrics', mapFabricToDb, cleanedFabric);
          return cleanedFabric;
        }
        return f;
      })
    );
  };

  const updateThreadCuttingProgress = (
    assignmentId,
    completedPSC,
    isCompleted = false,
    notes = ''
  ) => {
    setThreadCuttingAssignments((prev) =>
      prev.map((tc) => {
        if (tc.id !== assignmentId) return tc;
        const validCompleted = Math.max(0, parseInt(completedPSC, 10) || 0);
        const targetAssigned = parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0;
        const autoCompleted = isCompleted || validCompleted >= targetAssigned;
        const updated = {
          ...tc,
          completedPSC: validCompleted,
          completedPieces: validCompleted,
          status: autoCompleted ? 'Completed' : 'In Progress',
          completionDate: autoCompleted
            ? tc.completionDate || new Date().toISOString().split('T')[0]
            : null,
          notes: notes?.trim() ? notes.trim() : tc.notes,
          updatedAt: new Date().toISOString(),
        };
        saveToDb('thread_cutting_assignments', mapThreadAssignmentToDb, updated);
        return updated;
      })
    );
    return { success: true };
  };

  const deleteThreadCuttingAssignment = (assignmentId) => {
    setThreadCuttingAssignments((prev) => prev.filter((tc) => tc.id !== assignmentId));
    dbRemove('thread_cutting_assignments', assignmentId);
    return { success: true };
  };

  const linkThreadCuttingExpense = (assignmentId, expenseId) => {
    setThreadCuttingAssignments((prev) =>
      prev.map((tc) => {
        if (tc.id === assignmentId) {
          const updated = { ...tc, expenseId };
          saveToDb('thread_cutting_assignments', mapThreadAssignmentToDb, updated);
          return updated;
        }
        return tc;
      })
    );
    return { success: true };
  };

  const getThreadCuttingStats = (targetId = null, subPart = null) => {
    if (targetId) {
      const isFabricId =
        fabrics.some((f) => f.id === targetId) ||
        (typeof targetId === 'string' && targetId.startsWith('fab_'));

      let cuttingHandovers = [];
      let cutting = null;
      let linkedFabric = null;
      let batchAssignments = [];
      const normSub = subPart ? subPart.toLowerCase().trim() : null;

      if (isFabricId) {
        linkedFabric = fabrics.find((f) => f.id === targetId);
        const fabricCuttings = cuttings.filter((c) => (c.fabricId || c.fabric_id) === targetId);
        const fabricCuttingIds = new Set(fabricCuttings.map((c) => c.id));

        cuttingHandovers = masterHandovers.filter(
          (h) =>
            ((h.fabricId === targetId || h.fabric_id === targetId) ||
              (fabricCuttingIds.has(h.cuttingId) || fabricCuttingIds.has(h.cutting_id))) &&
            h.status === 'Verified'
        );
        batchAssignments = threadCuttingAssignments.filter(
          (tc) =>
            (tc.fabricId === targetId || tc.fabric_id === targetId) ||
            (fabricCuttingIds.has(tc.cuttingId) || fabricCuttingIds.has(tc.cutting_id))
        );
      } else {
        cutting = cuttings.find((c) => c.id === targetId);
        linkedFabric = cutting
          ? fabrics.find((f) => f.id === (cutting.fabricId || cutting.fabric_id))
          : null;
        const cFabId = cutting?.fabricId || cutting?.fabric_id;
        cuttingHandovers = masterHandovers.filter(
          (h) =>
            ((h.cuttingId === targetId || h.cutting_id === targetId) ||
              (cFabId && (h.fabricId === cFabId || h.fabric_id === cFabId))) &&
            h.status === 'Verified'
        );
        batchAssignments = threadCuttingAssignments.filter(
          (tc) =>
            (tc.cuttingId === targetId || tc.cutting_id === targetId) ||
            (cFabId && (tc.fabricId === cFabId || tc.fabric_id === cFabId))
        );
      }

      let effectiveStruct = linkedFabric?.productStructure || cutting?.productStructure;
      if (typeof effectiveStruct === 'string') {
        try {
          effectiveStruct = JSON.parse(effectiveStruct);
        } catch {
          effectiveStruct = null;
        }
      }
      const configuredSubParts =
        Array.isArray(effectiveStruct?.subParts) && effectiveStruct.subParts.length > 0
          ? effectiveStruct.subParts
          : Array.isArray(effectiveStruct?.parts) && effectiveStruct.parts.length > 0
            ? effectiveStruct.parts
            : [];

      // 1. Master handovers verified by Admin
      const verifiedSubPartsMap = {};
      cuttingHandovers.forEach((h) => {
        const parts =
          h.subParts && typeof h.subParts === 'object'
            ? h.subParts
            : h.parts && typeof h.parts === 'object'
              ? h.parts
              : null;
        if (parts) {
          Object.entries(parts).forEach(([k, v]) => {
            const cleanKey = resolvePieceLabel(k, effectiveStruct) || formatPieceName(k);
            const count = parseInt(v, 10) || 0;
            if (count > 0) {
              verifiedSubPartsMap[cleanKey] = (verifiedSubPartsMap[cleanKey] || 0) + count;
            }
          });
        } else if (h.subPart || h.sub_part || h.partName) {
          const cleanKey = resolvePieceLabel(h.subPart || h.sub_part || h.partName, effectiveStruct) || h.subPart || h.sub_part || h.partName;
          const count = parseInt(h.piecesCount ?? h.pieces ?? h.receivedQuantity, 10) || 0;
          if (count > 0) {
            verifiedSubPartsMap[cleanKey] = (verifiedSubPartsMap[cleanKey] || 0) + count;
          }
        }
      });

      const totalGrossVerifiedPieces = cuttingHandovers.reduce(
        (sum, mh) => sum + (parseInt(mh.piecesCount ?? mh.pieces ?? mh.pieces_count ?? mh.receivedQuantity, 10) || 0),
        0
      );

      const totalAdminReceived = totalGrossVerifiedPieces > 0
        ? totalGrossVerifiedPieces
        : Object.values(verifiedSubPartsMap).reduce((s, v) => s + (parseInt(v, 10) || 0), 0);

      const isSkipJob = (tc) =>
        (tc.status === 'Skipped' ||
        tc.actionType === 'skip' ||
        tc.action_type === 'skip') &&
        tc.createdByRole !== 'master';

      const threadAssignJobs = batchAssignments.filter((tc) => !isSkipJob(tc));
      const skippedMap = linkedFabric
        ? getFabricSubPartSkippedPieces(linkedFabric, threadCuttingAssignments)
        : {};

      const subPartDefs = configuredSubParts.length > 0
        ? configuredSubParts
        : Object.keys(verifiedSubPartsMap).length > 0
          ? Object.keys(verifiedSubPartsMap).map((k, idx) => ({ id: `part_${idx + 1}`, name: k }))
          : [{ id: 'part_1', name: linkedFabric?.productName || 'Pieces', qty: 1 }];

      const subPartStats = {};

      subPartDefs.forEach((sp, idx) => {
        const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
        const spName = resolvePieceLabel(sp.name || sp.id, effectiveStruct) || sp.name || `Part ${idx + 1}`;
        const pNorm = spName.toLowerCase().replace(/[^a-z0-9]+/g, '');

        let verifiedPieces = verifiedSubPartsMap[spName] || 0;
        if (verifiedPieces === 0) {
          for (const [vk, vv] of Object.entries(verifiedSubPartsMap)) {
            if (vk.toLowerCase().replace(/[^a-z0-9]+/g, '') === pNorm) {
              verifiedPieces = vv;
              break;
            }
          }
        }
        if (verifiedPieces === 0) {
          if (subPartDefs.length === 1) {
            verifiedPieces = totalAdminReceived;
          } else {
            const targetSets = parseInt(linkedFabric?.targetSets ?? linkedFabric?.totalSets, 10) || 0;
            const ratio = parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1;
            if (targetSets > 0) {
              verifiedPieces = targetSets * ratio;
            }
          }
        }

        const spJobs = threadAssignJobs.filter((tc) => {
          const tcSub = (tc.subPart || tc.sub_part || '').toLowerCase().trim();
          const tcSubNorm = tcSub.replace(/[^a-z0-9]+/g, '');
          const tcSubResolved = (resolvePieceLabel(tc.subPart || tc.sub_part, effectiveStruct) || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
          if (tcSubNorm === pNorm || tcSubResolved === pNorm || tcSub === key) return true;
          return subPartDefs.length === 1 || (tc.notes && tc.notes.toLowerCase().includes(pNorm));
        });

        const masterTrimmed = getMasterVerifiedTrimmedPiecesForSubPart(
          cuttingHandovers,
          key,
          spName,
          sp.id,
          configuredSubParts,
          threadCuttingAssignments
        );

        const masterSkipped = getMasterVerifiedSkippedPiecesForSubPart(
          cuttingHandovers,
          key,
          spName,
          sp.id,
          configuredSubParts,
          threadCuttingAssignments
        );

        const adminAssignJobs = spJobs.filter((tc) => tc.createdByRole !== 'master');

        const adminCompletedTrimmed = adminAssignJobs.reduce((acc, tc) => {
          const assignedCount = parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0;
          const doneCount = parseInt(tc.completedPieces ?? tc.completedPSC ?? tc.completed_psc, 10) || 0;
          return acc + (tc.status === 'Completed' ? Math.max(assignedCount, doneCount) : doneCount);
        }, 0);

        const completedTrimmedPieces = masterTrimmed + adminCompletedTrimmed;
        const assignedTrimmedPieces = adminAssignJobs.reduce(
          (acc, tc) => acc + (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0),
          0
        );

        let skippedPieces = 0;
        for (const [sk, sv] of Object.entries(skippedMap || {})) {
          const sNorm = sk.toLowerCase().replace(/[^a-z0-9]+/g, '');
          const sResolvedNorm = (resolvePieceLabel(sk, effectiveStruct) || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
          if (sNorm === pNorm || sResolvedNorm === pNorm || sNorm === key) {
            skippedPieces = Math.max(skippedPieces, parseInt(sv, 10) || 0);
          }
        }

        const inProgressPieces = adminAssignJobs
          .filter((tc) => tc.status !== 'Completed')
          .reduce((acc, tc) => {
            const rem = Math.max(
              0,
              (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0) -
              (parseInt(tc.completedPieces ?? tc.completedPSC, 10) || 0)
            );
            return acc + rem;
          }, 0);

        const pendingPieces = Math.max(
          0,
          verifiedPieces - completedTrimmedPieces - skippedPieces - inProgressPieces
        );

        const spInfo = {
          key,
          name: spName,
          totalVerified: verifiedPieces,
          assigned: assignedTrimmedPieces,
          skipped: skippedPieces,
          masterTrimmed,
          masterSkipped,
          completed: completedTrimmedPieces,
          inProgress: inProgressPieces,
          available: pendingPieces,
        };

        subPartStats[key] = spInfo;
        const normKey = spName.toLowerCase().trim();
        if (normKey !== key) {
          subPartStats[normKey] = spInfo;
        }
      });

      const uniqueSubPartAvail = subPartDefs.reduce(
        (sum, sp) => {
          const key = (sp.id || sp.name || '').toLowerCase().trim();
          return sum + (subPartStats[key]?.available || 0);
        },
        0
      );

      const availableToAssignPSC =
        normSub && subPartStats[normSub]
          ? (subPartStats[normSub].available || 0)
          : Math.max(0, uniqueSubPartAvail);

      const filteredAssignJobs = threadAssignJobs.filter(
        (tc) => !normSub || (tc.subPart && tc.subPart.toLowerCase().trim() === normSub)
      );
      const assignedPSC = filteredAssignJobs.reduce(
        (acc, tc) => acc + (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0),
        0
      );
      const completedPSC = filteredAssignJobs.reduce(
        (acc, tc) => acc + (parseInt(tc.completedPieces ?? tc.completedPSC, 10) || 0),
        0
      );
      const inProgressPSC = filteredAssignJobs
        .filter((tc) => tc.status !== 'Completed')
        .reduce(
          (acc, tc) =>
            acc + Math.max(0, (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0) - (parseInt(tc.completedPieces ?? tc.completedPSC, 10) || 0)),
          0
        );
      const totalExternalCost = filteredAssignJobs
        .filter((tc) => tc.helperType === 'external')
        .reduce((acc, tc) => acc + (parseFloat(tc.totalEarned ?? tc.totalEstimatedAmount) || 0), 0);

      const totalVerifiedPSC = totalGrossVerifiedPieces || totalAdminReceived;
      const totalSkippedPSC = Object.values(skippedMap).reduce(
        (sum, v) => sum + (parseInt(v, 10) || 0),
        0
      );
      const masterTrimmedPSC = Object.values(subPartStats).reduce(
        (sum, sp) => sum + (sp.masterTrimmed || 0),
        0
      );

      return {
        targetId,
        cuttingId: isFabricId ? null : targetId,
        fabricId: linkedFabric?.id || (isFabricId ? targetId : ''),
        isFabric: isFabricId,
        subPart: normSub,
        subPartStats,
        totalVerifiedPieces: totalVerifiedPSC,
        assignedPieces: assignedPSC,
        skippedPieces: totalSkippedPSC,
        availableToAssignPieces: availableToAssignPSC,
        completedPieces: completedPSC,
        inProgressPieces: inProgressPSC,
        masterTrimmedPieces: masterTrimmedPSC,
        totalExternalCost,
        totalVerifiedPSC,
        assignedPSC,
        skippedPSC: totalSkippedPSC,
        availableToAssignPSC,
        completedPSC,
        inProgressPSC,
        assignments: batchAssignments,
      };
    }

    const isSkipJob = (tc) =>
      tc.status === 'Skipped' ||
      tc.actionType === 'skip' ||
      tc.action_type === 'skip';
    const allAssignJobs = threadCuttingAssignments.filter((tc) => !isSkipJob(tc));
    const allSkipJobs = threadCuttingAssignments.filter(isSkipJob);

    const allVerifiedPSC = masterHandovers
      .filter((h) => h.status === 'Verified')
      .reduce((acc, h) => acc + (parseInt(h.piecesCount || h.pieces, 10) || 0), 0);
    const totalAssignedPSC = allAssignJobs.reduce(
      (acc, tc) => acc + (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0),
      0
    );
    const totalCompletedPSC = allAssignJobs.reduce(
      (acc, tc) => acc + (parseInt(tc.completedPieces ?? tc.completedPSC, 10) || 0),
      0
    );
    const totalInProgressPSC = allAssignJobs
      .filter((tc) => tc.status !== 'Completed')
      .reduce(
        (acc, tc) =>
          acc + Math.max(0, (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0) - (parseInt(tc.completedPieces ?? tc.completedPSC, 10) || 0)),
        0
      );
    const totalExternalAmount = allAssignJobs
      .filter((tc) => tc.helperType === 'external')
      .reduce((acc, tc) => acc + (parseFloat(tc.totalEarned ?? tc.totalEstimatedAmount) || 0), 0);

    const verifiedHandovers = masterHandovers.filter((h) => h.status === 'Verified');
    const uniqueFabricIds = [
      ...new Set(
        verifiedHandovers
          .map((h) => {
            if (h.fabricId) return h.fabricId;
            const c = cuttings.find((cut) => cut.id === h.cuttingId);
            return c ? (c.fabricId || c.fabric_id) : null;
          })
          .filter(Boolean)
      ),
    ];

    let totalAvailableToAssignPSC = 0;
    if (uniqueFabricIds.length > 0) {
      totalAvailableToAssignPSC = uniqueFabricIds.reduce((sum, fId) => {
        const fStats = getThreadCuttingStats(fId);
        return sum + (fStats?.availableToAssignPSC || 0);
      }, 0);
    } else {
      const uniqueCuttingIds = [
        ...new Set(
          verifiedHandovers
            .map((h) => h.cuttingId)
            .filter(Boolean)
        ),
      ];
      totalAvailableToAssignPSC = uniqueCuttingIds.reduce((sum, cId) => {
        const cStats = getThreadCuttingStats(cId);
        return sum + (cStats?.availableToAssignPSC || 0);
      }, 0);
    }

    let allSkippedPSC = allSkipJobs.reduce(
      (sum, tc) => sum + (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0),
      0
    );
    if (allSkippedPSC === 0) {
      allSkippedPSC = fabrics.reduce((sum, f) => {
        const sMap = getFabricSubPartSkippedPieces(f, threadCuttingAssignments);
        return sum + Object.values(sMap).reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
      }, 0);
    }

    const allMasterTrimmedPSC = verifiedHandovers
      .reduce((acc, h) => {
        let trimmedCount = parseInt(h.trimmedPiecesCount ?? h.trimmedPieces ?? h.trimmedPSC, 10) || 0;
        if (!trimmedCount && h.trimmedSubParts && typeof h.trimmedSubParts === 'object') {
          trimmedCount = Object.values(h.trimmedSubParts).reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
        }
        if (!trimmedCount && (h.trimmingStatus === 'trimmed' || h.trimmedByMaster)) {
          trimmedCount = parseInt(h.piecesCount || h.pieces, 10) || 0;
        }
        return acc + trimmedCount;
      }, 0);

    const allMasterFloorAssignedPSC = allAssignJobs
      .filter((tc) => tc.createdByRole === 'master')
      .reduce((acc, tc) => acc + (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0), 0);
    const additionalGlobalMasterTrimmed = Math.max(0, allMasterTrimmedPSC - allMasterFloorAssignedPSC);
    const finalTotalCompletedPSC = Math.min(allVerifiedPSC, totalCompletedPSC + additionalGlobalMasterTrimmed);

    return {
      totalVerifiedPieces: allVerifiedPSC,
      totalAssignedPieces: totalAssignedPSC,
      totalCompletedPieces: finalTotalCompletedPSC,
      totalInProgressPieces: totalInProgressPSC,
      totalAvailableToAssignPieces: totalAvailableToAssignPSC,
      totalSkippedPieces: allSkippedPSC,
      totalMasterTrimmedPieces: allMasterTrimmedPSC,
      totalExternalAmount,
      totalVerifiedPSC: allVerifiedPSC,
      totalAssignedPSC,
      totalCompletedPSC: finalTotalCompletedPSC,
      totalInProgressPSC,
      totalAvailableToAssignPSC,
      totalSkippedPSC: allSkippedPSC,
      assignments: threadCuttingAssignments,
    };
  };

  /**
   * Deliver finished complete PSCs to the supplier
   */

  return {
    assignThreadCutting,
    setFabricThreadCuttingDecision,
    updateThreadCuttingProgress,
    deleteThreadCuttingAssignment,
    linkThreadCuttingExpense,
    getThreadCuttingStats,
  };
}
