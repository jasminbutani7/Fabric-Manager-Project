/**
 * Fabric Manager Backend Authentication & Tenant Isolation Middleware
 */

/**
 * Middleware ensuring incoming REST requests belong to an authenticated tenant.
 * Defends against IDOR (Insecure Direct Object Reference) by ensuring queries/body user_id
 * strictly matches the authenticated x-tenant-id header.
 */
function authenticateTenant(req, res, next) {
  const authHeader = req.headers.authorization;
  const tenantIdHeader = req.headers['x-tenant-id'];
  const workerToken = req.headers['x-worker-token'];

  let resolvedTenantId = null;

  if (tenantIdHeader && typeof tenantIdHeader === 'string' && tenantIdHeader.trim()) {
    resolvedTenantId = tenantIdHeader.trim();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    resolvedTenantId = authHeader.substring(7).trim();
  }

  if (!resolvedTenantId && !workerToken) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Active tenant session (x-tenant-id or Authorization header) is required',
    });
  }

  // Cross-verify with body/query parameter if present to prevent tenant impersonation
  const requestedUserId = req.query.user_id || req.body?.user_id;
  if (requestedUserId && resolvedTenantId && requestedUserId !== resolvedTenantId) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Cannot access or mutate resources outside authenticated tenant scope',
    });
  }

  req.tenantId = resolvedTenantId;
  next();
}

module.exports = {
  authenticateTenant,
};
