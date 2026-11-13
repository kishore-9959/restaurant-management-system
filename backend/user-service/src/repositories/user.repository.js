/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER REPOSITORY
 * File: backend/user-service/src/repositories/user.repository.js
 * Description: Data access repository executing SQL Server stored procedures
 *              for User domain operations.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

/**
 * Creates a new user in dbo.Users via stored procedure.
 */
async function createUser(userData) {
  const {
    firstName,
    lastName = null,
    email = null,
    phoneNumber,
    passwordHash = null,
    passcodePin = null,
    userType = 'CUSTOMER',
    branchId = null,
    avatarUrl = null,
    isActive = true,
  } = userData;

  const result = await executeProcedure(
    'dbo.usp_User_Create',
    {
      FirstName: firstName,
      LastName: lastName,
      Email: email,
      PhoneNumber: phoneNumber,
      PasswordHash: passwordHash,
      PasscodePin: passcodePin,
      UserType: userType,
      BranchId: branchId ? Number(branchId) : null,
      AvatarUrl: avatarUrl,
      IsActive: isActive ? 1 : 0,
    },
    {
      NewUserId: sql.BigInt,
    }
  );

  const userId = result.output.NewUserId ? Number(result.output.NewUserId) : null;
  return {
    userId,
    firstName,
    lastName,
    email,
    phoneNumber,
    userType,
    branchId,
    avatarUrl,
    isActive,
  };
}

/**
 * Retrieves a user by UserId via stored procedure.
 */
async function getUserById(userId) {
  const result = await executeProcedure('dbo.usp_User_GetById', {
    UserId: Number(userId),
  });

  const user = result.recordsets[0]?.[0];
  if (!user) return null;

  const roles = (result.recordsets[1] || []).map(r => r.RoleCode);
  const permissions = (result.recordsets[2] || []).map(p => p.PermissionCode);

  return {
    userId: user.UserId,
    branchId: user.BranchId,
    firstName: user.FirstName,
    lastName: user.LastName,
    email: user.Email,
    phoneNumber: user.PhoneNumber,
    userType: user.UserType,
    avatarUrl: user.AvatarUrl,
    isActive: Boolean(user.IsActive),
    isEmailVerified: Boolean(user.IsEmailVerified),
    isPhoneVerified: Boolean(user.IsPhoneVerified),
    lastLoginAt: user.LastLoginAt,
    createdAt: user.CreatedAt,
    updatedAt: user.UpdatedAt,
    roles,
    permissions,
  };
}

/**
 * Retrieves a user by Email or PhoneNumber via stored procedure (includes password hash for auth verification).
 */
async function getUserByEmailOrPhone(emailOrPhone) {
  const result = await executeProcedure('dbo.usp_User_GetByEmailOrPhone', {
    EmailOrPhone: emailOrPhone,
  });

  const user = result.recordsets[0]?.[0];
  if (!user) return null;

  const roles = (result.recordsets[1] || []).map(r => r.RoleCode);
  const permissions = (result.recordsets[2] || []).map(p => p.PermissionCode);

  return {
    userId: user.UserId,
    branchId: user.BranchId,
    firstName: user.FirstName,
    lastName: user.LastName,
    email: user.Email,
    phoneNumber: user.PhoneNumber,
    passwordHash: user.PasswordHash,
    passcodePin: user.PasscodePin,
    userType: user.UserType,
    avatarUrl: user.AvatarUrl,
    isActive: Boolean(user.IsActive),
    isEmailVerified: Boolean(user.IsEmailVerified),
    isPhoneVerified: Boolean(user.IsPhoneVerified),
    lastLoginAt: user.LastLoginAt,
    createdAt: user.CreatedAt,
    updatedAt: user.UpdatedAt,
    roles,
    permissions,
  };
}

/**
 * Checks if an email or phone number is already registered.
 */
async function checkExists(email = null, phoneNumber = null, excludeUserId = null) {
  const result = await executeProcedure('dbo.usp_User_CheckExists', {
    Email: email,
    PhoneNumber: phoneNumber,
    ExcludeUserId: excludeUserId ? Number(excludeUserId) : null,
  });

  const row = result.recordset[0] || {};
  return {
    emailExists: Boolean(row.EmailExists),
    phoneExists: Boolean(row.PhoneExists),
  };
}

/**
 * Updates user profile details via stored procedure.
 */
async function updateProfile(userId, data) {
  const { firstName, lastName, phoneNumber, avatarUrl } = data;
  await executeProcedure('dbo.usp_User_UpdateProfile', {
    UserId: Number(userId),
    FirstName: firstName,
    LastName: lastName || null,
    PhoneNumber: phoneNumber || null,
    AvatarUrl: avatarUrl || null,
  });

  return getUserById(userId);
}

/**
 * Updates user's LastLoginAt timestamp via stored procedure.
 */
async function updateLastLogin(userId) {
  return executeProcedure('dbo.usp_User_UpdateLastLogin', {
    UserId: Number(userId),
  });
}

/**
 * Sets user active/inactive status.
 */
async function setStatus(userId, isActive) {
  return executeProcedure('dbo.usp_User_SetStatus', {
    UserId: Number(userId),
    IsActive: isActive ? 1 : 0,
  });
}

/**
 * Retrieves user's POS PIN and authentication status.
 */
async function getPinAuth(userId) {
  const result = await executeProcedure('dbo.usp_User_GetPinAuth', {
    UserId: Number(userId),
  });

  const user = result.recordset[0];
  if (!user) return null;

  return {
    userId: user.UserId,
    firstName: user.FirstName,
    lastName: user.LastName,
    email: user.Email,
    phoneNumber: user.PhoneNumber,
    passcodePin: user.PasscodePin,
    userType: user.UserType,
    branchId: user.BranchId,
    isActive: Boolean(user.IsActive),
  };
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmailOrPhone,
  checkExists,
  updateProfile,
  updateLastLogin,
  setStatus,
  getPinAuth,
};

