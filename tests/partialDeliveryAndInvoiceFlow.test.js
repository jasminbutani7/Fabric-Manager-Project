import { describe, it, expect } from 'vitest';
import { calculateReadyProductSets, isLotFullyDelivered } from '../src/utils/deliveryUtils';

describe('Workflow: Partial Subpart Delivery and Invoice Lifecycle', () => {
  const fabricLot = {
    id: 'fab_suit_500',
    fabricType: 'Premium Cotton Blend',
    lotNo: 42,
    productName: 'Designer Kurti Suit',
    productQuantity: 500,
    expectedSets: 500,
    pricePerSet: 400,
    pricePerPiece: 200,
    productStructure: {
      productName: 'Designer Kurti Suit',
      subParts: [
        { id: 'top', name: 'Top Kurti', qty: 1 },
        { id: 'pant', name: 'Bottom Pant', qty: 1 },
      ],
    },
    status: 'In Cutting',
  };

  const cuttingBatch = {
    id: 'cut_suit_500',
    fabricId: 'fab_suit_500',
    totalSets: 500,
    totalPieces: 1000,
    cutPieces: {
      top: 500,
      pant: 500,
    },
    status: 'In Progress',
  };

  it('Stage 1 & 2: Fabric Lot and Cutting created with 500 Top and 500 Pant pieces', () => {
    expect(cuttingBatch.cutPieces.top).toBe(500);
    expect(cuttingBatch.cutPieces.pant).toBe(500);
    expect(cuttingBatch.totalPieces).toBe(1000);
  });

  it('Stage 3: Only Top is stitched and verified; Pant is not ready yet', () => {
    // Top handovers (500 pcs) verified by admin
    const handoversTopOnly = [
      {
        id: 'ho_top_1',
        fabricId: 'fab_suit_500',
        cuttingId: 'cut_suit_500',
        piecesCount: 500,
        subParts: { top: 500, pant: 0 },
        status: 'Verified',
      },
    ];

    // Thread trimming skipped or completed for Top
    const threadAssignmentsTopOnly = [
      {
        id: 'tc_top_1',
        fabricId: 'fab_suit_500',
        cuttingId: 'cut_suit_500',
        subPart: 'top',
        assignedPSC: 500,
        completedPSC: 500,
        status: 'Completed',
      },
    ];

    const readyData = calculateReadyProductSets(fabricLot, {
      cuttings: [cuttingBatch],
      masterHandovers: handoversTopOnly,
      threadCuttingAssignments: threadAssignmentsTopOnly,
      deliveryLogs: [],
      invoices: [],
    });

    // Subpart readiness checks
    expect(readyData.subPartReadyPieces.top).toBe(500);
    expect(readyData.subPartReadyPieces.pant).toBe(0);
    expect(readyData.totalReadyPieces).toBe(500);
    // Complete 2-piece sets is 0 because Pant is 0
    expect(readyData.readyProductsCount).toBe(0);
    // But delivery IS allowed for the 500 ready Top pieces!
    expect(readyData.isCompleteProductReady).toBe(true);
  });

  it('Stage 4: Deliver 500 Top pieces; lot must NOT be marked fully delivered', () => {
    const deliveryLogTop = {
      id: 'dlv_top_500',
      fabricId: 'fab_suit_500',
      totalPieces: 500,
      deliveredPSC: 500,
      subParts: { top: 500, pant: 0 },
      pricePerSet: 400,
      pricePerPSC: 200,
      deliveryDate: '2026-09-29',
    };

    const fabricAfterTopDelivery = {
      ...fabricLot,
      status: 'In Stitching', // remains active, not 'Delivered'
      isDelivered: false,
      deliveredPSC: 500,
      subPartsDelivered: { top: 500, pant: 0 },
      deliveryLogs: [deliveryLogTop],
    };

    const handoversTopOnly = [
      {
        id: 'ho_top_1',
        fabricId: 'fab_suit_500',
        cuttingId: 'cut_suit_500',
        piecesCount: 500,
        subParts: { top: 500 },
        status: 'Verified',
      },
    ];

    // Check if lot is considered fully delivered: MUST BE FALSE
    const isFullyDelivered = isLotFullyDelivered(fabricAfterTopDelivery, {
      cuttings: [cuttingBatch],
      masterHandovers: handoversTopOnly,
      threadCuttingAssignments: [],
      invoices: [],
      deliveryLogs: [deliveryLogTop],
    });

    expect(isFullyDelivered).toBe(false);

    // After delivering Top, ready pieces for Top should be 0
    const readyDataAfterDelivery = calculateReadyProductSets(fabricAfterTopDelivery, {
      cuttings: [cuttingBatch],
      masterHandovers: handoversTopOnly,
      threadCuttingAssignments: [
        {
          id: 'tc_top_1',
          fabricId: 'fab_suit_500',
          cuttingId: 'cut_suit_500',
          subPart: 'top',
          assignedPSC: 500,
          completedPSC: 500,
          status: 'Completed',
        },
      ],
      deliveryLogs: [deliveryLogTop],
      invoices: [],
    });

    expect(readyDataAfterDelivery.subPartReadyPieces.top).toBe(0);
    expect(readyDataAfterDelivery.subPartReadyPieces.pant).toBe(0);
    expect(readyDataAfterDelivery.totalReadyPieces).toBe(0);
    expect(readyDataAfterDelivery.alreadyDeliveredPieces).toBe(500);
  });

  it('Stage 5: Invoice for partial delivery of Top is created and tracked', () => {
    const invoiceTop = {
      id: 'inv_top_500',
      invoiceNumber: 'INV-2026-001',
      fabricId: 'fab_suit_500',
      totalAmount: 100000,
      setQuantity: 0,
      items: [
        {
          id: 'it_top',
          fabricId: 'fab_suit_500',
          subPartId: 'top',
          subPartName: 'Top Kurti',
          description: 'Premium Cotton Blend - Top Kurti',
          quantity: 500,
          unitPrice: 200,
          unit: 'PCs',
          isSubPart: true,
        },
      ],
    };

    // Calculate ready pieces with invoice present: Top is already invoiced and delivered
    const deliveryLogTop = {
      id: 'dlv_top_500',
      fabricId: 'fab_suit_500',
      totalPieces: 500,
      subParts: { top: 500 },
    };

    const fabricAfterInvoice = {
      ...fabricLot,
      status: 'In Stitching',
      isDelivered: false,
      deliveredPSC: 500,
      subPartsDelivered: { top: 500 },
      deliveryLogs: [deliveryLogTop],
    };

    const handoversTopOnly = [
      {
        id: 'ho_top_1',
        fabricId: 'fab_suit_500',
        cuttingId: 'cut_suit_500',
        piecesCount: 500,
        subParts: { top: 500 },
        status: 'Verified',
      },
    ];

    const readyCheck = calculateReadyProductSets(fabricAfterInvoice, {
      cuttings: [cuttingBatch],
      masterHandovers: handoversTopOnly,
      invoices: [invoiceTop],
      deliveryLogs: [deliveryLogTop],
    });

    expect(readyCheck.deliveredSubParts.top).toBe(500);
    expect(readyCheck.subPartReadyPieces.top).toBe(0);
  });

  it('Stage 6: Tailors complete Pant; verified and ready for delivery', () => {
    const deliveryLogTop = {
      id: 'dlv_top_500',
      fabricId: 'fab_suit_500',
      totalPieces: 500,
      subParts: { top: 500 },
    };

    const fabricAfterTop = {
      ...fabricLot,
      status: 'In Stitching',
      isDelivered: false,
      deliveredPSC: 500,
      subPartsDelivered: { top: 500 },
      deliveryLogs: [deliveryLogTop],
    };

    const allHandovers = [
      {
        id: 'ho_top_1',
        fabricId: 'fab_suit_500',
        cuttingId: 'cut_suit_500',
        piecesCount: 500,
        subParts: { top: 500 },
        status: 'Verified',
      },
      {
        id: 'ho_pant_1',
        fabricId: 'fab_suit_500',
        cuttingId: 'cut_suit_500',
        piecesCount: 500,
        subParts: { pant: 500 },
        status: 'Verified',
      },
    ];

    const allThreadJobs = [
      {
        id: 'tc_top_1',
        fabricId: 'fab_suit_500',
        cuttingId: 'cut_suit_500',
        subPart: 'top',
        assignedPSC: 500,
        completedPSC: 500,
        status: 'Completed',
      },
      {
        id: 'tc_pant_1',
        fabricId: 'fab_suit_500',
        cuttingId: 'cut_suit_500',
        subPart: 'pant',
        assignedPSC: 500,
        completedPSC: 500,
        status: 'Completed',
      },
    ];

    const readyPantCheck = calculateReadyProductSets(fabricAfterTop, {
      cuttings: [cuttingBatch],
      masterHandovers: allHandovers,
      threadCuttingAssignments: allThreadJobs,
      deliveryLogs: [deliveryLogTop],
      invoices: [],
    });

    // Top is 0 because already delivered; Pant is 500 ready!
    expect(readyPantCheck.subPartReadyPieces.top).toBe(0);
    expect(readyPantCheck.subPartReadyPieces.pant).toBe(500);
    expect(readyPantCheck.totalReadyPieces).toBe(500);
    expect(readyPantCheck.isCompleteProductReady).toBe(true);
  });

  it('Stage 7: Second delivery of 500 Pant; lot is now fully delivered', () => {
    const deliveryLogTop = {
      id: 'dlv_top_500',
      fabricId: 'fab_suit_500',
      totalPieces: 500,
      subParts: { top: 500 },
    };

    const deliveryLogPant = {
      id: 'dlv_pant_500',
      fabricId: 'fab_suit_500',
      totalPieces: 500,
      subParts: { pant: 500 },
    };

    const fabricAllDelivered = {
      ...fabricLot,
      status: 'Delivered',
      isDelivered: true,
      deliveredPSC: 1000,
      subPartsDelivered: { top: 500, pant: 500 },
      deliveryLogs: [deliveryLogTop, deliveryLogPant],
    };

    const allHandovers = [
      {
        id: 'ho_top_1',
        fabricId: 'fab_suit_500',
        cuttingId: 'cut_suit_500',
        piecesCount: 500,
        subParts: { top: 500 },
        status: 'Verified',
      },
      {
        id: 'ho_pant_1',
        fabricId: 'fab_suit_500',
        cuttingId: 'cut_suit_500',
        piecesCount: 500,
        subParts: { pant: 500 },
        status: 'Verified',
      },
    ];

    const isFullyDelivered = isLotFullyDelivered(fabricAllDelivered, {
      cuttings: [cuttingBatch],
      masterHandovers: allHandovers,
      threadCuttingAssignments: [],
      deliveryLogs: [deliveryLogTop, deliveryLogPant],
      invoices: [],
    });

    expect(isFullyDelivered).toBe(true);

    const finalReadyCheck = calculateReadyProductSets(fabricAllDelivered, {
      cuttings: [cuttingBatch],
      masterHandovers: allHandovers,
      deliveryLogs: [deliveryLogTop, deliveryLogPant],
      invoices: [],
    });

    expect(finalReadyCheck.totalReadyPieces).toBe(0);
    expect(finalReadyCheck.deliveredSubParts.top).toBe(500);
    expect(finalReadyCheck.deliveredSubParts.pant).toBe(500);
  });

  it('Stage 8: Piece-wise invoice breakdown and uninvoiced calculation for single-part delivery and invoicing', () => {
    // Scenario matching user: 650 delivered (200 Top, 450 Pant), invoice 1 is for 200 Top only
    const invoice1 = {
      id: 'inv_1',
      invoiceNumber: 'INV-2026-001',
      fabricId: 'fab_suit_500',
      totalAmount: 13650,
      setQuantity: 0,
      items: [
        {
          id: 'it_top',
          fabricId: 'fab_suit_500',
          subPartName: 'Top Kurti',
          description: 'Designer Kurti Suit - Top Kurti',
          quantity: 200,
          unitPrice: 65,
          unit: 'PCs',
          isSubPart: true,
        },
      ],
      status: 'Paid',
      date: '2026-09-29',
    };

    const deliveryLog1 = {
      id: 'dlv_1',
      fabricId: 'fab_suit_500',
      totalPieces: 650,
      deliveredPSC: 650,
      subParts: { top: 200, pant: 450 },
    };

    // Calculate invoiced pieces
    const invoicedPieces = (invoice1.items || []).reduce((s, it) => s + (parseInt(it.quantity, 10) || 0), 0);
    expect(invoicedPieces).toBe(200);

    // Remaining delivered pieces to invoice: 650 delivered - 200 invoiced = 450 pieces
    const totalDelivered = deliveryLog1.totalPieces;
    const deliveredUninvoiced = Math.max(0, totalDelivered - invoicedPieces);
    expect(deliveredUninvoiced).toBe(450);

    // Second invoice for remaining 450 Pant
    const invoice2 = {
      id: 'inv_2',
      invoiceNumber: 'INV-2026-002',
      fabricId: 'fab_suit_500',
      totalAmount: 30713,
      setQuantity: 0,
      items: [
        {
          id: 'it_pant',
          fabricId: 'fab_suit_500',
          subPartName: 'Bottom Pant',
          description: 'Designer Kurti Suit - Bottom Pant',
          quantity: 450,
          unitPrice: 65,
          unit: 'PCs',
          isSubPart: true,
        },
      ],
      status: 'Pending',
      date: '2026-09-29',
    };

    const allInvoices = [invoice1, invoice2];
    const totalInvoicedAll = allInvoices.reduce((sum, inv) => {
      return sum + inv.items.reduce((s, it) => s + (parseInt(it.quantity, 10) || 0), 0);
    }, 0);

    expect(totalInvoicedAll).toBe(650);
    const deliveredUninvoicedAfterBoth = Math.max(0, totalDelivered - totalInvoicedAll);
    expect(deliveredUninvoicedAfterBoth).toBe(0);
  });
});

