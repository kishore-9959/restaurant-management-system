/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/middleware/authMiddleware.js
 * ============================================================================
 */

const { errorResponse } = require('@rms/shared');
const { verifyAccessToken, isTokenRevoked } = require('../services/tokenService');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication token missing or invalid format. Please supply a valid Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    // Check Redis revocation
    if (payload.jti && await isTokenRevoked(payload.jti)) {
      return errorResponse(res, {
        statusCode: 401,
        code: 'TOKEN_REVOKED',
        message: 'This access token has been revoked. Please sign in again.',
      });
    }

    req.user = {
      userId: payload.userId || payload.sub,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      userType: payload.userType,
      branchId: payload.branchId,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      jti: payload.jti,
    };

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, {
        statusCode: 401,
        code: 'TOKEN_EXPIRED',
        message: 'Access token has expired. Please refresh your session.',
      });
    }
    return errorResponse(res, {
      statusCode: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid access token signature or corrupted payload.',
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
    // SUPER_ADMIN has master override
    if (userRoles.includes('SUPER_ADMIN')) {
      return next();
    }

    const hasMatchingRole = allowedRoles.some((role) => userRoles.includes(role));
    if (!hasMatchingRole) {
      return errorResponse(res, {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}].`,
      });
    }

    return next();
  };
}

function requirePermission(...requiredPermissions) {
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

    const userPermissions = req.user.permissions || [];
    const hasAll = requiredPermissions.every((perm) => userPermissions.includes(perm));
    if (!hasAll) {
      return errorResponse(res, {
        statusCode: 403,
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Access denied. Requires permissions: [${requiredPermissions.join(', ')}].`,
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
  authenticateToken,
  requireRole,
  requirePermission,
  requireBranch,
};

