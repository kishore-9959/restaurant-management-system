/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RECIPE REPOSITORY
 * File: backend/inventory-service/src/repositories/recipe.repository.js
 * Description: Data access methods for Dish Bill of Materials (BOM) Recipes
 *              using Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class RecipeRepository {
  /**
   * Format multi-recordsets for recipe header and ingredient line items
   */
  formatRecipe(recordsets) {
    const header = recordsets?.[0]?.[0] || null;
    if (!header) return null;

    const rawIngredients = recordsets?.[1] || [];

    return {
      recipeId: header.RecipeId,
      menuItemId: header.MenuItemId,
      menuItemName: header.MenuItemName,
      menuItemCode: header.MenuItemCode,
      variantId: header.VariantId,
      variantName: header.VariantName,
      yieldPortions: header.YieldPortions,
      preparationNotes: header.PreparationNotes,
      isActive: header.IsActive,
      createdAt: header.CreatedAt,
      updatedAt: header.UpdatedAt,
      ingredients: rawIngredients.map((item) => ({
        recipeIngredientId: item.RecipeIngredientId,
        recipeId: item.RecipeId,
        ingredientId: item.IngredientId,
        ingredientCode: item.IngredientCode,
        ingredientName: item.IngredientName,
        requiredQuantity: parseFloat(item.RequiredQuantity),
        unitOfMeasure: item.UnitOfMeasure,
        wastagePercentage: parseFloat(item.WastagePercentage),
        costPerUnit: parseFloat(item.CostPerUnit),
        ingredientCostContribution: parseFloat(item.IngredientCostContribution),
        currentStock: parseFloat(item.CurrentStock),
      })),
    };
  }

  /**
   * Create or update recipe BOM header and line items
   */
  async createOrUpdate(data) {
    const result = await executeProcedure('dbo.usp_Recipe_CreateOrUpdate', {
      MenuItemId: data.menuItemId,
      VariantId: data.variantId || null,
      YieldPortions: data.yieldPortions || 1,
      PreparationNotes: data.preparationNotes || null,
      IngredientsJson: JSON.stringify(data.ingredients || []),
    });

    return this.formatRecipe(result.recordsets);
  }

  /**
   * Get recipe by menu item and optional portion variant
   */
  async getByMenuItem(menuItemId, variantId = null) {
    const result = await executeProcedure('dbo.usp_Recipe_GetByMenuItem', {
      MenuItemId: menuItemId,
      VariantId: variantId,
    });

    return this.formatRecipe(result.recordsets);
  }

  /**
   * Deactivate/delete recipe
   */
  async delete(recipeId) {
    const result = await executeProcedure('dbo.usp_Recipe_Delete', {
      RecipeId: recipeId,
    });

    return result.recordset?.[0] || { Success: 1 };
  }
}

module.exports = new RecipeRepository();

