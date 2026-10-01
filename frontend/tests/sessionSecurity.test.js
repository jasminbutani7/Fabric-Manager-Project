// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isBrowserSessionValid,
  purgeAllStoredSessions,
  registerUnloadTracker,
} from '../src/utils/sessionSecurity';

describe('sessionSecurity Utilities', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('purgeAllStoredSessions cleans up all auth storage keys', () => {
    sessionStorage.setItem('fabric_app_session', 'test');
    sessionStorage.setItem('febric_app_session', 'test');
    sessionStorage.setItem('fabric_session_last_unload', '12345');
    localStorage.setItem('fabric_app_session', 'test');
    localStorage.setItem('febric_app_session', 'test');
    localStorage.setItem('fabric_session_last_unload', '12345');

    purgeAllStoredSessions();

    expect(sessionStorage.getItem('fabric_app_session')).toBeNull();
    expect(sessionStorage.getItem('febric_app_session')).toBeNull();
    expect(sessionStorage.getItem('fabric_session_last_unload')).toBeNull();
    expect(localStorage.getItem('fabric_app_session')).toBeNull();
    expect(localStorage.getItem('febric_app_session')).toBeNull();
    expect(localStorage.getItem('fabric_session_last_unload')).toBeNull();
  });

  it('preserves session on in-tab page reload (F5)', () => {
    // Mock performance navigation timing as reload
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type: 'reload' }]);

    const valid = isBrowserSessionValid();
    expect(valid).toBe(true);
  });

  it('expires session on history traversal / Ctrl+Shift+T restore (back_forward)', () => {
    sessionStorage.setItem('fabric_app_session', JSON.stringify({ id: 'user1' }));
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type: 'back_forward' }]);

    // Temporarily disable test-env bypass to test browser logic
    const oldNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const valid = isBrowserSessionValid();
      expect(valid).toBe(false);
      expect(sessionStorage.getItem('fabric_app_session')).toBeNull();
    } finally {
      process.env.NODE_ENV = oldNodeEnv;
    }
  });

  it('expires session if browser was closed for longer than allowable threshold', () => {
    sessionStorage.setItem('fabric_app_session', JSON.stringify({ id: 'user1' }));
    // Last unloaded 35 seconds ago (exceeding the 30s threshold)
    sessionStorage.setItem('fabric_session_last_unload', (Date.now() - 35000).toString());
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type: 'navigate' }]);

    const oldNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const valid = isBrowserSessionValid();
      expect(valid).toBe(false);
      expect(sessionStorage.getItem('fabric_app_session')).toBeNull();
    } finally {
      process.env.NODE_ENV = oldNodeEnv;
    }
  });

  it('records unload timestamp when beforeunload is dispatched', () => {
    registerUnloadTracker();
    const beforeUnloadEvent = new Event('beforeunload');
    window.dispatchEvent(beforeUnloadEvent);

    const recorded = sessionStorage.getItem('fabric_session_last_unload');
    expect(recorded).toBeTruthy();
    expect(parseInt(recorded, 10)).toBeGreaterThan(0);
  });
});
