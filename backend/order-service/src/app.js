/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ORDER SERVICE APPLICATION
 * File: backend/order-service/src/app.js
 * Description: Express application definition for Order placement, lifecycle
 *              status machine, historical snapshots, and idempotency.
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
const orderRoutes = require('./routes/order.routes');

const logger = createServiceLogger('order-service');
const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(correlationIdMiddleware);
app.use(createRequestLogger(logger));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Health probes (unauthenticated)
app.use(healthRoutes);

// 2. Order domain routes (supporting both Gateway prefixed and direct root paths)
app.use(['/api/v1/orders', '/'], orderRoutes);

// 3. Fallback 404 handler
app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource '${req.method} ${req.originalUrl}' does not exist on Order Service.`,
  });
});

// 4. Centralized error middleware
app.use(errorHandler);

module.exports = { app, logger };
