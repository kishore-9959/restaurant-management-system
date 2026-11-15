/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PAYMENT ROUTES
 * File: backend/payment-service/src/routes/payment.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const { paymentController } = require('../controllers');

// Online Razorpay Checkout Endpoints
router.post(
  ['/razorpay/create-order', '/api/v1/payments/razorpay/create-order'],
  authenticationMiddleware,
  asyncHandler(paymentController.createOrder.bind(paymentController))
);

router.post(
  ['/razorpay/verify', '/api/v1/payments/razorpay/verify'],
  authenticationMiddleware,
  asyncHandler(paymentController.verifyPayment.bind(paymentController))
);

// Offline POS Settlement (Cash, Card, UPI)
router.post(
  ['/offline-settle', '/api/v1/payments/offline-settle'],
  authenticationMiddleware,
  requireRoles('CASHIER_POS', 'RESTAURANT_MANAGER', 'SUPER_ADMIN'),
  asyncHandler(paymentController.settleOffline.bind(paymentController))
);

// Specific Lookup Routes (must precede /:id)
router.get(
  ['/order/:orderId', '/api/v1/payments/order/:orderId'],
  authenticationMiddleware,
  asyncHandler(paymentController.getPaymentsByOrderId.bind(paymentController))
);

router.get(
  ['/status/:id', '/api/v1/payments/status/:id'],
  authenticationMiddleware,
  asyncHandler(paymentController.getPaymentStatus.bind(paymentController))
);

// Collections & Payment by ID
router.get(
  ['/', '/api/v1/payments'],
  authenticationMiddleware,
  requireRoles('CASHIER_POS', 'RESTAURANT_MANAGER', 'SUPER_ADMIN', 'WAITSTAFF'),
  asyncHandler(paymentController.listPayments.bind(paymentController))
);

router.get(
  ['/:id', '/api/v1/payments/:id'],
  authenticationMiddleware,
  asyncHandler(paymentController.getPaymentById.bind(paymentController))
);

module.exports = router;

