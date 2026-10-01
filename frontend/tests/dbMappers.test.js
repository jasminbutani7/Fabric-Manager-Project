import { describe, it, expect } from 'vitest';
import {
  calculateAssignmentFinancials,
  getProductStructure,
  cleanNoteString,
  normalizeTailorAssignment,
  mapAssignmentToDb,
  mapLoadedFabric,
} from '../src/services/dbMappers';

describe('Database Mappers & Assignment Calculations (dbMappers)', () => {
  describe('calculateAssignmentFinancials', () => {
    it('should calculate financial amounts from assigned sub-parts and rates', () => {
      const assignedSubParts = {
        front_panel: 50,
        back_panel: 50,
        sleeves: 100,
      };
      const tailorRates = {
        front_panel: 12.5,
        back_panel: 10.0,
        sleeves: 5.0,
      };

      const result = calculateAssignmentFinancials(null, tailorRates, assignedSubParts);

      // 50 * 12.5 = 625
      // 50 * 10 = 500
      // 100 * 5 = 500
      // Total = 1625
      // Total qty = 200
      // Average rate = 1625 / 200 = 8.13
      expect(result.totalJobAmount).toBe(1625);
      expect(result.ratePerPiece).toBe(8.13);
      expect(result.pieceType).toContain('50 Front Panel');
      expect(result.pieceType).toContain('100 Sleeves');
    });

    it('should fallback to assignedPieces if assignedSubParts is missing', () => {
      const assignedPieces = {
        kurti_stitch: 20,
      };
      const tailorRates = {
        kurti_stitch: 45,
      };

      const result = calculateAssignmentFinancials(assignedPieces, tailorRates, null);

      expect(result.totalJobAmount).toBe(900);
      expect(result.ratePerPiece).toBe(45);
      expect(result.pieceType).toContain('20 Kurti Stitch');
    });

    it('should return 0 financial values when inputs are empty', () => {
      const result = calculateAssignmentFinancials(null, null, null);
      expect(result.totalJobAmount).toBe(0);
      expect(result.ratePerPiece).toBe(0);
      expect(result.pieceType).toBe('Garment Work');
    });
  });

  describe('getProductStructure', () => {
    it('should return existing structure if subParts array is present', () => {
      const source = {
        productStructure: {
          productName: 'Designer Frock',
          subParts: [{ id: 'bodice', name: 'Bodice', rate: 25 }],
        },
      };

      const struct = getProductStructure(source);
      expect(struct.productName).toBe('Designer Frock');
      expect(struct.subParts.length).toBe(1);
      expect(struct.subParts[0].name).toBe('Bodice');
    });

    it('should build a fallback default structure if none is defined', () => {
      const source = {
        productName: 'Simple Shirt',
        pricePerPiece: 55,
      };

      const struct = getProductStructure(source);
      expect(struct.productName).toBe('Simple Shirt');
      expect(struct.fullSetRate).toBe(55);
      expect(struct.subParts.length).toBe(1);
      expect(struct.subParts[0].name).toBe('Simple Shirt');
      expect(struct.subParts[0].rate).toBe(55);
    });
  });

  describe('cleanNoteString', () => {
    it('should clean JSON strings and extract userNotes if available', () => {
      const jsonStr = JSON.stringify({ userNotes: 'Urgent delivery for party' });
      expect(cleanNoteString(jsonStr)).toBe('Urgent delivery for party');
    });

    it('should return plain text trimmed', () => {
      expect(cleanNoteString('  Normal notes string  ')).toBe('Normal notes string');
      expect(cleanNoteString('')).toBeNull();
      expect(cleanNoteString(null)).toBeNull();
    });
  });

  describe('normalizeTailorAssignment & mapAssignmentToDb', () => {
    it('should automatically set tailorAccepted to true if submissions exist', () => {
      const dbRowWithSubs = {
        id: 'asgn_123',
        status: 'Pending Acceptance',
        tailorAccepted: false,
        dailySubmissions: [
          { id: 'sub_1', quantity: 20, approvalStatus: 'Pending Approval' },
        ],
        totalAssignedPieces: 100,
        completedQuantity: 0,
      };

      const mapped = normalizeTailorAssignment(dbRowWithSubs);
      expect(mapped.tailorAccepted).toBe(true);
      expect(mapped.status).toBe('In Stitching');
    });

    it('should persist tailor_accepted as true in mapAssignmentToDb when submissions exist', () => {
      const assignment = {
        id: 'asgn_123',
        status: 'Pending Acceptance',
        tailorAccepted: false,
        dailySubmissions: [
          { id: 'sub_1', quantity: 15, approvalStatus: 'Pending Approval' },
        ],
        totalAssignedPieces: 100,
        completedQuantity: 0,
      };

      const dbPayload = mapAssignmentToDb(assignment, 'user_test');
      expect(dbPayload.tailor_accepted).toBe(true);
      expect(dbPayload.status).toBe('In Stitching');
    });

    it('should map is_archived correctly and store archivedAt/restoredAt in _meta without top-level columns', () => {
      const restoredAssignment = {
        id: 'asgn_restore_test',
        isArchived: false,
        archivedAt: null,
        restoredAt: '2026-09-30T12:00:00.000Z',
        assignedGarmentPcs: { front: 10 },
      };

      const payload = mapAssignmentToDb(restoredAssignment, 'user_test');
      expect(payload.is_archived).toBe(false);
      expect(payload.archived_at).toBeUndefined();
      expect(payload.restored_at).toBeUndefined();
      expect(payload.assigned_garment_pcs._meta.restoredAt).toBe('2026-09-30T12:00:00.000Z');
      expect(payload.assigned_garment_pcs._meta.archivedAt).toBeNull();

      const archivedAssignment = {
        id: 'asgn_archive_test',
        isArchived: true,
        archivedAt: '2026-09-30T10:00:00.000Z',
        restoredAt: null,
      };
      const archivedPayload = mapAssignmentToDb(archivedAssignment, 'user_test');
      expect(archivedPayload.is_archived).toBe(true);
      expect(archivedPayload.archived_at).toBeUndefined();
      expect(archivedPayload.restored_at).toBeUndefined();
      expect(archivedPayload.assigned_garment_pcs._meta.archivedAt).toBe('2026-09-30T10:00:00.000Z');
      expect(archivedPayload.assigned_garment_pcs._meta.restoredAt).toBeNull();
    });
  });

  describe('mapLoadedFabric', () => {
    it('should keep productStructure as null and productName empty when database row has nulls', () => {
      const dbRow = {
        id: 'fab_new_1',
        lot_no: 3,
        fabric_type: 'Cotton',
        product_name: null,
        product_structure: null,
        tailor_rates: null,
      };

      const mapped = mapLoadedFabric(dbRow);
      expect(mapped.productStructure).toBeNull();
      expect(mapped.product_structure).toBeNull();
      expect(mapped.productName).toBe('');
      expect(mapped.product_name).toBe('');
    });

    it('should correctly parse valid product_structure from database', () => {
      const dbRow = {
        id: 'fab_configured_1',
        lot_no: 4,
        fabric_type: 'Rayon',
        product_name: 'Kurti Set',
        product_structure: {
          productName: 'Kurti Set',
          subParts: [
            { id: 'top', name: 'Top', rate: 25 },
            { id: 'bottom', name: 'Bottom', rate: 20 },
          ],
        },
      };

      const mapped = mapLoadedFabric(dbRow);
      expect(mapped.productStructure).not.toBeNull();
      expect(mapped.productStructure.subParts).toHaveLength(2);
      expect(mapped.productName).toBe('Kurti Set');
    });
  });
});

