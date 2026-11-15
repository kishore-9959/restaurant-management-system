/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - INVENTORY SERVICE APPLICATION
 * File: backend/inventory-service/src/app.js
 * Description: Express application definition for Stock Inventory, Bill of Materials (BOM),
 *              Vendor Suppliers, and Consumption Auditing.
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
  authenticationMiddleware,
  requireRoles,
  asyncHandler,
} = require('@rms/shared');

const healthRoutes = require('./routes/health');
const ingredientRoutes = require('./routes/ingredient.routes');
const supplierRoutes = require('./routes/supplier.routes');
const stockRoutes = require('./routes/stock.routes');
const recipeRoutes = require('./routes/recipe.routes');
const bomRoutes = require('./routes/bom.routes');
const reportRoutes = require('./routes/report.routes');

const stockController = require('./controllers/stock.controller');

const logger = createServiceLogger('inventory-service');
const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(correlationIdMiddleware);
app.use(createRequestLogger(logger));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Health probes (unauthenticated)
app.use(healthRoutes);

// 2. Direct standalone routes for alerts and transactions (supports both Gateway prefixed and relative paths)
app.get(
  ['/api/v1/inventory/alerts/low-stock', '/alerts/low-stock'],
  authenticationMiddleware,
  asyncHandler(stockController.getLowStockAlerts)
);

app.get(
  ['/api/v1/inventory/transactions', '/transactions'],
  authenticationMiddleware,
  requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER', 'KITCHEN_CHEF', 'CHEF'),
  asyncHandler(stockController.getTransactions)
);

// 3. Domain module routers
app.use(['/api/v1/inventory/ingredients', '/ingredients'], ingredientRoutes);
app.use(['/api/v1/inventory/suppliers', '/suppliers'], supplierRoutes);
app.use(['/api/v1/inventory/stock', '/stock'], stockRoutes);
app.use(['/api/v1/inventory/recipes', '/recipes'], recipeRoutes);
app.use(['/api/v1/inventory/bom', '/bom'], bomRoutes);
app.use(['/api/v1/inventory/reports', '/reports'], reportRoutes);

// 4. Fallback 404 handler
app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource '${req.method} ${req.originalUrl}' does not exist on Inventory Service.`,
  });
});

// 5. Centralized error handling middleware
app.use(errorHandler);

module.exports = { app, logger };
