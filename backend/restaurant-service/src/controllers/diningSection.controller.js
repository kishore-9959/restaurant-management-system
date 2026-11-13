/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - DINING SECTION CONTROLLER
 * File: backend/restaurant-service/src/controllers/diningSection.controller.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const diningSectionService = require('../services/diningSection.service');
const { validateDiningSectionPayload } = require('../validators');

class DiningSectionController {
  async createSection(req, res) {
    const payload = { ...req.body };
    if (req.params.branchId && !payload.branchId) {
      payload.branchId = req.params.branchId;
    }

    const validation = validateDiningSectionPayload(payload, false);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid dining section creation payload.',
        details: validation.errors,
      });
    }

    try {
      const section = await diningSectionService.createSection(payload);
      return successResponse(res, {
        statusCode: 201,
        message: 'Dining section created successfully.',
        data: section,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'SECTION_CREATE_FAILED',
        message: error.message,
      });
    }
  }

  async updateSection(req, res) {
    const { sectionId } = req.params;
    const validation = validateDiningSectionPayload(req.body, true);
    if (!validation.isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid dining section update payload.',
        details: validation.errors,
      });
    }

    try {
      const updated = await diningSectionService.updateSection(sectionId, req.body);
      return successResponse(res, {
        message: 'Dining section updated successfully.',
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'SECTION_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  async getSectionById(req, res) {
    const { sectionId } = req.params;
    try {
      const section = await diningSectionService.getSectionById(sectionId);
      return successResponse(res, {
        message: 'Dining section retrieved successfully.',
        data: section,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'SECTION_FETCH_FAILED',
        message: error.message,
      });
    }
  }

  async listSectionsByBranch(req, res) {
    const branchId = req.params.branchId || req.query.branchId;
    if (!branchId) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Parameter 'branchId' is required.",
      });
    }

    const { isActive } = req.query;
    try {
      const sections = await diningSectionService.listSectionsByBranch(branchId, {
        isActive: isActive !== undefined ? isActive === 'true' : null,
      });
      return successResponse(res, {
        message: 'Dining sections retrieved successfully.',
        data: sections,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: 500,
        code: 'SECTIONS_LIST_FAILED',
        message: error.message,
      });
    }
  }

  async setSectionStatus(req, res) {
    const { sectionId } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined || typeof isActive !== 'boolean') {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: "Field 'isActive' (boolean) is required in request body.",
      });
    }

    try {
      const updated = await diningSectionService.setSectionStatus(sectionId, isActive);
      return successResponse(res, {
        message: `Dining section status updated to ${isActive ? 'ACTIVE' : 'INACTIVE'}.`,
        data: updated,
      });
    } catch (error) {
      return errorResponse(res, {
        statusCode: error.statusCode || 500,
        code: error.code || 'SECTION_STATUS_FAILED',
        message: error.message,
      });
    }
  }
}

module.exports = new DiningSectionController();

