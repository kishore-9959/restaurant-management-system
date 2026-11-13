/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - DINING TABLE & FLOOR ROUTES
 * File: backend/restaurant-service/src/routes/diningTable.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const diningTableController = require('../controllers/diningTable.controller');
const {
  authenticate,
  requireManagerOrAbove,
  requireStaffOrAbove,
} = require('../middleware');

// 1. Public route: QR code scan lookup for customer self-ordering
router.get('/qr/:qrCodeHash', (req, res) => diningTableController.getTableByQrHash(req, res));

// 2. All other routes require authentication
router.use(authenticate);

// Global table endpoints
router.post('/', requireManagerOrAbove, (req, res) => diningTableController.createTable(req, res));
router.get('/', requireStaffOrAbove, (req, res) => diningTableController.listTablesByBranch(req, res));
router.get('/available', requireStaffOrAbove, (req, res) => diningTableController.getAvailableTables(req, res));
router.get('/occupied', requireStaffOrAbove, (req, res) => diningTableController.getOccupiedTables(req, res));
router.get('/floor-plan', requireStaffOrAbove, (req, res) => diningTableController.getFloorLayout(req, res));

// Single table operations
router.get('/:tableId', requireStaffOrAbove, (req, res) => diningTableController.getTableById(req, res));
router.put('/:tableId', requireManagerOrAbove, (req, res) => diningTableController.updateTable(req, res));
router.patch('/:tableId/capacity', requireManagerOrAbove, (req, res) => diningTableController.updateTableCapacity(req, res));
router.patch('/:tableId/status', requireStaffOrAbove, (req, res) => diningTableController.updateTableStatus(req, res));
router.delete('/:tableId', requireManagerOrAbove, (req, res) => diningTableController.deleteTable(req, res));

module.exports = router;

