const sql = require('mssql');
const config = require('../backend/shared/config/env');

const dbConfig = {
  user: config.db.user,
  password: config.db.password,
  server: config.db.host,
  port: Number(config.db.port),
  database: 'RestaurantManagementDB_IsolatedTest',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

(async () => {
  const pool = await new sql.ConnectionPool(dbConfig).connect();
  const res = await pool.request().query(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME IN ('DiningSections')
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  console.log(JSON.stringify(res.recordset, null, 2));
  await pool.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
