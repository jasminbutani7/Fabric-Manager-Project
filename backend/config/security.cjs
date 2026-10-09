const crypto = require('crypto');

/**
 * Verify password against stored PBKDF2 hash
 * Format: pbkdf2$iterations$salt$hash
 */
function verifyPbkdf2Password(password, storedHash) {
  if (!password || !storedHash) return false;
  if (!storedHash.startsWith('pbkdf2$')) {
    // Legacy fallback for unmigrated legacy users
    return password === storedHash;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 4) return false;

  const iterations = parseInt(parts[1], 10);
  if (isNaN(iterations) || iterations <= 0) return false;

  try {
    const salt = Buffer.from(parts[2], 'hex');
    const expectedHash = parts[3];

    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    const actualHash = derivedKey.toString('hex');

    const actualBuf = Buffer.from(actualHash);
    const expectedBuf = Buffer.from(expectedHash);

    if (actualBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(actualBuf, expectedBuf);
  } catch {
    return false;
  }
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
 * Hash a 4-to-6 digit worker PIN using PBKDF2
 */
function hashWorkerPin(pin, iterations = 100000) {
  return hashPasswordPbkdf2(String(pin || '').trim(), iterations);
}

/**
 * Verify a worker PIN against stored PBKDF2 hash or legacy PIN
 */
function verifyWorkerPin(pin, storedPinOrHash) {
  if (!pin || !storedPinOrHash) return false;
  const cleanPin = String(pin).trim();
  if (storedPinOrHash.startsWith('pbkdf2$')) {
    return verifyPbkdf2Password(cleanPin, storedPinOrHash);
  }
  // Backward compatibility with legacy plaintext PINs during migration
  return cleanPin === String(storedPinOrHash).trim();
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
  hashWorkerPin,
  verifyWorkerPin,
  sanitizeMobileNumber,
};
