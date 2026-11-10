/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/routes/internalRoutes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { serviceAuthMiddleware } = require('@rms/shared');
const internalUserController = require('../controllers/internalUserController');

// Protect all internal endpoints with X-Internal-Service-Key
router.use(serviceAuthMiddleware);

router.post('/create', internalUserController.createUser);
router.post('/lookup', internalUserController.lookupUser);
router.post('/employee-lookup', internalUserController.lookupEmployee);
router.patch('/:id/last-login', internalUserController.updateLastLogin);

module.exports = router;

