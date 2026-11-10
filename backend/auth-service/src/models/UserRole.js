/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/models/UserRole.js
 * Table: dbo.UserRoles
 * ============================================================================
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserRole = sequelize.define('UserRole', {
    userRoleId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'UserRoleId',
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'UserId',
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'RoleId',
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'BranchId',
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'AssignedAt',
    },
  }, {
    tableName: 'UserRoles',
    schema: 'dbo',
    timestamps: true,
    createdAt: 'AssignedAt',
    updatedAt: false,
    freezeTableName: true,
  });

  return UserRole;
};

