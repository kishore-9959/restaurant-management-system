/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - API GATEWAY BOOTLOADER
 * File: backend/api-gateway/src/index.js
 * Description: Initializes HTTP server for API Gateway on PORT_API_GATEWAY (5000)
 *              with process lifecycle handling and graceful shutdown.
 * ============================================================================
 */

const http = require('http');
const { app, logger } = require('./app');
const { config } = require('../../shared');

const PORT = config.ports.apiGateway;
const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`🚀 API Gateway active on http://localhost:${PORT}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`=======================================================`);
});

// Graceful Shutdown Handler
function handleGracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown of API Gateway...`);
  server.close(() => {
    logger.info('API Gateway HTTP server closed. Process exiting cleanly.');
    process.exit(0);
  });

  // Force close after 10s if hanging
  setTimeout(() => {
    logger.error('Forced shutdown: ongoing requests failed to complete in 10s.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

module.exports = server;

