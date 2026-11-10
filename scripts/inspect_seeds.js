const path = require('path');
const { sequelize } = require(path.join(__dirname, '../backend/shared/config/database'));

async function inspectSeed() {
  try {
    const [users] = await sequelize.query(`
      SELECT u.UserId, u.BranchId, u.FirstName, u.LastName, u.Email, u.PhoneNumber, 
             u.UserType, u.IsActive, u.PasswordHash, u.PasscodePin,
             r.RoleCode, e.EmployeeCode, e.Designation
      FROM dbo.Users u
      LEFT JOIN dbo.UserRoles ur ON u.UserId = ur.UserId
      LEFT JOIN dbo.Roles r ON ur.RoleId = r.RoleId
      LEFT JOIN dbo.Employees e ON u.UserId = e.UserId
      ORDER BY u.UserId
    `);
    console.log('--- SEED USERS & ROLES ---');
    console.table(users);

    const [roles] = await sequelize.query(`SELECT RoleId, RoleCode, RoleName, IsSystemRole FROM dbo.Roles`);
    console.log('--- ROLES ---');
    console.table(roles);

    process.exit(0);
  } catch (err) {
    console.error('Seed inspect failed:', err);
    process.exit(1);
  }
}

inspectSeed();

