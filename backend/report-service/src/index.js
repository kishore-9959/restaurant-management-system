/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT SERVICE BOOTLOADER
 * File: backend/report-service/src/index.js
 * ============================================================================
 */

const http = require('http');
const { app, logger } = require('./app');
const { config } = require('@rms/shared');

const PORT = config.ports.reportService;
const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`📊 Report Service running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`=======================================================`);
});

function handleShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down Report Service...`);
  server.close(() => {
    logger.info('Report Service HTTP server closed. Clean exit.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = server;

