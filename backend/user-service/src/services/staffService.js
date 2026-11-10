/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/services/staffService.js
 * ============================================================================
 */

const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { config, httpClient, createServiceLogger } = require('@rms/shared');
const { User, Employee, sequelize } = require('../models');
const { recordAudit } = require('./auditService');

const logger = createServiceLogger('user-staff-service');

const AUTH_SERVICE_URL = config.authServiceUrl || 'http://localhost:8001';
const INTERNAL_HEADERS = {
  'X-Internal-Service-Key': config.internalServiceKey,
  'Content-Type': 'application/json',
};

const USER_SAFE_ATTRS = [
  'userId',
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'userType',
  'avatarUrl',
  'isActive',
  'lastLoginAt',
  'createdAt',
];

/**
 * Generate sequential EmployeeCode (e.g. EMP-BLR-005)
 */
async function generateEmployeeCode(branchId = 1) {
  const branchPrefix = branchId === 1 ? 'BLR' : `B0${branchId}`;
  const latestEmployee = await Employee.findOne({
    order: [['EmployeeId', 'DESC']],
  });

  const nextSeq = latestEmployee ? parseInt(latestEmployee.employeeId, 10) + 1 : 1;
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

  const t = await sequelize.transaction();
  let createdUser;
  let createdEmployee;

  try {
    // 1. Create User
    createdUser = await User.create(
      {
        branchId,
        firstName,
        lastName,
        email,
        phoneNumber,
        passwordHash,
        passcodePin,
        userType: 'STAFF',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
      },
      { transaction: t }
    );

    // 2. Create Employee
    createdEmployee = await Employee.create(
      {
        userId: createdUser.userId,
        branchId,
        employeeCode,
        designation,
        dateOfJoining,
        salary,
        emergencyContactPerson,
        emergencyContactPhone,
        employmentStatus: 'ACTIVE',
      },
      { transaction: t }
    );

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
      transaction: t,
    });

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  // 3. Assign Role via Auth Service internal endpoint
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
  const employee = await Employee.findOne({
    where: {
      employeeId,
      isDeleted: false,
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: USER_SAFE_ATTRS,
      },
    ],
  });

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
  const employee = await Employee.findOne({
    where: {
      employeeId,
      isDeleted: false,
    },
    include: [{ model: User, as: 'user' }],
  });

  if (!employee) {
    const error = new Error('Staff member not found.');
    error.statusCode = 404;
    error.code = 'STAFF_NOT_FOUND';
    throw error;
  }

  const allowedEmployeeFields = [
    'designation',
    'salary',
    'dateOfLeaving',
    'emergencyContactPerson',
    'emergencyContactPhone',
    'branchId',
    'employmentStatus',
  ];

  const oldValues = employee.toJSON();
  allowedEmployeeFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      employee[field] = updateData[field];
    }
  });

  // If name or phone is passed, update user record too
  if (updateData.firstName) employee.user.firstName = updateData.firstName;
  if (updateData.lastName) employee.user.lastName = updateData.lastName;
  if (updateData.phoneNumber) employee.user.phoneNumber = updateData.phoneNumber;

  const t = await sequelize.transaction();
  try {
    await employee.save({ transaction: t });
    await employee.user.save({ transaction: t });

    await recordAudit({
      branchId: employee.branchId,
      userId: metadata.currentUserId,
      entityName: 'Employees',
      entityId: employee.employeeId,
      actionType: 'UPDATE_STAFF',
      actionDescription: `Updated staff details for ${employee.employeeCode}`,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      oldValues,
      newValues: updateData,
      transaction: t,
    });

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  return getStaffById(employee.employeeId);
}

/**
 * Toggle staff employment status (ACTIVE, TERMINATED, ON_LEAVE)
 */
async function updateStaffStatus(employeeId, status, metadata = {}) {
  const validStatuses = ['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED'];
  if (!validStatuses.includes(status)) {
    const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    error.statusCode = 400;
    error.code = 'INVALID_STATUS';
    throw error;
  }

  const employee = await Employee.findOne({
    where: {
      employeeId,
      isDeleted: false,
    },
    include: [{ model: User, as: 'user' }],
  });

  if (!employee) {
    const error = new Error('Staff member not found.');
    error.statusCode = 404;
    error.code = 'STAFF_NOT_FOUND';
    throw error;
  }

  const oldStatus = employee.employmentStatus;
  employee.employmentStatus = status;

  // Sync user active state
  if (status === 'TERMINATED' || status === 'RESIGNED') {
    employee.user.isActive = false;
    employee.dateOfLeaving = new Date().toISOString().split('T')[0];
  } else if (status === 'ACTIVE') {
    employee.user.isActive = true;
  }

  const t = await sequelize.transaction();
  try {
    await employee.save({ transaction: t });
    await employee.user.save({ transaction: t });

    await recordAudit({
      branchId: employee.branchId,
      userId: metadata.currentUserId,
      entityName: 'Employees',
      entityId: employee.employeeId,
      actionType: 'STATUS_CHANGE',
      actionDescription: `Changed staff ${employee.employeeCode} status from ${oldStatus} to ${status}`,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      oldValues: { employmentStatus: oldStatus },
      newValues: { employmentStatus: status },
      transaction: t,
    });

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  return getStaffById(employee.employeeId);
}

/**
 * List staff members with pagination and filtering
 */
async function listStaff({ page = 1, limit = 20, branchId, designation, status, search }) {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const where = { isDeleted: false };
  const userWhere = { isDeleted: false };

  if (branchId) {
    where.branchId = parseInt(branchId, 10);
  }
  if (designation) {
    where.designation = designation;
  }
  if (status) {
    where.employmentStatus = status;
  }
  if (search) {
    where[Op.or] = [
      { employeeCode: { [Op.like]: `%${search}%` } },
      { designation: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Employee.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        where: userWhere,
        attributes: USER_SAFE_ATTRS,
      },
    ],
    limit: parseInt(limit, 10),
    offset,
    order: [['EmployeeId', 'ASC']],
  });

  return {
    staff: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10)),
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
