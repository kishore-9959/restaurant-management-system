/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - WEBHOOK ROUTES
 * File: backend/payment-service/src/routes/webhook.routes.js
 * Description: Public ingress for Razorpay asynchronous webhook notifications.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('@rms/shared');
const { webhookController } = require('../controllers');

// Public Webhook route (HMAC signature validated inside controller/service)
router.post(
  ['/razorpay/webhook', '/api/v1/payments/razorpay/webhook'],
  asyncHandler(webhookController.handleRazorpayWebhook.bind(webhookController))
);

module.exports = router;

