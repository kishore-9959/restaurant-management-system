/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - DINING SECTION REPOSITORY
 * File: backend/restaurant-service/src/repositories/diningSection.repository.js
 * Description: Data access methods for Dining Sections using SQL Server Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class DiningSectionRepository {
  async create(data) {
    const result = await executeProcedure('dbo.usp_DiningSection_Create', {
      BranchId: parseInt(data.branchId, 10),
      SectionName: data.sectionName,
      FloorLevel: data.floorLevel !== undefined ? parseInt(data.floorLevel, 10) : 1,
      DisplayOrder: data.displayOrder !== undefined ? parseInt(data.displayOrder, 10) : 0,
    });
    return result.recordset?.[0] || null;
  }

  async update(sectionId, data) {
    const result = await executeProcedure('dbo.usp_DiningSection_Update', {
      SectionId: parseInt(sectionId, 10),
      SectionName: data.sectionName,
      FloorLevel: data.floorLevel !== undefined ? parseInt(data.floorLevel, 10) : null,
      DisplayOrder: data.displayOrder !== undefined ? parseInt(data.displayOrder, 10) : null,
    });
    return result.recordset?.[0] || null;
  }

  async getById(sectionId) {
    const result = await executeProcedure('dbo.usp_DiningSection_GetById', {
      SectionId: parseInt(sectionId, 10),
    });
    return result.recordset?.[0] || null;
  }

  async listByBranch(branchId, { isActive = null } = {}) {
    const result = await executeProcedure('dbo.usp_DiningSection_ListByBranch', {
      BranchId: parseInt(branchId, 10),
      IsActive: isActive === null ? null : (isActive ? 1 : 0),
    });
    return result.recordset || [];
  }

  async setStatus(sectionId, isActive) {
    const result = await executeProcedure('dbo.usp_DiningSection_SetStatus', {
      SectionId: parseInt(sectionId, 10),
      IsActive: isActive ? 1 : 0,
    });
    return result.recordset?.[0] || null;
  }
}

module.exports = new DiningSectionRepository();

