/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - BOM SERVICE
 * File: backend/inventory-service/src/services/bom.service.js
 * Description: Order-related stock verification, atomic depletion, and compensating
 *              restitution for Order Service Saga integration.
 * ============================================================================
 */

const { config, httpClient, createServiceLogger } = require('@rms/shared');
const { bomRepository } = require('../repositories');

const logger = createServiceLogger('inventory-service');

class BomService {
  /**
   * Helper: Broadcast low-stock notifications if depletion drops items below reorder level
   */
  async notifyLowStockItems(branchId, lowStockAlerts = []) {
    if (!lowStockAlerts || lowStockAlerts.length === 0) return;

    try {
      const notificationUrl = config.services?.notification || 'http://localhost:8012';
      for (const alert of lowStockAlerts) {
        await httpClient.post(`${notificationUrl}/api/v1/notifications/internal/broadcast`, {
          event: 'inventory:low_stock',
          room: `branch:${branchId}:inventory`,
          payload: {
            branchId,
            ...alert,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      logger.warn(`Failed to dispatch batch low stock notifications: ${err.message}`);
    }
  }

  /**
   * Check ingredient availability for line items without mutating stock
   */
  async checkStock(branchId, items = []) {
    if (!branchId) {
      const err = new Error('branchId is required.');
      err.statusCode = 400;
      err.code = 'INVALID_BRANCH_ID';
      throw err;
    }

    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error('items array is required and must not be empty.');
      err.statusCode = 400;
      err.code = 'INVALID_ITEMS_LIST';
      throw err;
    }

    return bomRepository.checkStock(branchId, items);
  }

  /**
   * Atomically deplete ingredients for confirmed order (Idempotent)
   */
  async depleteStock(data, userContext = {}) {
    if (!data.branchId || !data.orderId || !data.orderNumber) {
      const err = new Error('branchId, orderId, and orderNumber are required.');
      err.statusCode = 400;
      err.code = 'MISSING_REQUIRED_FIELDS';
      throw err;
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      const err = new Error('items array is required.');
      err.statusCode = 400;
      err.code = 'INVALID_ITEMS_LIST';
      throw err;
    }

    const result = await bomRepository.deplete(
      data.branchId,
      data.orderId,
      data.orderNumber,
      data.items,
      userContext.userId || null
    );

    // If depletion triggered low-stock alerts, broadcast asynchronously
    if (result.lowStockTriggered && result.lowStockAlerts?.length > 0) {
      this.notifyLowStockItems(data.branchId, result.lowStockAlerts);
    }

    return result;
  }

  /**
   * Compensating transaction: Restitute stock for cancelled or voided order
   */
  async restituteStock(data, userContext = {}) {
    if (!data.branchId || !data.orderId || !data.orderNumber) {
      const err = new Error('branchId, orderId, and orderNumber are required.');
      err.statusCode = 400;
      err.code = 'MISSING_REQUIRED_FIELDS';
      throw err;
    }

    try {
      const result = await bomRepository.restitute(
        data.branchId,
        data.orderId,
        data.orderNumber,
        data.reason || 'Order Cancelled/Voided',
        userContext.userId || null
      );

      return result;
    } catch (err) {
      if (err.message && err.message.includes('NO_CONSUMPTION_FOUND_FOR_ORDER')) {
        const error = new Error(`No prior inventory consumption found for Order #${data.orderNumber} (OrderId: ${data.orderId}).`);
        error.statusCode = 404;
        error.code = 'NO_CONSUMPTION_FOUND';
        throw error;
      }
      if (err.message && err.message.includes('ORDER_ALREADY_RESTITUTED')) {
        const error = new Error(`Order #${data.orderNumber} has already been restituted.`);
        error.statusCode = 409;
        error.code = 'ORDER_ALREADY_RESTITUTED';
        throw error;
      }
      throw err;
    }
  }
}

module.exports = new BomService();

