/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ADDON ROUTES
 * File: backend/menu-service/src/routes/addon.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const addonController = require('../controllers/addon.controller');

// ----------------------------------------------------------------------------
// ADDON GROUPS
// ----------------------------------------------------------------------------
router.get('/groups', asyncHandler(addonController.listGroups.bind(addonController)));
router.get('/groups/:addonGroupId', asyncHandler(addonController.getGroupById.bind(addonController)));

router.post(
  '/groups',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(addonController.createGroup.bind(addonController))
);

router.put(
  '/groups/:addonGroupId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(addonController.updateGroup.bind(addonController))
);

// ----------------------------------------------------------------------------
// ADDON ITEMS
// ----------------------------------------------------------------------------
router.post(
  '/groups/:addonGroupId/items',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(addonController.createItem.bind(addonController))
);

router.put(
  '/items/:addonItemId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(addonController.updateItem.bind(addonController))
);

router.patch(
  '/items/:addonItemId/availability',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER', 'KITCHEN_CHEF', 'CASHIER_POS'),
  asyncHandler(addonController.setItemAvailability.bind(addonController))
);

router.delete(
  '/items/:addonItemId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(addonController.deleteItem.bind(addonController))
);

module.exports = router;

