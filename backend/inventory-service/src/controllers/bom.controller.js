/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - BOM CONTROLLER
 * File: backend/inventory-service/src/controllers/bom.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const { bomService } = require('../services');

class BomController {
  extractAuthContext(req) {
    const roles = Array.isArray(req.user?.roles)
      ? req.user.roles
      : (req.user?.role ? [req.user.role] : []);

    return {
      userId: req.user?.userId || null,
      roles,
      isInternalService: Boolean(req.isInternalService || req.user?.userType === 'INTERNAL_SERVICE'),
    };
  }

  /**
   * POST /api/v1/inventory/bom/check
   */
  async check(req, res, next) {
    try {
      const { branchId, items } = req.body;
      if (!branchId || !Array.isArray(items)) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: "'branchId' and 'items' array are required.",
        });
      }

      const checkResult = await bomService.checkStock(parseInt(branchId, 10), items);

      return successResponse(res, {
        message: 'BOM ingredient availability check completed.',
        data: checkResult,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/inventory/bom/deplete
   */
  async deplete(req, res, next) {
    try {
      const { branchId, orderId, orderNumber, items } = req.body;
      if (!branchId || !orderId || !orderNumber || !Array.isArray(items)) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: "'branchId', 'orderId', 'orderNumber', and 'items' array are required.",
        });
      }

      const authContext = this.extractAuthContext(req);
      const result = await bomService.depleteStock(req.body, authContext);

      return successResponse(res, {
        message: result.isIdempotentDuplicate
          ? 'Idempotent request: Order ingredients already depleted previously.'
          : 'BOM ingredients depleted successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/inventory/bom/restitute
   */
  async restitute(req, res, next) {
    try {
      const { branchId, orderId, orderNumber } = req.body;
      if (!branchId || !orderId || !orderNumber) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: "'branchId', 'orderId', and 'orderNumber' are required.",
        });
      }

      const authContext = this.extractAuthContext(req);
      const result = await bomService.restituteStock(req.body, authContext);

      return successResponse(res, {
        message: 'BOM ingredients restituted successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

const controller = new BomController();
module.exports = {
  check: controller.check.bind(controller),
  deplete: controller.deplete.bind(controller),
  restitute: controller.restitute.bind(controller),
};
