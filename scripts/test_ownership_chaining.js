const sql = require('mssql');
const config = require('../backend/shared/config/env');

(async () => {
  try {
    const pool = await sql.connect({
      user: config.db.user,
      password: config.db.password,
      server: config.db.host,
      port: Number(config.db.port),
      database: 'RestaurantManagementDB_IsolatedTest',
      options: { encrypt: false, trustServerCertificate: true }
    });
    const res = await pool.request().query(`
      BEGIN TRANSACTION;
      IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'test_report_user')
          CREATE USER [test_report_user] WITHOUT LOGIN;
      
      GRANT EXECUTE ON dbo.usp_Report_SalesDaily TO [test_report_user];
      DENY SELECT ON SCHEMA::dbo TO [test_report_user];
      DENY INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [test_report_user];

      -- Test 1: Direct SELECT must fail
      DECLARE @DirectSelectFailed BIT = 0;
      BEGIN TRY
          EXECUTE AS USER = 'test_report_user';
          SELECT TOP 1 * FROM dbo.Orders;
          REVERT;
      END TRY
      BEGIN CATCH
          REVERT;
          SET @DirectSelectFailed = 1;
      END CATCH;

      -- Test 2: Stored Procedure execution must succeed via ownership chaining
      DECLARE @SpExecSucceeded BIT = 0;
      BEGIN TRY
          EXECUTE AS USER = 'test_report_user';
          EXEC dbo.usp_Report_SalesDaily;
          REVERT;
          SET @SpExecSucceeded = 1;
      END TRY
      BEGIN CATCH
          REVERT;
          PRINT ERROR_MESSAGE();
      END CATCH;

      ROLLBACK TRANSACTION;

      SELECT @DirectSelectFailed AS DirectSelectFailed, @SpExecSucceeded AS SpExecSucceeded;
    `);
    console.log('Result:', res.recordset[0]);
    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

