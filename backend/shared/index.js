/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SHARED MODULE EXPORTS
 * File: backend/shared/index.js
 * Description: Master entry point for shared database configuration (mssql pool
 *              and stored procedure execution), Redis client, middlewares, and utilities.
 * ============================================================================
 */

const config = require('./config/env');
const {
  sql,
  getPool,
  closePool,
  executeProcedure,
  query,
  testDbConnection,
} = require('./config/database');
const { getRedisClient, testRedisConnection } = require('./config/redis');
const { createServiceLogger } = require('./utils/logger');
const { successResponse, errorResponse } = require('./utils/response');
const { createHttpClient } = require('./utils/httpClient');
const asyncHandler = require('./utils/asyncHandler');
const validators = require('./validators');

// Middlewares (new standard paths)
const correlationMiddleware = require('./middleware/correlation.middleware');
const authenticationMiddleware = require('./middleware/authentication.middleware');
const {
  requireRoles,
  requirePermissions,
  requireBranch,
} = require('./middleware/authorization.middleware');
const errorMiddleware = require('./middleware/error.middleware');

// Backward compatibility references for existing code
const correlationIdMiddleware = correlationMiddleware;
const serviceAuthMiddleware = require('./middlewares/serviceAuth');
const errorHandler = errorMiddleware;
const createRequestLogger = require('./middlewares/requestLogger');

module.exports = {
  // Config
  config,

  // Database (mssql & stored procedures)
  sql,
  getPool,
  closePool,
  executeProcedure,
  query,
  testDbConnection,

  // Redis
  getRedisClient,
  redisClient: getRedisClient(),
  testRedisConnection,

  // Logging & HTTP
  createServiceLogger,
  logger: createServiceLogger('shared'),
  createHttpClient,
  httpClient: createHttpClient(),
  asyncHandler,
  validators,

  // Response helpers
  successResponse,
  errorResponse,

  // Middleware
  correlationMiddleware,
  authenticationMiddleware,
  authorizationMiddleware: {
    requireRoles,
    requirePermissions,
    requireBranch,
  },
  requireRoles,
  requirePermissions,
  requireBranch,
  errorMiddleware,

  // Backward compatibility aliases
  correlationIdMiddleware,
  serviceAuthMiddleware,
  errorHandler,
  createRequestLogger,
};
