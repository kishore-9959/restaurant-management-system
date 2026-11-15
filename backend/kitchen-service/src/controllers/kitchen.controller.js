/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - KITCHEN CONTROLLER
 * File: backend/kitchen-service/src/controllers/kitchen.controller.js
 * ============================================================================
 */

const kitchenService = require('../services/kitchen.service');
const { successResponse, errorResponse } = require('@rms/shared');
const {
  validateCreateKOT,
  validateUpdateKOTStatus,
  validateUpdateItemStatus,
  validateAssignChef,
} = require('../validators/kitchen.validator');

class KitchenController {
  extractContext(req) {
    return {
      userId: req.user?.userId || null,
      roles: req.user?.roles || [],
      branchId: req.user?.branchId || null,
    };
  }

  /**
   * POST /api/v1/kds/tickets
   */
  async createKOT(req, res) {
    const validation = validateCreateKOT(req.body);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid KOT creation payload.',
        details: validation.errors,
      });
    }

    const { branchId, orderId, kitchenStation, specialKitchenNotes, itemIds } = req.body;
    const userContext = this.extractContext(req);
    const correlationId = req.headers['x-correlation-id'] || null;

    const result = await kitchenService.createKOT({
      branchId: Number(branchId),
      orderId: Number(orderId),
      kitchenStation,
      specialKitchenNotes,
      itemIds,
      userContext,
      correlationId,
    });

    return successResponse(res, {
      statusCode: result.isIdempotent ? 200 : 201,
      message: result.isIdempotent ? 'Existing active KOT ticket retrieved idempotently.' : 'KOT ticket created successfully.',
      data: result,
    });
  }

  /**
   * GET /api/v1/kds/tickets/:id
   */
  async getKOTById(req, res) {
    const { id } = req.params;
    const ticket = await kitchenService.getKOTById(Number(id));
    return successResponse(res, {
      message: 'KOT ticket retrieved successfully.',
      data: ticket,
    });
  }

  /**
   * GET /api/v1/kds/orders/:orderId/tickets
   */
  async getKOTsByOrderId(req, res) {
    const { orderId } = req.params;
    const tickets = await kitchenService.getKOTsByOrderId(Number(orderId));
    return successResponse(res, {
      message: 'Order KOT tickets retrieved successfully.',
      data: tickets,
    });
  }

  /**
   * GET /api/v1/kds/active
   */
  async getActiveBoard(req, res) {
    const branchId = req.query.branchId ? Number(req.query.branchId) : req.user?.branchId || 1;
    const { station, status } = req.query;

    const tickets = await kitchenService.getActiveBoard({
      branchId,
      kitchenStation: station || null,
      ticketStatus: status || null,
    });

    return successResponse(res, {
      message: 'Active KDS board retrieved successfully.',
      data: tickets,
    });
  }

  /**
   * PATCH /api/v1/kds/tickets/:id/status
   */
  async updateKOTStatus(req, res) {
    const { id } = req.params;
    const validation = validateUpdateKOTStatus(req.body);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid KOT status update payload.',
        details: validation.errors,
      });
    }

    const userContext = this.extractContext(req);
    const correlationId = req.headers['x-correlation-id'] || null;

    const ticket = await kitchenService.updateKOTStatus({
      kotId: Number(id),
      newStatus: req.body.status,
      userContext,
      correlationId,
    });

    return successResponse(res, {
      message: `KOT ticket status updated to ${req.body.status}.`,
      data: ticket,
    });
  }

  /**
   * PATCH /api/v1/kds/items/:itemId/status
   */
  async updateItemStatus(req, res) {
    const { itemId } = req.params;
    const validation = validateUpdateItemStatus(req.body);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid item status payload.',
        details: validation.errors,
      });
    }

    const userContext = this.extractContext(req);
    const correlationId = req.headers['x-correlation-id'] || null;

    const result = await kitchenService.updateItemStatus({
      kotItemId: Number(itemId),
      newPreparationStatus: req.body.status,
      userContext,
      correlationId,
    });

    return successResponse(res, {
      message: `KOT item status updated to ${req.body.status}.`,
      data: result,
    });
  }

  /**
   * POST /api/v1/kds/tickets/:id/bump
   */
  async bumpKOT(req, res) {
    const { id } = req.params;
    const userContext = this.extractContext(req);
    const correlationId = req.headers['x-correlation-id'] || null;

    const ticket = await kitchenService.bumpKOT({
      kotId: Number(id),
      userContext,
      correlationId,
    });

    return successResponse(res, {
      message: 'KOT ticket bumped off active screen successfully.',
      data: ticket,
    });
  }

  /**
   * POST /api/v1/kds/tickets/:id/assign-chef
   */
  async assignChef(req, res) {
    const { id } = req.params;
    const validation = validateAssignChef(req.body);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid chef assignment payload.',
        details: validation.errors,
      });
    }

    const userContext = this.extractContext(req);
    const correlationId = req.headers['x-correlation-id'] || null;

    const ticket = await kitchenService.assignChef({
      kotId: Number(id),
      chefUserId: Number(req.body.chefUserId),
      userContext,
      correlationId,
    });

    return successResponse(res, {
      message: 'Chef assigned to KOT ticket successfully.',
      data: ticket,
    });
  }

  /**
   * POST /api/v1/kds/orders/:orderId/cancel
   */
  async cancelByOrderId(req, res) {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userContext = this.extractContext(req);
    const correlationId = req.headers['x-correlation-id'] || null;

    const result = await kitchenService.cancelByOrderId({
      orderId: Number(orderId),
      reason,
      userContext,
      correlationId,
    });

    return successResponse(res, {
      message: `Active KOT tickets for Order #${orderId} cancelled successfully.`,
      data: result,
    });
  }

  /**
   * GET /api/v1/kds/metrics
   */
  async getMetrics(req, res) {
    const branchId = req.query.branchId ? Number(req.query.branchId) : req.user?.branchId || 1;
    const { date } = req.query;

    const metrics = await kitchenService.getMetrics({ branchId, date });
    return successResponse(res, {
      message: 'KDS operational metrics retrieved successfully.',
      data: metrics,
    });
  }
}

module.exports = new KitchenController();

