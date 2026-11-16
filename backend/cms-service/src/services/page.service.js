/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PAGE SERVICE
 * File: backend/cms-service/src/services/page.service.js
 * ============================================================================
 */

const { pageRepository } = require('../repositories');
const cache = require('../config/cache');

class PageService {
  async getPublicPage(slug, previewMode = false) {
    if (previewMode) {
      // In preview mode, bypass Redis cache entirely to view live draft modifications
      return pageRepository.getPublicPageWithSections(slug, true);
    }

    const cacheKey = await cache.buildKey('page', slug.toLowerCase());
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const pageData = await pageRepository.getPublicPageWithSections(slug, false);
    if (pageData && pageData.page) {
      await cache.set(cacheKey, pageData, cache.TTL.PUBLIC_PAGE);
    }
    return pageData;
  }

  async listPages(params) {
    return pageRepository.listPages(params);
  }

  async getPageById(pageId) {
    return pageRepository.getPageById(pageId);
  }

  async createPage(data) {
    const newPage = await pageRepository.createPage(data);
    await cache.invalidatePublicCache('page-create');
    return newPage;
  }

  async updatePage(pageId, data) {
    const updated = await pageRepository.updatePage(pageId, data);
    await cache.invalidatePublicCache('page-update');
    return updated;
  }

  async publishPage(pageId) {
    const published = await pageRepository.setPageStatus(pageId, 'PUBLISHED');
    await cache.invalidatePublicCache('page-publish');
    return published;
  }

  async archivePage(pageId) {
    const archived = await pageRepository.setPageStatus(pageId, 'ARCHIVED');
    await cache.invalidatePublicCache('page-archive');
    return archived;
  }

  async deletePage(pageId, deletedByUserId = null) {
    const deleted = await pageRepository.deletePage(pageId, deletedByUserId);
    await cache.invalidatePublicCache('page-delete');
    return deleted;
  }
}

module.exports = new PageService();

