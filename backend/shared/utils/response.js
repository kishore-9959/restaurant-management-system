/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SHARED RESPONSE ENVELOPE
 * File: backend/shared/utils/response.js
 * Description: Standardized API response helpers guaranteeing uniform JSON envelopes
 *              across all microservices according to SERVICE_COMMUNICATION.md.
 * ============================================================================
 */

/**
 * Universal Success Response Envelope
 * @param {import('express').Response} res - Express response object
 * @param {object} options
 * @param {number} [options.statusCode=200] - HTTP status code
 * @param {any} [options.data=null] - Payload data
 * @param {string} [options.message='Operation completed successfully'] - Friendly message
 * @param {object|null} [options.meta=null] - Pagination / filter metadata
 * @param {string|null} [options.correlationId=null] - Distributed tracing correlation ID
 */
function successResponse(res, {
  statusCode = 200,
  data = null,
  message = 'Operation completed successfully',
  meta = null,
  correlationId = null,
} = {}) {
  const cid = correlationId || res.req?.correlationId || res.get('X-Correlation-ID');

  const payload = {
    success: true,
    data,
    message,
    ...(meta && { meta }),
    correlationId: cid,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(payload);
}

/**
 * Universal Error Response Envelope
 * @param {import('express').Response} res - Express response object
 * @param {object} options
 * @param {number} [options.statusCode=500] - HTTP status code
 * @param {string} [options.code='INTERNAL_ERROR'] - Error categorization code
 * @param {string} [options.message='An unexpected error occurred'] - Human-readable error description
 * @param {any} [options.details=null] - Detailed error info (validation violations, etc.)
 * @param {string|null} [options.correlationId=null] - Distributed tracing correlation ID
 */
function errorResponse(res, {
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  message = 'An unexpected error occurred',
  details = null,
  correlationId = null,
} = {}) {
  const cid = correlationId || res.req?.correlationId || res.get('X-Correlation-ID');

  const payload = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    correlationId: cid,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(payload);
}

module.exports = {
  successResponse,
  errorResponse,
};

