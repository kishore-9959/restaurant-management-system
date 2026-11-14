/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CART SERVICE VALIDATORS
 * File: backend/cart-service/src/validators/index.js
 * Description: Input validation helpers for Cart operations.
 * ============================================================================
 */

function validateAddToCartPayload(body) {
  const errors = [];

  if (!body.menuItemId || isNaN(parseInt(body.menuItemId, 10))) {
    errors.push("Field 'menuItemId' is required and must be a valid integer.");
  }

  if (body.variantId !== undefined && body.variantId !== null && isNaN(parseInt(body.variantId, 10))) {
    errors.push("Field 'variantId' must be a valid integer if provided.");
  }

  if (body.quantity === undefined || isNaN(parseInt(body.quantity, 10)) || parseInt(body.quantity, 10) < 1) {
    errors.push("Field 'quantity' must be an integer greater than or equal to 1.");
  }

  if (body.addons !== undefined && !Array.isArray(body.addons)) {
    errors.push("Field 'addons' must be an array of addon objects if provided.");
  }

  return { isValid: errors.length === 0, errors };
}

function validateUpdateQuantityPayload(body) {
  const errors = [];

  if (body.quantity === undefined || isNaN(parseInt(body.quantity, 10)) || parseInt(body.quantity, 10) < 1) {
    errors.push("Field 'quantity' is required and must be an integer greater than or equal to 1.");
  }

  return { isValid: errors.length === 0, errors };
}

module.exports = {
  validateAddToCartPayload,
  validateUpdateQuantityPayload,
};
