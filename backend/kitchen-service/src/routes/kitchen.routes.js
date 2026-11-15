/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - KITCHEN DISPLAY SYSTEM (KDS) ROUTES
 * File: backend/kitchen-service/src/routes/kitchen.routes.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const kitchenController = require('../controllers/kitchen.controller');
const {
  config,
  authenticationMiddleware,
  requireRoles,
  asyncHandler,
} = require('@rms/shared');

// Allows internal service mesh call with X-Internal-Service-Key or staff JWT
const internalOrStaffAuth = (req, res, next) => {
  const providedKey = req.headers['x-internal-service-key'];
  const expectedKey = config.security?.internalServiceKey || config.internalServiceKey;
  if (providedKey && providedKey === expectedKey) {
    req.user = { userId: 1, role: 'SYSTEM' };
    return next();
  }
  return authenticationMiddleware(req, res, next);
};

// Staff Roles allowed for KDS operations
const KDS_STAFF_ROLES = [
  'SUPER_ADMIN',
  'RESTAURANT_MANAGER',
  'KITCHEN_CHEF',
  'KITCHEN_STAFF',
  'WAITSTAFF',
  'CASHIER_POS',
  'POS_OPERATOR',
];

// Active KDS Board & Metrics (preceding parameterized routes)
router.get(
  ['/active', '/api/v1/kds/active'],
  internalOrStaffAuth,
  requireRoles(...KDS_STAFF_ROLES),
  asyncHandler(kitchenController.getActiveBoard.bind(kitchenController))
);

router.get(
  ['/metrics', '/api/v1/kds/metrics'],
  internalOrStaffAuth,
  requireRoles(...KDS_STAFF_ROLES),
  asyncHandler(kitchenController.getMetrics.bind(kitchenController))
);

// KOT Ticket Creation (Accessible by Order Service via mesh or POS staff)
router.post(
  ['/tickets', '/api/v1/kds/tickets'],
  internalOrStaffAuth,
  (req, res, next) => {
    if (req.user?.role === 'SYSTEM') return next();
    return requireRoles(...KDS_STAFF_ROLES)(req, res, next);
  },
  asyncHandler(kitchenController.createKOT.bind(kitchenController))
);

// Order KOT listing & Cancellation
router.get(
  ['/orders/:orderId/tickets', '/api/v1/kds/orders/:orderId/tickets'],
  internalOrStaffAuth,
  requireRoles(...KDS_STAFF_ROLES),
  asyncHandler(kitchenController.getKOTsByOrderId.bind(kitchenController))
);

router.post(
  ['/orders/:orderId/cancel', '/api/v1/kds/orders/:orderId/cancel'],
  internalOrStaffAuth,
  (req, res, next) => {
    if (req.user?.role === 'SYSTEM') return next();
    return requireRoles(...KDS_STAFF_ROLES)(req, res, next);
  },
  asyncHandler(kitchenController.cancelByOrderId.bind(kitchenController))
);

// Individual Item Status Update
router.patch(
  ['/items/:itemId/status', '/api/v1/kds/items/:itemId/status'],
  internalOrStaffAuth,
  requireRoles(...KDS_STAFF_ROLES),
  asyncHandler(kitchenController.updateItemStatus.bind(kitchenController))
);

// KOT Actions: Status, Bump, Chef
router.patch(
  ['/tickets/:id/status', '/api/v1/kds/tickets/:id/status'],
  internalOrStaffAuth,
  requireRoles(...KDS_STAFF_ROLES),
  asyncHandler(kitchenController.updateKOTStatus.bind(kitchenController))
);

router.post(
  ['/tickets/:id/bump', '/api/v1/kds/tickets/:id/bump'],
  internalOrStaffAuth,
  requireRoles(...KDS_STAFF_ROLES),
  asyncHandler(kitchenController.bumpKOT.bind(kitchenController))
);

router.post(
  ['/tickets/:id/assign-chef', '/api/v1/kds/tickets/:id/assign-chef'],
  internalOrStaffAuth,
  requireRoles(...KDS_STAFF_ROLES),
  asyncHandler(kitchenController.assignChef.bind(kitchenController))
);

// Get KOT by ID
router.get(
  ['/tickets/:id', '/api/v1/kds/tickets/:id'],
  internalOrStaffAuth,
  requireRoles(...KDS_STAFF_ROLES),
  asyncHandler(kitchenController.getKOTById.bind(kitchenController))
);

module.exports = router;

