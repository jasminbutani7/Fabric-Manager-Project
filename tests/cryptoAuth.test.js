import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  decryptPassword,
  encryptPassword,
  computePbkdf2HashHex,
} from '../src/utils/cryptoAuth';


describe('Cryptographic Authentication (cryptoAuth)', () => {
  it('should generate a salted PBKDF2 hash in the expected format', async () => {
    const rawPassword = 'SecurePassword123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(hash.startsWith('pbkdf2:100000:')).toBe(true);

    const parts = hash.split(':');
    expect(parts.length).toBe(4);
    expect(parts[0]).toBe('pbkdf2');
    expect(parts[1]).toBe('100000');
    // Salt should be 16 bytes = 32 hex chars
    expect(parts[2].length).toBe(32);
    // 256-bit derived bits = 64 hex chars
    expect(parts[3].length).toBe(64);
  });

  it('should generate distinct salts and hashes for the same password', async () => {
    const rawPassword = 'IdenticalPassword2026';
    const hash1 = await hashPassword(rawPassword);
    const hash2 = await hashPassword(rawPassword);

    expect(hash1).not.toBe(hash2);
    expect(hash1.split(':')[2]).not.toBe(hash2.split(':')[2]);
  });

  it('should successfully verify correct password against PBKDF2 hash', async () => {
    const rawPassword = 'CorrectHorseBatteryStaple';
    const hash = await hashPassword(rawPassword);

    const result = await verifyPassword(rawPassword, hash);
    expect(result.valid).toBe(true);
    expect(result.needsUpgrade).toBe(false);
    expect(result.decryptedPassword).toBe(rawPassword);
  });

  it('should reject incorrect password against PBKDF2 hash', async () => {
    const rawPassword = 'RightPassword';
    const hash = await hashPassword(rawPassword);

    const result = await verifyPassword('WrongPassword', hash);
    expect(result.valid).toBe(false);
  });

  it('should verify legacy plaintext and flag needsUpgrade', async () => {
    const plain = 'LegacyPassword123';
    const result = await verifyPassword(plain, plain);

    expect(result.valid).toBe(true);
    expect(result.needsUpgrade).toBe(true);
    expect(result.decryptedPassword).toBe(plain);
  });

  it('should return null when attempting to decrypt modern PBKDF2 hash (one-way security)', async () => {
    const hash = await hashPassword('SecretValue');
    const decrypted = await decryptPassword(hash);

    expect(decrypted).toBeNull();
  });

  it('should alias encryptPassword to hashPassword', () => {
    expect(encryptPassword).toBe(hashPassword);
  });

  it('should compute exact PBKDF2 hash hex for challenge-response authentication', async () => {
    const rawPassword = 'ChallengeResponsePassword123';
    const fullHash = await hashPassword(rawPassword);
    const parts = fullHash.split(':');
    const iterations = parseInt(parts[1], 10);
    const saltHex = parts[2];
    const expectedHashHex = parts[3];

    const computed = await computePbkdf2HashHex(rawPassword, saltHex, iterations);
    expect(computed).toBe(expectedHashHex.toLowerCase());

    const wrongComputed = await computePbkdf2HashHex('WrongPassword', saltHex, iterations);
    expect(wrongComputed).not.toBe(expectedHashHex.toLowerCase());
  });
});

