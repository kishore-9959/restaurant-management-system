/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - BRANCH REPOSITORY
 * File: backend/restaurant-service/src/repositories/branch.repository.js
 * Description: Data access methods for Branches using SQL Server Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class BranchRepository {
  async create(data) {
    const result = await executeProcedure('dbo.usp_Branch_Create', {
      RestaurantId: parseInt(data.restaurantId, 10),
      BranchCode: data.branchCode,
      BranchName: data.branchName,
      AddressLine1: data.addressLine1,
      AddressLine2: data.addressLine2 || null,
      City: data.city,
      StateProvince: data.stateProvince,
      PostalCode: data.postalCode,
      Country: data.country || 'India',
      Latitude: data.latitude !== undefined && data.latitude !== null ? parseFloat(data.latitude) : null,
      Longitude: data.longitude !== undefined && data.longitude !== null ? parseFloat(data.longitude) : null,
      Phone: data.phone,
      Email: data.email || null,
      OpeningTime: data.openingTime || '09:00:00',
      ClosingTime: data.closingTime || '23:00:00',
      IsMainBranch: data.isMainBranch ? 1 : 0,
    });
    return result.recordset?.[0] || null;
  }

  async update(branchId, data) {
    const result = await executeProcedure('dbo.usp_Branch_Update', {
      BranchId: parseInt(branchId, 10),
      BranchName: data.branchName,
      AddressLine1: data.addressLine1,
      AddressLine2: data.addressLine2 || null,
      City: data.city,
      StateProvince: data.stateProvince,
      PostalCode: data.postalCode,
      Country: data.country || null,
      Latitude: data.latitude !== undefined && data.latitude !== null ? parseFloat(data.latitude) : null,
      Longitude: data.longitude !== undefined && data.longitude !== null ? parseFloat(data.longitude) : null,
      Phone: data.phone,
      Email: data.email || null,
      OpeningTime: data.openingTime || null,
      ClosingTime: data.closingTime || null,
      IsMainBranch: data.isMainBranch !== undefined ? (data.isMainBranch ? 1 : 0) : null,
    });
    return result.recordset?.[0] || null;
  }

  async getById(branchId) {
    const result = await executeProcedure('dbo.usp_Branch_GetById', {
      BranchId: parseInt(branchId, 10),
    });
    const branch = result.recordsets?.[0]?.[0] || null;
    if (branch) {
      branch.diningSections = result.recordsets?.[1] || [];
    }
    return branch;
  }

  async list({ restaurantId = null, isActive = null, search = null, page = 1, pageSize = 50 } = {}) {
    const result = await executeProcedure('dbo.usp_Branch_List', {
      RestaurantId: restaurantId ? parseInt(restaurantId, 10) : null,
      IsActive: isActive === null ? null : (isActive ? 1 : 0),
      Search: search || null,
      Page: parseInt(page, 10) || 1,
      PageSize: parseInt(pageSize, 10) || 50,
    });

    const totalCount = result.recordsets?.[0]?.[0]?.TotalCount || 0;
    const branches = result.recordsets?.[1] || [];

    return {
      branches,
      pagination: {
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
      },
    };
  }

  async setStatus(branchId, isActive) {
    const result = await executeProcedure('dbo.usp_Branch_SetStatus', {
      BranchId: parseInt(branchId, 10),
      IsActive: isActive ? 1 : 0,
    });
    return result.recordset?.[0] || null;
  }
}

module.exports = new BranchRepository();

