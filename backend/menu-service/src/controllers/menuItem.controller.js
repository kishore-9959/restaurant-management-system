/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MENU ITEM CONTROLLER
 * File: backend/menu-service/src/controllers/menuItem.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const menuItemService = require('../services/menuItem.service');
const {
  validateMenuItemPayload,
  validatePricingPayload,
  validateVariantPayload,
} = require('../validators');

class MenuItemController {
  // --------------------------------------------------------------------------
  // MENU ITEMS
  // --------------------------------------------------------------------------

  async createMenuItem(req, res) {
    const validation = validateMenuItemPayload(req.body, false);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid menu item payload.',
        details: validation.errors,
      });
    }

    try {
      const item = await menuItemService.createMenuItem(req.body);
      return successResponse(res, {
        statusCode: 201,
        message: 'Menu item created successfully.',
        data: item,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.message.includes('already exists') ? 409 : 500,
        code: error.message.includes('already exists') ? 'ITEM_CODE_ALREADY_EXISTS' : 'MENU_ITEM_CREATE_FAILED',
        message: error.message,
      });
    }
  }

  async updateMenuItem(req, res) {
    const { menuItemId } = req.params;
    const validation = validateMenuItemPayload(req.body, true);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid menu item update payload.',
        details: validation.errors,
      });
    }

    try {
      const updated = await menuItemService.updateMenuItem(menuItemId, req.body);
      return successResponse(res, {
        message: 'Menu item updated successfully.',
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'MENU_ITEM_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  async getMenuItemById(req, res) {
    const { menuItemId } = req.params;
    try {
      const item = await menuItemService.getMenuItemById(menuItemId);
      return successResponse(res, {
        message: 'Menu item retrieved successfully.',
        data: item,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'MENU_ITEM_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  async listMenuItems(req, res) {
    try {
      const { branchId, categoryId, dietaryType, isFeatured, isAvailable, search, page, limit } = req.query;

      if (!branchId) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: "Query parameter 'branchId' is required.",
        });
      }

      const result = await menuItemService.listMenuItems({
        branchId: parseInt(branchId, 10),
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        dietaryType,
        isFeatured: isFeatured !== undefined ? isFeatured === 'true' : null,
        isAvailable: isAvailable !== undefined ? isAvailable === 'true' : null,
        search,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50,
      });

      return successResponse(res, {
        message: 'Menu items listed successfully.',
        data: result.items,
        meta: result.pagination,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'MENU_ITEMS_LIST_FAILED',
        message: error.message,
      });
    }
  }

  async setMenuItemAvailability(req, res) {
    const { menuItemId } = req.params;
    const { isAvailable } = req.body;

    if (isAvailable === undefined || typeof isAvailable !== 'boolean') {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Field 'isAvailable' (boolean) is required in request body.",
      });
    }

    try {
      const updated = await menuItemService.setMenuItemAvailability(menuItemId, isAvailable);
      return successResponse(res, {
        message: `Menu item availability set to ${isAvailable ? 'AVAILABLE (In Stock)' : '86 (OUT OF STOCK)'}.`,
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'AVAILABILITY_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  async updatePricing(req, res) {
    const { menuItemId } = req.params;
    const validation = validatePricingPayload(req.body);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid pricing payload.',
        details: validation.errors,
      });
    }

    try {
      const updated = await menuItemService.updatePricing(menuItemId, req.body);
      return successResponse(res, {
        message: 'Menu item pricing updated successfully.',
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'PRICING_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  async bulkUpdatePricing(req, res) {
    const { updates } = req.body;
    try {
      const updated = await menuItemService.bulkUpdatePricing(updates);
      return successResponse(res, {
        message: `Bulk pricing updated for ${updated.length} items.`,
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'BULK_PRICING_FAILED',
        message: error.message,
      });
    }
  }

  async deleteMenuItem(req, res) {
    const { menuItemId } = req.params;
    try {
      const result = await menuItemService.deleteMenuItem(menuItemId);
      return successResponse(res, {
        message: 'Menu item deleted successfully.',
        data: result,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'MENU_ITEM_DELETE_FAILED',
        message: error.message,
      });
    }
  }

  // --------------------------------------------------------------------------
  // VARIANTS
  // --------------------------------------------------------------------------

  async createVariant(req, res) {
    const { menuItemId } = req.params;
    const payload = { ...req.body, menuItemId: parseInt(menuItemId, 10) };
    const validation = validateVariantPayload(payload, false);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid variant payload.',
        details: validation.errors,
      });
    }

    try {
      const variant = await menuItemService.createVariant(payload);
      return successResponse(res, {
        statusCode: 201,
        message: 'Variant created successfully.',
        data: variant,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'VARIANT_CREATE_FAILED',
        message: error.message,
      });
    }
  }

  async updateVariant(req, res) {
    const { variantId } = req.params;
    const validation = validateVariantPayload(req.body, true);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid variant update payload.',
        details: validation.errors,
      });
    }

    try {
      const updated = await menuItemService.updateVariant(variantId, req.body);
      return successResponse(res, {
        message: 'Variant updated successfully.',
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'VARIANT_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  async setVariantAvailability(req, res) {
    const { variantId } = req.params;
    const { isAvailable } = req.body;

    if (isAvailable === undefined || typeof isAvailable !== 'boolean') {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Field 'isAvailable' (boolean) is required in request body.",
      });
    }

    try {
      const updated = await menuItemService.setVariantAvailability(variantId, isAvailable);
      return successResponse(res, {
        message: `Variant availability set to ${isAvailable ? 'AVAILABLE' : '86 (OUT OF STOCK)'}.`,
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'VARIANT_AVAILABILITY_FAILED',
        message: error.message,
      });
    }
  }

  async deleteVariant(req, res) {
    const { variantId } = req.params;
    try {
      const result = await menuItemService.deleteVariant(variantId);
      return successResponse(res, {
        message: 'Variant deleted successfully.',
        data: result,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'VARIANT_DELETE_FAILED',
        message: error.message,
      });
    }
  }

  async listVariants(req, res) {
    const { menuItemId } = req.params;
    try {
      const variants = await menuItemService.listVariants(menuItemId);
      return successResponse(res, {
        message: 'Variants listed successfully.',
        data: variants,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'VARIANTS_LIST_FAILED',
        message: error.message,
      });
    }
  }

  // --------------------------------------------------------------------------
  // IMAGES
  // --------------------------------------------------------------------------

  async addImage(req, res) {
    const { menuItemId } = req.params;
    const { imageUrl, isPrimary, displayOrder } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Field 'imageUrl' is required.",
      });
    }

    try {
      const image = await menuItemService.addImage({
        menuItemId: parseInt(menuItemId, 10),
        imageUrl,
        isPrimary: isPrimary === true,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : 0,
      });
      return successResponse(res, {
        statusCode: 201,
        message: 'Image added successfully.',
        data: image,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'IMAGE_ADD_FAILED',
        message: error.message,
      });
    }
  }

  async deleteImage(req, res) {
    const { imageId } = req.params;
    try {
      const result = await menuItemService.deleteImage(imageId);
      return successResponse(res, {
        message: 'Image deleted successfully.',
        data: result,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'IMAGE_DELETE_FAILED',
        message: error.message,
      });
    }
  }

  async setImagePrimary(req, res) {
    const { imageId } = req.params;
    try {
      const image = await menuItemService.setImagePrimary(imageId);
      return successResponse(res, {
        message: 'Image set as primary.',
        data: image,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'SET_PRIMARY_IMAGE_FAILED',
        message: error.message,
      });
    }
  }

  async listImages(req, res) {
    const { menuItemId } = req.params;
    try {
      const images = await menuItemService.listImages(menuItemId);
      return successResponse(res, {
        message: 'Images listed successfully.',
        data: images,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'IMAGES_LIST_FAILED',
        message: error.message,
      });
    }
  }

  // --------------------------------------------------------------------------
  // ADDON GROUP LINKING
  // --------------------------------------------------------------------------

  async linkAddonGroup(req, res) {
    const { menuItemId, addonGroupId } = req.params;
    const { displayOrder } = req.body;

    try {
      const linked = await menuItemService.linkAddonGroup(menuItemId, addonGroupId, displayOrder);
      return successResponse(res, {
        message: 'Addon group linked to menu item successfully.',
        data: linked,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'LINK_ADDON_GROUP_FAILED',
        message: error.message,
      });
    }
  }

  async unlinkAddonGroup(req, res) {
    const { menuItemId, addonGroupId } = req.params;
    try {
      const result = await menuItemService.unlinkAddonGroup(menuItemId, addonGroupId);
      return successResponse(res, {
        message: 'Addon group unlinked from menu item successfully.',
        data: result,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'UNLINK_ADDON_GROUP_FAILED',
        message: error.message,
      });
    }
  }
}

module.exports = new MenuItemController();

