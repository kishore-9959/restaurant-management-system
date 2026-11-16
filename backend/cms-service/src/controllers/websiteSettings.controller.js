/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - WEBSITE SETTINGS CONTROLLER
 * File: backend/cms-service/src/controllers/websiteSettings.controller.js
 * ============================================================================
 */

const { websiteSettingsService } = require('../services');
const { successResponse, asyncHandler } = require('@rms/shared');

const getSettings = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : null;
  const settings = await websiteSettingsService.getPublicSettings({ restaurantId, branchId });
  return successResponse(res, {
    statusCode: 200,
    message: 'Website settings retrieved successfully',
    data: settings,
  });
});

const updateSettings = asyncHandler(async (req, res) => {
  const data = req.body;
  const updated = await websiteSettingsService.updateSettings(data);
  return successResponse(res, {
    statusCode: 200,
    message: 'Website settings updated successfully',
    data: updated,
  });
});

module.exports = {
  getSettings,
  updateSettings,
};
