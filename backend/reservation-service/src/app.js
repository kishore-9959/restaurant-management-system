/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESERVATION SERVICE APPLICATION
 * File: backend/reservation-service/src/app.js
 * Description: Express application definition for Reservation Service.
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
const customerRoutes = require('./routes/customer.routes');
const adminRoutes = require('./routes/admin.routes');

const logger = createServiceLogger('reservation-service');
const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(correlationIdMiddleware);
app.use(createRequestLogger(logger));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health checks
app.use(healthRoutes);

// Public reservation routes (unauthenticated)
app.use('/api/v1/reservations/public', publicRoutes);
app.use('/public', publicRoutes);

// Customer personal bookings (authenticated customer)
app.use('/api/v1/reservations/my-bookings', customerRoutes);
app.use('/my-bookings', customerRoutes);

// Admin / staff reservation routes (authenticated staff/manager)
app.use('/api/v1/reservations', adminRoutes);
app.use('/', adminRoutes);

app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource '${req.method} ${req.originalUrl}' does not exist on Reservation Service.`,
  });
});

app.use(errorHandler);

module.exports = { app, logger };
