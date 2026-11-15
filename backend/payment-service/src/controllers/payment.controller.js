/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PAYMENT CONTROLLER
 * File: backend/payment-service/src/controllers/payment.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const { paymentService } = require('../services');
const {
  validateCreateOrder,
  validateVerifyPayment,
  validateOfflineSettle,
} = require('../validators');

class PaymentController {
  /**
   * POST /api/v1/payments/razorpay/create-order
   */
  async createOrder(req, res, next) {
    try {
      const validation = validateCreateOrder(req.body);
      if (!validation.isValid) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid payment order creation payload',
          errors: validation.errors,
        });
      }

      const result = await paymentService.createOnlineOrder(req.body, {
        userId: req.user?.userId || req.user?.id,
        role: req.user?.role,
        token: req.headers.authorization?.replace(/^Bearer\s+/i, ''),
      });

      return successResponse(res, {
        statusCode: 201,
        message: 'Razorpay payment order initialized successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/payments/razorpay/verify
   */
  async verifyPayment(req, res, next) {
    try {
      const validation = validateVerifyPayment(req.body);
      if (!validation.isValid) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid payment verification payload',
          errors: validation.errors,
        });
      }

      const result = await paymentService.verifyAndCapture(req.body, {
        userId: req.user?.userId || req.user?.id,
        role: req.user?.role,
      });

      return successResponse(res, {
        statusCode: 200,
        message: 'Payment verified and captured successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/payments/offline-settle
   */
  async settleOffline(req, res, next) {
    try {
      const validation = validateOfflineSettle(req.body);
      if (!validation.isValid) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid offline settlement payload',
          errors: validation.errors,
        });
      }

      const result = await paymentService.settleOfflinePayment(req.body, {
        userId: req.user?.userId || req.user?.id,
        role: req.user?.role,
      });

      return successResponse(res, {
        statusCode: 200,
        message: 'Offline payment settled successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments/:id
   */
  async getPaymentById(req, res, next) {
    try {
      const paymentId = parseInt(req.params.id, 10);
      if (isNaN(paymentId) || paymentId <= 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'INVALID_ID',
          message: 'Payment ID must be a valid positive integer',
        });
      }

      const result = await paymentService.getPaymentById(paymentId, {
        userId: req.user?.userId || req.user?.id,
        role: req.user?.role,
      });

      return successResponse(res, {
        statusCode: 200,
        message: 'Payment details retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments/order/:orderId
   */
  async getPaymentsByOrderId(req, res, next) {
    try {
      const orderId = parseInt(req.params.orderId, 10);
      if (isNaN(orderId) || orderId <= 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'INVALID_ID',
          message: 'Order ID must be a valid positive integer',
        });
      }

      const result = await paymentService.getPaymentsByOrderId(orderId);

      return successResponse(res, {
        statusCode: 200,
        message: 'Order payments retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments/status/:id
   */
  async getPaymentStatus(req, res, next) {
    try {
      const identifier = req.params.id;
      const result = await paymentService.getPaymentStatus(identifier);

      return successResponse(res, {
        statusCode: 200,
        message: 'Payment status retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments
   */
  async listPayments(req, res, next) {
    try {
      const { branchId, paymentStatus, paymentMethod, orderId, startDate, endDate, page, limit } = req.query;

      const result = await paymentService.listPayments({
        branchId: branchId ? parseInt(branchId, 10) : null,
        paymentStatus,
        paymentMethod,
        orderId: orderId ? parseInt(orderId, 10) : null,
        startDate,
        endDate,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      return successResponse(res, {
        statusCode: 200,
        message: 'Payments list retrieved successfully',
        data: result.items,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PaymentController();

