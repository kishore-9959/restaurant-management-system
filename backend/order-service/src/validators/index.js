/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ORDER SERVICE VALIDATORS
 * File: backend/order-service/src/validators/index.js
 * Description: Input validation helpers for Order placement, status transitions,
 *              and cancellations.
 * ============================================================================
 */

function validatePlaceOrderPayload(body) {
  const errors = [];

  if (!body.cartId || isNaN(parseInt(body.cartId, 10))) {
    errors.push("Field 'cartId' is required and must be a valid integer.");
  }

  const validOrderTypes = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
  if (!body.orderType || !validOrderTypes.includes(body.orderType)) {
    errors.push(`Field 'orderType' is required and must be one of: ${validOrderTypes.join(', ')}.`);
  }

  if (body.orderType === 'DELIVERY' && (!body.deliveryAddressId || isNaN(parseInt(body.deliveryAddressId, 10)))) {
    errors.push("Field 'deliveryAddressId' is required for DELIVERY orders.");
  }

  if (body.tableId !== undefined && body.tableId !== null && isNaN(parseInt(body.tableId, 10))) {
    errors.push("Field 'tableId' must be a valid integer if provided.");
  }

  if (body.customerNotes !== undefined && typeof body.customerNotes === 'string' && body.customerNotes.length > 500) {
    errors.push("Field 'customerNotes' cannot exceed 500 characters.");
  }

  return { isValid: errors.length === 0, errors };
}

function validateUpdateStatusPayload(body) {
  const errors = [];
  const validStatuses = ['CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];

  if (!body.status || !validStatuses.includes(body.status)) {
    errors.push(`Field 'status' is required and must be one of: ${validStatuses.join(', ')}.`);
  }

  return { isValid: errors.length === 0, errors };
}

function validateCancelOrderPayload(body) {
  const errors = [];

  if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 3) {
    errors.push("Field 'reason' is required and must be at least 3 characters long.");
  }

  return { isValid: errors.length === 0, errors };
}

module.exports = {
  validatePlaceOrderPayload,
  validateUpdateStatusPayload,
  validateCancelOrderPayload,
};
