/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - GLOBAL ERROR HANDLER
 * File: backend/shared/middlewares/errorHandler.js
 * Description: Express error-handling middleware that catches synchronous and
 *              asynchronous exceptions and formats uniform error payloads.
 * ============================================================================
 */

const { errorResponse } = require('../utils/response');

function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const code = err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  const message = err.message || 'An unexpected internal error occurred.';
  const details = err.details || (process.env.NODE_ENV === 'development' ? err.stack : undefined);

  if (req.logger) {
    req.logger.error(`Unhandled Exception: ${message}`, {
      code,
      statusCode,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  }

  return errorResponse(res, {
    statusCode,
    code,
    message,
    details,
    correlationId: req.correlationId,
  });
}

module.exports = errorHandler;

