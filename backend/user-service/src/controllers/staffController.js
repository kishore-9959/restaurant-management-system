/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/controllers/staffController.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const staffService = require('../services/staffService');

function getReqMetadata(req) {
  return {
    currentUserId: req.user ? req.user.userId : null,
    ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

async function createStaff(req, res) {
  try {
    const { firstName, phoneNumber, designation } = req.body;
    if (!firstName || !phoneNumber || !designation) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'firstName, phoneNumber, and designation are required.',
      });
    }

    const newStaff = await staffService.createStaff(req.body, getReqMetadata(req));
    return successResponse(res, {
      statusCode: 201,
      message: 'Staff member created successfully.',
      data: newStaff,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'CREATE_STAFF_ERROR',
      message: err.message,
    });
  }
}

async function listStaff(req, res) {
  try {
    const { page, limit, branchId, designation, status, search } = req.query;
    const result = await staffService.listStaff({
      page,
      limit,
      branchId,
      designation,
      status,
      search,
    });
    return successResponse(res, {
      statusCode: 200,
      message: 'Staff list retrieved successfully.',
      data: result.staff,
      pagination: result.pagination,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'LIST_STAFF_ERROR',
      message: err.message,
    });
  }
}

async function getStaff(req, res) {
  try {
    const { id } = req.params;
    const staff = await staffService.getStaffById(id);
    return successResponse(res, {
      statusCode: 200,
      message: 'Staff details retrieved successfully.',
      data: staff,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'GET_STAFF_ERROR',
      message: err.message,
    });
  }
}

async function updateStaff(req, res) {
  try {
    const { id } = req.params;
    const updated = await staffService.updateStaff(id, req.body, getReqMetadata(req));
    return successResponse(res, {
      statusCode: 200,
      message: 'Staff details updated successfully.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'UPDATE_STAFF_ERROR',
      message: err.message,
    });
  }
}

async function updateStaffStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'MISSING_STATUS',
        message: 'status field is required in request body.',
      });
    }

    const updated = await staffService.updateStaffStatus(id, status, getReqMetadata(req));
    return successResponse(res, {
      statusCode: 200,
      message: `Staff status updated to ${status}.`,
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'UPDATE_STATUS_ERROR',
      message: err.message,
    });
  }
}

module.exports = {
  createStaff,
  listStaff,
  getStaff,
  updateStaff,
  updateStaffStatus,
};

