/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - API GATEWAY APPLICATION
 * File: backend/api-gateway/src/app.js
 * Description: Ingress Express application mounting security, rate limiting,
 *              authentication guards, reverse proxies, and health endpoints.
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
} = require('../../shared');

const { services } = require('./config/gatewayConfig');
const authGuard = require('./middlewares/authGuard');
const rbacGuard = require('./middlewares/rbacGuard');
const { publicRateLimiter } = require('./middlewares/rateLimiter');
const { createServiceProxy } = require('./proxy/serviceProxy');
const healthRoutes = require('./routes/health');

const logger = createServiceLogger('api-gateway');
const app = express();

// 1. Core Security & CORS
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser callers (curl, mobile, postman) or matching whitelist
    if (!origin || config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

// 2. Distributed Tracing & Request Logging
app.use(correlationIdMiddleware);
app.use(createRequestLogger(logger));

// 3. Health check route (unrestricted)
app.use(healthRoutes);

// 4. Ingress Rate Limiting
app.use(publicRateLimiter);

// 5. Ingress Authentication & RBAC Guard Pipeline
app.use(authGuard);
app.use(rbacGuard);

// 6. Socket.IO WebSocket Proxy (before body parser)
app.use('/socket.io', createServiceProxy(config.urls.notificationService, 'notification-service'));

// 7. Request Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 8. Register Microservice Reverse Proxy Routes
services.forEach((svc) => {
  logger.info(`Mounting proxy route: ${svc.prefix} -> ${svc.target} (${svc.name})`);
  app.use(svc.prefix, createServiceProxy(svc.target, svc.name));
});

// 9. 404 Handler for Unmatched Routes
app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource '${req.method} ${req.originalUrl}' does not exist on API Gateway.`,
    details: {
      availablePrefixes: services.map((s) => s.prefix),
    },
  });
});

// 10. Global Error Handler
app.use(errorHandler);

module.exports = { app, logger };

