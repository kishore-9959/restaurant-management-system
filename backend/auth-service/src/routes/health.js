/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE HEALTH ROUTE
 * File: backend/auth-service/src/routes/health.js
 * Description: Liveness and Readiness probes for Auth Service.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { config, testDbConnection, successResponse } = require('@rms/shared');

// 1. Liveness Probe: Verifies the Node.js process is responsive
router.get('/health/live', (req, res) => {
  const mem = process.memoryUsage();
  return successResponse(res, {
    statusCode: 200,
    message: 'Auth Service process is alive',
    data: {
      status: 'UP',
      service: 'rms-auth-service',
      port: config.ports.authService,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// 2. Readiness Probe: Verifies database connectivity
async function checkReadiness(req, res) {
  const dbHealth = await testDbConnection();
  const isReady = dbHealth.healthy === true;

  return successResponse(res, {
    statusCode: isReady ? 200 : 503,
    message: isReady ? 'Auth Service is ready to accept traffic' : 'Auth Service dependencies unavailable',
    data: {
      status: isReady ? 'UP' : 'DOWN',
      service: 'rms-auth-service',
      port: config.ports.authService,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth,
      },
    },
  });
}

router.get('/health/ready', checkReadiness);
router.get('/health', checkReadiness);

module.exports = router;
