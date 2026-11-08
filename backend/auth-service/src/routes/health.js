/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE HEALTH ROUTE
 * File: backend/auth-service/src/routes/health.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { config, testDbConnection, successResponse } = require('../../shared');

router.get('/health', async (req, res) => {
  const dbHealth = await testDbConnection();

  return successResponse(res, {
    statusCode: dbHealth.healthy || config.isDevelopment ? 200 : 503,
    message: 'Auth Service operational',
    data: {
      status: dbHealth.healthy ? 'healthy' : 'degraded',
      service: 'rms-auth-service',
      port: config.ports.authService,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth,
      },
    },
  });
});

module.exports = router;

