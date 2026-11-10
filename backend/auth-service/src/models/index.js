/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/models/index.js
 * ============================================================================
 */

const { sequelize } = require('@rms/shared');

const initRole = require('./Role');
const initPermission = require('./Permission');
const initRolePermission = require('./RolePermission');
const initUserRole = require('./UserRole');

const Role = initRole(sequelize);
const Permission = initPermission(sequelize);
const RolePermission = initRolePermission(sequelize);
const UserRole = initUserRole(sequelize);

// Associations
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'roleId',
  otherKey: 'permissionId',
  as: 'permissions',
});

Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permissionId',
  otherKey: 'roleId',
  as: 'roles',
});

Role.hasMany(UserRole, {
  foreignKey: 'roleId',
  as: 'userRoles',
});

UserRole.belongsTo(Role, {
  foreignKey: 'roleId',
  as: 'role',
});

module.exports = {
  sequelize,
  Role,
  Permission,
  RolePermission,
  UserRole,
};

