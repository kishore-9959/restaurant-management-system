/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - KITCHEN VALIDATORS
 * File: backend/kitchen-service/src/validators/kitchen.validator.js
 * ============================================================================
 */

function validateCreateKOT(body) {
  const errors = [];
  if (!body.branchId || isNaN(Number(body.branchId)) || Number(body.branchId) <= 0) {
    errors.push('Field branchId is required and must be a positive integer.');
  }
  if (!body.orderId || isNaN(Number(body.orderId)) || Number(body.orderId) <= 0) {
    errors.push('Field orderId is required and must be a positive integer.');
  }
  if (body.kitchenStation && typeof body.kitchenStation !== 'string') {
    errors.push('Field kitchenStation must be a string if provided.');
  }
  if (body.itemIds && !Array.isArray(body.itemIds)) {
    errors.push('Field itemIds must be an array of numbers if provided.');
  }
  return { isValid: errors.length === 0, errors };
}

function validateUpdateKOTStatus(body) {
  const errors = [];
  const allowed = ['NEW', 'PREPARING', 'READY', 'BUMPED'];
  if (!body.status || !allowed.includes(String(body.status).toUpperCase())) {
    errors.push(`Field status is required and must be one of: ${allowed.join(', ')}.`);
  }
  return { isValid: errors.length === 0, errors };
}

function validateUpdateItemStatus(body) {
  const errors = [];
  const allowed = ['PENDING', 'COOKING', 'READY'];
  if (!body.status || !allowed.includes(String(body.status).toUpperCase())) {
    errors.push(`Field status is required and must be one of: ${allowed.join(', ')}.`);
  }
  return { isValid: errors.length === 0, errors };
}

function validateAssignChef(body) {
  const errors = [];
  if (!body.chefUserId || isNaN(Number(body.chefUserId)) || Number(body.chefUserId) <= 0) {
    errors.push('Field chefUserId is required and must be a positive integer.');
  }
  return { isValid: errors.length === 0, errors };
}

module.exports = {
  validateCreateKOT,
  validateUpdateKOTStatus,
  validateUpdateItemStatus,
  validateAssignChef,
};

