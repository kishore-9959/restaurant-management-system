/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT SERVICE
 * File: backend/report-service/src/services/report.service.js
 * Description: Business logic, caching orchestration, branch tenancy isolation,
 *              and export transformations for Report Service.
 * ============================================================================
 */

const { reportRepository } = require('../repositories');
const { generateExcelWorkbook, generatePdfReport, generateCsv } = require('../utils');
const { getRedisClient } = require('@rms/shared');

class ReportService {
  constructor() {
    this.redis = null;
    try {
      this.redis = getRedisClient();
    } catch (e) {
      // Redis optional fallback
    }
  }

  /**
   * Helper: Resolves effective branchId considering user role and tenancy.
   */
  resolveBranchId(user, requestedBranchId) {
    if (!user) return requestedBranchId;
    // RESTAURANT_MANAGER is strictly bound to their assigned branch
    if (user.role === 'RESTAURANT_MANAGER' || user.userType === 'STAFF') {
      return user.branchId ? Number(user.branchId) : requestedBranchId;
    }
    // SUPER_ADMIN can query any branch or all branches
    return requestedBranchId;
  }

  /**
   * Helper: Cache retrieval wrapper with safe key generation.
   */
  async getOrSetCache(cacheKey, ttlSeconds, fetchFn, forceRefresh = false) {
    if (this.redis && !forceRefresh) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return { data: JSON.parse(cached), fromCache: true };
        }
      } catch (err) {
        // Cache miss on error, continue to fetch
      }
    }

    const data = await fetchFn();

    if (this.redis && data && ttlSeconds > 0) {
      try {
        await this.redis.set(cacheKey, JSON.stringify(data), 'EX', ttlSeconds);
      } catch (err) {
        // Silent cache failure
      }
    }

    return { data, fromCache: false };
  }

  /**
   * 1. Executive Dashboard Summary (SP 226)
   */
  async getDashboardSummary(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:dashboard:${branchId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    // Real-time KPI summary: 60 seconds TTL
    return this.getOrSetCache(cacheKey, 60, async () => {
      return await reportRepository.getExecutiveDashboardSummary({
        branchId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 2. Sales Daily (SP 227)
   */
  async getSalesDaily(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:sales:daily:${branchId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 300, async () => {
      return await reportRepository.getSalesDaily({
        branchId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 3. Sales Monthly (SP 228)
   */
  async getSalesMonthly(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:sales:monthly:${branchId || 'all'}:${params.year || 'curr'}`;
    return this.getOrSetCache(cacheKey, 3600, async () => {
      return await reportRepository.getSalesMonthly({
        branchId,
        year: params.year,
      });
    }, forceRefresh);
  }

  /**
   * 4. Sales Trends (SP 229)
   */
  async getSalesTrends(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:sales:trends:${branchId || 'all'}:${params.interval}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 300, async () => {
      return await reportRepository.getSalesTrends({
        branchId,
        interval: params.interval,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 5. Sales by Branch (SP 230)
   */
  async getSalesByBranch(params, user, forceRefresh = false) {
    const cacheKey = `rms:report:sales:branches:${params.restaurantId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 600, async () => {
      return await reportRepository.getSalesByBranch({
        restaurantId: params.restaurantId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 6. Sales by Restaurant (SP 231)
   */
  async getSalesByRestaurant(params, user, forceRefresh = false) {
    const cacheKey = `rms:report:sales:restaurants:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 600, async () => {
      return await reportRepository.getSalesByRestaurant({
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 7. Sales by Item (SP 232)
   */
  async getSalesByItem(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:sales:items:${branchId || 'all'}:${params.categoryId || 'all'}:${params.topN}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 600, async () => {
      return await reportRepository.getSalesByItem({
        branchId,
        categoryId: params.categoryId,
        startDate: params.startDate,
        endDate: params.endDate,
        topN: params.topN,
      });
    }, forceRefresh);
  }

  /**
   * 8. Sales by Category (SP 233)
   */
  async getSalesByCategory(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:sales:categories:${branchId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 600, async () => {
      return await reportRepository.getSalesByCategory({
        branchId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 9. Revenue Summary (SP 234)
   */
  async getRevenueSummary(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:revenue:summary:${branchId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 60, async () => {
      return await reportRepository.getRevenueSummary({
        branchId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 10. Revenue by Payment Method (SP 235)
   */
  async getRevenueByPaymentMethod(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:revenue:pm:${branchId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 120, async () => {
      return await reportRepository.getRevenueByPaymentMethod({
        branchId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 11. Revenue Refunds (SP 236)
   */
  async getRevenueRefunds(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:revenue:refunds:${branchId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 60, async () => {
      return await reportRepository.getRevenueRefunds({
        branchId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 12. Orders Summary (SP 237)
   */
  async getOrdersSummary(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:orders:summary:${branchId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 60, async () => {
      return await reportRepository.getOrdersSummary({
        branchId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 13. Orders Peak Hours (SP 238)
   */
  async getOrdersPeakHours(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:orders:peak:${branchId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 600, async () => {
      return await reportRepository.getOrdersPeakHours({
        branchId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 14. Top Selling Items (SP 239)
   */
  async getTopSellingItems(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:orders:top-items:${branchId || 'all'}:${params.topN}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 600, async () => {
      return await reportRepository.getTopSellingItems({
        branchId,
        topN: params.topN,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 15. Inventory Current Stock (SP 240)
   */
  async getInventoryCurrentStock(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:inventory:stock:${branchId || 'all'}:${params.category || 'all'}`;
    return this.getOrSetCache(cacheKey, 120, async () => {
      return await reportRepository.getInventoryCurrentStock({
        branchId,
        category: params.category,
      });
    }, forceRefresh);
  }

  /**
   * 16. Inventory Low Stock Alerts (SP 241)
   */
  async getInventoryLowStock(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:inventory:low:${branchId || 'all'}`;
    return this.getOrSetCache(cacheKey, 60, async () => {
      return await reportRepository.getInventoryLowStock({
        branchId,
      });
    }, forceRefresh);
  }

  /**
   * 17. Inventory Transactions (SP 242)
   */
  async getInventoryTransactions(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:inventory:tx:${branchId || 'all'}:${params.ingredientId || 'all'}:${params.type || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 120, async () => {
      return await reportRepository.getInventoryTransactions({
        branchId,
        ingredientId: params.ingredientId,
        transactionType: params.type,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 18. Inventory Valuation (SP 243)
   */
  async getInventoryValuation(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:inventory:val:${branchId || 'all'}`;
    return this.getOrSetCache(cacheKey, 600, async () => {
      return await reportRepository.getInventoryValuation({
        branchId,
      });
    }, forceRefresh);
  }

  /**
   * 19. Inventory Consumption (SP 244)
   */
  async getInventoryConsumption(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:inventory:cons:${branchId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 600, async () => {
      return await reportRepository.getInventoryConsumption({
        branchId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 20. Reservation Summary (SP 245)
   */
  async getReservationSummary(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:res:summary:${branchId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 120, async () => {
      return await reportRepository.getReservationSummary({
        branchId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 21. Reservation Trends (SP 246)
   */
  async getReservationTrends(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:res:trends:${branchId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 300, async () => {
      return await reportRepository.getReservationTrends({
        branchId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 22. Customer Analytics (SP 247)
   */
  async getCustomerAnalytics(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:cust:analytics:${branchId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 600, async () => {
      return await reportRepository.getCustomerAnalytics({
        branchId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 23. Customer Top Spenders (SP 248)
   */
  async getCustomerTopSpenders(params, user, forceRefresh = false) {
    const branchId = this.resolveBranchId(user, params.branchId);
    const cacheKey = `rms:report:cust:top:${branchId || 'all'}:${params.topN}`;
    return this.getOrSetCache(cacheKey, 600, async () => {
      return await reportRepository.getCustomerTopSpenders({
        branchId,
        topN: params.topN,
      });
    }, forceRefresh);
  }

  /**
   * 24. Branch Performance Scorecard (SP 249)
   */
  async getBranchPerformance(params, user, forceRefresh = false) {
    const cacheKey = `rms:report:branch:perf:${params.restaurantId || 'all'}:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 600, async () => {
      return await reportRepository.getBranchPerformance({
        restaurantId: params.restaurantId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * 25. Restaurant Performance Rollup (SP 250)
   */
  async getRestaurantPerformance(params, user, forceRefresh = false) {
    const cacheKey = `rms:report:rest:perf:${params.startDate || 'd'}_${params.endDate || 'd'}`;
    return this.getOrSetCache(cacheKey, 600, async () => {
      return await reportRepository.getRestaurantPerformance({
        startDate: params.startDate,
        endDate: params.endDate,
      });
    }, forceRefresh);
  }

  /**
   * Report Export Generator
   */
  async exportReport({ reportType, format, params, user }) {
    let title = 'RMS Report';
    let columns = [];
    let rows = [];

    // Map reportType to dataset & column schemas
    switch (reportType) {
      case 'sales-daily': {
        title = 'Daily Sales Report';
        columns = [
          { header: 'Sale Date', key: 'SaleDate', width: 14 },
          { header: 'Order Count', key: 'OrderCount', width: 12, format: 'number' },
          { header: 'Gross Sales', key: 'GrossSales', width: 16, format: 'currency' },
          { header: 'Discounts', key: 'DiscountTotal', width: 14, format: 'currency' },
          { header: 'Taxes', key: 'TaxTotal', width: 14, format: 'currency' },
          { header: 'Net Sales', key: 'NetSales', width: 16, format: 'currency' },
          { header: 'AOV', key: 'AverageOrderValue', width: 14, format: 'currency' },
        ];
        const res = await this.getSalesDaily(params, user, true);
        rows = res.data;
        break;
      }
      case 'revenue-methods': {
        title = 'Revenue by Payment Method Report';
        columns = [
          { header: 'Payment Method', key: 'PaymentMethod', width: 20 },
          { header: 'Transactions', key: 'TransactionCount', width: 14, format: 'number' },
          { header: 'Gross Amount', key: 'GrossAmount', width: 18, format: 'currency' },
          { header: 'Refunds', key: 'RefundAmount', width: 16, format: 'currency' },
          { header: 'Net Amount', key: 'NetAmount', width: 18, format: 'currency' },
        ];
        const res = await this.getRevenueByPaymentMethod(params, user, true);
        rows = res.data;
        break;
      }
      case 'inventory-stock': {
        title = 'Current Inventory Stock Report';
        columns = [
          { header: 'Ingredient Code', key: 'IngredientCode', width: 16 },
          { header: 'Ingredient Name', key: 'IngredientName', width: 24 },
          { header: 'Category', key: 'Category', width: 16 },
          { header: 'Stock Units', key: 'CurrentStock', width: 14, format: 'number' },
          { header: 'Unit of Measure', key: 'UnitOfMeasure', width: 14 },
          { header: 'Cost / Unit', key: 'CostPerUnit', width: 14, format: 'currency' },
          { header: 'Total Value', key: 'TotalValuation', width: 16, format: 'currency' },
          { header: 'Stock Status', key: 'StockStatus', width: 14 },
        ];
        const res = await this.getInventoryCurrentStock(params, user, true);
        rows = res.data;
        break;
      }
      case 'top-items': {
        title = 'Top Selling Menu Items';
        columns = [
          { header: 'Rank', key: 'ItemRank', width: 10, format: 'number' },
          { header: 'Item Name', key: 'ItemName', width: 26 },
          { header: 'Category', key: 'CategoryName', width: 18 },
          { header: 'Units Sold', key: 'UnitsSold', width: 14, format: 'number' },
          { header: 'Total Revenue', key: 'TotalRevenue', width: 18, format: 'currency' },
        ];
        const res = await this.getTopSellingItems(params, user, true);
        rows = res.data;
        break;
      }
      default: {
        title = 'Sales Daily Report';
        columns = [
          { header: 'Sale Date', key: 'SaleDate', width: 14 },
          { header: 'Order Count', key: 'OrderCount', width: 12, format: 'number' },
          { header: 'Net Sales', key: 'NetSales', width: 16, format: 'currency' },
        ];
        const res = await this.getSalesDaily(params, user, true);
        rows = res.data;
        break;
      }
    }

    const metadata = {
      branchId: this.resolveBranchId(user, params.branchId),
      startDate: params.startDate,
      endDate: params.endDate,
    };

    if (format === 'csv') {
      const csvData = generateCsv({ columns, rows });
      return {
        data: Buffer.from(csvData, 'utf8'),
        contentType: 'text/csv; charset=utf-8',
        filename: `${reportType}_${Date.now()}.csv`,
      };
    } else if (format === 'pdf') {
      const pdfBuffer = await generatePdfReport({ title, columns, rows, metadata });
      return {
        data: pdfBuffer,
        contentType: 'application/pdf',
        filename: `${reportType}_${Date.now()}.pdf`,
      };
    } else {
      // Default: Excel (.xlsx)
      const excelBuffer = await generateExcelWorkbook({ title, columns, rows, metadata });
      return {
        data: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${reportType}_${Date.now()}.xlsx`,
      };
    }
  }
}

module.exports = new ReportService();

