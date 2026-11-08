/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CMS SERVICE HEALTH ROUTE
 * File: backend/cms-service/src/routes/health.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { config, testDbConnection, testRedisConnection, successResponse } = require('../../shared');

router.get('/health', async (req, res) => {
  const [dbHealth, redisHealth] = await Promise.all([
    testDbConnection(),
    testRedisConnection(),
  ]);

  const isHealthy = dbHealth.healthy && redisHealth.healthy;

  return successResponse(res, {
    statusCode: isHealthy || config.isDevelopment ? 200 : 503,
    message: 'CMS Service operational',
    data: {
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'rms-cms-service',
      port: config.ports.cmsService,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth,
        redis: redisHealth,
      },
    },
  });
});

module.exports = router;

