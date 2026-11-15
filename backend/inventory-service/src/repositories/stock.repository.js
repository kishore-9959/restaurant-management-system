/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - STOCK REPOSITORY
 * File: backend/inventory-service/src/repositories/stock.repository.js
 * Description: Data access methods for Stock Movements, Adjustments, Transfers,
 *              Alerts, and Ledger Transactions using Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class StockRepository {
  /**
   * Record Stock-In (Receipt / Purchase)
   */
  async stockIn(data) {
    const result = await executeProcedure('dbo.usp_Inventory_StockIn', {
      BranchId: data.branchId,
      IngredientId: data.ingredientId,
      Quantity: data.quantity,
      UnitCost: data.unitCost !== undefined ? data.unitCost : null,
      ReferencePOId: data.referencePOId || null,
      RecordedByUserId: data.recordedByUserId || null,
      Notes: data.notes || null,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Record Stock-Out (Wastage / Spoilage / Expiry)
   */
  async stockOut(data) {
    const result = await executeProcedure('dbo.usp_Inventory_StockOut', {
      BranchId: data.branchId,
      IngredientId: data.ingredientId,
      Quantity: data.quantity,
      Reason: data.reason || 'WASTAGE',
      RecordedByUserId: data.recordedByUserId || null,
      Notes: data.notes || null,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Physical count stock adjustment
   */
  async stockAdjust(data) {
    const result = await executeProcedure('dbo.usp_Inventory_StockAdjust', {
      BranchId: data.branchId,
      IngredientId: data.ingredientId,
      ActualCount: data.actualCount,
      Reason: data.reason || 'Physical Audit Reconciliation',
      RecordedByUserId: data.recordedByUserId || null,
      Notes: data.notes || null,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Inter-branch stock transfer
   */
  async stockTransfer(data) {
    const result = await executeProcedure('dbo.usp_Inventory_StockTransfer', {
      FromBranchId: data.fromBranchId,
      ToBranchId: data.toBranchId,
      IngredientCode: data.ingredientCode,
      TransferQuantity: data.transferQuantity,
      RecordedByUserId: data.recordedByUserId || null,
      Notes: data.notes || null,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Get low-stock alerts
   */
  async getLowStockAlerts(branchId = null, criticalOnly = false) {
    const result = await executeProcedure('dbo.usp_Inventory_GetLowStockAlerts', {
      BranchId: branchId,
      CriticalOnly: criticalOnly ? 1 : 0,
    });

    return result.recordset || [];
  }

  /**
   * Get filtered, paginated inventory transaction audit history
   */
  async getTransactions(filters = {}) {
    const result = await executeProcedure('dbo.usp_Inventory_GetTransactions', {
      BranchId: filters.branchId || null,
      IngredientId: filters.ingredientId || null,
      TransactionType: filters.transactionType || null,
      StartDate: filters.startDate || null,
      EndDate: filters.endDate || null,
      Page: filters.page || 1,
      Limit: filters.limit || 20,
    });

    return {
      items: result.recordsets?.[0] || [],
      total: result.recordsets?.[1]?.[0]?.TotalCount || 0,
    };
  }
}

module.exports = new StockRepository();

