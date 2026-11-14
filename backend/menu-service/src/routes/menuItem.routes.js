/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MENU ITEM ROUTES
 * File: backend/menu-service/src/routes/menuItem.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const menuItemController = require('../controllers/menuItem.controller');

// ----------------------------------------------------------------------------
// BULK PRICING (Must precede parameterized routes)
// ----------------------------------------------------------------------------
router.post(
  '/pricing/bulk',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(menuItemController.bulkUpdatePricing.bind(menuItemController))
);

// ----------------------------------------------------------------------------
// VARIANTS DIRECT ROUTING (Update, Toggle Availability, Delete)
// ----------------------------------------------------------------------------
router.put(
  '/variants/:variantId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(menuItemController.updateVariant.bind(menuItemController))
);

router.patch(
  '/variants/:variantId/availability',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER', 'KITCHEN_CHEF', 'CASHIER_POS'),
  asyncHandler(menuItemController.setVariantAvailability.bind(menuItemController))
);

router.delete(
  '/variants/:variantId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(menuItemController.deleteVariant.bind(menuItemController))
);

// ----------------------------------------------------------------------------
// IMAGES DIRECT ROUTING (Set Primary, Delete)
// ----------------------------------------------------------------------------
router.patch(
  '/images/:imageId/primary',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(menuItemController.setImagePrimary.bind(menuItemController))
);

router.delete(
  '/images/:imageId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(menuItemController.deleteImage.bind(menuItemController))
);

// ----------------------------------------------------------------------------
// MENU ITEMS CRUD
// ----------------------------------------------------------------------------
router.get('/', asyncHandler(menuItemController.listMenuItems.bind(menuItemController)));
router.get('/:menuItemId', asyncHandler(menuItemController.getMenuItemById.bind(menuItemController)));

router.post(
  '/',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(menuItemController.createMenuItem.bind(menuItemController))
);

router.put(
  '/:menuItemId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(menuItemController.updateMenuItem.bind(menuItemController))
);

router.patch(
  '/:menuItemId/availability',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER', 'KITCHEN_CHEF', 'CASHIER_POS'),
  asyncHandler(menuItemController.setMenuItemAvailability.bind(menuItemController))
);

router.patch(
  '/:menuItemId/pricing',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(menuItemController.updatePricing.bind(menuItemController))
);

router.delete(
  '/:menuItemId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(menuItemController.deleteMenuItem.bind(menuItemController))
);

// ----------------------------------------------------------------------------
// ITEM SUB-RESOURCES (Variants, Images, Addon Group Links)
// ----------------------------------------------------------------------------
router.get('/:menuItemId/variants', asyncHandler(menuItemController.listVariants.bind(menuItemController)));
router.post(
  '/:menuItemId/variants',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(menuItemController.createVariant.bind(menuItemController))
);

router.get('/:menuItemId/images', asyncHandler(menuItemController.listImages.bind(menuItemController)));
router.post(
  '/:menuItemId/images',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(menuItemController.addImage.bind(menuItemController))
);

router.post(
  '/:menuItemId/addons/:addonGroupId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(menuItemController.linkAddonGroup.bind(menuItemController))
);

router.delete(
  '/:menuItemId/addons/:addonGroupId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(menuItemController.unlinkAddonGroup.bind(menuItemController))
);

module.exports = router;

