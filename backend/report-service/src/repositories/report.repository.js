/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT REPOSITORY
 * File: backend/report-service/src/repositories/report.repository.js
 * Description: 100% Parameterized Stored Procedure execution for Report Service.
 *              Wraps all 25 stored procedures (SPs 226–250).
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class ReportRepository {
  /**
   * SP 226: Executive Dashboard Summary
   */
  async getExecutiveDashboardSummary({ branchId = null, startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_ExecutiveDashboardSummary', inputs);
    return {
      kpiSummary: result.recordsets[0] ? result.recordsets[0][0] : null,
      trendPreview: result.recordsets[1] || [],
      recentOrders: result.recordsets[2] || [],
    };
  }

  /**
   * SP 227: Sales Daily
   */
  async getSalesDaily({ branchId = null, startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_SalesDaily', inputs);
    return result.recordset || [];
  }

  /**
   * SP 228: Sales Monthly
   */
  async getSalesMonthly({ branchId = null, year = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      Year: { type: sql.Int, value: year ? Number(year) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_SalesMonthly', inputs);
    return result.recordset || [];
  }

  /**
   * SP 229: Sales Trends
   */
  async getSalesTrends({ branchId = null, interval = 'DAY', startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      Interval: { type: sql.NVarChar(10), value: interval || 'DAY' },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_SalesTrends', inputs);
    return result.recordset || [];
  }

  /**
   * SP 230: Sales by Branch
   */
  async getSalesByBranch({ restaurantId = null, startDate = null, endDate = null }) {
    const inputs = {
      RestaurantId: { type: sql.Int, value: restaurantId ? Number(restaurantId) : null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_SalesByBranch', inputs);
    return result.recordset || [];
  }

  /**
   * SP 231: Sales by Restaurant
   */
  async getSalesByRestaurant({ startDate = null, endDate = null }) {
    const inputs = {
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_SalesByRestaurant', inputs);
    return result.recordset || [];
  }

  /**
   * SP 232: Sales by Item
   */
  async getSalesByItem({ branchId = null, categoryId = null, startDate = null, endDate = null, topN = 50 }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      CategoryId: { type: sql.Int, value: categoryId ? Number(categoryId) : null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
      TopN: { type: sql.Int, value: topN ? Number(topN) : 50 },
    };
    const result = await executeProcedure('dbo.usp_Report_SalesByItem', inputs);
    return result.recordset || [];
  }

  /**
   * SP 233: Sales by Category
   */
  async getSalesByCategory({ branchId = null, startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_SalesByCategory', inputs);
    return result.recordset || [];
  }

  /**
   * SP 234: Revenue Summary
   */
  async getRevenueSummary({ branchId = null, startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_RevenueSummary', inputs);
    return result.recordset[0] || null;
  }

  /**
   * SP 235: Revenue by Payment Method
   */
  async getRevenueByPaymentMethod({ branchId = null, startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_RevenueByPaymentMethod', inputs);
    return result.recordset || [];
  }

  /**
   * SP 236: Revenue Refunds
   */
  async getRevenueRefunds({ branchId = null, startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_RevenueRefunds', inputs);
    return result.recordset || [];
  }

  /**
   * SP 237: Orders Summary
   */
  async getOrdersSummary({ branchId = null, startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_OrdersSummary', inputs);
    return result.recordset[0] || null;
  }

  /**
   * SP 238: Orders Peak Hours
   */
  async getOrdersPeakHours({ branchId = null, startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_OrdersPeakHours', inputs);
    return result.recordset || [];
  }

  /**
   * SP 239: Top Selling Items
   */
  async getTopSellingItems({ branchId = null, topN = 10, startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      TopN: { type: sql.Int, value: topN ? Number(topN) : 10 },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_TopSellingItems', inputs);
    return result.recordset || [];
  }

  /**
   * SP 240: Inventory Current Stock
   */
  async getInventoryCurrentStock({ branchId = null, category = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      Category: { type: sql.NVarChar(50), value: category || null },
    };
    const result = await executeProcedure('dbo.usp_Report_InventoryCurrentStock', inputs);
    return result.recordset || [];
  }

  /**
   * SP 241: Inventory Low Stock Alerts
   */
  async getInventoryLowStock({ branchId = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_InventoryLowStock', inputs);
    return result.recordset || [];
  }

  /**
   * SP 242: Inventory Transactions
   */
  async getInventoryTransactions({
    branchId = null,
    ingredientId = null,
    transactionType = null,
    startDate = null,
    endDate = null,
  }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      IngredientId: { type: sql.BigInt, value: ingredientId ? Number(ingredientId) : null },
      TransactionType: { type: sql.NVarChar(30), value: transactionType || null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_InventoryTransactions', inputs);
    return result.recordset || [];
  }

  /**
   * SP 243: Inventory Valuation
   */
  async getInventoryValuation({ branchId = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_InventoryValuation', inputs);
    return {
      categoryBreakdown: result.recordsets[0] || [],
      overallTotals: result.recordsets[1] ? result.recordsets[1][0] : null,
    };
  }

  /**
   * SP 244: Inventory Consumption
   */
  async getInventoryConsumption({ branchId = null, startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_InventoryConsumption', inputs);
    return {
      ingredientDetails: result.recordsets[0] || [],
      grandTotals: result.recordsets[1] ? result.recordsets[1][0] : null,
    };
  }

  /**
   * SP 245: Reservation Summary
   */
  async getReservationSummary({ branchId = null, startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      StartDate: { type: sql.Date, value: startDate || null },
      EndDate: { type: sql.Date, value: endDate || null },
    };
    const result = await executeProcedure('dbo.usp_Report_ReservationSummary', inputs);
    return result.recordset[0] || null;
  }

  /**
   * SP 246: Reservation Trends
   */
  async getReservationTrends({ branchId = null, startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      StartDate: { type: sql.Date, value: startDate || null },
      EndDate: { type: sql.Date, value: endDate || null },
    };
    const result = await executeProcedure('dbo.usp_Report_ReservationTrends', inputs);
    return result.recordset || [];
  }

  /**
   * SP 247: Customer Analytics
   */
  async getCustomerAnalytics({ branchId = null, startDate = null, endDate = null }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_CustomerAnalytics', inputs);
    return result.recordset[0] || null;
  }

  /**
   * SP 248: Customer Top Spenders
   */
  async getCustomerTopSpenders({ branchId = null, topN = 20 }) {
    const inputs = {
      BranchId: { type: sql.Int, value: branchId ? Number(branchId) : null },
      TopN: { type: sql.Int, value: topN ? Number(topN) : 20 },
    };
    const result = await executeProcedure('dbo.usp_Report_CustomerTopSpenders', inputs);
    return result.recordset || [];
  }

  /**
   * SP 249: Branch Performance Scorecard
   */
  async getBranchPerformance({ restaurantId = null, startDate = null, endDate = null }) {
    const inputs = {
      RestaurantId: { type: sql.Int, value: restaurantId ? Number(restaurantId) : null },
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_BranchPerformance', inputs);
    return result.recordset || [];
  }

  /**
   * SP 250: Restaurant Performance Rollup
   */
  async getRestaurantPerformance({ startDate = null, endDate = null }) {
    const inputs = {
      StartDate: { type: sql.DateTime2, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime2, value: endDate ? new Date(endDate) : null },
    };
    const result = await executeProcedure('dbo.usp_Report_RestaurantPerformance', inputs);
    return result.recordset || [];
  }
}

module.exports = new ReportRepository();

