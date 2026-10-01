import { describe, it, expect } from 'vitest';
import {
  resolvePieceLabel,
  normalizeCutPiecesObject,
  getPieceValueFromObject,
  formatPieceName,
  getGarmentPieceFormula,
  resolvePieceRate,
  resolveWorkDetails,
} from '../src/utils/cuttingUtils';
import {
  getHandoversBreakdownSummary,
  getFabricSubPartSkippedPieces,
  getFabricSkippedTrimmingLogs,
  getFabricThreadCuttingDecision,
} from '../src/utils/trimmingUtils';
import {
  isLotFullyDelivered,
  calculateReadyProductSets,
  getCleanDisplayNote,
  isEntityArchived,
  filterActiveEntities,
  filterArchivedEntities,
} from '../src/utils/deliveryUtils';

describe('Domain Module Separation Tests', () => {
  describe('cuttingUtils module', () => {
    it('resolvePieceLabel resolves structure parts and custom aliases correctly', () => {
      const struct = {
        subParts: [
          { id: 'collar_1', name: 'Mandarin Collar' },
          { id: 'cuff_2', name: 'French Cuff' },
        ],
      };
      expect(resolvePieceLabel('collar_1', struct)).toBe('Mandarin Collar');
      expect(resolvePieceLabel('custom_part_2', struct)).toBe('French Cuff');
      expect(resolvePieceLabel('pocket_flap', null)).toBe('Pocket Flap');
    });

    it('normalizeCutPiecesObject deduplicates case-insensitive keys', () => {
      const raw = { Front: '10', front: '25', Back: '15' };
      const res = normalizeCutPiecesObject(raw);
      expect(res.Front).toBe(25);
      expect(res.Back).toBe(15);
    });

    it('formatPieceName handles singular and plural rules', () => {
      expect(formatPieceName('Pocket', 1)).toBe('Pocket');
      expect(formatPieceName('Pocket', 3)).toBe('Pockets');
      expect(formatPieceName('Sleeve', 1)).toBe('Sleeve');
      expect(formatPieceName('Sleeve', 2)).toBe('Sleeves');
      expect(formatPieceName('Pcs', 10)).toBe('PCs');
      expect(formatPieceName('Set', 1)).toBe('Set');
      expect(formatPieceName('Set', 4)).toBe('Sets');
    });

    it('getGarmentPieceFormula builds human readable formula', () => {
      const struct = {
        subParts: [
          {
            name: 'Kurti',
            components: [
              { name: 'Front', qty: 1 },
              { name: 'Back', qty: 1 },
              { name: 'Sleeve', qty: 2 },
            ],
          },
        ],
      };
      expect(getGarmentPieceFormula(struct)).toBe('1 Kurti = 1 Front Cut PC + 1 Back Cut PC + 2 Sleeve Cut PCs');
    });

    it('getPieceValueFromObject extracts counts by key or label', () => {
      const pieces = { 'Top Kurti': 50, bottom_pant: 40 };
      expect(getPieceValueFromObject(pieces, 'top kurti')).toBe(50);
      expect(getPieceValueFromObject(pieces, 'bottom_pant')).toBe(40);
      expect(getPieceValueFromObject(pieces, 'nonexistent')).toBe(0);
    });

    it('resolvePieceRate identifies subpart or general rate', () => {
      const assignment = {
        subPartRates: {
          pant: 45,
        },
        ratePerPiece: 30,
      };
      expect(resolvePieceRate('pant', 'Pant', assignment)).toBe(45);
      expect(resolvePieceRate('shirt', 'Shirt', assignment)).toBe(30);
    });

    it('resolveWorkDetails computes tailor assignment metrics', () => {
      const assignment = {
        assignedPieces: { front: 50, back: 50 },
        ratePerPiece: 20,
      };
      const details = resolveWorkDetails(assignment);
      expect(details).toBeTruthy();
      expect(details.totalCutPieces).toBe(100);
      expect(details.totalPayout).toBeGreaterThan(0);
    });
  });

  describe('trimmingUtils module', () => {
    it('getHandoversBreakdownSummary sums and formats pieces', () => {
      const handovers = [
        { pieces: 40, productName: 'Shirt' },
        { pieces: 60, productName: 'Shirt' },
      ];
      expect(getHandoversBreakdownSummary(handovers)).toBe('100 Shirts');
    });

    it('getFabricSubPartSkippedPieces extracts admin skipped pieces', () => {
      const fabric = { id: 'fab_99' };
      const threadJobs = [
        { fabricId: 'fab_99', subPart: 'collar', assignedPieces: 10, status: 'Skipped', createdByRole: 'admin' },
        { fabricId: 'fab_99', subPart: 'cuff', assignedPieces: 15, status: 'Completed', createdByRole: 'admin' },
      ];
      const skipped = getFabricSubPartSkippedPieces(fabric, threadJobs);
      expect(skipped.collar).toBe(10);
      expect(skipped.cuff).toBeUndefined();
    });

    it('getFabricSkippedTrimmingLogs extracts trimming skipped logs', () => {
      const fabric = { id: 'fab_99' };
      const threadJobs = [
        { fabricId: 'fab_99', subPart: 'collar', assignedPieces: 10, status: 'Skipped', createdByRole: 'admin', assignedDate: '2026-03-01' },
      ];
      const logs = getFabricSkippedTrimmingLogs(fabric, threadJobs);
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].pieces).toBe(10);
    });

    it('getFabricThreadCuttingDecision detects assigned, skipped, and partial status', () => {
      const fabric = { id: 'fab_test' };
      const jobsAssign = [{ fabricId: 'fab_test', status: 'In Progress', createdByRole: 'admin' }];
      expect(getFabricThreadCuttingDecision(fabric, jobsAssign)).toBe('assigned');

      const jobsSkip = [{ fabricId: 'fab_test', status: 'Skipped', createdByRole: 'admin' }];
      expect(getFabricThreadCuttingDecision(fabric, jobsSkip)).toBe('skipped');

      const jobsMixed = [
        { fabricId: 'fab_test', status: 'In Progress', createdByRole: 'admin' },
        { fabricId: 'fab_test', status: 'Skipped', createdByRole: 'admin' },
      ];
      expect(getFabricThreadCuttingDecision(fabric, jobsMixed)).toBe('partial');
    });
  });

  describe('deliveryUtils module', () => {
    it('getCleanDisplayNote strips JSON envelopes and preserves clean text', () => {
      expect(getCleanDisplayNote('Delivered to Main Warehouse')).toBe('Delivered to Main Warehouse');
      expect(getCleanDisplayNote('{"userNotes":"Urgent dispatch via truck"}')).toBe('Urgent dispatch via truck');
      expect(getCleanDisplayNote('{"systemAction":"auto_sync"}')).toBe('');
      expect(getCleanDisplayNote(null)).toBe('');
    });

    it('isEntityArchived identifies archived states correctly', () => {
      expect(isEntityArchived({ isArchived: true })).toBe(true);
      expect(isEntityArchived({ status: 'Archived' })).toBe(true);
      expect(isEntityArchived({ fabricId: 'f1' }, [{ id: 'f1', isArchived: true }])).toBe(true);
      expect(isEntityArchived({ fabricId: 'f2' }, [{ id: 'f2', isArchived: false }])).toBe(false);
    });

    it('filterActiveEntities and filterArchivedEntities split lists cleanly', () => {
      const items = [
        { id: 1, isArchived: false },
        { id: 2, isArchived: true },
        { id: 3, isArchived: false },
      ];
      expect(filterActiveEntities(items)).toHaveLength(2);
      expect(filterArchivedEntities(items)).toHaveLength(1);
    });

    it('calculateReadyProductSets handles empty or unconfigured fabric safely', () => {
      const result = calculateReadyProductSets(null);
      expect(result.readyProductsCount).toBe(0);
      expect(result.isCompleteProductReady).toBe(false);
    });

    it('isLotFullyDelivered returns true for archived fabric', () => {
      expect(isLotFullyDelivered({ id: 'fab_arch', isArchived: true })).toBe(true);
    });
  });
});
