/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MENU SERVICE APPLICATION
 * File: backend/menu-service/src/app.js
 * Description: Express application definition for Categories, Menu Items,
 *              Variants, Addon Groups, Pricing, Availability ("86") and Redis Catalog.
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
const categoryRoutes = require('./routes/category.routes');
const menuItemRoutes = require('./routes/menuItem.routes');
const addonRoutes = require('./routes/addon.routes');
const publicMenuRoutes = require('./routes/publicMenu.routes');

const logger = createServiceLogger('menu-service');
const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(correlationIdMiddleware);
app.use(createRequestLogger(logger));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Health probes (unauthenticated)
app.use(healthRoutes);

// 2. Public customer catalog & items (unauthenticated, Redis-cached)
app.use(['/api/v1/menu/public', '/public'], publicMenuRoutes);

// 3. Admin-prefixed alias routes (matches Gateway RBAC pattern /api/v1/menu/admin/...)
app.use(['/api/v1/menu/admin/categories', '/admin/categories'], categoryRoutes);
app.use(['/api/v1/menu/admin/items', '/admin/items'], menuItemRoutes);
app.use(['/api/v1/menu/admin/addons', '/admin/addons'], addonRoutes);
app.use(['/api/v1/menu/admin', '/admin'], publicMenuRoutes); // for /admin/cache/purge

// 4. Standard business domain routes (supporting Gateway prefixed and direct root paths)
app.use(['/api/v1/menu/categories', '/categories'], categoryRoutes);
app.use(['/api/v1/menu/items', '/items'], menuItemRoutes);
app.use(['/api/v1/menu/addons', '/addons'], addonRoutes);

// 5. Fallback 404 handler
app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource '${req.method} ${req.originalUrl}' does not exist on Menu Service.`,
  });
});

// 6. Centralized error middleware
app.use(errorHandler);

module.exports = { app, logger };
