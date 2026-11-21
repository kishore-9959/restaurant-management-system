/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT ROUTES
 * File: backend/report-service/src/routes/report.routes.js
 * Ingress Prefix: /api/v1/reports
 * Description: Master reporting and executive analytics routes.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles } = require('@rms/shared');
const { reportController } = require('../controllers');

// All reporting endpoints require authentication and staff manager / admin role
router.use(authenticationMiddleware);
router.use(requireRoles(['SUPER_ADMIN', 'RESTAURANT_MANAGER']));

// 1. Executive Dashboard
router.get('/dashboard/summary', (req, res, next) => reportController.getDashboardSummary(req, res, next));
router.get('/dashboard/sales-overview', (req, res, next) => reportController.getSalesDaily(req, res, next));
router.get('/dashboard/order-overview', (req, res, next) => reportController.getOrdersSummary(req, res, next));
router.get('/dashboard/revenue-overview', (req, res, next) => reportController.getRevenueSummary(req, res, next));

// 2. Sales Reports
router.get('/sales/daily', (req, res, next) => reportController.getSalesDaily(req, res, next));
router.get('/sales/monthly', (req, res, next) => reportController.getSalesMonthly(req, res, next));
router.get('/sales/trends', (req, res, next) => reportController.getSalesTrends(req, res, next));
router.get('/sales/branches', requireRoles(['SUPER_ADMIN']), (req, res, next) => reportController.getSalesByBranch(req, res, next));
router.get('/sales/restaurants', requireRoles(['SUPER_ADMIN']), (req, res, next) => reportController.getSalesByRestaurant(req, res, next));
router.get('/sales/items', (req, res, next) => reportController.getSalesByItem(req, res, next));
router.get('/sales/categories', (req, res, next) => reportController.getSalesByCategory(req, res, next));

// 3. Revenue & Reconciliation Reports
router.get('/revenue/summary', (req, res, next) => reportController.getRevenueSummary(req, res, next));
router.get('/revenue/payment-methods', (req, res, next) => reportController.getRevenueByPaymentMethod(req, res, next));
router.get('/revenue/refunds', (req, res, next) => reportController.getRevenueRefunds(req, res, next));

// 4. Order Reports
router.get('/orders/summary', (req, res, next) => reportController.getOrdersSummary(req, res, next));
router.get('/orders/trends', (req, res, next) => reportController.getSalesTrends(req, res, next));
router.get('/orders/peak-hours', (req, res, next) => reportController.getOrdersPeakHours(req, res, next));
router.get('/orders/top-items', (req, res, next) => reportController.getTopSellingItems(req, res, next));

// 5. Inventory Reports
router.get('/inventory/summary', (req, res, next) => reportController.getInventoryCurrentStock(req, res, next));
router.get('/inventory/low-stock', (req, res, next) => reportController.getInventoryLowStock(req, res, next));
router.get('/inventory/transactions', (req, res, next) => reportController.getInventoryTransactions(req, res, next));
router.get('/inventory/valuation', (req, res, next) => reportController.getInventoryValuation(req, res, next));
router.get('/inventory/consumption', (req, res, next) => reportController.getInventoryConsumption(req, res, next));

// 6. Reservation Reports
router.get('/reservations/summary', (req, res, next) => reportController.getReservationSummary(req, res, next));
router.get('/reservations/trends', (req, res, next) => reportController.getReservationTrends(req, res, next));

// 7. Customer Analytics
router.get('/customers/summary', (req, res, next) => reportController.getCustomerAnalytics(req, res, next));
router.get('/customers/top-customers', requireRoles(['SUPER_ADMIN']), (req, res, next) => reportController.getCustomerTopSpenders(req, res, next));

// 8. Performance Scorecards
router.get('/branches/performance', requireRoles(['SUPER_ADMIN']), (req, res, next) => reportController.getBranchPerformance(req, res, next));
router.get('/restaurants/performance', requireRoles(['SUPER_ADMIN']), (req, res, next) => reportController.getRestaurantPerformance(req, res, next));

// 9. File Exports (Excel, CSV, PDF)
router.get('/export/:reportType', (req, res, next) => reportController.exportReport(req, res, next));

module.exports = router;

