/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/routes/customerRoutes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate } = require('../middleware/userAuthGuard');

router.use(authenticate);

// Profile
router.get('/profile', customerController.getProfile);
router.put('/profile', customerController.updateProfile);

// Addresses
router.get('/addresses', customerController.getAddresses);
router.post('/addresses', customerController.createAddress);
router.put('/addresses/:id', customerController.updateAddress);
router.delete('/addresses/:id', customerController.deleteAddress);
router.patch('/addresses/:id/default', customerController.setDefaultAddress);

module.exports = router;

