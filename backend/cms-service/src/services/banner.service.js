/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - BANNERS SERVICE
 * File: backend/cms-service/src/services/banner.service.js
 * ============================================================================
 */

const { bannerRepository } = require('../repositories');
const cache = require('../config/cache');

class BannerService {
  async getActiveBanners({ restaurantId = 1, branchId = null, bannerLocation = 'HOME_HERO' }) {
    const cacheKey = await cache.buildKey('banners', `${restaurantId}:${bannerLocation}`);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const banners = await bannerRepository.getActiveBanners({ restaurantId, branchId, bannerLocation });
    if (banners) {
      await cache.set(cacheKey, banners, cache.TTL.BANNERS);
    }
    return banners;
  }

  async listBanners(params) {
    return bannerRepository.listBanners(params);
  }

  async createBanner(data) {
    const banner = await bannerRepository.createBanner(data);
    await cache.invalidatePublicCache('banner-create');
    return banner;
  }

  async updateBanner(bannerId, data) {
    const banner = await bannerRepository.updateBanner(bannerId, data);
    await cache.invalidatePublicCache('banner-update');
    return banner;
  }

  async deleteBanner(bannerId) {
    const result = await bannerRepository.deleteBanner(bannerId);
    await cache.invalidatePublicCache('banner-delete');
    return result;
  }
}

module.exports = new BannerService();

