/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/middleware/userAuthGuard.js
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const { config, errorResponse } = require('@rms/shared');

function authenticate(req, res, next) {
  // 1. Check if headers were injected by trusted API Gateway
  const gatewayUserId = req.headers['x-user-id'];
  if (gatewayUserId) {
    const rolesHeader = req.headers['x-user-role'] || '';
    req.user = {
      userId: gatewayUserId,
      userType: req.headers['x-user-type'] || 'CUSTOMER',
      branchId: req.headers['x-branch-id'] ? parseInt(req.headers['x-branch-id'], 10) : null,
      roles: rolesHeader ? rolesHeader.split(',').map((r) => r.trim()) : [],
      permissions: req.headers['x-user-permissions'] ? req.headers['x-user-permissions'].split(',') : [],
    };
    return next();
  }

  // 2. Direct Bearer token verification fallback
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Missing Bearer token or gateway headers.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwtAccessSecret, {
      issuer: 'rms-auth-service',
      audience: 'rms-client',
    });

    req.user = {
      userId: payload.userId || payload.sub,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      userType: payload.userType,
      branchId: payload.branchId,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };
    return next();
  } catch (err) {
    return errorResponse(res, {
      statusCode: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired access token.',
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    const userRoles = req.user.roles || [];
    if (userRoles.includes('SUPER_ADMIN')) {
      return next();
    }

    const match = allowedRoles.some((r) => userRoles.includes(r));
    if (!match) {
      return errorResponse(res, {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}].`,
      });
    }

    return next();
  };
}

function requireBranch(branchParamKey = 'branchId') {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    if (req.user.roles && req.user.roles.includes('SUPER_ADMIN')) {
      return next();
    }

    const targetBranchId = req.params[branchParamKey] || req.body[branchParamKey] || req.query[branchParamKey];
    if (targetBranchId && String(req.user.branchId) !== String(targetBranchId)) {
      return errorResponse(res, {
        statusCode: 403,
        code: 'BRANCH_ACCESS_DENIED',
        message: `Access denied. You do not have permission to access branch ${targetBranchId}.`,
      });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  requireBranch,
};

