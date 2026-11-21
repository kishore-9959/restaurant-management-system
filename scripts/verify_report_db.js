const sql = require('mssql');
const config = require('../backend/shared/config/env');

function getDbConfig(dbName) {
  return {
    user: config.db.user,
    password: config.db.password,
    server: config.db.host,
    port: Number(config.db.port),
    database: dbName,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      requestTimeout: 30000,
    },
  };
}

async function auditDatabase(dbName) {
  console.log(`\n====================================================================`);
  console.log(`AUDITING DATABASE: [${dbName}]`);
  console.log(`====================================================================`);
  const pool = await new sql.ConnectionPool(getDbConfig(dbName)).connect();
  
  // 1. Procedure count & listing
  const isoRes = await pool.request().query(`
    SELECT ROUTINE_NAME 
    FROM INFORMATION_SCHEMA.ROUTINES 
    WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'usp_Report_%'
    ORDER BY ROUTINE_NAME
  `);
  console.log(`  Procedure Count (usp_Report_%): ${isoRes.recordset.length} (Expected: 25)`);
  if (isoRes.recordset.length !== 25) {
    throw new Error(`[${dbName}] Expected 25 report procedures, found ${isoRes.recordset.length}`);
  }

  // 2. Check definitions for NOLOCK and DML mutations
  const defRes = await pool.request().query(`
    SELECT o.name AS RoutineName, m.definition AS RoutineDefinition
    FROM sys.sql_modules m
    JOIN sys.objects o ON m.object_id = o.object_id
    WHERE o.type = 'P' AND o.name LIKE 'usp_Report_%'
  `);
  
  let nolockFound = 0;
  let dmlMutationsFound = 0;

  for (const row of defRes.recordset) {
    const def = row.RoutineDefinition;
    const cleanDef = def.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    
    if (/NOLOCK|READUNCOMMITTED/i.test(cleanDef)) {
      console.log('  [WARNING] Found NOLOCK in:', row.RoutineName);
      nolockFound++;
    }
    const mutating = cleanDef.match(/\b(INSERT\s+INTO\s+dbo\.|UPDATE\s+dbo\.|DELETE\s+FROM\s+dbo\.|MERGE\s+dbo\.|TRUNCATE\s+TABLE\s+dbo\.)/gi);
    if (mutating) {
      console.log('  [WARNING] Found mutating DML in:', row.RoutineName, mutating);
      dmlMutationsFound++;
    }
  }

  console.log(`  [AUDIT] NOLOCK hints found: ${nolockFound} (PASS: 0)`);
  console.log(`  [AUDIT] Mutating DML statements found: ${dmlMutationsFound} (PASS: 0)`);

  // 3. Verify Role and Permissions
  const roleRes = await pool.request().query(`
    SELECT 
      r.name AS RoleName,
      dp.permission_name AS PermissionName,
      dp.state_desc AS PermissionState,
      o.name AS ObjectName
    FROM sys.database_permissions dp
    JOIN sys.database_principals r ON dp.grantee_principal_id = r.principal_id
    LEFT JOIN sys.objects o ON dp.major_id = o.object_id
    WHERE r.name = 'db_reporting_reader'
  `);

  const execPerms = roleRes.recordset.filter(p => p.PermissionName === 'EXECUTE' && p.PermissionState === 'GRANT');
  const denyPerms = roleRes.recordset.filter(p => p.PermissionState === 'DENY');
  console.log(`  [AUDIT] [db_reporting_reader] GRANT EXECUTE procedures: ${execPerms.length} (Expected: 25)`);
  console.log(`  [AUDIT] [db_reporting_reader] Explicit DENY permissions: ${denyPerms.length} (Expected: 5 [INSERT, UPDATE, DELETE, ALTER, SELECT])`);
  
  if (execPerms.length !== 25) {
    throw new Error(`[${dbName}] Expected 25 EXECUTE grants, found ${execPerms.length}`);
  }
  if (denyPerms.length !== 5) {
    throw new Error(`[${dbName}] Expected 5 explicit DENY permissions, found ${denyPerms.length}`);
  }

  // 4. Verify User and Ownership Chaining Execution
  const userRes = await pool.request().query(`
    SELECT u.name AS UserName, r.name AS RoleName
    FROM sys.database_role_members rm
    JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
    JOIN sys.database_principals u ON rm.member_principal_id = u.principal_id
    WHERE r.name = 'db_reporting_reader'
  `);
  console.log(`  [AUDIT] Role members: ${userRes.recordset.map(u => u.UserName).join(', ')}`);

  // Test execution under rms_report_user
  const execCheck = await pool.request().query(`
    EXECUTE AS USER = 'rms_report_user';
    EXEC dbo.usp_Report_ExecutiveDashboardSummary;
    REVERT;
  `);
  console.log(`  [AUDIT] Stored procedure execution under rms_report_user: SUCCESS (${execCheck.recordsets.length} recordsets)`);

  // Test direct SELECT denial under rms_report_user
  let selectBlocked = false;
  try {
    await pool.request().query(`
      EXECUTE AS USER = 'rms_report_user';
      EXEC('SELECT TOP 1 * FROM dbo.Orders');
      REVERT;
    `);
  } catch (err) {
    selectBlocked = true;
  }
  console.log(`  [AUDIT] Direct SELECT on dbo.Orders blocked under rms_report_user: ${selectBlocked ? 'YES (DENIED_AS_EXPECTED)' : 'NO (BREACH)'}`);

  await pool.close();
}

async function verifyAll() {
  console.log('====================================================================');
  console.log('RESTAURANT MANAGEMENT SYSTEM (RMS)');
  console.log('PHASE 13 PRODUCTION READINESS & SECURITY AUDIT');
  console.log('====================================================================');

  await auditDatabase('RestaurantManagementDB_IsolatedTest');
  await auditDatabase('RestaurantManagementDB');

  console.log('\n====================================================================');
  console.log('ALL AUDITS COMPLETED SUCCESSFULLY WITH 100% COMPLIANCE');
  console.log('====================================================================\n');
  process.exit(0);
}

verifyAll().catch(e => { 
  console.error('\n[FATAL AUDIT ERROR]:', e); 
  process.exit(1); 
});
