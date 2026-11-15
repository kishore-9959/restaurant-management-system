/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RECIPE ROUTES
 * File: backend/inventory-service/src/routes/recipe.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const recipeController = require('../controllers/recipe.controller');

// Recipe BOM management
router.post(
  '/',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER', 'KITCHEN_CHEF', 'CHEF'),
  asyncHandler(recipeController.createOrUpdate)
);

router.get(
  ['/menu-item/:menuItemId', '/:menuItemId'],
  authenticationMiddleware,
  asyncHandler(recipeController.getByMenuItem)
);

router.delete(
  '/:recipeId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(recipeController.delete)
);

module.exports = router;
