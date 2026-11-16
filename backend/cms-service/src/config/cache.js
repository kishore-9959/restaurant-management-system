/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CMS REDIS CACHING MODULE
 * File: backend/cms-service/src/config/cache.js
 * Description: Non-blocking cache-aside pattern with atomic version namespacing
 *              and SCAN+UNLINK invalidation (ZERO KEYS * commands).
 * ============================================================================
 */

const { getRedisClient, createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('cms-cache');
const redis = getRedisClient();

const VERSION_KEY = 'cms:public:version';

// Cache TTLs in seconds
const TTL = {
  SETTINGS: 3600,       // 1 hour
  SEO: 1800,            // 30 mins
  PUBLIC_PAGE: 1800,    // 30 mins
  BANNERS: 900,         // 15 mins
  NAVIGATION: 3600,     // 1 hour
  FOOTER: 3600,         // 1 hour
  FAQS: 1800,           // 30 mins
  TESTIMONIALS: 1800,   // 30 mins
  SOCIAL_LINKS: 3600,   // 1 hour
};

/**
 * Ensure Redis connection is ready before commands
 */
async function ensureConnected() {
  if (redis.status === 'ready') return;
  if (redis.status === 'wait' || redis.status === 'close' || redis.status === 'end') {
    try {
      await Promise.race([
        redis.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connect timeout')), 3000)),
      ]);
    } catch {
      // connecting in progress or offline
    }
  }
}

/**
 * Get current atomic cache version.
 */
async function getCacheVersion() {
  try {
    await ensureConnected();
    const v = await redis.get(VERSION_KEY);
    if (!v) {
      await redis.set(VERSION_KEY, '1');
      return 1;
    }
    return parseInt(v, 10);
  } catch (err) {
    logger.warn('Failed to retrieve cache version, fallback to 1:', err.message);
    return 1;
  }
}

/**
 * Generate versioned cache key.
 */
async function buildKey(resource, param = '') {
  const v = await getCacheVersion();
  return `cms:v${v}:${resource}${param ? ':' + param : ''}`;
}

/**
 * Retrieve cached JSON.
 */
async function get(key) {
  try {
    await ensureConnected();
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn(`Redis GET failed for key ${key}:`, err.message);
    return null;
  }
}

/**
 * Set cached JSON with TTL.
 */
async function set(key, value, ttlSeconds = 1800) {
  try {
    await ensureConnected();
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn(`Redis SET failed for key ${key}:`, err.message);
  }
}

/**
 * Non-blocking dual-tier cache invalidation:
 * Tier 1: Increment version counter (instant, atomic namespace switch)
 * Tier 2: Asynchronously scan and UNLINK stale keys without blocking event loop
 */
async function invalidatePublicCache(context = 'all') {
  try {
    await ensureConnected();
    // 1. Atomic Version Bump (instantly invalidates all reads)
    const newVersion = await redis.incr(VERSION_KEY);
    logger.info(`🔄 Public CMS cache namespace bumped to version ${newVersion} (Trigger: ${context})`);

    // 2. Non-blocking asynchronous purge using SCAN + UNLINK
    setImmediate(async () => {
      try {
        await ensureConnected();
        let cursor = '0';
        const matchPattern = 'cms:v*:*';
        do {
          const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', matchPattern, 'COUNT', 100);
          cursor = nextCursor;
          if (keys && keys.length > 0) {
            // Filter out current active version keys
            const staleKeys = keys.filter(k => !k.startsWith(`cms:v${newVersion}:`));
            if (staleKeys.length > 0) {
              await redis.unlink(...staleKeys);
            }
          }
        } while (cursor !== '0');
        logger.debug('Stale Redis CMS keys purged cleanly via UNLINK.');
      } catch (scanErr) {
        logger.warn('Error during background cache cleanup:', scanErr.message);
      }
    });
  } catch (err) {
    logger.error('Failed to invalidate CMS cache:', err.message);
  }
}

module.exports = {
  TTL,
  buildKey,
  get,
  set,
  invalidatePublicCache,
};
