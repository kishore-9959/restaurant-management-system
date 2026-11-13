/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ASYNC HANDLER UTILITY
 * File: backend/shared/utils/asyncHandler.js
 * Description: Wraps asynchronous Express route handlers to forward errors to next().
 * ============================================================================
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

