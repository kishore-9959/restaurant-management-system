/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PAYMENT VALIDATORS
 * File: backend/payment-service/src/validators/index.js
 * ============================================================================
 */

function validateCreateOrder(data) {
  const errors = [];
  if (!data.orderId || isNaN(Number(data.orderId)) || Number(data.orderId) <= 0) {
    errors.push('Field "orderId" must be a positive integer.');
  }

  if (data.amount !== undefined && (isNaN(Number(data.amount)) || Number(data.amount) <= 0)) {
    errors.push('Field "amount", if provided, must be a positive number.');
  }

  return { isValid: errors.length === 0, errors };
}

function validateVerifyPayment(data) {
  const errors = [];
  if (!data.gatewayPaymentId || typeof data.gatewayPaymentId !== 'string') {
    errors.push('Field "gatewayPaymentId" is required as a string.');
  }

  if (!data.paymentId && !data.gatewayOrderId) {
    errors.push('Either "paymentId" or "gatewayOrderId" is required.');
  }

  return { isValid: errors.length === 0, errors };
}

function validateOfflineSettle(data) {
  const errors = [];
  const validMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI_OFFLINE'];

  if (!data.orderId || isNaN(Number(data.orderId)) || Number(data.orderId) <= 0) {
    errors.push('Field "orderId" must be a positive integer.');
  }

  if (!data.paymentMethod || !validMethods.includes(data.paymentMethod)) {
    errors.push(`Field "paymentMethod" must be one of: ${validMethods.join(', ')}.`);
  }

  if (data.amount !== undefined && (isNaN(Number(data.amount)) || Number(data.amount) <= 0)) {
    errors.push('Field "amount", if provided, must be a positive number.');
  }

  return { isValid: errors.length === 0, errors };
}

function validateRefund(data) {
  const errors = [];
  if (!data.paymentId || isNaN(Number(data.paymentId)) || Number(data.paymentId) <= 0) {
    errors.push('Field "paymentId" must be a positive integer.');
  }

  if (!data.refundAmount || isNaN(Number(data.refundAmount)) || Number(data.refundAmount) <= 0) {
    errors.push('Field "refundAmount" must be a positive number.');
  }

  if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length === 0) {
    errors.push('Field "reason" is required and cannot be empty.');
  }

  return { isValid: errors.length === 0, errors };
}

module.exports = {
  validateCreateOrder,
  validateVerifyPayment,
  validateOfflineSettle,
  validateRefund,
};
