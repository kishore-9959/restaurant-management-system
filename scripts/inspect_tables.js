const path = require('path');
const { sequelize } = require(path.join(__dirname, '../backend/shared/config/database'));

async function inspect() {
  try {
    await sequelize.authenticate();
    const tables = ['Roles', 'Permissions', 'RolePermissions', 'UserRoles', 'Users', 'Employees', 'CustomerAddresses', 'AuditLogs'];
    for (const t of tables) {
      const [cols] = await sequelize.query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = '${t}'
        ORDER BY ORDINAL_POSITION
      `);
      console.log('TABLE: ' + t);
      cols.forEach(c => {
        const len = c.CHARACTER_MAXIMUM_LENGTH ? `(${c.CHARACTER_MAXIMUM_LENGTH === -1 ? 'MAX' : c.CHARACTER_MAXIMUM_LENGTH})` : '';
        console.log(`  ${c.COLUMN_NAME}: ${c.DATA_TYPE}${len} ${c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} ${c.COLUMN_DEFAULT ? 'DEFAULT ' + c.COLUMN_DEFAULT : ''}`);
      });
    }

    console.log('\n--- PRIMARY & FOREIGN KEYS ---');
    const [keys] = await sequelize.query(`
      SELECT 
        tc.TABLE_NAME, 
        tc.CONSTRAINT_TYPE, 
        tc.CONSTRAINT_NAME, 
        kcu.COLUMN_NAME,
        ccu.TABLE_NAME AS FOREIGN_TABLE_NAME,
        ccu.COLUMN_NAME AS FOREIGN_COLUMN_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      LEFT JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu 
        ON tc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
      WHERE tc.TABLE_NAME IN ('Roles', 'Permissions', 'RolePermissions', 'UserRoles', 'Users', 'Employees', 'CustomerAddresses', 'AuditLogs')
      ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_TYPE
    `);
    keys.forEach(k => {
      console.log(`${k.TABLE_NAME} | ${k.CONSTRAINT_TYPE} | ${k.CONSTRAINT_NAME} | ${k.COLUMN_NAME} -> ${k.FOREIGN_TABLE_NAME || ''}(${k.FOREIGN_COLUMN_NAME || ''})`);
    });

    console.log('\n--- SEED DATA COUNTS ---');
    for (const t of tables) {
      const [countResult] = await sequelize.query(`SELECT COUNT(*) as count FROM dbo.[${t}]`);
      console.log(`${t}: ${countResult[0].count} records`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Inspection failed:', err);
    process.exit(1);
  }
}

inspect();
