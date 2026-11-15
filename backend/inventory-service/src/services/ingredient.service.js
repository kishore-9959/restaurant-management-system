/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - INGREDIENT SERVICE
 * File: backend/inventory-service/src/services/ingredient.service.js
 * Description: Business logic, validation, and domain rules for Raw Ingredients.
 * ============================================================================
 */

const { ingredientRepository } = require('../repositories');

class IngredientService {
  /**
   * Create new ingredient
   */
  async createIngredient(data, userContext = {}) {
    if (!data.branchId) {
      const err = new Error('branchId is required.');
      err.statusCode = 400;
      err.code = 'INVALID_BRANCH_ID';
      throw err;
    }

    if (!data.ingredientCode || !data.ingredientName) {
      const err = new Error('ingredientCode and ingredientName are required.');
      err.statusCode = 400;
      err.code = 'MISSING_REQUIRED_FIELDS';
      throw err;
    }

    if (!data.unitOfMeasure) {
      const err = new Error('unitOfMeasure is required (e.g. KG, GRAM, LITER, ML, PIECE, CAN).');
      err.statusCode = 400;
      err.code = 'MISSING_UNIT_OF_MEASURE';
      throw err;
    }

    try {
      const result = await ingredientRepository.create({
        ...data,
        recordedByUserId: userContext.userId || null,
      });

      return result;
    } catch (err) {
      if (err.message && err.message.includes('INGREDIENT_CODE_EXISTS')) {
        const error = new Error(`An ingredient with code '${data.ingredientCode}' already exists in branch #${data.branchId}.`);
        error.statusCode = 409;
        error.code = 'INGREDIENT_CODE_EXISTS';
        throw error;
      }
      if (err.message && err.message.includes('BRANCH_NOT_FOUND')) {
        const error = new Error(`Branch #${data.branchId} does not exist or is inactive.`);
        error.statusCode = 404;
        error.code = 'BRANCH_NOT_FOUND';
        throw error;
      }
      if (err.message && err.message.includes('SUPPLIER_NOT_FOUND')) {
        const error = new Error(`Primary Supplier #${data.primarySupplierId} does not exist.`);
        error.statusCode = 404;
        error.code = 'SUPPLIER_NOT_FOUND';
        throw error;
      }
      throw err;
    }
  }

  /**
   * Get single ingredient
   */
  async getIngredientById(ingredientId) {
    const item = await ingredientRepository.getById(ingredientId);
    if (!item) {
      const err = new Error(`Ingredient #${ingredientId} does not exist.`);
      err.statusCode = 404;
      err.code = 'INGREDIENT_NOT_FOUND';
      throw err;
    }
    return item;
  }

  /**
   * List ingredients with pagination and filters
   */
  async listIngredients(filters = {}) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));

    const { items, total } = await ingredientRepository.list({
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

  /**
   * Update ingredient
   */
  async updateIngredient(ingredientId, data) {
    const existing = await this.getIngredientById(ingredientId);

    const merged = {
      ingredientName: data.ingredientName !== undefined ? data.ingredientName : existing.IngredientName,
      category: data.category !== undefined ? data.category : existing.Category,
      unitOfMeasure: data.unitOfMeasure !== undefined ? data.unitOfMeasure : existing.UnitOfMeasure,
      minimumStockLevel: data.minimumStockLevel !== undefined ? data.minimumStockLevel : existing.MinimumStockLevel,
      reorderLevel: data.reorderLevel !== undefined ? data.reorderLevel : existing.ReorderLevel,
      costPerUnit: data.costPerUnit !== undefined ? data.costPerUnit : existing.CostPerUnit,
      primarySupplierId: data.primarySupplierId !== undefined ? data.primarySupplierId : existing.PrimarySupplierId,
    };

    try {
      const updated = await ingredientRepository.update(ingredientId, merged);
      return updated;
    } catch (err) {
      if (err.message && err.message.includes('SUPPLIER_NOT_FOUND')) {
        const error = new Error(`Supplier #${data.primarySupplierId} does not exist.`);
        error.statusCode = 404;
        error.code = 'SUPPLIER_NOT_FOUND';
        throw error;
      }
      throw err;
    }
  }

  /**
   * Toggle active status
   */
  async setIngredientStatus(ingredientId, isActive) {
    await this.getIngredientById(ingredientId);
    return ingredientRepository.setStatus(ingredientId, Boolean(isActive));
  }

  /**
   * Soft-delete ingredient
   */
  async deleteIngredient(ingredientId) {
    await this.getIngredientById(ingredientId);
    return ingredientRepository.delete(ingredientId);
  }
}

module.exports = new IngredientService();
