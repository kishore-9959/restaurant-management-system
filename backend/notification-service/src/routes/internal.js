/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION INTERNAL BROADCAST ROUTE
 * File: backend/notification-service/src/routes/internal.js
 * Description: HTTP REST endpoint allowing internal microservices to trigger
 *              persisted real-time WebSocket broadcasts.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { serviceAuthMiddleware } = require('@rms/shared');
const notificationController = require('../controllers/notification.controller');

router.post(
  '/broadcast',
  serviceAuthMiddleware,
  notificationController.broadcast.bind(notificationController)
);

module.exports = router;
