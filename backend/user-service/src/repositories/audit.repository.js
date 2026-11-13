/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUDIT REPOSITORY
 * File: backend/user-service/src/repositories/audit.repository.js
 * Description: Data access repository executing SQL Server stored procedures
 *              for audit logging.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

/**
 * Creates an audit log record in dbo.AuditLogs via stored procedure.
 */
async function createLog(data) {
  const {
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
  } = data;

  const result = await executeProcedure(
    'dbo.usp_AuditLog_Create',
    {
      BranchId: branchId ? Number(branchId) : null,
      UserId: userId ? Number(userId) : null,
      EntityName: entityName,
      EntityId: String(entityId),
      ActionType: actionType,
      ActionDescription: actionDescription,
      IpAddress: ipAddress,
      UserAgent: userAgent,
      OldValuesJson: oldValues ? JSON.stringify(oldValues) : null,
      NewValuesJson: newValues ? JSON.stringify(newValues) : null,
    },
    {
      NewAuditId: sql.BigInt,
    }
  );

  return result.output.NewAuditId ? Number(result.output.NewAuditId) : null;
}

module.exports = {
  createLog,
};

