/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/models/index.js
 * ============================================================================
 */

const { sequelize } = require('@rms/shared');

const initUser = require('./User');
const initEmployee = require('./Employee');
const initCustomerAddress = require('./CustomerAddress');
const initAuditLog = require('./AuditLog');

const User = initUser(sequelize);
const Employee = initEmployee(sequelize);
const CustomerAddress = initCustomerAddress(sequelize);
const AuditLog = initAuditLog(sequelize);

// Associations
User.hasOne(Employee, {
  foreignKey: 'userId',
  as: 'employee',
});

Employee.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(CustomerAddress, {
  foreignKey: 'userId',
  as: 'addresses',
});

CustomerAddress.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(AuditLog, {
  foreignKey: 'userId',
  as: 'auditLogs',
});

AuditLog.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

module.exports = {
  sequelize,
  User,
  Employee,
  CustomerAddress,
  AuditLog,
};

