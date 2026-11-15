/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - API GATEWAY RBAC GUARD
 * File: backend/api-gateway/src/middlewares/rbacGuard.js
 * Description: Validates caller role claims against route-level permission rules.
 * ============================================================================
 */

const { errorResponse } = require('@rms/shared');
const { rbacRules, publicRoutePatterns } = require('../config/gatewayConfig');

function isPublicRoute(path) {
  return publicRoutePatterns.some((pattern) => pattern.test(path));
}

function rbacGuard(req, res, next) {
  const currentPath = req.path;

  // Public whitelisted endpoints do not require role checks
  if (isPublicRoute(currentPath)) {
    return next();
  }

  const matchedRule = rbacRules.find((rule) => rule.pattern.test(currentPath));
  if (!matchedRule) {
    return next();
  }

  const userRoles = Array.isArray(req.user?.roles)
    ? req.user.roles
    : (req.user?.role ? [req.user.role] : []);

  if (userRoles.includes('SUPER_ADMIN')) {
    return next();
  }

  const hasAllowedRole = matchedRule.allowedRoles.some((role) => userRoles.includes(role));

  if (!hasAllowedRole) {
    return errorResponse(res, {
      statusCode: 403,
      code: 'FORBIDDEN_INSUFFICIENT_ROLE',
      message: `Access denied: user roles [${userRoles.join(', ')}] are not authorized for this resource.`,
      details: {
        requiredRoles: matchedRule.allowedRoles,
      },
    });
  }

  next();
}

module.exports = rbacGuard;

