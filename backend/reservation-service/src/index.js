/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESERVATION SERVICE BOOTLOADER
 * File: backend/reservation-service/src/index.js
 * ============================================================================
 */

const http = require('http');
const { app, logger } = require('./app');
const { config } = require('@rms/shared');

const PORT = config.ports.reservationService;
const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`📅 Reservation Service running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`=======================================================`);
});

function handleShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down Reservation Service...`);
  server.close(() => {
    logger.info('Reservation Service HTTP server closed. Clean exit.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = server;

