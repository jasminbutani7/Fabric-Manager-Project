const crypto = require('crypto');

/**
 * Verify password against stored PBKDF2 hash
 * Format: pbkdf2$iterations$salt$hash
 */
function verifyPbkdf2Password(password, storedHash) {
  if (!password || !storedHash) return false;
  if (!storedHash.startsWith('pbkdf2$')) {
    // Plaintext or legacy fallback
    return password === storedHash;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 4) return false;

  const iterations = parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], 'hex');
  const expectedHash = parts[3];

  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  const actualHash = derivedKey.toString('hex');

  return crypto.timingSafeEqual(Buffer.from(actualHash), Buffer.from(expectedHash));
}

/**
 * Generate PBKDF2 hash for a password
 */
function hashPasswordPbkdf2(password, iterations = 100000) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return `pbkdf2$${iterations}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

/**
 * Sanitize 10-digit mobile number
 */
function sanitizeMobileNumber(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

module.exports = {
  verifyPbkdf2Password,
  hashPasswordPbkdf2,
  sanitizeMobileNumber,
};
