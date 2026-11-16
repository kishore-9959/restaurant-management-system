/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CMS SERVICE APPLICATION
 * File: backend/cms-service/src/app.js
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
const publicRoutes = require('./routes/public.routes');
const adminRoutes = require('./routes/admin.routes');

const logger = createServiceLogger('cms-service');
const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(correlationIdMiddleware);
app.use(createRequestLogger(logger));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Probes
app.use(healthRoutes);

// CMS Public Routes
app.use('/api/v1/cms/public', publicRoutes);
app.use('/public', publicRoutes);

// CMS Admin Routes
app.use('/api/v1/cms/admin', adminRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource '${req.method} ${req.originalUrl}' does not exist on CMS Service.`,
  });
});

app.use(errorHandler);

module.exports = { app, logger };
