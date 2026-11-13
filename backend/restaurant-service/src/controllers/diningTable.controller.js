/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - DINING TABLE & FLOOR CONTROLLER
 * File: backend/restaurant-service/src/controllers/diningTable.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const diningTableService = require('../services/diningTable.service');
const { validateDiningTablePayload, VALID_TABLE_STATUSES } = require('../validators');

class DiningTableController {
  async createTable(req, res) {
    const payload = { ...req.body };
    if (req.params.branchId && !payload.branchId) {
      payload.branchId = req.params.branchId;
    }

    const validation = validateDiningTablePayload(payload, false);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid dining table creation payload.',
        details: validation.errors,
      });
    }

    try {
      const table = await diningTableService.createTable(payload);
      return successResponse(res, {
        statusCode: 201,
        message: 'Dining table created successfully.',
        data: table,
      });
    } catch (error) {
      const isConflict = error.message.includes('already exists');
      return errorResponse(res, {
        statusCode: isConflict ? 409 : 500,
        code: isConflict ? 'TABLE_ALREADY_EXISTS' : 'TABLE_CREATE_FAILED',
        message: error.message,
      });
    }
  }

  async updateTable(req, res) {
    const { tableId } = req.params;
    const validation = validateDiningTablePayload(req.body, true);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid dining table update payload.',
        details: validation.errors,
      });
    }

    try {
      const updated = await diningTableService.updateTable(tableId, req.body);
      return successResponse(res, {
        message: 'Dining table updated successfully.',
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'TABLE_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  async getTableById(req, res) {
    const { tableId } = req.params;
    try {
      const table = await diningTableService.getTableById(tableId);
      return successResponse(res, {
        message: 'Dining table retrieved successfully.',
        data: table,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'TABLE_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  async getTableByQrHash(req, res) {
    const { qrCodeHash } = req.params;
    try {
      const table = await diningTableService.getTableByQrHash(qrCodeHash);
      return successResponse(res, {
        message: 'Table retrieved from QR Code successfully.',
        data: table,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'QR_TABLE_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  async listTablesByBranch(req, res) {
    const branchId = req.params.branchId || req.query.branchId;
    if (!branchId) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Parameter 'branchId' is required.",
      });
    }

    const { sectionId, currentStatus, isActive } = req.query;
    try {
      const tables = await diningTableService.listTablesByBranch(branchId, {
        sectionId,
        currentStatus,
        isActive: isActive !== undefined ? isActive === 'true' : null,
      });
      return successResponse(res, {
        message: 'Tables retrieved successfully.',
        data: tables,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'TABLES_LIST_FAILED',
        message: error.message,
      });
    }
  }

  async listTablesBySection(req, res) {
    const { sectionId } = req.params;
    const { isActive } = req.query;
    try {
      const tables = await diningTableService.listTablesBySection(sectionId, {
        isActive: isActive !== undefined ? isActive === 'true' : null,
      });
      return successResponse(res, {
        message: 'Dining section tables retrieved successfully.',
        data: tables,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'SECTION_TABLES_LIST_FAILED',
        message: error.message,
      });
    }
  }

  async updateTableCapacity(req, res) {
    const { tableId } = req.params;
    const { seatingCapacity } = req.body;

    const cap = parseInt(seatingCapacity, 10);
    if (isNaN(cap) || cap <= 0) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Field 'seatingCapacity' must be a positive integer greater than zero.",
      });
    }

    try {
      const updated = await diningTableService.updateTableCapacity(tableId, cap);
      return successResponse(res, {
        message: 'Table seating capacity updated successfully.',
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'TABLE_CAPACITY_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  async updateTableStatus(req, res) {
    const { tableId } = req.params;
    const { currentStatus, activeOrderId } = req.body;

    if (!currentStatus || !VALID_TABLE_STATUSES.includes(String(currentStatus).toUpperCase())) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: `Field 'currentStatus' must be one of: ${VALID_TABLE_STATUSES.join(', ')}.`,
      });
    }

    try {
      const updated = await diningTableService.updateTableStatus(tableId, currentStatus, activeOrderId);
      return successResponse(res, {
        message: `Table status updated to ${currentStatus.toUpperCase()}.`,
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'TABLE_STATUS_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  async getAvailableTables(req, res) {
    const branchId = req.params.branchId || req.query.branchId;
    if (!branchId) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Parameter 'branchId' is required.",
      });
    }

    const { minCapacity, sectionId } = req.query;
    try {
      const tables = await diningTableService.getAvailableTables(branchId, {
        minCapacity,
        sectionId,
      });
      return successResponse(res, {
        message: 'Available tables retrieved successfully.',
        data: tables,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'AVAILABLE_TABLES_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  async getOccupiedTables(req, res) {
    const branchId = req.params.branchId || req.query.branchId;
    if (!branchId) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Parameter 'branchId' is required.",
      });
    }

    const { sectionId } = req.query;
    try {
      const tables = await diningTableService.getOccupiedTables(branchId, {
        sectionId,
      });
      return successResponse(res, {
        message: 'Occupied tables retrieved successfully.',
        data: tables,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'OCCUPIED_TABLES_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  async deleteTable(req, res) {
    const { tableId } = req.params;
    try {
      const result = await diningTableService.deleteTable(tableId);
      return successResponse(res, {
        message: 'Dining table deleted successfully.',
        data: result,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 400,
        code: error.code || 'TABLE_DELETE_FAILED',
        message: error.message,
      });
    }
  }

  async getFloorLayout(req, res) {
    const branchId = req.params.branchId || req.query.branchId;
    if (!branchId) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Parameter 'branchId' is required.",
      });
    }

    const { floorLevel } = req.query;
    try {
      const layout = await diningTableService.getFloorLayout(branchId, floorLevel);
      return successResponse(res, {
        message: 'Floor plan layout retrieved successfully.',
        data: layout,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'FLOOR_LAYOUT_FETCH_FAILED',
        message: error.message,
      });
    }
  }
}

module.exports = new DiningTableController();

