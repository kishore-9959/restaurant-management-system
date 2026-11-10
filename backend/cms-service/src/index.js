/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CMS SERVICE BOOTLOADER
 * File: backend/cms-service/src/index.js
 * ============================================================================
 */

const http = require('http');
const { app, logger } = require('./app');
const { config } = require('@rms/shared');

const PORT = config.ports.cmsService;
const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`🎨 CMS Service running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`=======================================================`);
});

function handleShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down CMS Service...`);
  server.close(() => {
    logger.info('CMS Service HTTP server closed. Clean exit.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = server;

