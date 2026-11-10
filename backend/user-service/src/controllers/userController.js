/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/controllers/userController.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const userService = require('../services/userService');

function getReqMetadata(req) {
  return {
    currentUserId: req.user ? req.user.userId : null,
    ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

async function listUsers(req, res) {
  try {
    const { page, limit, userType, branchId, isActive, search } = req.query;
    const result = await userService.listUsers({
      page,
      limit,
      userType,
      branchId,
      isActive,
      search,
    });
    return successResponse(res, {
      statusCode: 200,
      message: 'Users list retrieved successfully.',
      data: result.users,
      pagination: result.pagination,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'LIST_USERS_ERROR',
      message: err.message,
    });
  }
}

async function getUser(req, res) {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    return successResponse(res, {
      statusCode: 200,
      message: 'User retrieved successfully.',
      data: user,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'GET_USER_ERROR',
      message: err.message,
    });
  }
}

async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (isActive === undefined) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'MISSING_ACTIVE_STATUS',
        message: 'isActive field (boolean) is required in request body.',
      });
    }

    const updated = await userService.updateUserStatus(id, isActive, getReqMetadata(req));
    return successResponse(res, {
      statusCode: 200,
      message: `User active status updated to ${isActive}.`,
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
  listUsers,
  getUser,
  updateUserStatus,
};

