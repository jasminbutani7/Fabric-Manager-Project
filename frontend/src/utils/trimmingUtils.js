import { getProductStructure } from '../services/dbMappers';
import { formatPieceName, resolvePieceLabel } from './cuttingUtils';

/**
 * Computes a human-readable breakdown of finished goods handovers
 * based on verified sub-parts.
 */
export const getHandoversBreakdownSummary = (handoversList, delimiter = ', ') => {
  if (!handoversList || handoversList.length === 0) return '0 Pieces';

  const pieceCounts = {};
  let totalPieces = 0;

  handoversList.forEach((h) => {
    const pCount = parseInt(h.piecesCount ?? h.pieces ?? h.receivedQuantity, 10) || 0;
    totalPieces += pCount;

    const rawSubParts = h.subParts && typeof h.subParts === 'object' ? h.subParts : {};
    const validSubs = Object.entries(rawSubParts).filter(([, v]) => (parseInt(v, 10) || 0) > 0);

    if (validSubs.length > 0) {
      validSubs.forEach(([k, v]) => {
        const num = parseInt(v, 10) || 0;
        const normalizedKey = k.toLowerCase().trim();
        pieceCounts[normalizedKey] = (pieceCounts[normalizedKey] || 0) + num;
      });
    } else {
      const prodKey = (h.productName || 'Piece').toLowerCase().trim();
      pieceCounts[prodKey] = (pieceCounts[prodKey] || 0) + pCount;
    }
  });

  const entries = Object.entries(pieceCounts).filter(([, count]) => count > 0);
  if (entries.length === 0) {
    return `${totalPieces} Pieces`;
  }

  if (entries.length === 1) {
    const [key, count] = entries[0];
    const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
    return `${count} ${formatPieceName(capitalized, count)}`;
  }

  return entries
    .map(([key, count]) => {
      const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
      return `${count} ${formatPieceName(capitalized, count)}`;
    })
    .join(delimiter);
};

/**
 * Resolves pieces that were already trimmed by Master / helpers on the floor and verified by Admin.
 * These pieces are directly ready and do not require another thread cutting step.
 */
export const getMasterVerifiedTrimmedPiecesForSubPart = (
  linkedHandovers = [],
  spKey,
  spName,
  spId,
  configuredSubParts = [],
  threadCuttingAssignments = []
) => {
  let count = 0;
  const normKey = (spKey || '').toLowerCase().trim();
  const normName = (spName || '').toLowerCase().trim();
  const normId = (spId || '').toLowerCase().trim();

  (linkedHandovers || []).forEach((mh) => {
    if (mh.status !== 'Verified') return;

    // 1. Direct trimmedSubParts map on handover object or notes JSON
    let trimmedSubs = mh.trimmedSubParts;
    if (!trimmedSubs && mh.notes) {
      try {
        const p = typeof mh.notes === 'string' ? JSON.parse(mh.notes) : mh.notes;
        if (p?.trimmedSubParts) trimmedSubs = p.trimmedSubParts;
      } catch {}
    }

    if (trimmedSubs && typeof trimmedSubs === 'object') {
      for (const [k, v] of Object.entries(trimmedSubs)) {
        const cleanK = k.toLowerCase().trim();
        if (cleanK === normKey || cleanK === normName || cleanK === normId) {
          count += parseInt(v, 10) || 0;
        }
      }
      return;
    }

    // 2. Retroactive recovery: check Master floor trimming jobs from threadCuttingAssignments
    if (Array.isArray(threadCuttingAssignments) && threadCuttingAssignments.length > 0) {
      const mJobs = threadCuttingAssignments.filter(
        (tc) =>
          (tc.fabricId === mh.fabricId || tc.fabric_id === mh.fabricId) &&
          tc.createdByRole === 'master' &&
          tc.status === 'Completed'
      );
      if (mJobs.length > 0) {
        let subTrimmed = 0;
        mJobs.forEach((tc) => {
          const cleanK = (tc.subPart || tc.sub_part || '').toLowerCase().trim();
          if (cleanK === normKey || cleanK === normName || cleanK === normId) {
            subTrimmed += parseInt(tc.completedPieces ?? tc.completedPSC ?? tc.assignedPSC ?? tc.assignedPieces, 10) || 0;
          }
        });
        if (subTrimmed > 0) {
          count += subTrimmed;
          return;
        }
      }
    }

    // 3. Fallback when trimmingStatus is explicitly 'trimmed' (100% trimmed on floor)
    if (mh.trimmingStatus === 'trimmed' || (mh.trimmedByMaster && !mh.skippedByMaster)) {
      const parts = mh.subParts && typeof mh.subParts === 'object' ? mh.subParts : null;
      if (parts) {
        for (const [k, v] of Object.entries(parts)) {
          const cleanK = k.toLowerCase().trim();
          if (cleanK === normKey || cleanK === normName || cleanK === normId) {
            count += parseInt(v, 10) || 0;
          }
        }
      } else if (configuredSubParts.length === 1) {
        count += parseInt(mh.trimmedPieces ?? mh.piecesCount ?? mh.pieces, 10) || 0;
      }
    } else if (mh.trimmingStatus === 'mixed' && (parseInt(mh.trimmedPieces, 10) || 0) > 0) {
      if (configuredSubParts.length === 1) {
        count += parseInt(mh.trimmedPieces, 10) || 0;
      }
    }
  });

  return count;
};

/**
 * Resolves verified pieces that were SKIPPED from thread trimming on the floor by Master.
 */
export const getMasterVerifiedSkippedPiecesForSubPart = (
  linkedHandovers = [],
  spKey,
  spName,
  spId,
  configuredSubParts = [],
  threadCuttingAssignments = []
) => {
  let count = 0;
  const normKey = (spKey || '').toLowerCase().trim();
  const normName = (spName || '').toLowerCase().trim();
  const normId = (spId || '').toLowerCase().trim();

  (linkedHandovers || []).forEach((mh) => {
    if (mh.status !== 'Verified') return;

    // 1. Check direct skippedSubParts from handover object or notes JSON
    let skippedSubs = mh.skippedSubParts;
    if (!skippedSubs && mh.notes) {
      try {
        const p = typeof mh.notes === 'string' ? JSON.parse(mh.notes) : mh.notes;
        if (p?.skippedSubParts) skippedSubs = p.skippedSubParts;
      } catch {}
    }

    if (skippedSubs && typeof skippedSubs === 'object') {
      for (const [k, v] of Object.entries(skippedSubs)) {
        const cleanK = k.toLowerCase().trim();
        if (cleanK === normKey || cleanK === normName || cleanK === normId) {
          count += parseInt(v, 10) || 0;
        }
      }
      return;
    }

    // 2. Retroactive recovery: check Master floor skip jobs from threadCuttingAssignments
    if (Array.isArray(threadCuttingAssignments) && threadCuttingAssignments.length > 0) {
      const mSkipJobs = threadCuttingAssignments.filter(
        (tc) =>
          (tc.fabricId === mh.fabricId || tc.fabric_id === mh.fabricId) &&
          tc.createdByRole === 'master' &&
          (tc.status === 'Skipped' || tc.actionType === 'skip' || tc.action_type === 'skip')
      );
      if (mSkipJobs.length > 0) {
        let subSkip = 0;
        mSkipJobs.forEach((tc) => {
          const cleanK = (tc.subPart || tc.sub_part || '').toLowerCase().trim();
          if (cleanK === normKey || cleanK === normName || cleanK === normId) {
            subSkip += parseInt(tc.assignedPieces ?? tc.assignedPSC ?? tc.completedPieces, 10) || 0;
          }
        });
        if (subSkip > 0) {
          count += subSkip;
          return;
        }
      }
    }

    // 3. Fallback when trimmingStatus is explicitly 'skipped' (100% skipped on floor)
    if (mh.trimmingStatus === 'skipped' || (!mh.trimmedByMaster && mh.skippedByMaster)) {
      const parts = mh.subParts && typeof mh.subParts === 'object' ? mh.subParts : null;
      if (parts) {
        for (const [k, v] of Object.entries(parts)) {
          const cleanK = k.toLowerCase().trim();
          if (cleanK === normKey || cleanK === normName || cleanK === normId) {
            count += parseInt(v, 10) || 0;
          }
        }
      } else if (configuredSubParts.length === 1) {
        count += parseInt(mh.skippedTrimmingPieces ?? mh.piecesCount ?? mh.pieces, 10) || 0;
      }
    } else if (mh.trimmingStatus === 'mixed' && (parseInt(mh.skippedTrimmingPieces, 10) || 0) > 0) {
      if (configuredSubParts.length === 1) {
        count += parseInt(mh.skippedTrimmingPieces, 10) || 0;
      }
    }
  });

  return count;
};

/**
 * Resolves per-subpart skipped pieces for Admin thread trimming: { [subPartKey]: number }
 * Note: Master floor skips arrive as untrimmed goods awaiting Admin trimming process,
 * so they are NOT counted as skipped pieces for Admin/Fabric.
 */
export const getFabricSubPartSkippedPieces = (fabric, threadCuttingAssignments = []) => {
  if (!fabric) return {};

  const skipped = {};
  const fId = fabric.id;

  // 1. Admin thread cutting skip assignments (exclude floor skips by master)
  if (Array.isArray(threadCuttingAssignments) && threadCuttingAssignments.length > 0 && fId) {
    threadCuttingAssignments.forEach((tc) => {
      const matchFabric = (tc.fabricId === fId || tc.fabric_id === fId);
      const isSkip = (tc.status === 'Skipped' || tc.actionType === 'skip' || tc.action_type === 'skip');
      if (matchFabric && isSkip && tc.createdByRole !== 'master') {
        const k = (tc.subPart || tc.sub_part || '').toLowerCase().trim();
        const count = parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0;
        if (k) {
          skipped[k] = (skipped[k] || 0) + count;
        }
      }
    });
  }

  // 2. Backward compatibility fallback from fabric object or notes if not found in assignments
  if (Object.keys(skipped).length === 0) {
    if (fabric.notes) {
      try {
        const parsed = typeof fabric.notes === 'string' ? JSON.parse(fabric.notes) : fabric.notes;
        if (parsed && typeof parsed === 'object') {
          const map = parsed.subPartSkippedPieces || parsed.skippedPieces;
          if (map && typeof map === 'object') {
            Object.entries(map).forEach(([k, v]) => {
              const cleanK = k.toLowerCase().trim();
              const count = parseInt(v, 10) || 0;
              if (count > 0) skipped[cleanK] = count;
            });
          }
        }
      } catch {}
    }
  }

  return skipped;
};

/**
 * Extracts and returns an array of granular, audit-ready skipped trimming records for a fabric lot.
 * Sorted date/time-wise recently on top.
 */
export const getFabricSkippedTrimmingLogs = (fabric, threadCuttingAssignments = []) => {
  if (!fabric) return [];

  const fId = fabric.id;
  let logs = [];

  // 1. Check thread_cutting_assignments for skipped records
  if (Array.isArray(threadCuttingAssignments) && threadCuttingAssignments.length > 0 && fId) {
    const skipJobs = threadCuttingAssignments.filter(
      (tc) =>
        (tc.fabricId === fId || tc.fabric_id === fId) &&
        (tc.status === 'Skipped' || tc.actionType === 'skip' || tc.action_type === 'skip')
    );
    if (skipJobs.length > 0) {
      skipJobs.forEach((tc) => {
        if (Array.isArray(tc.skippedLogs) && tc.skippedLogs.length > 0) {
          logs.push(...tc.skippedLogs);
        } else {
          const dateStr = tc.assignedDate || tc.created_at?.split('T')[0] || tc.createdAt?.split('T')[0] || '';
          const pcs = parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0;
          logs.push({
            id: tc.id,
            timestamp: tc.createdAt || tc.created_at || new Date().toISOString(),
            date: dateStr,
            time: tc.created_at ? new Date(tc.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
            subPartKey: (tc.subPart || tc.sub_part || '').toLowerCase().trim(),
            subPartName: tc.subPartName || tc.sub_part_name || (tc.subPart || '').toUpperCase(),
            pieces: pcs,
            totalSkippedForPart: pcs,
          });
        }
      });
    }
  }

  // 2. Direct property on fabric object (backward compatibility)
  if (logs.length === 0) {
    if (Array.isArray(fabric.skippedTrimmingLogs) && fabric.skippedTrimmingLogs.length > 0) {
      logs = fabric.skippedTrimmingLogs.map((l) => ({ ...l }));
    } else if (fabric.notes) {
      try {
        const parsed = typeof fabric.notes === 'string' ? JSON.parse(fabric.notes) : fabric.notes;
        if (parsed && Array.isArray(parsed.skippedTrimmingLogs) && parsed.skippedTrimmingLogs.length > 0) {
          logs = parsed.skippedTrimmingLogs.map((l) => ({ ...l }));
        }
      } catch {}
    }
  }

  // 3. Fallback: If no logs recorded yet, synthesize from subPartSkippedPieces
  if (logs.length === 0) {
    const skippedMap = getFabricSubPartSkippedPieces(fabric, threadCuttingAssignments);
    const struct = getProductStructure(fabric);
    const dateStr =
      fabric.updatedAt?.split('T')[0] ||
      fabric.createdAt?.split('T')[0] ||
      fabric.lotDate ||
      fabric.date ||
      '';

    Object.entries(skippedMap).forEach(([k, count], idx) => {
      const pcs = parseInt(count, 10) || 0;
      if (pcs > 0) {
        logs.push({
          id: `synth_skip_${fabric.id}_${k}_${idx}`,
          timestamp:
            fabric.threadCuttingDecisionAt ||
            fabric.updatedAt ||
            fabric.createdAt ||
            new Date().toISOString(),
          date: dateStr,
          time: '',
          subPartKey: k,
          subPartName: resolvePieceLabel(k, struct),
          pieces: pcs,
          totalSkippedForPart: pcs,
        });
      }
    });
  }

  // Deduplicate entries that may have been caused by rapid repeated clicking
  const seenSignatures = new Set();
  logs = logs.filter((log) => {
    const timeKey = (log.time || '').slice(0, 5);
    const sig = `${(log.subPartKey || '').toLowerCase().trim()}_${log.pieces}_${log.date}_${timeKey}`;
    if (seenSignatures.has(sig)) return false;
    seenSignatures.add(sig);
    return true;
  });

  // Sort by recently top (timestamp / date)
  return logs.sort((a, b) => {
    const timeA = new Date(a.timestamp || a.date || 0).getTime() || 0;
    const timeB = new Date(b.timestamp || b.date || 0).getTime() || 0;
    if (timeB !== timeA) return timeB - timeA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });
};

/**
 * Resolves per-subpart thread trimming decisions: { [subPartKey]: 'assigned' | 'skipped' | 'pending' }
 */
export const getFabricSubPartTrimmingDecisions = (fabric, threadCuttingAssignments = []) => {
  if (!fabric) return {};

  const decisions = {};

  // 1. Thread cutting assignments are the primary source of truth (Admin assignments)
  (threadCuttingAssignments || []).forEach((tc) => {
    if ((tc.fabricId === fabric.id || tc.fabric_id === fabric.id) && tc.createdByRole !== 'master') {
      const sp = (tc.subPart || tc.sub_part || '').toLowerCase().trim();
      if (sp) {
        const isSkip = (tc.status === 'Skipped' || tc.actionType === 'skip' || tc.action_type === 'skip');
        decisions[sp] = isSkip ? 'skipped' : 'assigned';
      }
    }
  });

  // 2. Direct property on fabric object (backward compatibility)
  if (fabric.subPartTrimmingDecisions && typeof fabric.subPartTrimmingDecisions === 'object') {
    Object.entries(fabric.subPartTrimmingDecisions).forEach(([k, v]) => {
      if (!decisions[k.toLowerCase().trim()]) {
        decisions[k.toLowerCase().trim()] = v;
      }
    });
  }

  // 3. Check notes property for legacy structured JSON
  if (fabric.notes) {
    try {
      const parsed = typeof fabric.notes === 'string' ? JSON.parse(fabric.notes) : fabric.notes;
      if (parsed && typeof parsed === 'object') {
        const map = parsed.subPartTrimmingDecisions || parsed.threadCuttingDecisions;
        if (map && typeof map === 'object') {
          Object.entries(map).forEach(([k, v]) => {
            if (!decisions[k.toLowerCase().trim()]) {
              decisions[k.toLowerCase().trim()] = v;
            }
          });
        }
      }
    } catch { }
  }

  return decisions;
};

/**
 * Resolves the thread cutting decision for a fabric lot: 'assigned', 'skipped', 'partial', or null (pending).
 */
export const getFabricThreadCuttingDecision = (fabric, threadCuttingAssignments = []) => {
  if (!fabric) return null;

  // 1. Primary check: Evaluate from threadCuttingAssignments (Admin assignments)
  const fJobs = (threadCuttingAssignments || []).filter(
    (tc) => (tc.fabricId === fabric.id || tc.fabric_id === fabric.id) && tc.createdByRole !== 'master'
  );
  if (fJobs.length > 0) {
    const isSkip = (tc) => tc.status === 'Skipped' || tc.actionType === 'skip' || tc.action_type === 'skip';
    const hasAssign = fJobs.some((tc) => !isSkip(tc));
    const hasSkip = fJobs.some(isSkip);
    if (hasAssign && hasSkip) return 'partial';
    if (hasSkip) return 'skipped';
    if (hasAssign) return 'assigned';
  }

  // 2. Direct property on fabric object (backward compatibility)
  if (fabric.threadCuttingDecision) {
    return fabric.threadCuttingDecision;
  }

  // 3. Check notes property for legacy structured JSON or skip markers
  if (fabric.notes) {
    try {
      const parsed = typeof fabric.notes === 'string' ? JSON.parse(fabric.notes) : fabric.notes;
      if (parsed && typeof parsed === 'object') {
        if (parsed.threadCuttingDecision) return parsed.threadCuttingDecision;
        if (parsed.skipThreadCutting) return 'skipped';
        const subMap = parsed.subPartTrimmingDecisions || parsed.threadCuttingDecisions;
        if (subMap && typeof subMap === 'object') {
          let struct = fabric.productStructure || fabric.product_structure;
          if (typeof struct === 'string') {
            try { struct = JSON.parse(struct); } catch { }
          }
          const configuredSubParts = Array.isArray(struct?.subParts) && struct.subParts.length > 0
            ? struct.subParts
            : Array.isArray(struct?.parts) && struct.parts.length > 0
              ? struct.parts
              : [];

          if (configuredSubParts.length > 0) {
            const allDecidedSkipped = configuredSubParts.every((sp) => {
              const k = (sp.id || sp.name).toLowerCase().trim();
              return subMap[k] === 'skipped';
            });
            if (allDecidedSkipped) return 'skipped';

            const allDecidedAssigned = configuredSubParts.every((sp) => {
              const k = (sp.id || sp.name).toLowerCase().trim();
              return subMap[k] === 'assigned';
            });
            if (allDecidedAssigned) return 'assigned';

            const anyDecided = configuredSubParts.some((sp) => {
              const k = (sp.id || sp.name).toLowerCase().trim();
              return subMap[k] !== undefined;
            });
            if (anyDecided) return 'partial';
          } else {
            const vals = Object.values(subMap);
            if (vals.length > 0 && vals.every((v) => v === 'skipped')) return 'skipped';
            if (vals.length > 0 && vals.every((v) => v === 'assigned')) return 'assigned';
            if (vals.length > 0) return 'partial';
          }
        }
      }
    } catch { }
    if (typeof fabric.notes === 'string' && fabric.notes.includes('[THREAD_CUTTING:SKIPPED]')) {
      return 'skipped';
    }
  }

  // 4. Default: No decision made yet
  return null;
};
