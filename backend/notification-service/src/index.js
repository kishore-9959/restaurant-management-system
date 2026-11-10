/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NOTIFICATION SERVICE BOOTLOADER
 * File: backend/notification-service/src/index.js
 * ============================================================================
 */

const http = require('http');
const { app, logger } = require('./app');
const { initSocketServer } = require('./socket');
const { config } = require('@rms/shared');

const PORT = config.ports.notificationService;
const server = http.createServer(app);

// Initialize Socket.IO instance on same HTTP server
initSocketServer(server, logger);

server.listen(PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`🔔 Notification Service & Socket.IO running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`WebSocket endpoint: ws://localhost:${PORT}/socket.io/`);
  logger.info(`=======================================================`);
});

function handleShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down Notification Service...`);
  server.close(() => {
    logger.info('Notification Service HTTP/WS server closed. Clean exit.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = server;

