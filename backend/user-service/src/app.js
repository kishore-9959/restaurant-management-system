/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE APPLICATION
 * File: backend/user-service/src/app.js
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
const customerRoutes = require('./routes/customerRoutes');
const staffRoutes = require('./routes/staffRoutes');
const userRoutes = require('./routes/userRoutes');
const internalRoutes = require('./routes/internalRoutes');

const logger = createServiceLogger('user-service');
const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(correlationIdMiddleware);
app.use(createRequestLogger(logger));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Probes
app.use(healthRoutes);

// Internal service-to-service endpoints
app.use(['/api/v1/users/internal', '/internal'], internalRoutes);

// Staff management endpoints
app.use(['/api/v1/users/staff', '/staff'], staffRoutes);

// Customer endpoints (/profile, /addresses)
app.use(['/api/v1/users', '/'], customerRoutes);

// General User administration endpoints (/, /:id, /:id/status)
app.use(['/api/v1/users', '/'], userRoutes);

// 404 Handler
app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource '${req.method} ${req.originalUrl}' does not exist on User Service.`,
  });
});

app.use(errorHandler);

module.exports = { app, logger };
