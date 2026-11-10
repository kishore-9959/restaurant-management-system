/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/routes/internalRoutes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { serviceAuthMiddleware } = require('@rms/shared');
const internalAuthController = require('../controllers/internalAuthController');

// All internal routes are protected by X-Internal-Service-Key
router.use(serviceAuthMiddleware);

router.get('/user-roles/:userId', internalAuthController.getUserRoles);
router.post('/assign-role', internalAuthController.assignRole);
router.get('/roles', internalAuthController.getAllRoles);

module.exports = router;

