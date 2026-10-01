import { sanitizeFabricName } from '../context/managementContextInstance';

/**
 * Resolve fabric and lot metadata for any order/production item across tabs
 */
export const resolveLotInfo = (item, fabricsList = [], cuttingsList = []) => {
  let fabricId = item?.fabricId || item?.fabric_id || item?.fabric?.id;
  if (!fabricId && item?.cuttingId) {
    const cutting = cuttingsList.find((c) => c.id === item.cuttingId);
    fabricId = cutting?.fabricId || cutting?.fabric_id;
  }
  const fabric = fabricsList.find((f) => f.id === fabricId) || item?.fabric || null;
  const lotNo = fabric?.lotNo ?? fabric?.lot_no ?? fabric?.lotNumber ?? null;
  const fabricType = sanitizeFabricName(
    fabric?.fabricType || fabric?.productName || item?.fabricName || 'Fabric Lot'
  );
  const color = fabric?.color || item?.fabricColor || null;
  const supplierName = fabric?.supplierName || item?.supplierName || null;
  const productName = fabric?.productName || item?.productName || null;
  const targetSets = parseInt(fabric?.targetSets ?? fabric?.printPieces ?? fabric?.productQuantity, 10) || 0;
  const plainMeters = parseFloat(fabric?.plainMeters) || 0;

  const lotKey = fabric?.id
    ? `fabric_${fabric.id}`
    : fabricId
      ? `fabric_${fabricId}`
      : item?.fabricName
        ? `name_${String(item.fabricName).trim().toLowerCase()}`
        : 'unassigned_lot';

  return {
    lotKey,
    fabric,
    fabricId,
    lotNo,
    fabricType,
    color,
    supplierName,
    productName,
    targetSets,
    plainMeters,
  };
};

/**
 * Group any list of order/production items by their resolved fabric lot
 */
export const groupItemsByLot = (items = [], fabricsList = [], cuttingsList = []) => {
  const map = new Map();

  items.forEach((item) => {
    if (!item) return;
    const lotInfo = resolveLotInfo(item, fabricsList, cuttingsList);
    if (!map.has(lotInfo.lotKey)) {
      map.set(lotInfo.lotKey, {
        ...lotInfo,
        items: [],
      });
    }
    map.get(lotInfo.lotKey).items.push(item);
  });

  return Array.from(map.values()).sort((a, b) => {
    const aNum = parseInt(a.lotNo, 10) || 0;
    const bNum = parseInt(b.lotNo, 10) || 0;
    if (aNum && bNum && aNum !== bNum) return bNum - aNum;
    if (aNum && !bNum) return -1;
    if (!aNum && bNum) return 1;
    return a.fabricType.localeCompare(b.fabricType);
  });
};
