/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ORDER SERVICE HEALTH ROUTE
 * File: backend/order-service/src/routes/health.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { config, testDbConnection, successResponse } = require('../../shared');

router.get('/health', async (req, res) => {
  const dbHealth = await testDbConnection();

  return successResponse(res, {
    statusCode: dbHealth.healthy || config.isDevelopment ? 200 : 503,
    message: 'Order Service operational',
    data: {
      status: dbHealth.healthy ? 'healthy' : 'degraded',
      service: 'rms-order-service',
      port: config.ports.orderService,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth,
      },
    },
  });
});

module.exports = router;

