/**
 * Centralized, cryptographically secure ID generator for offline-first resilience.
 * Eliminates client-side clock collision risks (Date.now() collisions) when records
 * are created rapidly or across distributed devices.
 */

/**
 * Generates a collision-proof ID with a domain-specific prefix.
 * Example: generateEntityId('fab') -> 'fab_e4eaaaf2f97441638249f7e8a946b2b2'
 *
 * @param {string} prefix - Entity prefix (e.g. 'fab', 'cut', 'asgn', 'inv', 'exp')
 * @returns {string} Unique prefixed identifier
 */
export function generateEntityId(prefix = 'id') {
  let uniquePart;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uniquePart = crypto.randomUUID().replace(/-/g, '');
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    uniquePart = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Ultimate fallback for ancient runtime environments
    uniquePart = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
  return `${prefix}_${uniquePart}`;
}

/**
 * Generates a standard RFC 4122 v4 UUID string.
 * @returns {string} Standard UUID format (e.g., '109156be-c4fb-41ea-b1b4-efe1671c5836')
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC 4122 v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
