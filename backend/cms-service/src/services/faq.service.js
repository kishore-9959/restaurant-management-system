/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - FAQS SERVICE
 * File: backend/cms-service/src/services/faq.service.js
 * ============================================================================
 */

const { faqRepository } = require('../repositories');
const cache = require('../config/cache');

class FAQService {
  async getPublicFAQs({ restaurantId = 1, category = null }) {
    const cacheKey = await cache.buildKey('faqs', `${restaurantId}:${category || 'all'}`);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const faqs = await faqRepository.getPublicFAQs({ restaurantId, category });
    if (faqs) {
      await cache.set(cacheKey, faqs, cache.TTL.FAQS);
    }
    return faqs;
  }

  async listFAQs(params) {
    return faqRepository.listFAQs(params);
  }

  async createFAQ(data) {
    const faq = await faqRepository.createFAQ(data);
    await cache.invalidatePublicCache('faq-create');
    return faq;
  }

  async updateFAQ(faqId, data) {
    const faq = await faqRepository.updateFAQ(faqId, data);
    await cache.invalidatePublicCache('faq-update');
    return faq;
  }

  async deleteFAQ(faqId) {
    const result = await faqRepository.deleteFAQ(faqId);
    await cache.invalidatePublicCache('faq-delete');
    return result;
  }
}

module.exports = new FAQService();

