/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/routes/authRoutes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public routes with rate limiting
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/staff-login', authRateLimiter, authController.staffLogin);
router.post('/pos-pin-login', authRateLimiter, authController.posPinLogin);
router.post('/refresh-token', authRateLimiter, authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me/roles', authenticateToken, authController.getMyRoles);

module.exports = router;

