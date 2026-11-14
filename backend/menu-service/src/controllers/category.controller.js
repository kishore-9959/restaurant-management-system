/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CATEGORY CONTROLLER
 * File: backend/menu-service/src/controllers/category.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const categoryService = require('../services/category.service');
const { validateCategoryPayload } = require('../validators');

class CategoryController {
  async createCategory(req, res) {
    const validation = validateCategoryPayload(req.body, false);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid category payload.',
        details: validation.errors,
      });
    }

    try {
      const category = await categoryService.createCategory(req.body);
      return successResponse(res, {
        statusCode: 201,
        message: 'Category created successfully.',
        data: category,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.message.includes('already exists') ? 409 : 500,
        code: error.message.includes('already exists') ? 'CATEGORY_ALREADY_EXISTS' : 'CATEGORY_CREATE_FAILED',
        message: error.message,
      });
    }
  }

  async updateCategory(req, res) {
    const { categoryId } = req.params;
    const validation = validateCategoryPayload(req.body, true);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid category update payload.',
        details: validation.errors,
      });
    }

    try {
      const updated = await categoryService.updateCategory(categoryId, req.body);
      return successResponse(res, {
        message: 'Category updated successfully.',
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'CATEGORY_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  async getCategoryById(req, res) {
    const { categoryId } = req.params;
    try {
      const category = await categoryService.getCategoryById(categoryId);
      return successResponse(res, {
        message: 'Category retrieved successfully.',
        data: category,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'CATEGORY_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  async listCategories(req, res) {
    try {
      const { branchId, includeInactive } = req.query;
      const categories = await categoryService.listCategories(
        branchId ? parseInt(branchId, 10) : null,
        includeInactive === 'true'
      );
      return successResponse(res, {
        message: 'Categories listed successfully.',
        data: categories,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'CATEGORIES_LIST_FAILED',
        message: error.message,
      });
    }
  }

  async setCategoryStatus(req, res) {
    const { categoryId } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined || typeof isActive !== 'boolean') {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Field 'isActive' (boolean) is required in request body.",
      });
    }

    try {
      const updated = await categoryService.setCategoryStatus(categoryId, isActive);
      return successResponse(res, {
        message: `Category status updated to ${isActive ? 'ACTIVE' : 'INACTIVE'}.`,
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'CATEGORY_STATUS_FAILED',
        message: error.message,
      });
    }
  }

  async deleteCategory(req, res) {
    const { categoryId } = req.params;
    try {
      const result = await categoryService.deleteCategory(categoryId);
      return successResponse(res, {
        message: 'Category deleted successfully.',
        data: result,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || (error.message.includes('Cannot delete') ? 409 : 500),
        code: error.code || 'CATEGORY_DELETE_FAILED',
        message: error.message,
      });
    }
  }
}

module.exports = new CategoryController();

