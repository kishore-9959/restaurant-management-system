/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/models/Permission.js
 * Table: dbo.Permissions
 * ============================================================================
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Permission = sequelize.define('Permission', {
    permissionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'PermissionId',
    },
    module: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'Module',
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'Action',
    },
    permissionCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'PermissionCode',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'Description',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'CreatedAt',
    },
  }, {
    tableName: 'Permissions',
    schema: 'dbo',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: false,
    freezeTableName: true,
  });

  return Permission;
};

