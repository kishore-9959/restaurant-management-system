/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - WEBHOOK CONTROLLER
 * File: backend/payment-service/src/controllers/webhook.controller.js
 * ============================================================================
 */

const { webhookService } = require('../services');

class WebhookController {
  /**
   * POST /api/v1/payments/razorpay/webhook
   * Public webhook endpoint delivering Razorpay events
   */
  async handleRazorpayWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      // Supports raw body if preserved by rawBody parser, or standard json body
      const rawBody = req.rawBody || req.body;

      const result = await webhookService.handleWebhook(rawBody, signature, req.body);

      // Webhooks must return HTTP 200 with standard ACK
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WebhookController();

