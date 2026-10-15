import { describe, it, expect } from 'vitest';
import {
  resolvePieceLabel,
  normalizeCutPiecesObject,
  getPieceValueFromObject,
  isLotFullyDelivered,
} from '../src/utils/productUtils';

describe('Product & Cutting Utilities (productUtils)', () => {
  describe('resolvePieceLabel', () => {
    it('should resolve key by matching subPart ID', () => {
      const productStructure = {
        subParts: [
          { id: 'top_panel', name: 'Front Kurti Panel' },
          { id: 'bottom_panel', name: 'Bottom Skirt' },
        ],
      };

      expect(resolvePieceLabel('top_panel', productStructure)).toBe('Front Kurti Panel');
      expect(resolvePieceLabel('bottom_panel', productStructure)).toBe('Bottom Skirt');
    });

    it('should resolve custom_part_X by order index in subParts', () => {
      const productStructure = {
        subParts: [
          { id: 'p1', name: 'Collar & Neck' },
          { id: 'p2', name: 'Left & Right Sleeves' },
        ],
      };

      expect(resolvePieceLabel('custom_part_1', productStructure)).toBe('Collar & Neck');
      expect(resolvePieceLabel('custom_part_2', productStructure)).toBe('Left & Right Sleeves');
    });

    it('should fallback to humanizing underscores and capitalization', () => {
      expect(resolvePieceLabel('inner_lining_cloth', null)).toBe('Inner Lining Cloth');
      expect(resolvePieceLabel('', null)).toBe('');
    });
  });

  describe('normalizeCutPiecesObject', () => {
    it('should collapse case-insensitive duplicates and ensure positive integers', () => {
      const raw = {
        Sleeves: '50',
        sleeves: '60',
        Front: '40',
        invalid: '-10',
      };

      const normalized = normalizeCutPiecesObject(raw);
      expect(normalized.Sleeves).toBe(60);
      expect(normalized.Front).toBe(40);
      expect(normalized.invalid).toBe(0);
    });

    it('should handle null and undefined safely', () => {
      expect(normalizeCutPiecesObject(null)).toEqual({});
      expect(normalizeCutPiecesObject(undefined)).toEqual({});
    });
  });

  describe('getPieceValueFromObject', () => {
    it('should find piece values checking aliases and slugified keys', () => {
      const pieces = {
        front_panel: 75,
        'Side Pocket': 150,
      };

      expect(getPieceValueFromObject(pieces, 'Front Panel')).toBe(75);
      expect(getPieceValueFromObject(pieces, 'side pocket')).toBe(150);
      expect(getPieceValueFromObject(pieces, 'Nonexistent')).toBe(0);
    });
  });

  describe('isLotFullyDelivered', () => {
    const mockFabric = {
      id: 'fab_101',
      fabricType: 'WEB SMALL PCS',
      expectedSets: 850,
      targetSets: 850,
      productStructure: {
        productName: 'Small PC',
        subParts: [
          { id: 'up', name: 'UP', qty: 1 },
          { id: 'down', name: 'DOWN', qty: 1 },
        ],
      },
      deliveredPSC: 1700,
      subPartsDelivered: { up: 850, down: 850 },
    };

    const mockCuttings = [
      {
        id: 'cut_1',
        fabricId: 'fab_101',
        setsCount: 850,
        totalPieces: 1700,
        cutPieces: { up: 850, down: 850 },
      },
    ];

    const mockHandovers = [
      {
        id: 'ho_1',
        fabricId: 'fab_101',
        cuttingId: 'cut_1',
        status: 'Verified',
        piecesCount: 1700,
        subParts: { up: 850, down: 850 },
      },
    ];

    const mockThreadJobs = [
      {
        id: 'tc_1',
        fabricId: 'fab_101',
        cuttingId: 'cut_1',
        subPart: 'up',
        assignedPieces: 850,
        completedPieces: 850,
        status: 'Completed',
      },
      {
        id: 'tc_2',
        fabricId: 'fab_101',
        cuttingId: 'cut_1',
        subPart: 'down',
        assignedPieces: 850,
        status: 'Skipped',
        actionType: 'skip',
      },
    ];

    const mockDeliveryLogs = [
      {
        id: 'del_1',
        fabricId: 'fab_101',
        totalPieces: 1700,
        subParts: { up: 850, down: 850 },
      },
    ];

    it('should return true when all steps are done and all pcs are delivered', () => {
      const isDelivered = isLotFullyDelivered(mockFabric, {
        cuttings: mockCuttings,
        masterHandovers: mockHandovers,
        threadCuttingAssignments: mockThreadJobs,
        deliveryLogs: mockDeliveryLogs,
      });

      expect(isDelivered).toBe(true);
    });

    it('should return false if only partial goods are delivered', () => {
      const partialFabric = {
        ...mockFabric,
        deliveredPSC: 500,
        subPartsDelivered: { up: 250, down: 250 },
      };
      const partialLogs = [
        {
          id: 'del_partial',
          fabricId: 'fab_101',
          totalPieces: 500,
          subParts: { up: 250, down: 250 },
        },
      ];

      const isDelivered = isLotFullyDelivered(partialFabric, {
        cuttings: mockCuttings,
        masterHandovers: mockHandovers,
        threadCuttingAssignments: mockThreadJobs,
        deliveryLogs: partialLogs,
      });

      expect(isDelivered).toBe(false);
    });

    it('should return true immediately if fabric has status Delivered or isDelivered', () => {
      expect(isLotFullyDelivered({ ...mockFabric, status: 'Delivered' })).toBe(true);
      expect(isLotFullyDelivered({ ...mockFabric, isDelivered: true })).toBe(true);
      expect(isLotFullyDelivered({ ...mockFabric, isArchived: true })).toBe(true);
    });

    it('should return true for 2-part lot (TOP & PENT) when delivered records use part names while productStructure uses part IDs', () => {
      const twoPartFabric = {
        id: 'fab_two_part',
        fabricType: 'Test plain (Black)',
        lotNo: '1',
        status: 'In Production',
        isDelivered: false,
        expectedSets: 750,
        targetSets: 750,
        productStructure: {
          productName: 'Set',
          subParts: [
            { id: 'part_1', name: 'TOP', qty: 1 },
            { id: 'part_2', name: 'PENT', qty: 1 },
          ],
        },
        deliveredPSC: 1500,
        subPartsDelivered: { top: 750, pent: 750 },
      };

      const cuttings = [
        {
          id: 'cut_tp',
          fabricId: 'fab_two_part',
          setsCount: 750,
          totalPieces: 1500,
          cutPieces: { top: 750, pent: 750 },
        },
      ];

      const tailorAssignments = [
        {
          id: 'ta_1',
          fabricId: 'fab_two_part',
          subPart: 'TOP',
          assignedPieces: 750,
          completedPieces: 750,
          status: 'In Progress', // Even if status string is not yet set to Completed
        },
        {
          id: 'ta_2',
          fabricId: 'fab_two_part',
          subPart: 'PENT',
          assignedPieces: 750,
          completedPieces: 750,
          status: 'In Progress',
        },
      ];

      const masterHandovers = [
        {
          id: 'ho_tp',
          fabricId: 'fab_two_part',
          status: 'Verified',
          piecesCount: 1500,
          subParts: { top: 750, pent: 750 },
        },
      ];

      const deliveryLogs = [
        {
          id: 'dl_tp',
          fabricId: 'fab_two_part',
          totalPieces: 1500,
          subParts: { top: 750, pent: 750 },
        },
      ];

      const isDelivered = isLotFullyDelivered(twoPartFabric, {
        cuttings,
        tailorAssignments,
        masterHandovers,
        deliveryLogs,
      });

      expect(isDelivered).toBe(true);
    });
  });
});


