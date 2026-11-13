/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - DINING SECTION ROUTES
 * File: backend/restaurant-service/src/routes/diningSection.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const diningSectionController = require('../controllers/diningSection.controller');
const diningTableController = require('../controllers/diningTable.controller');
const {
  authenticate,
  requireManagerOrAbove,
  requireStaffOrAbove,
} = require('../middleware');

router.use(authenticate);

router.post('/', requireManagerOrAbove, (req, res) => diningSectionController.createSection(req, res));
router.get('/', requireStaffOrAbove, (req, res) => diningSectionController.listSectionsByBranch(req, res));
router.get('/:sectionId', requireStaffOrAbove, (req, res) => diningSectionController.getSectionById(req, res));
router.put('/:sectionId', requireManagerOrAbove, (req, res) => diningSectionController.updateSection(req, res));
router.patch('/:sectionId/status', requireManagerOrAbove, (req, res) => diningSectionController.setSectionStatus(req, res));

// Tables in this section
router.get('/:sectionId/tables', requireStaffOrAbove, (req, res) => diningTableController.listTablesBySection(req, res));

module.exports = router;

