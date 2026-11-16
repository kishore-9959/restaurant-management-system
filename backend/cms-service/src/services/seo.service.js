/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SEO SERVICE
 * File: backend/cms-service/src/services/seo.service.js
 * ============================================================================
 */

const { seoRepository } = require('../repositories');
const cache = require('../config/cache');

class SEOService {
  async getSEOSettings({ restaurantId = 1, pageId = null, pageSlug = null }) {
    const param = pageId ? `page:${pageId}` : (pageSlug ? `slug:${pageSlug}` : 'global');
    const cacheKey = await cache.buildKey('seo', `${restaurantId}:${param}`);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const seo = await seoRepository.getSEOSettings({ restaurantId, pageId, pageSlug });
    if (seo) {
      await cache.set(cacheKey, seo, cache.TTL.SEO);
    }
    return seo;
  }

  async updateSEOSettings(data) {
    const updated = await seoRepository.updateSEOSettings(data);
    await cache.invalidatePublicCache('seo-update');
    return updated;
  }
}

module.exports = new SEOService();

