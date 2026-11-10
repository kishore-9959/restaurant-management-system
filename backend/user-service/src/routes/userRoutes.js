/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/routes/userRoutes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/userAuthGuard');

router.use(authenticate);

// User administration
router.get('/', requireRole('SUPER_ADMIN', 'RESTAURANT_MANAGER'), userController.listUsers);
router.get('/:id', userController.getUser);
router.patch('/:id/status', requireRole('SUPER_ADMIN'), userController.updateUserStatus);

module.exports = router;

