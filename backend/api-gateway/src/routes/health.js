/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - API GATEWAY HEALTH ROUTE
 * File: backend/api-gateway/src/routes/health.js
 * Description: Ingress Liveness and Readiness probes aggregating Gateway,
 *              Redis rate-limiting store, and downstream microservice status.
 * ============================================================================
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();
const { config, testRedisConnection, successResponse } = require('@rms/shared');
const { services } = require('../config/gatewayConfig');

// 1. Liveness Probe: Verifies API Gateway process is responsive
router.get('/health/live', (req, res) => {
  const mem = process.memoryUsage();
  return successResponse(res, {
    statusCode: 200,
    message: 'API Gateway process is alive',
    data: {
      status: 'UP',
      service: 'rms-api-gateway',
      port: config.ports.apiGateway,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// 2. Readiness Probe: Verifies Redis rate limiting store availability (+ optional ?deep=true probe)
async function checkReadiness(req, res) {
  const redisHealth = await testRedisConnection();
  const isReady = redisHealth.healthy === true;

  // If query ?deep=true is passed, probe downstream services
  let downstream = undefined;
  if (req.query.deep === 'true') {
    downstream = await Promise.all(
      services.map(async (svc) => {
        try {
          const resp = await axios.get(`${svc.target}/health/ready`, {
            timeout: 1500,
            headers: {
              'X-Correlation-ID': req.correlationId,
              'X-Internal-Service-Key': config.security.internalServiceKey,
            },
          });
          return { service: svc.name, status: 'UP', port: svc.target };
        } catch (err) {
          return { service: svc.name, status: 'DOWN', error: err.message };
        }
      })
    );
  }

  return successResponse(res, {
    statusCode: isReady ? 200 : 503,
    message: isReady ? 'API Gateway is ready to accept traffic' : 'API Gateway dependencies unavailable',
    data: {
      status: isReady ? 'UP' : 'DOWN',
      service: 'rms-api-gateway',
      port: config.ports.apiGateway,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: redisHealth,
      },
      ...(downstream && { downstream }),
    },
  });
}

router.get('/health/ready', checkReadiness);
router.get('/health', checkReadiness);

module.exports = router;
