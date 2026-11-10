/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION SERVICE HEALTH ROUTE
 * File: backend/notification-service/src/routes/health.js
 * Description: Liveness and Readiness probes for Notification Service (DB + Socket.IO).
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { config, testDbConnection, successResponse } = require('@rms/shared');
const { getSocketServer } = require('../socket');

// 1. Liveness Probe: Verifies the Node.js process is responsive
router.get('/health/live', (req, res) => {
  const mem = process.memoryUsage();
  return successResponse(res, {
    statusCode: 200,
    message: 'Notification Service process is alive',
    data: {
      status: 'UP',
      service: 'rms-notification-service',
      port: config.ports.notificationService,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// 2. Readiness Probe: Verifies database connectivity and Socket.IO hub readiness
async function checkReadiness(req, res) {
  const dbHealth = await testDbConnection();
  const io = getSocketServer();
  const socketClientCount = io ? io.engine?.clientsCount || 0 : 0;
  const isReady = dbHealth.healthy === true;

  return successResponse(res, {
    statusCode: isReady ? 200 : 503,
    message: isReady ? 'Notification Service is ready to accept traffic' : 'Notification Service dependencies unavailable',
    data: {
      status: isReady ? 'UP' : 'DOWN',
      service: 'rms-notification-service',
      port: config.ports.notificationService,
      uptimeSeconds: Math.floor(process.uptime()),
      socketConnections: socketClientCount,
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
