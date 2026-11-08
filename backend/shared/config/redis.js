/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SHARED REDIS CLIENT
 * File: backend/shared/config/redis.js
 * Description: Singleton Redis client for shared caching, cart sessions,
 *              and API Gateway rate limiting buckets.
 * ============================================================================
 */

const Redis = require('ioredis');
const config = require('./env');

const redisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  enableOfflineQueue: false,
};

let redisClient = null;

function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(redisOptions);

    redisClient.on('connect', () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[Redis] Connected to ${config.redis.host}:${config.redis.port}`);
      }
    });

    redisClient.on('error', (err) => {
      // Keep error message concise to avoid log clutter
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`[Redis] Connection warning: ${err.message}`);
      }
    });
  }
  return redisClient;
}

/**
 * Health check probe for Redis connectivity
 * @returns {Promise<{healthy: boolean, message: string, timestamp: string}>}
 */
async function testRedisConnection() {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready' && client.status !== 'connecting') {
      await client.connect();
    }
    const pong = await client.ping();
    return {
      healthy: pong === 'PONG',
      message: `Redis responded with ${pong} (${config.redis.host}:${config.redis.port})`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Redis connection error: ${error.message}`,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = {
  getRedisClient,
  testRedisConnection,
};

