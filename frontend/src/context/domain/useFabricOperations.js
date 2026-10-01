import { sanitizeFabricName } from '../managementContextInstance';
import {
  getProductStructure,
  mapFabricToDb,
  mapCuttingToDb,
  mapTemplateToDb,
  mapAssignmentToDb,
  mapHandoverToDb,
  mapThreadAssignmentToDb,
  mapDeliveryLogToDb,
} from '../../services/dbMappers';
import {
  normalizeCutPiecesObject,
  getCuttingTotalPieces,
} from '../../utils/productUtils';
import { calculateCuttingBalance, calculateFabricBalance } from '../../utils/balanceUtils';
import { executeAtomicCuttingBatch } from '../../services/atomicTransactions';
import { generateEntityId } from '../../utils/idGenerator';

export function useFabricOperations({
  fabrics,
  setFabrics,
  cuttings,
  setCuttings,
  productTemplates,
  setProductTemplates,
  suppliers,
  masters,
  tailorAssignments,
  setTailorAssignments,
  _masterHandovers,
  setMasterHandovers,
  _threadCuttingAssignments,
  setThreadCuttingAssignments,
  _deliveryLogs,
  setDeliveryLogs,
  saveToDb,
  dbRemove,
  ownerUserId,
  currentUser,
  supabase,
}) {
  /**
   * FABRIC INVENTORY MANAGEMENT
   */
  const addFabric = (fabricData) => {
    const supplier = suppliers.find((s) => s.id === fabricData.supplierId);
    const master = masters.find((m) => m.id === fabricData.assignedMasterId);
    const plainMeters = parseFloat(fabricData.plainMeters) || 0;
    const printPieces = parseInt(fabricData.printPieces ?? fabricData.targetSets, 10) || 0;
    const pricePerPiece = parseFloat(fabricData.pricePerPiece ?? fabricData.pricePerSet) || 0;

    const totalAmount =
      printPieces > 0 && pricePerPiece > 0
        ? Math.round(printPieces * pricePerPiece)
        : 0;

    const productName = (fabricData.productName || '').trim();
    const productStructure = fabricData.productStructure || null;
    const tailorRates = fabricData.tailorRates || null;

    // Calculate unique Lot Number
    const existingLotNumbers = (fabrics || [])
      .map((f) => parseInt(f.lotNo, 10))
      .filter((n) => !isNaN(n));
    const nextLotNo = existingLotNumbers.length > 0 ? Math.max(...existingLotNumbers) + 1 : 1;
    const lotNo = fabricData.lotNo || nextLotNo;

    const targetUserId =
      (currentUser?.role === 'Admin' ? currentUser?.id : null) ||
      currentUser?.user_id ||
      currentUser?.adminUserId ||
      fabricData.user_id ||
      fabricData.userId ||
      supplier?.user_id ||
      supplier?.userId ||
      ownerUserId;

    const validTargetUserId =
      targetUserId && !targetUserId.startsWith('mst_') && !targetUserId.startsWith('tlr_') && !targetUserId.startsWith('hlp_')
        ? targetUserId
        : null;

    const newFabric = {
      id: generateEntityId('fab'),
      lotNo,
      user_id: validTargetUserId,
      userId: validTargetUserId,
      supplierId: fabricData.supplierId || null,
      supplierName: supplier ? supplier.name : (fabricData.supplierName || 'Direct Vendor'),
      supplierPhone: supplier?.phone || '',
      assignedMasterId: fabricData.assignedMasterId || null,
      assignedMasterName: master ? master.name : (fabricData.assignedMasterName || null),
      plainMeters,
      printPieces,
      targetSets: printPieces,
      lotSizePrintFabricPsc: printPieces,
      pricePerPiece,
      pricePerSet: pricePerPiece,
      totalAmount,
      productName,
      productStructure,
      color: (fabricData.color || '').trim(),
      date: fabricData.date || new Date().toISOString().split('T')[0],
      dueDate: fabricData.dueDate || '',
      fabricType: (fabricData.fabricType || fabricData.productName || `Lot #${lotNo}`).trim(),
      status: fabricData.status || 'In Stock',
      notes: (fabricData.notes || '').trim(),
      tailorRates,
      createdAt: new Date().toISOString(),
    };

    setFabrics((prev) => [newFabric, ...(prev || []).filter((f) => f.id !== newFabric.id)]);
    saveToDb('fabrics', mapFabricToDb, newFabric);
    return { success: true, fabric: newFabric };
  };

  const updateFabric = (id, updatedData) => {
    setFabrics((prev) =>
      (prev || []).map((f) => {
        if (f.id === id) {
          const supplier = updatedData.supplierId
            ? suppliers.find((s) => s.id === updatedData.supplierId)
            : null;
          const master =
            updatedData.assignedMasterId !== undefined
              ? masters.find((m) => m.id === updatedData.assignedMasterId)
              : null;
          const printPieces =
            updatedData.printPieces !== undefined
              ? parseInt(updatedData.printPieces, 10) || 0
              : (updatedData.targetSets !== undefined
                  ? parseInt(updatedData.targetSets, 10) || 0
                  : (f.printPieces ?? f.targetSets ?? 0));
          const pricePerPiece =
            updatedData.pricePerPiece !== undefined
              ? parseFloat(updatedData.pricePerPiece) || 0
              : (updatedData.pricePerSet !== undefined
                  ? parseFloat(updatedData.pricePerSet) || 0
                  : (f.pricePerPiece ?? f.pricePerSet ?? 0));
          const totalAmount =
            printPieces > 0 && pricePerPiece > 0
              ? Math.round(printPieces * pricePerPiece)
              : (updatedData.totalAmount !== undefined ? parseFloat(updatedData.totalAmount) || 0 : f.totalAmount);

          const productName =
            updatedData.productName !== undefined
              ? (updatedData.productName || '').trim()
              : (f.productName || '').trim();

          const productStructure =
            updatedData.productStructure !== undefined
              ? updatedData.productStructure
              : f.productStructure || null;

          const tailorRates =
            updatedData.tailorRates !== undefined
              ? updatedData.tailorRates
              : f.tailorRates || null;

          // Preserve status if not explicitly specified
          const effectiveStatus =
            updatedData.status !== undefined && updatedData.status !== null
              ? updatedData.status
              : (f.status || 'In Stock');

          const updatedFabric = {
            ...f,
            ...updatedData,
            status: effectiveStatus,
            productName,
            productStructure,
            supplierName: supplier ? supplier.name : (updatedData.supplierName || f.supplierName),
            supplierPhone: supplier ? supplier.phone : (updatedData.supplierPhone || f.supplierPhone),
            assignedMasterId:
              updatedData.assignedMasterId !== undefined
                ? updatedData.assignedMasterId || null
                : f.assignedMasterId,
            assignedMasterName:
              updatedData.assignedMasterName !== undefined
                ? updatedData.assignedMasterName
                : updatedData.assignedMasterId !== undefined
                  ? (master ? master.name : null)
                  : f.assignedMasterName,
            dueDate:
              updatedData.dueDate !== undefined
                ? updatedData.dueDate
                : f.dueDate,
            lotNo:
              updatedData.lotNo !== undefined
                ? updatedData.lotNo
                : f.lotNo,
            plainMeters:
              updatedData.plainMeters !== undefined
                ? parseFloat(updatedData.plainMeters) || 0
                : f.plainMeters,
            printPieces,
            targetSets: printPieces,
            lotSizePrintFabricPsc: printPieces,
            pricePerPiece,
            pricePerSet: pricePerPiece,
            totalAmount,
            tailorRates,
          };
          saveToDb('fabrics', mapFabricToDb, updatedFabric);
          return updatedFabric;
        }
        return f;
      })
    );
    return { success: true };
  };

  const deleteFabric = (id) => {
    setFabrics((prev) => prev.filter((f) => f.id !== id));
    setCuttings((prev) => prev.filter((c) => c.fabricId !== id && c.fabric_id !== id));
    setTailorAssignments((prev) => prev.filter((a) => a.fabricId !== id && a.fabric_id !== id));
    setMasterHandovers((prev) => prev.filter((h) => h.fabricId !== id && h.fabric_id !== id));
    setThreadCuttingAssignments((prev) => prev.filter((tc) => tc.fabricId !== id && tc.fabric_id !== id));
    if (setDeliveryLogs) {
      setDeliveryLogs((prev) => prev.filter((dl) => dl.fabricId !== id && dl.fabric_id !== id));
    }
    dbRemove('fabrics', id);
    return { success: true };
  };

  /**
   * PRODUCT STRUCTURE TEMPLATES LIBRARY
   */
  const saveProductTemplate = (templateData) => {
    const templateName = (templateData.name || templateData.productName || 'Custom Template').trim();
    const existingIndex = productTemplates.findIndex((t) => t.id === templateData.id);

    const subParts = Array.isArray(templateData.subParts)
      ? templateData.subParts.map((sp, idx) => ({
        id: (sp.id || sp.name || `part_${idx + 1}`).toLowerCase().replace(/\s+/g, '_'),
        name: sp.name || `Part ${idx + 1}`,
        rate: parseFloat(sp.rate) || 0,
        components: sp.components || { piece: 1 },
      }))
      : [];

    const fullSetRate =
      templateData.fullSetRate !== undefined
        ? parseFloat(templateData.fullSetRate) || 0
        : subParts.reduce((acc, p) => acc + (parseFloat(p.rate) || 0), 0);

    const newTemplate = {
      id: templateData.id || generateEntityId('tmpl'),
      name: templateName,
      productName: templateData.productName || templateName,
      fullSetRate: Math.round(fullSetRate * 100) / 100,
      subParts,
      isDefault: Boolean(templateData.isDefault),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      setProductTemplates((prev) => {
        const next = [...prev];
        next[existingIndex] = newTemplate;
        return next;
      });
    } else {
      setProductTemplates((prev) => [...prev, newTemplate]);
    }
    saveToDb('product_templates', mapTemplateToDb, newTemplate);
    return newTemplate;
  };

  const deleteProductTemplate = (templateId) => {
    setProductTemplates((prev) => prev.filter((t) => t.id !== templateId));
    dbRemove('product_templates', templateId);
    return { success: true };
  };

  /**
   * CUTTING STORE MANAGEMENT
   */
  const addCutting = (data) => {
    const fabric = fabrics.find((f) => f.id === data.fabricId);
    const master = masters.find((m) => m.id === data.masterId);

    const productName = fabric?.productName || data.productName || 'Garment';
    const productStructure = fabric?.productStructure || data.productStructure || getProductStructure(fabric || data);

    // Merge cutPieces ensuring numeric values
    const cutPieces = {};
    if (data.cutPieces && typeof data.cutPieces === 'object') {
      Object.entries(data.cutPieces).forEach(([key, val]) => {
        cutPieces[key] = Math.max(0, parseInt(val, 10) || 0);
      });
    }

    // Calculate total pieces accurately based on configured product structure pieces
    const totalPieces = getCuttingTotalPieces(
      { cutPieces, productStructure, totalSets: data.totalSets },
      fabric
    );

    // Calculate assemble-able sub-parts dynamically
    const availableSubParts = {};
    const subParts = productStructure?.subParts || [];
    if (subParts.length > 0) {
      subParts.forEach((sp) => {
        const comps = Array.isArray(sp.components) ? sp.components : [];
        if (comps.length > 0) {
          const pieceAvails = comps.map((c) => {
            const pieceId = c.id || c.name.toLowerCase().replace(/\s+/g, '_');
            const count = cutPieces[pieceId] !== undefined ? cutPieces[pieceId] : (cutPieces[c.name] !== undefined ? cutPieces[c.name] : 0);
            const perG = Math.max(1, parseInt(c.qty, 10) || 1);
            return Math.floor(count / perG);
          });
          availableSubParts[sp.id] = pieceAvails.length > 0 ? Math.min(...pieceAvails) : 0;
        } else {
          const pieceId = sp.id || sp.name.toLowerCase().replace(/\s+/g, '_');
          availableSubParts[sp.id] = cutPieces[pieceId] !== undefined ? cutPieces[pieceId] : (cutPieces[sp.name] !== undefined ? cutPieces[sp.name] : 0);
        }
      });
    } else {
      Object.entries(cutPieces).forEach(([k, v]) => {
        availableSubParts[k] = v;
      });
    }

    const subPartAvailVals = Object.values(availableSubParts).filter((v) => typeof v === 'number');
    const matchedSets = subPartAvailVals.length > 0 ? Math.min(...subPartAvailVals) : 0;
    availableSubParts.fullSets = matchedSets;

    const targetUserId =
      (currentUser?.role === 'Admin' ? currentUser?.id : null) ||
      currentUser?.user_id ||
      currentUser?.adminUserId ||
      fabric?.user_id ||
      fabric?.userId ||
      master?.user_id ||
      master?.userId ||
      ownerUserId;

    const validTargetUserId =
      targetUserId && !targetUserId.startsWith('mst_') && !targetUserId.startsWith('tlr_') && !targetUserId.startsWith('hlp_')
        ? targetUserId
        : null;

    const baseFabricName = fabric
      ? sanitizeFabricName(fabric.fabricType)
      : sanitizeFabricName(data.fabricName || 'Fabric Lot');
    const colorSuffix = (fabric?.color !== undefined ? fabric.color : data.fabricColor)?.trim()
      ? ` (${(fabric?.color !== undefined ? fabric.color : data.fabricColor).trim()})`
      : '';

    const newCutting = {
      id: generateEntityId('cut'),
      user_id: validTargetUserId,
      fabricId: data.fabricId || null,
      fabricName: `${baseFabricName}${colorSuffix}`,
      fabricColor: fabric?.color || '',
      supplierName: fabric?.supplierName || '',
      masterId: data.masterId || null,
      masterName: master ? master.name : (data.masterName || 'Cutting Master'),
      masterPhone: master?.phone || '',
      cutDate: data.cutDate || new Date().toISOString().split('T')[0],
      tailorRates: fabric?.tailorRates || data.tailorRates || null,
      productName,
      productStructure,
      cutPieces: normalizeCutPiecesObject(cutPieces),
      availableSubParts,
      totalPieces,
      totalSets:
        data.totalSets !== undefined && data.totalSets > 0
          ? data.totalSets
          : matchedSets > 0
            ? matchedSets
            : (subPartAvailVals.length > 0 ? Math.max(...subPartAvailVals) : 0),
      metersUsed: data.metersUsed !== undefined ? data.metersUsed : null,
      status: 'Ready for Stitching',
      notes: (data.notes || '').trim(),
      createdAt: new Date().toISOString(),
    };

    setCuttings((prev) => [newCutting, ...prev]);

    // Automatically transition in-memory fabric status to 'In Cutting' if it was 'In Stock'
    if (data.fabricId) {
      setFabrics((prev) =>
        prev.map((f) => {
          if (f.id === data.fabricId && f.status === 'In Stock') {
            return { ...f, status: 'In Cutting' };
          }
          return f;
        })
      );
    }

    // Attempt atomic stored procedure execution first; fallback to client sequence if offline/unavailable
    executeAtomicCuttingBatch(supabase, newCutting, fabric).then((rpcRes) => {
      if (rpcRes.rpcExecuted && rpcRes.success) {
        return;
      }
      saveToDb('cuttings', mapCuttingToDb, newCutting);
      if (data.fabricId) {
        const targetF = fabrics.find((f) => f.id === data.fabricId);
        if (targetF && targetF.status === 'In Stock') {
          saveToDb('fabrics', mapFabricToDb, { ...targetF, status: 'In Cutting' });
        }
      }
    }).catch(() => {
      saveToDb('cuttings', mapCuttingToDb, newCutting);
    });

    return { success: true, cutting: newCutting };
  };

  const updateCutting = (id, updates) => {
    let updatedCutting = null;

    setCuttings((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;

        const fabricId = updates.fabricId !== undefined ? updates.fabricId : c.fabricId;
        const fabric = fabrics.find((f) => f.id === fabricId);
        const masterId = updates.masterId !== undefined ? updates.masterId : c.masterId;
        const master = masters.find((m) => m.id === masterId);

        const productName =
          fabric?.productName ||
          updates.productName ||
          c.productName ||
          'Garment';
        const productStructure =
          fabric?.productStructure ||
          updates.productStructure ||
          c.productStructure ||
          getProductStructure(fabric || c);

        // Merge cutPieces ensuring numeric values
        const cutPieces = {
          ...(c.cutPieces || {}),
          ...(updates.cutPieces || {}),
        };
        Object.entries(cutPieces).forEach(([key, val]) => {
          cutPieces[key] = Math.max(0, parseInt(val, 10) || 0);
        });

        const totalPieces = getCuttingTotalPieces(
          { cutPieces, productStructure, totalSets: updates.totalSets || c.totalSets },
          fabric
        );

        // Recalculate assemble-able sub-parts dynamically
        const availableSubParts = {};
        const subParts = productStructure?.subParts || [];
        if (subParts.length > 0) {
          subParts.forEach((sp) => {
            const comps = Array.isArray(sp.components) ? sp.components : [];
            if (comps.length > 0) {
              const pieceAvails = comps.map((comp) => {
                const pieceId = comp.id || comp.name.toLowerCase().replace(/\s+/g, '_');
                const count = cutPieces[pieceId] !== undefined ? cutPieces[pieceId] : (cutPieces[comp.name] !== undefined ? cutPieces[comp.name] : 0);
                const perG = Math.max(1, parseInt(comp.qty, 10) || 1);
                return Math.floor(count / perG);
              });
              availableSubParts[sp.id] =
                pieceAvails.length > 0 ? Math.min(...pieceAvails) : 0;
            } else {
              const pieceId = sp.id || sp.name.toLowerCase().replace(/\s+/g, '_');
              availableSubParts[sp.id] = cutPieces[pieceId] !== undefined ? cutPieces[pieceId] : (cutPieces[sp.name] !== undefined ? cutPieces[sp.name] : 0);
            }
          });
        } else {
          Object.entries(cutPieces).forEach(([k, v]) => {
            availableSubParts[k] = v;
          });
        }

        const subPartAvailVals = Object.values(availableSubParts).filter(
          (v) => typeof v === 'number'
        );
        const matchedSets =
          subPartAvailVals.length > 0 ? Math.min(...subPartAvailVals) : 0;
        availableSubParts.fullSets = matchedSets;

        const colorSuffix = (fabric?.color !== undefined ? fabric.color : c.fabricColor)?.trim()
          ? ` (${(fabric?.color !== undefined ? fabric.color : c.fabricColor).trim()})`
          : '';

        const targetUserId =
          c.user_id ||
          c.userId ||
          (currentUser?.role === 'Admin' ? currentUser?.id : null) ||
          currentUser?.user_id ||
          currentUser?.adminUserId ||
          fabric?.user_id ||
          fabric?.userId ||
          master?.user_id ||
          master?.userId ||
          ownerUserId;

        const validTargetUserId =
          targetUserId && !targetUserId.startsWith('mst_') && !targetUserId.startsWith('tlr_') && !targetUserId.startsWith('hlp_')
            ? targetUserId
            : null;

        updatedCutting = {
          ...c,
          ...updates,
          user_id: validTargetUserId,
          fabricId,
          fabricName: fabric
            ? `${sanitizeFabricName(fabric.fabricType)}${colorSuffix}`
            : sanitizeFabricName(c.fabricName || 'Fabric Lot'),
          fabricColor: fabric?.color !== undefined ? fabric.color : c.fabricColor,
          supplierName:
            fabric?.supplierName !== undefined
              ? fabric.supplierName
              : c.supplierName,
          masterId,
          masterName: master ? master.name : c.masterName,
          masterPhone: master?.phone !== undefined ? master.phone : c.masterPhone,
          cutDate: updates.cutDate || c.cutDate,
          productName,
          productStructure,
          cutPieces: normalizeCutPiecesObject(cutPieces),
          availableSubParts,
          totalPieces,
          totalSets:
            updates.totalSets !== undefined && updates.totalSets > 0
              ? updates.totalSets
              : matchedSets > 0
                ? matchedSets
                : (subPartAvailVals.length > 0 ? Math.max(...subPartAvailVals) : 0),
          notes: updates.notes !== undefined ? (updates.notes || '').trim() : c.notes,
          updatedAt: new Date().toISOString(),
        };

        saveToDb('cuttings', mapCuttingToDb, updatedCutting);
        return updatedCutting;
      })
    );

    return { success: true, cutting: updatedCutting };
  };

  const deleteCutting = (id) => {
    setCuttings((prev) => prev.filter((c) => c.id !== id));
    setTailorAssignments((prev) => prev.filter((a) => a.cuttingId !== id));
    setMasterHandovers((prev) => prev.filter((h) => h.cuttingId !== id));
    setThreadCuttingAssignments((prev) => prev.filter((tc) => tc.cuttingId !== id));
    dbRemove('cuttings', id);
    return { success: true };
  };

  /**
   * Helper to calculate remaining unassigned balance for any cutting record
   */
  const getCuttingBalance = (cuttingId) => {
    const cutting = cuttings.find((c) => c.id === cuttingId);
    if (!cutting) return null;
    const fabric = fabrics.find((f) => f.id === cutting.fabricId);
    return calculateCuttingBalance({ cutting, fabric, tailorAssignments, cuttings });
  };

  /**
   * Helper to calculate remaining unassigned balance and available sub-parts for a FABRIC LOT directly
   */
  const getFabricBalance = (fabricId) => {
    const fabric = fabrics.find((f) => f.id === fabricId);
    if (!fabric) return null;
    return calculateFabricBalance({ fabric, cuttings, tailorAssignments });
  };

  /**
   * Cascade archive or unarchive a fabric lot and all its linked child entities
   */
  const toggleArchiveFabric = (fabricId, explicitValue = null) => {
    const targetFabric = (fabrics || []).find((f) => f.id === fabricId);
    if (!targetFabric) return { success: false, error: 'Fabric lot not found' };

    const nextArchived = explicitValue !== null ? Boolean(explicitValue) : !targetFabric.isArchived;
    const nowIso = new Date().toISOString();

    // 1. Update and persist target Fabric
    setFabrics((prev) =>
      (prev || []).map((f) => {
        if (f.id === fabricId) {
          const updatedFabric = {
            ...f,
            isArchived: nextArchived,
            is_archived: nextArchived,
            archivedAt: nextArchived ? nowIso : null,
            archived_at: nextArchived ? nowIso : null,
            restoredAt: !nextArchived ? nowIso : null,
            restored_at: !nextArchived ? nowIso : null,
            status: !nextArchived && (f.status === 'Completed' || f.status === 'Archived') ? 'In Cutting' : f.status,
          };
          saveToDb('fabrics', mapFabricToDb, updatedFabric);
          return updatedFabric;
        }
        return f;
      })
    );

    // Collect related cutting IDs for deeper child entity matching
    const matchingCuttingIds = new Set(
      (cuttings || [])
        .filter((c) => c.fabricId === fabricId || c.fabric_id === fabricId)
        .map((c) => c.id)
    );

    // 2. Cascade to Cuttings
    setCuttings((prev) =>
      (prev || []).map((c) => {
        if (c.fabricId === fabricId || c.fabric_id === fabricId) {
          const updatedCutting = {
            ...c,
            isArchived: nextArchived,
            is_archived: nextArchived,
            archivedAt: nextArchived ? nowIso : null,
            archived_at: nextArchived ? nowIso : null,
            restoredAt: !nextArchived ? nowIso : null,
            restored_at: !nextArchived ? nowIso : null,
          };
          saveToDb('cuttings', mapCuttingToDb, updatedCutting);
          return updatedCutting;
        }
        return c;
      })
    );

    // 3. Cascade to Tailor Assignments
    if (setTailorAssignments) {
      setTailorAssignments((prev) =>
        (prev || []).map((a) => {
          if (
            a.fabricId === fabricId ||
            a.fabric_id === fabricId ||
            matchingCuttingIds.has(a.cuttingId || a.cutting_id)
          ) {
            const updatedAssignment = {
              ...a,
              isArchived: nextArchived,
              is_archived: nextArchived,
              archivedAt: nextArchived ? nowIso : null,
              archived_at: nextArchived ? nowIso : null,
              restoredAt: !nextArchived ? nowIso : null,
              restored_at: !nextArchived ? nowIso : null,
            };
            saveToDb('tailor_assignments', mapAssignmentToDb, updatedAssignment);
            return updatedAssignment;
          }
          return a;
        })
      );
    }

    // 4. Cascade to Master Handovers
    if (setMasterHandovers) {
      setMasterHandovers((prev) =>
        (prev || []).map((h) => {
          if (
            h.fabricId === fabricId ||
            h.fabric_id === fabricId ||
            matchingCuttingIds.has(h.cuttingId || h.cutting_id)
          ) {
            const updatedHandover = {
              ...h,
              isArchived: nextArchived,
              is_archived: nextArchived,
              archivedAt: nextArchived ? nowIso : null,
              archived_at: nextArchived ? nowIso : null,
              restoredAt: !nextArchived ? nowIso : null,
              restored_at: !nextArchived ? nowIso : null,
            };
            saveToDb('master_handovers', mapHandoverToDb, updatedHandover);
            return updatedHandover;
          }
          return h;
        })
      );
    }

    // 5. Cascade to Thread Cutting Assignments
    if (setThreadCuttingAssignments) {
      setThreadCuttingAssignments((prev) =>
        (prev || []).map((tc) => {
          if (
            tc.fabricId === fabricId ||
            tc.fabric_id === fabricId ||
            matchingCuttingIds.has(tc.cuttingId || tc.cutting_id)
          ) {
            const updatedTc = {
              ...tc,
              isArchived: nextArchived,
              is_archived: nextArchived,
              archivedAt: nextArchived ? nowIso : null,
              archived_at: nextArchived ? nowIso : null,
              restoredAt: !nextArchived ? nowIso : null,
              restored_at: !nextArchived ? nowIso : null,
            };
            saveToDb('thread_cutting_assignments', mapThreadAssignmentToDb, updatedTc);
            return updatedTc;
          }
          return tc;
        })
      );
    }

    // 6. Cascade to Delivery Logs
    if (setDeliveryLogs) {
      setDeliveryLogs((prev) =>
        (prev || []).map((dl) => {
          if (
            dl.fabricId === fabricId ||
            dl.fabric_id === fabricId ||
            matchingCuttingIds.has(dl.cuttingId || dl.cutting_id)
          ) {
            const updatedDl = {
              ...dl,
              isArchived: nextArchived,
              is_archived: nextArchived,
              archivedAt: nextArchived ? nowIso : null,
              archived_at: nextArchived ? nowIso : null,
              restoredAt: !nextArchived ? nowIso : null,
              restored_at: !nextArchived ? nowIso : null,
            };
            saveToDb('delivery_logs', mapDeliveryLogToDb, updatedDl);
            return updatedDl;
          }
          return dl;
        })
      );
    }

    return { success: true, isArchived: nextArchived };
  };

  const archiveFabricLot = (fabricId) => toggleArchiveFabric(fabricId, true);
  const unarchiveFabricLot = (fabricId) => toggleArchiveFabric(fabricId, false);

  /**
   * Archive or unarchive a cutting batch
   */
  const toggleArchiveCutting = (cuttingId, explicitValue = null) => {
    setCuttings((prev) =>
      prev.map((c) => {
        if (c.id === cuttingId) {
          const nextArchived = explicitValue !== null ? Boolean(explicitValue) : !c.isArchived;
          const updatedCutting = {
            ...c,
            isArchived: nextArchived,
            archivedAt: nextArchived ? new Date().toISOString() : null,
            restoredAt: !nextArchived ? new Date().toISOString() : null,
            masterWorkDone: !nextArchived ? false : c.masterWorkDone,
            status: !nextArchived && (c.status === 'Completed' || c.status === 'Archived') ? 'Ready for Stitching' : c.status,
          };
          saveToDb('cuttings', mapCuttingToDb, updatedCutting);
          return updatedCutting;
        }
        return c;
      })
    );
    return { success: true };
  };

  return {
    addFabric,
    updateFabric,
    deleteFabric,
    saveProductTemplate,
    deleteProductTemplate,
    addCutting,
    updateCutting,
    deleteCutting,
    getCuttingBalance,
    getFabricBalance,
    getProductStructure,
    toggleArchiveFabric,
    archiveFabricLot,
    unarchiveFabricLot,
    toggleArchiveCutting,
  };
}
