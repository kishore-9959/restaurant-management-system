/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTHENTICATION MIDDLEWARE
 * File: backend/shared/middleware/authentication.middleware.js
 * Description: Validates JWT access tokens and checks Redis revocation blacklist.
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { getRedisClient } = require('../config/redis');
const { errorResponse } = require('../utils/response');

async function authenticationMiddleware(req, res, next) {
  try {
    // 1. Allow internal service calls signed with internal key
    const internalKey = req.headers['x-internal-service-key'];
    if (internalKey && internalKey === config.internalServiceKey) {
      req.isInternalService = true;
      req.user = {
        userId: req.headers['x-user-id'] || 'system',
        role: req.headers['x-user-role'] || 'SYSTEM',
        branchId: req.headers['x-branch-id'] ? Number(req.headers['x-branch-id']) : null,
        userType: req.headers['x-user-type'] || 'INTERNAL_SERVICE',
        permissions: req.headers['x-user-permissions'] ? req.headers['x-user-permissions'].split(',') : ['*'],
      };
      return next();
    }

    // 2. Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Access token is required. Format: Bearer <token>');
    }

    const token = authHeader.split(' ')[1];

    // 3. Verify JWT signature & expiration
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      });
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return errorResponse(res, 401, 'TOKEN_EXPIRED', 'Access token has expired. Please refresh your session.');
      }
      return errorResponse(res, 401, 'INVALID_TOKEN', 'Access token is invalid or malformed.');
    }

    // 4. Check Redis token revocation blacklist
    try {
      const redis = getRedisClient();
      if (decoded.jti && redis.status === 'ready') {
        const isBlacklisted = await redis.get(`blacklist:${decoded.jti}`);
        if (isBlacklisted) {
          return errorResponse(res, 401, 'TOKEN_REVOKED', 'Access token has been revoked. Please log in again.');
        }
      }
    } catch (redisErr) {
      // If Redis is unreachable, fail safe or proceed if token is cryptographically valid
    }

    // 5. Attach decoded identity to request
    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      userType: decoded.userType,
      branchId: decoded.branchId || null,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      jti: decoded.jti,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticationMiddleware;
