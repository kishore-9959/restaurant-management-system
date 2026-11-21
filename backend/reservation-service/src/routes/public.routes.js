/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESERVATION PUBLIC ROUTES
 * File: backend/reservation-service/src/routes/public.routes.js
 * Ingress Prefix: /api/v1/reservations/public
 * Description: Unauthenticated routes for customer self-service table booking,
 *              slot calculation, availability discovery, and reference lookup.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { reservationController } = require('../controllers');

// Dynamic availability and slots
router.get('/branches/:branchId/availability', (req, res) => reservationController.checkAvailability(req, res));
router.get('/branches/:branchId/slots', (req, res) => reservationController.getTimeSlots(req, res));

// Booking creation
router.post('/book', (req, res) => reservationController.createReservation(req, res));

// Booking lookup and cancellation by guest
router.get('/lookup', (req, res) => reservationController.publicLookup(req, res));
router.post('/:id/cancel', (req, res) => reservationController.cancelReservation(req, res));

module.exports = router;

