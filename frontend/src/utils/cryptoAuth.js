/**
 * Cryptographic authentication utilities for Fabric Manager.
 * Uses native browser Web Crypto API (crypto.subtle) without any third-party dependencies.
 * Implements salted PBKDF2-SHA256 one-way password hashing for database storage
 * with backward-compatible verification for legacy AES-256-GCM ciphertexts and plaintext.
 */

const MASTER_SECRET =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENCRYPTION_KEY) ||
  'fabric-manager-legacy-secret-2026';

const PBKDF2_ITERATIONS = 100000;

/**
 * Converts ArrayBuffer or Uint8Array to hex string.
 */
function bufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Converts hex string to Uint8Array.
 */
function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Gets the subtle crypto instance safely in browser or Node environments.
 */
function getSubtleCrypto() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('Web Crypto API is not supported in this environment.');
}

let cachedAesKey = null;

/**
 * Derives a 256-bit AES-GCM key from the application master secret (for legacy decrypt support).
 */
async function getAesKey() {
  if (cachedAesKey) return cachedAesKey;
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const rawKey = await subtle.digest('SHA-256', encoder.encode(MASTER_SECRET));
  cachedAesKey = await subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  return cachedAesKey;
}

/**
 * Hashes a plaintext password using salted PBKDF2-SHA256 with 100,000 iterations.
 * Format: `pbkdf2:<iterations>:<saltHex>:<hashHex>`
 * @param {string} plainPassword - Plain text password to hash
 * @returns {Promise<string>} Salted PBKDF2 hash string
 */
export async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();

  // 16-byte cryptographically secure random salt
  const salt = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(salt);
  } else {
    globalThis.crypto.getRandomValues(salt);
  }

  const passKey = await subtle.importKey(
    'raw',
    encoder.encode(plainPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passKey,
    256
  );

  const saltHex = bufferToHex(salt);
  const hashHex = bufferToHex(derivedBits);

  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Computes a PBKDF2-SHA256 hash hex string from given salt and iteration count.
 * Used for zero-knowledge challenge-response authentication against database.
 * @param {string} plainPassword
 * @param {string} saltHex
 * @param {number} [iterations]
 * @returns {Promise<string>} Hex encoded hash
 */
export async function computePbkdf2HashHex(plainPassword, saltHex, iterations = PBKDF2_ITERATIONS) {
  if (!plainPassword || !saltHex) return null;
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const salt = hexToBuffer(saltHex);

  const passKey = await subtle.importKey(
    'raw',
    encoder.encode(plainPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: iterations || PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passKey,
    256
  );

  return bufferToHex(derivedBits).toLowerCase();
}

/**
 * Backward-compatible alias for hashPassword.

 * New passwords are saved as salted PBKDF2 hashes instead of reversible encryption.
 */
export const encryptPassword = hashPassword;

/**
 * Decrypts a legacy AES-GCM encrypted password string back into plain text.
 * Note: Modern PBKDF2 salted hashes cannot and should not be decrypted; returns null.
 * @param {string} storedValue - Value from database
 * @returns {Promise<string|null>} Original plain text password, or null if salted hash or invalid
 */
export async function decryptPassword(storedValue) {
  if (!storedValue || typeof storedValue !== 'string') {
    return null;
  }

  // Modern salted PBKDF2 hashes cannot be decrypted (one-way security)
  if (storedValue.startsWith('pbkdf2:')) {
    return null;
  }

  // Legacy AES-256-GCM encrypted string (backward compatibility)
  if (storedValue.startsWith('enc:aes-gcm:')) {
    try {
      const parts = storedValue.split(':');
      if (parts.length !== 4) return null;
      const ivHex = parts[2];
      const cipherHex = parts[3];

      const subtle = getSubtleCrypto();
      const decoder = new TextDecoder();
      const key = await getAesKey();

      const iv = hexToBuffer(ivHex);
      const cipherBytes = hexToBuffer(cipherHex);

      const decryptedBuffer = await subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipherBytes
      );

      return decoder.decode(decryptedBuffer);
    } catch (e) {
      console.warn('Legacy AES password decryption warning:', e);
      return null;
    }
  }

  // Legacy plaintext (not encrypted or hashed yet)
  return storedValue;
}

/**
 * Verifies an entered password against stored database value.
 * Supports modern salted PBKDF2 hashes, legacy AES-256-GCM, and legacy plaintext with auto-upgrade.
 * @param {string} plainPassword - User entered password
 * @param {string} storedPassword - Value from database
 * @returns {Promise<{ valid: boolean, needsUpgrade: boolean, decryptedPassword?: string }>}
 */
export async function verifyPassword(plainPassword, storedPassword) {
  if (!plainPassword || !storedPassword) {
    return { valid: false, needsUpgrade: false };
  }

  // 1. Modern Salted PBKDF2 Hash Match
  if (storedPassword.startsWith('pbkdf2:')) {
    const parts = storedPassword.split(':');
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
      const saltHex = parts[2];
      const expectedHashHex = parts[3];

      const subtle = getSubtleCrypto();
      const encoder = new TextEncoder();
      const saltBytes = hexToBuffer(saltHex);

      const passKey = await subtle.importKey(
        'raw',
        encoder.encode(plainPassword),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations,
          hash: 'SHA-256',
        },
        passKey,
        256
      );

      const computedHashHex = bufferToHex(derivedBits);
      const valid = computedHashHex.toLowerCase() === expectedHashHex.toLowerCase();
      return { valid, needsUpgrade: false, decryptedPassword: valid ? plainPassword : undefined };
    }
  }

  // 2. Legacy AES-256-GCM Decryption & Match (Flags needsUpgrade so next login upgrades to PBKDF2)
  if (storedPassword.startsWith('enc:aes-gcm:')) {
    const decrypted = await decryptPassword(storedPassword);
    const valid = decrypted !== null && decrypted === plainPassword;
    return { valid, needsUpgrade: valid, decryptedPassword: decrypted || undefined };
  }

  // 3. Legacy Plaintext Match (Flags needsUpgrade so next login upgrades to PBKDF2)
  const valid = plainPassword === storedPassword;
  return { valid, needsUpgrade: valid, decryptedPassword: valid ? plainPassword : undefined };
}

