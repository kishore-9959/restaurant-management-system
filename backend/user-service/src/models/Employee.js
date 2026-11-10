/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/models/Employee.js
 * Table: dbo.Employees
 * ============================================================================
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Employee = sequelize.define('Employee', {
    employeeId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'EmployeeId',
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
      field: 'UserId',
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'BranchId',
    },
    employeeCode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'EmployeeCode',
    },
    designation: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: 'Designation',
    },
    dateOfJoining: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'DateOfJoining',
    },
    dateOfLeaving: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'DateOfLeaving',
    },
    salary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      field: 'Salary',
    },
    emergencyContactPerson: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'EmergencyContactPerson',
    },
    emergencyContactPhone: {
      type: DataTypes.STRING(25),
      allowNull: true,
      field: 'EmergencyContactPhone',
    },
    employmentStatus: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'ACTIVE',
      field: 'EmploymentStatus',
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
    tableName: 'Employees',
    schema: 'dbo',
    timestamps: false,
    freezeTableName: true,
  });

  return Employee;
};
