/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - INGREDIENT ROUTES
 * File: backend/inventory-service/src/routes/ingredient.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const ingredientController = require('../controllers/ingredient.controller');

// CRUD endpoints for raw ingredients
router.post(
  '/',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(ingredientController.create)
);

router.get(
  '/',
  authenticationMiddleware,
  asyncHandler(ingredientController.list)
);

router.get(
  '/:id',
  authenticationMiddleware,
  asyncHandler(ingredientController.getById)
);

router.put(
  '/:id',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(ingredientController.update)
);

router.patch(
  '/:id/status',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(ingredientController.setStatus)
);

router.delete(
  '/:id',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(ingredientController.delete)
);

module.exports = router;

