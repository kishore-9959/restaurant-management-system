/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/services/userService.js
 * ============================================================================
 */

const { Op } = require('sequelize');
const { User, Employee, CustomerAddress } = require('../models');
const { recordAudit } = require('./auditService');

const USER_SAFE_ATTRS = [
  'userId',
  'branchId',
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'userType',
  'avatarUrl',
  'isActive',
  'isEmailVerified',
  'isPhoneVerified',
  'lastLoginAt',
  'createdAt',
  'updatedAt',
];

async function listUsers({ page = 1, limit = 20, userType, branchId, isActive, search }) {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const where = { isDeleted: false };

  if (userType) where.userType = userType;
  if (branchId) where.branchId = parseInt(branchId, 10);
  if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;

  if (search) {
    where[Op.or] = [
      { firstName: { [Op.like]: `%${search}%` } },
      { lastName: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phoneNumber: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: USER_SAFE_ATTRS,
    limit: parseInt(limit, 10),
    offset,
    order: [['UserId', 'ASC']],
  });

  return {
    users: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10)),
    },
  };
}

async function getUserById(userId) {
  const user = await User.findOne({
    where: { userId, isDeleted: false },
    attributes: USER_SAFE_ATTRS,
    include: [
      {
        model: Employee,
        as: 'employee',
        required: false,
      },
      {
        model: CustomerAddress,
        as: 'addresses',
        where: { isDeleted: false },
        required: false,
      },
    ],
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  return user;
}

async function updateUserStatus(userId, isActive, metadata = {}) {
  const user = await User.findOne({ where: { userId, isDeleted: false } });
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const oldStatus = user.isActive;
  user.isActive = Boolean(isActive);
  await user.save();

  await recordAudit({
    branchId: user.branchId,
    userId: metadata.currentUserId || userId,
    entityName: 'Users',
    entityId: userId,
    actionType: 'STATUS_CHANGE',
    actionDescription: `Changed user ${userId} active status from ${oldStatus} to ${user.isActive}`,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    oldValues: { isActive: oldStatus },
    newValues: { isActive: user.isActive },
  });

  return getUserById(userId);
}

module.exports = {
  listUsers,
  getUserById,
  updateUserStatus,
};
