/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - BOM ROUTES
 * File: backend/inventory-service/src/routes/bom.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const bomController = require('../controllers/bom.controller');

// BOM Availability Check (Pre-order check)
router.post(
  '/check',
  authenticationMiddleware,
  asyncHandler(bomController.check)
);

// Order Saga Stock Depletion (Internal Mesh or Manager)
router.post(
  '/deplete',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER', 'SYSTEM'),
  asyncHandler(bomController.deplete)
);

// Order Saga Stock Restitution (Internal Mesh or Manager)
router.post(
  '/restitute',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER', 'SYSTEM'),
  asyncHandler(bomController.restitute)
);

module.exports = router;

