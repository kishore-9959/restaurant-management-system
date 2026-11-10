/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - API GATEWAY AUTH GUARD
 * File: backend/api-gateway/src/middlewares/authGuard.js
 * Description: Verifies JWT bearer tokens for protected routes and extracts caller context.
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const { config, redisClient, errorResponse } = require('@rms/shared');
const { publicRoutePatterns } = require('../config/gatewayConfig');

function isPublicRoute(path) {
  return publicRoutePatterns.some((pattern) => pattern.test(path));
}

async function authGuard(req, res, next) {
  const currentPath = req.path;

  // 1. Allow whitelisted public endpoints without token
  if (isPublicRoute(currentPath)) {
    // If a token is optionally passed, decode without rejecting on error
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        req.user = jwt.verify(token, config.security.jwtAccessSecret);
      } catch (err) {
        // Optional token was invalid; ignore for public routes
      }
    }
    return next();
  }

  // 2. Check for Bearer token on protected endpoints
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, {
      statusCode: 401,
      code: 'AUTH_REQUIRED',
      message: 'Access denied: missing or malformed Authorization header.',
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.security.jwtAccessSecret);

    // Check Redis revocation blacklist
    if (decoded.jti) {
      try {
        const isRevoked = await redisClient.get(`auth:revoked:${decoded.jti}`);
        if (isRevoked) {
          return errorResponse(res, {
            statusCode: 401,
            code: 'TOKEN_REVOKED',
            message: 'Access token has been revoked. Please log in again.',
          });
        }
      } catch (redisErr) {
        // Continue if Redis check fails temporarily
      }
    }

    req.user = decoded; // { userId, email, roles, permissions, branchId, ... }
    next();
  } catch (error) {
    const isExpired = error.name === 'TokenExpiredError';
    return errorResponse(res, {
      statusCode: 401,
      code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: isExpired ? 'Access token has expired.' : 'Invalid access token signature.',
    });
  }
}

module.exports = authGuard;

