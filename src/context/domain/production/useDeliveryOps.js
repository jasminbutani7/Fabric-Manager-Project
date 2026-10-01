import { sanitizeFabricName } from '../../managementContextInstance';
import {
  cleanNoteString,
  mapDeliveryLogToDb,
  mapFabricToDb,
  mapCuttingToDb,
  mapThreadAssignmentToDb,
} from '../../../services/dbMappers';
import { calculateReadyProductSets } from '../../../utils/productUtils';
import { generateEntityId } from '../../../utils/idGenerator';

export function useDeliveryOps(params) {
  const {
    tailorAssignments,
    masterHandovers,
    threadCuttingAssignments,
    setThreadCuttingAssignments,
    setDeliveryLogs,
    fabrics,
    setFabrics,
    cuttings,
    setCuttings,
    suppliers,
    invoices,
    saveToDb,
    ownerUserId,
  } = params;
  const deliverGoodsToSupplier = (deliveryData) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const deliveredQty = parseInt(deliveryData.deliveredPSC, 10) || 0;

    if (deliveredQty <= 0) {
      return { success: false, error: 'Please specify a valid delivery quantity (greater than 0).' };
    }

    const linkedCutting = cuttings.find((c) => c.id === deliveryData.cuttingId);
    const linkedFabric = fabrics.find(
      (f) => f.id === (deliveryData.fabricId || linkedCutting?.fabricId)
    );
    const linkedSupplier = suppliers.find(
      (s) => s.id === (deliveryData.supplierId || linkedFabric?.supplierId)
    );

    const supplierName = (
      deliveryData.supplierName ||
      linkedFabric?.supplierName ||
      linkedSupplier?.name ||
      'Supplier'
    ).trim();

    const supplierPhone = (
      deliveryData.supplierPhone ||
      linkedFabric?.supplierPhone ||
      linkedSupplier?.phone ||
      ''
    ).trim();

    const colorPart = linkedFabric?.color?.trim() ? ` (${linkedFabric.color.trim()})` : '';
    const fabricName = sanitizeFabricName(
      deliveryData.fabricName ||
      linkedCutting?.fabricName ||
      (linkedFabric ? `${sanitizeFabricName(linkedFabric.fabricType)}${colorPart}` : 'Finished Garments')
    );

    const pricePerSet = parseFloat(
      deliveryData.pricePerSet ||
      deliveryData.pricePerPiece ||
      deliveryData.pricePerPSC ||
      linkedFabric?.pricePerSet ||
      linkedFabric?.pricePerPiece
    ) || 0;

    let struct = linkedFabric?.productStructure || linkedFabric?.product_structure;
    if (typeof struct === 'string') {
      try { struct = JSON.parse(struct); } catch {}
    }
    const parts = struct?.subParts || struct?.parts || [];
    const piecesPerSet = parts.length > 0
      ? parts.reduce((sum, sp) => sum + (parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1), 0)
      : (parseInt(linkedFabric?.piecesPerSet, 10) || 1);

    const pieceRate = piecesPerSet > 0 ? (pricePerSet / piecesPerSet) : pricePerSet;

    const subPartQtys = deliveryData.subPartQuantities || {};
    const subPartEntries = Object.entries(subPartQtys).filter(([, q]) => (parseInt(q, 10) || 0) > 0);

    let invoiceItems = [];
    if (parts.length > 0 && subPartEntries.length > 0) {
      const partRatios = parts.map((p, idx) => {
        const normK = (p.id || p.name || `part_${idx + 1}`).toLowerCase().trim();
        const ratio = parseInt(p.qty || p.ratio || p.piecesPerSet, 10) || 1;
        const count = parseInt(subPartQtys[normK], 10) || 0;
        const spName = p.name || p.id || `Part ${idx + 1}`;
        return { normK, spName, ratio, count };
      });

      const hasAll = parts.every((p, idx) => {
        const normK = (p.id || p.name || `part_${idx + 1}`).toLowerCase().trim();
        return (parseInt(subPartQtys[normK], 10) || 0) > 0;
      });

      const completeSets = hasAll && partRatios.length > 0
        ? Math.min(...partRatios.map((p) => Math.floor(p.count / p.ratio)))
        : 0;

      if (completeSets > 0) {
        invoiceItems.push({
          description: `${fabricName} (${completeSets} Sets)`,
          fabricId: linkedFabric?.id || deliveryData.fabricId || null,
          fabricName,
          quantity: completeSets,
          unitPrice: pricePerSet,
          amount: completeSets * pricePerSet,
          unit: 'Sets',
        });
      }

      partRatios.forEach((p) => {
        const used = completeSets * p.ratio;
        const rem = Math.max(0, p.count - used);
        if (rem > 0) {
          const singlePieceRate = Math.round(pieceRate * 100) / 100;
          invoiceItems.push({
            description: `${fabricName} - Extra ${p.spName} (${rem} PCs)`,
            subPart: p.normK,
            pieceName: p.spName,
            fabricId: linkedFabric?.id || deliveryData.fabricId || null,
            fabricName,
            quantity: rem,
            unitPrice: singlePieceRate,
            amount: rem * singlePieceRate,
            unit: 'PCs',
          });
        }
      });
    } else if (subPartEntries.length > 0) {
      invoiceItems = subPartEntries.map(([spKey, q]) => {
        const qty = parseInt(q, 10);
        const normK = spKey.toLowerCase().trim();
        const spName = spKey.charAt(0).toUpperCase() + spKey.slice(1);
        const singlePieceRate = Math.round(pieceRate * 100) / 100;
        return {
          description: `${fabricName} - ${spName} (${qty} PCs)`,
          subPart: normK,
          pieceName: spName,
          fabricId: linkedFabric?.id || deliveryData.fabricId || null,
          fabricName,
          quantity: qty,
          unitPrice: singlePieceRate,
          amount: qty * singlePieceRate,
          unit: 'PCs',
        };
      });
    } else {
      const sets = piecesPerSet > 0 ? Math.floor(deliveredQty / piecesPerSet) : deliveredQty;
      const rem = piecesPerSet > 0 ? (deliveredQty % piecesPerSet) : 0;
      const singlePieceRate = piecesPerSet > 0 ? Math.round((pricePerSet / piecesPerSet) * 100) / 100 : pricePerSet;

      if (sets > 0) {
        invoiceItems.push({
          description: `${fabricName} (${sets} Sets)`,
          fabricId: linkedFabric?.id || deliveryData.fabricId || null,
          fabricName,
          quantity: sets,
          unitPrice: pricePerSet,
          amount: sets * pricePerSet,
          unit: 'Sets',
        });
      }
      if (rem > 0) {
        invoiceItems.push({
          description: `${fabricName} - Extra Pieces (${rem} PCs)`,
          fabricId: linkedFabric?.id || deliveryData.fabricId || null,
          fabricName,
          quantity: rem,
          unitPrice: singlePieceRate,
          amount: rem * singlePieceRate,
          unit: 'PCs',
        });
      }
    }

    const calculatedTotalAmount = invoiceItems.reduce((sum, it) => sum + (it.amount || 0), 0);
    const targetFabricId = linkedFabric?.id || deliveryData.fabricId;

    const deliveryLogRecord = {
      id: generateEntityId('dlv'),
      userId: linkedFabric?.user_id || linkedFabric?.userId || ownerUserId,
      user_id: linkedFabric?.user_id || linkedFabric?.userId || ownerUserId,
      fabricId: targetFabricId,
      fabric_id: targetFabricId,
      cuttingId: deliveryData.cuttingId || null,
      cutting_id: deliveryData.cuttingId || null,
      threadJobId: deliveryData.threadJobId || null,
      thread_job_id: deliveryData.threadJobId || null,
      invoiceId: null,
      invoice_id: null,
      invoiceNumber: null,
      invoice_number: null,
      supplierId: linkedSupplier?.id || linkedFabric?.supplierId || null,
      supplier_id: linkedSupplier?.id || linkedFabric?.supplierId || null,
      supplierName,
      supplier_name: supplierName,
      supplierPhone,
      supplier_phone: supplierPhone,
      totalPieces: deliveredQty,
      total_pieces: deliveredQty,
      deliveredPSC: deliveredQty,
      subParts: deliveryData.subPartQuantities || {},
      subPartQuantities: deliveryData.subPartQuantities || {},
      sub_parts: deliveryData.subPartQuantities || {},
      pricePerSet,
      price_per_set: pricePerSet,
      pricePerPSC: Math.round(pieceRate * 100) / 100,
      price_per_piece: Math.round(pieceRate * 100) / 100,
      totalAmount: calculatedTotalAmount,
      total_amount: calculatedTotalAmount,
      deliveryDate: deliveryData.deliveryDate || todayStr,
      delivery_date: deliveryData.deliveryDate || todayStr,
      dueDate: deliveryData.dueDate || '',
      due_date: deliveryData.dueDate || null,
      vehicleNo: deliveryData.vehicleNo || '',
      vehicle_no: deliveryData.vehicleNo || null,
      notes: deliveryData.notes || '',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    setDeliveryLogs((prev) => [deliveryLogRecord, ...prev]);
    saveToDb('delivery_logs', mapDeliveryLogToDb, deliveryLogRecord);

    const readySet = calculateReadyProductSets(linkedFabric, {
      cuttings,
      masterHandovers,
      threadCuttingAssignments,
      invoices,
    });
    const remainingBeforeThisDelivery =
      readySet.totalVerifiedPieces > 0
        ? readySet.totalVerifiedPieces
        : (readySet.readyProductsCount > 0 ? readySet.readyProductsCount : deliveredQty);
    const isFullyDelivered = deliveredQty >= remainingBeforeThisDelivery;

    if (deliveryData.threadJobId) {
      setThreadCuttingAssignments((prev) =>
        prev.map((tc) => {
          if (tc.id === deliveryData.threadJobId) {
            const updatedTc = {
              ...tc,
              isDelivered: isFullyDelivered,
              deliveredPSC: (tc.deliveredPSC || 0) + deliveredQty,
              deliveryDate: deliveryData.deliveryDate || todayStr,
              status: 'Completed',
              completionDate: tc.completionDate || todayStr,
              updatedAt: new Date().toISOString(),
            };
            saveToDb('thread_cutting_assignments', mapThreadAssignmentToDb, updatedTc);
            return updatedTc;
          }
          return tc;
        })
      );
    } else if (deliveryData.cuttingId) {
      setThreadCuttingAssignments((prev) =>
        prev.map((tc) => {
          if (tc.cuttingId === deliveryData.cuttingId) {
            const updatedTc = {
              ...tc,
              isDelivered: isFullyDelivered,
              deliveredPSC: (tc.deliveredPSC || 0) + deliveredQty,
              deliveryDate: deliveryData.deliveryDate || todayStr,
              status: 'Completed',
              completionDate: tc.completionDate || todayStr,
              updatedAt: new Date().toISOString(),
            };
            saveToDb('thread_cutting_assignments', mapThreadAssignmentToDb, updatedTc);
            return updatedTc;
          }
          return tc;
        })
      );
    }

    if (deliveryData.cuttingId) {
      setCuttings((prev) =>
        prev.map((c) => {
          if (c.id === deliveryData.cuttingId) {
            const totalDeliveredForCutting = (c.deliveredPSC || 0) + deliveredQty;
            const totalCuttingPieces = parseInt(c.totalPieces || c.total_pieces, 10) || 0;
            const isCuttingFullyDelivered = totalCuttingPieces > 0
              ? totalDeliveredForCutting >= totalCuttingPieces
              : false;
            const updatedCutting = {
              ...c,
              isDelivered: isCuttingFullyDelivered,
              deliveredPSC: totalDeliveredForCutting,
              deliveryDate: deliveryData.deliveryDate || todayStr,
              status: isCuttingFullyDelivered ? 'Delivered' : (c.status === 'Delivered' ? 'Completed' : c.status),
              updatedAt: new Date().toISOString(),
            };
            saveToDb('cuttings', mapCuttingToDb, updatedCutting);
            return updatedCutting;
          }
          return c;
        })
      );
    }

    if (targetFabricId) {
      setFabrics((prev) =>
        prev.map((f) => {
          if (f.id === targetFabricId) {
            const totalDeliveredForFabric = (f.deliveredPSC || 0) + deliveredQty;

            let struct = f.productStructure || f.product_structure;
            if (typeof struct === 'string') {
              try { struct = JSON.parse(struct); } catch { struct = null; }
            }
            const lotSubParts = Array.isArray(struct?.subParts) && struct.subParts.length > 0
              ? struct.subParts
              : Array.isArray(struct?.parts) && struct.parts.length > 0
                ? struct.parts
                : [];
            const subPartsCount = Math.max(1, lotSubParts.length);

            const fabricCuttings = cuttings.filter((c) => c.fabricId === f.id || c.fabric_id === f.id);
            const totalCutSets = fabricCuttings.reduce((sum, c) => sum + (parseInt(c.setsCount || c.totalSets, 10) || 0), 0);
            const totalCutPieces = fabricCuttings.reduce((sum, c) => sum + (parseInt(c.totalPieces, 10) || 0), 0);
            const targetSets = parseInt(
              f.targetSets ?? f.printPieces ?? f.productQuantity ?? f.expectedSets ?? f.expected_sets,
              10
            ) || totalCutSets || 0;
            const targetGarmentPieces = targetSets > 0
              ? targetSets * subPartsCount
              : (parseInt(f.printPieces || f.productQuantity || f.totalPieces, 10) || totalCutPieces || 0);

            const fabricAssignments = tailorAssignments.filter(
              (a) => a.fabricId === f.id || fabricCuttings.some((c) => c.id === a.cuttingId)
            );
            const hasActiveTailors = fabricAssignments.some((a) => !a.isArchived && a.status !== 'Completed');

            const effectiveCutSets = totalCutSets > 0
              ? totalCutSets
              : (subPartsCount > 0 && totalCutPieces > 0 ? Math.floor(totalCutPieces / subPartsCount) : totalCutSets);

            const prevSubs = f.subPartsDelivered || f.sub_parts_delivered || {};
            const updatedSubs = { ...prevSubs };
            if (deliveryData.subPartQuantities) {
              Object.entries(deliveryData.subPartQuantities).forEach(([k, q]) => {
                const cleanK = k.toLowerCase().trim();
                updatedSubs[cleanK] = (updatedSubs[cleanK] || 0) + (parseInt(q, 10) || 0);
              });
            }

            const allSubPartsDelivered = lotSubParts.length > 1
              ? lotSubParts.every((sp) => {
                  const spKey = (sp.id || sp.name || '').toLowerCase().trim();
                  const delPartCount = updatedSubs[spKey] || 0;
                  const ratio = parseInt(sp.qty || sp.ratio || sp.piecesPerSet, 10) || 1;
                  const targetForPart = targetSets > 0 ? targetSets * ratio : (totalCutPieces > 0 ? Math.floor(totalCutPieces / lotSubParts.length) : 1);
                  return delPartCount >= targetForPart;
                })
              : true;

            // Lot is ONLY fully delivered if ALL pieces/sets and all subparts of the lot are delivered
            const isFabricFullyDelivered =
              !hasActiveTailors &&
              allSubPartsDelivered &&
              totalDeliveredForFabric > 0 &&
              (
                (targetGarmentPieces > 0 && totalDeliveredForFabric >= targetGarmentPieces) ||
                (totalCutPieces > 0 && totalDeliveredForFabric >= totalCutPieces)
              ) &&
              (
                targetSets > 0
                  ? (effectiveCutSets >= targetSets || totalDeliveredForFabric >= (targetSets * subPartsCount))
                  : true
              );

            if (isFabricFullyDelivered) {
              setCuttings((prev) =>
                prev.map((c) => {
                  if (c.fabricId === f.id || c.fabric_id === f.id) {
                    const updatedCutting = {
                      ...c,
                      isDelivered: true,
                      status: 'Delivered',
                      updatedAt: new Date().toISOString(),
                    };
                    saveToDb('cuttings', mapCuttingToDb, updatedCutting);
                    return updatedCutting;
                  }
                  return c;
                })
              );
            }

            const existingLogs = Array.isArray(f.deliveryLogs)
              ? f.deliveryLogs
              : (Array.isArray(f.delivery_logs) ? f.delivery_logs : []);
            const updatedLogs = [deliveryLogRecord, ...existingLogs];

            const updatedFabric = {
              ...f,
              status: isFabricFullyDelivered ? 'Delivered' : (f.status === 'Delivered' ? 'In Stitching' : f.status),
              isDelivered: isFabricFullyDelivered,
              deliveredPSC: totalDeliveredForFabric,
              subPartsDelivered: updatedSubs,
              deliveryLogs: updatedLogs,
              deliveryDate: deliveryData.deliveryDate || todayStr,
              notes: cleanNoteString(f.notes) || cleanNoteString(f._userNotes) || null,
              updatedAt: new Date().toISOString(),
            };
            saveToDb('fabrics', mapFabricToDb, updatedFabric);
            return updatedFabric;
          }
          return f;
        })
      );
    }

    return { success: true, deliveryLog: deliveryLogRecord };
  };


  return {
    deliverGoodsToSupplier,
  };
}
