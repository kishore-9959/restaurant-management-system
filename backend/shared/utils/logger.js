/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SHARED WINSTON LOGGER
 * File: backend/shared/utils/logger.js
 * Description: Standardized Winston structured logger for all microservices.
 *              Injects timestamp, service identity, and correlation ID.
 * ============================================================================
 */

const { createLogger, format, transports } = require('winston');
const config = require('../config/env');

const logFormat = format.printf(({ timestamp, level, message, service, correlationId, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  const corrStr = correlationId ? ` [corr:${correlationId}]` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${service}]${corrStr}: ${message}${metaStr}`;
});

/**
 * Creates an isolated Winston logger instance for a microservice
 * @param {string} serviceName - Name of the microservice (e.g. 'auth-service')
 */
function createServiceLogger(serviceName) {
  return createLogger({
    level: config.isProduction ? 'info' : 'debug',
    defaultMeta: { service: serviceName },
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.errors({ stack: true }),
      format.splat(),
      config.isProduction ? format.json() : logFormat
    ),
    transports: [
      new transports.Console({
        format: config.isProduction 
          ? format.json() 
          : format.combine(format.colorize(), logFormat),
      }),
    ],
  });
}

module.exports = {
  createServiceLogger,
};

