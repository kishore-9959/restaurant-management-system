/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CART SERVICE APPLICATION
 * File: backend/cart-service/src/app.js
 * Description: Express application definition for Shopping Cart operations,
 *              live item addition, quantity updates, and monetary calculations.
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
const cartRoutes = require('./routes/cart.routes');

const logger = createServiceLogger('cart-service');
const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(correlationIdMiddleware);
app.use(createRequestLogger(logger));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Health probes (unauthenticated)
app.use(healthRoutes);

// 2. Cart domain routes (supporting both Gateway prefixed and direct root paths)
app.use(['/api/v1/cart', '/'], cartRoutes);

// 3. Fallback 404 handler
app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource '${req.method} ${req.originalUrl}' does not exist on Cart Service.`,
  });
});

// 4. Centralized error middleware
app.use(errorHandler);

module.exports = { app, logger };
