/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESERVATION ADMIN & STAFF ROUTES
 * File: backend/reservation-service/src/routes/admin.routes.js
 * Ingress Prefix: /api/v1/reservations
 * Description: Staff, hostess, and manager operations for reservation management,
 *              walk-in seating, table allocation, status transitions, timeline,
 *              and automated no-show cleanup.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles } = require('@rms/shared');
const { reservationController } = require('../controllers');

// All staff endpoints require authentication
router.use(authenticationMiddleware);
router.use(requireRoles(['SUPER_ADMIN', 'RESTAURANT_MANAGER', 'WAITSTAFF', 'HOSTESS', 'CASHIER_POS']));

// Operational queries
router.get('/summary', (req, res) => reservationController.getDashboardSummary(req, res));
router.get('/timeline', (req, res) => reservationController.getFloorTimeline(req, res));

// Walk-in seating
router.post('/walk-in', (req, res) => reservationController.createWalkIn(req, res));

// Automated sweep
router.post('/sweep-no-shows', (req, res) => reservationController.sweepNoShows(req, res));

// Standard CRUD & lifecycle
router.get('/', (req, res) => reservationController.listReservations(req, res));
router.post('/', (req, res) => reservationController.createReservation(req, res));
router.get('/:id', (req, res) => reservationController.getReservationById(req, res));
router.put('/:id', (req, res) => reservationController.updateReservation(req, res));
router.patch('/:id/cancel', (req, res) => reservationController.cancelReservation(req, res));
router.patch('/:id/status', (req, res) => reservationController.updateStatus(req, res));
router.patch('/:id/assign-table', (req, res) => reservationController.assignTable(req, res));
router.patch('/:id/release-table', (req, res) => reservationController.releaseTable(req, res));
router.get('/:id/history', (req, res) => reservationController.getStatusHistory(req, res));

module.exports = router;

