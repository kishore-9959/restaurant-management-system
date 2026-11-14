/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PUBLIC MENU CONTROLLER
 * File: backend/menu-service/src/controllers/publicMenu.controller.js
 * Description: Customer-facing endpoints with Redis catalog caching.
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const catalogService = require('../services/catalog.service');
const categoryService = require('../services/category.service');
const menuItemService = require('../services/menuItem.service');

class PublicMenuController {
  /**
   * Public branch catalog with Redis caching
   * GET /public/catalog/:branchId
   */
  async getCatalog(req, res) {
    const { branchId } = req.params;
    const { categoryId } = req.query;

    if (!branchId || isNaN(parseInt(branchId, 10))) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Parameter 'branchId' is required and must be an integer.",
      });
    }

    try {
      const catalog = await catalogService.getBranchCatalog(branchId, categoryId);
      res.setHeader('X-Cache-Status', catalog._cache || 'MISS');

      return successResponse(res, {
        message: `Menu catalog for branch ${branchId} retrieved successfully.`,
        data: catalog,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.message.includes('not found') ? 404 : 500,
        code: 'CATALOG_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * Public categories list
   * GET /public/categories/:branchId?
   */
  async getCategories(req, res) {
    const { branchId } = req.params;
    try {
      const categories = await categoryService.listCategories(
        branchId ? parseInt(branchId, 10) : null,
        false // Only active categories for public
      );
      return successResponse(res, {
        message: 'Active menu categories retrieved successfully.',
        data: categories,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'CATEGORIES_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * Public menu item detail lookup
   * GET /public/items/:menuItemId
   */
  async getItemDetails(req, res) {
    const { menuItemId } = req.params;
    try {
      const item = await menuItemService.getMenuItemById(menuItemId);
      if (!item.IsAvailable) {
        return errorResponse(res, {
          statusCode: 404,
          code: 'ITEM_NOT_AVAILABLE',
          message: 'This menu item is currently 86 (Out of Stock).',
        });
      }

      return successResponse(res, {
        message: 'Menu item details retrieved successfully.',
        data: item,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ITEM_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * Administrative purge of Redis catalog cache
   * POST /admin/cache/purge
   */
  async purgeCache(req, res) {
    const { branchId } = req.body;
    try {
      const result = await catalogService.purgeCatalogCache(branchId);
      return successResponse(res, {
        message: 'Redis menu catalog cache purged successfully.',
        data: result,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'CACHE_PURGE_FAILED',
        message: error.message,
      });
    }
  }
}

module.exports = new PublicMenuController();

