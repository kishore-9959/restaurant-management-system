/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESTAURANT SERVICE MIDDLEWARES
 * File: backend/restaurant-service/src/middleware/index.js
 * ============================================================================
 */

const {
  authenticationMiddleware,
  requireRoles,
  requireBranch,
} = require('@rms/shared');

module.exports = {
  authenticate: authenticationMiddleware,
  requireRoles,
  requireBranch,
  requireSuperAdmin: requireRoles('SUPER_ADMIN'),
  requireManagerOrAbove: requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'),
  requireStaffOrAbove: requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER', 'CASHIER_POS', 'WAITSTAFF', 'KITCHEN_CHEF'),
};
