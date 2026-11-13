/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/controllers/internalUserController.js
 * Description: Internal inter-service endpoints powered by stored procedures.
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const userRepository = require('../repositories/user.repository');
const employeeRepository = require('../repositories/employee.repository');

async function createUser(req, res) {
  try {
    const { firstName, lastName, email, phoneNumber, passwordHash, passcodePin, userType, branchId } = req.body;

    // Check uniqueness via stored procedure
    const exists = await userRepository.checkExists(email, phoneNumber);
    if (exists.emailExists) {
      return errorResponse(res, 409, 'EMAIL_ALREADY_EXISTS', `A user with email '${email}' already exists.`);
    }
    if (exists.phoneExists) {
      return errorResponse(res, 409, 'PHONE_ALREADY_EXISTS', `A user with phone number '${phoneNumber}' already exists.`);
    }

    const newUser = await userRepository.createUser({
      firstName,
      lastName,
      email: email || null,
      phoneNumber,
      passwordHash: passwordHash || null,
      passcodePin: passcodePin || null,
      userType: userType || 'CUSTOMER',
      branchId: branchId || null,
      isActive: true,
    });

    return successResponse(res, {
      statusCode: 201,
      message: 'User created successfully.',
      data: newUser,
    });
  } catch (err) {
    return errorResponse(res, 500, 'CREATE_USER_ERROR', err.message);
  }
}

async function lookupUser(req, res) {
  try {
    const { credential, userId } = req.body;

    let user = null;
    if (userId) {
      user = await userRepository.getUserById(userId);
    } else if (credential) {
      user = await userRepository.getUserByEmailOrPhone(credential);
    }

    if (!user) {
      return errorResponse(res, 404, 'USER_NOT_FOUND', 'No active user found matching the given credential.');
    }

    return successResponse(res, {
      statusCode: 200,
      data: user,
    });
  } catch (err) {
    return errorResponse(res, 500, 'USER_LOOKUP_ERROR', err.message);
  }
}

async function lookupEmployee(req, res) {
  try {
    const { employeeCode } = req.body;
    if (!employeeCode) {
      return errorResponse(res, 400, 'MISSING_EMPLOYEE_CODE', 'employeeCode is required.');
    }

    const employees = await employeeRepository.listEmployees({
      searchTerm: employeeCode,
      limit: 10,
    });

    const employee = employees.find(e => e.employeeCode === employeeCode);
    if (!employee) {
      return errorResponse(res, 404, 'EMPLOYEE_NOT_FOUND', `Employee '${employeeCode}' not found.`);
    }

    // Include passcodePin from User for POS PIN verification
    const pinAuth = await userRepository.getPinAuth(employee.userId);
    if (employee.user && pinAuth) {
      employee.user.passcodePin = pinAuth.passcodePin;
    }

    return successResponse(res, {
      statusCode: 200,
      data: employee,
    });
  } catch (err) {
    return errorResponse(res, 500, 'EMPLOYEE_LOOKUP_ERROR', err.message);
  }
}

async function updateLastLogin(req, res) {
  try {
    const { id } = req.params;
    await userRepository.updateLastLogin(id);
    return successResponse(res, {
      statusCode: 200,
      message: 'Last login updated.',
    });
  } catch (err) {
    return errorResponse(res, 500, 'UPDATE_LOGIN_ERROR', err.message);
  }
}

module.exports = {
  createUser,
  lookupUser,
  lookupEmployee,
  updateLastLogin,
};
