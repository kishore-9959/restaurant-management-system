/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - BOM REPOSITORY
 * File: backend/inventory-service/src/repositories/bom.repository.js
 * Description: Data access methods for Order Saga BOM Check, Depletion, and Restitution
 *              using Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class BomRepository {
  /**
   * Check ingredient availability for dishes without stock deduction
   */
  async checkStock(branchId, items) {
    const result = await executeProcedure('dbo.usp_Inventory_BOM_CheckStock', {
      BranchId: branchId,
      ItemsJson: JSON.stringify(items || []),
    });

    const summary = result.recordsets?.[0]?.[0] || {
      HasSufficientStock: false,
      TotalIngredientsChecked: 0,
      DeficitCount: 0,
    };

    const details = result.recordsets?.[1] || [];

    return {
      hasSufficientStock: Boolean(summary.HasSufficientStock),
      totalChecked: summary.TotalIngredientsChecked,
      deficitCount: summary.DeficitCount,
      ingredients: details.map((d) => ({
        ingredientId: d.IngredientId,
        ingredientCode: d.IngredientCode,
        ingredientName: d.IngredientName,
        unitOfMeasure: d.UnitOfMeasure,
        requiredQuantity: parseFloat(d.RequiredQuantity),
        availableStock: parseFloat(d.AvailableStock),
        deficitQuantity: parseFloat(d.DeficitQuantity),
        isSufficient: Boolean(d.IsSufficient),
      })),
    };
  }

  /**
   * Deduct ingredients via BOM for confirmed order (Idempotent)
   */
  async deplete(branchId, orderId, orderNumber, items, recordedByUserId = null) {
    const result = await executeProcedure('dbo.usp_Inventory_BOM_Deplete', {
      BranchId: branchId,
      OrderId: orderId,
      OrderNumber: orderNumber,
      ItemsJson: JSON.stringify(items || []),
      RecordedByUserId: recordedByUserId,
    });

    const header = result.recordsets?.[0]?.[0] || {};
    const lowStockAlerts = result.recordsets?.[1] || [];

    return {
      orderId: header.OrderId,
      orderNumber: header.OrderNumber,
      depletedCount: header.DepletedCount,
      lowStockTriggered: Boolean(header.LowStockTriggered),
      isIdempotentDuplicate: Boolean(header.IsIdempotentDuplicate),
      lowStockAlerts: lowStockAlerts.map((a) => ({
        ingredientId: a.IngredientId,
        ingredientCode: a.IngredientCode,
        ingredientName: a.IngredientName,
        unitOfMeasure: a.UnitOfMeasure,
        currentStock: parseFloat(a.CurrentStock),
        minimumStockLevel: parseFloat(a.MinimumStockLevel),
        reorderLevel: parseFloat(a.ReorderLevel),
        alertSeverity: a.AlertSeverity,
      })),
    };
  }

  /**
   * Compensating transaction: Restores deducted stock for voided/cancelled orders
   */
  async restitute(branchId, orderId, orderNumber, reason = null, recordedByUserId = null) {
    const result = await executeProcedure('dbo.usp_Inventory_BOM_Restitute', {
      BranchId: branchId,
      OrderId: orderId,
      OrderNumber: orderNumber,
      Reason: reason || 'Order Cancelled/Voided',
      RecordedByUserId: recordedByUserId,
    });

    return result.recordset?.[0] || null;
  }
}

module.exports = new BomRepository();

