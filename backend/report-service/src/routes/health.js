/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT SERVICE HEALTH ROUTE
 * File: backend/report-service/src/routes/health.js
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { config, successResponse } = require('../../shared');

router.get('/health', (req, res) => {
  return successResponse(res, {
    statusCode: 200,
    message: 'Report Service operational (Stateless Aggregator)',
    data: {
      status: 'healthy',
      service: 'rms-report-service',
      port: config.ports.reportService,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      stateless: true,
    },
  });
});

module.exports = router;

