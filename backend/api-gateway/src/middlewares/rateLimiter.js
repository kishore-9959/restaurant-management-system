/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - API GATEWAY RATE LIMITER
 * File: backend/api-gateway/src/middlewares/rateLimiter.js
 * Description: Ingress rate limiting with Redis store in production/containers
 *              and automatic in-memory fallback for local development.
 * ============================================================================
 */

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient, errorResponse, config } = require('@rms/shared');

let store = undefined;

// In containerized/production environments or when explicitly enabled, use RedisStore.
// For local development without a local Redis server, safely default to in-memory store.
if (config.isProduction || process.env.ENABLE_REDIS_RATE_LIMIT === 'true') {
  try {
    const redisClient = getRedisClient();
    store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rms_rl:',
    });
  } catch (err) {
    console.warn('[RateLimiter] Redis store initialization failed; falling back to memory store.');
    store = undefined;
  }
}

// 100 requests per minute for public endpoints
const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  ...(store && { store }),
  handler: (req, res) => {
    return errorResponse(res, {
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please try again after one minute.',
    });
  },
});

module.exports = {
  publicRateLimiter,
};
