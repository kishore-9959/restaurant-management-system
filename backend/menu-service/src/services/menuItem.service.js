/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MENU ITEM SERVICE
 * File: backend/menu-service/src/services/menuItem.service.js
 * Description: Business logic for Menu Items, Variants, Images, Pricing,
 *              Availability ("86" toggle) with automatic Redis cache invalidation.
 * ============================================================================
 */

const { menuItemRepository, addonRepository } = require('../repositories');
const { invalidateBranchMenuCache } = require('../utils/cache');

class MenuItemService {
  async createMenuItem(data) {
    const item = await menuItemRepository.create(data);
    await invalidateBranchMenuCache(data.branchId);
    return item;
  }

  async updateMenuItem(menuItemId, data) {
    const item = await menuItemRepository.update(menuItemId, data);
    if (!item) {
      const error = new Error('Menu item not found.');
      error.statusCode = 404;
      error.code = 'MENU_ITEM_NOT_FOUND';
      throw error;
    }
    await invalidateBranchMenuCache(item.BranchId);
    return item;
  }

  async getMenuItemById(menuItemId) {
    const item = await menuItemRepository.getById(menuItemId);
    if (!item) {
      const error = new Error('Menu item not found.');
      error.statusCode = 404;
      error.code = 'MENU_ITEM_NOT_FOUND';
      throw error;
    }
    return item;
  }

  async listMenuItems(filters) {
    return await menuItemRepository.listByBranch(filters);
  }

  async setMenuItemAvailability(menuItemId, isAvailable) {
    const item = await menuItemRepository.setAvailability(menuItemId, isAvailable);
    if (!item) {
      const error = new Error('Menu item not found.');
      error.statusCode = 404;
      error.code = 'MENU_ITEM_NOT_FOUND';
      throw error;
    }
    await invalidateBranchMenuCache(item.BranchId);
    return item;
  }

  async updatePricing(menuItemId, pricingData) {
    const item = await menuItemRepository.updatePricing(menuItemId, pricingData);
    if (!item) {
      const error = new Error('Menu item not found.');
      error.statusCode = 404;
      error.code = 'MENU_ITEM_NOT_FOUND';
      throw error;
    }
    await invalidateBranchMenuCache(item.BranchId);
    return item;
  }

  async bulkUpdatePricing(updates) {
    if (!Array.isArray(updates) || updates.length === 0) {
      const error = new Error('Updates array must not be empty.');
      error.statusCode = 400;
      error.code = 'INVALID_PAYLOAD';
      throw error;
    }

    const results = [];
    const affectedBranches = new Set();

    for (const update of updates) {
      const item = await menuItemRepository.updatePricing(update.menuItemId, {
        basePrice: update.basePrice,
        costPrice: update.costPrice,
        taxPercentage: update.taxPercentage,
      });
      if (item) {
        results.push(item);
        if (item.BranchId) affectedBranches.add(item.BranchId);
      }
    }

    for (const branchId of affectedBranches) {
      await invalidateBranchMenuCache(branchId);
    }

    return results;
  }

  async deleteMenuItem(menuItemId) {
    const existing = await menuItemRepository.getById(menuItemId);
    if (!existing) {
      const error = new Error('Menu item not found.');
      error.statusCode = 404;
      error.code = 'MENU_ITEM_NOT_FOUND';
      throw error;
    }

    const result = await menuItemRepository.delete(menuItemId);
    await invalidateBranchMenuCache(existing.BranchId);
    return result;
  }

  // --------------------------------------------------------------------------
  // VARIANTS
  // --------------------------------------------------------------------------

  async createVariant(data) {
    const existingItem = await menuItemRepository.getById(data.menuItemId);
    if (!existingItem) {
      const error = new Error('Menu item not found.');
      error.statusCode = 404;
      error.code = 'MENU_ITEM_NOT_FOUND';
      throw error;
    }

    const variant = await menuItemRepository.createVariant(data);
    await invalidateBranchMenuCache(existingItem.BranchId);
    return variant;
  }

  async updateVariant(variantId, data) {
    const variant = await menuItemRepository.updateVariant(variantId, data);
    if (!variant) {
      const error = new Error('Variant not found.');
      error.statusCode = 404;
      error.code = 'VARIANT_NOT_FOUND';
      throw error;
    }

    const item = await menuItemRepository.getById(variant.MenuItemId);
    await invalidateBranchMenuCache(item?.BranchId || null);
    return variant;
  }

  async setVariantAvailability(variantId, isAvailable) {
    const variant = await menuItemRepository.setVariantAvailability(variantId, isAvailable);
    if (!variant) {
      const error = new Error('Variant not found.');
      error.statusCode = 404;
      error.code = 'VARIANT_NOT_FOUND';
      throw error;
    }

    const item = await menuItemRepository.getById(variant.MenuItemId);
    await invalidateBranchMenuCache(item?.BranchId || null);
    return variant;
  }

  async deleteVariant(variantId) {
    const variant = await menuItemRepository.updateVariant(variantId, { variantName: '__check__' }).catch(() => null);
    // Directly delete
    const result = await menuItemRepository.deleteVariant(variantId);
    if (!result) {
      const error = new Error('Variant not found.');
      error.statusCode = 404;
      error.code = 'VARIANT_NOT_FOUND';
      throw error;
    }
    await invalidateBranchMenuCache(null);
    return result;
  }

  async listVariants(menuItemId) {
    return await menuItemRepository.listVariantsByItem(menuItemId);
  }

  // --------------------------------------------------------------------------
  // IMAGES
  // --------------------------------------------------------------------------

  async addImage(data) {
    const existingItem = await menuItemRepository.getById(data.menuItemId);
    if (!existingItem) {
      const error = new Error('Menu item not found.');
      error.statusCode = 404;
      error.code = 'MENU_ITEM_NOT_FOUND';
      throw error;
    }

    const image = await menuItemRepository.addImage(data);
    await invalidateBranchMenuCache(existingItem.BranchId);
    return image;
  }

  async deleteImage(imageId) {
    const result = await menuItemRepository.deleteImage(imageId);
    await invalidateBranchMenuCache(null);
    return result;
  }

  async setImagePrimary(imageId) {
    const image = await menuItemRepository.setImagePrimary(imageId);
    if (!image) {
      const error = new Error('Image not found.');
      error.statusCode = 404;
      error.code = 'IMAGE_NOT_FOUND';
      throw error;
    }
    const item = await menuItemRepository.getById(image.MenuItemId);
    await invalidateBranchMenuCache(item?.BranchId || null);
    return image;
  }

  async listImages(menuItemId) {
    return await menuItemRepository.listImagesByItem(menuItemId);
  }

  // --------------------------------------------------------------------------
  // ADDON GROUP LINKING
  // --------------------------------------------------------------------------

  async linkAddonGroup(menuItemId, addonGroupId, displayOrder = 0) {
    const item = await menuItemRepository.getById(menuItemId);
    if (!item) {
      const error = new Error('Menu item not found.');
      error.statusCode = 404;
      error.code = 'MENU_ITEM_NOT_FOUND';
      throw error;
    }

    const linked = await addonRepository.linkGroupToMenuItem(menuItemId, addonGroupId, displayOrder);
    await invalidateBranchMenuCache(item.BranchId);
    return linked;
  }

  async unlinkAddonGroup(menuItemId, addonGroupId) {
    const item = await menuItemRepository.getById(menuItemId);
    if (!item) {
      const error = new Error('Menu item not found.');
      error.statusCode = 404;
      error.code = 'MENU_ITEM_NOT_FOUND';
      throw error;
    }

    const result = await addonRepository.unlinkGroupFromMenuItem(menuItemId, addonGroupId);
    await invalidateBranchMenuCache(item.BranchId);
    return result;
  }
}

module.exports = new MenuItemService();

