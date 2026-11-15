/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION SERVICE
 * File: backend/notification-service/src/services/notification.service.js
 * Description: Core business logic, "Persist Before Broadcast" event delivery,
 *              and in-app inbox management.
 * ============================================================================
 */

const notificationRepository = require('../repositories/notification.repository');
const { socketManager } = require('../socket');
const { createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('notification-service');

class NotificationService {
  /**
   * Persist a notification in SQL Server and emit to recipient user or branch room.
   */
  async createNotification({ branchId = null, userId = null, title, message, notificationType, targetUrl = null }) {
    const result = await notificationRepository.createNotification({
      branchId,
      userId,
      title,
      message,
      notificationType,
      targetUrl,
    });

    const notificationPayload = {
      notificationId: result.notificationId,
      branchId,
      userId,
      title,
      message,
      notificationType,
      targetUrl,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Emit event if not duplicate
    if (!result.isDuplicate && result.notificationId) {
      if (userId) {
        socketManager.emitToUser(userId, 'notification:new', notificationPayload);
      } else if (branchId) {
        socketManager.broadcast({
          room: `branch:${branchId}:waitstaff`,
          event: 'notification:new',
          data: notificationPayload,
        });
      } else {
        socketManager.broadcast({
          room: null,
          event: 'notification:new',
          data: notificationPayload,
        });
      }
    }

    return {
      ...result,
      notification: notificationPayload,
    };
  }

  /**
   * Central Inter-Service Event Broadcast:
   * Pattern: "Persist Before Broadcast"
   */
  async broadcastEvent({
    branchId = null,
    userId = null,
    targetRoom = null,
    event,
    title,
    message,
    notificationType,
    targetUrl = null,
    payload = {},
  }) {
    // 1. Persist notification in database first
    const dbResult = await notificationRepository.createNotification({
      branchId,
      userId,
      title: title || `Event: ${event}`,
      message: message || `Real-time event ${event} triggered`,
      notificationType: notificationType || 'SYSTEM',
      targetUrl,
    });

    const fullPayload = {
      notificationId: dbResult.notificationId,
      isDuplicate: dbResult.isDuplicate,
      event,
      title,
      message,
      notificationType,
      targetUrl,
      data: payload,
      createdAt: new Date().toISOString(),
    };

    // 2. Broadcast via Socket.IO
    let target = targetRoom;
    if (!target && userId) {
      target = `user:${userId}`;
    }

    socketManager.broadcast({
      room: target,
      event,
      data: fullPayload,
    });

    logger.info(`Broadcasted [${event}] to room '${target || 'GLOBAL'}', persisted NotificationId: ${dbResult.notificationId}`);

    return {
      notificationId: dbResult.notificationId,
      isDuplicate: dbResult.isDuplicate,
      broadcasted: true,
      event,
      room: target || 'GLOBAL',
    };
  }

  /**
   * Paginated user notification feed.
   */
  async getUserNotifications({ userId, branchId = null, unreadOnly = false, page = 1, limit = 20 }) {
    return await notificationRepository.getUserNotifications({
      userId,
      branchId,
      unreadOnly,
      page,
      limit,
    });
  }

  /**
   * Retrieve notification by ID.
   */
  async getNotificationById(notificationId) {
    const notif = await notificationRepository.getNotificationById(notificationId);
    if (!notif) {
      const err = new Error(`Notification with ID ${notificationId} not found.`);
      err.statusCode = 404;
      err.code = 'NOTIFICATION_NOT_FOUND';
      throw err;
    }
    return notif;
  }

  /**
   * Mark single notification as read.
   */
  async markAsRead({ notificationId, userId = null }) {
    const result = await notificationRepository.markAsRead({
      notificationId,
      userId,
    });

    if (userId) {
      socketManager.emitToUser(userId, 'notification:read', { notificationId });
    }

    return result;
  }

  /**
   * Mark all notifications read.
   */
  async markAllAsRead({ userId, branchId = null }) {
    const result = await notificationRepository.markAllAsRead({
      userId,
      branchId,
    });

    if (userId) {
      socketManager.emitToUser(userId, 'notification:all_read', { userId, rowsUpdated: result.rowsUpdated });
    }

    return result;
  }

  /**
   * Count unread notifications.
   */
  async getUnreadCount({ userId, branchId = null }) {
    return await notificationRepository.getUnreadCount({ userId, branchId });
  }

  /**
   * Maintenance cleanup.
   */
  async deleteOlderThan(daysOld = 30) {
    return await notificationRepository.deleteOlderThan(daysOld);
  }
}

module.exports = new NotificationService();

