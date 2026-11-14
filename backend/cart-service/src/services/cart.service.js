/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CART SERVICE
 * File: backend/cart-service/src/services/cart.service.js
 * Description: Business logic for shopping cart sessions, authoritative menu
 *              validation via Menu Service HTTP APIs, precise monetary calculations.
 * ============================================================================
 */

const { config, httpClient, createServiceLogger } = require('@rms/shared');
const { cartRepository } = require('../repositories');

const logger = createServiceLogger('cart-service');

class CartService {
  /**
   * Helper for precise 2-decimal monetary rounding
   */
  roundCurrency(amount) {
    return Math.round((parseFloat(amount) + Number.EPSILON) * 100) / 100;
  }

  /**
   * Validates cart ownership against authenticated user or session token
   */
  validateCartOwnership(cart, { userId = null, sessionToken = null, roles = [], isInternalService = false }) {
    if (!cart) return;

    // Internal services, Super Admin & Managers can inspect any cart
    if (
      isInternalService ||
      roles.includes('SUPER_ADMIN') ||
      roles.includes('RESTAURANT_MANAGER') ||
      roles.includes('SYSTEM') ||
      userId === 'system'
    ) {
      return;
    }

    // If cart is bound to a registered user
    if (cart.userId && userId && Number(cart.userId) !== Number(userId)) {
      const error = new Error("Access denied. You do not have permission to view or modify another customer's cart.");
      error.statusCode = 403;
      error.code = 'CART_ACCESS_FORBIDDEN';
      throw error;
    }

    // If guest cart and session token is provided
    if (!cart.userId && cart.sessionToken && sessionToken && cart.sessionToken !== sessionToken) {
      const error = new Error('Invalid cart session token.');
      error.statusCode = 403;
      error.code = 'INVALID_CART_SESSION';
      throw error;
    }
  }

  /**
   * Fetch authoritative item details from Menu Service via HTTP
   */
  async fetchMenuItemAuthoritative(menuItemId) {
    try {
      const response = await httpClient.get(`${config.urls.menuService}/api/v1/menu/items/${menuItemId}`);
      return response.data?.data || null;
    } catch (err) {
      logger.warn(`Failed to fetch menu item ${menuItemId} from Menu Service: ${err.message}`);
      const error = new Error(`Menu item #${menuItemId} not found or Menu Service is unavailable.`);
      error.statusCode = err.status === 404 ? 404 : 502;
      error.code = err.status === 404 ? 'MENU_ITEM_NOT_FOUND' : 'MENU_SERVICE_UNAVAILABLE';
      throw error;
    }
  }

  /**
   * Get or create a cart
   */
  async getOrCreateCart({ branchId, userId = null, sessionToken, tableId = null }) {
    const finalSessionToken = sessionToken || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return await cartRepository.getOrCreate({
      branchId: parseInt(branchId, 10),
      userId,
      sessionToken: finalSessionToken,
      tableId,
    });
  }

  /**
   * Get cart by ID with ownership validation
   */
  async getCartById(cartId, authContext = {}) {
    const cart = await cartRepository.getById(cartId);
    if (!cart) {
      const error = new Error(`Cart #${cartId} not found.`);
      error.statusCode = 404;
      error.code = 'CART_NOT_FOUND';
      throw error;
    }
    this.validateCartOwnership(cart, authContext);
    return cart;
  }

  /**
   * Get cart summary (totals, item count, breakdown)
   */
  async getCartSummary(cartId, authContext = {}) {
    const cart = await this.getCartById(cartId, authContext);
    return {
      cartId: cart.cartId,
      branchId: cart.branchId,
      branchName: cart.branchName,
      tableId: cart.tableId,
      tableNumber: cart.tableNumber,
      totalItemsCount: cart.totalItemsCount,
      subTotal: this.roundCurrency(cart.subTotal),
      taxTotal: this.roundCurrency(cart.taxTotal),
      grandTotal: this.roundCurrency(cart.grandTotal),
      itemNames: cart.items.map((i) => i.itemName),
    };
  }

  /**
   * Add item to cart with authoritative Menu Service validation
   */
  async addItemToCart(cartId, itemPayload, authContext = {}) {
    const cart = await this.getCartById(cartId, authContext);

    const { menuItemId, variantId, quantity = 1, specialInstructions, addons = [] } = itemPayload;

    // 1. Fetch authoritative menu item from Menu Service
    const menuItem = await this.fetchMenuItemAuthoritative(menuItemId);

    // 2. Validate Branch Association
    if (menuItem.BranchId !== cart.branchId) {
      const error = new Error(
        `Menu item '${menuItem.ItemName}' belongs to branch #${menuItem.BranchId}, but this cart is for branch #${cart.branchId}.`
      );
      error.statusCode = 400;
      error.code = 'BRANCH_MISMATCH';
      throw error;
    }

    // 3. Validate Availability (The "86" check)
    if (!menuItem.IsAvailable) {
      const error = new Error(`Item '${menuItem.ItemName}' is currently 86 (Out of Stock).`);
      error.statusCode = 400;
      error.code = 'ITEM_OUT_OF_STOCK';
      throw error;
    }

    // 4. Validate Selected Variant (if any)
    let unitPrice = parseFloat(menuItem.BasePrice);
    let selectedVariant = null;

    if (variantId) {
      selectedVariant = menuItem.variants?.find(
        (v) => parseInt(v.VariantId || v.variantId, 10) === parseInt(variantId, 10)
      );
      if (!selectedVariant) {
        const error = new Error(`Selected variant #${variantId} is invalid for '${menuItem.ItemName}'.`);
        error.statusCode = 400;
        error.code = 'INVALID_VARIANT';
        throw error;
      }
      if (!selectedVariant.IsAvailable) {
        const error = new Error(`Variant '${selectedVariant.VariantName}' is currently out of stock.`);
        error.statusCode = 400;
        error.code = 'VARIANT_OUT_OF_STOCK';
        throw error;
      }
      unitPrice += parseFloat(selectedVariant.PriceAdjustment || 0.00);
    }

    // 5. Validate Selected Addons (if any)
    const authoritativeAddons = [];
    if (Array.isArray(addons) && addons.length > 0) {
      // Flatten allowed addon items from all linked groups
      const allowedAddonItemsMap = new Map();
      for (const group of menuItem.addonGroups || []) {
        for (const item of group.items || []) {
          allowedAddonItemsMap.set(parseInt(item.addonItemId || item.AddonItemId, 10), item);
        }
      }

      for (const reqAddon of addons) {
        const addonId = parseInt(reqAddon.addonItemId, 10);
        const match = allowedAddonItemsMap.get(addonId);
        if (!match) {
          const error = new Error(`Addon item #${addonId} is not available for '${menuItem.ItemName}'.`);
          error.statusCode = 400;
          error.code = 'INVALID_ADDON';
          throw error;
        }
        if (!match.isAvailable && !match.IsAvailable) {
          const error = new Error(`Addon '${match.itemName || match.ItemName}' is currently out of stock.`);
          error.statusCode = 400;
          error.code = 'ADDON_OUT_OF_STOCK';
          throw error;
        }

        authoritativeAddons.push({
          addonItemId: match.addonItemId || match.AddonItemId,
          unitPrice: this.roundCurrency(match.price || match.Price),
        });
      }
    }

    // 6. Execute Cart Stored Procedure
    const updatedCart = await cartRepository.addItem({
      cartId,
      menuItemId,
      variantId: variantId ? parseInt(variantId, 10) : null,
      quantity: parseInt(quantity, 10) || 1,
      unitPrice: this.roundCurrency(unitPrice),
      specialInstructions,
      addons: authoritativeAddons,
    });

    return updatedCart;
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(cartItemId, quantity, authContext = {}) {
    const updatedCart = await cartRepository.updateItemQuantity(cartItemId, parseInt(quantity, 10));
    if (!updatedCart) {
      const error = new Error(`Cart item #${cartItemId} not found.`);
      error.statusCode = 404;
      error.code = 'CART_ITEM_NOT_FOUND';
      throw error;
    }
    this.validateCartOwnership(updatedCart, authContext);
    return updatedCart;
  }

  /**
   * Remove item from cart
   */
  async removeItem(cartItemId, authContext = {}) {
    const updatedCart = await cartRepository.removeItem(cartItemId);
    if (!updatedCart) {
      const error = new Error(`Cart item #${cartItemId} not found.`);
      error.statusCode = 404;
      error.code = 'CART_ITEM_NOT_FOUND';
      throw error;
    }
    this.validateCartOwnership(updatedCart, authContext);
    return updatedCart;
  }

  /**
   * Clear entire cart
   */
  async clearCart(cartId, authContext = {}) {
    const cart = await this.getCartById(cartId, authContext);
    const result = await cartRepository.clear(cart.cartId);
    return {
      cartId: cart.cartId,
      cleared: true,
      message: 'All items removed from cart.',
    };
  }
}

module.exports = new CartService();
