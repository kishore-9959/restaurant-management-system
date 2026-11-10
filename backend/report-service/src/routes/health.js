/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT SERVICE HEALTH ROUTE
 * File: backend/report-service/src/routes/health.js
 * Description: Liveness and Readiness probes for Report Service (Stateless Aggregator).
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { config, successResponse } = require('@rms/shared');

// 1. Liveness Probe: Verifies the Node.js process is responsive
router.get('/health/live', (req, res) => {
  const mem = process.memoryUsage();
  return successResponse(res, {
    statusCode: 200,
    message: 'Report Service process is alive',
    data: {
      status: 'UP',
      service: 'rms-report-service',
      port: config.ports.reportService,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// 2. Readiness Probe: Stateless aggregator has no direct database or Redis dependencies
function checkReadiness(req, res) {
  return successResponse(res, {
    statusCode: 200,
    message: 'Report Service is ready to accept traffic (Stateless Aggregator)',
    data: {
      status: 'UP',
      service: 'rms-report-service',
      port: config.ports.reportService,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      stateless: true,
      dependencies: {},
    },
  });
}

router.get('/health/ready', checkReadiness);
router.get('/health', checkReadiness);

module.exports = router;
