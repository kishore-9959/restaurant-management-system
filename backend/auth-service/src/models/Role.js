/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/models/Role.js
 * Table: dbo.Roles
 * ============================================================================
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
    roleId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'RoleId',
    },
    roleCode: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      field: 'RoleCode',
    },
    roleName: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: 'RoleName',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'Description',
    },
    isSystemRole: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'IsSystemRole',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'CreatedAt',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'UpdatedAt',
    },
  }, {
    tableName: 'Roles',
    schema: 'dbo',
    timestamps: false,
    freezeTableName: true,
  });

  return Role;
};
