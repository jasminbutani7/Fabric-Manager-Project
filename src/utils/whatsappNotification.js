import { calculateReadyProductSets } from './productUtils';

export const buildFabricLotWhatsAppMessage = (f, {
  cuttings = [],
  tailorAssignments = [],
  invoices = [],
  masterHandovers = [],
  threadCuttingAssignments = [],
  masters = [],
  companyName = 'Fabric Manager',
}) => {
  if (!f) return '';

  const linkedCuttings = cuttings.filter((c) => c.fabricId === f.id);
  const linkedCuttingIds = linkedCuttings.map((c) => c.id);

  const linkedTailors = tailorAssignments.filter(
    (a) => a.fabricId === f.id || linkedCuttingIds.includes(a.cuttingId)
  );

  const linkedInvoicesList = invoices.filter(
    (inv) =>
      inv.fabricId === f.id ||
      inv.id === f.invoiceId ||
      linkedCuttings.some((c) => c.invoiceId === inv.id)
  );

  const readySetData = calculateReadyProductSets(f, {
    cuttings,
    masterHandovers,
    threadCuttingAssignments,
    invoices,
  });

  const masterObj =
    masters.find((m) => m.id === f.assignedMasterId) ||
    masters.find(
      (m) =>
        m.name &&
        f.assignedMasterName &&
        m.name.trim().toLowerCase() === f.assignedMasterName.trim().toLowerCase()
    );

  let struct = f.productStructure || f.product_structure;
  if (typeof struct === 'string') {
    try {
      struct = JSON.parse(struct);
    } catch {
      struct = null;
    }
  }
  const lotSubParts =
    Array.isArray(struct?.subParts) && struct.subParts.length > 0
      ? struct.subParts
      : Array.isArray(struct?.parts) && struct.parts.length > 0
        ? struct.parts
        : [];

  // Extract cut pieces names with rate & qty
  let cutPiecesList = [];
  if (lotSubParts.length > 0) {
    cutPiecesList = lotSubParts.map((sp) => {
      const rate = sp.rate || sp.stitchingRate ? `₹${sp.rate || sp.stitchingRate}/pc` : '';
      const qty = sp.qty || sp.piecesPerSet ? `${sp.qty || sp.piecesPerSet} pc` : '';
      const rateQty = [qty, rate].filter(Boolean).join(' @ ');
      return `${sp.name || 'Piece'}${rateQty ? ` (${rateQty})` : ''}`;
    });
  } else if (linkedCuttings.length > 0) {
    const foundNames = new Set();
    linkedCuttings.forEach((c) => {
      const pObj =
        c.subParts && typeof c.subParts === 'object'
          ? c.subParts
          : c.parts && typeof c.parts === 'object'
            ? c.parts
            : null;
      if (pObj) Object.keys(pObj).forEach((name) => foundNames.add(name));
    });
    if (foundNames.size > 0) cutPiecesList = Array.from(foundNames);
  }

  const totalCutPieces = linkedCuttings.reduce(
    (acc, c) => acc + (parseInt(c.totalPieces, 10) || 0),
    0
  );
  const totalCutSets = linkedCuttings.reduce(
    (acc, c) => acc + (parseInt(c.setsCount || c.totalSets, 10) || 0),
    0
  );
  const totalStitchedPieces = linkedTailors.reduce((acc, a) => {
    const fromSubs = (a.dailySubmissions || [])
      .filter((s) => s.approvalStatus === 'Approved')
      .reduce((sSum, s) => sSum + (parseInt(s.quantity, 10) || 0), 0);
    return acc + (parseInt(a.completedQuantity, 10) || fromSubs || 0);
  }, 0);

  const subPartsCount = Math.max(1, lotSubParts.length);
  const targetSets = parseInt(f.printPieces || f.productQuantity, 10) || totalCutSets || 0;
  const totalTargetGarmentPieces =
    targetSets > 0 ? targetSets * subPartsCount : totalStitchedPieces;
  const stitchingPercent =
    totalTargetGarmentPieces > 0
      ? Math.min(100, Math.round((totalStitchedPieces / totalTargetGarmentPieces) * 100))
      : 0;

  const completedSets =
    readySetData.totalCompletedSets !== undefined
      ? readySetData.totalCompletedSets
      : readySetData.readyProductsCount +
        Math.floor((readySetData.alreadyDeliveredPieces || 0) / subPartsCount);
  const completedPercent =
    targetSets > 0 ? Math.min(100, Math.round((completedSets / targetSets) * 100)) : 0;

  const lotTitle = `${f.fabricType || 'Fabric Lot'}${f.color ? ` (${f.color})` : ''}${f.lotNo ? ` #${f.lotNo}` : ''}`;
  const company = companyName || 'Fabric Manager';
  const isUnderReview = f.status === 'In Stock' && f.assignedMasterId;

  const statusEmoji =
    f.status === 'Delivered'
      ? '✅'
      : f.status === 'In Cutting'
        ? '✂️'
        : isUnderReview
          ? '⏳'
          : '📦';

  let msg = `🏭 *${company.toUpperCase()}* • *FABRIC LOT UPDATE*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📦 *Lot:* *${lotTitle}*\n`;
  msg += `🏢 *Supplier:* ${f.supplierName || 'Direct / Stock'}\n`;
  msg += `📊 *Status:* ${statusEmoji} *${isUnderReview ? 'Under Review (Pending Master)' : f.status || 'In Stock'}*\n`;
  msg += `📅 *Date:* ${f.date || 'N/A'}${f.dueDate ? ` | *Due:* ${f.dueDate}` : ''}\n`;
  msg += `📏 *Fabric Stock:* ${f.plainMeters ? `${f.plainMeters}m Plain` : ''}${f.plainMeters && f.printPieces ? ' • ' : ''}${f.printPieces ? `${f.printPieces} Target Sets` : ''}\n`;

  // 1. Product & Cut Pieces
  const prodName = f.productName || struct?.productName || 'Garment';
  msg += `\n✂️ *PRODUCT & CUT PIECES:*\n`;
  msg += `• *Design:* ${prodName}\n`;
  msg += `• *Cut Pieces:* ${cutPiecesList.length > 0 ? cutPiecesList.join(', ') : 'Pending Setup'}\n`;

  // 2. Cutting Master Custody
  msg += `\n👤 *CUTTING MASTER:*\n`;
  if (f.assignedMasterName) {
    msg += `• *Master:* ${f.assignedMasterName}${masterObj?.phone ? ` (📞 ${masterObj.phone})` : ''}\n`;
    msg += `• *Custody:* ${isUnderReview ? 'Awaiting Acceptance' : 'In Custody'}${f.dueDate ? ` (Due: ${f.dueDate})` : ''}\n`;
  } else {
    msg += `• *Master:* Not assigned yet\n`;
  }

  // 3. Production Progress
  msg += `\n⚙️ *PRODUCTION PROGRESS:*\n`;
  msg += `• *Cutting:* ${totalCutPieces > 0 ? `${totalCutPieces} Pcs Cut (${totalCutSets} Sets)` : 'Pending'}\n`;
  if (totalStitchedPieces > 0) {
    const tailorNames = [...new Set(linkedTailors.map((t) => t.tailorName).filter(Boolean))];
    const tailorTag = tailorNames.length > 0 ? ` by ${tailorNames.slice(0, 2).join(', ')}` : '';
    msg += `• *Stitching:* ${totalStitchedPieces}/${totalTargetGarmentPieces || totalStitchedPieces} Pcs (${stitchingPercent}%)${tailorTag}\n`;
  } else {
    msg += `• *Stitching:* Pending\n`;
  }
  msg += `• *Ready Sets:* *${readySetData.readyProductsCount || 0} Sets* Ready for Delivery\n`;
  if (completedSets > 0 && targetSets > 0) {
    msg += `• *Fulfillment:* ${completedSets}/${targetSets} Sets (${completedPercent}%)\n`;
  }
  if (f.status === 'Delivered' || readySetData.alreadyDeliveredPieces > 0) {
    msg += `• *Delivered:* ${f.status === 'Delivered' ? 'Yes (Full Lot Delivered)' : `${readySetData.alreadyDeliveredPieces} Pcs Delivered`}\n`;
  }

  // 4. Financials & Billing
  const finItems = [];
  if (f.ratePerMeter) finItems.push(`Rate: ₹${f.ratePerMeter}/m`);
  if (f.sellingPrice || f.pricePerSet) finItems.push(`Selling: ₹${f.sellingPrice || f.pricePerSet}/Set`);
  if (linkedInvoicesList.length > 0) {
    const invStrs = linkedInvoicesList.map(
      (inv) => `#${inv.invoiceNumber} (₹${Number(inv.totalAmount || 0).toLocaleString('en-IN')})`
    );
    finItems.push(`Invoices: ${invStrs.join(', ')}`);
  }
  if (finItems.length > 0) {
    msg += `\n💰 *FINANCIALS:*\n• ${finItems.join(' • ')}\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Sent from Fabric Manager_`;

  return msg;
};

export const openFabricLotWhatsAppShare = (f, options, onNotified) => {
  const msg = buildFabricLotWhatsAppMessage(f, options);
  if (!msg) return;

  const adminPhone = options.currentUserPhone || '';
  const cleanPhone = adminPhone.replace(/\D/g, '');
  let waUrl = '';
  if (cleanPhone.length >= 10) {
    waUrl = `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(msg)}`;
  } else {
    waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  }

  window.open(waUrl, '_blank');
  if (onNotified) {
    const lotTitle = `${f.fabricType || 'Fabric Lot'}${f.color ? ` (${f.color})` : ''}${f.lotNo ? ` #${f.lotNo}` : ''}`;
    onNotified(`Specific summary prepared and WhatsApp opened for ${lotTitle}!`);
  }
};
