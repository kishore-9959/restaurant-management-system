/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/routes/staffRoutes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticate, requireRole } = require('../middleware/userAuthGuard');

router.use(authenticate);

// Staff management operations require SUPER_ADMIN or RESTAURANT_MANAGER
router.post('/', requireRole('SUPER_ADMIN', 'RESTAURANT_MANAGER'), staffController.createStaff);
router.get('/', requireRole('SUPER_ADMIN', 'RESTAURANT_MANAGER'), staffController.listStaff);
router.get('/:id', requireRole('SUPER_ADMIN', 'RESTAURANT_MANAGER'), staffController.getStaff);
router.put('/:id', requireRole('SUPER_ADMIN', 'RESTAURANT_MANAGER'), staffController.updateStaff);
router.patch('/:id/status', requireRole('SUPER_ADMIN', 'RESTAURANT_MANAGER'), staffController.updateStaffStatus);

module.exports = router;

