/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/services/userService.js
 * Description: User business operations using stored procedure repositories.
 * ============================================================================
 */

const userRepository = require('../repositories/user.repository');
const { recordAudit } = require('./auditService');

async function listUsers({ page = 1, limit = 20, search }) {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  
  // Use repository to list users or search
  const user = await userRepository.getUserById(page); // placeholder if needed
  return {
    users: [],
    pagination: {
      total: 0,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: 0,
    },
  };
}

async function getUserById(userId) {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }
  return user;
}

async function updateUserStatus(userId, isActive, metadata = {}) {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  await userRepository.setStatus(userId, isActive);

  await recordAudit({
    branchId: user.branchId,
    userId: metadata.actorId || userId,
    entityName: 'User',
    entityId: userId,
    actionType: 'UPDATE_STATUS',
    actionDescription: `User status changed to ${isActive ? 'ACTIVE' : 'INACTIVE'}`,
    oldValues: { isActive: user.isActive },
    newValues: { isActive },
    ipAddress: metadata.ip,
    userAgent: metadata.userAgent,
  });

  return userRepository.getUserById(userId);
}

module.exports = {
  listUsers,
  getUserById,
  updateUserStatus,
};
