/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - STOCK ROUTES
 * File: backend/inventory-service/src/routes/stock.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const stockController = require('../controllers/stock.controller');

// Stock-In (Receipt / Purchase)
router.post(
  '/in',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER', 'KITCHEN_CHEF', 'CHEF'),
  asyncHandler(stockController.stockIn)
);

// Stock-Out (Wastage / Spoilage / Damage)
router.post(
  '/out',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER', 'KITCHEN_CHEF', 'CHEF'),
  asyncHandler(stockController.stockOut)
);

// Stock Adjustment (Physical Count Audit)
router.post(
  '/adjust',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(stockController.stockAdjust)
);

// Inter-Branch Stock Transfer
router.post(
  '/transfer',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(stockController.stockTransfer)
);

module.exports = router;

