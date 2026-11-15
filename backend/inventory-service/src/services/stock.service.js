/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - STOCK SERVICE
 * File: backend/inventory-service/src/services/stock.service.js
 * Description: Business logic for Stock-In, Stock-Out, Adjustments, Transfers,
 *              Alerts, and Ledger Audits.
 * ============================================================================
 */

const { config, httpClient, createServiceLogger } = require('@rms/shared');
const { stockRepository, ingredientRepository } = require('../repositories');

const logger = createServiceLogger('inventory-service');

class StockService {
  /**
   * Helper: Broadcast low-stock notification to Notification Service
   */
  async notifyLowStock(branchId, ingredient) {
    try {
      const notificationUrl = config.services?.notification || 'http://localhost:8012';
      await httpClient.post(`${notificationUrl}/api/v1/notifications/internal/broadcast`, {
        event: 'inventory:low_stock',
        room: `branch:${branchId}:inventory`,
        payload: {
          branchId,
          ingredientId: ingredient.ingredientId,
          ingredientCode: ingredient.ingredientCode,
          ingredientName: ingredient.ingredientName,
          currentStock: ingredient.currentStock,
          reorderLevel: ingredient.reorderLevel,
          minimumStockLevel: ingredient.minimumStockLevel,
          alertSeverity: ingredient.alertSeverity || 'WARNING',
          timestamp: new Date().toISOString(),
        },
      });
      logger.info(`Dispatched low stock notification for ingredient ${ingredient.ingredientCode} (Branch: ${branchId})`);
    } catch (err) {
      logger.warn(`Failed to broadcast low stock notification: ${err.message}`);
    }
  }

  /**
   * Stock-In (Receipt / Purchase Restock)
   */
  async recordStockIn(data, userContext = {}) {
    if (!data.branchId || !data.ingredientId) {
      const err = new Error('branchId and ingredientId are required.');
      err.statusCode = 400;
      err.code = 'MISSING_REQUIRED_FIELDS';
      throw err;
    }

    const qty = parseFloat(data.quantity);
    if (isNaN(qty) || qty <= 0) {
      const err = new Error('quantity must be a positive number.');
      err.statusCode = 400;
      err.code = 'INVALID_QUANTITY';
      throw err;
    }

    try {
      const result = await stockRepository.stockIn({
        branchId: data.branchId,
        ingredientId: data.ingredientId,
        quantity: qty,
        unitCost: data.unitCost !== undefined ? parseFloat(data.unitCost) : null,
        referencePOId: data.referencePOId || null,
        recordedByUserId: userContext.userId || null,
        notes: data.notes || null,
      });

      return result;
    } catch (err) {
      if (err.message && err.message.includes('INGREDIENT_NOT_FOUND')) {
        const error = new Error(`Ingredient #${data.ingredientId} does not exist in branch #${data.branchId}.`);
        error.statusCode = 404;
        error.code = 'INGREDIENT_NOT_FOUND';
        throw error;
      }
      throw err;
    }
  }

  /**
   * Stock-Out (Wastage / Spoilage / Expiry / Damage)
   */
  async recordStockOut(data, userContext = {}) {
    if (!data.branchId || !data.ingredientId) {
      const err = new Error('branchId and ingredientId are required.');
      err.statusCode = 400;
      err.code = 'MISSING_REQUIRED_FIELDS';
      throw err;
    }

    const qty = parseFloat(data.quantity);
    if (isNaN(qty) || qty <= 0) {
      const err = new Error('quantity must be a positive number.');
      err.statusCode = 400;
      err.code = 'INVALID_QUANTITY';
      throw err;
    }

    try {
      const result = await stockRepository.stockOut({
        branchId: data.branchId,
        ingredientId: data.ingredientId,
        quantity: qty,
        reason: data.reason || data.wasteReason || 'WASTAGE',
        recordedByUserId: userContext.userId || null,
        notes: data.notes || null,
      });

      // Check if balance dipped below safety threshold
      const ingredient = await ingredientRepository.getById(data.ingredientId);
      if (ingredient && ingredient.CurrentStock <= ingredient.ReorderLevel) {
        this.notifyLowStock(data.branchId, {
          ingredientId: ingredient.IngredientId,
          ingredientCode: ingredient.IngredientCode,
          ingredientName: ingredient.IngredientName,
          currentStock: ingredient.CurrentStock,
          reorderLevel: ingredient.ReorderLevel,
          minimumStockLevel: ingredient.MinimumStockLevel,
          alertSeverity: ingredient.CurrentStock <= ingredient.MinimumStockLevel ? 'CRITICAL' : 'WARNING',
        });
      }

      return result;
    } catch (err) {
      if (err.message && err.message.includes('INSUFFICIENT_STOCK')) {
        const error = new Error(`Insufficient stock for ingredient #${data.ingredientId} in branch #${data.branchId}.`);
        error.statusCode = 400;
        error.code = 'INSUFFICIENT_STOCK';
        throw error;
      }
      if (err.message && err.message.includes('INGREDIENT_NOT_FOUND')) {
        const error = new Error(`Ingredient #${data.ingredientId} does not exist in branch #${data.branchId}.`);
        error.statusCode = 404;
        error.code = 'INGREDIENT_NOT_FOUND';
        throw error;
      }
      throw err;
    }
  }

  /**
   * Stock Adjustment (Physical Count Audit Reconciliation)
   */
  async recordStockAdjust(data, userContext = {}) {
    if (!data.branchId || !data.ingredientId) {
      const err = new Error('branchId and ingredientId are required.');
      err.statusCode = 400;
      err.code = 'MISSING_REQUIRED_FIELDS';
      throw err;
    }

    const actualCount = parseFloat(data.actualCount !== undefined ? data.actualCount : data.newPhysicalStock);
    if (isNaN(actualCount) || actualCount < 0) {
      const err = new Error('actualCount must be a non-negative number.');
      err.statusCode = 400;
      err.code = 'INVALID_ACTUAL_COUNT';
      throw err;
    }

    try {
      const result = await stockRepository.stockAdjust({
        branchId: data.branchId,
        ingredientId: data.ingredientId,
        actualCount,
        reason: data.reason || data.adjustmentReason || 'Physical Audit Reconciliation',
        recordedByUserId: userContext.userId || null,
        notes: data.notes || null,
      });

      return result;
    } catch (err) {
      if (err.message && err.message.includes('INGREDIENT_NOT_FOUND')) {
        const error = new Error(`Ingredient #${data.ingredientId} does not exist in branch #${data.branchId}.`);
        error.statusCode = 404;
        error.code = 'INGREDIENT_NOT_FOUND';
        throw error;
      }
      throw err;
    }
  }

  /**
   * Inter-Branch Stock Transfer
   */
  async transferStock(data, userContext = {}) {
    const fromBranchId = parseInt(data.fromBranchId, 10);
    const toBranchId = parseInt(data.toBranchId, 10);
    const qty = parseFloat(data.transferQuantity || data.quantity);

    let ingredientCode = data.ingredientCode;
    if (!ingredientCode && (data.ingredientId || data.sourceIngredientId)) {
      const ing = await ingredientRepository.getById(data.ingredientId || data.sourceIngredientId);
      if (ing) {
        ingredientCode = ing.IngredientCode;
      }
    }

    if (!fromBranchId || !toBranchId || !ingredientCode) {
      const err = new Error('fromBranchId, toBranchId, and ingredientCode are required.');
      err.statusCode = 400;
      err.code = 'MISSING_REQUIRED_FIELDS';
      throw err;
    }

    if (fromBranchId === toBranchId) {
      const err = new Error('Source and destination branches must be different.');
      err.statusCode = 400;
      err.code = 'IDENTICAL_BRANCHES';
      throw err;
    }

    if (isNaN(qty) || qty <= 0) {
      const err = new Error('transferQuantity must be a positive number.');
      err.statusCode = 400;
      err.code = 'INVALID_QUANTITY';
      throw err;
    }

    try {
      const result = await stockRepository.stockTransfer({
        fromBranchId,
        toBranchId,
        ingredientCode,
        transferQuantity: qty,
        recordedByUserId: userContext.userId || null,
        notes: data.notes || null,
      });

      return result;
    } catch (err) {
      if (err.message && err.message.includes('INSUFFICIENT_STOCK_FOR_TRANSFER')) {
        const error = new Error(`Source branch #${fromBranchId} has insufficient stock for ingredient '${data.ingredientCode}'.`);
        error.statusCode = 400;
        error.code = 'INSUFFICIENT_STOCK_FOR_TRANSFER';
        throw error;
      }
      if (err.message && err.message.includes('SOURCE_INGREDIENT_NOT_FOUND')) {
        const error = new Error(`Ingredient '${data.ingredientCode}' not found in source branch #${fromBranchId}.`);
        error.statusCode = 404;
        error.code = 'SOURCE_INGREDIENT_NOT_FOUND';
        throw error;
      }
      if (err.message && err.message.includes('SOURCE_BRANCH_NOT_FOUND')) {
        const error = new Error(`Source branch #${fromBranchId} not found.`);
        error.statusCode = 404;
        error.code = 'SOURCE_BRANCH_NOT_FOUND';
        throw error;
      }
      if (err.message && err.message.includes('DESTINATION_BRANCH_NOT_FOUND')) {
        const error = new Error(`Destination branch #${toBranchId} not found.`);
        error.statusCode = 404;
        error.code = 'DESTINATION_BRANCH_NOT_FOUND';
        throw error;
      }
      throw err;
    }
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(branchId = null, criticalOnly = false) {
    return stockRepository.getLowStockAlerts(branchId, Boolean(criticalOnly));
  }

  /**
   * Get transaction audit history
   */
  async getTransactionHistory(filters = {}) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));

    const { items, total } = await stockRepository.getTransactions({
      ...filters,
      page,
      limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

module.exports = new StockService();
