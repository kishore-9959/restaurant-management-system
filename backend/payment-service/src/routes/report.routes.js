/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT ROUTES
 * File: backend/payment-service/src/routes/report.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const { reconciliationController } = require('../controllers');

// Financial Reconciliation Summary
router.get(
  ['/reports/reconciliation', '/api/v1/payments/reports/reconciliation'],
  authenticationMiddleware,
  requireRoles('RESTAURANT_MANAGER', 'SUPER_ADMIN'),
  asyncHandler(reconciliationController.getReport.bind(reconciliationController))
);

module.exports = router;

