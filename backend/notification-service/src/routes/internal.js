/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION INTERNAL BROADCAST ROUTE
 * File: backend/notification-service/src/routes/internal.js
 * Description: HTTP REST endpoint allowing internal microservices to trigger
 *              real-time WebSocket broadcasts without needing message brokers.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { serviceAuthMiddleware, successResponse, errorResponse } = require('../../shared');
const { broadcastNotification } = require('../socket');

router.post('/broadcast', serviceAuthMiddleware, (req, res) => {
  const { room, event, data } = req.body;

  if (!event) {
    return errorResponse(res, {
      statusCode: 400,
      code: 'MISSING_EVENT_NAME',
      message: "The 'event' field is required for WebSocket broadcast.",
    });
  }

  try {
    broadcastNotification({ room, event, data });
    return successResponse(res, {
      message: `Broadcast event '${event}' dispatched successfully.`,
      data: {
        room: room || 'GLOBAL_BROADCAST',
        event,
        dispatchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(res, {
      statusCode: 500,
      code: 'BROADCAST_FAILURE',
      message: `Failed to broadcast notification: ${error.message}`,
    });
  }
});

module.exports = router;

