/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - INTERNAL SERVICE AUTH MIDDLEWARE
 * File: backend/shared/middlewares/serviceAuth.js
 * Description: Verifies that incoming inter-service HTTP REST calls originate from
 *              a trusted internal service using the pre-shared INTERNAL_SERVICE_KEY.
 * ============================================================================
 */

const config = require('../config/env');
const { errorResponse } = require('../utils/response');

function serviceAuthMiddleware(req, res, next) {
  const providedKey = req.headers['x-internal-service-key'];
  const expectedKey = config.security.internalServiceKey;

  if (!providedKey || providedKey !== expectedKey) {
    return errorResponse(res, {
      statusCode: 401,
      code: 'UNAUTHORIZED_SERVICE_CALL',
      message: 'Access denied: invalid or missing internal service authentication credentials.',
      details: {
        hint: 'Inter-service calls require a valid X-Internal-Service-Key header.',
      },
    });
  }

  // Extract downstream identity if forwarded by API Gateway
  req.userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'], 10) : null;
  req.userRole = req.headers['x-user-role'] || null;
  req.branchId = req.headers['x-branch-id'] ? parseInt(req.headers['x-branch-id'], 10) : null;

  next();
}

module.exports = serviceAuthMiddleware;

