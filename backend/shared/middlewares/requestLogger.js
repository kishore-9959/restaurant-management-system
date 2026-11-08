/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REQUEST LOGGER MIDDLEWARE
 * File: backend/shared/middlewares/requestLogger.js
 * Description: Logs incoming requests and response completion with execution duration.
 * ============================================================================
 */

function createRequestLogger(logger) {
  return function (req, res, next) {
    req.logger = logger;
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      
      logger.log(level, `${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
        correlationId: req.correlationId,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip,
      });
    });

    next();
  };
}

module.exports = createRequestLogger;

