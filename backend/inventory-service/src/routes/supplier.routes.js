/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SUPPLIER ROUTES
 * File: backend/inventory-service/src/routes/supplier.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const supplierController = require('../controllers/supplier.controller');

// CRUD endpoints for raw material suppliers/vendors
router.post(
  '/',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(supplierController.create)
);

router.get(
  '/',
  authenticationMiddleware,
  asyncHandler(supplierController.list)
);

router.get(
  '/:id',
  authenticationMiddleware,
  asyncHandler(supplierController.getById)
);

router.put(
  '/:id',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(supplierController.update)
);

router.delete(
  '/:id',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(supplierController.delete)
);

module.exports = router;

