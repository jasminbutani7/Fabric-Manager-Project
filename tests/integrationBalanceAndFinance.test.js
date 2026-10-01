import { describe, it, expect } from 'vitest';
import {
  calculateCuttingBalance,
  calculateFabricBalance,
  calculateFabricScrap,
  calculateInvoiceSettlement,
} from '../src/utils/balanceUtils';

describe('Integration Tests: Balance, Scrap & Invoice Settlement (Phase 3)', () => {
  describe('calculateCuttingBalance', () => {
    const mockFabric = {
      id: 'fab_101',
      lotNo: 12,
      plainMeters: 500,
      productName: 'Casual Kurti',
      productStructure: {
        productName: 'Casual Kurti',
        fullSetRate: 60,
        subParts: [
          { id: 'front_back', name: 'Front & Back Panels', rate: 35 },
          { id: 'sleeves', name: 'Sleeves & Collar', rate: 25 },
        ],
      },
    };

    const mockCutting = {
      id: 'cut_201',
      fabricId: 'fab_101',
      productName: 'Casual Kurti',
      cutPieces: {
        front_back: 100,
        sleeves: 100,
      },
      totalPieces: 200,
      setsCount: 100,
      metersUsed: 150,
      cutDate: '2026-03-20',
    };

    it('should calculate initial unassigned balance for a fresh cutting', () => {
      const balance = calculateCuttingBalance({
        cutting: mockCutting,
        fabric: mockFabric,
        tailorAssignments: [],
      });

      expect(balance).not.toBeNull();
      expect(balance.assigned.total).toBe(0);
      expect(balance.remaining.total).toBe(200);
      expect(balance.isUnassigned).toBe(true);
      expect(balance.isPartiallyAssigned).toBe(false);
      expect(balance.isFullyAssigned).toBe(false);
      expect(balance.availableSubParts.fullSets).toBe(100);
    });

    it('should correctly deduct pieces when a tailor assignment is present', () => {
      const mockAssignments = [
        {
          id: 'asg_301',
          cuttingId: 'cut_201',
          fabricId: 'fab_101',
          status: 'In Progress',
          totalAssignedPieces: 60,
          assignedPieces: {
            front_back: 30,
            sleeves: 30,
          },
        },
      ];

      const balance = calculateCuttingBalance({
        cutting: mockCutting,
        fabric: mockFabric,
        tailorAssignments: mockAssignments,
      });

      expect(balance.assigned.front_back).toBe(30);
      expect(balance.assigned.sleeves).toBe(30);
      expect(balance.assigned.total).toBe(60);
      expect(balance.remaining.front_back).toBe(70);
      expect(balance.remaining.sleeves).toBe(70);
      expect(balance.remaining.total).toBe(140);
      expect(balance.isPartiallyAssigned).toBe(true);
      expect(balance.isFullyAssigned).toBe(false);
      expect(balance.availableSubParts.fullSets).toBe(70);
    });

    it('should mark isFullyAssigned when all pieces are assigned', () => {
      const mockAssignments = [
        {
          id: 'asg_302',
          cuttingId: 'cut_201',
          fabricId: 'fab_101',
          status: 'Assigned',
          totalAssignedPieces: 200,
          assignedPieces: {
            front_back: 100,
            sleeves: 100,
          },
        },
      ];

      const balance = calculateCuttingBalance({
        cutting: mockCutting,
        fabric: mockFabric,
        tailorAssignments: mockAssignments,
      });

      expect(balance.assigned.total).toBe(200);
      expect(balance.remaining.total).toBe(0);
      expect(balance.isFullyAssigned).toBe(true);
      expect(balance.isPartiallyAssigned).toBe(false);
      expect(balance.availableSubParts.fullSets).toBe(0);
    });

    it('should ignore Declined assignments during balance calculation', () => {
      const mockAssignments = [
        {
          id: 'asg_303',
          cuttingId: 'cut_201',
          status: 'Declined',
          totalAssignedPieces: 100,
          assignedPieces: { front_back: 100 },
        },
      ];

      const balance = calculateCuttingBalance({
        cutting: mockCutting,
        fabric: mockFabric,
        tailorAssignments: mockAssignments,
      });

      expect(balance.assigned.total).toBe(0);
      expect(balance.remaining.total).toBe(200);
      expect(balance.isUnassigned).toBe(true);
    });
  });

  describe('calculateFabricBalance', () => {
    const mockFabric = {
      id: 'fab_500',
      lotNo: 45,
      productName: 'Pajama Suit',
      productStructure: {
        productName: 'Pajama Suit',
        fullSetRate: 80,
        subParts: [
          { id: 'top', name: 'Top', rate: 45 },
          { id: 'bottom', name: 'Bottom', rate: 35 },
        ],
      },
    };

    const cuttings = [
      {
        id: 'cut_A',
        fabricId: 'fab_500',
        cutPieces: { top: 50, bottom: 50 },
        totalPieces: 100,
      },
      {
        id: 'cut_B',
        fabricId: 'fab_500',
        cutPieces: { top: 70, bottom: 70 },
        totalPieces: 140,
      },
    ];

    it('should aggregate cut pieces across multiple cuttings of the same fabric lot', () => {
      const assignments = [
        {
          id: 'asg_1',
          fabricId: 'fab_500',
          cuttingId: 'cut_A',
          status: 'In Progress',
          totalAssignedPieces: 60,
          assignedPieces: { top: 30, bottom: 30 },
        },
      ];

      const fabricBalance = calculateFabricBalance({
        fabric: mockFabric,
        cuttings,
        tailorAssignments: assignments,
      });

      // Total top cut = 50 + 70 = 120. Assigned = 30. Remaining = 90.
      // Total bottom cut = 50 + 70 = 120. Assigned = 30. Remaining = 90.
      // Total pieces = 240. Assigned total = 60. Remaining = 180.
      expect(fabricBalance.totalCutPieces).toBe(240);
      expect(fabricBalance.totalAssignedPieces).toBe(60);
      expect(fabricBalance.totalRemainingPieces).toBe(180);
      expect(fabricBalance.remaining.top).toBe(90);
      expect(fabricBalance.remaining.bottom).toBe(90);
      expect(fabricBalance.availableSets).toBe(90);
      expect(fabricBalance.isPartiallyAssigned).toBe(true);
    });
  });

  describe('calculateFabricScrap', () => {
    const mockFabric = {
      id: 'fab_99',
      plainMeters: 200,
    };

    const cuttings = [
      {
        id: 'c1',
        fabricId: 'fab_99',
        metersUsed: 80,
        totalPieces: 160,
      },
      {
        id: 'c2',
        fabricId: 'fab_99',
        metersUsed: 95,
        totalPieces: 190,
      },
    ];

    const handovers = [
      {
        id: 'h1',
        fabricId: 'fab_99',
        acceptedQuantity: 340,
        rejectedQuantity: 10,
      },
    ];

    it('should accurately calculate residual meters, efficiency, and rejection rate', () => {
      const scrap = calculateFabricScrap({
        fabric: mockFabric,
        cuttings,
        masterHandovers: handovers,
      });

      // Meters used: 80 + 95 = 175 meters
      // Unused meters: 200 - 175 = 25 meters
      expect(scrap.plainMeters).toBe(200);
      expect(scrap.metersUsed).toBe(175);
      expect(scrap.unusedMeters).toBe(25);

      // Total cut pieces: 160 + 190 = 350 pieces
      expect(scrap.totalCutPieces).toBe(350);

      // Average meters per piece: 175 / 350 = 0.5 meters/piece
      expect(scrap.metersPerPiece).toBe(0.5);

      // Utilization rate: (175 / 200) * 100 = 87.5%
      expect(scrap.fabricUtilizationRatePercent).toBe(87.5);

      // Rejection rate: 10 rejected out of (340 + 10 = 350 inspected) = 2.86% -> 2.9%
      expect(scrap.totalAcceptedPieces).toBe(340);
      expect(scrap.totalRejectedPieces).toBe(10);
      expect(scrap.rejectionRatePercent).toBe(2.9);
    });

    it('should return safe zero defaults when fabric has no cuttings or handovers', () => {
      const scrap = calculateFabricScrap({
        fabric: { id: 'fab_empty', plainMeters: 100 },
        cuttings: [],
        masterHandovers: [],
      });

      expect(scrap.metersUsed).toBe(0);
      expect(scrap.unusedMeters).toBe(100);
      expect(scrap.totalCutPieces).toBe(0);
      expect(scrap.metersPerPiece).toBe(0);
      expect(scrap.rejectionRatePercent).toBe(0);
      expect(scrap.fabricUtilizationRatePercent).toBe(0);
    });

    it('should correctly exclude Rejected status handovers from totalAcceptedPieces', () => {
      const scrap = calculateFabricScrap({
        fabric: mockFabric,
        cuttings,
        masterHandovers: [
          {
            id: 'h_rej',
            fabricId: 'fab_99',
            piecesCount: 650,
            status: 'Rejected',
          },
          {
            id: 'h_ver',
            fabricId: 'fab_99',
            piecesCount: 650,
            status: 'Verified',
          },
        ],
      });

      // 650 verified, 650 rejected
      expect(scrap.totalAcceptedPieces).toBe(650);
      expect(scrap.totalRejectedPieces).toBe(650);
      expect(scrap.rejectionRatePercent).toBe(50);
    });
  });

  describe('calculateInvoiceSettlement', () => {
    const baseInvoice = {
      id: 'inv_1001',
      invoiceNumber: 'INV-2026-001',
      clientName: 'Modern Textile Distributors',
      totalAmount: 50000,
      paidAmount: 0,
      pendingAmount: 50000,
      dueAmount: 50000,
      status: 'Pending',
    };

    it('should transition to Partial status on partial payment', () => {
      const result = calculateInvoiceSettlement(baseInvoice, 20000);

      expect(result.invoice.paidAmount).toBe(20000);
      expect(result.invoice.pendingAmount).toBe(30000);
      expect(result.invoice.dueAmount).toBe(30000);
      expect(result.invoice.status).toBe('Partial');
      expect(result.isOverpayment).toBe(false);
    });

    it('should transition to Paid status when full balance is settled', () => {
      const partialInvoice = {
        ...baseInvoice,
        paidAmount: 20000,
        pendingAmount: 30000,
        dueAmount: 30000,
        status: 'Partial',
      };

      const result = calculateInvoiceSettlement(partialInvoice, 30000);

      expect(result.invoice.paidAmount).toBe(50000);
      expect(result.invoice.pendingAmount).toBe(0);
      expect(result.invoice.dueAmount).toBe(0);
      expect(result.invoice.status).toBe('Paid');
      expect(result.isOverpayment).toBe(false);
    });

    it('should flag isOverpayment if payment exceeds invoice total', () => {
      const result = calculateInvoiceSettlement(baseInvoice, 55000);

      expect(result.invoice.paidAmount).toBe(55000);
      expect(result.invoice.pendingAmount).toBe(0);
      expect(result.invoice.status).toBe('Paid');
      expect(result.isOverpayment).toBe(true);
    });
  });
});
