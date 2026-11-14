/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ADDON SERVICE
 * File: backend/menu-service/src/services/addon.service.js
 * Description: Business logic for Addon Groups and Addon Items with Redis cache invalidation.
 * ============================================================================
 */

const { addonRepository } = require('../repositories');
const { invalidateBranchMenuCache } = require('../utils/cache');

class AddonService {
  // --------------------------------------------------------------------------
  // ADDON GROUPS
  // --------------------------------------------------------------------------

  async createGroup(data) {
    const group = await addonRepository.createGroup(data);
    await invalidateBranchMenuCache(data.branchId || null);
    return group;
  }

  async updateGroup(addonGroupId, data) {
    const group = await addonRepository.updateGroup(addonGroupId, data);
    if (!group) {
      const error = new Error('Addon group not found.');
      error.statusCode = 404;
      error.code = 'ADDON_GROUP_NOT_FOUND';
      throw error;
    }
    await invalidateBranchMenuCache(group.BranchId || null);
    return group;
  }

  async getGroupById(addonGroupId) {
    const group = await addonRepository.getGroupById(addonGroupId);
    if (!group) {
      const error = new Error('Addon group not found.');
      error.statusCode = 404;
      error.code = 'ADDON_GROUP_NOT_FOUND';
      throw error;
    }
    return group;
  }

  async listGroups(branchId = null) {
    return await addonRepository.listGroupsByBranch(branchId);
  }

  // --------------------------------------------------------------------------
  // ADDON ITEMS
  // --------------------------------------------------------------------------

  async createItem(data) {
    const group = await addonRepository.getGroupById(data.addonGroupId);
    if (!group) {
      const error = new Error('Addon group not found.');
      error.statusCode = 404;
      error.code = 'ADDON_GROUP_NOT_FOUND';
      throw error;
    }

    const item = await addonRepository.createItem(data);
    await invalidateBranchMenuCache(group.BranchId || null);
    return item;
  }

  async updateItem(addonItemId, data) {
    const item = await addonRepository.updateItem(addonItemId, data);
    if (!item) {
      const error = new Error('Addon item not found.');
      error.statusCode = 404;
      error.code = 'ADDON_ITEM_NOT_FOUND';
      throw error;
    }
    await invalidateBranchMenuCache(null);
    return item;
  }

  async setItemAvailability(addonItemId, isAvailable) {
    const item = await addonRepository.setItemAvailability(addonItemId, isAvailable);
    if (!item) {
      const error = new Error('Addon item not found.');
      error.statusCode = 404;
      error.code = 'ADDON_ITEM_NOT_FOUND';
      throw error;
    }
    await invalidateBranchMenuCache(null);
    return item;
  }

  async deleteItem(addonItemId) {
    const result = await addonRepository.deleteItem(addonItemId);
    if (!result) {
      const error = new Error('Addon item not found.');
      error.statusCode = 404;
      error.code = 'ADDON_ITEM_NOT_FOUND';
      throw error;
    }
    await invalidateBranchMenuCache(null);
    return result;
  }
}

module.exports = new AddonService();

