/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - BRANCH ROUTES
 * File: backend/restaurant-service/src/routes/branch.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branch.controller');
const diningSectionController = require('../controllers/diningSection.controller');
const diningTableController = require('../controllers/diningTable.controller');
const {
  authenticate,
  requireSuperAdmin,
  requireManagerOrAbove,
  requireStaffOrAbove,
} = require('../middleware');

// All branch routes require authentication
router.use(authenticate);

// Branch CRUD
router.post('/', requireSuperAdmin, (req, res) => branchController.createBranch(req, res));
router.get('/', requireManagerOrAbove, (req, res) => branchController.listBranches(req, res));
router.get('/:branchId', requireStaffOrAbove, (req, res) => branchController.getBranchById(req, res));
router.put('/:branchId', requireManagerOrAbove, (req, res) => branchController.updateBranch(req, res));
router.patch('/:branchId/status', requireSuperAdmin, (req, res) => branchController.setBranchStatus(req, res));

// Nested section operations under branch
router.post('/:branchId/sections', requireManagerOrAbove, (req, res) => diningSectionController.createSection(req, res));
router.get('/:branchId/sections', requireStaffOrAbove, (req, res) => diningSectionController.listSectionsByBranch(req, res));

// Nested table & floor operations under branch
router.post('/:branchId/tables', requireManagerOrAbove, (req, res) => diningTableController.createTable(req, res));
router.get('/:branchId/tables', requireStaffOrAbove, (req, res) => diningTableController.listTablesByBranch(req, res));
router.get('/:branchId/tables/available', requireStaffOrAbove, (req, res) => diningTableController.getAvailableTables(req, res));
router.get('/:branchId/tables/occupied', requireStaffOrAbove, (req, res) => diningTableController.getOccupiedTables(req, res));
router.get('/:branchId/floor-plan', requireStaffOrAbove, (req, res) => diningTableController.getFloorLayout(req, res));

module.exports = router;

