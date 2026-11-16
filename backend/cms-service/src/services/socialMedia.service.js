/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SOCIAL MEDIA SERVICE
 * File: backend/cms-service/src/services/socialMedia.service.js
 * ============================================================================
 */

const { socialMediaRepository } = require('../repositories');
const cache = require('../config/cache');

class SocialMediaService {
  async getPublicSocialLinks(restaurantId = 1) {
    const cacheKey = await cache.buildKey('social-links', `${restaurantId}`);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const links = await socialMediaRepository.listSocialLinks({ restaurantId, activeOnly: true });
    if (links) {
      await cache.set(cacheKey, links, cache.TTL.SOCIAL_LINKS);
    }
    return links;
  }

  async listSocialLinks(params) {
    return socialMediaRepository.listSocialLinks(params);
  }

  async saveSocialMediaLink(data) {
    const link = await socialMediaRepository.saveSocialMediaLink(data);
    await cache.invalidatePublicCache('social-link-save');
    return link;
  }

  async deleteSocialMediaLink(socialLinkId) {
    const result = await socialMediaRepository.deleteSocialMediaLink(socialLinkId);
    await cache.invalidatePublicCache('social-link-delete');
    return result;
  }
}

module.exports = new SocialMediaService();

