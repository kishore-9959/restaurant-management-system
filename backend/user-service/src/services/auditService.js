/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/services/auditService.js
 * ============================================================================
 */

const { AuditLog } = require('../models');
const { createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('user-audit-service');

async function recordAudit({
  branchId = null,
  userId = null,
  entityName,
  entityId,
  actionType,
  actionDescription,
  ipAddress = null,
  userAgent = null,
  oldValues = null,
  newValues = null,
  transaction = null,
}) {
  try {
    await AuditLog.create(
      {
        branchId,
        userId,
        entityName,
        entityId: String(entityId),
        actionType,
        actionDescription,
        ipAddress,
        userAgent,
        oldValuesJson: oldValues ? JSON.stringify(oldValues) : null,
        newValuesJson: newValues ? JSON.stringify(newValues) : null,
      },
      { transaction }
    );
  } catch (err) {
    logger.error('Failed to write audit log entry:', err.message);
  }
}

module.exports = {
  recordAudit,
};

