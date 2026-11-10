/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/services/authService.js
 * ============================================================================
 */

const { config, httpClient, createServiceLogger } = require('@rms/shared');
const { Role, Permission, UserRole, sequelize } = require('../models');
const { hashPassword, comparePassword } = require('../utils/passwordService');
const { generateTokenPair, rotateRefreshToken, revokeTokens } = require('./tokenService');
const { verifyPinAttempt } = require('./pinService');

const logger = createServiceLogger('auth-service');

const USER_SERVICE_URL = config.userServiceUrl || 'http://localhost:8002';
const INTERNAL_HEADERS = {
  'X-Internal-Service-Key': config.internalServiceKey,
  'Content-Type': 'application/json',
};

/**
 * Fetch roles and permissions for a user from Auth Service's DB
 */
async function getUserRolesAndPermissions(userId) {
  const userRoles = await UserRole.findAll({
    where: { userId },
    include: [
      {
        model: Role,
        as: 'role',
        include: [
          {
            model: Permission,
            as: 'permissions',
            through: { attributes: [] },
          },
        ],
      },
    ],
  });

  const roles = [];
  const permissionsSet = new Set();
  let branchId = null;

  userRoles.forEach((ur) => {
    if (ur.role) {
      roles.push(ur.role.roleCode);
      if (ur.role.permissions) {
        ur.role.permissions.forEach((p) => permissionsSet.add(p.permissionCode));
      }
    }
    if (ur.branchId && !branchId) {
      branchId = ur.branchId;
    }
  });

  return {
    roles,
    permissions: Array.from(permissionsSet),
    branchId,
  };
}

/**
 * Customer Registration
 */
async function registerCustomer(data) {
  const { firstName, lastName, email, phoneNumber, password } = data;

  const passwordHash = await hashPassword(password);

  // 1. Call User Service to create the User record
  let createdUser;
  try {
    const res = await httpClient.post(
      `${USER_SERVICE_URL}/api/v1/users/internal/create`,
      {
        firstName,
        lastName,
        email,
        phoneNumber,
        passwordHash,
        userType: 'CUSTOMER',
      },
      { headers: INTERNAL_HEADERS }
    );
    createdUser = res.data.data;
  } catch (err) {
    const status = err.status || err.response?.status || 500;
    const code = err.code || err.response?.data?.error?.code || 'USER_CREATION_FAILED';
    const message = err.message || err.response?.data?.error?.message || 'Failed to create user record.';
    const error = new Error(message);
    error.statusCode = status;
    error.code = code;
    throw error;
  }

  // 2. Assign CUSTOMER role in UserRoles table
  try {
    const customerRole = await Role.findOne({ where: { roleCode: 'CUSTOMER' } });
    if (customerRole) {
      await UserRole.create({
        userId: createdUser.userId,
        roleId: customerRole.roleId,
        branchId: createdUser.branchId || null,
      });
    }
  } catch (err) {
    logger.error('Failed to assign CUSTOMER role in UserRoles:', err.message);
  }

  // 3. Issue Token Pair
  const { roles, permissions } = await getUserRolesAndPermissions(createdUser.userId);
  const tokens = await generateTokenPair(createdUser, roles.length ? roles : ['CUSTOMER'], permissions);

  return {
    user: {
      userId: createdUser.userId,
      firstName: createdUser.firstName,
      lastName: createdUser.lastName,
      email: createdUser.email,
      phoneNumber: createdUser.phoneNumber,
      userType: createdUser.userType,
      roles: roles.length ? roles : ['CUSTOMER'],
      permissions,
    },
    tokens,
  };
}

/**
 * User Login (Customer or general login)
 */
async function login(credential, password) {
  // 1. Look up user from User Service
  let userRecord;
  try {
    const res = await httpClient.post(
      `${USER_SERVICE_URL}/api/v1/users/internal/lookup`,
      { credential },
      { headers: INTERNAL_HEADERS }
    );
    userRecord = res.data.data;
  } catch (err) {
    const status = err.status || err.response?.status;
    if (status === 404) {
      const error = new Error('Invalid email, phone number, or password.');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }
    throw err;
  }

  if (!userRecord) {
    const error = new Error('Invalid email, phone number, or password.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // 2. Verify account status
  if (!userRecord.isActive) {
    const error = new Error('Your account is currently deactivated. Please contact support.');
    error.statusCode = 403;
    error.code = 'ACCOUNT_INACTIVE';
    throw error;
  }

  // 3. Verify password
  const isMatch = await comparePassword(password, userRecord.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email, phone number, or password.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // 4. Fetch roles and permissions
  const { roles, permissions, branchId } = await getUserRolesAndPermissions(userRecord.userId);
  userRecord.branchId = userRecord.branchId || branchId;

  // 5. Generate tokens
  const tokens = await generateTokenPair(userRecord, roles, permissions);

  // 6. Update last login timestamp asynchronously
  httpClient.patch(
    `${USER_SERVICE_URL}/api/v1/users/internal/${userRecord.userId}/last-login`,
    {},
    { headers: INTERNAL_HEADERS }
  ).catch((e) => logger.warn(`Failed to update last login timestamp: ${e.message}`));

  return {
    user: {
      userId: userRecord.userId,
      firstName: userRecord.firstName,
      lastName: userRecord.lastName,
      email: userRecord.email,
      phoneNumber: userRecord.phoneNumber,
      userType: userRecord.userType,
      branchId: userRecord.branchId,
      roles,
      permissions,
    },
    tokens,
  };
}

/**
 * Staff Login (Enforces STAFF or ADMIN userType)
 */
async function staffLogin(credential, password) {
  const result = await login(credential, password);
  const { user } = result;

  if (user.userType !== 'STAFF' && user.userType !== 'ADMIN') {
    const error = new Error('Access denied. Staff or Administrator credentials required.');
    error.statusCode = 403;
    error.code = 'STAFF_ACCESS_REQUIRED';
    throw error;
  }

  return result;
}

/**
 * POS 4-digit PIN Login
 */
async function posPinLogin({ employeeCode, pin, branchId }) {
  // 1. Look up employee by employeeCode
  let employee;
  try {
    const res = await httpClient.post(
      `${USER_SERVICE_URL}/api/v1/users/internal/employee-lookup`,
      { employeeCode },
      { headers: INTERNAL_HEADERS }
    );
    employee = res.data.data;
  } catch (err) {
    const status = err.status || err.response?.status;
    if (status === 404) {
      const error = new Error('Employee code not found.');
      error.statusCode = 401;
      error.code = 'INVALID_EMPLOYEE_CODE';
      throw error;
    }
    throw err;
  }

  if (!employee || !employee.user) {
    const error = new Error('Employee code not found.');
    error.statusCode = 401;
    error.code = 'INVALID_EMPLOYEE_CODE';
    throw error;
  }

  // 2. Verify employee status
  if (employee.employmentStatus !== 'ACTIVE' || !employee.user.isActive) {
    const error = new Error('Employee account is inactive or not currently employed.');
    error.statusCode = 403;
    error.code = 'EMPLOYEE_INACTIVE';
    throw error;
  }

  // 3. Verify branch assignment
  if (parseInt(employee.branchId, 10) !== parseInt(branchId, 10)) {
    const error = new Error(`Employee is not assigned to branch ${branchId}.`);
    error.statusCode = 403;
    error.code = 'BRANCH_MISMATCH';
    throw error;
  }

  // 4. Verify PIN with brute force lockout protection
  await verifyPinAttempt(employee.userId, pin, employee.user.passcodePin);

  // 5. Fetch roles & permissions
  const { roles, permissions } = await getUserRolesAndPermissions(employee.userId);
  employee.user.branchId = employee.branchId;

  // 6. Generate tokens
  const tokens = await generateTokenPair(employee.user, roles, permissions);

  // 7. Update last login
  httpClient.patch(
    `${USER_SERVICE_URL}/api/v1/users/internal/${employee.userId}/last-login`,
    {},
    { headers: INTERNAL_HEADERS }
  ).catch((e) => logger.warn(`Failed to update last login timestamp: ${e.message}`));

  return {
    employee: {
      employeeId: employee.employeeId,
      employeeCode: employee.employeeCode,
      designation: employee.designation,
      branchId: employee.branchId,
      user: {
        userId: employee.user.userId,
        firstName: employee.user.firstName,
        lastName: employee.user.lastName,
        email: employee.user.email,
        phoneNumber: employee.user.phoneNumber,
        userType: employee.user.userType,
      },
      roles,
      permissions,
    },
    tokens,
  };
}

/**
 * Refresh Access Token with Token Rotation
 */
async function refreshToken(tokenString) {
  const { userId } = await rotateRefreshToken(tokenString);

  // Look up user details
  let userRecord;
  try {
    const res = await httpClient.post(
      `${USER_SERVICE_URL}/api/v1/users/internal/lookup`,
      { userId },
      { headers: INTERNAL_HEADERS }
    );
    userRecord = res.data.data;
  } catch (err) {
    const error = new Error('User associated with refresh token could not be verified.');
    error.statusCode = 401;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  if (!userRecord || !userRecord.isActive) {
    const error = new Error('User account is inactive or deleted.');
    error.statusCode = 403;
    error.code = 'ACCOUNT_INACTIVE';
    throw error;
  }

  const { roles, permissions, branchId } = await getUserRolesAndPermissions(userId);
  userRecord.branchId = userRecord.branchId || branchId;

  const tokens = await generateTokenPair(userRecord, roles, permissions);
  return tokens;
}

/**
 * Logout & Revoke Tokens
 */
async function logout({ accessToken, refreshToken: refToken }) {
  await revokeTokens({ accessToken, refreshToken: refToken });
  return { message: 'Logged out successfully.' };
}

module.exports = {
  getUserRolesAndPermissions,
  registerCustomer,
  login,
  staffLogin,
  posPinLogin,
  refreshToken,
  logout,
};
