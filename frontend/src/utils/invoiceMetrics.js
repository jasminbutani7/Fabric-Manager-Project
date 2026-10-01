import { getProductStructure } from '../services/dbMappers';
import { generateEntityId } from './idGenerator';

/**
 * Calculates total, invoiced, delivered, and remaining sets & pieces for any given fabric.
 *
 * @param {Object} fabric - Fabric entity
 * @param {Array} invoices - All existing invoices in system
 * @param {Array} deliveryLogs - All delivery logs in system
 * @param {string|null} invoiceToEditId - Current invoice ID being edited (to exclude from double-counting)
 * @returns {Object} Invoice metrics breakdown
 */
export function getFabricInvoiceMetrics(fabric, invoices = [], deliveryLogs = [], invoiceToEditId = null) {
  if (!fabric) {
    return {
      totalLotSets: 0,
      alreadyInvoicedSets: 0,
      remainingFabricSets: 0,
      subParts: [],
      hasSubParts: false,
      numSubParts: 1,
      invoicedBySubpart: {},
      remainingBySubpart: {},
      allSubPartsFullyInvoiced: false,
      hasAnyDelivery: false,
      hasPendingDeliveredToInvoice: false,
      deliveredBySubpart: {},
      existingInvoices: [],
    };
  }

  const struct = getProductStructure(fabric);
  const subParts = struct?.subParts || [];
  const hasSubParts = subParts.length > 1;
  const numSubParts = hasSubParts ? subParts.length : 1;

  // Delivery logs & delivered sets calculation
  const lotDeliveryLogs = (deliveryLogs || []).filter(
    (dl) => dl.fabricId === fabric.id || dl.fabric_id === fabric.id
  );
  const totalDeliveredFromLogs = lotDeliveryLogs.reduce(
    (sum, dl) => sum + (parseInt(dl.totalPieces ?? dl.total_pieces ?? dl.deliveredPSC ?? dl.quantity, 10) || 0),
    0
  );
  const totalDeliveredPieces = Math.max(
    totalDeliveredFromLogs,
    parseInt(fabric.deliveredPSC || fabric.delivered_psc, 10) || 0
  );
  const deliveredSets = Math.floor(totalDeliveredPieces / numSubParts);
  const expectedSets = parseInt(fabric.productQuantity || fabric.printPieces || fabric.plainMeters || fabric.expectedSets || '0', 10) || 0;
  const totalLotSets = Math.max(deliveredSets, expectedSets);

  const existingInvoices = (invoices || []).filter(
    (inv) => (inv.fabricId === fabric.id || inv.id === fabric.invoiceId) && (!invoiceToEditId || inv.id !== invoiceToEditId)
  );

  // Track invoiced & remaining counts per subpart
  const invoicedBySubpart = {};
  const remainingBySubpart = {};

  if (hasSubParts) {
    subParts.forEach((sp) => {
      const spKey = sp.id || sp.name;
      const invoicedForSp = existingInvoices.reduce((sum, inv) => {
        if (!Array.isArray(inv.items) || inv.items.length === 0) {
          return sum + (parseInt(inv.setQuantity, 10) || 0) * (parseInt(sp.qty || 1, 10) || 1);
        }
        const matchingItem = inv.items.find((it) => {
          if (it.subPartId && sp.id && String(it.subPartId) === String(sp.id)) return true;
          if (it.subPartName && sp.name && it.subPartName.toLowerCase().trim() === sp.name.toLowerCase().trim()) return true;
          if (it.description && sp.name && it.description.toLowerCase().includes(sp.name.toLowerCase().trim())) return true;
          return false;
        });
        return sum + (matchingItem ? (parseInt(matchingItem.quantity, 10) || 0) : 0);
      }, 0);

      invoicedBySubpart[spKey] = invoicedForSp;
    });
  }

  const alreadyInvoicedSets = existingInvoices.reduce(
    (acc, inv) => acc + (parseInt(inv.setQuantity, 10) || (inv.items && inv.items.length > 0 ? parseInt(inv.items[0].quantity, 10) : 0) || 0),
    0
  );

  // Calculate delivered counts per subpart from fabric state and delivery logs
  const subsDel = fabric.subPartsDelivered || fabric.sub_parts_delivered || {};
  const lotLogs = Array.isArray(fabric.deliveryLogs) ? fabric.deliveryLogs : [];
  const deliveredBySubpart = {};

  if (hasSubParts) {
    subParts.forEach((sp) => {
      const spId = (sp.id || '').toLowerCase().trim();
      const spName = (sp.name || '').toLowerCase().trim();
      let delCount = 0;
      Object.entries(subsDel).forEach(([k, v]) => {
        const cleanK = k.toLowerCase().trim();
        if (cleanK === spId || cleanK === spName) {
          delCount = Math.max(delCount, parseInt(v, 10) || 0);
        }
      });
      let logCount = 0;
      lotLogs.forEach((log) => {
        const logSubs = log.subParts || log.subPartQuantities || log.sub_parts || {};
        Object.entries(logSubs).forEach(([k, v]) => {
          const cleanK = k.toLowerCase().trim();
          if (cleanK === spId || cleanK === spName) {
            logCount += (parseInt(v, 10) || 0);
          }
        });
      });
      const targetKey = sp.id || sp.name;
      deliveredBySubpart[targetKey] = Math.max(delCount, logCount);
    });
  }

  const hasAnyDelivery =
    Object.values(deliveredBySubpart).some((v) => v > 0) ||
    (parseInt(fabric.deliveredPSC, 10) || 0) > 0 ||
    lotLogs.length > 0;

  const deliveredUninvoicedBySubpart = {};
  if (hasSubParts) {
    subParts.forEach((sp) => {
      const spKey = sp.id || sp.name;
      const invoicedCount = invoicedBySubpart[spKey] || 0;
      const delCount = deliveredBySubpart[spKey] || 0;
      deliveredUninvoicedBySubpart[spKey] = Math.max(0, delCount - invoicedCount);
    });
  }

  const hasPendingDeliveredToInvoice = Object.values(deliveredUninvoicedBySubpart).some((v) => v > 0);

  if (hasSubParts) {
    subParts.forEach((sp) => {
      const spKey = sp.id || sp.name;
      const totalForSp = totalLotSets * (parseInt(sp.qty || 1, 10) || 1);
      const invoicedForSp = invoicedBySubpart[spKey] || 0;
      if (hasPendingDeliveredToInvoice) {
        remainingBySubpart[spKey] = deliveredUninvoicedBySubpart[spKey];
      } else {
        remainingBySubpart[spKey] = Math.max(0, totalForSp - invoicedForSp);
      }
    });
  }

  const remainingFabricSets = hasSubParts
    ? Math.min(...subParts.map((sp) => remainingBySubpart[sp.id || sp.name] ?? 0))
    : (hasAnyDelivery && Math.max(0, (parseInt(fabric.deliveredPSC, 10) || 0) - alreadyInvoicedSets) > 0
      ? Math.max(0, (parseInt(fabric.deliveredPSC, 10) || 0) - alreadyInvoicedSets)
      : Math.max(0, totalLotSets - alreadyInvoicedSets));

  const allSubPartsFullyInvoiced = hasSubParts
    ? subParts.every((sp) => {
        const spKey = sp.id || sp.name;
        const totalForSp = totalLotSets * (parseInt(sp.qty || 1, 10) || 1);
        return (invoicedBySubpart[spKey] || 0) >= totalForSp;
      })
    : alreadyInvoicedSets >= totalLotSets && totalLotSets > 0;

  return {
    totalLotSets,
    alreadyInvoicedSets,
    remainingFabricSets,
    subParts,
    hasSubParts,
    numSubParts,
    invoicedBySubpart,
    remainingBySubpart,
    allSubPartsFullyInvoiced,
    hasAnyDelivery,
    hasPendingDeliveredToInvoice,
    deliveredBySubpart,
    existingInvoices,
  };
}

/**
 * Generates default invoice line items based on fabric product structure, rates, and quantities.
 *
 * @param {Object} fabric - Fabric entity
 * @param {string|number} setQty - Set quantity
 * @param {string|number} setRate - Selling rate per set
 * @param {Object|null} subPartQuantities - Optional map of subpart quantities
 * @returns {Array} List of invoice line items
 */
export function createItemsForFabric(fabric, setQty = '0', setRate = '0', subPartQuantities = null) {
  if (!fabric) {
    return [
      {
        id: 'it_1',
        description: '',
        quantity: String(setQty ?? '0'),
        unitPrice: String(setRate || '0'),
        isSubPart: false,
      },
    ];
  }
  const struct = getProductStructure(fabric);
  const subParts = struct?.subParts || [];
  const baseName = fabric.fabricType || 'Fabric';

  if (subParts.length > 1) {
    const totalSubparts = subParts.length;
    const numericRate = parseFloat(setRate) || 0;
    const pieceRate = Math.round((numericRate / totalSubparts) * 100) / 100;
    return subParts.map((sp, idx) => {
      const partName = sp.name || sp.id || `PC ${idx + 1}`;
      let itemQty = String(setQty ?? '0');
      if (subPartQuantities && typeof subPartQuantities === 'object') {
        const spKey = sp.id || sp.name;
        if (subPartQuantities[spKey] !== undefined) {
          itemQty = String(subPartQuantities[spKey]);
        }
      }
      return {
        id: generateEntityId('it'),
        description: `${baseName} - ${partName}`,
        subPartId: sp.id,
        subPartName: partName,
        quantity: itemQty,
        unitPrice: String(pieceRate),
        isSubPart: true,
      };
    });
  }

  return [
    {
      id: 'it_1',
      description: `${baseName} - ${fabric.color || 'Standard'}`,
      quantity: String(setQty ?? '0'),
      unitPrice: String(setRate || '0'),
      isSubPart: false,
    },
  ];
}
