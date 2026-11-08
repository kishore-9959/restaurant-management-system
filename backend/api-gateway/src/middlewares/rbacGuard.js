/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - API GATEWAY RBAC GUARD
 * File: backend/api-gateway/src/middlewares/rbacGuard.js
 * Description: Validates caller role claims against route-level permission rules.
 * ============================================================================
 */

const { errorResponse } = require('../../shared');
const { rbacRules } = require('../config/gatewayConfig');

function rbacGuard(req, res, next) {
  const currentPath = req.path;

  const matchedRule = rbacRules.find((rule) => rule.pattern.test(currentPath));
  if (!matchedRule) {
    return next();
  }

  const userRole = req.user?.role;

  if (!userRole || !matchedRule.allowedRoles.includes(userRole)) {
    return errorResponse(res, {
      statusCode: 403,
      code: 'FORBIDDEN_INSUFFICIENT_ROLE',
      message: `Access denied: role '${userRole || 'ANONYMOUS'}' is not authorized for this resource.`,
      details: {
        requiredRoles: matchedRule.allowedRoles,
      },
    });
  }

  next();
}

module.exports = rbacGuard;

