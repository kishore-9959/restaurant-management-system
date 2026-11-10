/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESERVATION SERVICE HEALTH ROUTE
 * File: backend/reservation-service/src/routes/health.js
 * Description: Liveness and Readiness probes for Reservation Service.
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
    message: 'Reservation Service process is alive',
    data: {
      status: 'UP',
      service: 'rms-reservation-service',
      port: config.ports.reservationService,
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
    message: isReady ? 'Reservation Service is ready to accept traffic' : 'Reservation Service dependencies unavailable',
    data: {
      status: isReady ? 'UP' : 'DOWN',
      service: 'rms-reservation-service',
      port: config.ports.reservationService,
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
