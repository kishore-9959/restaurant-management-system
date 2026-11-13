/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - BRANCH CONTROLLER
 * File: backend/restaurant-service/src/controllers/branch.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const branchService = require('../services/branch.service');
const { validateBranchPayload } = require('../validators');

class BranchController {
  async createBranch(req, res) {
    const payload = { ...req.body };
    if (req.params.restaurantId && !payload.restaurantId) {
      payload.restaurantId = req.params.restaurantId;
    }

    const validation = validateBranchPayload(payload, false);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid branch creation payload.',
        details: validation.errors,
      });
    }

    try {
      const branch = await branchService.createBranch(payload);
      return successResponse(res, {
        statusCode: 201,
        message: 'Branch created successfully.',
        data: branch,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.message.includes('already in use') ? 409 : 500,
        code: error.message.includes('already in use') ? 'BRANCH_CODE_EXISTS' : 'BRANCH_CREATE_FAILED',
        message: error.message,
      });
    }
  }

  async updateBranch(req, res) {
    const { branchId } = req.params;
    const validation = validateBranchPayload(req.body, true);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid branch update payload.',
        details: validation.errors,
      });
    }

    try {
      const updated = await branchService.updateBranch(branchId, req.body);
      return successResponse(res, {
        message: 'Branch updated successfully.',
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'BRANCH_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  async getBranchById(req, res) {
    const { branchId } = req.params;
    try {
      const branch = await branchService.getBranchById(branchId);
      return successResponse(res, {
        message: 'Branch details retrieved successfully.',
        data: branch,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'BRANCH_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  async listBranches(req, res) {
    try {
      const restaurantId = req.params.restaurantId || req.query.restaurantId;
      const { isActive, search, page, pageSize } = req.query;

      const result = await branchService.listBranches({
        restaurantId,
        isActive: isActive !== undefined ? isActive === 'true' : null,
        search,
        page,
        pageSize,
      });

      return successResponse(res, {
        message: 'Branches listed successfully.',
        data: result.branches,
        meta: result.pagination,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'BRANCHES_LIST_FAILED',
        message: error.message,
      });
    }
  }

  async setBranchStatus(req, res) {
    const { branchId } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined || typeof isActive !== 'boolean') {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Field 'isActive' (boolean) is required in request body.",
      });
    }

    try {
      const updated = await branchService.setBranchStatus(branchId, isActive);
      return successResponse(res, {
        message: `Branch status updated to ${isActive ? 'ACTIVE' : 'INACTIVE'}.`,
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'BRANCH_STATUS_FAILED',
        message: error.message,
      });
    }
  }
}

module.exports = new BranchController();

