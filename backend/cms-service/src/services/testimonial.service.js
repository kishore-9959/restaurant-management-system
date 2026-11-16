/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - TESTIMONIALS SERVICE
 * File: backend/cms-service/src/services/testimonial.service.js
 * ============================================================================
 */

const { testimonialRepository } = require('../repositories');
const cache = require('../config/cache');

class TestimonialService {
  async getPublicTestimonials({ restaurantId = 1, featuredOnly = true }) {
    const cacheKey = await cache.buildKey('testimonials', `${restaurantId}:${featuredOnly ? 'featured' : 'all'}`);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const testimonials = await testimonialRepository.getPublicTestimonials({ restaurantId, featuredOnly });
    if (testimonials) {
      await cache.set(cacheKey, testimonials, cache.TTL.TESTIMONIALS);
    }
    return testimonials;
  }

  async listTestimonials(params) {
    return testimonialRepository.listTestimonials(params);
  }

  async createTestimonial(data) {
    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      const err = new Error('Testimonial rating must be between 1 and 5.');
      err.statusCode = 400;
      throw err;
    }
    const testimonial = await testimonialRepository.createTestimonial(data);
    await cache.invalidatePublicCache('testimonial-create');
    return testimonial;
  }

  async updateTestimonial(testimonialId, data) {
    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      const err = new Error('Testimonial rating must be between 1 and 5.');
      err.statusCode = 400;
      throw err;
    }
    const testimonial = await testimonialRepository.updateTestimonial(testimonialId, data);
    await cache.invalidatePublicCache('testimonial-update');
    return testimonial;
  }

  async deleteTestimonial(testimonialId) {
    const result = await testimonialRepository.deleteTestimonial(testimonialId);
    await cache.invalidatePublicCache('testimonial-delete');
    return result;
  }
}

module.exports = new TestimonialService();

