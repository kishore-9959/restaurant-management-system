/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESTAURANT SERVICE
 * File: backend/restaurant-service/src/services/restaurant.service.js
 * Description: Business logic for Restaurant management.
 * ============================================================================
 */

const { restaurantRepository } = require('../repositories');

class RestaurantService {
  async createRestaurant(payload) {
    return await restaurantRepository.create(payload);
  }

  async updateRestaurant(restaurantId, payload) {
    return await restaurantRepository.update(restaurantId, payload);
  }

  async getRestaurantById(restaurantId) {
    const restaurant = await restaurantRepository.getById(restaurantId);
    if (!restaurant) {
      const err = new Error(`Restaurant with ID ${restaurantId} not found.`);
      err.statusCode = 404;
      err.code = 'RESTAURANT_NOT_FOUND';
      throw err;
    }
    return restaurant;
  }

  async listRestaurants(query = {}) {
    return await restaurantRepository.list(query);
  }

  async setRestaurantStatus(restaurantId, isActive) {
    const updated = await restaurantRepository.setStatus(restaurantId, isActive);
    if (!updated) {
      const err = new Error(`Restaurant with ID ${restaurantId} not found.`);
      err.statusCode = 404;
      err.code = 'RESTAURANT_NOT_FOUND';
      throw err;
    }
    return updated;
  }
}

module.exports = new RestaurantService();

