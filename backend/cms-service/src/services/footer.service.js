/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - FOOTER SERVICE
 * File: backend/cms-service/src/services/footer.service.js
 * ============================================================================
 */

const { footerRepository } = require('../repositories');
const cache = require('../config/cache');

class FooterService {
  async getPublicFooter(restaurantId = 1) {
    const cacheKey = await cache.buildKey('footer', `${restaurantId}`);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const footerData = await footerRepository.getPublicFooter(restaurantId);
    if (footerData) {
      await cache.set(cacheKey, footerData, cache.TTL.FOOTER);
    }
    return footerData;
  }

  async listFooterSections(restaurantId = 1) {
    return footerRepository.listFooterSections(restaurantId);
  }

  async createFooterSection(data) {
    const section = await footerRepository.createFooterSection(data);
    await cache.invalidatePublicCache('footer-create');
    return section;
  }

  async updateFooterSection(footerSectionId, data) {
    const section = await footerRepository.updateFooterSection(footerSectionId, data);
    await cache.invalidatePublicCache('footer-update');
    return section;
  }

  async deleteFooterSection(footerSectionId) {
    const result = await footerRepository.deleteFooterSection(footerSectionId);
    await cache.invalidatePublicCache('footer-delete');
    return result;
  }
}

module.exports = new FooterService();

