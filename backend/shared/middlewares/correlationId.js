/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CORRELATION ID MIDDLEWARE
 * File: backend/shared/middlewares/correlationId.js
 * Description: Extracts or generates a unique correlation ID for distributed tracing.
 * ============================================================================
 */

const { v4: uuidv4 } = require('uuid');

function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

module.exports = correlationIdMiddleware;

