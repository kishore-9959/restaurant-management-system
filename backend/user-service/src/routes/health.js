/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE HEALTH ROUTE
 * File: backend/user-service/src/routes/health.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { config, testDbConnection, successResponse } = require('../../shared');

router.get('/health', async (req, res) => {
  const dbHealth = await testDbConnection();

  return successResponse(res, {
    statusCode: dbHealth.healthy || config.isDevelopment ? 200 : 503,
    message: 'User Service operational',
    data: {
      status: dbHealth.healthy ? 'healthy' : 'degraded',
      service: 'rms-user-service',
      port: config.ports.userService,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth,
      },
    },
  });
});

module.exports = router;

