/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - INGREDIENT REPOSITORY
 * File: backend/inventory-service/src/repositories/ingredient.repository.js
 * Description: Data access methods for Inventory Ingredients using Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class IngredientRepository {
  /**
   * Create a new raw material ingredient
   */
  async create(data) {
    const result = await executeProcedure('dbo.usp_Inventory_Ingredient_Create', {
      BranchId: data.branchId,
      IngredientCode: data.ingredientCode,
      IngredientName: data.ingredientName,
      Category: data.category || 'GENERAL',
      UnitOfMeasure: data.unitOfMeasure,
      InitialStock: data.initialStock !== undefined ? data.initialStock : (data.currentStock !== undefined ? data.currentStock : 0.0),
      MinimumStockLevel: data.minimumStockLevel !== undefined ? data.minimumStockLevel : 5.0,
      ReorderLevel: data.reorderLevel !== undefined ? data.reorderLevel : 10.0,
      CostPerUnit: data.costPerUnit || 0.0,
      PrimarySupplierId: data.primarySupplierId || null,
      RecordedByUserId: data.recordedByUserId || null,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Get ingredient by ID with joined supplier details
   */
  async getById(ingredientId) {
    const result = await executeProcedure('dbo.usp_Inventory_Ingredient_GetById', {
      IngredientId: ingredientId,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * List ingredients with pagination, branch filter, and search
   */
  async list(filters = {}) {
    const result = await executeProcedure('dbo.usp_Inventory_Ingredient_List', {
      BranchId: filters.branchId || null,
      Category: filters.category || null,
      Search: filters.search || null,
      IsActive: filters.isActive !== undefined ? filters.isActive : null,
      LowStockOnly: filters.lowStockOnly ? 1 : 0,
      Page: filters.page || 1,
      Limit: filters.limit || 20,
    });

    return {
      items: result.recordsets?.[0] || [],
      total: result.recordsets?.[1]?.[0]?.TotalCount || 0,
    };
  }

  /**
   * Update ingredient parameters
   */
  async update(ingredientId, data) {
    const result = await executeProcedure('dbo.usp_Inventory_Ingredient_Update', {
      IngredientId: ingredientId,
      IngredientName: data.ingredientName,
      Category: data.category,
      UnitOfMeasure: data.unitOfMeasure,
      MinimumStockLevel: data.minimumStockLevel,
      ReorderLevel: data.reorderLevel,
      CostPerUnit: data.costPerUnit,
      PrimarySupplierId: data.primarySupplierId || null,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Toggle active status
   */
  async setStatus(ingredientId, isActive) {
    const result = await executeProcedure('dbo.usp_Inventory_Ingredient_SetStatus', {
      IngredientId: ingredientId,
      IsActive: isActive ? 1 : 0,
    });

    return result.recordset?.[0] || null;
  }

  /**
   * Soft-delete ingredient
   */
  async delete(ingredientId) {
    const result = await executeProcedure('dbo.usp_Inventory_Ingredient_Delete', {
      IngredientId: ingredientId,
    });

    return result.recordset?.[0] || { Success: 1 };
  }
}

module.exports = new IngredientRepository();
