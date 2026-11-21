/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESERVATION CUSTOMER ROUTES
 * File: backend/reservation-service/src/routes/customer.routes.js
 * Ingress Prefix: /api/v1/reservations/my-bookings
 * Description: Authenticated customer routes for managing personal bookings.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware } = require('@rms/shared');
const { reservationController } = require('../controllers');

// All customer routes require authentication
router.use(authenticationMiddleware);

// Customer bookings
router.get('/', (req, res) => reservationController.listMyBookings(req, res));
router.post('/', (req, res) => reservationController.createReservation(req, res));
router.patch('/:id/cancel', (req, res) => reservationController.cancelReservation(req, res));

module.exports = router;

