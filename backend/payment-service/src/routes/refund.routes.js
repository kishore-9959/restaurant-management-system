/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REFUND ROUTES
 * File: backend/payment-service/src/routes/refund.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const { refundController } = require('../controllers');

// Process Refund (Full or Partial)
router.post(
  ['/refund', '/api/v1/payments/refund'],
  authenticationMiddleware,
  requireRoles('RESTAURANT_MANAGER', 'SUPER_ADMIN', 'CASHIER_POS'),
  asyncHandler(refundController.processRefund.bind(refundController))
);

// Get Refund by ID
router.get(
  ['/refunds/:refundId', '/api/v1/payments/refunds/:refundId'],
  authenticationMiddleware,
  requireRoles('RESTAURANT_MANAGER', 'SUPER_ADMIN', 'CASHIER_POS'),
  asyncHandler(refundController.getRefundById.bind(refundController))
);

module.exports = router;

