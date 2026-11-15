/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ORDER ROUTES
 * File: backend/order-service/src/routes/order.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { config, authenticationMiddleware, requireRoles, asyncHandler } = require('@rms/shared');
const orderController = require('../controllers/order.controller');

// Allows internal service mesh call with X-Internal-Service-Key or staff JWT
const internalOrJwtAuth = (req, res, next) => {
  const providedKey = req.headers['x-internal-service-key'];
  const expectedKey = config.security?.internalServiceKey || config.internalServiceKey;
  if (providedKey && providedKey === expectedKey) {
    req.user = { userId: 1, role: 'SYSTEM' };
    return next();
  }
  return authenticationMiddleware(req, res, next);
};

// 1. Specific static sub-paths (Must precede parameterized :orderId)
router.get('/number/:orderNumber', authenticationMiddleware, asyncHandler(orderController.getOrderByNumber.bind(orderController)));
router.get('/customer/:customerId', authenticationMiddleware, asyncHandler(orderController.getOrdersByCustomer.bind(orderController)));
router.get(
  '/branch/:branchId',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER', 'WAITSTAFF', 'CASHIER_POS', 'KITCHEN_CHEF'),
  asyncHandler(orderController.getOrdersByBranch.bind(orderController))
);

// 2. Base Order collection
router.get('/', authenticationMiddleware, asyncHandler(orderController.listOrders.bind(orderController)));
router.post('/', authenticationMiddleware, asyncHandler(orderController.createOrder.bind(orderController)));

// 3. Order Item / Status Actions
router.put(
  '/:orderId/status',
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER', 'KITCHEN_CHEF', 'WAITSTAFF', 'CASHIER_POS'),
  asyncHandler(orderController.updateStatus.bind(orderController))
);

router.post('/:orderId/cancel', authenticationMiddleware, asyncHandler(orderController.cancelOrder.bind(orderController)));
router.get('/:orderId/history', authenticationMiddleware, asyncHandler(orderController.getOrderHistory.bind(orderController)));
router.patch(
  ['/:orderId/payment-status', '/api/v1/orders/:orderId/payment-status'],
  internalOrJwtAuth,
  asyncHandler(orderController.updatePaymentStatus.bind(orderController))
);

// 4. Order by ID
router.get('/:orderId', authenticationMiddleware, asyncHandler(orderController.getOrderById.bind(orderController)));

module.exports = router;

