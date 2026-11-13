/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESTAURANT SERVICE APPLICATION
 * File: backend/restaurant-service/src/app.js
 * Description: Express application definition for Restaurant, Branch,
 *              Dining Section, Table and Floor operations.
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
const restaurantRoutes = require('./routes/restaurant.routes');
const branchRoutes = require('./routes/branch.routes');
const diningSectionRoutes = require('./routes/diningSection.routes');
const diningTableRoutes = require('./routes/diningTable.routes');

const logger = createServiceLogger('restaurant-service');
const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(correlationIdMiddleware);
app.use(createRequestLogger(logger));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Health probes (unauthenticated)
app.use(healthRoutes);

// 2. Business domain routes (supporting both Gateway prefixed and direct root paths)
app.use(['/api/v1/restaurants', '/restaurants'], restaurantRoutes);
app.use(['/api/v1/branches', '/branches'], branchRoutes);
app.use(['/api/v1/sections', '/sections'], diningSectionRoutes);
app.use(['/api/v1/tables', '/tables'], diningTableRoutes);

// 3. Fallback 404 handler
app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource '${req.method} ${req.originalUrl}' does not exist on Restaurant Service.`,
  });
});

// 4. Centralized error middleware
app.use(errorHandler);

module.exports = { app, logger };
