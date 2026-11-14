/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ORDER CONTROLLER
 * File: backend/order-service/src/controllers/order.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const orderService = require('../services/order.service');
const {
  validatePlaceOrderPayload,
  validateUpdateStatusPayload,
  validateCancelOrderPayload,
} = require('../validators');

class OrderController {
  extractAuthContext(req) {
    return {
      userId: req.user?.userId || null,
      roles: req.user?.roles || [],
      isInternalService: Boolean(req.isInternalService || req.user?.userType === 'INTERNAL_SERVICE'),
      token: req.headers.authorization?.replace(/^Bearer\s+/i, '') || null,
      idempotencyKey: req.headers['x-idempotency-key'] || req.headers['idempotency-key'] || null,
    };
  }

  /**
   * POST /api/v1/orders
   * Place a new order
   */
  async createOrder(req, res) {
    const validation = validatePlaceOrderPayload(req.body);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid order placement payload.',
        details: validation.errors,
      });
    }

    const authContext = this.extractAuthContext(req);
    try {
      const order = await orderService.placeOrder(req.body, authContext);
      return successResponse(res, {
        statusCode: 201,
        message: 'Order placed successfully.',
        data: order,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ORDER_PLACEMENT_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/orders
   * List orders with filtering and pagination
   */
  async listOrders(req, res) {
    const authContext = this.extractAuthContext(req);
    try {
      const { branchId, customerId, orderStatus, paymentStatus, orderType, startDate, endDate, page, limit } = req.query;

      const result = await orderService.listOrders(
        {
          branchId: branchId ? parseInt(branchId, 10) : null,
          customerId: customerId ? parseInt(customerId, 10) : null,
          orderStatus,
          paymentStatus,
          orderType,
          startDate,
          endDate,
          page: page ? parseInt(page, 10) : 1,
          limit: limit ? parseInt(limit, 10) : 20,
        },
        authContext
      );

      return successResponse(res, {
        message: 'Orders listed successfully.',
        data: result.orders,
        meta: result.pagination,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ORDERS_LIST_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/orders/:orderId
   */
  async getOrderById(req, res) {
    const { orderId } = req.params;
    const authContext = this.extractAuthContext(req);

    try {
      const order = await orderService.getOrderById(orderId, authContext);
      return successResponse(res, {
        message: 'Order retrieved successfully.',
        data: order,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ORDER_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/orders/number/:orderNumber
   */
  async getOrderByNumber(req, res) {
    const { orderNumber } = req.params;
    const authContext = this.extractAuthContext(req);

    try {
      const order = await orderService.getOrderByNumber(orderNumber, authContext);
      return successResponse(res, {
        message: 'Order retrieved successfully.',
        data: order,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ORDER_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/v1/orders/:orderId/status
   */
  async updateStatus(req, res) {
    const { orderId } = req.params;
    const validation = validateUpdateStatusPayload(req.body);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid status update payload.',
        details: validation.errors,
      });
    }

    const authContext = this.extractAuthContext(req);
    try {
      const updated = await orderService.updateOrderStatus(orderId, req.body.status, authContext, req.body.notes);
      return successResponse(res, {
        message: `Order status updated to ${req.body.status}.`,
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'STATUS_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/orders/:orderId/cancel
   */
  async cancelOrder(req, res) {
    const { orderId } = req.params;
    const validation = validateCancelOrderPayload(req.body);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid order cancellation payload.',
        details: validation.errors,
      });
    }

    const authContext = this.extractAuthContext(req);
    try {
      const cancelled = await orderService.cancelOrder(orderId, req.body.reason, authContext);
      return successResponse(res, {
        message: 'Order cancelled successfully.',
        data: cancelled,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ORDER_CANCEL_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/orders/customer/:customerId
   */
  async getOrdersByCustomer(req, res) {
    const { customerId } = req.params;
    const authContext = this.extractAuthContext(req);

    try {
      const result = await orderService.listOrders(
        {
          customerId: parseInt(customerId, 10),
          page: req.query.page ? parseInt(req.query.page, 10) : 1,
          limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
        },
        authContext
      );

      return successResponse(res, {
        message: `Orders for customer #${customerId} retrieved successfully.`,
        data: result.orders,
        meta: result.pagination,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'CUSTOMER_ORDERS_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/orders/branch/:branchId
   */
  async getOrdersByBranch(req, res) {
    const { branchId } = req.params;
    const authContext = this.extractAuthContext(req);

    try {
      const result = await orderService.listOrders(
        {
          branchId: parseInt(branchId, 10),
          orderStatus: req.query.orderStatus || null,
          page: req.query.page ? parseInt(req.query.page, 10) : 1,
          limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
        },
        authContext
      );

      return successResponse(res, {
        message: `Orders for branch #${branchId} retrieved successfully.`,
        data: result.orders,
        meta: result.pagination,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'BRANCH_ORDERS_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/orders/:orderId/history
   */
  async getOrderHistory(req, res) {
    const { orderId } = req.params;
    const authContext = this.extractAuthContext(req);

    try {
      const history = await orderService.getOrderHistory(orderId, authContext);
      return successResponse(res, {
        message: 'Order status history retrieved successfully.',
        data: history,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ORDER_HISTORY_FAILED',
        message: error.message,
      });
    }
  }
}

module.exports = new OrderController();
