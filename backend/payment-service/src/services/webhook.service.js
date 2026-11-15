/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - WEBHOOK SERVICE
 * File: backend/payment-service/src/services/webhook.service.js
 * Description: Secure Razorpay asynchronous webhook ingestion, signature validation,
 *              Redis-backed distributed idempotency, and transaction ledger logging.
 * ============================================================================
 */

const { getRedisClient, createServiceLogger } = require('@rms/shared');
const { paymentRepository, transactionRepository } = require('../repositories');
const razorpayService = require('./razorpay.service');

const logger = createServiceLogger('payment-service');

class WebhookService {
  /**
   * Process an incoming Razorpay webhook event payload
   *
   * @param {Object|string} rawBody - The unparsed request body string or parsed JSON
   * @param {string} signature - The X-Razorpay-Signature header value
   * @param {Object} eventData - The parsed webhook JSON body
   */
  async handleWebhook(rawBody, signature, eventData) {
    if (!signature) {
      const err = new Error('Missing X-Razorpay-Signature header.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Verify Webhook Signature
    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      logger.error('CRITICAL: Razorpay Webhook signature verification failed. Potential forged payload.');
      const err = new Error('Invalid webhook signature.');
      err.statusCode = 400;
      throw err;
    }

    const event = eventData?.event;
    const eventId = eventData?.id || eventData?.payload?.payment?.entity?.id || `evt_${Date.now()}`;

    logger.info(`Processing verified Razorpay Webhook event: '${event}' (ID: ${eventId})`);

    // 2. Distributed Idempotency Guard (Redis)
    let redis = null;
    try {
      redis = getRedisClient();
    } catch (e) {
      // Redis optional fallback
    }

    if (redis) {
      const lockKey = `webhook:rzp:${eventId}`;
      try {
        const acquired = await redis.set(lockKey, 'PROCESSED', 'EX', 86400, 'NX');
        if (!acquired) {
          logger.info(`Webhook event '${eventId}' already processed. Returning idempotent 200 OK.`);
          return {
            status: 'ok',
            received: true,
            event,
            idempotent: true,
          };
        }
      } catch (err) {
        logger.warn(`Redis idempotency lock check failed: ${err.message}. Relying on database safeguards.`);
      }
    }

    // 3. Process Specific Webhook Events
    let processedResult = null;

    switch (event) {
      case 'payment.captured':
      case 'payment.authorized': {
        const paymentEntity = eventData?.payload?.payment?.entity;
        if (paymentEntity) {
          const gatewayPaymentId = paymentEntity.id;
          const gatewayOrderId = paymentEntity.order_id;
          const amount = paymentEntity.amount ? parseFloat(paymentEntity.amount) / 100 : 0;

          // Attempt lookup by gateway order id
          const existing = await paymentRepository.getByGatewayOrderId(gatewayOrderId);
          if (existing) {
            processedResult = await paymentRepository.verifyAndCapture({
              paymentId: existing.PaymentId,
              gatewayOrderId,
              gatewayPaymentId,
              gatewaySignature: signature,
              rawPayloadJson: eventData,
            });

            // Synchronize with Order Service
            const paymentService = require('./payment.service');
            await paymentService.syncOrderPaymentStatus(
              existing.OrderId,
              'PAID',
              amount || existing.Amount,
              existing.PaymentMethod,
              existing.PaymentReference,
              `Webhook event ${event} confirmed capture`
            );
          }
        }
        break;
      }

      case 'payment.failed': {
        const paymentEntity = eventData?.payload?.payment?.entity;
        if (paymentEntity) {
          const gatewayPaymentId = paymentEntity.id;
          const gatewayOrderId = paymentEntity.order_id;
          const errorCode = paymentEntity.error_code || 'WEBHOOK_PAYMENT_FAILED';
          const errorMessage = paymentEntity.error_description || 'Payment failed during gateway processing';

          const existing = await paymentRepository.getByGatewayOrderId(gatewayOrderId);
          if (existing) {
            processedResult = await paymentRepository.recordFailure({
              paymentId: existing.PaymentId,
              gatewayOrderId,
              gatewayPaymentId,
              errorCode,
              errorMessage,
              rawPayloadJson: eventData,
            });

            const paymentService = require('./payment.service');
            await paymentService.syncOrderPaymentStatus(
              existing.OrderId,
              'FAILED',
              existing.Amount,
              existing.PaymentMethod,
              existing.PaymentReference,
              errorMessage
            );
          }
        }
        break;
      }

      case 'refund.processed':
      case 'refund.created': {
        const refundEntity = eventData?.payload?.refund?.entity;
        if (refundEntity) {
          const gatewayPaymentId = refundEntity.payment_id;
          const existing = await paymentRepository.getByGatewayPaymentId(gatewayPaymentId);
          if (existing) {
            await transactionRepository.logTransaction({
              paymentId: existing.PaymentId,
              transactionType: 'REFUND',
              amount: refundEntity.amount ? parseFloat(refundEntity.amount) / 100 : 0,
              gatewayTransactionId: refundEntity.id,
              gatewayResponseCode: 'REFUND_WEBHOOK',
              gatewayPayloadJson: eventData,
              status: 'SUCCESS',
            });
          }
        }
        break;
      }

      default:
        logger.info(`Received unhandled webhook event type: '${event}'`);
        break;
    }

    return {
      status: 'ok',
      received: true,
      event,
      idempotent: false,
      result: processedResult ? 'RECORDED' : 'LOGGED',
    };
  }
}

module.exports = new WebhookService();

