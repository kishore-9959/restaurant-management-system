/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CART ROUTES
 * File: backend/cart-service/src/routes/cart.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, asyncHandler } = require('@rms/shared');
const cartController = require('../controllers/cart.controller');

// Optional authentication middleware: attaches user if token present, permits guest if omitted
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return authenticationMiddleware(req, res, next);
}

// Summary endpoint (before parameterized :cartId)
router.get('/summary', optionalAuth, asyncHandler(cartController.getCartSummary.bind(cartController)));

// Base Cart endpoints
router.get('/', optionalAuth, asyncHandler(cartController.getCart.bind(cartController)));
router.post('/', optionalAuth, asyncHandler(cartController.getCart.bind(cartController)));
router.get('/:cartId', optionalAuth, asyncHandler(cartController.getCartById.bind(cartController)));
router.delete('/', optionalAuth, asyncHandler(cartController.clearCart.bind(cartController)));

// Cart Items endpoints
router.post('/items', optionalAuth, asyncHandler(cartController.addItem.bind(cartController)));
router.put('/items/:cartItemId', optionalAuth, asyncHandler(cartController.updateItemQuantity.bind(cartController)));
router.delete('/items/:cartItemId', optionalAuth, asyncHandler(cartController.removeItem.bind(cartController)));

module.exports = router;
