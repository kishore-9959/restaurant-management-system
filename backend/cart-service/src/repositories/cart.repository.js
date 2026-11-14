/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CART REPOSITORY
 * File: backend/cart-service/src/repositories/cart.repository.js
 * Description: Data access methods for Shopping Carts using SQL Server Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class CartRepository {
  /**
   * Helper to format multi-recordsets into a cohesive Cart model
   * @param {Array<Array<object>>} recordsets
   */
  formatCart(recordsets) {
    const header = recordsets?.[0]?.[0] || null;
    if (!header) return null;

    const rawItems = recordsets?.[1] || [];
    const rawAddons = recordsets?.[2] || [];

    // Map addons by CartItemId
    const addonsByItem = new Map();
    for (const addon of rawAddons) {
      if (!addonsByItem.has(addon.CartItemId)) {
        addonsByItem.set(addon.CartItemId, []);
      }
      addonsByItem.get(addon.CartItemId).push({
        cartItemAddonId: addon.CartItemAddonId,
        cartItemId: addon.CartItemId,
        addonItemId: addon.AddonItemId,
        addonItemName: addon.AddonItemName,
        unitPrice: parseFloat(addon.UnitPrice),
        quantity: addon.Quantity,
        totalPrice: parseFloat(addon.TotalPrice),
      });
    }

    // Attach addons to each CartItem
    const items = rawItems.map((item) => ({
      cartItemId: item.CartItemId,
      cartId: item.CartId,
      menuItemId: item.MenuItemId,
      itemCode: item.ItemCode,
      itemName: item.ItemName,
      dietaryType: item.DietaryType,
      spicyLevel: item.SpicyLevel,
      variantId: item.VariantId,
      variantName: item.VariantName,
      quantity: item.Quantity,
      unitPrice: parseFloat(item.UnitPrice),
      totalPrice: parseFloat(item.TotalPrice),
      specialInstructions: item.SpecialInstructions,
      primaryImageUrl: item.PrimaryImageUrl,
      createdAt: item.CreatedAt,
      updatedAt: item.UpdatedAt,
      addons: addonsByItem.get(item.CartItemId) || [],
    }));

    return {
      cartId: header.CartId,
      branchId: header.BranchId,
      branchName: header.BranchName,
      tableId: header.TableId,
      tableNumber: header.TableNumber,
      userId: header.UserId,
      userName: header.UserName,
      userEmail: header.UserEmail,
      sessionToken: header.SessionToken,
      subTotal: parseFloat(header.SubTotal),
      taxTotal: parseFloat(header.TaxTotal),
      grandTotal: parseFloat(header.GrandTotal),
      totalItemsCount: header.TotalItemsCount || items.reduce((acc, curr) => acc + curr.quantity, 0),
      createdAt: header.CreatedAt,
      updatedAt: header.UpdatedAt,
      expiresAt: header.ExpiresAt,
      items,
    };
  }

  /**
   * Get or initialize a customer / guest cart
   */
  async getOrCreate({ branchId, userId = null, sessionToken, tableId = null }) {
    const result = await executeProcedure('dbo.usp_Cart_GetOrCreate', {
      BranchId: parseInt(branchId, 10),
      UserId: userId ? parseInt(userId, 10) : null,
      SessionToken: sessionToken,
      TableId: tableId ? parseInt(tableId, 10) : null,
    });
    return this.formatCart(result.recordsets);
  }

  /**
   * Get cart by ID
   */
  async getById(cartId) {
    const result = await executeProcedure('dbo.usp_Cart_GetById', {
      CartId: parseInt(cartId, 10),
    });
    return this.formatCart(result.recordsets);
  }

  /**
   * Get cart by User ID or Session Token
   */
  async getByCustomerOrSession({ userId = null, sessionToken = null, branchId = null }) {
    const result = await executeProcedure('dbo.usp_Cart_GetByCustomerOrSession', {
      UserId: userId ? parseInt(userId, 10) : null,
      SessionToken: sessionToken || null,
      BranchId: branchId ? parseInt(branchId, 10) : null,
    });
    return this.formatCart(result.recordsets);
  }

  /**
   * Add item to cart
   */
  async addItem({
    cartId,
    menuItemId,
    variantId = null,
    quantity = 1,
    unitPrice,
    specialInstructions = null,
    addons = [],
  }) {
    const addonsJson = addons.length > 0 ? JSON.stringify(addons) : null;

    const result = await executeProcedure('dbo.usp_Cart_AddItem', {
      CartId: parseInt(cartId, 10),
      MenuItemId: parseInt(menuItemId, 10),
      VariantId: variantId ? parseInt(variantId, 10) : null,
      Quantity: parseInt(quantity, 10) || 1,
      UnitPrice: parseFloat(unitPrice),
      SpecialInstructions: specialInstructions || null,
      AddonsJson: addonsJson,
    });
    return this.formatCart(result.recordsets);
  }

  /**
   * Update cart item quantity
   */
  async updateItemQuantity(cartItemId, quantity) {
    const result = await executeProcedure('dbo.usp_Cart_UpdateItemQuantity', {
      CartItemId: parseInt(cartItemId, 10),
      Quantity: parseInt(quantity, 10),
    });
    return this.formatCart(result.recordsets);
  }

  /**
   * Remove item from cart
   */
  async removeItem(cartItemId) {
    const result = await executeProcedure('dbo.usp_Cart_RemoveItem', {
      CartItemId: parseInt(cartItemId, 10),
    });
    return this.formatCart(result.recordsets);
  }

  /**
   * Clear all items from cart
   */
  async clear(cartId) {
    const result = await executeProcedure('dbo.usp_Cart_Clear', {
      CartId: parseInt(cartId, 10),
    });
    return result.recordset?.[0] || null;
  }
}

module.exports = new CartRepository();

