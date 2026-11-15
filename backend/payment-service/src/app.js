/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PAYMENT SERVICE APPLICATION
 * File: backend/payment-service/src/app.js
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
const paymentRoutes = require('./routes/payment.routes');
const webhookRoutes = require('./routes/webhook.routes');
const refundRoutes = require('./routes/refund.routes');
const reportRoutes = require('./routes/report.routes');

const logger = createServiceLogger('payment-service');
const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(correlationIdMiddleware);
app.use(createRequestLogger(logger));

// Capture raw body for cryptographic webhook HMAC verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Health Probes
app.use(healthRoutes);

// Public Webhooks
app.use(webhookRoutes);

// Protected Payments, Refunds, and Financial Reports
app.use(paymentRoutes);
app.use(refundRoutes);
app.use(reportRoutes);

// 404 Fallback
app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource '${req.method} ${req.originalUrl}' does not exist on Payment Service.`,
  });
});

app.use(errorHandler);

module.exports = { app, logger };
