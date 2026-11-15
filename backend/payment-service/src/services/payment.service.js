/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PAYMENT SERVICE
 * File: backend/payment-service/src/services/payment.service.js
 * Description: Core payment domain operations, online initiation, signature
 *              verification, offline settlements, and Order Service synchronization.
 * ============================================================================
 */

const { config, httpClient, createServiceLogger } = require('@rms/shared');
const { paymentRepository } = require('../repositories');
const razorpayService = require('./razorpay.service');

const logger = createServiceLogger('payment-service');

class PaymentService {
  /**
   * Helper: Synchronize payment status with Order Service via internal HTTP REST
   */
  async syncOrderPaymentStatus(orderId, paymentStatus, amount, method, reference, notes = null) {
    const internalKey = config.security?.internalServiceKey || config.internalServiceKey;
    const url = `${config.urls.orderService}/api/v1/orders/${orderId}/payment-status`;

    try {
      logger.info(`Synchronizing payment status for Order #${orderId} -> ${paymentStatus} via ${url}`);
      const res = await httpClient.patch(
        url,
        {
          paymentStatus,
          amountPaid: amount,
          paymentMethod: method,
          paymentReference: reference,
          notes: notes || `Payment status updated to ${paymentStatus} via ${method}`,
        },
        {
          headers: {
            'X-Internal-Service-Key': internalKey,
          },
          timeout: 5000,
        }
      );

      logger.info(`Order #${orderId} payment status successfully updated to ${paymentStatus}`);
      return res.data?.data || null;
    } catch (err) {
      logger.warn(`Failed to synchronize payment status with Order Service for Order #${orderId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Helper: Fetch and validate order from Order Service
   */
  async fetchOrderDetails(orderId, authContext = {}) {
    try {
      const internalKey = config.security?.internalServiceKey || config.internalServiceKey;
      const res = await httpClient.get(`${config.urls.orderService}/api/v1/orders/${orderId}`, {
        headers: {
          'X-Internal-Service-Key': internalKey,
          ...(authContext.token && { Authorization: `Bearer ${authContext.token}` }),
        },
        timeout: 5000,
      });

      return res.data?.data || null;
    } catch (err) {
      logger.warn(`Could not verify Order #${orderId} with Order Service: ${err.message}`);
      return null;
    }
  }

  /**
   * 1. Create Online Payment Order (Razorpay Intent)
   */
  async createOnlineOrder(payload, userContext = {}) {
    const { orderId, branchId: directBranchId, amount: directAmount } = payload;

    if (!orderId || orderId <= 0) {
      const err = new Error('Valid orderId is required.');
      err.statusCode = 400;
      throw err;
    }

    // Attempt to verify live order with order-service
    let branchId = directBranchId || 1;
    let finalAmount = directAmount ? parseFloat(directAmount) : 0.0;

    const liveOrder = await this.fetchOrderDetails(orderId, userContext);
    if (liveOrder) {
      if (liveOrder.paymentStatus === 'PAID') {
        const err = new Error(`Order #${orderId} has already been paid in full.`);
        err.statusCode = 400;
        throw err;
      }
      branchId = liveOrder.branchId || branchId;
      finalAmount = liveOrder.grandTotal ? parseFloat(liveOrder.grandTotal) : (finalAmount || 100.0);
    } else if (!finalAmount || finalAmount <= 0) {
      // Fallback: Default to minimal test amount if order-service unreachable in isolated mode
      finalAmount = directAmount ? parseFloat(directAmount) : 100.0;
    }

    // Create official or test Razorpay order
    const rzpOrder = await razorpayService.createOrder({
      amount: finalAmount,
      receipt: `rec_${orderId}_${Date.now().toString().slice(-6)}`,
      notes: {
        orderId,
        branchId,
        customerId: userContext.userId || null,
      },
    });

    // Persist PENDING payment in database
    const payment = await paymentRepository.create({
      orderId,
      branchId,
      paymentMethod: 'RAZORPAY',
      amount: finalAmount,
      gatewayOrderId: rzpOrder.id,
      settledByUserId: null,
    });

    return {
      paymentId: payment.PaymentId,
      paymentReference: payment.PaymentReference,
      orderId: payment.OrderId,
      amount: parseFloat(payment.Amount),
      currency: 'INR',
      gatewayOrderId: rzpOrder.id,
      razorpayKeyId: rzpOrder.keyId,
      status: payment.PaymentStatus,
    };
  }

  /**
   * 2. Verify and Capture Online Payment
   */
  async verifyAndCapture(payload, userContext = {}) {
    const { paymentId, gatewayOrderId, gatewayPaymentId, gatewaySignature } = payload;

    if (!gatewayPaymentId) {
      const err = new Error('gatewayPaymentId is required for payment verification.');
      err.statusCode = 400;
      throw err;
    }

    // Resolve payment header if gatewayOrderId provided
    let resolvedPayment = null;
    if (paymentId) {
      resolvedPayment = await paymentRepository.getById(paymentId);
    } else if (gatewayOrderId) {
      resolvedPayment = await paymentRepository.getByGatewayOrderId(gatewayOrderId);
    }

    const effectiveGatewayOrderId = gatewayOrderId || resolvedPayment?.GatewayOrderId;

    // Cryptographic signature check
    if (gatewaySignature) {
      const isValid = razorpayService.verifyPaymentSignature({
        orderId: effectiveGatewayOrderId,
        paymentId: gatewayPaymentId,
        signature: gatewaySignature,
      });

      if (!isValid) {
        const err = new Error('Cryptographic signature verification failed. Payment tampered or invalid.');
        err.statusCode = 400;
        throw err;
      }
    }

    // Capture payment in database
    const captured = await paymentRepository.verifyAndCapture({
      paymentId: paymentId || resolvedPayment?.PaymentId,
      gatewayOrderId: effectiveGatewayOrderId,
      gatewayPaymentId,
      gatewaySignature,
      settledByUserId: userContext.role === 'CUSTOMER' ? null : (userContext.userId || null),
      rawPayloadJson: payload,
    });

    if (!captured) {
      const err = new Error('Payment record could not be captured or does not exist.');
      err.statusCode = 404;
      throw err;
    }

    // Synchronize Order status
    await this.syncOrderPaymentStatus(
      captured.OrderId,
      'PAID',
      parseFloat(captured.Amount),
      captured.PaymentMethod,
      captured.PaymentReference
    );

    return {
      paymentId: captured.PaymentId,
      paymentReference: captured.PaymentReference,
      orderId: captured.OrderId,
      amount: parseFloat(captured.Amount),
      paymentStatus: captured.PaymentStatus,
      gatewayPaymentId: captured.GatewayPaymentId,
      settledAt: captured.SettledAt,
      isIdempotent: Boolean(captured.IsIdempotent),
    };
  }

  /**
   * 3. Record Payment Failure
   */
  async recordFailure(payload) {
    const { paymentId, gatewayOrderId, gatewayPaymentId, errorCode, errorMessage } = payload;

    const failed = await paymentRepository.recordFailure({
      paymentId,
      gatewayOrderId,
      gatewayPaymentId,
      errorCode,
      errorMessage,
      rawPayloadJson: payload,
    });

    if (failed) {
      await this.syncOrderPaymentStatus(
        failed.OrderId,
        'FAILED',
        parseFloat(failed.Amount),
        failed.PaymentMethod,
        failed.PaymentReference,
        errorMessage || 'Payment failed'
      );
    }

    return failed;
  }

  /**
   * 4. Settle On-Premise Offline Payment (CASH, CARD, UPI)
   */
  async settleOfflinePayment(payload, userContext = {}) {
    const { orderId, branchId: directBranchId, paymentMethod, amount: directAmount, notes } = payload;

    if (!orderId || !paymentMethod) {
      const err = new Error('orderId and paymentMethod are required.');
      err.statusCode = 400;
      throw err;
    }

    const settledByUserId = userContext.userId || payload.settledByUserId || 1;
    let branchId = directBranchId || 1;
    let amount = directAmount ? parseFloat(directAmount) : 0.0;

    // Fetch order to validate balance
    const liveOrder = await this.fetchOrderDetails(orderId, userContext);
    if (liveOrder) {
      branchId = liveOrder.branchId || branchId;
      if (!amount || amount <= 0) {
        amount = parseFloat(liveOrder.grandTotal || 0.0);
      }
    }

    if (!amount || amount <= 0) {
      const err = new Error('Settlement amount must be greater than zero.');
      err.statusCode = 400;
      throw err;
    }

    // Execute atomic offline settlement
    const settled = await paymentRepository.settleOffline({
      orderId,
      branchId,
      paymentMethod,
      amount,
      settledByUserId,
      notes,
    });

    // Synchronize with Order Service
    await this.syncOrderPaymentStatus(
      settled.OrderId,
      'PAID',
      parseFloat(settled.Amount),
      settled.PaymentMethod,
      settled.PaymentReference,
      notes || `Offline payment settled via ${paymentMethod}`
    );

    return {
      paymentId: settled.PaymentId,
      paymentReference: settled.PaymentReference,
      orderId: settled.OrderId,
      branchId: settled.BranchId,
      paymentMethod: settled.PaymentMethod,
      amount: parseFloat(settled.Amount),
      paymentStatus: settled.PaymentStatus,
      settledByUserId: settled.SettledByUserId,
      settledAt: settled.SettledAt,
      totalPaidForOrder: parseFloat(settled.TotalPaidForOrder || settled.Amount),
    };
  }

  /**
   * 5. Get Payment by ID
   */
  async getPaymentById(paymentId, userContext = {}) {
    const payment = await paymentRepository.getById(paymentId);
    if (!payment) {
      const err = new Error(`Payment #${paymentId} not found.`);
      err.statusCode = 404;
      throw err;
    }

    return payment;
  }

  /**
   * 6. Get Payments for an Order
   */
  async getPaymentsByOrderId(orderId) {
    return paymentRepository.getByOrderId(orderId);
  }

  /**
   * 7. Lightweight Status Lookup
   */
  async getPaymentStatus(identifier) {
    const status = await paymentRepository.getStatus(identifier);
    if (!status) {
      const err = new Error(`Payment status for '${identifier}' not found.`);
      err.statusCode = 404;
      throw err;
    }
    return status;
  }

  /**
   * 8. List Payments with Filters & Pagination
   */
  async listPayments(filters = {}) {
    return paymentRepository.list(filters);
  }
}

module.exports = new PaymentService();
