/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - EMPLOYEE REPOSITORY
 * File: backend/user-service/src/repositories/employee.repository.js
 * Description: Data access repository executing SQL Server stored procedures
 *              for staff and employee operations.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

function formatEmployee(row) {
  if (!row) return null;
  return {
    employeeId: row.EmployeeId,
    userId: row.UserId,
    branchId: row.BranchId,
    employeeCode: row.EmployeeCode,
    designation: row.Designation,
    dateOfJoining: row.DateOfJoining,
    dateOfLeaving: row.DateOfLeaving,
    salary: row.Salary !== null ? Number(row.Salary) : 0,
    emergencyContactPerson: row.EmergencyContactPerson,
    emergencyContactPhone: row.EmergencyContactPhone,
    employmentStatus: row.EmploymentStatus,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
    user: row.FirstName ? {
      userId: row.UserId,
      firstName: row.FirstName,
      lastName: row.LastName,
      email: row.Email,
      phoneNumber: row.PhoneNumber,
      userType: row.UserType,
      isActive: Boolean(row.IsActive),
    } : null,
  };
}

/**
 * Creates an employee record in dbo.Employees via stored procedure.
 */
async function createEmployee(data) {
  const {
    userId,
    branchId,
    employeeCode,
    designation,
    dateOfJoining,
    salary = 0.00,
    emergencyContactPerson = null,
    emergencyContactPhone = null,
    employmentStatus = 'ACTIVE',
  } = data;

  const result = await executeProcedure(
    'dbo.usp_Employee_Create',
    {
      UserId: Number(userId),
      BranchId: Number(branchId),
      EmployeeCode: employeeCode,
      Designation: designation,
      DateOfJoining: dateOfJoining,
      Salary: Number(salary),
      EmergencyContactPerson: emergencyContactPerson,
      EmergencyContactPhone: emergencyContactPhone,
      EmploymentStatus: employmentStatus,
    },
    {
      NewEmployeeId: sql.BigInt,
    }
  );

  const employeeId = result.output.NewEmployeeId ? Number(result.output.NewEmployeeId) : null;
  return getEmployeeById(employeeId);
}

/**
 * Retrieves employee by EmployeeId via stored procedure.
 */
async function getEmployeeById(employeeId) {
  const result = await executeProcedure('dbo.usp_Employee_GetById', {
    EmployeeId: Number(employeeId),
  });

  return formatEmployee(result.recordset[0]);
}

/**
 * Retrieves employee by UserId via stored procedure.
 */
async function getEmployeeByUserId(userId) {
  const result = await executeProcedure('dbo.usp_Employee_GetByUserId', {
    UserId: Number(userId),
  });

  return formatEmployee(result.recordset[0]);
}

/**
 * Lists employees matching filters.
 */
async function listEmployees(filters = {}) {
  const {
    branchId = null,
    designation = null,
    employmentStatus = null,
    searchTerm = null,
    limit = 50,
    offset = 0,
  } = filters;

  const result = await executeProcedure('dbo.usp_Employee_List', {
    BranchId: branchId ? Number(branchId) : null,
    Designation: designation || null,
    EmploymentStatus: employmentStatus || null,
    SearchTerm: searchTerm || null,
    Limit: Number(limit),
    Offset: Number(offset),
  });

  return (result.recordset || []).map(formatEmployee);
}

/**
 * Updates employee details via stored procedure.
 */
async function updateEmployee(employeeId, data) {
  const {
    designation = null,
    salary = null,
    dateOfJoining = null,
    emergencyContactPerson = null,
    emergencyContactPhone = null,
  } = data;

  await executeProcedure('dbo.usp_Employee_Update', {
    EmployeeId: Number(employeeId),
    Designation: designation,
    Salary: salary !== null && salary !== undefined ? Number(salary) : null,
    DateOfJoining: dateOfJoining,
    EmergencyContactPerson: emergencyContactPerson,
    EmergencyContactPhone: emergencyContactPhone,
  });

  return getEmployeeById(employeeId);
}

/**
 * Updates employee status and syncs user IsActive status via stored procedure.
 */
async function updateStatus(employeeId, status) {
  await executeProcedure('dbo.usp_Employee_UpdateStatus', {
    EmployeeId: Number(employeeId),
    EmploymentStatus: status,
  });

  return getEmployeeById(employeeId);
}

module.exports = {
  createEmployee,
  getEmployeeById,
  getEmployeeByUserId,
  listEmployees,
  updateEmployee,
  updateStatus,
};

