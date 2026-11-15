/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION ROUTES
 * File: backend/notification-service/src/routes/notification.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const {
  config,
  authenticationMiddleware,
  requireRoles,
  asyncHandler,
} = require('@rms/shared');

// Allows internal service mesh call with X-Internal-Service-Key or staff JWT
const internalOrJwtAuth = (req, res, next) => {
  const providedKey = req.headers['x-internal-service-key'];
  const expectedKey = config.security?.internalServiceKey || config.internalServiceKey;
  if (providedKey && providedKey === expectedKey) {
    req.user = { userId: 1, role: 'SYSTEM' };
    return next();
  }
  return authenticationMiddleware(req, res, next);
};

// 1. Specific static sub-paths (Must precede parameterized :id)
router.get(
  ['/unread-count', '/api/v1/notifications/unread-count'],
  authenticationMiddleware,
  asyncHandler(notificationController.getUnreadCount.bind(notificationController))
);

router.patch(
  ['/read-all', '/api/v1/notifications/read-all'],
  authenticationMiddleware,
  asyncHandler(notificationController.markAllAsRead.bind(notificationController))
);

router.post(
  ['/broadcast', '/api/v1/notifications/broadcast'],
  internalOrJwtAuth,
  asyncHandler(notificationController.broadcast.bind(notificationController))
);

// 2. Base collection routes
router.get(
  ['/', '/api/v1/notifications'],
  authenticationMiddleware,
  asyncHandler(notificationController.getUserNotifications.bind(notificationController))
);

router.post(
  ['/', '/api/v1/notifications'],
  internalOrJwtAuth,
  asyncHandler(notificationController.createNotification.bind(notificationController))
);

// 3. Parameterized routes (:id)
router.get(
  ['/:id', '/api/v1/notifications/:id'],
  authenticationMiddleware,
  asyncHandler(notificationController.getNotificationById.bind(notificationController))
);

router.patch(
  ['/:id/read', '/api/v1/notifications/:id/read'],
  authenticationMiddleware,
  asyncHandler(notificationController.markAsRead.bind(notificationController))
);

module.exports = router;

