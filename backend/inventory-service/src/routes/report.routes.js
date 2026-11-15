/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT ROUTES
 * File: backend/inventory-service/src/routes/report.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const reportController = require('../controllers/report.controller');

// Inventory Asset Valuation Report
router.get(
  '/valuation',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(reportController.getValuationReport)
);

// Consumption and Wastage Summary Report
router.get(
  ['/consumption-summary', '/consumption'],
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  asyncHandler(reportController.getConsumptionReport)
);

module.exports = router;
