/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - INGREDIENT CONTROLLER
 * File: backend/inventory-service/src/controllers/ingredient.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const { ingredientService } = require('../services');
const { validateIngredientPayload } = require('../validators');

class IngredientController {
  extractAuthContext(req) {
    const roles = Array.isArray(req.user?.roles)
      ? req.user.roles
      : (req.user?.role ? [req.user.role] : []);

    return {
      userId: req.user?.userId || null,
      roles,
      isInternalService: Boolean(req.isInternalService || req.user?.userType === 'INTERNAL_SERVICE'),
    };
  }

  /**
   * POST /api/v1/inventory/ingredients
   */
  async create(req, res, next) {
    try {
      const validationErrors = validateIngredientPayload(req.body);
      if (validationErrors.length > 0) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid ingredient payload.',
          details: validationErrors,
        });
      }

      const authContext = this.extractAuthContext(req);
      const ingredient = await ingredientService.createIngredient(req.body, authContext);

      return successResponse(res, {
        statusCode: 201,
        message: 'Ingredient created successfully.',
        data: ingredient,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/inventory/ingredients/:id
   */
  async getById(req, res, next) {
    try {
      const ingredientId = parseInt(req.params.id, 10);
      const ingredient = await ingredientService.getIngredientById(ingredientId);

      return successResponse(res, {
        message: 'Ingredient retrieved successfully.',
        data: ingredient,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/inventory/ingredients
   */
  async list(req, res, next) {
    try {
      const filters = {
        branchId: req.query.branchId ? parseInt(req.query.branchId, 10) : null,
        category: req.query.category || null,
        search: req.query.search || null,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' || req.query.isActive === '1' : null,
        lowStockOnly: req.query.lowStockOnly === 'true' || req.query.lowStockOnly === '1',
        page: req.query.page,
        limit: req.query.limit,
      };

      const result = await ingredientService.listIngredients(filters);

      return successResponse(res, {
        message: 'Ingredients retrieved successfully.',
        data: result.items,
        meta: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/inventory/ingredients/:id
   */
  async update(req, res, next) {
    try {
      const ingredientId = parseInt(req.params.id, 10);
      const updated = await ingredientService.updateIngredient(ingredientId, req.body);

      return successResponse(res, {
        message: 'Ingredient updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/inventory/ingredients/:id/status
   */
  async setStatus(req, res, next) {
    try {
      const ingredientId = parseInt(req.params.id, 10);
      const { isActive } = req.body;

      if (isActive === undefined) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: "'isActive' boolean is required in request body.",
        });
      }

      const updated = await ingredientService.setIngredientStatus(ingredientId, isActive);

      return successResponse(res, {
        message: 'Ingredient status updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/inventory/ingredients/:id
   */
  async delete(req, res, next) {
    try {
      const ingredientId = parseInt(req.params.id, 10);
      await ingredientService.deleteIngredient(ingredientId);

      return successResponse(res, {
        message: 'Ingredient deleted successfully.',
        data: { ingredientId, isDeleted: true },
      });
    } catch (err) {
      next(err);
    }
  }
}

const controller = new IngredientController();
module.exports = {
  create: controller.create.bind(controller),
  getById: controller.getById.bind(controller),
  list: controller.list.bind(controller),
  update: controller.update.bind(controller),
  setStatus: controller.setStatus.bind(controller),
  delete: controller.delete.bind(controller),
};
