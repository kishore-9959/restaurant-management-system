/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTHORIZATION MIDDLEWARE
 * File: backend/shared/middleware/authorization.middleware.js
 * Description: RBAC, permission guards, and branch-level isolation guards.
 * ============================================================================
 */

const { errorResponse } = require('../utils/response');

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (req.isInternalService) return next();

    if (!req.user || !req.user.roles) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required.');
    }

    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role || req.user.roles];
    const hasRole = userRoles.some(r => allowedRoles.includes(r) || r === 'SUPER_ADMIN');

    if (!hasRole) {
      return errorResponse(res, 403, 'FORBIDDEN', `Access denied: requires one of the following roles: [${allowedRoles.join(', ')}]`);
    }

    next();
  };
}

function requirePermissions(...requiredPermissions) {
  return (req, res, next) => {
    if (req.isInternalService) return next();

    if (!req.user || !req.user.permissions) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required.');
    }

    const userPermissions = req.user.permissions || [];
    const userRoles = req.user.roles || [];

    // Super Admin bypasses granular permission check
    if (userRoles.includes('SUPER_ADMIN') || userPermissions.includes('*')) {
      return next();
    }

    const hasAll = requiredPermissions.every(p => userPermissions.includes(p));
    if (!hasAll) {
      return errorResponse(res, 403, 'FORBIDDEN', `Access denied: requires permission(s): [${requiredPermissions.join(', ')}]`);
    }

    next();
  };
}

function requireBranch(allowSuperAdmin = true) {
  return (req, res, next) => {
    if (req.isInternalService) return next();

    if (!req.user) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required.');
    }

    const userRoles = req.user.roles || [];
    if (allowSuperAdmin && userRoles.includes('SUPER_ADMIN')) {
      return next();
    }

    const targetBranchId = req.params.branchId || req.query.branchId || (req.body && req.body.branchId);
    if (!targetBranchId) {
      return next();
    }

    if (!req.user.branchId || Number(req.user.branchId) !== Number(targetBranchId)) {
      return errorResponse(res, 403, 'FORBIDDEN_BRANCH_ACCESS', `Access denied: you do not have permission for branch ${targetBranchId}`);
    }

    next();
  };
}

module.exports = {
  requireRoles,
  requirePermissions,
  requireBranch,
};
