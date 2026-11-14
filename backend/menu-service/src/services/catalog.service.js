/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PUBLIC CATALOG SERVICE
 * File: backend/menu-service/src/services/catalog.service.js
 * Description: High-performance customer menu catalog with Redis caching,
 *              TTL management and cache-hit tracking.
 * ============================================================================
 */

const { menuItemRepository } = require('../repositories');
const { getCatalogCache, setCatalogCache, invalidateBranchMenuCache } = require('../utils/cache');

class CatalogService {
  /**
   * Fetch complete branch catalog with transparent Redis cache lookup
   * @param {number} branchId
   * @param {number|null} categoryId
   */
  async getBranchCatalog(branchId, categoryId = null) {
    const parsedBranchId = parseInt(branchId, 10);
    const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : null;

    // 1. Attempt Redis cache lookup
    const cached = await getCatalogCache(parsedBranchId, parsedCategoryId);
    if (cached) {
      return {
        ...cached,
        _cache: 'HIT',
        _cachedAt: cached.generatedAt,
      };
    }

    // 2. Cache miss: execute stored procedure and build hierarchical catalog
    const catalog = await menuItemRepository.getCatalogByBranch(parsedBranchId, parsedCategoryId);

    // 3. Populate Redis cache (15 min TTL)
    await setCatalogCache(parsedBranchId, catalog, parsedCategoryId, 900);

    return {
      ...catalog,
      _cache: 'MISS',
    };
  }

  /**
   * Invalidate catalog cache manually
   */
  async purgeCatalogCache(branchId = null) {
    const deletedCount = await invalidateBranchMenuCache(branchId ? parseInt(branchId, 10) : null);
    return {
      branchId: branchId || 'ALL',
      purgedKeys: deletedCount,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new CatalogService();

