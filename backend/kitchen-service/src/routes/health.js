/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - KITCHEN SERVICE HEALTH ROUTE
 * File: backend/kitchen-service/src/routes/health.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { config, testDbConnection, successResponse } = require('../../shared');

router.get('/health', async (req, res) => {
  const dbHealth = await testDbConnection();

  return successResponse(res, {
    statusCode: dbHealth.healthy || config.isDevelopment ? 200 : 503,
    message: 'Kitchen Service operational',
    data: {
      status: dbHealth.healthy ? 'healthy' : 'degraded',
      service: 'rms-kitchen-service',
      port: config.ports.kitchenService,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth,
      },
    },
  });
});

module.exports = router;

