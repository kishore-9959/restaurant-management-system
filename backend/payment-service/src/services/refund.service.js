/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REFUND SERVICE
 * File: backend/payment-service/src/services/refund.service.js
 * Description: Orchestration for full and partial refunds across Razorpay
 *              and on-premise cash/card settlements.
 * ============================================================================
 */

const { createServiceLogger } = require('@rms/shared');
const { paymentRepository, refundRepository } = require('../repositories');
const razorpayService = require('./razorpay.service');

const logger = createServiceLogger('payment-service');

class RefundService {
  /**
   * Process a full or partial refund against a payment
   */
  async processRefund(payload, userContext = {}) {
    const { paymentId, refundAmount, reason } = payload;

    if (!paymentId || !refundAmount || refundAmount <= 0) {
      const err = new Error('paymentId and positive refundAmount are required.');
      err.statusCode = 400;
      throw err;
    }

    if (!reason || reason.trim() === '') {
      const err = new Error('Refund reason is required.');
      err.statusCode = 400;
      throw err;
    }

    const initiatedByUserId = userContext.userId || payload.initiatedByUserId || 1;

    // 1. Fetch payment to validate status and gateway information
    const payment = await paymentRepository.getById(paymentId);
    if (!payment) {
      const err = new Error(`Payment #${paymentId} not found.`);
      err.statusCode = 404;
      throw err;
    }

    if (payment.PaymentStatus !== 'SUCCESS' && payment.PaymentStatus !== 'PARTIALLY_REFUNDED') {
      const err = new Error(`Cannot refund payment with status '${payment.PaymentStatus}'. Must be SUCCESS.`);
      err.statusCode = 400;
      throw err;
    }

    const netSettled = payment.summary?.netSettledAmount !== undefined
      ? payment.summary.netSettledAmount
      : parseFloat(payment.Amount);

    if (parseFloat(refundAmount) > netSettled) {
      const err = new Error(
        `Requested refund amount (${refundAmount}) exceeds available refundable balance (${netSettled.toFixed(2)}).`
      );
      err.statusCode = 400;
      throw err;
    }

    // 2. Gateway Refund Dispatch (if online Razorpay payment)
    let gatewayRefundId = null;
    if (payment.PaymentMethod === 'RAZORPAY' && payment.GatewayPaymentId) {
      try {
        const rzpRefund = await razorpayService.createRefund({
          paymentId: payment.GatewayPaymentId,
          amount: parseFloat(refundAmount),
          notes: {
            reason,
            paymentId,
            orderId: payment.OrderId,
          },
        });
        gatewayRefundId = rzpRefund.id;
        logger.info(`Razorpay gateway refund initiated: ${gatewayRefundId}`);
      } catch (err) {
        logger.error(`Razorpay refund failed: ${err.message}`);
        const error = new Error(`Payment Gateway Refund Failed: ${err.message}`);
        error.statusCode = 502;
        throw error;
      }
    } else {
      // Offline settlement refund: Generate internal refund tracking reference
      gatewayRefundId = `rfnd_offline_${Date.now()}`;
    }

    // 3. Atomically persist refund record in database
    const refundRecord = await refundRepository.createRefund({
      paymentId,
      refundAmount: parseFloat(refundAmount),
      reason,
      initiatedByUserId,
      gatewayRefundId,
    });

    if (!refundRecord) {
      const err = new Error('Failed to create refund record in database.');
      err.statusCode = 500;
      throw err;
    }

    // 4. Synchronize status with Order Service
    const paymentService = require('./payment.service');
    const newRemaining = parseFloat(refundRecord.RemainingBalance);
    const syncStatus = newRemaining <= 0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    await paymentService.syncOrderPaymentStatus(
      payment.OrderId,
      syncStatus,
      parseFloat(refundRecord.TotalRefunded),
      payment.PaymentMethod,
      payment.PaymentReference,
      `Refund processed: ${reason} (Amount: ${refundAmount})`
    );

    return {
      refundId: refundRecord.RefundId,
      paymentId: refundRecord.PaymentId,
      gatewayRefundId: refundRecord.GatewayRefundId,
      refundAmount: parseFloat(refundRecord.RefundAmount),
      totalRefunded: parseFloat(refundRecord.TotalRefunded),
      remainingBalance: parseFloat(refundRecord.RemainingBalance),
      status: refundRecord.Status,
      paymentStatus: refundRecord.PaymentStatus,
      processedAt: refundRecord.ProcessedAt,
    };
  }

  /**
   * Fetch a single refund by RefundId
   */
  async getRefundById(refundId) {
    const refund = await refundRepository.getRefundById(refundId);
    if (!refund) {
      const err = new Error(`Refund #${refundId} not found.`);
      err.statusCode = 404;
      throw err;
    }

    return refund;
  }
}

module.exports = new RefundService();

