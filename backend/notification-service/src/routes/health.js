/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION SERVICE HEALTH ROUTE
 * File: backend/notification-service/src/routes/health.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { config, testDbConnection, successResponse } = require('../../shared');
const { getSocketServer } = require('../socket');

router.get('/health', async (req, res) => {
  const dbHealth = await testDbConnection();
  const io = getSocketServer();
  const socketClientCount = io ? io.engine.clientsCount : 0;

  return successResponse(res, {
    statusCode: dbHealth.healthy || config.isDevelopment ? 200 : 503,
    message: 'Notification Service operational',
    data: {
      status: dbHealth.healthy ? 'healthy' : 'degraded',
      service: 'rms-notification-service',
      port: config.ports.notificationService,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      socketConnections: socketClientCount,
      dependencies: {
        database: dbHealth,
      },
    },
  });
});

module.exports = router;

