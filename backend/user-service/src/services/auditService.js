/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/services/auditService.js
 * Description: Audit logging service using stored procedure repository.
 * ============================================================================
 */

const auditRepository = require('../repositories/audit.repository');
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
}) {
  try {
    await auditRepository.createLog({
      branchId,
      userId,
      entityName,
      entityId,
      actionType,
      actionDescription,
      ipAddress,
      userAgent,
      oldValues,
      newValues,
    });
  } catch (err) {
    logger.error('Failed to write audit log entry via stored procedure:', err.message);
  }
}

module.exports = {
  recordAudit,
};
