/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT CONTROLLER
 * File: backend/report-service/src/controllers/report.controller.js
 * Description: HTTP route handlers and response envelope dispatchers.
 * ============================================================================
 */

const { reportService } = require('../services');
const { validateReportParams } = require('../validators');
const { successResponse, errorResponse } = require('@rms/shared');

class ReportController {
  // 1. Dashboard
  async getDashboardSummary(req, res, next) {
    try {
      const validation = validateReportParams(req);
      if (!validation.isValid) {
        return errorResponse(res, { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: validation.errors });
      }
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getDashboardSummary(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Executive dashboard summary retrieved successfully',
        meta: { fromCache: result.fromCache, dataFreshness: result.fromCache ? 'CACHED' : 'REAL_TIME' },
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Sales Daily
  async getSalesDaily(req, res, next) {
    try {
      const validation = validateReportParams(req);
      if (!validation.isValid) {
        return errorResponse(res, { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: validation.errors });
      }
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getSalesDaily(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Daily sales retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Sales Monthly
  async getSalesMonthly(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getSalesMonthly(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Monthly sales retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Sales Trends
  async getSalesTrends(req, res, next) {
    try {
      const validation = validateReportParams(req);
      if (!validation.isValid) {
        return errorResponse(res, { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: validation.errors });
      }
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getSalesTrends(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Sales trends retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. Sales by Branch
  async getSalesByBranch(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getSalesByBranch(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Branch sales comparison retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. Sales by Restaurant
  async getSalesByRestaurant(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getSalesByRestaurant(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Restaurant sales rollup retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 7. Sales by Item
  async getSalesByItem(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getSalesByItem(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Item sales velocity retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 8. Sales by Category
  async getSalesByCategory(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getSalesByCategory(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Category sales breakdown retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 9. Revenue Summary
  async getRevenueSummary(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getRevenueSummary(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Revenue summary and reconciliation retrieved successfully',
        meta: { fromCache: result.fromCache, dataFreshness: result.fromCache ? 'CACHED' : 'REAL_TIME' },
      });
    } catch (err) {
      next(err);
    }
  }

  // 10. Revenue by Payment Method
  async getRevenueByPaymentMethod(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getRevenueByPaymentMethod(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Revenue by payment method retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 11. Revenue Refunds
  async getRevenueRefunds(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getRevenueRefunds(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Refund audit report retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 12. Orders Summary
  async getOrdersSummary(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getOrdersSummary(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Order status summary retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 13. Orders Peak Hours
  async getOrdersPeakHours(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getOrdersPeakHours(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Peak hours distribution retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 14. Top Selling Items
  async getTopSellingItems(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getTopSellingItems(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Top selling menu items retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 15. Inventory Current Stock
  async getInventoryCurrentStock(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getInventoryCurrentStock(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Current inventory stock retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 16. Inventory Low Stock
  async getInventoryLowStock(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getInventoryLowStock(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Low stock alerts retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 17. Inventory Transactions
  async getInventoryTransactions(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getInventoryTransactions(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Inventory transactions retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 18. Inventory Valuation
  async getInventoryValuation(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getInventoryValuation(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Inventory valuation report retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 19. Inventory Consumption
  async getInventoryConsumption(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getInventoryConsumption(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Inventory consumption and waste report retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 20. Reservation Summary
  async getReservationSummary(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getReservationSummary(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Reservation summary retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 21. Reservation Trends
  async getReservationTrends(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getReservationTrends(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Reservation trends retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 22. Customer Analytics
  async getCustomerAnalytics(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getCustomerAnalytics(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Customer analytics retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 23. Customer Top Spenders
  async getCustomerTopSpenders(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getCustomerTopSpenders(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Top VIP customers retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 24. Branch Performance
  async getBranchPerformance(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getBranchPerformance(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Branch performance scorecard retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 25. Restaurant Performance
  async getRestaurantPerformance(req, res, next) {
    try {
      const validation = validateReportParams(req);
      const forceRefresh = req.query.refresh === 'true';
      const result = await reportService.getRestaurantPerformance(validation.sanitized, req.user, forceRefresh);
      return successResponse(res, {
        statusCode: 200,
        data: result.data,
        message: 'Restaurant performance rollup retrieved successfully',
        meta: { fromCache: result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  // 26. Streaming Export Endpoint
  async exportReport(req, res, next) {
    try {
      const { reportType } = req.params;
      const validation = validateReportParams(req);
      if (!validation.isValid) {
        return errorResponse(res, { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: validation.errors });
      }

      const exportResult = await reportService.exportReport({
        reportType,
        format: validation.sanitized.format,
        params: validation.sanitized,
        user: req.user,
      });

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      return res.status(200).send(exportResult.data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportController();

