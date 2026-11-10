/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/models/User.js
 * Table: dbo.Users
 * ============================================================================
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    userId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'UserId',
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'BranchId',
    },
    firstName: {
      type: DataTypes.STRING(60),
      allowNull: false,
      field: 'FirstName',
    },
    lastName: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: 'LastName',
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'Email',
    },
    phoneNumber: {
      type: DataTypes.STRING(25),
      allowNull: false,
      field: 'PhoneNumber',
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'PasswordHash',
    },
    passcodePin: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'PasscodePin',
    },
    userType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'CUSTOMER',
      field: 'UserType',
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'AvatarUrl',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'IsActive',
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'IsEmailVerified',
    },
    isPhoneVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'IsPhoneVerified',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'LastLoginAt',
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
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'IsDeleted',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'DeletedAt',
    },
  }, {
    tableName: 'Users',
    schema: 'dbo',
    timestamps: false,
    freezeTableName: true,
  });

  return User;
};
