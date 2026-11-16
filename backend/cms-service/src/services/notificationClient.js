/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION SERVICE CLIENT
 * File: backend/cms-service/src/services/notificationClient.js
 * Description: Dispatches internal broadcast alerts via HTTP REST without
 *              cross-service database writes.
 * ============================================================================
 */

const axios = require('axios');
const { config, createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('cms-notification-client');

class NotificationClient {
  /**
   * Broadcast internal notification for new contact inquiries.
   */
  async notifyContactMessage({ messageId, senderName, senderEmail, subject, inquiryType, branchId, correlationId }) {
    try {
      const url = `${config.urls.notificationService}/api/v1/notifications/internal/broadcast`;
      
      const payload = {
        event: 'contact:inquiry',
        notificationType: 'SYSTEM_ALERT',
        channel: 'IN_APP',
        title: `New Guest Inquiry: ${inquiryType}`,
        message: `${senderName} (${senderEmail}) sent message: "${subject}"`,
        targetRoom: branchId ? `branch:${branchId}:managers` : 'role:RESTAURANT_MANAGER',
        targetRole: 'RESTAURANT_MANAGER',
        branchId: branchId || null,
        payload: {
          messageId,
          senderName,
          senderEmail,
          subject,
          inquiryType,
        },
      };

      const headers = {
        'Content-Type': 'application/json',
        'X-Internal-Service-Key': config.internalServiceKey,
      };
      if (correlationId) {
        headers['X-Correlation-ID'] = correlationId;
      }

      logger.info(`Dispatching inquiry notification for Message #${messageId} to Notification Service...`);
      const response = await axios.post(url, payload, { headers, timeout: 5000 });
      logger.info(`Notification Service acknowledged Message #${messageId} (Status: ${response.status})`);
      return response.data;
    } catch (err) {
      // Microservice resilience: Notification failure must NEVER abort the saved contact message
      logger.warn(`Failed to dispatch alert to Notification Service for Message #${messageId}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new NotificationClient();
