const { verifyJwt } = require('../config/security.cjs');

/**
 * Fabric Manager Backend Authentication & Tenant Isolation Middleware
 * Requires verified cryptographic JWT tokens (Bearer or x-worker-token).
 * Prevents tenant impersonation and header spoofing.
 */
function authenticateTenant(req, res, next) {
  const authHeader = req.headers.authorization;
  const workerTokenHeader = req.headers['x-worker-token'];
  const tenantIdHeader = req.headers['x-tenant-id'];

  let tokenToVerify = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    tokenToVerify = authHeader.substring(7).trim();
  } else if (workerTokenHeader && typeof workerTokenHeader === 'string' && workerTokenHeader.trim()) {
    tokenToVerify = workerTokenHeader.trim();
  }

  let verifiedPayload = null;
  if (tokenToVerify) {
    verifiedPayload = verifyJwt(tokenToVerify);
  }

  // If a valid cryptographic token is present
  if (verifiedPayload) {
    const verifiedTenantId = verifiedPayload.tenant_id || verifiedPayload.user_id || verifiedPayload.sub;

    // Cross-verify with x-tenant-id header if supplied by client to prevent spoofing
    if (tenantIdHeader && typeof tenantIdHeader === 'string' && tenantIdHeader.trim() !== verifiedTenantId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Request header x-tenant-id does not match verified token tenant scope',
      });
    }

    // Cross-verify with body/query parameter if present to prevent IDOR
    const requestedUserId = req.query.user_id || req.body?.user_id;
    if (requestedUserId && requestedUserId !== verifiedTenantId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Cannot access or mutate resources outside authenticated tenant scope',
      });
    }

    req.tenantId = verifiedTenantId;
    req.user = verifiedPayload;
    return next();
  }

  // In test or local dev mode, allow fallback only if explicitly running test/dev
  const isDevOrTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  if (isDevOrTest && tenantIdHeader && typeof tenantIdHeader === 'string' && tenantIdHeader.trim()) {
    const fallbackTenantId = tenantIdHeader.trim();
    const requestedUserId = req.query.user_id || req.body?.user_id;
    if (requestedUserId && requestedUserId !== fallbackTenantId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Cannot access or mutate resources outside authenticated tenant scope',
      });
    }
    req.tenantId = fallbackTenantId;
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Valid cryptographic authentication token (Bearer or x-worker-token) is required',
  });
}

module.exports = {
  authenticateTenant,
};

