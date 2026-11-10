/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/controllers/internalUserController.js
 * ============================================================================
 */

const { Op } = require('sequelize');
const { successResponse, errorResponse } = require('@rms/shared');
const { User, Employee } = require('../models');

async function createUser(req, res) {
  try {
    const { firstName, lastName, email, phoneNumber, passwordHash, passcodePin, userType, branchId } = req.body;

    // Check for duplicate email if provided
    if (email) {
      const existingEmail = await User.findOne({
        where: { email, isDeleted: false },
      });
      if (existingEmail) {
        return errorResponse(res, {
          statusCode: 409,
          code: 'EMAIL_ALREADY_EXISTS',
          message: `A user with email '${email}' already exists.`,
        });
      }
    }

    // Check for duplicate phone
    if (phoneNumber) {
      const existingPhone = await User.findOne({
        where: { phoneNumber, isDeleted: false },
      });
      if (existingPhone) {
        return errorResponse(res, {
          statusCode: 409,
          code: 'PHONE_ALREADY_EXISTS',
          message: `A user with phone number '${phoneNumber}' already exists.`,
        });
      }
    }

    const newUser = await User.create({
      firstName,
      lastName,
      email: email || null,
      phoneNumber,
      passwordHash: passwordHash || null,
      passcodePin: passcodePin || null,
      userType: userType || 'CUSTOMER',
      branchId: branchId || null,
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    return successResponse(res, {
      statusCode: 201,
      message: 'User created successfully.',
      data: {
        userId: newUser.userId,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        userType: newUser.userType,
        branchId: newUser.branchId,
        isActive: newUser.isActive,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: 500,
      code: 'CREATE_USER_ERROR',
      message: err.message,
    });
  }
}

async function lookupUser(req, res) {
  try {
    const { credential, userId } = req.body;

    let user = null;
    if (userId) {
      user = await User.findOne({
        where: { userId, isDeleted: false },
      });
    } else if (credential) {
      user = await User.findOne({
        where: {
          [Op.or]: [{ email: credential }, { phoneNumber: credential }],
          isDeleted: false,
        },
      });
    }

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'No active user found matching the given credential.',
      });
    }

    return successResponse(res, {
      statusCode: 200,
      data: {
        userId: user.userId,
        branchId: user.branchId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        passwordHash: user.passwordHash,
        passcodePin: user.passcodePin,
        userType: user.userType,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: 500,
      code: 'USER_LOOKUP_ERROR',
      message: err.message,
    });
  }
}

async function lookupEmployee(req, res) {
  try {
    const { employeeCode } = req.body;
    if (!employeeCode) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'MISSING_EMPLOYEE_CODE',
        message: 'employeeCode is required.',
      });
    }

    const employee = await Employee.findOne({
      where: { employeeCode, isDeleted: false },
      include: [
        {
          model: User,
          as: 'user',
          where: { isDeleted: false },
        },
      ],
    });

    if (!employee) {
      return errorResponse(res, {
        statusCode: 404,
        code: 'EMPLOYEE_NOT_FOUND',
        message: `Employee '${employeeCode}' not found.`,
      });
    }

    return successResponse(res, {
      statusCode: 200,
      data: {
        employeeId: employee.employeeId,
        employeeCode: employee.employeeCode,
        designation: employee.designation,
        branchId: employee.branchId,
        employmentStatus: employee.employmentStatus,
        userId: employee.userId,
        user: {
          userId: employee.user.userId,
          firstName: employee.user.firstName,
          lastName: employee.user.lastName,
          email: employee.user.email,
          phoneNumber: employee.user.phoneNumber,
          passcodePin: employee.user.passcodePin,
          userType: employee.user.userType,
          isActive: employee.user.isActive,
        },
      },
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: 500,
      code: 'EMPLOYEE_LOOKUP_ERROR',
      message: err.message,
    });
  }
}

async function updateLastLogin(req, res) {
  try {
    const { id } = req.params;
    await User.update(
      { lastLoginAt: new Date() },
      { where: { userId: id } }
    );
    return successResponse(res, {
      statusCode: 200,
      message: 'Last login updated.',
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: 500,
      code: 'UPDATE_LOGIN_ERROR',
      message: err.message,
    });
  }
}

module.exports = {
  createUser,
  lookupUser,
  lookupEmployee,
  updateLastLogin,
};

