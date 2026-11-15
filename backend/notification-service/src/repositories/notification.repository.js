/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION REPOSITORY
 * File: backend/notification-service/src/repositories/notification.repository.js
 * Description: 100% Parameterized Stored Procedure execution for Notifications.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class NotificationRepository {
  /**
   * Persist a notification in dbo.Notifications with 60-second duplicate suppression.
   */
  async createNotification({ branchId = null, userId = null, title, message, notificationType, targetUrl = null }) {
    const result = await executeProcedure(
      'dbo.usp_Notification_Create',
      {
        BranchId: { type: sql.Int, value: branchId || null },
        UserId: { type: sql.BigInt, value: userId || null },
        Title: { type: sql.NVarChar(150), value: title },
        Message: { type: sql.NVarChar(1000), value: message },
        NotificationType: { type: sql.NVarChar(40), value: notificationType },
        TargetUrl: { type: sql.NVarChar(255), value: targetUrl || null },
      },
      {
        NotificationId: sql.BigInt,
        IsDuplicate: sql.Bit,
      }
    );

    return {
      notificationId: result.output.NotificationId,
      isDuplicate: Boolean(result.output.IsDuplicate),
    };
  }

  /**
   * Retrieve notification by ID.
   */
  async getNotificationById(notificationId) {
    const result = await executeProcedure(
      'dbo.usp_Notification_GetById',
      {
        NotificationId: { type: sql.BigInt, value: notificationId },
      }
    );
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  /**
   * Paginated notification feed for a user (combining direct & branch alerts).
   */
  async getUserNotifications({ userId, branchId = null, unreadOnly = false, page = 1, limit = 20 }) {
    const result = await executeProcedure(
      'dbo.usp_Notification_GetByUser',
      {
        UserId: { type: sql.BigInt, value: userId },
        BranchId: { type: sql.Int, value: branchId || null },
        UnreadOnly: { type: sql.Bit, value: unreadOnly ? 1 : 0 },
        Page: { type: sql.Int, value: page },
        Limit: { type: sql.Int, value: limit },
      }
    );

    const totalCount = result.recordsets[0] && result.recordsets[0][0] ? result.recordsets[0][0].TotalCount : 0;
    const notifications = result.recordsets[1] || [];

    return {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      notifications,
    };
  }

  /**
   * Count unread notifications for badge icon.
   */
  async getUnreadCount({ userId, branchId = null }) {
    const result = await executeProcedure(
      'dbo.usp_Notification_GetUnreadCount',
      {
        UserId: { type: sql.BigInt, value: userId },
        BranchId: { type: sql.Int, value: branchId || null },
      },
      {
        UnreadCount: sql.Int,
      }
    );
    return result.output.UnreadCount || 0;
  }

  /**
   * Mark single notification as read.
   */
  async markAsRead({ notificationId, userId = null }) {
    const result = await executeProcedure(
      'dbo.usp_Notification_MarkAsRead',
      {
        NotificationId: { type: sql.BigInt, value: notificationId },
        UserId: { type: sql.BigInt, value: userId || null },
      },
      {
        RowsUpdated: sql.Int,
      }
    );
    return {
      rowsUpdated: result.output.RowsUpdated || 0,
    };
  }

  /**
   * Bulk mark all unread notifications read for a user.
   */
  async markAllAsRead({ userId, branchId = null }) {
    const result = await executeProcedure(
      'dbo.usp_Notification_MarkAllAsRead',
      {
        UserId: { type: sql.BigInt, value: userId },
        BranchId: { type: sql.Int, value: branchId || null },
      },
      {
        RowsUpdated: sql.Int,
      }
    );
    return {
      rowsUpdated: result.output.RowsUpdated || 0,
    };
  }

  /**
   * Maintenance retention cleanup for expired read notifications.
   */
  async deleteOlderThan(daysOld = 30) {
    const result = await executeProcedure(
      'dbo.usp_Notification_DeleteOlderThan',
      {
        DaysOld: { type: sql.Int, value: daysOld },
      },
      {
        DeletedCount: sql.Int,
      }
    );
    return {
      deletedCount: result.output.DeletedCount || 0,
    };
  }
}

module.exports = new NotificationRepository();

