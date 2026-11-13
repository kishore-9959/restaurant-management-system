/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CORRELATION MIDDLEWARE
 * File: backend/shared/middleware/correlation.middleware.js
 * Description: Extracts or generates a unique correlation ID for distributed tracing.
 * ============================================================================
 */

const { v4: uuidv4 } = require('uuid');

function correlationMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

module.exports = correlationMiddleware;

