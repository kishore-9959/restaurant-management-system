/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/services/staffService.js
 * Description: Staff and Employee management operations using stored procedure repositories.
 * ============================================================================
 */

const bcrypt = require('bcryptjs');
const { config, httpClient, createServiceLogger } = require('@rms/shared');
const userRepository = require('../repositories/user.repository');
const employeeRepository = require('../repositories/employee.repository');
const { recordAudit } = require('./auditService');

const logger = createServiceLogger('user-staff-service');

const AUTH_SERVICE_URL = config.authServiceUrl || 'http://localhost:8001';
const INTERNAL_HEADERS = {
  'X-Internal-Service-Key': config.internalServiceKey,
  'Content-Type': 'application/json',
};

/**
 * Generate sequential EmployeeCode (e.g. EMP-BLR-005)
 */
async function generateEmployeeCode(branchId = 1) {
  const branchPrefix = branchId === 1 ? 'BLR' : `B0${branchId}`;
  const employees = await employeeRepository.listEmployees({ limit: 100 });
  const maxId = employees.reduce((max, e) => Math.max(max, Number(e.employeeId) || 0), 0);
  const nextSeq = maxId + 1;
  const padded = String(nextSeq).padStart(3, '0');
  return `EMP-${branchPrefix}-${padded}`;
}

/**
 * Create a new staff member (User + Employee record + Auth Role assignment)
 */
async function createStaff(staffData, metadata = {}) {
  const {
    branchId = 1,
    firstName,
    lastName,
    email,
    phoneNumber,
    password = 'Password@123',
    pin = '1234',
    designation,
    dateOfJoining = new Date().toISOString().split('T')[0],
    salary = 0.00,
    emergencyContactPerson,
    emergencyContactPhone,
    roleCode = 'WAITSTAFF',
  } = staffData;

  const saltRounds = parseInt(config.bcryptSaltRounds, 10) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const passcodePin = await bcrypt.hash(pin, saltRounds);

  const employeeCode = staffData.employeeCode || (await generateEmployeeCode(branchId));

  // 1. Create User via stored procedure repository
  const createdUser = await userRepository.createUser({
    firstName,
    lastName,
    email,
    phoneNumber,
    passwordHash,
    passcodePin,
    userType: 'STAFF',
    branchId,
    isActive: true,
  });

  // 2. Create Employee via stored procedure repository
  const createdEmployee = await employeeRepository.createEmployee({
    userId: createdUser.userId,
    branchId,
    employeeCode,
    designation,
    dateOfJoining,
    salary,
    emergencyContactPerson,
    emergencyContactPhone,
    employmentStatus: 'ACTIVE',
  });

  // 3. Record Audit log
  await recordAudit({
    branchId,
    userId: metadata.currentUserId || createdUser.userId,
    entityName: 'Employees',
    entityId: createdEmployee.employeeId,
    actionType: 'CREATE_STAFF',
    actionDescription: `Created staff member ${employeeCode} (${designation})`,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    newValues: {
      userId: createdUser.userId,
      employeeCode,
      designation,
      branchId,
    },
  });

  // 4. Assign Role via Auth Service internal endpoint
  try {
    await httpClient.post(
      `${AUTH_SERVICE_URL}/api/v1/auth/internal/assign-role`,
      {
        userId: createdUser.userId,
        roleCode,
        branchId,
      },
      { headers: INTERNAL_HEADERS }
    );
  } catch (err) {
    logger.warn(`Failed to assign role ${roleCode} via Auth Service: ${err.message}`);
  }

  return getStaffById(createdEmployee.employeeId);
}

/**
 * Get staff details by employeeId
 */
async function getStaffById(employeeId) {
  const employee = await employeeRepository.getEmployeeById(employeeId);
  if (!employee) {
    const error = new Error('Staff member not found.');
    error.statusCode = 404;
    error.code = 'STAFF_NOT_FOUND';
    throw error;
  }
  return employee;
}

/**
 * Update staff details
 */
async function updateStaff(employeeId, updateData, metadata = {}) {
  const existing = await employeeRepository.getEmployeeById(employeeId);
  if (!existing) {
    const error = new Error('Staff member not found.');
    error.statusCode = 404;
    error.code = 'STAFF_NOT_FOUND';
    throw error;
  }

  const updatedEmployee = await employeeRepository.updateEmployee(employeeId, {
    designation: updateData.designation,
    salary: updateData.salary,
    dateOfJoining: updateData.dateOfJoining,
    emergencyContactPerson: updateData.emergencyContactPerson,
    emergencyContactPhone: updateData.emergencyContactPhone,
  });

  if (updateData.firstName || updateData.lastName || updateData.phoneNumber) {
    await userRepository.updateProfile(existing.userId, {
      firstName: updateData.firstName || existing.user?.firstName,
      lastName: updateData.lastName || existing.user?.lastName,
      phoneNumber: updateData.phoneNumber || existing.user?.phoneNumber,
    });
  }

  await recordAudit({
    branchId: existing.branchId,
    userId: metadata.currentUserId,
    entityName: 'Employees',
    entityId: employeeId,
    actionType: 'UPDATE_STAFF',
    actionDescription: `Updated staff details for ${existing.employeeCode}`,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    oldValues: existing,
    newValues: updateData,
  });

  return getStaffById(employeeId);
}

/**
 * Toggle staff employment status (ACTIVE, TERMINATED, ON_LEAVE)
 */
async function updateStaffStatus(employeeId, status, metadata = {}) {
  const validStatuses = ['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED', 'INACTIVE'];
  if (!validStatuses.includes(status)) {
    const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    error.statusCode = 400;
    error.code = 'INVALID_STATUS';
    throw error;
  }

  const existing = await employeeRepository.getEmployeeById(employeeId);
  if (!existing) {
    const error = new Error('Staff member not found.');
    error.statusCode = 404;
    error.code = 'STAFF_NOT_FOUND';
    throw error;
  }

  const updated = await employeeRepository.updateStatus(employeeId, status);

  await recordAudit({
    branchId: existing.branchId,
    userId: metadata.currentUserId,
    entityName: 'Employees',
    entityId: employeeId,
    actionType: 'STATUS_CHANGE',
    actionDescription: `Changed staff ${existing.employeeCode} status from ${existing.employmentStatus} to ${status}`,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    oldValues: { employmentStatus: existing.employmentStatus },
    newValues: { employmentStatus: status },
  });

  return updated;
}

/**
 * List staff members with pagination and filtering
 */
async function listStaff({ page = 1, limit = 20, branchId, designation, status, search }) {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const staff = await employeeRepository.listEmployees({
    branchId,
    designation,
    employmentStatus: status,
    searchTerm: search,
    limit: parseInt(limit, 10),
    offset,
  });

  return {
    staff,
    pagination: {
      total: staff.length,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: 1,
    },
  };
}

module.exports = {
  createStaff,
  getStaffById,
  updateStaff,
  updateStaffStatus,
  listStaff,
};
