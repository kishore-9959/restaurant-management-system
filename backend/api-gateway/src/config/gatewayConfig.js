/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - API GATEWAY ROUTE CONFIGURATION
 * File: backend/api-gateway/src/config/gatewayConfig.js
 * Description: Master ingress route definitions, downstream microservice URLs,
 *              public route whitelists, and role-based access rules.
 * ============================================================================
 */

const { config } = require('@rms/shared');

const services = [
  {
    prefix: '/api/v1/auth',
    target: config.urls.authService,
    name: 'auth-service',
  },
  {
    prefix: '/api/v1/users',
    target: config.urls.userService,
    name: 'user-service',
  },
  {
    prefix: '/api/v1/restaurants',
    target: config.urls.restaurantService,
    name: 'restaurant-service',
  },
  {
    prefix: '/api/v1/branches',
    target: config.urls.restaurantService,
    name: 'restaurant-service',
  },
  {
    prefix: '/api/v1/sections',
    target: config.urls.restaurantService,
    name: 'restaurant-service',
  },
  {
    prefix: '/api/v1/tables',
    target: config.urls.restaurantService,
    name: 'restaurant-service',
  },
  {
    prefix: '/api/v1/shifts',
    target: config.urls.restaurantService,
    name: 'restaurant-service',
  },
  {
    prefix: '/api/v1/cms',
    target: config.urls.cmsService,
    name: 'cms-service',
  },
  {
    prefix: '/api/v1/menu',
    target: config.urls.menuService,
    name: 'menu-service',
  },
  {
    prefix: '/api/v1/cart',
    target: config.urls.cartService,
    name: 'cart-service',
  },
  {
    prefix: '/api/v1/orders',
    target: config.urls.orderService,
    name: 'order-service',
  },
  {
    prefix: '/api/v1/payments',
    target: config.urls.paymentService,
    name: 'payment-service',
  },
  {
    prefix: '/api/v1/inventory',
    target: config.urls.inventoryService,
    name: 'inventory-service',
  },
  {
    prefix: '/api/v1/kds',
    target: config.urls.kitchenService,
    name: 'kitchen-service',
  },
  {
    prefix: '/api/v1/reservations',
    target: config.urls.reservationService,
    name: 'reservation-service',
  },
  {
    prefix: '/api/v1/notifications',
    target: config.urls.notificationService,
    name: 'notification-service',
  },
  {
    prefix: '/api/v1/reports',
    target: config.urls.reportService,
    name: 'report-service',
  },
];

// Routes accessible without a JWT access token
const publicRoutePatterns = [
  /^\/api\/v1\/auth\/(login|staff-login|register|pos-pin-login|refresh-token|logout|forgot-password|reset-password)$/,
  /^\/api\/v1\/cms\/public(\/.*)?$/,
  /^\/api\/v1\/menu\/public(\/.*)?$/,
  /^\/api\/v1\/tables\/qr\/[a-zA-Z0-9_-]+$/,
  /^\/api\/v1\/cart(\/.*)?$/,
  /^\/api\/v1\/payments\/razorpay\/webhook$/,
  /^\/health(\/.*)?$/,
];

// RBAC restrictions for specific route prefixes
const rbacRules = [
  {
    pattern: /^\/api\/v1\/cms\/admin(\/.*)?$/,
    allowedRoles: ['SUPER_ADMIN', 'RESTAURANT_MANAGER'],
  },
  {
    pattern: /^\/api\/v1\/menu\/admin(\/.*)?$/,
    allowedRoles: ['SUPER_ADMIN', 'RESTAURANT_MANAGER'],
  },
  {
    pattern: /^\/api\/v1\/inventory(\/.*)?$/,
    allowedRoles: ['SUPER_ADMIN', 'RESTAURANT_MANAGER', 'KITCHEN_CHEF'],
  },
  {
    pattern: /^\/api\/v1\/kds(\/.*)?$/,
    allowedRoles: ['KITCHEN_CHEF', 'RESTAURANT_MANAGER', 'SUPER_ADMIN'],
  },
  {
    pattern: /^\/api\/v1\/shifts(\/.*)?$/,
    allowedRoles: ['CASHIER_POS', 'RESTAURANT_MANAGER', 'SUPER_ADMIN'],
  },
  {
    pattern: /^\/api\/v1\/reports(\/.*)?$/,
    allowedRoles: ['SUPER_ADMIN', 'RESTAURANT_MANAGER'],
  },
];

module.exports = {
  services,
  publicRoutePatterns,
  rbacRules,
};

