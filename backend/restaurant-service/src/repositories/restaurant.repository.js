/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESTAURANT REPOSITORY
 * File: backend/restaurant-service/src/repositories/restaurant.repository.js
 * Description: Data access methods for Restaurants using SQL Server Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class RestaurantRepository {
  async create(data) {
    const result = await executeProcedure('dbo.usp_Restaurant_Create', {
      RestaurantName: data.restaurantName,
      LegalEntityName: data.legalEntityName || null,
      TaxIdentificationNumber: data.taxIdentificationNumber || null,
      PrimaryContactEmail: data.primaryContactEmail,
      PrimaryContactPhone: data.primaryContactPhone,
      WebsiteUrl: data.websiteUrl || null,
      LogoUrl: data.logoUrl || null,
      DefaultCurrency: data.defaultCurrency || 'INR',
      DefaultTimezone: data.defaultTimezone || 'India Standard Time',
    });
    return result.recordset?.[0] || null;
  }

  async update(restaurantId, data) {
    const result = await executeProcedure('dbo.usp_Restaurant_Update', {
      RestaurantId: parseInt(restaurantId, 10),
      RestaurantName: data.restaurantName,
      LegalEntityName: data.legalEntityName || null,
      TaxIdentificationNumber: data.taxIdentificationNumber || null,
      PrimaryContactEmail: data.primaryContactEmail,
      PrimaryContactPhone: data.primaryContactPhone,
      WebsiteUrl: data.websiteUrl || null,
      LogoUrl: data.logoUrl || null,
      DefaultCurrency: data.defaultCurrency || null,
      DefaultTimezone: data.defaultTimezone || null,
    });
    return result.recordset?.[0] || null;
  }

  async getById(restaurantId) {
    const result = await executeProcedure('dbo.usp_Restaurant_GetById', {
      RestaurantId: parseInt(restaurantId, 10),
    });
    const restaurant = result.recordsets?.[0]?.[0] || null;
    if (restaurant) {
      restaurant.branches = result.recordsets?.[1] || [];
    }
    return restaurant;
  }

  async list({ isActive = null, search = null, page = 1, pageSize = 20 } = {}) {
    const result = await executeProcedure('dbo.usp_Restaurant_List', {
      IsActive: isActive === null ? null : (isActive ? 1 : 0),
      Search: search || null,
      Page: parseInt(page, 10) || 1,
      PageSize: parseInt(pageSize, 10) || 20,
    });

    const totalCount = result.recordsets?.[0]?.[0]?.TotalCount || 0;
    const restaurants = result.recordsets?.[1] || [];

    return {
      restaurants,
      pagination: {
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
      },
    };
  }

  async setStatus(restaurantId, isActive) {
    const result = await executeProcedure('dbo.usp_Restaurant_SetStatus', {
      RestaurantId: parseInt(restaurantId, 10),
      IsActive: isActive ? 1 : 0,
    });
    return result.recordset?.[0] || null;
  }
}

module.exports = new RestaurantRepository();

