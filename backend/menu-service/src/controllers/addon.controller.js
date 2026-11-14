/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ADDON CONTROLLER
 * File: backend/menu-service/src/controllers/addon.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const addonService = require('../services/addon.service');
const { validateAddonGroupPayload, validateAddonItemPayload } = require('../validators');

class AddonController {
  // --------------------------------------------------------------------------
  // ADDON GROUPS
  // --------------------------------------------------------------------------

  async createGroup(req, res) {
    const validation = validateAddonGroupPayload(req.body, false);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid addon group payload.',
        details: validation.errors,
      });
    }

    try {
      const group = await addonService.createGroup(req.body);
      return successResponse(res, {
        statusCode: 201,
        message: 'Addon group created successfully.',
        data: group,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ADDON_GROUP_CREATE_FAILED',
        message: error.message,
      });
    }
  }

  async updateGroup(req, res) {
    const { addonGroupId } = req.params;
    const validation = validateAddonGroupPayload(req.body, true);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid addon group update payload.',
        details: validation.errors,
      });
    }

    try {
      const updated = await addonService.updateGroup(addonGroupId, req.body);
      return successResponse(res, {
        message: 'Addon group updated successfully.',
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ADDON_GROUP_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  async getGroupById(req, res) {
    const { addonGroupId } = req.params;
    try {
      const group = await addonService.getGroupById(addonGroupId);
      return successResponse(res, {
        message: 'Addon group retrieved successfully.',
        data: group,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ADDON_GROUP_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  async listGroups(req, res) {
    try {
      const { branchId } = req.query;
      const groups = await addonService.listGroups(branchId ? parseInt(branchId, 10) : null);
      return successResponse(res, {
        message: 'Addon groups listed successfully.',
        data: groups,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'ADDON_GROUPS_LIST_FAILED',
        message: error.message,
      });
    }
  }

  // --------------------------------------------------------------------------
  // ADDON ITEMS
  // --------------------------------------------------------------------------

  async createItem(req, res) {
    const { addonGroupId } = req.params;
    const payload = { ...req.body, addonGroupId: parseInt(addonGroupId, 10) };
    const validation = validateAddonItemPayload(payload, false);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid addon item payload.',
        details: validation.errors,
      });
    }

    try {
      const item = await addonService.createItem(payload);
      return successResponse(res, {
        statusCode: 201,
        message: 'Addon item created successfully.',
        data: item,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ADDON_ITEM_CREATE_FAILED',
        message: error.message,
      });
    }
  }

  async updateItem(req, res) {
    const { addonItemId } = req.params;
    const validation = validateAddonItemPayload(req.body, true);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid addon item update payload.',
        details: validation.errors,
      });
    }

    try {
      const updated = await addonService.updateItem(addonItemId, req.body);
      return successResponse(res, {
        message: 'Addon item updated successfully.',
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ADDON_ITEM_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  async setItemAvailability(req, res) {
    const { addonItemId } = req.params;
    const { isAvailable } = req.body;

    if (isAvailable === undefined || typeof isAvailable !== 'boolean') {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Field 'isAvailable' (boolean) is required in request body.",
      });
    }

    try {
      const updated = await addonService.setItemAvailability(addonItemId, isAvailable);
      return successResponse(res, {
        message: `Addon item availability set to ${isAvailable ? 'AVAILABLE' : '86 (OUT OF STOCK)'}.`,
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ADDON_ITEM_AVAILABILITY_FAILED',
        message: error.message,
      });
    }
  }

  async deleteItem(req, res) {
    const { addonItemId } = req.params;
    try {
      const result = await addonService.deleteItem(addonItemId);
      return successResponse(res, {
        message: 'Addon item deleted successfully.',
        data: result,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ADDON_ITEM_DELETE_FAILED',
        message: error.message,
      });
    }
  }
}

module.exports = new AddonController();

