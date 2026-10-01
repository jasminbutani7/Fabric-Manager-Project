import { describe, it, expect } from 'vitest';
import { useMasterHandoverOps } from '../src/context/domain/production/useMasterHandoverOps';
import { normalizeTailorAssignment } from '../src/services/dbMappers';
import { calculateReadyProductSets, isLotFullyDelivered } from '../src/utils/deliveryUtils';

describe('Factory Production Lifecycle: Advanced Rejection, Rework & Acceptance Workflow Verification', () => {
  // Shared mock state simulating the in-memory factory database
  let fabrics = [];
  let cuttings = [];
  let tailorAssignments = [];
  let masterHandovers = [];
  let threadCuttingAssignments = [];
  let deliveryLogs = [];

  const setFabrics = (updater) => {
    fabrics = typeof updater === 'function' ? updater(fabrics) : updater;
  };
  const setCuttings = (updater) => {
    cuttings = typeof updater === 'function' ? updater(cuttings) : updater;
  };
  const setTailorAssignments = (updater) => {
    tailorAssignments = typeof updater === 'function' ? updater(tailorAssignments) : updater;
  };
  const setMasterHandovers = (updater) => {
    masterHandovers = typeof updater === 'function' ? updater(masterHandovers) : updater;
  };

  const saveToDb = () => Promise.resolve({ success: true });
  const dbRemove = () => Promise.resolve({ success: true });

  // Initial Fabric Setup
  const initialFabric = {
    id: 'fab_lot_101',
    lotNo: 101,
    fabricType: 'Pure Linen Cotton',
    color: 'Olive Green',
    productName: 'Executive Linen Kurti Set',
    printPieces: 500,
    expectedSets: 500,
    meters: 1200,
    plainMeters: 1200,
    status: 'In Stock',
    productStructure: {
      productName: 'Executive Linen Kurti Set',
      subParts: [
        { id: 'top_kurti', name: 'Top Kurti', qty: 1, rate: 45 },
        { id: 'bottom_pant', name: 'Bottom Pant', qty: 1, rate: 35 },
      ],
    },
    tailorRate: 80, // Total full set rate = 45 + 35
    assignedMasterId: null,
    assignedMasterName: null,
    acceptedByMaster: false,
    rejectionReason: null,
  };

  // =========================================================================
  // PHASE 1: FABRIC ASSIGNMENT -> REJECTION -> REWORK -> ACCEPTANCE
  // =========================================================================

  it('Step 1: Admin assigns Fabric to Cutting Master; status is "In Stock" awaiting Master review', () => {
    fabrics = [initialFabric];

    // Admin selects Master Suresh
    const masterAssignmentUpdate = {
      assignedMasterId: 'mst_suresh_01',
      assignedMasterName: 'Suresh Master',
      dueDate: '2026-10-15',
      status: 'In Stock',
    };

    setFabrics((prev) =>
      prev.map((f) => (f.id === 'fab_lot_101' ? { ...f, ...masterAssignmentUpdate } : f))
    );

    const fabric = fabrics.find((f) => f.id === 'fab_lot_101');
    expect(fabric.assignedMasterId).toBe('mst_suresh_01');
    expect(fabric.assignedMasterName).toBe('Suresh Master');
    expect(fabric.status).toBe('In Stock');
    expect(fabric.acceptedByMaster).toBe(false);
  });

  it('Step 2: Master reviews rolls and REJECTS fabric allocation due to meterage deficit -> returns to Admin', () => {
    // Master Suresh measures physical rolls: roll 2 has a 100m shortage
    const rejectionNote = 'Meterage shortage: measured 1100m on rolls vs 1200m on invoice. Please rectify.';

    setFabrics((prev) =>
      prev.map((f) =>
        f.id === 'fab_lot_101'
          ? {
              ...f,
              status: 'In Stock',
              acceptedByMaster: false,
              rejectionReason: rejectionNote,
              rejectedAt: '2026-10-01T09:30:00.000Z',
            }
          : f
      )
    );

    const fabric = fabrics.find((f) => f.id === 'fab_lot_101');
    expect(fabric.status).toBe('In Stock');
    expect(fabric.acceptedByMaster).toBe(false);
    expect(fabric.rejectionReason).toContain('Meterage shortage');
    // Cannot proceed with cutting while acceptedByMaster is false
  });

  it('Step 3: Admin reviews rejection, updates meterage and notes, and RE-ASSIGNS to Master Suresh', () => {
    setFabrics((prev) =>
      prev.map((f) =>
        f.id === 'fab_lot_101'
          ? {
              ...f,
              meters: 1100,
              plainMeters: 1100,
              rejectionReason: null,
              notes: 'Corrected meterage to 1100m after re-inspection with supplier credit note.',
              assignedMasterId: 'mst_suresh_01',
              assignedMasterName: 'Suresh Master',
            }
          : f
      )
    );

    const fabric = fabrics.find((f) => f.id === 'fab_lot_101');
    expect(fabric.meters).toBe(1100);
    expect(fabric.rejectionReason).toBeNull();
    expect(fabric.notes).toContain('Corrected meterage');
  });

  it('Step 4: Master Suresh reviews corrected fabric in ReviewAcceptFabricModal and ACCEPTS -> moves to "In Cutting"', () => {
    setFabrics((prev) =>
      prev.map((f) =>
        f.id === 'fab_lot_101'
          ? {
              ...f,
              status: 'In Cutting',
              acceptedByMaster: true,
              masterAcceptedAt: '2026-10-01T10:00:00.000Z',
            }
          : f
      )
    );

    const fabric = fabrics.find((f) => f.id === 'fab_lot_101');
    expect(fabric.status).toBe('In Cutting');
    expect(fabric.acceptedByMaster).toBe(true);
    expect(fabric.masterAcceptedAt).toBeDefined();
  });

  // =========================================================================
  // PHASE 2: MASTER CUTTING -> TAILOR ALLOCATION -> REJECTION -> REWORK -> ACCEPTANCE
  // =========================================================================

  it('Step 5: Master records Cutting batch for 500 sets (1,000 cut pieces: 500 Tops, 500 Pants)', () => {
    const cuttingBatch = {
      id: 'cut_batch_201',
      fabricId: 'fab_lot_101',
      fabricName: 'Executive Linen Kurti Set (Olive Green)',
      masterId: 'mst_suresh_01',
      masterName: 'Suresh Master',
      totalPieces: 1000,
      totalSets: 500,
      piecesPerSet: 2,
      cutPieces: {
        top_kurti: 500,
        bottom_pant: 500,
      },
      status: 'Ready for Stitching',
      date: '2026-10-01',
      masterWorkDone: false,
    };

    setCuttings([cuttingBatch]);

    const cutting = cuttings.find((c) => c.id === 'cut_batch_201');
    expect(cutting).toBeDefined();
    expect(cutting.totalPieces).toBe(1000);
    expect(cutting.totalSets).toBe(500);
    expect(cutting.cutPieces.top_kurti).toBe(500);
    expect(cutting.cutPieces.bottom_pant).toBe(500);
    expect(cutting.status).toBe('Ready for Stitching');
  });

  it('Step 6: Master assigns 500 sets to Tailor Ramesh at ₹35/pc; Tailor Ramesh REJECTS allocation due to rate mismatch', () => {
    const initialAssignment = {
      id: 'asgn_ramesh_301',
      cuttingId: 'cut_batch_201',
      fabricId: 'fab_lot_101',
      tailorId: 'tlr_ramesh_99',
      tailorName: 'Ramesh Tailor',
      productName: 'Executive Linen Kurti Set',
      totalAssignedPieces: 1000,
      assignedSets: 500,
      assignedSubParts: { top_kurti: 500, bottom_pant: 500 },
      ratePerPiece: 35, // Rate mismatch (was promised 40)
      totalContractAmount: 35000,
      status: 'Assigned',
      tailorAccepted: false,
      completedQuantity: 0,
      totalEarned: 0,
      dailySubmissions: [],
    };

    setTailorAssignments([initialAssignment]);

    // Tailor Ramesh opens ReviewAcceptWorkModal in TailorPortal and clicks "Reject"
    const rejectionReason = 'Agreed rate for linen 2-piece set was ₹40/pc, not ₹35/pc.';
    setTailorAssignments((prev) =>
      prev.map((a) =>
        a.id === 'asgn_ramesh_301'
          ? {
              ...a,
              status: 'Rejected',
              tailorAccepted: false,
              rejectionReason,
              rejectedAt: '2026-10-01T11:00:00.000Z',
            }
          : a
      )
    );

    const asgn = tailorAssignments.find((a) => a.id === 'asgn_ramesh_301');
    expect(asgn.status).toBe('Rejected');
    expect(asgn.tailorAccepted).toBe(false);
    expect(asgn.rejectionReason).toContain('₹40/pc');
    expect(asgn.completedQuantity).toBe(0);
    expect(asgn.totalEarned).toBe(0);
  });

  it('Step 7: Master reviews rejection feedback, updates rate to ₹40/pc, and RE-ASSIGNS to Tailor Ramesh', () => {
    setTailorAssignments((prev) =>
      prev.map((a) =>
        a.id === 'asgn_ramesh_301'
          ? {
              ...a,
              ratePerPiece: 40,
              totalContractAmount: 40000,
              status: 'Assigned',
              rejectionReason: null,
              notes: 'Rate updated to ₹40/pc as agreed for linen styling.',
            }
          : a
      )
    );

    const asgn = tailorAssignments.find((a) => a.id === 'asgn_ramesh_301');
    expect(asgn.ratePerPiece).toBe(40);
    expect(asgn.totalContractAmount).toBe(40000);
    expect(asgn.status).toBe('Assigned');
    expect(asgn.rejectionReason).toBeNull();
  });

  it('Step 8: Tailor Ramesh reviews corrected allocation and ACCEPTS -> status moves to "In Stitching"', () => {
    setTailorAssignments((prev) =>
      prev.map((a) =>
        a.id === 'asgn_ramesh_301'
          ? {
              ...a,
              status: 'In Stitching',
              tailorAccepted: true,
              acceptedAt: '2026-10-01T12:00:00.000Z',
            }
          : a
      )
    );

    const asgn = tailorAssignments.find((a) => a.id === 'asgn_ramesh_301');
    expect(asgn.status).toBe('In Stitching');
    expect(asgn.tailorAccepted).toBe(true);
    expect(asgn.acceptedAt).toBeDefined();
  });

  // =========================================================================
  // PHASE 3: DAILY WORK SUBMISSION -> REJECTION -> REWORK -> APPROVAL
  // =========================================================================

  it('Step 9: Tailor submits Day 1 daily log of 250 pcs; Master inspects and REJECTS due to stitching defects -> ₹0 credited', () => {
    const day1Submission = {
      id: 'sub_ramesh_d1',
      assignmentId: 'asgn_ramesh_301',
      date: '2026-10-02',
      quantity: 250,
      pscQuantity: 250,
      subParts: { top_kurti: 125, bottom_pant: 125 },
      ratePerPiece: 40,
      earnedAmount: 10000,
      approvalStatus: 'Pending',
      notes: 'Day 1 stitching batch',
      createdAt: '2026-10-02T18:00:00.000Z',
    };

    // Master Suresh inspects pieces on the factory floor and rejects due to stitching defects
    const rejectedSubmission = {
      ...day1Submission,
      approvalStatus: 'Rejected',
      rejectionReason: 'Stitching defect: uneven seam and collar stitching on kurtis. Restitch required.',
      rejectedAt: '2026-10-02T19:00:00.000Z',
    };

    setTailorAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== 'asgn_ramesh_301') return a;
        const submissions = [rejectedSubmission];
        return normalizeTailorAssignment({
          ...a,
          dailySubmissions: submissions,
        }, fabrics, cuttings);
      })
    );

    const asgn = tailorAssignments.find((a) => a.id === 'asgn_ramesh_301');
    expect(asgn.dailySubmissions[0].approvalStatus).toBe('Rejected');
    expect(asgn.dailySubmissions[0].rejectionReason).toContain('Stitching defect');
    // Financial integrity check: Rejected pieces must NOT be credited!
    expect(asgn.completedQuantity).toBe(0);
    expect(asgn.totalEarned).toBe(0);
    expect(asgn.status).toBe('In Stitching');
  });

  it('Step 10: Tailor re-works defective pieces and RE-SUBMITS 250 pcs; Master inspects and APPROVES -> ₹10,000 credited', () => {
    const rectifiedSubmission = {
      id: 'sub_ramesh_d1_rework',
      assignmentId: 'asgn_ramesh_301',
      date: '2026-10-03',
      quantity: 250,
      pscQuantity: 250,
      subParts: { top_kurti: 125, bottom_pant: 125 },
      ratePerPiece: 40,
      earnedAmount: 10000,
      approvalStatus: 'Approved',
      approvedBy: 'Suresh Master',
      approvedAt: '2026-10-03T12:00:00.000Z',
      notes: 'Rework completed: uneven collar restitched and pressed',
      createdAt: '2026-10-03T11:00:00.000Z',
    };

    setTailorAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== 'asgn_ramesh_301') return a;
        const submissions = [rectifiedSubmission, ...a.dailySubmissions];
        return normalizeTailorAssignment({
          ...a,
          dailySubmissions: submissions,
        }, fabrics, cuttings);
      })
    );

    const asgn = tailorAssignments.find((a) => a.id === 'asgn_ramesh_301');
    expect(asgn.completedQuantity).toBe(250);
    expect(asgn.totalEarned).toBe(10000);
    expect(asgn.status).toBe('In Stitching');
  });

  it('Step 11: Tailor submits final 750 pcs (Day 2); Master APPROVES -> 1,000 pcs completed, ₹40,000 earned, marks "Completed"', () => {
    const day2Submission = {
      id: 'sub_ramesh_d2',
      assignmentId: 'asgn_ramesh_301',
      date: '2026-10-04',
      quantity: 750,
      pscQuantity: 750,
      subParts: { top_kurti: 375, bottom_pant: 375 },
      ratePerPiece: 40,
      earnedAmount: 30000,
      approvalStatus: 'Approved',
      approvedBy: 'Suresh Master',
      approvedAt: '2026-10-04T18:00:00.000Z',
      notes: 'Final batch stitching complete',
      createdAt: '2026-10-04T17:30:00.000Z',
    };

    setTailorAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== 'asgn_ramesh_301') return a;
        const submissions = [day2Submission, ...a.dailySubmissions];
        return normalizeTailorAssignment({
          ...a,
          dailySubmissions: submissions,
        }, fabrics, cuttings);
      })
    );

    const asgn = tailorAssignments.find((a) => a.id === 'asgn_ramesh_301');
    expect(asgn.completedQuantity).toBe(1000);
    expect(asgn.totalEarned).toBe(40000);
    expect(asgn.status).toBe('Completed');
  });

  // =========================================================================
  // PHASE 4: MASTER HANDOVER TO ADMIN -> REJECTION -> REWORK -> VERIFICATION
  // =========================================================================

  it('Step 12: Master submits 500 sets Handover to Admin; Admin reviews and REJECTS due to untrimmed threads', () => {
    const handoverOps = useMasterHandoverOps({
      tailorAssignments,
      masterHandovers,
      setMasterHandovers,
      threadCuttingAssignments,
      fabrics,
      setFabrics,
      cuttings,
      setCuttings,
      saveToDb,
      dbRemove,
    });

    // Master initially submits handover with threads untrimmed
    const submitRes = handoverOps.submitMasterHandover({
      cuttingId: 'cut_batch_201',
      fabricId: 'fab_lot_101',
      masterId: 'mst_suresh_01',
      masterName: 'Suresh Master',
      piecesCount: 500,
      subParts: { top_kurti: 500, bottom_pant: 500 },
      parts: { top_kurti: 500, bottom_pant: 500 },
      trimmingStatus: null, // Untrimmed
      notes: 'Initial handover of 500 sets',
    });

    expect(submitRes.success).toBe(true);
    const initialHandoverId = submitRes.handover.id;
    expect(submitRes.handover.status).toBe('Pending Verification');

    // Admin inspects in Orders and REJECTS the handover
    const adminRejectReason = 'Quality check failed: 35 garments have untrimmed loose threads and missing size tags.';
    const rejectRes = handoverOps.rejectMasterHandover(initialHandoverId, adminRejectReason);
    expect(rejectRes.success).toBe(true);

    const rejectedHandover = masterHandovers.find((h) => h.id === initialHandoverId);
    expect(rejectedHandover.status).toBe('Rejected');
    expect(rejectedHandover.rejectionReason).toBe(adminRejectReason);
    expect(rejectedHandover.rejectedAt).toBeDefined();

    // Verification integrity: cutting and fabric must NOT be completed!
    const cutting = cuttings.find((c) => c.id === 'cut_batch_201');
    expect(cutting.status).not.toBe('Completed');

    const fabric = fabrics.find((f) => f.id === 'fab_lot_101');
    expect(fabric.status).not.toBe('Completed');

    // Ready products for client delivery must be 0 because handover was rejected!
    const readyMetrics = calculateReadyProductSets(fabric, {
      cuttings,
      masterHandovers,
      threadCuttingAssignments,
      invoices: [],
      deliveryLogs,
    });
    expect(readyMetrics.readyProductsCount).toBe(0);
    expect(readyMetrics.totalVerifiedPieces).toBe(0);

    // Floor stats check: rejected handover is excluded from active submitted PSC, returning pieces to floor
    const stats = handoverOps.getMasterHandoverStats('cut_batch_201');
    expect(stats.verifiedPieces).toBe(0);
    expect(stats.isFullyVerified).toBe(false);
  });

  it('Step 13: Master Suresh rectifies defects, trims threads, and RE-SUBMITS 500 sets Handover to Admin', () => {
    const handoverOps = useMasterHandoverOps({
      tailorAssignments,
      masterHandovers,
      setMasterHandovers,
      threadCuttingAssignments,
      fabrics,
      setFabrics,
      cuttings,
      setCuttings,
      saveToDb,
      dbRemove,
    });

    // Master re-submits after 100% thread trimming and tagging
    const res = handoverOps.submitMasterHandover({
      cuttingId: 'cut_batch_201',
      fabricId: 'fab_lot_101',
      masterId: 'mst_suresh_01',
      masterName: 'Suresh Master',
      piecesCount: 500,
      subParts: { top_kurti: 500, bottom_pant: 500 },
      parts: { top_kurti: 500, bottom_pant: 500 },
      trimmingStatus: 'trimmed',
      trimmedByMaster: true,
      notes: 'Rework complete: All 500 kurti sets thread-trimmed, ironed, and size-tagged.',
    });

    expect(res.success).toBe(true);
    expect(res.handover.status).toBe('Pending Verification');
    expect(res.handover.piecesCount).toBe(500);
    expect(res.handover.trimmingStatus).toBe('trimmed');

    const cutting = cuttings.find((c) => c.id === 'cut_batch_201');
    expect(cutting.masterWorkDone).toBe(true);
  });

  it('Step 14: Admin reviews reworked handover in Orders and VERIFIES it -> Cutting and Fabric transition to "Completed"', () => {
    const handoverOps = useMasterHandoverOps({
      tailorAssignments,
      masterHandovers,
      setMasterHandovers,
      threadCuttingAssignments,
      fabrics,
      setFabrics,
      cuttings,
      setCuttings,
      saveToDb,
      dbRemove,
    });

    // Find the latest pending handover
    const pendingHandover = masterHandovers.find((h) => h.status === 'Pending Verification');
    expect(pendingHandover).toBeDefined();

    handoverOps.verifyMasterHandover(pendingHandover.id, 'Factory Admin (Apex)');

    const verifiedHandover = masterHandovers.find((h) => h.id === pendingHandover.id);
    expect(verifiedHandover.status).toBe('Verified');
    expect(verifiedHandover.verifiedBy).toBe('Factory Admin (Apex)');
    expect(verifiedHandover.verifiedAt).toBeDefined();

    const cutting = cuttings.find((c) => c.id === 'cut_batch_201');
    expect(cutting.status).toBe('Completed');

    const fabric = fabrics.find((f) => f.id === 'fab_lot_101');
    expect(fabric.status).toBe('Completed');
  });

  // =========================================================================
  // PHASE 5: CLIENT DELIVERY READY & AUDIT CALCULATIONS
  // =========================================================================

  it('Step 15: Delivery & Fulfillment Metrics verify full lot (500 sets) is ready for Client Delivery with accurate logs', () => {
    const fabric = fabrics[0];

    const readyMetrics = calculateReadyProductSets(fabric, {
      cuttings,
      masterHandovers,
      threadCuttingAssignments,
      invoices: [],
      deliveryLogs,
    });

    // 500 complete product sets are now verified and ready
    expect(readyMetrics.readyProductsCount).toBe(500);
    expect(readyMetrics.totalVerifiedPieces).toBe(500);
    expect(readyMetrics.subPartVerifiedCounts.top_kurti).toBe(500);
    expect(readyMetrics.subPartVerifiedCounts.bottom_pant).toBe(500);
    expect(readyMetrics.isCompleteProductReady).toBe(true);

    // Because goods are ready on floor waiting for dispatch, lot is not yet fully delivered
    const fullyDelivered = isLotFullyDelivered(fabric, {
      cuttings,
      tailorAssignments,
      masterHandovers,
      threadCuttingAssignments,
      invoices: [],
      deliveryLogs,
    });
    expect(fullyDelivered).toBe(false);

    // Audit logs verify tailor earnings and rejection records
    const asgn = tailorAssignments.find((a) => a.id === 'asgn_ramesh_301');
    expect(asgn.completedQuantity).toBe(1000);
    expect(asgn.totalEarned).toBe(40000);
    expect(asgn.dailySubmissions.length).toBe(3); // 1 rejected + 1 rework approved + 1 final approved
    expect(asgn.dailySubmissions.filter((s) => s.approvalStatus === 'Approved').length).toBe(2);
    expect(asgn.dailySubmissions.filter((s) => s.approvalStatus === 'Rejected').length).toBe(1);

    // Master handovers log audit: 1 rejected handover + 1 verified handover
    expect(masterHandovers.length).toBe(2);
    expect(masterHandovers.filter((h) => h.status === 'Rejected').length).toBe(1);
    expect(masterHandovers.filter((h) => h.status === 'Verified').length).toBe(1);
  });
});
