/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION CONTROLLER
 * File: backend/notification-service/src/controllers/notification.controller.js
 * ============================================================================
 */

const notificationService = require('../services/notification.service');
const { successResponse, errorResponse } = require('@rms/shared');
const {
  validateCreateNotification,
  validateBroadcast,
} = require('../validators/notification.validator');

class NotificationController {
  extractContext(req) {
    return {
      userId: req.user?.userId || null,
      roles: req.user?.roles || [],
      branchId: req.user?.branchId || null,
    };
  }

  /**
   * GET /api/v1/notifications
   */
  async getUserNotifications(req, res) {
    const user = this.extractContext(req);
    if (!user.userId) {
      return errorResponse(res, {
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication required to view notifications.',
      });
    }

    const { page, limit, unreadOnly, branchId } = req.query;
    const targetBranchId = branchId ? Number(branchId) : user.branchId;

    const data = await notificationService.getUserNotifications({
      userId: Number(user.userId),
      branchId: targetBranchId,
      unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    return successResponse(res, {
      message: 'Notifications retrieved successfully.',
      data: data.notifications,
      meta: {
        total: data.totalCount,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
      },
    });
  }

  /**
   * GET /api/v1/notifications/unread-count
   */
  async getUnreadCount(req, res) {
    const user = this.extractContext(req);
    if (!user.userId) {
      return errorResponse(res, {
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    const targetBranchId = req.query.branchId ? Number(req.query.branchId) : user.branchId;
    const count = await notificationService.getUnreadCount({
      userId: Number(user.userId),
      branchId: targetBranchId,
    });

    return successResponse(res, {
      message: 'Unread notifications count retrieved.',
      data: { unreadCount: count },
    });
  }

  /**
   * GET /api/v1/notifications/:id
   */
  async getNotificationById(req, res) {
    const { id } = req.params;
    const notification = await notificationService.getNotificationById(Number(id));
    return successResponse(res, {
      message: 'Notification retrieved successfully.',
      data: notification,
    });
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  async markAsRead(req, res) {
    const { id } = req.params;
    const user = this.extractContext(req);

    const result = await notificationService.markAsRead({
      notificationId: Number(id),
      userId: user.userId ? Number(user.userId) : null,
    });

    return successResponse(res, {
      message: 'Notification marked as read.',
      data: result,
    });
  }

  /**
   * PATCH /api/v1/notifications/read-all
   */
  async markAllAsRead(req, res) {
    const user = this.extractContext(req);
    if (!user.userId) {
      return errorResponse(res, {
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    const targetBranchId = req.query.branchId ? Number(req.query.branchId) : user.branchId;
    const result = await notificationService.markAllAsRead({
      userId: Number(user.userId),
      branchId: targetBranchId,
    });

    return successResponse(res, {
      message: 'All notifications marked as read.',
      data: result,
    });
  }

  /**
   * POST /api/v1/notifications
   */
  async createNotification(req, res) {
    const validation = validateCreateNotification(req.body);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid notification creation payload.',
        details: validation.errors,
      });
    }

    const { branchId, userId, title, message, notificationType, targetUrl } = req.body;
    const result = await notificationService.createNotification({
      branchId: branchId ? Number(branchId) : null,
      userId: userId ? Number(userId) : null,
      title,
      message,
      notificationType,
      targetUrl,
    });

    return successResponse(res, {
      statusCode: 201,
      message: 'Notification created successfully.',
      data: result,
    });
  }

  /**
   * POST /api/v1/notifications/broadcast (or /api/v1/notifications/internal/broadcast)
   * Inter-service mesh endpoint.
   */
  async broadcast(req, res) {
    const validation = validateBroadcast(req.body);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid broadcast payload.',
        details: validation.errors,
      });
    }

    const { branchId, userId, targetRoom, event, title, message, notificationType, targetUrl, payload } = req.body;

    const result = await notificationService.broadcastEvent({
      branchId: branchId ? Number(branchId) : null,
      userId: userId ? Number(userId) : null,
      targetRoom,
      event,
      title,
      message,
      notificationType,
      targetUrl,
      payload,
    });

    return successResponse(res, {
      message: `Event '${event}' broadcasted successfully.`,
      data: result,
    });
  }
}

module.exports = new NotificationController();

