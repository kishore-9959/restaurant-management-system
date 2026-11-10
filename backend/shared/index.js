/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SHARED MODULE EXPORTS
 * File: backend/shared/index.js
 * Description: Master entry point for shared configurations, database connection,
 *              Redis client, logging, and common middlewares.
 * ============================================================================
 */

const config = require('./config/env');
const { sequelize, Sequelize, testDbConnection } = require('./config/database');
const { getRedisClient, testRedisConnection } = require('./config/redis');
const { createServiceLogger } = require('./utils/logger');
const { successResponse, errorResponse } = require('./utils/response');
const { createHttpClient } = require('./utils/httpClient');
const correlationIdMiddleware = require('./middlewares/correlationId');
const serviceAuthMiddleware = require('./middlewares/serviceAuth');
const errorHandler = require('./middlewares/errorHandler');
const createRequestLogger = require('./middlewares/requestLogger');

module.exports = {
  config,
  sequelize,
  Sequelize,
  DataTypes: Sequelize.DataTypes,
  testDbConnection,
  getRedisClient,
  redisClient: getRedisClient(),
  testRedisConnection,
  createServiceLogger,
  successResponse,
  errorResponse,
  createHttpClient,
  httpClient: createHttpClient(),
  correlationIdMiddleware,
  serviceAuthMiddleware,
  errorHandler,
  createRequestLogger,
};

