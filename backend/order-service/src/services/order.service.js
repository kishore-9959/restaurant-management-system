/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ORDER SERVICE
 * File: backend/order-service/src/services/order.service.js
 * Description: Order lifecycle coordinator, Redis idempotency enforcement,
 *              inter-service REST orchestration, pricing snapshot preservation,
 *              and status transitions.
 * ============================================================================
 */

const { config, httpClient, getRedisClient, createServiceLogger } = require('@rms/shared');
const { orderRepository } = require('../repositories');

const logger = createServiceLogger('order-service');

class OrderService {
  /**
   * Helper for precise 2-decimal monetary rounding
   */
  roundCurrency(amount) {
    return Math.round((parseFloat(amount) + Number.EPSILON) * 100) / 100;
  }

  /**
   * Enforces customer ownership on order access
   */
  validateOrderOwnership(order, { userId = null, roles = [], isInternalService = false }) {
    if (!order) return;
    if (
      isInternalService ||
      roles.includes('SUPER_ADMIN') ||
      roles.includes('RESTAURANT_MANAGER') ||
      roles.includes('WAITSTAFF') ||
      roles.includes('CASHIER_POS') ||
      roles.includes('KITCHEN_CHEF') ||
      roles.includes('SYSTEM') ||
      userId === 'system'
    ) {
      return; // Staff & internal services can view orders for operations
    }
    if (order.customerId && userId && Number(order.customerId) !== Number(userId)) {
      const error = new Error("Access denied. You do not have permission to view or manage another customer's order.");
      error.statusCode = 403;
      error.code = 'ORDER_ACCESS_FORBIDDEN';
      throw error;
    }
  }

  /**
   * Idempotency check: Look up previously processed order by idempotency key
   */
  async checkIdempotency(idempotencyKey) {
    if (!idempotencyKey) return null;
    try {
      const redis = getRedisClient();
      const cached = await redis.get(`idempotency:order:${idempotencyKey}`);
      if (cached) {
        logger.info(`[Idempotency HIT] Returning previously created order for key: ${idempotencyKey}`);
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.warn(`Redis idempotency lookup warning: ${err.message}`);
    }
    return null;
  }

  /**
   * Idempotency cache: Store completed order response in Redis (24-hour TTL)
   */
  async recordIdempotency(idempotencyKey, orderData) {
    if (!idempotencyKey) return;
    try {
      const redis = getRedisClient();
      await redis.setex(`idempotency:order:${idempotencyKey}`, 86400, JSON.stringify(orderData));
      logger.info(`[Idempotency RECORDED] Order #${orderData.orderNumber} saved for key: ${idempotencyKey}`);
    } catch (err) {
      logger.warn(`Redis idempotency cache set warning: ${err.message}`);
    }
  }

  /**
   * Orchestrates complete Order Placement
   */
  async placeOrder(payload, authContext = {}) {
    const { idempotencyKey } = authContext;

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existing = await this.checkIdempotency(idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const {
      cartId,
      orderType = 'DINE_IN',
      tableId,
      guestName,
      guestPhone,
      deliveryAddressId,
      customerNotes,
      packagingCharge = 0.00,
      serviceCharge = 0.00,
    } = payload;

    const customerId = authContext.userId || null;

    // 2. Retrieve Cart from Cart Service via HTTP REST
    let cart = null;
    try {
      const cartRes = await httpClient.get(`${config.urls.cartService}/api/v1/cart/${cartId}`);
      cart = cartRes.data?.data || null;
    } catch (err) {
      const error = new Error(`Failed to retrieve cart #${cartId}: ${err.message}`);
      error.statusCode = err.status || 400;
      error.code = err.code || 'CART_RETRIEVAL_FAILED';
      throw error;
    }

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      const error = new Error('Cannot place an order with an empty cart.');
      error.statusCode = 400;
      error.code = 'EMPTY_CART';
      throw error;
    }

    // 3. Verify Cart Ownership
    if (cart.userId && customerId && Number(cart.userId) !== Number(customerId)) {
      const error = new Error("Cannot place an order for another customer's cart.");
      error.statusCode = 403;
      error.code = 'CART_OWNERSHIP_MISMATCH';
      throw error;
    }

    const branchId = cart.branchId;

    // 4. Order Type specific validations via inter-service HTTP
    let finalTableId = tableId || cart.tableId || null;
    let finalDeliveryAddressId = deliveryAddressId || null;

    if (orderType === 'DINE_IN') {
      if (finalTableId) {
        try {
          const tableRes = await httpClient.get(`${config.urls.restaurantService}/api/v1/tables/${finalTableId}`);
          const table = tableRes.data?.data;
          if (!table || table.BranchId !== branchId) {
            const error = new Error(`Table #${finalTableId} does not belong to branch #${branchId}.`);
            error.statusCode = 400;
            error.code = 'INVALID_TABLE';
            throw error;
          }
        } catch (err) {
          const error = new Error(`Dining table validation failed: ${err.message}`);
          error.statusCode = 400;
          error.code = 'TABLE_VALIDATION_FAILED';
          throw error;
        }
      }
    } else if (orderType === 'DELIVERY') {
      if (!finalDeliveryAddressId) {
        const error = new Error("Field 'deliveryAddressId' is required for DELIVERY orders.");
        error.statusCode = 400;
        error.code = 'DELIVERY_ADDRESS_REQUIRED';
        throw error;
      }
      try {
        const addrRes = await httpClient.get(`${config.urls.userService}/api/v1/users/addresses/${finalDeliveryAddressId}`, {
          headers: {
            ...(authContext.token && { Authorization: `Bearer ${authContext.token}` }),
          },
        });
        const address = addrRes.data?.data;
        if (!address) {
          const error = new Error(`Delivery address #${finalDeliveryAddressId} not found.`);
          error.statusCode = 400;
          error.code = 'ADDRESS_NOT_FOUND';
          throw error;
        }
      } catch (err) {
        const error = new Error(`Delivery address validation failed: ${err.message}`);
        error.statusCode = 400;
        error.code = 'ADDRESS_VALIDATION_FAILED';
        throw error;
      }
    }

    // 5. Re-verify Menu Items Availability and build Historical Pricing Snapshots
    const orderItems = [];
    let calculatedSubTotal = 0.00;
    let calculatedTaxTotal = 0.00;

    for (const item of cart.items) {
      let menuItem = null;
      try {
        const menuRes = await httpClient.get(`${config.urls.menuService}/api/v1/menu/items/${item.menuItemId}`);
        menuItem = menuRes.data?.data;
      } catch (err) {
        const error = new Error(`Menu item #${item.menuItemId} is no longer available.`);
        error.statusCode = 400;
        error.code = 'ITEM_UNAVAILABLE';
        throw error;
      }

      if (!menuItem.IsAvailable) {
        const error = new Error(`Item '${menuItem.ItemName}' is currently 86 (Out of Stock). Please remove it from cart.`);
        error.statusCode = 400;
        error.code = 'ITEM_OUT_OF_STOCK';
        throw error;
      }

      let unitPrice = parseFloat(menuItem.BasePrice);
      let variantNameSnapshot = null;

      if (item.variantId) {
        const variant = menuItem.variants?.find(
          (v) => parseInt(v.VariantId || v.variantId, 10) === parseInt(item.variantId, 10)
        );
        if (!variant || !variant.IsAvailable) {
          const error = new Error(`Variant for '${menuItem.ItemName}' is currently out of stock.`);
          error.statusCode = 400;
          error.code = 'VARIANT_OUT_OF_STOCK';
          throw error;
        }
        unitPrice += parseFloat(variant.PriceAdjustment || 0.00);
        variantNameSnapshot = variant.VariantName || variant.variantName;
      }

      const itemTotal = this.roundCurrency(unitPrice * item.quantity);
      calculatedSubTotal += itemTotal;

      // Addons
      const orderItemAddons = [];
      let itemAddonTotal = 0.00;

      for (const addon of item.addons || []) {
        const addonTotal = this.roundCurrency(addon.unitPrice * addon.quantity);
        itemAddonTotal += addonTotal;
        orderItemAddons.push({
          addonItemId: addon.addonItemId,
          addonNameSnapshot: addon.addonItemName,
          unitPrice: this.roundCurrency(addon.unitPrice),
          quantity: addon.quantity,
          totalPrice: addonTotal,
        });
      }

      calculatedSubTotal += itemAddonTotal;

      // Calculate tax for this item + its addons based on menu configured tax %
      const itemTaxRate = (parseFloat(menuItem.TaxPercentage) || 5.00) / 100.0;
      const itemTax = this.roundCurrency((itemTotal + itemAddonTotal) * itemTaxRate);
      calculatedTaxTotal += itemTax;

      orderItems.push({
        menuItemId: item.menuItemId,
        variantId: item.variantId || null,
        itemNameSnapshot: menuItem.ItemName,
        variantNameSnapshot,
        unitPrice: this.roundCurrency(unitPrice),
        quantity: item.quantity,
        itemTotal,
        specialInstructions: item.specialInstructions || null,
        addons: orderItemAddons,
      });
    }

    calculatedSubTotal = this.roundCurrency(calculatedSubTotal);
    calculatedTaxTotal = this.roundCurrency(calculatedTaxTotal);

    const finalPackagingCharge = orderType === 'TAKEAWAY' || orderType === 'DELIVERY' ? this.roundCurrency(packagingCharge || 20.00) : 0.00;
    const finalServiceCharge = orderType === 'DINE_IN' ? this.roundCurrency(serviceCharge || 0.00) : 0.00;
    const finalGrandTotal = this.roundCurrency(calculatedSubTotal + calculatedTaxTotal + finalPackagingCharge + finalServiceCharge);

    // 6. Create Order Transactionally via Stored Procedure
    const order = await orderRepository.create({
      branchId,
      orderType,
      tableId: finalTableId,
      customerId,
      guestName: guestName || cart.userName || null,
      guestPhone: guestPhone || cart.userEmail || null,
      deliveryAddressId: finalDeliveryAddressId,
      waitstaffUserId: authContext.roles?.includes('WAITSTAFF') ? authContext.userId : null,
      customerNotes,
      subTotal: calculatedSubTotal,
      taxTotal: calculatedTaxTotal,
      serviceCharge: finalServiceCharge,
      packagingCharge: finalPackagingCharge,
      discountTotal: 0.00,
      grandTotal: finalGrandTotal,
      estimatedDeliveryMinutes: orderType === 'DELIVERY' ? 35 : (orderType === 'TAKEAWAY' ? 20 : 15),
      items: orderItems,
    });

    // 7. Clear the cart in Cart Service
    try {
      await httpClient.delete(`${config.urls.cartService}/api/v1/cart`, {
        params: { cartId: cart.cartId },
      });
      logger.info(`Cart #${cart.cartId} cleared after order placement #${order.orderNumber}`);
    } catch (clearErr) {
      logger.warn(`Failed to clear cart #${cart.cartId} post-order: ${clearErr.message}`);
    }

    // 8. Cache Idempotency result
    if (idempotencyKey) {
      await this.recordIdempotency(idempotencyKey, order);
    }

    return order;
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId, authContext = {}) {
    const order = await orderRepository.getById(orderId);
    if (!order) {
      const error = new Error(`Order #${orderId} not found.`);
      error.statusCode = 404;
      error.code = 'ORDER_NOT_FOUND';
      throw error;
    }
    this.validateOrderOwnership(order, authContext);
    return order;
  }

  /**
   * Get order by Order Number
   */
  async getOrderByNumber(orderNumber, authContext = {}) {
    const order = await orderRepository.getByNumber(orderNumber);
    if (!order) {
      const error = new Error(`Order '${orderNumber}' not found.`);
      error.statusCode = 404;
      error.code = 'ORDER_NOT_FOUND';
      throw error;
    }
    this.validateOrderOwnership(order, authContext);
    return order;
  }

  /**
   * List orders with pagination and filtering
   */
  async listOrders(filters, authContext = {}) {
    // If regular customer, enforce customerId filter
    if (authContext.userId && !authContext.roles?.some((r) => ['SUPER_ADMIN', 'RESTAURANT_MANAGER', 'WAITSTAFF', 'CASHIER_POS'].includes(r))) {
      filters.customerId = authContext.userId;
    }
    return await orderRepository.list(filters);
  }

  /**
   * Update order status with state machine checks
   */
  async updateOrderStatus(orderId, newStatus, authContext = {}, notes = null) {
    const order = await orderRepository.getById(orderId);
    if (!order) {
      const error = new Error(`Order #${orderId} not found.`);
      error.statusCode = 404;
      error.code = 'ORDER_NOT_FOUND';
      throw error;
    }

    const validTransitions = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['SERVED', 'COMPLETED'],
      SERVED: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[order.orderStatus] || [];
    if (!allowed.includes(newStatus)) {
      const error = new Error(`Cannot transition order from '${order.orderStatus}' to '${newStatus}'.`);
      error.statusCode = 400;
      error.code = 'INVALID_STATUS_TRANSITION';
      throw error;
    }

    const updated = await orderRepository.updateStatus({
      orderId,
      newStatus,
      changedByUserId: authContext.userId || null,
      notes,
    });

    return updated;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId, reason, authContext = {}) {
    const order = await orderRepository.getById(orderId);
    if (!order) {
      const error = new Error(`Order #${orderId} not found.`);
      error.statusCode = 404;
      error.code = 'ORDER_NOT_FOUND';
      throw error;
    }

    this.validateOrderOwnership(order, authContext);

    if (order.orderStatus === 'COMPLETED' || order.orderStatus === 'CANCELLED') {
      const error = new Error(`Cannot cancel an order that is already ${order.orderStatus}.`);
      error.statusCode = 400;
      error.code = 'CANNOT_CANCEL_ORDER';
      throw error;
    }

    // Cancellation policy: customers may cancel while PENDING or CONFIRMED
    const isStaff = authContext.roles?.some((r) =>
      ['SUPER_ADMIN', 'RESTAURANT_MANAGER', 'WAITSTAFF', 'CASHIER_POS'].includes(r)
    );
    if (!isStaff && !['PENDING', 'CONFIRMED'].includes(order.orderStatus)) {
      const error = new Error(
        `Cannot cancel order in '${order.orderStatus}' status. Orders in preparation or ready cannot be cancelled by customers.`
      );
      error.statusCode = 400;
      error.code = 'ORDER_NOT_CANCELLABLE';
      throw error;
    }

    const cancelled = await orderRepository.cancel({
      orderId,
      cancelledByUserId: authContext.userId || null,
      cancelReason: reason,
    });

    return cancelled;
  }

  /**
   * Get status history for an order
   */
  async getOrderHistory(orderId, authContext = {}) {
    const order = await this.getOrderById(orderId, authContext);
    return await orderRepository.getStatusHistory(order.orderId);
  }
}

module.exports = new OrderService();
