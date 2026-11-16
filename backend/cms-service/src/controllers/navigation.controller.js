/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NAVIGATION CONTROLLER
 * File: backend/cms-service/src/controllers/navigation.controller.js
 * ============================================================================
 */

const { navigationService } = require('../services');
const { successResponse, asyncHandler } = require('@rms/shared');

const getPublicNavigation = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const navigation = await navigationService.getPublicNavigation(restaurantId);
  return successResponse(res, {
    statusCode: 200,
    message: 'Public navigation retrieved successfully',
    data: navigation,
  });
});

const listNavigationMenus = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const menuLocation = req.query.location || null;
  const menus = await navigationService.listNavigationMenus({ restaurantId, menuLocation });
  return successResponse(res, {
    statusCode: 200,
    message: 'Navigation menus retrieved successfully',
    data: menus,
  });
});

const createNavigationMenu = asyncHandler(async (req, res) => {
  const menu = await navigationService.createNavigationMenu(req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Navigation menu created successfully',
    data: menu,
  });
});

const updateNavigationMenu = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await navigationService.updateNavigationMenu(parseInt(id, 10), req.body);
  return successResponse(res, {
    statusCode: 200,
    message: 'Navigation menu updated successfully',
    data: updated,
  });
});

const deleteNavigationMenu = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await navigationService.deleteNavigationMenu(parseInt(id, 10));
  return successResponse(res, {
    statusCode: 200,
    message: 'Navigation menu deleted successfully',
    data: result,
  });
});

module.exports = {
  getPublicNavigation,
  listNavigationMenus,
  createNavigationMenu,
  updateNavigationMenu,
  deleteNavigationMenu,
};
