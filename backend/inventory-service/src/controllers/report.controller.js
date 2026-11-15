/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT CONTROLLER
 * File: backend/inventory-service/src/controllers/report.controller.js
 * ============================================================================
 */

const { successResponse } = require('@rms/shared');
const { reportService } = require('../services');

class ReportController {
  /**
   * GET /api/v1/inventory/reports/valuation
   */
  async getValuationReport(req, res, next) {
    try {
      const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : null;
      const category = req.query.category || null;

      const report = await reportService.getValuationReport(branchId, category);

      return successResponse(res, {
        message: 'Stock valuation report generated successfully.',
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/inventory/reports/consumption-summary
   */
  async getConsumptionReport(req, res, next) {
    try {
      const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : null;
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;

      const report = await reportService.getConsumptionReport(branchId, startDate, endDate);

      return successResponse(res, {
        message: 'Consumption and wastage report generated successfully.',
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
}

const controller = new ReportController();
module.exports = {
  getValuationReport: controller.getValuationReport.bind(controller),
  getConsumptionReport: controller.getConsumptionReport.bind(controller),
};

