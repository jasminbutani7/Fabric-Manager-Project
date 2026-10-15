import { describe, it, expect } from 'vitest';
import { formatWhatsAppPhone, buildWhatsAppUrl } from '../src/utils/whatsappNotification';

describe('WhatsApp Link & Phone Normalization', () => {
  it('should correctly format standard 10-digit Indian phone numbers', () => {
    expect(formatWhatsAppPhone('9876543210')).toBe('919876543210');
    expect(formatWhatsAppPhone(' 98765 43210 ')).toBe('919876543210');
    expect(formatWhatsAppPhone('98765-43210')).toBe('919876543210');
  });

  it('should prevent double-prefixing when 91 is already present', () => {
    expect(formatWhatsAppPhone('+919876543210')).toBe('919876543210');
    expect(formatWhatsAppPhone('919876543210')).toBe('919876543210');
    expect(formatWhatsAppPhone('+91 98765-43210')).toBe('919876543210');
  });

  it('should strip leading 0 for 11-digit numbers and prepend 91', () => {
    expect(formatWhatsAppPhone('09876543210')).toBe('919876543210');
  });

  it('should preserve international numbers without forcing 91', () => {
    expect(formatWhatsAppPhone('+1 (415) 555-2671')).toBe('14155552671');
    expect(formatWhatsAppPhone('+44 7911 123456')).toBe('447911123456');
  });

  it('should handle empty or null phone numbers gracefully', () => {
    expect(formatWhatsAppPhone('')).toBe('');
    expect(formatWhatsAppPhone(null)).toBe('');
    expect(formatWhatsAppPhone(undefined)).toBe('');
  });

  it('should generate valid wa.me URLs with encoded message', () => {
    const url = buildWhatsAppUrl('9876543210', 'Hello World! How are you?');
    expect(url).toBe('https://wa.me/919876543210?text=Hello%20World!%20How%20are%20you%3F');
  });

  it('should generate wa.me link without phone when phone is not provided', () => {
    const url = buildWhatsAppUrl('', 'General broadcast');
    expect(url).toBe('https://api.whatsapp.com/send?text=General%20broadcast');
  });
});
