/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ORDER SERVICE BOOTLOADER
 * File: backend/order-service/src/index.js
 * ============================================================================
 */

const http = require('http');
const { app, logger } = require('./app');
const { config } = require('@rms/shared');

const PORT = config.ports.orderService;
const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`📦 Order Service running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`=======================================================`);
});

function handleShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down Order Service...`);
  server.close(() => {
    logger.info('Order Service HTTP server closed. Clean exit.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = server;

