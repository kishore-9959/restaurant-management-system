/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RECIPE CONTROLLER
 * File: backend/inventory-service/src/controllers/recipe.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const { recipeService } = require('../services');
const { validateRecipePayload } = require('../validators');

class RecipeController {
  /**
   * POST /api/v1/inventory/recipes
   */
  async createOrUpdate(req, res, next) {
    try {
      const validationErrors = validateRecipePayload(req.body);
      if (validationErrors.length > 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid recipe BOM payload.',
          details: validationErrors,
        });
      }

      const recipe = await recipeService.createOrUpdateRecipe(req.body);

      return successResponse(res, {
        statusCode: 201,
        message: 'Recipe created/updated successfully.',
        data: recipe,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/inventory/recipes/menu-item/:menuItemId
   */
  async getByMenuItem(req, res, next) {
    try {
      const menuItemId = parseInt(req.params.menuItemId, 10);
      const variantId = req.query.variantId ? parseInt(req.query.variantId, 10) : null;

      const recipe = await recipeService.getRecipeByMenuItem(menuItemId, variantId);

      return successResponse(res, {
        message: 'Recipe retrieved successfully.',
        data: recipe,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/inventory/recipes/:recipeId
   */
  async delete(req, res, next) {
    try {
      const recipeId = parseInt(req.params.recipeId, 10);
      await recipeService.deleteRecipe(recipeId);

      return successResponse(res, {
        message: 'Recipe deactivated successfully.',
        data: { recipeId, isActive: false },
      });
    } catch (err) {
      next(err);
    }
  }
}

const controller = new RecipeController();
module.exports = {
  createOrUpdate: controller.createOrUpdate.bind(controller),
  getByMenuItem: controller.getByMenuItem.bind(controller),
  delete: controller.delete.bind(controller),
};

