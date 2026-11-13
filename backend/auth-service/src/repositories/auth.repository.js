/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH REPOSITORY
 * File: backend/auth-service/src/repositories/auth.repository.js
 * Description: Data access repository executing SQL Server stored procedures
 *              via the global shared database configuration.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

/**
 * Retrieves all assigned roles and granular permissions for a given user.
 * 
 * @param {number|string} userId - Target user ID
 * @returns {Promise<{roles: Array<string>, permissions: Array<string>, branchId: number|null}>}
 */
async function getUserRolesAndPermissions(userId) {
  const result = await executeProcedure('dbo.usp_Auth_GetUserRolesAndPermissions', {
    UserId: Number(userId),
  });

  const rolesRecordset = result.recordsets[0] || [];
  const permsRecordset = result.recordsets[1] || [];

  const roles = rolesRecordset.map(r => r.RoleCode);
  const permissions = Array.from(new Set(permsRecordset.map(p => p.PermissionCode)));
  const branchId = rolesRecordset.find(r => r.BranchId !== null)?.BranchId || null;

  return {
    roles,
    permissions,
    branchId,
  };
}

/**
 * Assigns a role to a user by RoleCode.
 * 
 * @param {number|string} userId - User identifier
 * @param {string} roleCode - Code of the role (e.g. 'CUSTOMER', 'SUPER_ADMIN')
 * @param {number|null} branchId - Optional branch assignment
 * @returns {Promise<{userRoleId: number}>}
 */
async function assignRole(userId, roleCode, branchId = null) {
  const result = await executeProcedure(
    'dbo.usp_Auth_AssignRole',
    {
      UserId: Number(userId),
      RoleCode: roleCode,
      BranchId: branchId ? Number(branchId) : null,
    },
    {
      UserRoleId: sql.BigInt,
    }
  );

  return {
    userRoleId: result.output.UserRoleId,
  };
}

/**
 * Retrieves all active system roles.
 * 
 * @returns {Promise<Array>}
 */
async function getAllRoles() {
  const result = await executeProcedure('dbo.usp_Auth_GetAllRoles');
  return result.recordset || [];
}

/**
 * Updates a user's last login timestamp.
 * 
 * @param {number|string} userId 
 */
async function updateLastLogin(userId) {
  return executeProcedure('dbo.usp_User_UpdateLastLogin', {
    UserId: Number(userId),
  });
}

module.exports = {
  getUserRolesAndPermissions,
  assignRole,
  getAllRoles,
  updateLastLogin,
};

