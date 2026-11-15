/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - INVENTORY SERVICE HEALTH ROUTE
 * File: backend/inventory-service/src/routes/health.js
 * Description: Liveness and Readiness probes for Inventory Service.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { config, testDbConnection, testRedisConnection, successResponse } = require('@rms/shared');

// 1. Liveness Probe: Verifies the Node.js process is responsive
router.get(['/health/live', '/api/v1/inventory/health/live'], (req, res) => {
  const mem = process.memoryUsage();
  return successResponse(res, {
    statusCode: 200,
    message: 'Inventory Service process is alive',
    data: {
      status: 'UP',
      service: 'rms-inventory-service',
      port: config.ports.inventoryService,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// 2. Readiness Probe: Verifies database and Redis connectivity
async function checkReadiness(req, res) {
  const [dbHealth, redisHealth] = await Promise.all([
    testDbConnection(),
    testRedisConnection(),
  ]);

  const isReady = dbHealth.healthy === true && redisHealth.healthy === true;

  return successResponse(res, {
    statusCode: isReady ? 200 : 503,
    message: isReady ? 'Inventory Service is ready to accept traffic' : 'Inventory Service dependencies unavailable',
    data: {
      status: isReady ? 'UP' : 'DOWN',
      service: 'rms-inventory-service',
      port: config.ports.inventoryService,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth,
        redis: redisHealth,
      },
    },
  });
}

router.get(['/health/ready', '/api/v1/inventory/health/ready'], checkReadiness);
router.get(['/health', '/api/v1/inventory/health'], checkReadiness);

module.exports = router;
