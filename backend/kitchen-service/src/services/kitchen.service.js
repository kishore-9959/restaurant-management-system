/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - KITCHEN SERVICE
 * File: backend/kitchen-service/src/services/kitchen.service.js
 * Description: Business logic, station routing, and real-time coordination for KDS.
 * ============================================================================
 */

const kitchenRepository = require('../repositories/kitchen.repository');
const { broadcastEvent } = require('./notificationClient');
const { syncOrderStatus } = require('./orderClient');
const { getRedisClient, createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('kitchen-service');

class KitchenService {
  /**
   * Create KOT ticket(s) with idempotency and real-time broadcast.
   */
  async createKOT({ branchId, orderId, kitchenStation = 'MAIN_KITCHEN', specialKitchenNotes = null, itemIds = null, userContext = null, correlationId = null }) {
    const result = await kitchenRepository.createKOT({
      branchId,
      orderId,
      kitchenStation,
      specialKitchenNotes,
      itemIds,
    });

    // Fetch full ticket details for response and real-time event
    const ticket = await kitchenRepository.getKOTById(result.kotId);

    // If new ticket (not an idempotent duplicate), broadcast to station & kitchen rooms
    if (!result.isIdempotent && ticket) {
      const room = `branch:${branchId}:kitchen`;
      const stationRoom = `branch:${branchId}:kitchen:${kitchenStation}`;

      await broadcastEvent({
        branchId,
        targetRoom: room,
        event: 'kot:created',
        title: `New KOT Ticket (${kitchenStation})`,
        message: `Order #${ticket.OrderNumber || orderId} received at ${kitchenStation} [${ticket.KOTNumber}].`,
        notificationType: 'KOT_CREATED',
        targetUrl: `/kds?branchId=${branchId}&station=${kitchenStation}`,
        payload: ticket,
        correlationId,
      });
    }

    return {
      ...result,
      ticket,
    };
  }

  /**
   * Get KOT by ID with items and addons.
   */
  async getKOTById(kotId) {
    const ticket = await kitchenRepository.getKOTById(kotId);
    if (!ticket) {
      const error = new Error(`KOT ticket with ID ${kotId} not found.`);
      error.statusCode = 404;
      error.code = 'KOT_NOT_FOUND';
      throw error;
    }
    return ticket;
  }

  /**
   * Get all KOTs for an order.
   */
  async getKOTsByOrderId(orderId) {
    return await kitchenRepository.getKOTsByOrderId(orderId);
  }

  /**
   * Fetch active KDS board.
   */
  async getActiveBoard({ branchId, kitchenStation = null, ticketStatus = null }) {
    return await kitchenRepository.getActiveBoard({
      branchId,
      kitchenStation,
      ticketStatus,
    });
  }

  /**
   * Update KOT ticket lifecycle status.
   */
  async updateKOTStatus({ kotId, newStatus, userContext = null, correlationId = null }) {
    const currentTicket = await this.getKOTById(kotId);
    const updatedByUserId = userContext?.userId || null;

    await kitchenRepository.updateKOTStatus({
      kotId,
      newStatus,
      updatedByUserId,
    });

    const updatedTicket = await this.getKOTById(kotId);

    // Real-time broadcast
    const branchId = updatedTicket.BranchId;
    const room = `branch:${branchId}:kitchen`;
    const eventName = newStatus === 'READY' ? 'kot:ready' : 'kot:updated';

    await broadcastEvent({
      branchId,
      targetRoom: room,
      event: eventName,
      title: `KOT ${updatedTicket.KOTNumber} Status: ${newStatus}`,
      message: `Ticket ${updatedTicket.KOTNumber} for Order #${updatedTicket.OrderNumber} is now ${newStatus}.`,
      notificationType: 'KOT_UPDATED',
      payload: updatedTicket,
      correlationId,
    });

    // If READY, check if order should be synced to Order Service
    if (newStatus === 'READY') {
      const allKOTs = await kitchenRepository.getKOTsByOrderId(updatedTicket.OrderId);
      const allReady = allKOTs.every((k) => k.TicketStatus === 'READY' || k.TicketStatus === 'BUMPED');
      if (allReady) {
        // Sync Order Service status -> READY
        await syncOrderStatus({
          orderId: updatedTicket.OrderId,
          status: 'READY',
          notes: 'All kitchen tickets ready for service',
          correlationId,
        });

        // Notify waitstaff room
        await broadcastEvent({
          branchId,
          targetRoom: `branch:${branchId}:waitstaff`,
          event: 'order:ready',
          title: `Order #${updatedTicket.OrderNumber} Ready`,
          message: `Table ${updatedTicket.TableNumber || 'Takeaway'} Order #${updatedTicket.OrderNumber} is ready for pickup.`,
          notificationType: 'ORDER_READY',
          payload: { orderId: updatedTicket.OrderId, orderNumber: updatedTicket.OrderNumber },
          correlationId,
        });
      }
    }

    return updatedTicket;
  }

  /**
   * Update individual item status with auto-rollup.
   */
  async updateItemStatus({ kotItemId, newPreparationStatus, userContext = null, correlationId = null }) {
    const rollup = await kitchenRepository.updateItemStatus({
      kotItemId,
      newPreparationStatus,
    });

    // Broadcast item update event
    const eventPayload = {
      kotItemId,
      newPreparationStatus,
      parentKOTStatus: rollup.parentKOTStatus,
      allOrderKOTsReady: rollup.allOrderKOTsReady,
      parentOrderId: rollup.parentOrderId,
    };

    // If all KOTs for order are ready, notify waitstaff and sync order status
    if (rollup.allOrderKOTsReady && rollup.parentOrderId) {
      await syncOrderStatus({
        orderId: rollup.parentOrderId,
        status: 'READY',
        notes: 'All kitchen order items completed',
        correlationId,
      });

      const branchId = userContext?.branchId || 1;

      // Broadcast order:ready to waitstaff room
      await broadcastEvent({
        branchId,
        targetRoom: `branch:${branchId}:waitstaff`,
        event: 'order:ready',
        title: `Order #${rollup.parentOrderId} Ready for Pickup`,
        message: `All items for Order #${rollup.parentOrderId} are ready.`,
        notificationType: 'ORDER_READY',
        payload: { orderId: rollup.parentOrderId },
        correlationId,
      });
    }

    return {
      success: true,
      ...rollup,
    };
  }

  /**
   * Bump ticket off active KDS board.
   */
  async bumpKOT({ kotId, userContext = null, correlationId = null }) {
    const ticket = await this.getKOTById(kotId);
    const bumpedByUserId = userContext?.userId || null;

    await kitchenRepository.bumpKOT({
      kotId,
      bumpedByUserId,
    });

    const updatedTicket = await this.getKOTById(kotId);

    // Broadcast bump event so KDS screens dismiss the ticket card
    await broadcastEvent({
      branchId: updatedTicket.BranchId,
      targetRoom: `branch:${updatedTicket.BranchId}:kitchen`,
      event: 'kot:bumped',
      title: `KOT Bumped: ${updatedTicket.KOTNumber}`,
      message: `KOT ${updatedTicket.KOTNumber} has been bumped.`,
      notificationType: 'KOT_BUMPED',
      payload: { kotId, bumpedAt: updatedTicket.BumpedAt },
      correlationId,
    });

    return updatedTicket;
  }

  /**
   * Cancel all KOTs for an order.
   */
  async cancelByOrderId({ orderId, reason = null, userContext = null, correlationId = null }) {
    const result = await kitchenRepository.cancelByOrderId({
      orderId,
      reason,
    });

    // Broadcast cancellation alert to kitchen
    await broadcastEvent({
      targetRoom: 'role:kitchen',
      event: 'kot:cancelled',
      title: `Order #${orderId} Cancelled`,
      message: `Order #${orderId} was cancelled${reason ? ': ' + reason : ''}. Stop preparation.`,
      notificationType: 'ORDER_CANCELLED',
      payload: { orderId, reason, cancelledKOTCount: result.cancelledKOTCount },
      correlationId,
    });

    return result;
  }

  /**
   * Assign chef to a KOT ticket.
   */
  async assignChef({ kotId, chefUserId, userContext = null, correlationId = null }) {
    const assignedByUserId = userContext?.userId || null;
    await kitchenRepository.assignChef({
      kotId,
      chefUserId,
      assignedByUserId,
    });

    const updatedTicket = await this.getKOTById(kotId);

    // Cache active chef assignment in Redis
    try {
      const redis = getRedisClient();
      if (redis && redis.status === 'ready') {
        const key = `kds:branch:${updatedTicket.BranchId}:station:${updatedTicket.KitchenStation}:chef`;
        await redis.set(key, JSON.stringify({ chefUserId, assignedAt: new Date().toISOString() }), 'EX', 43200);
      }
    } catch (err) {
      logger.warn(`Redis chef cache error: ${err.message}`);
    }

    // Broadcast chef update
    await broadcastEvent({
      branchId: updatedTicket.BranchId,
      targetRoom: `branch:${updatedTicket.BranchId}:kitchen`,
      event: 'kot:updated',
      title: `Chef Assigned to KOT ${updatedTicket.KOTNumber}`,
      message: `Chef assigned to ${updatedTicket.KOTNumber} (${updatedTicket.KitchenStation}).`,
      notificationType: 'KOT_UPDATED',
      payload: updatedTicket,
      correlationId,
    });

    return updatedTicket;
  }

  /**
   * Retrieve KDS metrics and station workloads.
   */
  async getMetrics({ branchId, date = null }) {
    return await kitchenRepository.getMetrics({ branchId, date });
  }
}

module.exports = new KitchenService();
