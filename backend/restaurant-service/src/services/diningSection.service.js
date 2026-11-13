/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - DINING SECTION SERVICE
 * File: backend/restaurant-service/src/services/diningSection.service.js
 * Description: Business logic for Dining Section management.
 * ============================================================================
 */

const { diningSectionRepository } = require('../repositories');

class DiningSectionService {
  async createSection(payload) {
    return await diningSectionRepository.create(payload);
  }

  async updateSection(sectionId, payload) {
    const updated = await diningSectionRepository.update(sectionId, payload);
    if (!updated) {
      const err = new Error(`Dining section with ID ${sectionId} not found.`);
      err.statusCode = 404;
      err.code = 'SECTION_NOT_FOUND';
      throw err;
    }
    return updated;
  }

  async getSectionById(sectionId) {
    const section = await diningSectionRepository.getById(sectionId);
    if (!section) {
      const err = new Error(`Dining section with ID ${sectionId} not found.`);
      err.statusCode = 404;
      err.code = 'SECTION_NOT_FOUND';
      throw err;
    }
    return section;
  }

  async listSectionsByBranch(branchId, query = {}) {
    return await diningSectionRepository.listByBranch(branchId, query);
  }

  async setSectionStatus(sectionId, isActive) {
    const updated = await diningSectionRepository.setStatus(sectionId, isActive);
    if (!updated) {
      const err = new Error(`Dining section with ID ${sectionId} not found.`);
      err.statusCode = 404;
      err.code = 'SECTION_NOT_FOUND';
      throw err;
    }
    return updated;
  }
}

module.exports = new DiningSectionService();

