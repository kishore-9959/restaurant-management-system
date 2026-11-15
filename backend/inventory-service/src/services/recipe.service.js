/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RECIPE SERVICE
 * File: backend/inventory-service/src/services/recipe.service.js
 * Description: Business logic, validation, and domain rules for Dish BOM Recipes.
 * ============================================================================
 */

const { recipeRepository } = require('../repositories');

class RecipeService {
  /**
   * Create or update dish recipe BOM
   */
  async createOrUpdateRecipe(data) {
    if (!data.menuItemId) {
      const err = new Error('menuItemId is required.');
      err.statusCode = 400;
      err.code = 'MISSING_MENU_ITEM_ID';
      throw err;
    }

    if (!Array.isArray(data.ingredients) || data.ingredients.length === 0) {
      const err = new Error('ingredients array is required and must not be empty.');
      err.statusCode = 400;
      err.code = 'INVALID_INGREDIENTS_LIST';
      throw err;
    }

    // Validate and normalize ingredient line items
    const normalizedIngredients = [];
    for (const item of data.ingredients) {
      const requiredQty = parseFloat(item.requiredQuantity !== undefined ? item.requiredQuantity : item.quantityRequired);
      if (!item.ingredientId || isNaN(requiredQty) || requiredQty <= 0) {
        const err = new Error('Each recipe ingredient must specify ingredientId and a positive requiredQuantity.');
        err.statusCode = 400;
        err.code = 'INVALID_RECIPE_INGREDIENT';
        throw err;
      }
      normalizedIngredients.push({
        ingredientId: parseInt(item.ingredientId, 10),
        requiredQuantity: requiredQty,
        unitOfMeasure: item.unitOfMeasure ? String(item.unitOfMeasure).toUpperCase() : 'KG',
        wastagePercentage: item.wastagePercentage ? parseFloat(item.wastagePercentage) : 0.00,
      });
    }

    try {
      const recipe = await recipeRepository.createOrUpdate({
        ...data,
        ingredients: normalizedIngredients,
      });
      return recipe;
    } catch (err) {
      if (err.message && err.message.includes('MENU_ITEM_NOT_FOUND')) {
        const error = new Error(`Menu Item #${data.menuItemId} does not exist.`);
        error.statusCode = 404;
        error.code = 'MENU_ITEM_NOT_FOUND';
        throw error;
      }
      if (err.message && err.message.includes('VARIANT_NOT_FOUND_FOR_ITEM')) {
        const error = new Error(`Variant #${data.variantId} does not belong to Menu Item #${data.menuItemId}.`);
        error.statusCode = 404;
        error.code = 'VARIANT_NOT_FOUND_FOR_ITEM';
        throw error;
      }
      throw err;
    }
  }

  /**
   * Get recipe for menu item and optional portion variant
   */
  async getRecipeByMenuItem(menuItemId, variantId = null) {
    const recipe = await recipeRepository.getByMenuItem(menuItemId, variantId);
    if (!recipe) {
      const err = new Error(`No active recipe found for Menu Item #${menuItemId}${variantId ? ` (Variant #${variantId})` : ''}.`);
      err.statusCode = 404;
      err.code = 'RECIPE_NOT_FOUND';
      throw err;
    }
    return recipe;
  }

  /**
   * Deactivate recipe
   */
  async deleteRecipe(recipeId) {
    return recipeRepository.delete(recipeId);
  }
}

module.exports = new RecipeService();
