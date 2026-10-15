import { describe, it, expect } from 'vitest';
import { sendPasswordResetOtpEmail, getEnvConfig } from '../../backend/services/emailService.cjs';
import { hashPasswordPbkdf2, verifyPbkdf2Password, generateSecureOtp } from '../../backend/config/security.cjs';
import { verifyOtp, resetPassword } from '../../backend/controllers/authController.cjs';

describe('Backend Email Service & Password Reset OTP System', () => {
  it('should load environment config safely', () => {
    const config = getEnvConfig();
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  it('should deliver or simulate OTP delivery successfully', async () => {
    const testOtp = '654321';
    const result = await sendPasswordResetOtpEmail('testadmin@fabricmanager.com', testOtp, 'Test Admin');

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    if (result.simulated) {
      expect(result.otp).toBe(testOtp);
      expect(result.message).toMatch(/(Test|Developer) mode/);
    } else {
      expect(result.messageId).toBeDefined();
    }
  }, 15000);

  it('should generate valid 6-digit OTP codes and PBKDF2 password hashes', () => {
    const rawOtp = generateSecureOtp();
    expect(rawOtp).toHaveLength(6);
    expect(/^\d{6}$/.test(rawOtp)).toBe(true);
    const num = parseInt(rawOtp, 10);
    expect(num).toBeGreaterThanOrEqual(100000);
    expect(num).toBeLessThan(1000000);

    const newPass = 'StrongFabricPassword2026!';
    const hashed = hashPasswordPbkdf2(newPass);
    expect(hashed).toMatch(/^pbkdf2[:$]\d+[:$][a-f0-9]{32}[:$][a-f0-9]{64}$/);

    const matches = verifyPbkdf2Password(newPass, hashed);
    expect(matches).toBe(true);

    const rejects = verifyPbkdf2Password('WrongPass123', hashed);
    expect(rejects).toBe(false);
  });

  it('should validate OTP input constraints in verifyOtp controller', async () => {
    let statusCode = null;
    let jsonBody = null;
    const req = { body: { email: 'invalid_email', otp: '123' } };
    const res = {
      status: (c) => {
        statusCode = c;
        return {
          json: (b) => { jsonBody = b; },
        };
      },
    };

    await verifyOtp(req, res);
    expect(statusCode).toBe(400);
    expect(jsonBody.success).toBe(false);
  });

  it('should validate password length constraints in resetPassword controller', async () => {
    let statusCode = null;
    let jsonBody = null;
    const req = { body: { email: 'admin@fabric.com', newPassword: '123', otp: '123456' } };
    const res = {
      status: (c) => {
        statusCode = c;
        return {
          json: (b) => { jsonBody = b; },
        };
      },
    };

    await resetPassword(req, res);
    expect(statusCode).toBe(400);
    expect(jsonBody.success).toBe(false);
  });
});

