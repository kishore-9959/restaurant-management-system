/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPOSITORIES INDEX
 * File: backend/payment-service/src/repositories/index.js
 * ============================================================================
 */

const paymentRepository = require('./payment.repository');
const transactionRepository = require('./transaction.repository');
const refundRepository = require('./refund.repository');

module.exports = {
  paymentRepository,
  transactionRepository,
  refundRepository,
};
