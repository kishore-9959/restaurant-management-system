/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - API GATEWAY RATE LIMITER
 * File: backend/api-gateway/src/middlewares/rateLimiter.js
 * Description: Ingress rate limiting with Redis store and in-memory fallback.
 * ============================================================================
 */

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient, errorResponse } = require('../../shared');

let store = undefined;

try {
  const redisClient = getRedisClient();
  store = new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rms_rl:',
  });
} catch (err) {
  console.warn('[RateLimiter] Redis store unavailable; falling back to memory store.');
}

// 100 requests per minute for public endpoints
const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store,
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

