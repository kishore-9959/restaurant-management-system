/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION SERVICE CLIENT
 * File: backend/reservation-service/src/services/notificationClient.js
 * Description: HTTP REST client to broadcast real-time booking alerts
 *              via Notification Service (:8012).
 * ============================================================================
 */

const axios = require('axios');
const { config, createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('reservation-service');

const notificationClient = axios.create({
  baseURL: config.urls?.notificationService || 'http://localhost:8012',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Service-Key': config.internalServiceKey,
  },
});

/**
 * Broadcast reservation events (created, seated, cancelled, reminder).
 */
async function broadcastReservationEvent({
  branchId,
  userId = null,
  event,
  title,
  message,
  notificationType = 'RESERVATION',
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
        targetRoom: `branch_${branchId}_hostess`,
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
    logger.warn(`Failed to dispatch reservation notification [${event}]: ${err.message}`);
    // Non-blocking
    return null;
  }
}

module.exports = {
  broadcastReservationEvent,
};

