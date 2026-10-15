const crypto = require('crypto');

/**
 * Verify password against stored PBKDF2 hash
 * Supports both colon format (pbkdf2:iterations:salt:hash) and dollar format (pbkdf2$iterations$salt$hash)
 */
function verifyPbkdf2Password(password, storedHash) {
  if (!password || !storedHash) return false;
  
  const isColonFormat = storedHash.startsWith('pbkdf2:');
  const isDollarFormat = storedHash.startsWith('pbkdf2$');

  if (!isColonFormat && !isDollarFormat) {
    // Legacy fallback for unmigrated legacy users
    return password === storedHash;
  }

  const delimiter = isColonFormat ? ':' : '$';
  const parts = storedHash.split(delimiter);
  if (parts.length !== 4) return false;

  const iterations = parseInt(parts[1], 10);
  if (isNaN(iterations) || iterations <= 0) return false;

  try {
    const salt = Buffer.from(parts[2], 'hex');
    const expectedHash = parts[3].toLowerCase();

    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    const actualHash = derivedKey.toString('hex').toLowerCase();

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
 * Generate canonical PBKDF2 hash for a password
 * Format: pbkdf2:<iterations>:<saltHex>:<hashHex>
 */
function hashPasswordPbkdf2(password, iterations = 100000) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return `pbkdf2:${iterations}:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
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
  if (storedPinOrHash.startsWith('pbkdf2:') || storedPinOrHash.startsWith('pbkdf2$')) {
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

/**
 * Generate cryptographically strong 6-digit OTP code using crypto.randomInt
 */
function generateSecureOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fabric_manager_secure_jwt_secret_key_2026';

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

/**
 * Sign standard HS256 JSON Web Token (JWT)
 */
function signJwt(payload, secret = JWT_SECRET, expiresInSeconds = 86400 * 30) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify HS256 JSON Web Token signature and expiration
 */
function verifyJwt(token, secret = JWT_SECRET) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  try {
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    const expectedBuf = Buffer.from(expectedSig);
    const actualBuf = Buffer.from(signature);
    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Generate authenticated tenant session JWT token
 */
function generateTenantToken(user) {
  return signJwt({
    sub: user.id,
    user_id: user.id,
    tenant_id: user.id,
    role: user.role || 'Admin',
    name: user.name,
    phone: user.phone,
    email: user.email,
  });
}

/**
 * Generate authenticated worker session JWT token
 */
function generateWorkerToken(worker) {
  return signJwt({
    sub: worker.id,
    worker_id: worker.id,
    tenant_id: worker.user_id,
    user_id: worker.user_id,
    role: worker.role,
    name: worker.name,
    phone: worker.phone,
  });
}

module.exports = {
  verifyPbkdf2Password,
  hashPasswordPbkdf2,
  hashWorkerPin,
  verifyWorkerPin,
  sanitizeMobileNumber,
  generateSecureOtp,
  signJwt,
  verifyJwt,
  generateTenantToken,
  generateWorkerToken,
  JWT_SECRET,
};

