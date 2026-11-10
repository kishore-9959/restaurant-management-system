/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/models/AuditLog.js
 * Table: dbo.AuditLogs
 * ============================================================================
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    auditId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'AuditId',
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'BranchId',
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'UserId',
    },
    entityName: {
      type: DataTypes.STRING(60),
      allowNull: false,
      field: 'EntityName',
    },
    entityId: {
      type: DataTypes.STRING(60),
      allowNull: false,
      field: 'EntityId',
    },
    actionType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'ActionType',
    },
    actionDescription: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'ActionDescription',
    },
    ipAddress: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'IpAddress',
    },
    userAgent: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'UserAgent',
    },
    oldValuesJson: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'OldValuesJson',
    },
    newValuesJson: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'NewValuesJson',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'CreatedAt',
    },
  }, {
    tableName: 'AuditLogs',
    schema: 'dbo',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: false,
    freezeTableName: true,
  });

  return AuditLog;
};

