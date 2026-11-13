/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - DINING TABLE & FLOOR SERVICE
 * File: backend/restaurant-service/src/services/diningTable.service.js
 * Description: Business logic for Dining Tables, QR codes, Floor Plans,
 *              and real-time status broadcasts.
 * ============================================================================
 */

const QRCode = require('qrcode');
const { config, createHttpClient } = require('@rms/shared');
const { diningTableRepository } = require('../repositories');

class DiningTableService {
  constructor() {
    this.notificationClient = createHttpClient({
      baseURL: config.urls.notificationService,
      timeout: 3000,
      serviceName: 'restaurant-service',
    });
  }

  async createTable(payload) {
    const table = await diningTableRepository.create(payload);
    if (table && table.QrCodeHash) {
      try {
        table.qrCodeDataUrl = await QRCode.toDataURL(`rms://table/${table.QrCodeHash}`);
      } catch (qrErr) {
        // Non-blocking fallback
      }
    }
    return table;
  }

  async updateTable(tableId, payload) {
    const updated = await diningTableRepository.update(tableId, payload);
    if (!updated) {
      const err = new Error(`Table with ID ${tableId} not found.`);
      err.statusCode = 404;
      err.code = 'TABLE_NOT_FOUND';
      throw err;
    }
    return updated;
  }

  async getTableById(tableId) {
    const table = await diningTableRepository.getById(tableId);
    if (!table) {
      const err = new Error(`Table with ID ${tableId} not found.`);
      err.statusCode = 404;
      err.code = 'TABLE_NOT_FOUND';
      throw err;
    }
    try {
      table.qrCodeDataUrl = await QRCode.toDataURL(`rms://table/${table.QrCodeHash}`);
    } catch (qrErr) {
      // Non-blocking fallback
    }
    return table;
  }

  async getTableByQrHash(qrCodeHash) {
    const table = await diningTableRepository.getByQrHash(qrCodeHash);
    if (!table) {
      const err = new Error(`Table with QR Hash '${qrCodeHash}' not found or inactive.`);
      err.statusCode = 404;
      err.code = 'TABLE_NOT_FOUND';
      throw err;
    }
    return table;
  }

  async listTablesByBranch(branchId, query = {}) {
    return await diningTableRepository.listByBranch(branchId, query);
  }

  async listTablesBySection(sectionId, query = {}) {
    return await diningTableRepository.listBySection(sectionId, query);
  }

  async updateTableCapacity(tableId, capacity) {
    const updated = await diningTableRepository.updateCapacity(tableId, capacity);
    if (!updated) {
      const err = new Error(`Table with ID ${tableId} not found.`);
      err.statusCode = 404;
      err.code = 'TABLE_NOT_FOUND';
      throw err;
    }
    return updated;
  }

  async updateTableStatus(tableId, status, activeOrderId = null) {
    const updated = await diningTableRepository.updateStatus(tableId, status, activeOrderId);
    if (!updated) {
      const err = new Error(`Table with ID ${tableId} not found.`);
      err.statusCode = 404;
      err.code = 'TABLE_NOT_FOUND';
      throw err;
    }

    // Broadcast real-time table status update to notification-service (async non-blocking)
    this._broadcastStatusChange(updated).catch(() => {});

    return updated;
  }

  async _broadcastStatusChange(table) {
    try {
      await this.notificationClient.post('/internal/broadcast', {
        room: `branch:${table.BranchId}`,
        event: 'table:status-changed',
        data: {
          tableId: table.TableId,
          branchId: table.BranchId,
          sectionId: table.SectionId,
          sectionName: table.SectionName,
          tableNumber: table.TableNumber,
          currentStatus: table.CurrentStatus,
          activeOrderId: table.ActiveOrderId,
          updatedAt: table.UpdatedAt,
        },
      });
    } catch (err) {
      // Non-fatal: real-time notification push failure should not abort HTTP request
    }
  }

  async getAvailableTables(branchId, query = {}) {
    return await diningTableRepository.getAvailable(branchId, query);
  }

  async getOccupiedTables(branchId, query = {}) {
    return await diningTableRepository.getOccupied(branchId, query);
  }

  async deleteTable(tableId) {
    return await diningTableRepository.delete(tableId);
  }

  async getFloorLayout(branchId, floorLevel = null) {
    return await diningTableRepository.getFloorLayout(branchId, floorLevel);
  }
}

module.exports = new DiningTableService();

