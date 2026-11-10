/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - INVENTORY SERVICE APPLICATION
 * File: backend/inventory-service/src/app.js
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
} = require('@rms/shared');

const healthRoutes = require('./routes/health');

const logger = createServiceLogger('inventory-service');
const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(correlationIdMiddleware);
app.use(createRequestLogger(logger));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(healthRoutes);

app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource '${req.method} ${req.originalUrl}' does not exist on Inventory Service.`,
  });
});

app.use(errorHandler);

module.exports = { app, logger };

