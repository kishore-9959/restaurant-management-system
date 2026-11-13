/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESTAURANT ROUTES
 * File: backend/restaurant-service/src/routes/restaurant.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurant.controller');
const branchController = require('../controllers/branch.controller');
const { authenticate, requireSuperAdmin, requireManagerOrAbove } = require('../middleware');

// All restaurant management routes require authentication
router.use(authenticate);

// Super admin restaurant operations
router.post('/', requireSuperAdmin, (req, res) => restaurantController.createRestaurant(req, res));
router.get('/', requireManagerOrAbove, (req, res) => restaurantController.listRestaurants(req, res));
router.get('/:restaurantId', requireManagerOrAbove, (req, res) => restaurantController.getRestaurantById(req, res));
router.put('/:restaurantId', requireSuperAdmin, (req, res) => restaurantController.updateRestaurant(req, res));
router.patch('/:restaurantId/status', requireSuperAdmin, (req, res) => restaurantController.setRestaurantStatus(req, res));

// Nested branch creation/listing under restaurant
router.post('/:restaurantId/branches', requireSuperAdmin, (req, res) => branchController.createBranch(req, res));
router.get('/:restaurantId/branches', requireManagerOrAbove, (req, res) => branchController.listBranches(req, res));

module.exports = router;

