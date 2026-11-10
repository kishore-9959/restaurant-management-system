/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/middleware/rateLimiter.js
 * ============================================================================
 */

const { redisClient, errorResponse, createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('auth-rate-limiter');

function createRateLimiter({ windowSeconds = 60, maxRequests = 20, keyPrefix = 'ratelimit:auth' } = {}) {
  const memoryFallback = new Map();

  return async (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const key = `${keyPrefix}:${ip.replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      if (current > maxRequests) {
        const ttl = await redisClient.ttl(key);
        res.setHeader('Retry-After', ttl > 0 ? ttl : windowSeconds);
        return errorResponse(res, {
          statusCode: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many authentication requests from this IP. Please try again in ${ttl > 0 ? ttl : windowSeconds} seconds.`,
        });
      }

      return next();
    } catch (err) {
      // In-memory fallback if Redis is unreachable
      const now = Date.now();
      const record = memoryFallback.get(ip) || { count: 0, resetAt: now + windowSeconds * 1000 };

      if (now > record.resetAt) {
        record.count = 0;
        record.resetAt = now + windowSeconds * 1000;
      }

      record.count += 1;
      memoryFallback.set(ip, record);

      if (record.count > maxRequests) {
        const retrySec = Math.ceil((record.resetAt - now) / 1000);
        res.setHeader('Retry-After', retrySec);
        return errorResponse(res, {
          statusCode: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many authentication requests. Please try again in ${retrySec} seconds.`,
        });
      }

      return next();
    }
  };
}

module.exports = {
  authRateLimiter: createRateLimiter({ windowSeconds: 60, maxRequests: 20 }),
};

