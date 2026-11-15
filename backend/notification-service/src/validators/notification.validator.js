/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION VALIDATORS
 * File: backend/notification-service/src/validators/notification.validator.js
 * ============================================================================
 */

function validateCreateNotification(body) {
  const errors = [];
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push('Field title is required and must be a non-empty string.');
  }
  if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
    errors.push('Field message is required and must be a non-empty string.');
  }
  if (!body.notificationType || typeof body.notificationType !== 'string' || body.notificationType.trim().length === 0) {
    errors.push('Field notificationType is required.');
  }
  return { isValid: errors.length === 0, errors };
}

function validateBroadcast(body) {
  const errors = [];
  if (!body.event || typeof body.event !== 'string' || body.event.trim().length === 0) {
    errors.push('Field event is required and must be a non-empty string (e.g. kot:created).');
  }
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push('Field title is required.');
  }
  if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
    errors.push('Field message is required.');
  }
  return { isValid: errors.length === 0, errors };
}

module.exports = {
  validateCreateNotification,
  validateBroadcast,
};

