/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CART CONTROLLER
 * File: backend/cart-service/src/controllers/cart.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const cartService = require('../services/cart.service');
const { validateAddToCartPayload, validateUpdateQuantityPayload } = require('../validators');

class CartController {
  extractAuthContext(req) {
    return {
      userId: req.user?.userId || null,
      roles: req.user?.roles || [],
      isInternalService: Boolean(req.isInternalService || req.user?.userType === 'INTERNAL_SERVICE'),
      sessionToken: req.headers['x-session-token'] || req.query.sessionToken || null,
    };
  }

  /**
   * GET or POST /api/v1/cart
   * Retrieve active cart for customer or session (or create if not existing)
   */
  async getCart(req, res) {
    const branchId = req.body?.branchId || req.query?.branchId;
    const cartId = req.body?.cartId || req.query?.cartId;
    const tableId = req.body?.tableId || req.query?.tableId;
    const authContext = this.extractAuthContext(req);

    try {
      if (cartId) {
        const cart = await cartService.getCartById(cartId, authContext);
        return successResponse(res, {
          message: 'Cart retrieved successfully.',
          data: cart,
        });
      }

      if (!branchId) {
        return errorResponse(res, {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: "Parameter 'branchId' or 'cartId' is required.",
        });
      }

      const cart = await cartService.getOrCreateCart({
        branchId: parseInt(branchId, 10),
        userId: authContext.userId,
        sessionToken: authContext.sessionToken,
        tableId: tableId ? parseInt(tableId, 10) : null,
      });

      return successResponse(res, {
        message: 'Cart retrieved successfully.',
        data: cart,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'CART_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/cart/:cartId
   */
  async getCartById(req, res) {
    const { cartId } = req.params;
    const authContext = this.extractAuthContext(req);

    try {
      const cart = await cartService.getCartById(cartId, authContext);
      return successResponse(res, {
        message: 'Cart retrieved successfully.',
        data: cart,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'CART_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/cart/summary
   */
  async getCartSummary(req, res) {
    const cartId = req.query.cartId || req.params.cartId;
    if (!cartId) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Query parameter 'cartId' is required.",
      });
    }

    const authContext = this.extractAuthContext(req);
    try {
      const summary = await cartService.getCartSummary(cartId, authContext);
      return successResponse(res, {
        message: 'Cart summary retrieved successfully.',
        data: summary,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'CART_SUMMARY_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/cart/items
   */
  async addItem(req, res) {
    const validation = validateAddToCartPayload(req.body);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid add to cart payload.',
        details: validation.errors,
      });
    }

    const authContext = this.extractAuthContext(req);
    let cartId = req.body.cartId || req.query.cartId;

    try {
      // Auto-create cart if cartId wasn't passed but branchId was
      if (!cartId) {
        if (!req.body.branchId) {
          return errorResponse(res, {
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            message: "Field 'cartId' or 'branchId' is required to add an item.",
          });
        }
        const newCart = await cartService.getOrCreateCart({
          branchId: parseInt(req.body.branchId, 10),
          userId: authContext.userId,
          sessionToken: authContext.sessionToken,
          tableId: req.body.tableId ? parseInt(req.body.tableId, 10) : null,
        });
        cartId = newCart.cartId;
      }

      const updatedCart = await cartService.addItemToCart(cartId, req.body, authContext);
      return successResponse(res, {
        statusCode: 201,
        message: 'Item added to cart successfully.',
        data: updatedCart,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'ADD_TO_CART_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/v1/cart/items/:cartItemId
   */
  async updateItemQuantity(req, res) {
    const { cartItemId } = req.params;
    const validation = validateUpdateQuantityPayload(req.body);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid update quantity payload.',
        details: validation.errors,
      });
    }

    const authContext = this.extractAuthContext(req);
    try {
      const updatedCart = await cartService.updateItemQuantity(cartItemId, req.body.quantity, authContext);
      return successResponse(res, {
        message: 'Cart item quantity updated successfully.',
        data: updatedCart,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'UPDATE_CART_ITEM_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/v1/cart/items/:cartItemId
   */
  async removeItem(req, res) {
    const { cartItemId } = req.params;
    const authContext = this.extractAuthContext(req);

    try {
      const updatedCart = await cartService.removeItem(cartItemId, authContext);
      return successResponse(res, {
        message: 'Item removed from cart successfully.',
        data: updatedCart,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'REMOVE_CART_ITEM_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/v1/cart
   */
  async clearCart(req, res) {
    const cartId = req.body?.cartId || req.query?.cartId;
    if (!cartId) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Parameter 'cartId' is required.",
      });
    }

    const authContext = this.extractAuthContext(req);
    try {
      const result = await cartService.clearCart(cartId, authContext);
      return successResponse(res, {
        message: 'Cart cleared successfully.',
        data: result,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'CLEAR_CART_FAILED',
        message: error.message,
      });
    }
  }
}

module.exports = new CartController();
