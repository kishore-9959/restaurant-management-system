/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/models/RolePermission.js
 * Table: dbo.RolePermissions
 * ============================================================================
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RolePermission = sequelize.define('RolePermission', {
    rolePermissionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'RolePermissionId',
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'RoleId',
    },
    permissionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'PermissionId',
    },
    grantedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'GrantedAt',
    },
  }, {
    tableName: 'RolePermissions',
    schema: 'dbo',
    timestamps: true,
    createdAt: 'GrantedAt',
    updatedAt: false,
    freezeTableName: true,
  });

  return RolePermission;
};

