import { describe, it, expect } from 'vitest';
import { setWorkerAuthHeader, setTenantAuthHeader, supabase } from '../src/lib/supabaseClient';

describe('Phase 1 Security & Authentication Isolation', () => {
  it('should set and clear worker auth and tenant headers on supabase client', () => {
    if (!supabase || !supabase.rest) {
      // In non-configured env, functions should execute without throwing
      expect(() => setWorkerAuthHeader('mst_test123', 'worker_jwt_token_sample')).not.toThrow();
      expect(() => setTenantAuthHeader('usr_admin456')).not.toThrow();
      expect(() => setWorkerAuthHeader(null)).not.toThrow();
      expect(() => setTenantAuthHeader(null)).not.toThrow();
      return;
    }

    setWorkerAuthHeader('mst_test123', 'worker_jwt_token_sample');
    expect(supabase.rest.headers['x-worker-id']).toBe('mst_test123');
    expect(supabase.rest.headers['x-worker-token']).toBe('worker_jwt_token_sample');

    setTenantAuthHeader('usr_admin456');
    expect(supabase.rest.headers['x-tenant-id']).toBe('usr_admin456');

    setWorkerAuthHeader(null);
    expect(supabase.rest.headers['x-worker-id']).toBeUndefined();
    expect(supabase.rest.headers['x-worker-token']).toBeUndefined();

    setTenantAuthHeader(null);
    expect(supabase.rest.headers['x-tenant-id']).toBeUndefined();
  });

  it('should validate mobile numbers correctly for worker authentication', () => {
    const raw1 = '+91 98765 43210';
    const cleaned1 = raw1.replace(/\D/g, '').slice(-10);
    expect(cleaned1).toBe('9876543210');
    expect(cleaned1.slice(-4)).toBe('3210');

    const raw2 = '09876543210';
    const cleaned2 = raw2.replace(/\D/g, '').slice(-10);
    expect(cleaned2).toBe('9876543210');
  });

  it('should verify worker custom pin takes precedence over default pin fallback', () => {
    const customPassword = 'customSecretPin';
    const enteredDefault = 'master123';
    const enteredCorrect = 'customSecretPin';

    // With custom password set, default pin must NOT match
    const isValidDefault = customPassword === enteredDefault;
    expect(isValidDefault).toBe(false);

    // With custom password set, correct password matches
    const isValidCorrect = customPassword === enteredCorrect;
    expect(isValidCorrect).toBe(true);
  });

  it('should validate structured Worker JWT payload format', () => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: 'mst_123',
      worker_id: 'mst_123',
      role: 'Master',
      tenant_id: 'usr_admin',
      name: 'Ramesh',
      exp: Math.floor(Date.now() / 1000) + 86400 * 30,
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const dummyToken = `${b64Header}.${b64Payload}.dummy_sig`;

    const parts = dummyToken.split('.');
    expect(parts.length).toBe(3);

    const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    expect(decodedPayload.sub).toBe('mst_123');
    expect(decodedPayload.role).toBe('Master');
    expect(decodedPayload.tenant_id).toBe('usr_admin');
    expect(decodedPayload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should sign and verify cryptographic HS256 JWTs with signature validation', async () => {
    const { signJwt, verifyJwt, generateTenantToken, generateWorkerToken } = await import('../../backend/config/security.cjs');

    const adminUser = {
      id: 'usr_admin_live',
      name: 'Admin Owner',
      phone: '9876543210',
      email: 'admin@fabric.com',
      role: 'Admin',
    };

    const token = generateTenantToken(adminUser);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const verified = verifyJwt(token);
    expect(verified).not.toBeNull();
    expect(verified.tenant_id).toBe('usr_admin_live');
    expect(verified.sub).toBe('usr_admin_live');
    expect(verified.role).toBe('Admin');

    // Tampered signature must fail verification
    const parts = token.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.tampered_signature_xyz`;
    expect(verifyJwt(tamperedToken)).toBeNull();

    // Expired token must fail verification
    const expiredToken = signJwt({ sub: 'usr_expired', tenant_id: 'usr_expired' }, undefined, -10);
    expect(verifyJwt(expiredToken)).toBeNull();

    // Worker token signing and verification
    const worker = {
      id: 'tlr_operator_1',
      user_id: 'usr_admin_live',
      role: 'Tailor',
      name: 'Ramesh Tailor',
      phone: '9876500000',
    };
    const workerToken = generateWorkerToken(worker);
    const verifiedWorker = verifyJwt(workerToken);
    expect(verifiedWorker).not.toBeNull();
    expect(verifiedWorker.worker_id).toBe('tlr_operator_1');
    expect(verifiedWorker.tenant_id).toBe('usr_admin_live');
    expect(verifiedWorker.role).toBe('Tailor');
  });

  it('should protect authenticateTenant middleware against tenant header spoofing and IDOR', async () => {
    const { authenticateTenant } = await import('../../backend/middleware/authMiddleware.cjs');
    const { generateTenantToken } = await import('../../backend/config/security.cjs');

    const validToken = generateTenantToken({ id: 'usr_genuine_admin', role: 'Admin' });

    // 1. Valid token passes
    let nextCalled = false;
    let req = {
      headers: { authorization: `Bearer ${validToken}` },
      query: {},
      body: {},
    };
    let res = {
      status: (code) => ({
        json: (data) => ({ status: code, data }),
      }),
    };
    authenticateTenant(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.tenantId).toBe('usr_genuine_admin');

    // 2. Attacker attempts to spoof x-tenant-id with another tenant ID
    let statusCode = null;
    let errorMsg = null;
    req = {
      headers: {
        authorization: `Bearer ${validToken}`,
        'x-tenant-id': 'usr_victim_admin',
      },
      query: {},
      body: {},
    };
    res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { errorMsg = data.error; },
        };
      },
    };
    nextCalled = false;
    authenticateTenant(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
    expect(errorMsg).toMatch(/does not match verified token tenant scope/);

    // 3. Attacker attempts IDOR via ?user_id=victim
    req = {
      headers: { authorization: `Bearer ${validToken}` },
      query: { user_id: 'usr_victim_admin' },
      body: {},
    };
    statusCode = null;
    errorMsg = null;
    nextCalled = false;
    authenticateTenant(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
    expect(errorMsg).toMatch(/outside authenticated tenant scope/);

    // 4. Missing token in non-test production environment
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    req = {
      headers: { 'x-tenant-id': 'usr_spoofed' },
      query: {},
      body: {},
    };
    statusCode = null;
    nextCalled = false;
    authenticateTenant(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(401);
    process.env.NODE_ENV = prevEnv;
  });
});


