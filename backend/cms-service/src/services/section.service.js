/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PAGE SECTION SERVICE
 * File: backend/cms-service/src/services/section.service.js
 * ============================================================================
 */

const { sectionRepository } = require('../repositories');
const cache = require('../config/cache');

class SectionService {
  async createSection(data) {
    const section = await sectionRepository.createSection(data);
    await cache.invalidatePublicCache('section-create');
    return section;
  }

  async updateSection(sectionId, data) {
    const section = await sectionRepository.updateSection(sectionId, data);
    await cache.invalidatePublicCache('section-update');
    return section;
  }

  async reorderSections(pageId, sectionsOrder) {
    const sections = await sectionRepository.reorderSections(pageId, sectionsOrder);
    await cache.invalidatePublicCache('section-reorder');
    return sections;
  }

  async deleteSection(sectionId) {
    const result = await sectionRepository.deleteSection(sectionId);
    await cache.invalidatePublicCache('section-delete');
    return result;
  }
}

module.exports = new SectionService();

