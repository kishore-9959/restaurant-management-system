/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PUBLIC MENU ROUTES
 * File: backend/menu-service/src/routes/publicMenu.routes.js
 * Description: Unauthenticated customer menu endpoints with Redis caching.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const publicMenuController = require('../controllers/publicMenu.controller');

// Customer catalog with Redis caching
router.get('/catalog/:branchId', asyncHandler(publicMenuController.getCatalog.bind(publicMenuController)));

// Customer categories
router.get('/categories/:branchId?', asyncHandler(publicMenuController.getCategories.bind(publicMenuController)));

// Customer item details lookup
router.get('/items/:menuItemId', asyncHandler(publicMenuController.getItemDetails.bind(publicMenuController)));

// Admin manual cache purge
router.post(
  '/cache/purge',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(publicMenuController.purgeCache.bind(publicMenuController))
);

module.exports = router;

