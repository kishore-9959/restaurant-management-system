/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESTAURANT CONTROLLER
 * File: backend/restaurant-service/src/controllers/restaurant.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const restaurantService = require('../services/restaurant.service');
const { validateRestaurantPayload } = require('../validators');

class RestaurantController {
  async createRestaurant(req, res) {
    const validation = validateRestaurantPayload(req.body, false);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid restaurant payload.',
        details: validation.errors,
      });
    }

    try {
      const restaurant = await restaurantService.createRestaurant(req.body);
      return successResponse(res, {
        statusCode: 201,
        message: 'Restaurant created successfully.',
        data: restaurant,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.message.includes('already exists') ? 409 : 500,
        code: error.message.includes('already exists') ? 'RESTAURANT_ALREADY_EXISTS' : 'RESTAURANT_CREATE_FAILED',
        message: error.message,
      });
    }
  }

  async updateRestaurant(req, res) {
    const { restaurantId } = req.params;
    const validation = validateRestaurantPayload(req.body, true);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid restaurant update payload.',
        details: validation.errors,
      });
    }

    try {
      const updated = await restaurantService.updateRestaurant(restaurantId, req.body);
      return successResponse(res, {
        message: 'Restaurant updated successfully.',
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'RESTAURANT_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  async getRestaurantById(req, res) {
    const { restaurantId } = req.params;
    try {
      const restaurant = await restaurantService.getRestaurantById(restaurantId);
      return successResponse(res, {
        message: 'Restaurant retrieved successfully.',
        data: restaurant,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'RESTAURANT_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  async listRestaurants(req, res) {
    try {
      const { isActive, search, page, pageSize } = req.query;
      const result = await restaurantService.listRestaurants({
        isActive: isActive !== undefined ? isActive === 'true' : null,
        search,
        page,
        pageSize,
      });
      return successResponse(res, {
        message: 'Restaurants listed successfully.',
        data: result.restaurants,
        meta: result.pagination,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'RESTAURANTS_LIST_FAILED',
        message: error.message,
      });
    }
  }

  async setRestaurantStatus(req, res) {
    const { restaurantId } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined || typeof isActive !== 'boolean') {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Field 'isActive' (boolean) is required in request body.",
      });
    }

    try {
      const updated = await restaurantService.setRestaurantStatus(restaurantId, isActive);
      return successResponse(res, {
        message: `Restaurant status updated to ${isActive ? 'ACTIVE' : 'INACTIVE'}.`,
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'RESTAURANT_STATUS_FAILED',
        message: error.message,
      });
    }
  }
}

module.exports = new RestaurantController();

