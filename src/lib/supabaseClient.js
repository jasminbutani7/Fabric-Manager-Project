import { createClient } from '@supabase/supabase-js';
import { isBrowserSessionValid, purgeAllStoredSessions, registerUnloadTracker } from '../utils/sessionSecurity';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-ref')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      autoRefreshToken: true,
    },
  })
  : null;

/**
 * Dynamically attach worker authentication token and identity headers to PostgREST calls.
 * Uses cryptographically signed Worker JWTs (x-worker-token) to guarantee tenant-isolated
 * access in worker portals without exposing raw admin credentials.
 */
export const setWorkerAuthHeader = (workerId, workerToken = null) => {
  if (!supabase || !supabase.rest) return;
  if (workerToken) {
    supabase.rest.headers['x-worker-token'] = String(workerToken).trim();
  } else if (!workerId) {
    delete supabase.rest.headers['x-worker-token'];
  }
  if (workerId) {
    supabase.rest.headers['x-worker-id'] = String(workerId).trim();
  } else {
    delete supabase.rest.headers['x-worker-id'];
  }
};

export const setTenantAuthHeader = (tenantId) => {
  if (!supabase || !supabase.rest) return;
  if (tenantId) {
    supabase.rest.headers['x-tenant-id'] = String(tenantId).trim();
  } else {
    delete supabase.rest.headers['x-tenant-id'];
  }
};

// Initialize unload tracking
if (typeof window !== 'undefined') {
  registerUnloadTracker();
}

// Initialize headers strictly from active browser session (sessionStorage)
if (typeof window !== 'undefined' && supabase) {
  try {
    if (!isBrowserSessionValid()) {
      purgeAllStoredSessions();
    } else {
      const raw = sessionStorage.getItem('fabric_app_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) {
          if (parsed.role === 'Admin') {
            setTenantAuthHeader(parsed.id);
          } else if (parsed.role === 'Master' || parsed.role === 'Tailor') {
            setWorkerAuthHeader(parsed.id, parsed.token || null);
            if (parsed.user_id || parsed.adminUserId) {
              setTenantAuthHeader(parsed.user_id || parsed.adminUserId);
            }
          }
        }
      }
    }
  } catch {}
}

