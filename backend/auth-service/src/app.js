/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE APPLICATION
 * File: backend/auth-service/src/app.js
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
const authRoutes = require('./routes/authRoutes');
const internalRoutes = require('./routes/internalRoutes');

const logger = createServiceLogger('auth-service');
const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(correlationIdMiddleware);
app.use(createRequestLogger(logger));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Probes
app.use(healthRoutes);

// Internal service-to-service routes (supports both /api/v1/auth/internal and /internal)
app.use(['/api/v1/auth/internal', '/internal'], internalRoutes);

// Public & protected Auth API routes (supports both /api/v1/auth and root / for reverse proxies)
app.use(['/api/v1/auth', '/'], authRoutes);

// 404 Handler
app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource '${req.method} ${req.originalUrl}' does not exist on Auth Service.`,
  });
});

app.use(errorHandler);

module.exports = { app, logger };
