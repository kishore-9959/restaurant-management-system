/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CATEGORY ROUTES
 * File: backend/menu-service/src/routes/category.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const categoryController = require('../controllers/category.controller');

// Public / Read-only routes
router.get('/', asyncHandler(categoryController.listCategories.bind(categoryController)));
router.get('/:categoryId', asyncHandler(categoryController.getCategoryById.bind(categoryController)));

// Protected Administrative routes
router.post(
  '/',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(categoryController.createCategory.bind(categoryController))
);

router.put(
  '/:categoryId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(categoryController.updateCategory.bind(categoryController))
);

router.patch(
  '/:categoryId/status',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(categoryController.setCategoryStatus.bind(categoryController))
);

router.delete(
  '/:categoryId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(categoryController.deleteCategory.bind(categoryController))
);

module.exports = router;

