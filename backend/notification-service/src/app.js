/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION SERVICE APPLICATION
 * File: backend/notification-service/src/app.js
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const {
  config,
  createServiceLogger,
  correlationIdMiddleware,
  createRequestLogger,
  errorHandler,
  errorResponse,
} = require('../../shared');

const healthRoutes = require('./routes/health');
const internalRoutes = require('./routes/internal');

const logger = createServiceLogger('notification-service');
const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(correlationIdMiddleware);
app.use(createRequestLogger(logger));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(healthRoutes);
app.use('/api/v1/notifications/internal', internalRoutes);

app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource '${req.method} ${req.originalUrl}' does not exist on Notification Service.`,
  });
});

app.use(errorHandler);

module.exports = { app, logger };

