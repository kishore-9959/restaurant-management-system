/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - INVENTORY REPORT REPOSITORY
 * File: backend/inventory-service/src/repositories/report.repository.js
 * Description: Data access methods for Valuation and Consumption Analytics
 *              using Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class ReportRepository {
  /**
   * Aggregate stock asset valuation by category and branch
   */
  async getValuationReport(branchId = null, category = null) {
    const result = await executeProcedure('dbo.usp_Inventory_GetValuationReport', {
      BranchId: branchId,
      Category: category,
    });

    const categoryBreakdown = result.recordsets?.[0] || [];
    const summary = result.recordsets?.[1]?.[0] || {};

    return {
      totalActiveIngredients: summary.TotalActiveIngredients || 0,
      totalValuation: parseFloat(summary.TotalInventoryValuation || 0),
      lowStockIngredientsCount: summary.LowStockIngredientsCount || 0,
      criticalStockIngredientsCount: summary.CriticalStockIngredientsCount || 0,
      categories: categoryBreakdown.map((c) => ({
        category: c.Category,
        ingredientsCount: c.IngredientsCount,
        totalStockUnits: parseFloat(c.TotalStockUnits || 0),
        categoryValuation: parseFloat(c.CategoryValuation || 0),
      })),
    };
  }

  /**
   * Aggregate consumption volume, cost, and spoilage losses over a date range
   */
  async getConsumptionReport(branchId = null, startDate = null, endDate = null) {
    const result = await executeProcedure('dbo.usp_Inventory_GetConsumptionReport', {
      BranchId: branchId,
      StartDate: startDate,
      EndDate: endDate,
    });

    const itemDetails = result.recordsets?.[0] || [];
    const grandTotals = result.recordsets?.[1]?.[0] || {};

    return {
      grandConsumptionCost: parseFloat(grandTotals.GrandConsumptionCost || 0),
      grandWastageCost: parseFloat(grandTotals.GrandWastageCost || 0),
      grandRestitutionCost: parseFloat(grandTotals.GrandRestitutionCost || 0),
      items: itemDetails.map((item) => ({
        ingredientId: item.IngredientId,
        ingredientCode: item.IngredientCode,
        ingredientName: item.IngredientName,
        category: item.Category,
        unitOfMeasure: item.UnitOfMeasure,
        totalQuantityConsumed: parseFloat(item.TotalQuantityConsumed || 0),
        totalConsumptionCost: parseFloat(item.TotalConsumptionCost || 0),
        totalQuantityWasted: parseFloat(item.TotalQuantityWasted || 0),
        totalWastageCost: parseFloat(item.TotalWastageCost || 0),
        totalQuantityRestituted: parseFloat(item.TotalQuantityRestituted || 0),
      })),
    };
  }
}

module.exports = new ReportRepository();

