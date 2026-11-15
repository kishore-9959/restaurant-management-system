/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PAYMENT SERVICE HEALTH ROUTE
 * File: backend/payment-service/src/routes/health.js
 * Description: Liveness and Readiness probes for Payment Service.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { config, testDbConnection, testRedisConnection, successResponse } = require('@rms/shared');

// 1. Liveness Probe: Verifies the Node.js process is responsive
router.get(['/health/live', '/api/v1/payments/health/live'], (req, res) => {
  const mem = process.memoryUsage();
  return successResponse(res, {
    statusCode: 200,
    message: 'Payment Service process is alive',
    data: {
      status: 'UP',
      service: 'rms-payment-service',
      port: config.ports.paymentService,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// 2. Readiness Probe: Verifies database and redis connectivity
async function checkReadiness(req, res) {
  const [dbHealth, redisHealth] = await Promise.all([
    testDbConnection(),
    testRedisConnection(),
  ]);

  const isReady = dbHealth.healthy === true;

  // Masked check for razorpay credentials presence
  const razorpayConfigured = Boolean(
    config.razorpay?.keyId &&
    config.razorpay?.keySecret &&
    config.razorpay?.webhookSecret
  );

  return successResponse(res, {
    statusCode: isReady ? 200 : 503,
    message: isReady ? 'Payment Service is ready to accept traffic' : 'Payment Service dependencies unavailable',
    data: {
      status: isReady ? 'UP' : 'DOWN',
      service: 'rms-payment-service',
      port: config.ports.paymentService,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth,
        redis: redisHealth,
        razorpayConfigured,
      },
    },
  });
}

router.get(['/health/ready', '/health', '/api/v1/payments/health/ready', '/api/v1/payments/health'], checkReadiness);

module.exports = router;
