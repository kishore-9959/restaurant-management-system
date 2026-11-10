/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/controllers/internalAuthController.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const { Role, Permission, UserRole } = require('../models');
const authService = require('../services/authService');

async function getUserRoles(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'MISSING_USER_ID',
        message: 'userId is required in path.',
      });
    }

    const data = await authService.getUserRolesAndPermissions(userId);
    return successResponse(res, {
      statusCode: 200,
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
    });
  }
}

async function assignRole(req, res) {
  try {
    const { userId, roleCode, branchId } = req.body;
    if (!userId || !roleCode) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'MISSING_PARAMS',
        message: 'userId and roleCode are required.',
      });
    }

    const role = await Role.findOne({ where: { roleCode } });
    if (!role) {
      return errorResponse(res, {
        statusCode: 404,
        code: 'ROLE_NOT_FOUND',
        message: `Role code '${roleCode}' not found.`,
      });
    }

    // Check if already assigned
    let userRole = await UserRole.findOne({
      where: { userId, roleId: role.roleId },
    });

    if (userRole) {
      // Update branch if changed
      if (branchId !== undefined) {
        userRole.branchId = branchId;
        await userRole.save();
      }
    } else {
      userRole = await UserRole.create({
        userId,
        roleId: role.roleId,
        branchId: branchId || null,
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: `Role '${roleCode}' assigned to user ${userId}.`,
      data: userRole,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'ROLE_ASSIGN_ERROR',
      message: err.message,
    });
  }
}

async function getAllRoles(req, res) {
  try {
    const roles = await Role.findAll({
      include: [
        {
          model: Permission,
          as: 'permissions',
          through: { attributes: [] },
        },
      ],
      order: [['RoleId', 'ASC']],
    });

    return successResponse(res, {
      statusCode: 200,
      data: roles,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: 500,
      code: 'ROLES_FETCH_ERROR',
      message: err.message,
    });
  }
}

module.exports = {
  getUserRoles,
  assignRole,
  getAllRoles,
};
