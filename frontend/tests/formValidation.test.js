import { describe, it, expect } from 'vitest';
import {
  sanitizeInteger,
  sanitizeDecimal,
  sanitizeMobileNumber,
  isValidMobileNumber,
  validateMobileNumber,
  isValidEmail,
  validateEmail,
} from '../src/utils/formValidation';

describe('Form Validation Utilities (formValidation)', () => {
  describe('sanitizeInteger', () => {
    it('should strip non-digits and keep valid integers', () => {
      expect(sanitizeInteger('123abc')).toBe('123');
      expect(sanitizeInteger('  456 ')).toBe('456');
      expect(sanitizeInteger('')).toBe('');
      expect(sanitizeInteger(null, { fallback: '0' })).toBe('0');
    });

    it('should clamp integer within min and max', () => {
      expect(sanitizeInteger('50', { min: 100, max: 200 })).toBe('100');
      expect(sanitizeInteger('300', { min: 100, max: 200 })).toBe('200');
      expect(sanitizeInteger('150', { min: 100, max: 200 })).toBe('150');
    });
  });

  describe('sanitizeDecimal', () => {
    it('should allow decimals and enforce maxDecimals', () => {
      expect(sanitizeDecimal('12.3456', { maxDecimals: 2 })).toBe('12.34');
      expect(sanitizeDecimal('100.5', { maxDecimals: 2 })).toBe('100.5');
      expect(sanitizeDecimal('abc99.99xyz')).toBe('99.99');
    });

    it('should handle multiple decimal points by keeping the first', () => {
      expect(sanitizeDecimal('12.34.56')).toBe('12.3456');
    });
  });

  describe('sanitizeMobileNumber & isValidMobileNumber', () => {
    it('should correctly sanitize 10-digit Indian numbers with prefixes', () => {
      expect(sanitizeMobileNumber('+91 98765 43210')).toBe('9876543210');
      expect(sanitizeMobileNumber('919876543210')).toBe('9876543210');
      expect(sanitizeMobileNumber('09876543210')).toBe('9876543210');
      expect(sanitizeMobileNumber('9876543210')).toBe('9876543210');
    });

    it('should validate 10-digit numbers starting with 6, 7, 8, 9', () => {
      expect(isValidMobileNumber('9876543210')).toBe(true);
      expect(isValidMobileNumber('8765432109')).toBe(true);
      expect(isValidMobileNumber('7654321098')).toBe(true);
      expect(isValidMobileNumber('6543210987')).toBe(true);
    });

    it('should reject invalid mobile numbers', () => {
      expect(isValidMobileNumber('5555555555')).toBe(false); // starts with 5
      expect(isValidMobileNumber('98765')).toBe(false); // too short
      expect(isValidMobileNumber('9876543210999')).toBe(true); // sanitized slice(0, 10) takes first 10
      expect(isValidMobileNumber('abcdefghij')).toBe(false);
      expect(isValidMobileNumber('')).toBe(false);
    });

    it('should provide structured validation messages via validateMobileNumber', () => {
      const validRes = validateMobileNumber('9876543210');
      expect(validRes.isValid).toBe(true);
      expect(validRes.cleanedValue).toBe('9876543210');

      const shortRes = validateMobileNumber('98765');
      expect(shortRes.isValid).toBe(false);
      expect(shortRes.error).toContain('must be exactly 10 digits');

      const invalidStart = validateMobileNumber('1234567890');
      expect(invalidStart.isValid).toBe(false);
      expect(invalidStart.error).toContain('must start with 6, 7, 8, or 9');
    });
  });

  describe('Email validation', () => {
    it('should correctly validate standard email addresses', () => {
      expect(isValidEmail('admin@fabricmanager.com')).toBe(true);
      expect(isValidEmail('worker.test+tag@sub.domain.co')).toBe(true);
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('@missingusername.com')).toBe(false);
      expect(isValidEmail('missingdomain@.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should return user-friendly errors via validateEmail', () => {
      const res = validateEmail('invalid-email');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('valid email address');

      const emptyRes = validateEmail('', { required: true });
      expect(emptyRes.isValid).toBe(false);
      expect(emptyRes.error).toContain('Please enter your email address');
    });
  });
});
