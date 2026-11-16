/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - WEBSITE SETTINGS SERVICE
 * File: backend/cms-service/src/services/websiteSettings.service.js
 * ============================================================================
 */

const { websiteSettingsRepository } = require('../repositories');
const cache = require('../config/cache');
const { createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('cms-settings-service');

class WebsiteSettingsService {
  async getPublicSettings({ restaurantId = 1, branchId = null }) {
    const cacheKey = await cache.buildKey('settings', `${restaurantId}:${branchId || 'global'}`);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const settings = await websiteSettingsRepository.getSettings({ restaurantId, branchId });
    if (settings) {
      await cache.set(cacheKey, settings, cache.TTL.SETTINGS);
    }
    return settings;
  }

  async updateSettings(data) {
    const updated = await websiteSettingsRepository.updateSettings(data);
    await cache.invalidatePublicCache('website-settings-update');
    return updated;
  }
}

module.exports = new WebsiteSettingsService();

