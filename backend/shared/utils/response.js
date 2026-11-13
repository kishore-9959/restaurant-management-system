/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SHARED RESPONSE ENVELOPE
 * File: backend/shared/utils/response.js
 * Description: Standardized API response helpers guaranteeing uniform JSON envelopes
 *              across all microservices according to SERVICE_COMMUNICATION.md.
 *              Supports both object options and positional arguments.
 * ============================================================================
 */

/**
 * Universal Success Response Envelope
 */
function successResponse(res, arg2 = {}, arg3 = null, arg4 = 'Operation completed successfully') {
  let opts = {};
  if (arg2 && typeof arg2 === 'object' && !Array.isArray(arg2) && (arg2.statusCode || arg2.data !== undefined || arg2.message)) {
    opts = arg2;
  } else {
    opts = {
      statusCode: typeof arg2 === 'number' ? arg2 : 200,
      data: arg3 !== null ? arg3 : (typeof arg2 === 'object' ? arg2 : null),
      message: typeof arg4 === 'string' ? arg4 : 'Operation completed successfully',
    };
  }

  const {
    statusCode = 200,
    data = null,
    message = 'Operation completed successfully',
    meta = null,
    correlationId = null,
  } = opts;

  const cid = correlationId || res.req?.correlationId || res.get?.('X-Correlation-ID');

  const payload = {
    success: statusCode < 400,
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
 * Supports errorResponse(res, { statusCode, code, message, details })
 * AND errorResponse(res, 400, 'CODE', 'Message', details)
 */
function errorResponse(res, arg2 = 500, code = 'INTERNAL_ERROR', message = 'An unexpected error occurred', details = null, correlationId = null) {
  let opts = {};
  if (arg2 && typeof arg2 === 'object' && !Array.isArray(arg2)) {
    opts = arg2;
  } else {
    opts = {
      statusCode: typeof arg2 === 'number' ? arg2 : 500,
      code: typeof code === 'string' ? code : 'INTERNAL_ERROR',
      message: typeof message === 'string' ? message : 'An unexpected error occurred',
      details: details || null,
      correlationId: correlationId || null,
    };
  }

  const {
    statusCode = 500,
    code: errCode = 'INTERNAL_ERROR',
    message: errMessage = 'An unexpected error occurred',
    details: errDetails = null,
    correlationId: errCid = null,
  } = opts;

  const cid = errCid || res.req?.correlationId || res.get?.('X-Correlation-ID');

  const payload = {
    success: false,
    error: {
      code: errCode,
      message: errMessage,
      ...(errDetails && { details: errDetails }),
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
