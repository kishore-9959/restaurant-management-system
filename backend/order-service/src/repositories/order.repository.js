/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ORDER REPOSITORY
 * File: backend/order-service/src/repositories/order.repository.js
 * Description: Data access methods for Orders, Items, Addons, and Status History
 *              using SQL Server Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class OrderRepository {
  /**
   * Helper to format multi-recordsets into a cohesive Order model
   * @param {Array<Array<object>>} recordsets
   */
  formatOrder(recordsets) {
    const header = recordsets?.[0]?.[0] || null;
    if (!header) return null;

    const rawItems = recordsets?.[1] || [];
    const rawAddons = recordsets?.[2] || [];
    const rawHistory = recordsets?.[3] || [];

    // Map addons by OrderItemId
    const addonsByItem = new Map();
    for (const addon of rawAddons) {
      if (!addonsByItem.has(addon.OrderItemId)) {
        addonsByItem.set(addon.OrderItemId, []);
      }
      addonsByItem.get(addon.OrderItemId).push({
        orderItemAddonId: addon.OrderItemAddonId,
        orderItemId: addon.OrderItemId,
        addonItemId: addon.AddonItemId,
        addonNameSnapshot: addon.AddonNameSnapshot,
        unitPrice: parseFloat(addon.UnitPrice),
        quantity: addon.Quantity,
        totalPrice: parseFloat(addon.TotalPrice),
      });
    }

    // Attach addons to each OrderItem
    const items = rawItems.map((item) => ({
      orderItemId: item.OrderItemId,
      orderId: item.OrderId,
      menuItemId: item.MenuItemId,
      variantId: item.VariantId,
      itemNameSnapshot: item.ItemNameSnapshot,
      variantNameSnapshot: item.VariantNameSnapshot,
      unitPrice: parseFloat(item.UnitPrice),
      quantity: item.Quantity,
      itemTotal: parseFloat(item.ItemTotal),
      specialInstructions: item.SpecialInstructions,
      itemStatus: item.ItemStatus,
      createdAt: item.CreatedAt,
      updatedAt: item.UpdatedAt,
      addons: addonsByItem.get(item.OrderItemId) || [],
    }));

    // Status history
    const history = rawHistory.map((h) => ({
      historyId: h.HistoryId,
      orderId: h.OrderId,
      previousStatus: h.PreviousStatus,
      newStatus: h.NewStatus,
      changedByUserId: h.ChangedByUserId,
      changedByName: h.ChangedByName,
      notes: h.Notes,
      changedAt: h.ChangedAt,
    }));

    return {
      orderId: header.OrderId,
      branchId: header.BranchId,
      branchName: header.BranchName,
      orderNumber: header.OrderNumber,
      orderType: header.OrderType,
      tableId: header.TableId,
      tableNumber: header.TableNumber,
      sectionName: header.SectionName,
      customerId: header.CustomerId,
      customerName: header.CustomerName,
      customerEmail: header.CustomerEmail,
      customerPhone: header.CustomerPhone,
      guestName: header.GuestName,
      guestPhone: header.GuestPhone,
      deliveryAddressId: header.DeliveryAddressId,
      deliveryAddressLine: header.DeliveryAddressLine,
      deliveryCity: header.DeliveryCity,
      deliveryPostalCode: header.DeliveryPostalCode,
      waitstaffUserId: header.WaitstaffUserId,
      waitstaffName: header.WaitstaffName,
      orderStatus: header.OrderStatus,
      paymentStatus: header.PaymentStatus,
      subTotal: parseFloat(header.SubTotal),
      taxTotal: parseFloat(header.TaxTotal),
      serviceCharge: parseFloat(header.ServiceCharge),
      packagingCharge: parseFloat(header.PackagingCharge),
      discountTotal: parseFloat(header.DiscountTotal),
      tipAmount: parseFloat(header.TipAmount),
      grandTotal: parseFloat(header.GrandTotal),
      customerNotes: header.CustomerNotes,
      voidReason: header.VoidReason,
      estimatedDeliveryMinutes: header.EstimatedDeliveryMinutes,
      createdAt: header.CreatedAt,
      updatedAt: header.UpdatedAt,
      items,
      statusHistory: history,
    };
  }

  /**
   * Create a new order with items and addons transactionally
   */
  async create(data) {
    const result = await executeProcedure('dbo.usp_Order_Create', {
      BranchId: parseInt(data.branchId, 10),
      OrderType: data.orderType || 'DINE_IN',
      TableId: data.tableId ? parseInt(data.tableId, 10) : null,
      CustomerId: data.customerId ? parseInt(data.customerId, 10) : null,
      GuestName: data.guestName || null,
      GuestPhone: data.guestPhone || null,
      DeliveryAddressId: data.deliveryAddressId ? parseInt(data.deliveryAddressId, 10) : null,
      WaitstaffUserId: data.waitstaffUserId ? parseInt(data.waitstaffUserId, 10) : null,
      CustomerNotes: data.customerNotes || null,
      SubTotal: parseFloat(data.subTotal),
      TaxTotal: parseFloat(data.taxTotal),
      ServiceCharge: data.serviceCharge !== undefined ? parseFloat(data.serviceCharge) : 0.00,
      PackagingCharge: data.packagingCharge !== undefined ? parseFloat(data.packagingCharge) : 0.00,
      DiscountTotal: data.discountTotal !== undefined ? parseFloat(data.discountTotal) : 0.00,
      GrandTotal: parseFloat(data.grandTotal),
      EstimatedDeliveryMinutes: data.estimatedDeliveryMinutes ? parseInt(data.estimatedDeliveryMinutes, 10) : null,
      ItemsJson: JSON.stringify(data.items),
    });
    return this.formatOrder(result.recordsets);
  }

  /**
   * Get order by ID
   */
  async getById(orderId) {
    const result = await executeProcedure('dbo.usp_Order_GetById', {
      OrderId: parseInt(orderId, 10),
    });
    return this.formatOrder(result.recordsets);
  }

  /**
   * Get order by Human-Readable Order Number (e.g. ORD-20261114-0001)
   */
  async getByNumber(orderNumber) {
    const result = await executeProcedure('dbo.usp_Order_GetByNumber', {
      OrderNumber: orderNumber,
    });
    return this.formatOrder(result.recordsets);
  }

  /**
   * List orders with filtering and pagination
   */
  async list({
    branchId = null,
    customerId = null,
    orderStatus = null,
    paymentStatus = null,
    orderType = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 20,
  }) {
    const result = await executeProcedure('dbo.usp_Order_List', {
      BranchId: branchId ? parseInt(branchId, 10) : null,
      CustomerId: customerId ? parseInt(customerId, 10) : null,
      OrderStatus: orderStatus || null,
      PaymentStatus: paymentStatus || null,
      OrderType: orderType || null,
      StartDate: startDate || null,
      EndDate: endDate || null,
      Page: parseInt(page, 10) || 1,
      Limit: parseInt(limit, 10) || 20,
    });

    const orders = (result.recordset || []).map((o) => ({
      orderId: o.OrderId,
      branchId: o.BranchId,
      branchName: o.BranchName,
      orderNumber: o.OrderNumber,
      orderType: o.OrderType,
      tableId: o.TableId,
      tableNumber: o.TableNumber,
      customerId: o.CustomerId,
      customerName: o.CustomerName,
      guestName: o.GuestName,
      guestPhone: o.GuestPhone,
      orderStatus: o.OrderStatus,
      paymentStatus: o.PaymentStatus,
      subTotal: parseFloat(o.SubTotal),
      taxTotal: parseFloat(o.TaxTotal),
      grandTotal: parseFloat(o.GrandTotal),
      totalItems: o.TotalItems,
      createdAt: o.CreatedAt,
      updatedAt: o.UpdatedAt,
    }));

    const totalCount = result.recordset?.[0]?.TotalCount || 0;
    const totalPages = result.recordset?.[0]?.TotalPages || 1;

    return {
      orders,
      pagination: {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
        totalCount,
        totalPages,
      },
    };
  }

  /**
   * Update order status with state machine checks
   */
  async updateStatus({ orderId, newStatus, changedByUserId = null, notes = null }) {
    const result = await executeProcedure('dbo.usp_Order_UpdateStatus', {
      OrderId: parseInt(orderId, 10),
      NewStatus: newStatus,
      ChangedByUserId: changedByUserId ? parseInt(changedByUserId, 10) : null,
      Notes: notes || null,
    });
    return this.formatOrder(result.recordsets);
  }

  /**
   * Cancel order
   */
  async cancel({ orderId, cancelledByUserId = null, cancelReason }) {
    const result = await executeProcedure('dbo.usp_Order_Cancel', {
      OrderId: parseInt(orderId, 10),
      CancelledByUserId: cancelledByUserId ? parseInt(cancelledByUserId, 10) : null,
      CancelReason: cancelReason,
    });
    return this.formatOrder(result.recordsets);
  }

  /**
   * Get status history for an order
   */
  async getStatusHistory(orderId) {
    const result = await executeProcedure('dbo.usp_Order_GetStatusHistory', {
      OrderId: parseInt(orderId, 10),
    });
    return (result.recordset || []).map((h) => ({
      historyId: h.HistoryId,
      orderId: h.OrderId,
      previousStatus: h.PreviousStatus,
      newStatus: h.NewStatus,
      changedByUserId: h.ChangedByUserId,
      changedByName: h.ChangedByName,
      notes: h.Notes,
      changedAt: h.ChangedAt,
    }));
  }
}

module.exports = new OrderRepository();

