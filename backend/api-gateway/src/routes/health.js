/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - API GATEWAY HEALTH CHECK
 * File: backend/api-gateway/src/routes/health.js
 * Description: Ingress health endpoint aggregating Gateway, Redis, and downstream status.
 * ============================================================================
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();
const { config, testRedisConnection, successResponse } = require('../../shared');
const { services } = require('../config/gatewayConfig');

router.get('/health', async (req, res) => {
  const redisHealth = await testRedisConnection();

  // If query ?deep=true is passed, probe downstream services
  let downstream = undefined;
  if (req.query.deep === 'true') {
    downstream = await Promise.all(
      services.map(async (svc) => {
        try {
          const resp = await axios.get(`${svc.target}/health`, {
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

  const isHealthy = redisHealth.healthy || config.isDevelopment;

  return successResponse(res, {
    statusCode: isHealthy ? 200 : 503,
    message: 'API Gateway operational',
    data: {
      status: isHealthy ? 'healthy' : 'degraded',
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
});

module.exports = router;

