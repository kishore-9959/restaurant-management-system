/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ERROR MIDDLEWARE
 * File: backend/shared/middleware/error.middleware.js
 * Description: Global centralized error handling middleware.
 * ============================================================================
 */

const { errorResponse } = require('../utils/response');

function errorMiddleware(err, req, res, next) { // eslint-disable-line no-unused-vars
  const correlationId = req.correlationId || req.headers['x-correlation-id'];
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');
  const message = err.message || 'An unexpected internal server error occurred.';
  const details = err.details || null;

  if (statusCode >= 500) {
    console.error(`[ERROR] [corr:${correlationId}] ${req.method} ${req.originalUrl}:`, err);
  }

  return errorResponse(res, statusCode, errorCode, message, details);
}

module.exports = errorMiddleware;

