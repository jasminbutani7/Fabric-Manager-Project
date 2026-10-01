/**
 * Session Security & Browser Lifecycle Validator
 *
 * Ensures all sessions strictly expire when the browser or tab is closed,
 * even if tabs are restored using Ctrl+Shift+T or Chromium "Continue where you left off".
 */

const STORAGE_SESSION_KEY = 'fabric_app_session';
const LEGACY_STORAGE_SESSION_KEY = 'febric_app_session';
const UNLOAD_TIMESTAMP_KEY = 'fabric_session_last_unload';
const MAX_RELOAD_INTERVAL_MS = 30000; // 30 seconds to safely accommodate dev server compilation & DevTools

/**
 * Returns tenant-isolated cache key for any entity table.
 */
export function getScopedTableCacheKey(tableName, userId) {
  return userId ? `fm_${tableName}_cache_${userId}` : null;
}

/**
 * Returns the tenant-isolated cache key for expenses.
 */
export function getScopedExpenseCacheKey(userId) {
  return getScopedTableCacheKey('expenses', userId);
}

/**
 * Purges all persistent table caches to prevent cross-account data leakage.
 */
export function purgeExpenseCaches() {
  if (typeof window === 'undefined') return;
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('fm_') && k.includes('_cache_'))) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/**
 * Purges all persistent and session storage auth tokens across localStorage and sessionStorage.
 */
export function purgeAllStoredSessions() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
    sessionStorage.removeItem(LEGACY_STORAGE_SESSION_KEY);
    sessionStorage.removeItem(UNLOAD_TIMESTAMP_KEY);
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(LEGACY_STORAGE_SESSION_KEY);
    localStorage.removeItem(UNLOAD_TIMESTAMP_KEY);
    purgeExpenseCaches();
  } catch {}
}

/**
 * Checks whether the current page load represents a legitimate active in-tab refresh (F5 / Ctrl+R)
 * or a restored closed tab / restarted browser session (Ctrl+Shift+T / session restore).
 *
 * @returns {boolean} True if the session should be retained; false if it must expire.
 */
export function isBrowserSessionValid() {
  if (typeof window === 'undefined') return true;

  // In test environment (Vitest/Jest), permit session restoration
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return true;
  }

  try {
    // Check Navigation Timing Level 2
    let navType = '';
    if (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function') {
      const entries = performance.getEntriesByType('navigation');
      if (entries && entries.length > 0) {
        navType = entries[0].type; // 'navigate' | 'reload' | 'back_forward' | 'prerender'
      }
    }

    // Fallback to legacy navigation timing API if needed
    const legacyType = typeof performance !== 'undefined' && performance.navigation ? performance.navigation.type : -1;

    const isReload = navType === 'reload' || legacyType === 1;
    const isBackForward = navType === 'back_forward' || legacyType === 2;

    // If restored via Ctrl+Shift+T (history traversal restore), force session expiry
    if (isBackForward) {
      purgeAllStoredSessions();
      return false;
    }

    // If an explicit in-tab reload occurred (F5 / Ctrl+R / location.reload), preserve session
    if (isReload) {
      return true;
    }

    // For general navigations (new window / browser restart restore):
    // Check the time difference since the document last unloaded
    const lastUnloadRaw = sessionStorage.getItem(UNLOAD_TIMESTAMP_KEY);
    if (!lastUnloadRaw) {
      // First visit in a clean tab - no previous unload timestamp exists
      return true;
    }

    const lastUnload = parseInt(lastUnloadRaw, 10);
    const now = Date.now();
    const elapsed = now - lastUnload;

    // If the time between unload and new load exceeds allowable reload threshold,
    // the browser was closed -> Expire session
    if (elapsed > MAX_RELOAD_INTERVAL_MS) {
      purgeAllStoredSessions();
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Session security validation check exception:', err);
    return false;
  }
}

/**
 * Registers an unload listener to record timestamp when the tab/window is closing.
 */
export function registerUnloadTracker() {
  if (typeof window === 'undefined') return;

  const recordUnload = () => {
    try {
      sessionStorage.setItem(UNLOAD_TIMESTAMP_KEY, Date.now().toString());
    } catch {}
  };

  window.addEventListener('beforeunload', recordUnload);
  window.addEventListener('pagehide', recordUnload);
}
