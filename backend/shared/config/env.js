/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SHARED ENVIRONMENT LOADER
 * File: backend/shared/config/env.js
 * Description: Dynamically discovers and loads the single root .env file.
 *              Guarantees strict compliance with the single global .env rule.
 * ============================================================================
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Locate root .env by traversing upwards until found or hitting filesystem root
function resolveRootEnv() {
  let currentDir = __dirname;
  for (let i = 0; i < 5; i++) {
    const candidatePath = path.resolve(currentDir, '.env');
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
  // Default fallback to 3 levels up (backend/shared/config -> root)
  return path.resolve(__dirname, '../../../.env');
}

const envPath = resolveRootEnv();

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // If .env file is not found on disk, rely on environment variables passed by container/OS
  dotenv.config();
}

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  appName: process.env.APP_NAME || 'RestaurantManagementSystem',

  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003')
    .split(',')
    .map(origin => origin.trim()),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 1435,
    database: process.env.DB_NAME || 'RestaurantManagementDB',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Pass@123',
    dialect: process.env.DB_DIALECT || 'mssql',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
    },
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  security: {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'rms_default_jwt_access_secret_key_change_in_prod',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'rms_default_jwt_refresh_secret_key_change_in_prod',
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    internalServiceKey: process.env.INTERNAL_SERVICE_KEY || 'rms_internal_microservice_mesh_secret_token_54321',
  },

  // Aliases for convenience across all services
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'rms_default_jwt_access_secret_key_change_in_prod',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'rms_default_jwt_refresh_secret_key_change_in_prod',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || 'rms_internal_microservice_mesh_secret_token_54321',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  authServiceUrl: process.env.URL_AUTH_SERVICE || 'http://localhost:8001',
  userServiceUrl: process.env.URL_USER_SERVICE || 'http://localhost:8002',

  ports: {
    apiGateway: parseInt(process.env.PORT_API_GATEWAY, 10) || 8000,
    authService: parseInt(process.env.PORT_AUTH_SERVICE, 10) || 8001,
    userService: parseInt(process.env.PORT_USER_SERVICE, 10) || 8002,
    restaurantService: parseInt(process.env.PORT_RESTAURANT_SERVICE, 10) || 8003,
    cmsService: parseInt(process.env.PORT_CMS_SERVICE, 10) || 8004,
    menuService: parseInt(process.env.PORT_MENU_SERVICE, 10) || 8005,
    cartService: parseInt(process.env.PORT_CART_SERVICE, 10) || 8006,
    orderService: parseInt(process.env.PORT_ORDER_SERVICE, 10) || 8007,
    paymentService: parseInt(process.env.PORT_PAYMENT_SERVICE, 10) || 8008,
    inventoryService: parseInt(process.env.PORT_INVENTORY_SERVICE, 10) || 8009,
    kitchenService: parseInt(process.env.PORT_KITCHEN_SERVICE, 10) || 8010,
    reservationService: parseInt(process.env.PORT_RESERVATION_SERVICE, 10) || 8011,
    notificationService: parseInt(process.env.PORT_NOTIFICATION_SERVICE, 10) || 8012,
    reportService: parseInt(process.env.PORT_REPORT_SERVICE, 10) || 8013,
  },

  urls: {
    authService: process.env.URL_AUTH_SERVICE || 'http://localhost:8001',
    userService: process.env.URL_USER_SERVICE || 'http://localhost:8002',
    restaurantService: process.env.URL_RESTAURANT_SERVICE || 'http://localhost:8003',
    cmsService: process.env.URL_CMS_SERVICE || 'http://localhost:8004',
    menuService: process.env.URL_MENU_SERVICE || 'http://localhost:8005',
    cartService: process.env.URL_CART_SERVICE || 'http://localhost:8006',
    orderService: process.env.URL_ORDER_SERVICE || 'http://localhost:8007',
    paymentService: process.env.URL_PAYMENT_SERVICE || 'http://localhost:8008',
    inventoryService: process.env.URL_INVENTORY_SERVICE || 'http://localhost:8009',
    kitchenService: process.env.URL_KITCHEN_SERVICE || 'http://localhost:8010',
    reservationService: process.env.URL_RESERVATION_SERVICE || 'http://localhost:8011',
    notificationService: process.env.URL_NOTIFICATION_SERVICE || 'http://localhost:8012',
    reportService: process.env.URL_REPORT_SERVICE || 'http://localhost:8013',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'no-reply@antigravitybistro.com',
  },
};

module.exports = config;

