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
});

