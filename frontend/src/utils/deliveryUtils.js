import {
  getMasterVerifiedTrimmedPiecesForSubPart,
  getFabricSubPartSkippedPieces,
  getFabricSubPartTrimmingDecisions,
  getFabricThreadCuttingDecision,
} from './trimmingUtils';

/**
 * Calculates how many COMPLETE finished products (sets/garments) are ready for delivery to supplier.
 * A product can only be delivered if ALL required sub-parts configured in product design
 * have been verified and ready from production.
 */
export const calculateReadyProductSets = (
  fabric,
  { cuttings = [], masterHandovers = [], threadCuttingAssignments = [], invoices = [], deliveryLogs = [] } = {}
) => {
  if (!fabric) {
    return {
      readyProductsCount: 0,
      totalReadyPieces: 0,
      totalCompletedSets: 0,
      completedSets: 0,
      totalVerifiedPieces: 0,
      alreadyDeliveredPieces: 0,
      subPartVerifiedCounts: {},
      grossSubPartVerifiedCounts: {},
      requiredSubParts: [],
      missingSubParts: [],
      isCompleteProductReady: false,
      reason: 'No fabric selected',
    };
  }

  const linkedCuttings = (cuttings || []).filter(
    (c) => c.fabricId === fabric.id || c.fabric_id === fabric.id
  );
  const linkedCuttingIds = linkedCuttings.map((c) => c.id);

  const linkedHandovers = (masterHandovers || []).filter(
    (mh) =>
      ((mh.fabricId === fabric.id || mh.fabric_id === fabric.id) ||
        linkedCuttingIds.includes(mh.cuttingId) ||
        linkedCuttingIds.includes(mh.cutting_id)) &&
      mh.status === 'Verified'
  );

  let struct = fabric.productStructure || fabric.product_structure;
  if (typeof struct === 'string') {
    try {
      struct = JSON.parse(struct);
    } catch {
      struct = null;
    }
  }

  const configuredSubParts = Array.isArray(struct?.subParts) && struct.subParts.length > 0
    ? struct.subParts
    : Array.isArray(struct?.parts) && struct.parts.length > 0
      ? struct.parts
      : [];

  const piecesPerSet = configuredSubParts.length > 0
    ? configuredSubParts.reduce((sum, sp) => sum + (parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1), 0)
    : (parseInt(fabric.piecesPerSet, 10) || 1);

  const totalGrossVerifiedPieces = linkedHandovers.reduce(
    (sum, mh) => sum + (parseInt(mh.piecesCount ?? mh.pieces ?? mh.pieces_count ?? mh.receivedQuantity, 10) || 0),
    0
  );

  // Calculate already delivered pieces for this fabric lot
  const linkedInvoices = (invoices || []).filter(
    (inv) =>
      inv.fabricId === fabric.id ||
      inv.fabric_id === fabric.id ||
      linkedCuttingIds.includes(inv.cuttingId) ||
      linkedCuttingIds.includes(inv.cutting_id) ||
      (inv.items && inv.items.some((it) => it.fabricId === fabric.id || it.fabric_id === fabric.id))
  );

  const deliveredFromInvoices = linkedInvoices.reduce((acc, inv) => {
    const matchingItems = (inv.items || []).filter(
      (it) => it.fabricId === fabric.id || it.fabric_id === fabric.id || (!it.fabricId && !it.fabric_id)
    );
    if (matchingItems.length > 0) {
      return acc + matchingItems.reduce((sum, it) => {
        const q = parseInt(it.quantity, 10) || 0;
        const isSetUnit = it.unit === 'Sets' || (typeof it.description === 'string' && it.description.includes('Sets'));
        return sum + (isSetUnit ? q * piecesPerSet : q);
      }, 0);
    }
    return acc + (parseInt(inv.quantity || inv.deliveredPSC, 10) || 0);
  }, 0);

  const deliveredFromCuttings = linkedCuttings.reduce(
    (acc, c) => acc + (parseInt(c.deliveredPSC || c.delivered_psc, 10) || 0),
    0
  );

  const deliveredFromThread = (threadCuttingAssignments || [])
    .filter((tc) => tc.fabricId === fabric.id || linkedCuttingIds.includes(tc.cuttingId))
    .reduce((acc, tc) => acc + (parseInt(tc.deliveredPSC || tc.delivered_psc, 10) || 0), 0);

  const lotDeliveryLogs = (deliveryLogs || []).filter(
    (dl) => dl.fabricId === fabric.id || dl.fabric_id === fabric.id
  );
  const deliveredFromDeliveryLogs = lotDeliveryLogs.reduce(
    (acc, dl) => acc + (parseInt(dl.totalPieces ?? dl.total_pieces ?? dl.deliveredPSC, 10) || 0),
    0
  );

  const alreadyDeliveredPieces = Math.max(
    deliveredFromDeliveryLogs,
    deliveredFromInvoices,
    deliveredFromCuttings,
    deliveredFromThread,
    parseInt(fabric.deliveredPSC || fabric.delivered_psc, 10) || 0
  );

  const totalVerifiedPieces = Math.max(0, totalGrossVerifiedPieces - alreadyDeliveredPieces);

  // If no structure configured, product is not complete
  if (configuredSubParts.length === 0) {
    return {
      readyProductsCount: 0,
      totalReadyPieces: totalVerifiedPieces,
      totalCompletedSets: 0,
      completedSets: 0,
      totalVerifiedPieces,
      alreadyDeliveredPieces,
      totalGrossVerifiedPieces,
      subPartVerifiedCounts: {},
      grossSubPartVerifiedCounts: {},
      requiredSubParts: [],
      missingSubParts: [],
      isCompleteProductReady: false,
      reason: 'Product design & parts structure not configured yet.',
    };
  }

  const subPartVerifiedCounts = {};
  configuredSubParts.forEach((sp, idx) => {
    const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
    subPartVerifiedCounts[key] = 0;
  });

  linkedHandovers.forEach((mh) => {
    let subParts = mh.subParts;
    if (!subParts && mh.notes) {
      try {
        const parsed = typeof mh.notes === 'string' ? JSON.parse(mh.notes) : mh.notes;
        if (parsed?.subParts) subParts = parsed.subParts;
      } catch { }
    }
    const rawSubs = subParts && typeof subParts === 'object' ? subParts : {};
    const validSubs = Object.entries(rawSubs).filter(([, v]) => (parseInt(v, 10) || 0) > 0);

    if (validSubs.length > 0) {
      validSubs.forEach(([k, v]) => {
        const num = parseInt(v, 10) || 0;
        const normK = k.toLowerCase().trim();
        const matched = configuredSubParts.find((sp, idx) => {
          const spId = (sp.id || `part_${idx + 1}`).toLowerCase().trim();
          const spName = (sp.name || '').toLowerCase().trim();
          return spId === normK || spName === normK;
        });

        if (matched) {
          const targetKey = (matched.id || matched.name).toLowerCase().trim();
          subPartVerifiedCounts[targetKey] = (subPartVerifiedCounts[targetKey] || 0) + num;
        } else {
          subPartVerifiedCounts[normK] = (subPartVerifiedCounts[normK] || 0) + num;
        }
      });
    } else {
      const pCount = parseInt(mh.piecesCount ?? mh.pieces ?? mh.pieces_count ?? mh.receivedQuantity, 10) || 0;
      if (configuredSubParts.length === 1) {
        const targetKey = (configuredSubParts[0].id || configuredSubParts[0].name).toLowerCase().trim();
        subPartVerifiedCounts[targetKey] = (subPartVerifiedCounts[targetKey] || 0) + pCount;
      }
    }
  });

  // 1. Calculate Gross Complete Sets manufactured according to product structure
  const grossSubPartVerifiedCounts = { ...subPartVerifiedCounts };
  const grossCounts = configuredSubParts.map((sp, idx) => {
    const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
    const ratio = parseInt(sp.qty || sp.piecesPerSet || sp.ratio, 10) || 1;
    return Math.floor((grossSubPartVerifiedCounts[key] || 0) / ratio);
  });
  const totalCompletedSets = grossCounts.length > 0 ? Math.min(...grossCounts) : 0;

  // Calculate delivered counts per configured subpart from all available sources
  const deliveredPerSubPart = {};
  configuredSubParts.forEach((sp, idx) => {
    const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
    deliveredPerSubPart[key] = 0;
  });

  // 1. From fabric.subPartsDelivered
  const fabricSubsDelivered = fabric.subPartsDelivered || fabric.sub_parts_delivered || {};
  Object.entries(fabricSubsDelivered).forEach(([k, v]) => {
    const cleanK = k.toLowerCase().trim();
    const count = parseInt(v, 10) || 0;
    if (count > 0) {
      const matched = configuredSubParts.find((sp, idx) => {
        const spId = (sp.id || `part_${idx + 1}`).toLowerCase().trim();
        const spName = (sp.name || '').toLowerCase().trim();
        return spId === cleanK || spName === cleanK;
      });
      const targetKey = matched ? (matched.id || matched.name).toLowerCase().trim() : cleanK;
      deliveredPerSubPart[targetKey] = Math.max(deliveredPerSubPart[targetKey] || 0, count);
    }
  });

  // 2. From fabric deliveryLogs or global deliveryLogs for this fabric
  const fabricLogs = Array.isArray(fabric.deliveryLogs) ? fabric.deliveryLogs : [];
  const combinedLogsMap = new Map();
  [...fabricLogs, ...(lotDeliveryLogs || [])].forEach((log) => {
    if (log && (log.id || log.invoiceNumber)) {
      combinedLogsMap.set(log.id || log.invoiceNumber, log);
    }
  });

  const logsDeliveredPerSubPart = {};
  combinedLogsMap.forEach((log) => {
    const logSubs = log.subParts || log.subPartQuantities || log.sub_parts || {};
    Object.entries(logSubs).forEach(([k, v]) => {
      const cleanK = k.toLowerCase().trim();
      const count = parseInt(v, 10) || 0;
      if (count > 0) {
        const matched = configuredSubParts.find((sp, idx) => {
          const spId = (sp.id || `part_${idx + 1}`).toLowerCase().trim();
          const spName = (sp.name || '').toLowerCase().trim();
          return spId === cleanK || spName === cleanK;
        });
        const targetKey = matched ? (matched.id || matched.name).toLowerCase().trim() : cleanK;
        logsDeliveredPerSubPart[targetKey] = (logsDeliveredPerSubPart[targetKey] || 0) + count;
      }
    });
  });

  Object.entries(logsDeliveredPerSubPart).forEach(([k, count]) => {
    deliveredPerSubPart[k] = Math.max(deliveredPerSubPart[k] || 0, count);
  });

  // 3. From linkedInvoices items
  const invoiceDeliveredPerSubPart = {};
  linkedInvoices.forEach((inv) => {
    if (Array.isArray(inv.items)) {
      inv.items.forEach((it) => {
        const itSub = (it.subPart || it.pieceName || '').toLowerCase().trim();
        const q = parseInt(it.quantity, 10) || 0;
        if (q > 0) {
          const isSetUnit = it.unit === 'Sets' || (typeof it.description === 'string' && it.description.includes('Sets'));
          if (isSetUnit) {
            configuredSubParts.forEach((sp, idx) => {
              const targetKey = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
              const ratio = parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1;
              invoiceDeliveredPerSubPart[targetKey] = (invoiceDeliveredPerSubPart[targetKey] || 0) + (q * ratio);
            });
          } else {
            const matched = configuredSubParts.find((sp, idx) => {
              const spId = (sp.id || `part_${idx + 1}`).toLowerCase().trim();
              const spName = (sp.name || '').toLowerCase().trim();
              return spId === itSub || spName === itSub;
            });
            if (matched) {
              const targetKey = (matched.id || matched.name).toLowerCase().trim();
              invoiceDeliveredPerSubPart[targetKey] = (invoiceDeliveredPerSubPart[targetKey] || 0) + q;
            }
          }
        }
      });
    }
  });

  configuredSubParts.forEach((sp, idx) => {
    const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
    deliveredPerSubPart[key] = Math.max(
      deliveredPerSubPart[key] || 0,
      invoiceDeliveredPerSubPart[key] || 0
    );
  });

  const hasSpecificSubPartDelivered = Object.values(deliveredPerSubPart).some((v) => v > 0);

  // Deduct already delivered pieces from verified subparts so remaining goods are accurate
  if (hasSpecificSubPartDelivered) {
    configuredSubParts.forEach((sp, idx) => {
      const k = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
      const delCount = deliveredPerSubPart[k] || 0;
      subPartVerifiedCounts[k] = Math.max(0, (subPartVerifiedCounts[k] || 0) - delCount);
    });
  } else if (alreadyDeliveredPieces > 0 && configuredSubParts.length > 0) {
    let remToDeduct = alreadyDeliveredPieces;

    // FIFO deduction from verified handovers (oldest handovers consumed first by delivery)
    const sortedHandovers = [...linkedHandovers].sort((a, b) => {
      const dateA = new Date(a.verifiedAt || a.handoverDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.verifiedAt || b.handoverDate || b.createdAt || 0).getTime();
      return dateA - dateB;
    });

    const handoverDeliveredPerSubPart = {};
    configuredSubParts.forEach((sp, idx) => {
      const k = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
      handoverDeliveredPerSubPart[k] = 0;
    });

    let consumedAnyFromHandovers = false;
    for (const mh of sortedHandovers) {
      if (remToDeduct <= 0) break;
      const mhTotal = parseInt(mh.piecesCount ?? mh.pieces ?? mh.pieces_count ?? mh.receivedQuantity, 10) || 0;
      if (mhTotal <= 0) continue;

      let mhSubs = mh.subParts;
      if (!mhSubs && mh.notes) {
        try {
          const parsed = typeof mh.notes === 'string' ? JSON.parse(mh.notes) : mh.notes;
          if (parsed?.subParts) mhSubs = parsed.subParts;
        } catch { }
      }

      const validSubs = mhSubs && typeof mhSubs === 'object' ? mhSubs : {};
      const hasParts = Object.keys(validSubs).length > 0;

      if (hasParts && remToDeduct >= mhTotal) {
        // Entire handover batch was delivered
        Object.entries(validSubs).forEach(([k, v]) => {
          const count = parseInt(v, 10) || 0;
          const normK = k.toLowerCase().trim();
          const matched = configuredSubParts.find((sp, idx) => {
            const spId = (sp.id || `part_${idx + 1}`).toLowerCase().trim();
            const spName = (sp.name || '').toLowerCase().trim();
            return spId === normK || spName === normK;
          });
          const targetKey = matched ? (matched.id || matched.name).toLowerCase().trim() : normK;
          handoverDeliveredPerSubPart[targetKey] = (handoverDeliveredPerSubPart[targetKey] || 0) + count;
        });
        remToDeduct -= mhTotal;
        consumedAnyFromHandovers = true;
      } else if (hasParts && remToDeduct > 0) {
        // Partial handover batch was delivered
        let batchRem = remToDeduct;
        Object.entries(validSubs).forEach(([k, v]) => {
          if (batchRem <= 0) return;
          const count = parseInt(v, 10) || 0;
          const deductPart = Math.min(count, batchRem);
          const normK = k.toLowerCase().trim();
          const matched = configuredSubParts.find((sp, idx) => {
            const spId = (sp.id || `part_${idx + 1}`).toLowerCase().trim();
            const spName = (sp.name || '').toLowerCase().trim();
            return spId === normK || spName === normK;
          });
          const targetKey = matched ? (matched.id || matched.name).toLowerCase().trim() : normK;
          handoverDeliveredPerSubPart[targetKey] = (handoverDeliveredPerSubPart[targetKey] || 0) + deductPart;
          batchRem -= deductPart;
        });
        remToDeduct = 0;
        consumedAnyFromHandovers = true;
        break;
      }
    }

    if (consumedAnyFromHandovers) {
      configuredSubParts.forEach((sp, idx) => {
        const k = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
        const delCount = handoverDeliveredPerSubPart[k] || 0;
        subPartVerifiedCounts[k] = Math.max(0, (subPartVerifiedCounts[k] || 0) - delCount);
        deliveredPerSubPart[k] = Math.max(deliveredPerSubPart[k] || 0, delCount);
      });
    }

    if (remToDeduct > 0) {
      while (remToDeduct > 0) {
        const highestKey = Object.keys(subPartVerifiedCounts)
          .sort(
            (a, b) => (subPartVerifiedCounts[b] || 0) - (subPartVerifiedCounts[a] || 0)
          )[0];

        if (!highestKey || (subPartVerifiedCounts[highestKey] || 0) <= 0) break;

        const completeSetsCurrent = configuredSubParts.map((sp, idx) => {
          const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
          const ratio = parseInt(sp.qty || sp.piecesPerSet || sp.ratio, 10) || 1;
          return Math.floor((subPartVerifiedCounts[key] || 0) / ratio);
        });
        const minCompleteCurrent =
          completeSetsCurrent.length > 0
            ? Math.min(...completeSetsCurrent)
            : 0;

        if (minCompleteCurrent > 0) {
          configuredSubParts.forEach((sp, idx) => {
            const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
            const ratio = parseInt(sp.qty || sp.piecesPerSet || sp.ratio, 10) || 1;
            subPartVerifiedCounts[key] = Math.max(0, (subPartVerifiedCounts[key] || 0) - ratio);
            deliveredPerSubPart[key] = (deliveredPerSubPart[key] || 0) + ratio;
          });
          remToDeduct -= piecesPerSet;
          continue;
        }

        if ((subPartVerifiedCounts[highestKey] || 0) <= 0) break;
        subPartVerifiedCounts[highestKey] = (subPartVerifiedCounts[highestKey] || 0) - 1;
        deliveredPerSubPart[highestKey] = (deliveredPerSubPart[highestKey] || 0) + 1;
        remToDeduct -= 1;
      }
    }
  }

  // Calculate complete sets as the minimum verified count across all required sub-parts
  const counts = configuredSubParts.map((sp, idx) => {
    const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
    const ratio = parseInt(sp.qty || sp.piecesPerSet || sp.ratio, 10) || 1;
    return Math.floor((subPartVerifiedCounts[key] || 0) / ratio);
  });

  const _completeSets = counts.length > 0 ? Math.min(...counts) : 0;

  const missingSubParts = configuredSubParts
    .filter((sp, idx) => {
      const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
      return (subPartVerifiedCounts[key] || 0) <= 0;
    })
    .map((sp) => sp.name || sp.id);

  // Check thread cutting decision and jobs (overall and per-subpart)
  const subPartTrimmingDecisions = getFabricSubPartTrimmingDecisions(fabric, threadCuttingAssignments);
  const subPartSkippedPieces = getFabricSubPartSkippedPieces(fabric, threadCuttingAssignments);
  const decision = getFabricThreadCuttingDecision(fabric, threadCuttingAssignments);

  const linkedThreadJobs = (threadCuttingAssignments || []).filter(
    (tc) =>
      (tc.fabricId === fabric.id || tc.fabric_id === fabric.id) ||
      linkedCuttingIds.includes(tc.cuttingId) ||
      linkedCuttingIds.includes(tc.cutting_id)
  );

  // Evaluate readiness and trimming status for each configured subpart
  const subPartTrimmingStatus = {};
  const subPartReadyPieces = {};
  let anyAwaitingDecision = false;
  let anyTrimmingInProgress = false;
  let totalPendingPieces = 0;

  configuredSubParts.forEach((sp, idx) => {
    const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
    const spName = sp.name || sp.id || `Part ${idx + 1}`;
    const grossVerified = grossSubPartVerifiedCounts[key] || 0;
    const deliveredCount = deliveredPerSubPart[key] || 0;
    const netVerified = subPartVerifiedCounts[key] !== undefined
      ? subPartVerifiedCounts[key]
      : Math.max(0, grossVerified - deliveredCount);

    // Helper to find a subpart's value from a map by checking all aliases
    const findSubPartEntry = (map) => {
      if (!map || typeof map !== 'object') return undefined;
      const spId = (sp.id || `part_${idx + 1}`).toLowerCase().trim();
      const spName = (sp.name || '').toLowerCase().trim();
      const normId = spId.replace(/[^a-z0-9]+/g, '');
      const normName = spName.replace(/[^a-z0-9]+/g, '');

      if (map[spId] !== undefined) return map[spId];
      if (map[spName] !== undefined) return map[spName];
      if (map[`custom_part_${idx + 1}`] !== undefined) return map[`custom_part_${idx + 1}`];
      if (map[`part_${idx + 1}`] !== undefined) return map[`part_${idx + 1}`];

      for (const [k, v] of Object.entries(map)) {
        const cleanK = k.toLowerCase().trim();
        const normK = cleanK.replace(/[^a-z0-9]+/g, '');
        if (
          cleanK === spId ||
          cleanK === spName ||
          (normId && normK === normId) ||
          (normName && normK === normName) ||
          (normK === `custompart${idx + 1}`) ||
          (normK === `part${idx + 1}`)
        ) {
          return v;
        }
      }
      return undefined;
    };

    // Subpart decision: explicit subpart decision -> fallback to lot-wide decision ONLY IF single subpart
    const explicitSubPartDecision = findSubPartEntry(subPartTrimmingDecisions);
    let spDecision = explicitSubPartDecision || null;
    if (!spDecision && configuredSubParts.length === 1 && (decision === 'skipped' || decision === 'assigned')) {
      spDecision = decision;
    }

    // Match linked thread jobs for this specific subpart (Admin jobs only; Master floor trimming is in handovers)
    const spJobs = linkedThreadJobs
      .filter((tc) => tc.createdByRole !== 'master')
      .filter((tc) => {
        const tcSub = (tc.subPart || tc.sub_part || '').toLowerCase().trim();
        if (tcSub) return tcSub === key;
        // If legacy assignment without subPart, match if this is the only subpart or name matches
        return configuredSubParts.length === 1 || (tc.notes && tc.notes.toLowerCase().includes(key));
      });

    const isSkipJob = (tc) => tc.status === 'Skipped' || tc.actionType === 'skip' || tc.action_type === 'skip';
    const spAssignJobs = spJobs.filter((tc) => !isSkipJob(tc));
    const spSkipJobs = spJobs.filter(isSkipJob);

    if (spAssignJobs.length > 0 && spSkipJobs.length === 0 && !spDecision) {
      spDecision = 'assigned';
    } else if (spSkipJobs.length > 0 && spAssignJobs.length === 0 && !spDecision) {
      spDecision = 'skipped';
    } else if (spAssignJobs.length > 0 && spSkipJobs.length > 0 && !spDecision) {
      spDecision = 'partial';
    }

    // 1. Pieces already trimmed on the floor by Master / helpers and verified by Admin
    const masterTrimmed = getMasterVerifiedTrimmedPiecesForSubPart(
      linkedHandovers,
      key,
      spName,
      sp.id,
      configuredSubParts,
      threadCuttingAssignments
    );

    // 2. Admin thread cutting assignments (exclude Master's floor assignments)
    const adminAssignJobs = spAssignJobs;
    const adminSkipJobs = spSkipJobs;

    const adminCompletedTrimmed = adminAssignJobs.reduce((acc, tc) => {
      const assignedCount = parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0;
      const doneCount = parseInt(tc.completedPieces ?? tc.completedPSC ?? tc.completed_psc, 10) || 0;
      return acc + (tc.status === 'Completed' ? Math.max(assignedCount, doneCount) : doneCount);
    }, 0);

    const totalCompletedTrimmed = masterTrimmed + adminCompletedTrimmed;

    const assignedTrimmedPieces = adminAssignJobs.reduce(
      (acc, tc) => acc + (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0),
      0
    );

    // PC-level skipped pieces: Admin skip assignments only.
    // Master floor skips arrive as untrimmed goods awaiting Admin trimming process.
    const jobsSkipped = adminSkipJobs.reduce(
      (acc, tc) => acc + (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0),
      0
    );
    const explicitSkippedVal = findSubPartEntry(subPartSkippedPieces);
    let rawSkipped = jobsSkipped;
    if (rawSkipped === 0 && explicitSkippedVal !== undefined) {
      rawSkipped = Math.max(0, parseInt(explicitSkippedVal, 10) || 0);
    } else if (rawSkipped === 0 && (explicitSubPartDecision === 'skipped' || (configuredSubParts.length === 1 && decision === 'skipped'))) {
      rawSkipped = grossVerified;
    }

    // Active skipped pieces available on floor (net of delivery):
    const activeSkippedPieces = Math.max(0, rawSkipped - deliveredCount);

    // Active completed trimmed pieces available on floor (net of delivery):
    const activeCompletedTrimmed = Math.max(0, totalCompletedTrimmed - deliveredCount);

    // Active assigned trimmed pieces on floor:
    const activeAssignedTrimmed = Math.min(netVerified, assignedTrimmedPieces);

    // Ready pieces calculation per subpart:
    // (Master Trimmed + Admin Cutted + Admin Skipped) - Total Delivered = Ready For Delivery
    const readyPieces = Math.max(
      0,
      Math.min(netVerified, (totalCompletedTrimmed + rawSkipped) - deliveredCount)
    );

    // Active in-progress pieces with Admin helpers:
    const activeAdminInProgress = adminAssignJobs
      .filter((tc) => tc.status !== 'Completed')
      .reduce((acc, tc) => {
        const assignedCount = parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0;
        const doneCount = parseInt(tc.completedPieces ?? tc.completedPSC ?? tc.completed_psc, 10) || 0;
        return acc + Math.max(0, assignedCount - doneCount);
      }, 0);

    // Pending pieces waiting for Admin decision in Step 4:
    // netVerified minus already trimmed pieces minus admin-skipped pieces minus in-progress helper trimming
    const pendingPieces = Math.max(0, netVerified - totalCompletedTrimmed - rawSkipped - activeAdminInProgress);
    totalPendingPieces += pendingPieces;

    if (activeAssignedTrimmed > 0 && !spDecision) {
      spDecision = pendingPieces > 0 ? 'partial' : 'assigned';
    } else if (activeSkippedPieces > 0 && !spDecision) {
      spDecision = pendingPieces > 0 ? 'partial' : 'skipped';
    }

    const isInProgress = activeAdminInProgress > 0;
    const isAwaiting = netVerified > 0 && pendingPieces > 0;

    if (isAwaiting) anyAwaitingDecision = true;
    if (isInProgress) anyTrimmingInProgress = true;

    subPartReadyPieces[key] = readyPieces;
    subPartTrimmingStatus[key] = {
      key,
      name: spName,
      verifiedPieces: netVerified,
      grossVerifiedPieces: grossVerified,
      readyPieces,
      masterTrimmedPieces: masterTrimmed,
      adminCompletedTrimmedPieces: adminCompletedTrimmed,
      assignedTrimmedPieces: activeAssignedTrimmed,
      completedTrimmedPieces: activeCompletedTrimmed,
      skippedPieces: activeSkippedPieces,
      pendingPieces,
      deliveredPieces: deliveredCount,
      decision: spDecision || (pendingPieces > 0 ? 'pending' : 'decided'),
      isSkipped: (activeSkippedPieces >= netVerified && netVerified > 0) || (activeSkippedPieces > 0 && activeAssignedTrimmed === 0 && pendingPieces === 0),
      isPartiallySkipped: activeSkippedPieces > 0 && activeAssignedTrimmed > 0,
      isAssigned: activeAssignedTrimmed > 0,
      isInProgress,
      isCompleted: (readyPieces >= netVerified) && netVerified > 0,
      jobsCount: adminAssignJobs.length,
    };
  });

  const completedTrimmedPieces = Object.values(subPartTrimmingStatus).reduce(
    (acc, st) => acc + (st.completedTrimmedPieces || 0),
    0
  );

  const totalCompletedSetsCalculated = configuredSubParts.map((sp, idx) => {
    const key = (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().trim();
    const ratio = parseInt(sp.qty || sp.piecesPerSet || sp.ratio, 10) || 1;
    return Math.floor((subPartReadyPieces[key] || 0) / ratio);
  });

  const readyProductsCount = configuredSubParts.length > 0 ? Math.min(...totalCompletedSetsCalculated) : 0;

  const totalPiecesRequiringTrimming = configuredSubParts
    .filter((sp) => !subPartTrimmingStatus[(sp.id || sp.name).toLowerCase().trim()]?.isSkipped)
    .reduce((acc, sp) => acc + (subPartTrimmingStatus[(sp.id || sp.name).toLowerCase().trim()]?.assignedTrimmedPieces || 0), 0);

  const isAwaitingTrimmingDecision = anyAwaitingDecision && totalGrossVerifiedPieces > 0;
  const isTrimmingInProgress = anyTrimmingInProgress && totalGrossVerifiedPieces > 0;
  const isAllTrimmingSkipped = configuredSubParts.length > 0 && configuredSubParts.every((sp) => subPartTrimmingStatus[(sp.id || sp.name).toLowerCase().trim()]?.isSkipped);
  const isTrimmingCompleted = !anyTrimmingInProgress && totalPendingPieces === 0 && (linkedThreadJobs.length > 0 || isAllTrimmingSkipped || completedTrimmedPieces > 0) && readyProductsCount > 0;
  const isTrimmingSkipped = isAllTrimmingSkipped || decision === 'skipped';

  const prodName = fabric.productName || fabric.product_name || struct?.productName || 'Garment';

  let reason = '';
  if (totalVerifiedPieces === 0) {
    reason = alreadyDeliveredPieces > 0
      ? 'All finished goods for this fabric lot have been delivered.'
      : 'Awaiting finished goods from floor (verify handover first).';
  } else if (isAwaitingTrimmingDecision && readyProductsCount === 0) {
    const pendingParts = configuredSubParts
      .filter((sp) => subPartTrimmingStatus[(sp.id || sp.name).toLowerCase().trim()]?.pendingPieces > 0)
      .map((sp) => {
        const stat = subPartTrimmingStatus[(sp.id || sp.name).toLowerCase().trim()];
        return `${stat.name} (${stat.pendingPieces} PCs)`;
      });
    reason = `Thread Trimming Decision Needed: Decide trimming for ${pendingParts.join(', ') || 'garment pieces'}.`;
  } else if (isTrimmingInProgress && readyProductsCount === 0) {
    const activeParts = configuredSubParts
      .filter((sp) => subPartTrimmingStatus[(sp.id || sp.name).toLowerCase().trim()]?.isInProgress)
      .map((sp) => {
        const stat = subPartTrimmingStatus[(sp.id || sp.name).toLowerCase().trim()];
        return `${stat.name} (${stat.completedTrimmedPieces}/${stat.assignedTrimmedPieces} trimmed)`;
      });
    reason = `Thread Trimming In Progress: ${activeParts.join(' • ') || `${completedTrimmedPieces}/${totalPiecesRequiringTrimming} PCs trimmed`}.`;
  } else if (missingSubParts.length > 0) {
    reason = `Partial goods ready (${totalVerifiedPieces} PCs): Missing ${missingSubParts.join(' & ')} to form complete ${prodName}.`;
  } else if (readyProductsCount <= 0) {
    reason = `No complete ${prodName} ready for delivery (${totalVerifiedPieces} PCs available).`;
  }

  const totalReadyPieces = configuredSubParts.length > 0
    ? Object.values(subPartReadyPieces).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0)
    : (isTrimmingSkipped || isAllTrimmingSkipped ? totalVerifiedPieces : completedTrimmedPieces || totalVerifiedPieces);

  const isDeliveryAllowed = totalReadyPieces > 0 || readyProductsCount > 0;

  return {
    readyProductsCount,
    totalReadyPieces,
    totalCompletedSets,
    completedSets: totalCompletedSets,
    totalVerifiedPieces,
    alreadyDeliveredPieces,
    totalGrossVerifiedPieces,
    subPartVerifiedCounts,
    grossSubPartVerifiedCounts,
    subPartReadyPieces,
    deliveredSubParts: deliveredPerSubPart,
    subPartTrimmingStatus,
    subPartTrimmingDecisions,
    subPartSkippedPieces,
    totalPendingPieces,
    requiredSubParts: configuredSubParts.map((sp) => sp.name || sp.id),
    missingSubParts,
    threadCuttingDecision: decision,
    isAwaitingTrimmingDecision,
    isTrimmingInProgress,
    isTrimmingCompleted,
    isTrimmingSkipped,
    isCompleteProductReady: isDeliveryAllowed,
    reason,
  };
};

/**
 * Accurately determines if all manufactured finished goods for a fabric lot
 * have been delivered and there is no remaining active production on the floor.
 */
export const isLotFullyDelivered = (fabric, {
  cuttings = [],
  tailorAssignments = [],
  masterHandovers = [],
  threadCuttingAssignments = [],
  invoices = [],
  deliveryLogs = [],
} = {}) => {
  if (!fabric) return false;
  if (fabric.isArchived) return true;
  if (fabric.status === 'Delivered' || fabric.isDelivered) return true;

  const lotCuttings = (cuttings || []).filter(
    (c) => c.fabricId === fabric.id || c.fabric_id === fabric.id
  );
  const lotCuttingIds = lotCuttings.map((c) => c.id);

  let struct = fabric.productStructure || fabric.product_structure;
  if (typeof struct === 'string') {
    try { struct = JSON.parse(struct); } catch { struct = null; }
  }
  const lotSubParts = Array.isArray(struct?.subParts) && struct.subParts.length > 0
    ? struct.subParts
    : Array.isArray(struct?.parts) && struct.parts.length > 0
      ? struct.parts
      : [];
  const subPartsCount = Math.max(1, lotSubParts.length);

  const totalCutPieces = lotCuttings.reduce((sum, c) => sum + (parseInt(c.totalPieces, 10) || 0), 0);
  const totalCutSets = lotCuttings.reduce((sum, c) => sum + (parseInt(c.setsCount || c.totalSets, 10) || 0), 0);
  const effectiveCutSets = totalCutSets > 0
    ? totalCutSets
    : (subPartsCount > 0 && totalCutPieces > 0 ? Math.floor(totalCutPieces / subPartsCount) : totalCutSets);
  const targetSets = parseInt(
    fabric.targetSets ?? fabric.printPieces ?? fabric.productQuantity ?? fabric.expectedSets ?? fabric.expected_sets,
    10
  ) || effectiveCutSets || 0;
  const targetGarmentPieces = targetSets > 0 ? targetSets * subPartsCount : totalCutPieces;

  // 0. CORE RULE: If fabric lot size is equal to or surpassed by delivered sets, lot is fully delivered
  const lotDeliveryLogsEarly = (deliveryLogs || []).filter(
    (dl) => dl.fabricId === fabric.id || dl.fabric_id === fabric.id
  );
  const totalDeliveredFromLogsEarly = lotDeliveryLogsEarly.reduce(
    (sum, dl) => sum + (parseInt(dl.totalPieces ?? dl.total_pieces ?? dl.deliveredPSC, 10) || 0),
    0
  );
  const deliveredPiecesEarly = Math.max(
    totalDeliveredFromLogsEarly,
    parseInt(fabric.deliveredPSC || fabric.delivered_psc, 10) || 0
  );
  const deliveredSetsEarly = Math.max(
    parseInt(fabric.deliveredSets || fabric.delivered_sets, 10) || 0,
    subPartsCount > 0 ? Math.floor(deliveredPiecesEarly / subPartsCount) : deliveredPiecesEarly
  );

  if (targetSets > 0 && deliveredSetsEarly >= targetSets) {
    return true;
  }
  if (targetGarmentPieces > 0 && deliveredPiecesEarly >= targetGarmentPieces) {
    return true;
  }

  // 1. Check Master Handovers
  const lotHandovers = (masterHandovers || []).filter(
    (mh) =>
      mh.fabricId === fabric.id ||
      mh.fabric_id === fabric.id ||
      lotCuttingIds.includes(mh.cuttingId) ||
      lotCuttingIds.includes(mh.cutting_id)
  );
  const hasPendingHandovers = lotHandovers.some(
    (mh) => mh.status === 'Pending Verification'
  );
  if (hasPendingHandovers) return false;

  // 2. Check Tailor Stitching Work
  const lotAssignments = (tailorAssignments || []).filter(
    (a) => a.fabricId === fabric.id || lotCuttingIds.includes(a.cuttingId)
  );
  const hasActiveTailorWork = lotAssignments.some((a) => {
    if (a.isArchived || a.status === 'Completed') return false;
    const assigned = parseInt(a.totalAssignedPieces ?? a.assignedPieces ?? a.assignedPSC, 10) || 0;
    const done = parseInt(a.completedPieces ?? a.completedPSC ?? a.completed_psc, 10) || 0;
    return assigned > 0 && done < assigned;
  });
  if (hasActiveTailorWork) return false;

  // 3. Ready Sets and Floor Workload
  const readySet = calculateReadyProductSets(fabric, {
    cuttings,
    masterHandovers,
    threadCuttingAssignments,
    invoices,
    deliveryLogs,
  });

  // If there are ready goods waiting on the floor to be dispatched, lot is NOT fully delivered
  if ((readySet.readyProductsCount || 0) > 0 || (readySet.totalReadyPieces || 0) > 0) {
    return false;
  }

  // If thread trimming is pending decision or in progress
  if (readySet.isAwaitingTrimmingDecision || readySet.isTrimmingInProgress) {
    return false;
  }

  // 4. Delivered Pieces Calculation
  const lotDeliveryLogs = (deliveryLogs || []).filter(
    (dl) => dl.fabricId === fabric.id || dl.fabric_id === fabric.id
  );
  const totalDeliveredFromLogs = lotDeliveryLogs.reduce(
    (sum, dl) => sum + (parseInt(dl.totalPieces ?? dl.total_pieces ?? dl.deliveredPSC, 10) || 0),
    0
  );
  const deliveredPieces = Math.max(
    totalDeliveredFromLogs,
    readySet.alreadyDeliveredPieces || 0,
    parseInt(fabric.deliveredPSC || fabric.delivered_psc, 10) || 0
  );

  if (deliveredPieces <= 0) {
    return false;
  }

  // 5. Delivered Sets Calculation
  let deliveredSets = 0;
  const subPartsDeliveredRaw = fabric.subPartsDelivered || fabric.sub_parts_delivered;

  // Resolve delivered count for a subpart across readySet.deliveredSubParts, subPartsDeliveredRaw, and deliveryLogs
  const getSubPartDeliveredCount = (sp, idx) => {
    const spId = (sp.id || `part_${idx + 1}`).toLowerCase().trim();
    const spName = (sp.name || '').toLowerCase().trim();
    const normId = spId.replace(/[^a-z0-9]+/g, '');
    const normName = spName.replace(/[^a-z0-9]+/g, '');

    const checkMap = (map) => {
      if (!map || typeof map !== 'object') return undefined;
      if (map[spId] !== undefined) return parseInt(map[spId], 10) || 0;
      if (map[spName] !== undefined) return parseInt(map[spName], 10) || 0;
      for (const [k, v] of Object.entries(map)) {
        const cleanK = k.toLowerCase().trim();
        const normK = cleanK.replace(/[^a-z0-9]+/g, '');
        if (cleanK === spId || cleanK === spName || (normId && normK === normId) || (normName && normK === normName)) {
          return parseInt(v, 10) || 0;
        }
      }
      return undefined;
    };

    const fromReady = checkMap(readySet.deliveredSubParts);
    if (fromReady !== undefined) return fromReady;

    const fromRaw = checkMap(subPartsDeliveredRaw);
    if (fromRaw !== undefined) return fromRaw;

    return 0;
  };

  if (lotSubParts.length > 0) {
    const counts = lotSubParts.map((sp, idx) => {
      const q = getSubPartDeliveredCount(sp, idx);
      const ratio = parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1;
      return Math.floor(q / ratio);
    });
    if (counts.length > 0 && counts.some((c) => c > 0)) {
      deliveredSets = Math.min(...counts);
    }
  }

  if (deliveredSets === 0 && deliveredPieces > 0) {
    deliveredSets = Math.floor(deliveredPieces / subPartsCount);
  }

  const deliveredPercent = targetSets > 0
    ? Math.min(100, Math.round((deliveredSets / targetSets) * 100))
    : targetGarmentPieces > 0
      ? Math.min(100, Math.round((deliveredPieces / targetGarmentPieces) * 100))
      : totalCutPieces > 0
        ? Math.min(100, Math.round((deliveredPieces / totalCutPieces) * 100))
        : 0;

  // Gross verified pieces received from master/floor
  const grossVerified = readySet.totalGrossVerifiedPieces !== undefined
    ? readySet.totalGrossVerifiedPieces
    : ((readySet.totalVerifiedPieces || 0) + deliveredPieces);

  // 6. ALL PIECES AND ALL SETS MUST BE DELIVERED
  // A partial delivery (e.g. 250 out of 1000 pieces or Top only) MUST NEVER mark the lot as fully delivered!
  const allSubPartsDelivered = lotSubParts.length > 1
    ? lotSubParts.every((sp, idx) => {
        const q = getSubPartDeliveredCount(sp, idx);
        const ratio = parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1;
        const targetForPart = targetSets > 0
          ? targetSets * ratio
          : (targetGarmentPieces > 0
              ? Math.floor(targetGarmentPieces / lotSubParts.length)
              : (totalCutPieces > 0 ? Math.floor(totalCutPieces / lotSubParts.length) : 1));
        return q >= targetForPart;
      })
    : true;

  if (lotSubParts.length > 1 && !allSubPartsDelivered) {
    // If all goods on the floor are 0 and total delivered pieces meets or exceeds target garment pieces,
    // ensure uniform subpart delivery isn't blocked by minor label discrepancies
    const isTotalPiecesSufficient = (targetGarmentPieces > 0 && deliveredPieces >= targetGarmentPieces) ||
      (totalCutPieces > 0 && deliveredPieces >= totalCutPieces);
    if (!isTotalPiecesSufficient || (readySet.totalReadyPieces || 0) > 0 || (readySet.readyProductsCount || 0) > 0) {
      return false;
    }
  }

  const isAllPiecesDelivered =
    (targetSets > 0 && deliveredSets >= targetSets) ||
    (targetGarmentPieces > 0 && deliveredPieces >= targetGarmentPieces) ||
    (totalCutPieces > 0 && deliveredPieces >= totalCutPieces) ||
    (grossVerified > 0 && deliveredPieces >= grossVerified && (targetGarmentPieces === 0 || deliveredPieces >= targetGarmentPieces)) ||
    (deliveredPercent >= 100 && deliveredPieces > 0);

  if (!isAllPiecesDelivered) {
    return false;
  }

  // 7. ALL PRODUCTION PIPELINE STEPS MUST BE COMPLETED
  // - Cutting: all expected sets/pieces must be cut
  if (targetSets > 0 && effectiveCutSets < targetSets && totalCutPieces < targetGarmentPieces) {
    return false;
  }
  if (targetGarmentPieces > 0 && totalCutPieces < targetGarmentPieces && deliveredPieces < targetGarmentPieces) {
    return false;
  }

  // - Master handovers: all cut pieces must have been received and verified from master
  if (totalCutPieces > 0 && grossVerified < totalCutPieces) {
    return false;
  }

  // - Trimming: no pieces awaiting trimming
  if ((readySet.totalPendingPieces || 0) > 0) {
    return false;
  }

  return true;
};


/**
 * Safely extracts human-readable notes and prevents JSON strings or system metadata
 * from ever being rendered in user interfaces.
 */
export const getCleanDisplayNote = (notes) => {
  if (!notes) return '';
  if (typeof notes === 'string') {
    const trimmed = notes.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && typeof parsed.userNotes === 'string' && parsed.userNotes.trim()) {
          return parsed.userNotes.trim();
        }
        return '';
      } catch {
        return '';
      }
    }
    return trimmed;
  }
  if (typeof notes === 'object' && notes !== null) {
    if (typeof notes.userNotes === 'string' && notes.userNotes.trim()) {
      return notes.userNotes.trim();
    }
    return '';
  }
  return '';
};

/**
 * Universal Archiving Helpers:
 * Checks whether an entity is archived directly or via its parent fabric lot / cutting.
 */
export const isEntityArchived = (item, fabricsList = []) => {
  if (!item) return false;

  const isDirectlyArchived = (entity) => {
    if (!entity) return false;

    // 1. Explicit boolean flag takes highest precedence
    if (entity.isArchived === true || entity.is_archived === true) return true;
    if (entity.isArchived === false || entity.is_archived === false) {
      if (entity.status === 'Archived' || entity.archiveStatus === 'Archived') return true;
      return false;
    }

    // 2. Status string check
    if (entity.status === 'Archived' || entity.archiveStatus === 'Archived') return true;

    // 3. Timestamp check (only when not explicitly false and restoredAt is not newer)
    if (entity.archivedAt || entity.archived_at || entity.archived) {
      const archivedTime = new Date(entity.archivedAt || entity.archived_at || entity.archived).getTime();
      const restoredTime =
        entity.restoredAt || entity.restored_at
          ? new Date(entity.restoredAt || entity.restored_at).getTime()
          : 0;
      if (restoredTime && restoredTime >= archivedTime) {
        return false;
      }
      return true;
    }

    return false;
  };

  // 1. Check if the entity itself is archived
  if (isDirectlyArchived(item)) {
    return true;
  }

  // 2. Check parent fabric reference directly (child entities cascade from parent fabric)
  const fabricId = item.fabricId || item.fabric_id;
  if (fabricId && Array.isArray(fabricsList) && fabricsList.length > 0) {
    const parentFabric = fabricsList.find((f) => String(f.id) === String(fabricId));
    if (parentFabric && isDirectlyArchived(parentFabric)) {
      return true;
    }
  }

  return false;
};

export const filterActiveEntities = (items = [], fabricsList = []) => {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => !isEntityArchived(item, fabricsList));
};

export const filterArchivedEntities = (items = [], fabricsList = []) => {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => isEntityArchived(item, fabricsList));
};
