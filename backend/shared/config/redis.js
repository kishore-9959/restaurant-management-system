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
  maxRetriesPerRequest: 2,
  connectTimeout: 2000,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 1000);
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
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`[Redis] Connection warning: ${err.message}`);
      }
    });
  }
  return redisClient;
}

/**
 * Health check probe for Redis connectivity with timeout guarantee
 * @returns {Promise<{healthy: boolean, message: string, timestamp: string}>}
 */
async function testRedisConnection() {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready') {
      if (client.status === 'wait' || client.status === 'close' || client.status === 'end') {
        await Promise.race([
          client.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connect timeout')), 2000)),
        ]);
      }
    }
    const pong = await Promise.race([
      client.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis ping timeout')), 2000)),
    ]);
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
