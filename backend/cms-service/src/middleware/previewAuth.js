/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PREVIEW AUTHENTICATION MIDDLEWARE
 * File: backend/cms-service/src/middleware/previewAuth.js
 * Description: Protects draft content preview on public endpoint:
 *              GET /api/v1/cms/public/pages/:slug?preview=true
 *              Enforces valid JWT and SUPER_ADMIN / RESTAURANT_MANAGER roles.
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const { config, errorResponse, createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('cms-preview-auth');

function previewAuth(req, res, next) {
  const isPreviewRequested = req.query.preview === 'true';

  if (!isPreviewRequested) {
    req.isPreviewAuthorized = false;
    return next();
  }

  // Preview mode was requested: strictly verify administrative authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Preview mode rejected: Missing Bearer token.');
    return errorResponse(res, {
      statusCode: 401,
      code: 'UNAUTHORIZED_PREVIEW',
      message: 'Draft preview mode requires authentication with valid Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret);
    const userRole = decoded.role;
    const userRoles = decoded.roles || [userRole];

    const hasPermission = userRoles.includes('SUPER_ADMIN') || userRoles.includes('RESTAURANT_MANAGER');
    if (!hasPermission) {
      logger.warn(`Preview mode rejected: Role '${userRole}' is not authorized to preview drafts.`);
      return errorResponse(res, {
        statusCode: 403,
        code: 'FORBIDDEN_PREVIEW',
        message: 'Insufficient privileges. Only SUPER_ADMIN and RESTAURANT_MANAGER can preview unpublished drafts.',
      });
    }

    req.user = decoded;
    req.isPreviewAuthorized = true;
    logger.info(`User #${decoded.userId} authorized for draft preview.`);
    return next();
  } catch (err) {
    logger.warn('Preview mode rejected: Invalid or expired token:', err.message);
    return errorResponse(res, {
      statusCode: 401,
      code: 'INVALID_PREVIEW_TOKEN',
      message: 'Invalid or expired preview access token.',
    });
  }
}

module.exports = previewAuth;

