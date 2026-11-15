/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION SERVICE CLIENT
 * File: backend/kitchen-service/src/services/notificationClient.js
 * Description: HTTP REST client to broadcast real-time events via Notification Service.
 * ============================================================================
 */

const axios = require('axios');
const { config, createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('kitchen-service');

const notificationClient = axios.create({
  baseURL: config.urls?.notificationService || 'http://localhost:8012',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Service-Key': config.internalServiceKey,
  },
});

/**
 * Broadcast event to Notification Service.
 */
async function broadcastEvent({
  branchId,
  userId = null,
  targetRoom,
  event,
  title,
  message,
  notificationType,
  targetUrl = null,
  payload = {},
  correlationId = null,
}) {
  try {
    const headers = {};
    if (correlationId) {
      headers['X-Correlation-ID'] = correlationId;
    }

    const response = await notificationClient.post(
      '/api/v1/notifications/internal/broadcast',
      {
        branchId,
        userId,
        targetRoom,
        event,
        title,
        message,
        notificationType,
        targetUrl,
        payload,
      },
      { headers }
    );

    return response.data;
  } catch (err) {
    logger.warn(`Failed to dispatch notification [${event}]: ${err.message}`);
    // Non-blocking: Kitchen operations must proceed even if notification fails
    return null;
  }
}

module.exports = {
  broadcastEvent,
};
