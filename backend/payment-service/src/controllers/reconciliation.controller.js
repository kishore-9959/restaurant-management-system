/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RECONCILIATION CONTROLLER
 * File: backend/payment-service/src/controllers/reconciliation.controller.js
 * ============================================================================
 */

const { successResponse } = require('@rms/shared');
const { reconciliationService } = require('../services');

class ReconciliationController {
  /**
   * GET /api/v1/payments/reports/reconciliation
   */
  async getReport(req, res, next) {
    try {
      const { branchId, startDate, endDate } = req.query;

      const result = await reconciliationService.getReconciliationReport({
        branchId,
        startDate,
        endDate,
      });

      return successResponse(res, {
        statusCode: 200,
        message: 'Financial reconciliation report retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReconciliationController();

