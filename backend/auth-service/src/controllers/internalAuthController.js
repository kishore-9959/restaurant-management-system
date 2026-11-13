/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/controllers/internalAuthController.js
 * Description: Controller for internal microservice communication using stored procedures.
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const authRepository = require('../repositories/auth.repository');

async function getUserRoles(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return errorResponse(res, 400, 'MISSING_USER_ID', 'userId is required in path.');
    }

    const data = await authRepository.getUserRolesAndPermissions(userId);
    return successResponse(res, {
      statusCode: 200,
      data,
    });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
  }
}

async function assignRole(req, res) {
  try {
    const { userId, roleCode, branchId } = req.body;
    if (!userId || !roleCode) {
      return errorResponse(res, 400, 'MISSING_PARAMS', 'userId and roleCode are required.');
    }

    const result = await authRepository.assignRole(userId, roleCode, branchId || null);

    return successResponse(res, {
      statusCode: 200,
      message: `Role '${roleCode}' assigned to user ${userId}.`,
      data: result,
    });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.code || 'ROLE_ASSIGN_ERROR', err.message);
  }
}

async function getAllRoles(req, res) {
  try {
    const roles = await authRepository.getAllRoles();
    return successResponse(res, {
      statusCode: 200,
      data: roles,
    });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.code || 'ROLES_FETCH_ERROR', err.message);
  }
}

module.exports = {
  getUserRoles,
  assignRole,
  getAllRoles,
};
