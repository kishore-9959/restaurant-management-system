/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - STOCK CONTROLLER
 * File: backend/inventory-service/src/controllers/stock.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const { stockService } = require('../services');
const {
  validateStockMovementPayload,
  validateStockAdjustPayload,
  validateStockTransferPayload,
} = require('../validators');

class StockController {
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
   * POST /api/v1/inventory/stock/in
   */
  async stockIn(req, res, next) {
    try {
      const validationErrors = validateStockMovementPayload(req.body);
      if (validationErrors.length > 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid stock-in payload.',
          details: validationErrors,
        });
      }

      const authContext = this.extractAuthContext(req);
      const result = await stockService.recordStockIn(req.body, authContext);

      return successResponse(res, {
        message: 'Stock-in recorded successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/inventory/stock/out
   */
  async stockOut(req, res, next) {
    try {
      const validationErrors = validateStockMovementPayload(req.body);
      if (validationErrors.length > 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid stock-out payload.',
          details: validationErrors,
        });
      }

      const authContext = this.extractAuthContext(req);
      const result = await stockService.recordStockOut(req.body, authContext);

      return successResponse(res, {
        message: 'Stock-out recorded successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/inventory/stock/adjust
   */
  async stockAdjust(req, res, next) {
    try {
      const validationErrors = validateStockAdjustPayload(req.body);
      if (validationErrors.length > 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid stock adjustment payload.',
          details: validationErrors,
        });
      }

      const authContext = this.extractAuthContext(req);
      const result = await stockService.recordStockAdjust(req.body, authContext);

      return successResponse(res, {
        message: 'Stock adjustment recorded successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/inventory/stock/transfer
   */
  async stockTransfer(req, res, next) {
    try {
      const validationErrors = validateStockTransferPayload(req.body);
      if (validationErrors.length > 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid stock transfer payload.',
          details: validationErrors,
        });
      }

      const authContext = this.extractAuthContext(req);
      const result = await stockService.transferStock(req.body, authContext);

      return successResponse(res, {
        message: 'Stock transfer completed successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/inventory/alerts/low-stock
   */
  async getLowStockAlerts(req, res, next) {
    try {
      const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : null;
      const criticalOnly = req.query.criticalOnly === 'true' || req.query.criticalOnly === '1';

      const alerts = await stockService.getLowStockAlerts(branchId, criticalOnly);

      return successResponse(res, {
        message: 'Low stock alerts retrieved successfully.',
        data: alerts,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/inventory/transactions
   */
  async getTransactions(req, res, next) {
    try {
      const filters = {
        branchId: req.query.branchId ? parseInt(req.query.branchId, 10) : null,
        ingredientId: req.query.ingredientId ? parseInt(req.query.ingredientId, 10) : null,
        transactionType: req.query.transactionType || null,
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null,
        page: req.query.page,
        limit: req.query.limit,
      };

      const result = await stockService.getTransactionHistory(filters);

      return successResponse(res, {
        message: 'Inventory transactions retrieved successfully.',
        data: result.items,
        meta: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
}

const controller = new StockController();
module.exports = {
  stockIn: controller.stockIn.bind(controller),
  stockOut: controller.stockOut.bind(controller),
  stockAdjust: controller.stockAdjust.bind(controller),
  stockTransfer: controller.stockTransfer.bind(controller),
  getLowStockAlerts: controller.getLowStockAlerts.bind(controller),
  getTransactions: controller.getTransactions.bind(controller),
};
