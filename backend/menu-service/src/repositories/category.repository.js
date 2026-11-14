/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CATEGORY REPOSITORY
 * File: backend/menu-service/src/repositories/category.repository.js
 * Description: Data access methods for food categories using SQL Server Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class CategoryRepository {
  /**
   * Create a food category
   */
  async create(data) {
    const result = await executeProcedure('dbo.usp_Category_Create', {
      BranchId: data.branchId ? parseInt(data.branchId, 10) : null,
      ParentCategoryId: data.parentCategoryId ? parseInt(data.parentCategoryId, 10) : null,
      CategoryName: data.categoryName,
      CategorySlug: data.categorySlug,
      Description: data.description || null,
      DisplayOrder: data.displayOrder !== undefined ? parseInt(data.displayOrder, 10) : 0,
      ImageUrl: data.imageUrl || null,
      IsActive: data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
    });
    return result.recordset?.[0] || null;
  }

  /**
   * Update a food category
   */
  async update(categoryId, data) {
    const result = await executeProcedure('dbo.usp_Category_Update', {
      CategoryId: parseInt(categoryId, 10),
      ParentCategoryId: data.parentCategoryId ? parseInt(data.parentCategoryId, 10) : null,
      CategoryName: data.categoryName,
      CategorySlug: data.categorySlug,
      Description: data.description !== undefined ? data.description : null,
      DisplayOrder: data.displayOrder !== undefined ? parseInt(data.displayOrder, 10) : 0,
      ImageUrl: data.imageUrl !== undefined ? data.imageUrl : null,
      IsActive: data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
    });
    return result.recordset?.[0] || null;
  }

  /**
   * Get category by ID
   */
  async getById(categoryId) {
    const result = await executeProcedure('dbo.usp_Category_GetById', {
      CategoryId: parseInt(categoryId, 10),
    });
    return result.recordset?.[0] || null;
  }

  /**
   * List categories by branch (or global)
   */
  async listByBranch(branchId = null, includeInactive = false) {
    const result = await executeProcedure('dbo.usp_Category_ListByBranch', {
      BranchId: branchId ? parseInt(branchId, 10) : null,
      IncludeInactive: includeInactive ? 1 : 0,
    });
    return result.recordset || [];
  }

  /**
   * Toggle category active status
   */
  async setStatus(categoryId, isActive) {
    const result = await executeProcedure('dbo.usp_Category_SetStatus', {
      CategoryId: parseInt(categoryId, 10),
      IsActive: isActive ? 1 : 0,
    });
    return result.recordset?.[0] || null;
  }

  /**
   * Soft delete category
   */
  async delete(categoryId) {
    const result = await executeProcedure('dbo.usp_Category_Delete', {
      CategoryId: parseInt(categoryId, 10),
    });
    return result.recordset?.[0] || null;
  }
}

module.exports = new CategoryRepository();

