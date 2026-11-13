/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - BRANCH SERVICE
 * File: backend/restaurant-service/src/services/branch.service.js
 * Description: Business logic for Branch management.
 * ============================================================================
 */

const { branchRepository } = require('../repositories');

class BranchService {
  async createBranch(payload) {
    return await branchRepository.create(payload);
  }

  async updateBranch(branchId, payload) {
    return await branchRepository.update(branchId, payload);
  }

  async getBranchById(branchId) {
    const branch = await branchRepository.getById(branchId);
    if (!branch) {
      const err = new Error(`Branch with ID ${branchId} not found.`);
      err.statusCode = 404;
      err.code = 'BRANCH_NOT_FOUND';
      throw err;
    }
    return branch;
  }

  async listBranches(query = {}) {
    return await branchRepository.list(query);
  }

  async setBranchStatus(branchId, isActive) {
    const updated = await branchRepository.setStatus(branchId, isActive);
    if (!updated) {
      const err = new Error(`Branch with ID ${branchId} not found.`);
      err.statusCode = 404;
      err.code = 'BRANCH_NOT_FOUND';
      throw err;
    }
    return updated;
  }
}

module.exports = new BranchService();

