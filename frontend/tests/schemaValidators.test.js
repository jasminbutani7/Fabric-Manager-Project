import { describe, it, expect } from 'vitest';
import {
  validateProductStructure,
  validateTailorRates,
  validatePieceCounts,
} from '../src/utils/schemaValidators';

describe('Runtime Schema Validators & Type Guards', () => {
  describe('validateProductStructure', () => {
    it('returns default fallback structure when input is null or corrupted string', () => {
      const res1 = validateProductStructure(null, 'Kurti');
      expect(res1.productName).toBe('Kurti');
      expect(res1.subParts).toHaveLength(1);
      expect(res1.subParts[0].name).toBe('Kurti');

      const res2 = validateProductStructure('{invalid json}', 'Pant');
      expect(res2.productName).toBe('Pant');
      expect(res2.subParts).toHaveLength(1);
    });

    it('correctly normalizes valid product structure with nested components', () => {
      const input = {
        productName: '3-Piece Suit',
        subParts: [
          {
            id: 'coat',
            name: 'Blazer Coat',
            rate: '150.50',
            components: [
              { id: 'c1', name: 'Front Lapel', qty: '2' },
              { id: 'c2', name: 'Back Body', qty: 1 },
            ],
          },
        ],
      };

      const result = validateProductStructure(input);
      expect(result.productName).toBe('3-Piece Suit');
      expect(result.subParts).toHaveLength(1);
      expect(result.subParts[0].rate).toBe(150.5);
      expect(result.subParts[0].components[0].qty).toBe(2);
    });

    it('handles legacy parts array alias and sanitizes negative rates', () => {
      const input = {
        productName: 'Sherwani',
        parts: [
          { name: 'Top', rate: -50 },
        ],
      };

      const result = validateProductStructure(input);
      expect(result.subParts[0].rate).toBe(0);
      expect(result.subParts[0].id).toBe('top');
    });
  });

  describe('validateTailorRates', () => {
    it('sanitizes numeric values and ignores negative/invalid rates', () => {
      const input = {
        top: '25.50',
        bottom: 20,
        sleeve: 'invalid',
        collar: -10,
      };

      const rates = validateTailorRates(input);
      expect(rates).toEqual({
        top: 25.5,
        bottom: 20,
      });
    });

    it('returns empty object for null, string, or corrupted inputs', () => {
      expect(validateTailorRates(null)).toEqual({});
      expect(validateTailorRates('not json')).toEqual({});
      expect(validateTailorRates([1, 2, 3])).toEqual({});
    });
  });

  describe('validatePieceCounts', () => {
    it('normalizes integer piece allocations and filters out negative numbers', () => {
      const input = {
        top: '50',
        bottom: 45,
        dupatta: -5,
        extra: 'NaN',
      };

      const counts = validatePieceCounts(input);
      expect(counts).toEqual({
        top: 50,
        bottom: 45,
      });
    });
  });
});
