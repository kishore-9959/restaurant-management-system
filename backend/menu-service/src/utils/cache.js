/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MENU REDIS CACHING UTILITIES
 * File: backend/menu-service/src/utils/cache.js
 * Description: Redis catalog caching, category caching, and atomic invalidation
 *              for Menu Service operations.
 * ============================================================================
 */

const { getRedisClient, createServiceLogger } = require('@rms/shared');
const logger = createServiceLogger('menu-cache');

const DEFAULT_TTL_SECONDS = 900; // 15 minutes

/**
 * Build Redis key for branch menu catalog
 */
function buildCatalogKey(branchId, categoryId = null) {
  if (categoryId) {
    return `menu:catalog:branch:${branchId}:cat:${categoryId}`;
  }
  return `menu:catalog:branch:${branchId}:all`;
}

/**
 * Build Redis key for branch categories
 */
function buildCategoriesKey(branchId = null) {
  return branchId ? `menu:categories:branch:${branchId}` : 'menu:categories:global';
}

/**
 * Retrieve cached catalog from Redis
 * @param {number} branchId
 * @param {number|null} categoryId
 * @returns {Promise<object|null>}
 */
async function getCatalogCache(branchId, categoryId = null) {
  try {
    const client = getRedisClient();
    const key = buildCatalogKey(branchId, categoryId);
    const cached = await client.get(key);
    if (cached) {
      logger.info(`[Cache HIT] Catalog retrieved from Redis key: ${key}`);
      return JSON.parse(cached);
    }
    logger.info(`[Cache MISS] Catalog key not found in Redis: ${key}`);
    return null;
  } catch (err) {
    logger.warn(`[Cache ERROR] Failed to fetch catalog from Redis: ${err.message}`);
    return null; // Gracefully continue on Redis failure
  }
}

/**
 * Store catalog in Redis with TTL
 * @param {number} branchId
 * @param {object} data
 * @param {number|null} categoryId
 * @param {number} ttl
 */
async function setCatalogCache(branchId, data, categoryId = null, ttl = DEFAULT_TTL_SECONDS) {
  try {
    const client = getRedisClient();
    const key = buildCatalogKey(branchId, categoryId);
    await client.setex(key, ttl, JSON.stringify(data));
    logger.info(`[Cache SET] Stored catalog in Redis key: ${key} (TTL: ${ttl}s)`);
  } catch (err) {
    logger.warn(`[Cache ERROR] Failed to set catalog in Redis: ${err.message}`);
  }
}

/**
 * Invalidate all Redis cache keys related to a branch (or all menu caches if branchId is null)
 * Purges catalog keys and categories keys.
 * @param {number|null} branchId
 */
async function invalidateBranchMenuCache(branchId = null) {
  try {
    const client = getRedisClient();
    const patterns = branchId 
      ? [`menu:catalog:branch:${branchId}*`, `menu:categories:branch:${branchId}*`, 'menu:categories:global*']
      : ['menu:catalog:*', 'menu:categories:*'];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const keys = await client.keys(pattern);
      if (keys && keys.length > 0) {
        const deleted = await client.del(...keys);
        totalDeleted += deleted;
      }
    }
    logger.info(`[Cache PURGE] Invalidated ${totalDeleted} keys for branch: ${branchId || 'ALL'}`);
    return totalDeleted;
  } catch (err) {
    logger.warn(`[Cache ERROR] Failed to invalidate menu cache: ${err.message}`);
    return 0;
  }
}

module.exports = {
  buildCatalogKey,
  buildCategoriesKey,
  getCatalogCache,
  setCatalogCache,
  invalidateBranchMenuCache,
};

