/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CATEGORY SERVICE
 * File: backend/menu-service/src/services/category.service.js
 * Description: Business logic for categories with automatic Redis catalog invalidation.
 * ============================================================================
 */

const { categoryRepository } = require('../repositories');
const { invalidateBranchMenuCache } = require('../utils/cache');

class CategoryService {
  /**
   * Helper to generate a slug from category name
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async createCategory(data) {
    if (!data.categorySlug) {
      data.categorySlug = this.generateSlug(data.categoryName);
    }

    const category = await categoryRepository.create(data);
    // Invalidate Redis menu catalog
    await invalidateBranchMenuCache(data.branchId || null);
    return category;
  }

  async updateCategory(categoryId, data) {
    if (data.categoryName && !data.categorySlug) {
      data.categorySlug = this.generateSlug(data.categoryName);
    }

    const updated = await categoryRepository.update(categoryId, data);
    // Invalidate Redis menu catalog
    await invalidateBranchMenuCache(updated?.BranchId || null);
    return updated;
  }

  async getCategoryById(categoryId) {
    const category = await categoryRepository.getById(categoryId);
    if (!category) {
      const error = new Error('Category not found.');
      error.statusCode = 404;
      error.code = 'CATEGORY_NOT_FOUND';
      throw error;
    }
    return category;
  }

  async listCategories(branchId = null, includeInactive = false) {
    return await categoryRepository.listByBranch(branchId, includeInactive);
  }

  async setCategoryStatus(categoryId, isActive) {
    const updated = await categoryRepository.setStatus(categoryId, isActive);
    if (!updated) {
      const error = new Error('Category not found.');
      error.statusCode = 404;
      error.code = 'CATEGORY_NOT_FOUND';
      throw error;
    }
    await invalidateBranchMenuCache(updated.BranchId || null);
    return updated;
  }

  async deleteCategory(categoryId) {
    const existing = await categoryRepository.getById(categoryId);
    if (!existing) {
      const error = new Error('Category not found.');
      error.statusCode = 404;
      error.code = 'CATEGORY_NOT_FOUND';
      throw error;
    }

    const result = await categoryRepository.delete(categoryId);
    await invalidateBranchMenuCache(existing.BranchId || null);
    return result;
  }
}

module.exports = new CategoryService();

