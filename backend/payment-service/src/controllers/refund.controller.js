/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REFUND CONTROLLER
 * File: backend/payment-service/src/controllers/refund.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const { refundService } = require('../services');
const { validateRefund } = require('../validators');

class RefundController {
  /**
   * POST /api/v1/payments/refund
   */
  async processRefund(req, res, next) {
    try {
      const validation = validateRefund(req.body);
      if (!validation.isValid) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid refund request payload',
          errors: validation.errors,
        });
      }

      const result = await refundService.processRefund(req.body, {
        userId: req.user?.userId || req.user?.id,
        role: req.user?.role,
      });

      return successResponse(res, {
        statusCode: 200,
        message: 'Refund processed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments/refunds/:refundId
   */
  async getRefundById(req, res, next) {
    try {
      const refundId = parseInt(req.params.refundId, 10);
      if (isNaN(refundId) || refundId <= 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'INVALID_ID',
          message: 'Refund ID must be a valid positive integer',
        });
      }

      const result = await refundService.getRefundById(refundId);

      return successResponse(res, {
        statusCode: 200,
        message: 'Refund details retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RefundController();

