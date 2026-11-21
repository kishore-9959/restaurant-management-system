/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 13 DATABASE DEPLOYMENT & TEST
 * File: scripts/test_phase13_database.js
 * Description: Deploys all 25 Report stored procedures (SPs 226–250) to
 *              RestaurantManagementDB_IsolatedTest and executes comprehensive
 *              automated unit tests.
 * STRICT RESTRICTION: Does NOT deploy to main RestaurantManagementDB.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
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
      requestTimeout: 60000,
    },
    pool: {
      max: 5,
      min: 1,
      idleTimeoutMillis: 30000,
    },
  };
}

async function executeSqlFileInBatches(pool, filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Split batches by GO, taking care of USE statements
  const batches = content
    .split(/^\s*GO\s*$/gmi)
    .map(b => b.trim())
    .filter(b => b.length > 0 && !b.toUpperCase().startsWith('USE '));

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      const req = pool.request();
      req.on('info', info => {
        if (info && info.message) {
          console.log(`  [SQL OUTPUT] ${info.message}`);
        }
      });
      await req.query(batch);
    } catch (err) {
      console.error(`Error in batch ${i + 1} of ${filePath}:`, err.message);
      console.error('Batch snippet:', batch.substring(0, 200));
      throw err;
    }
  }
}

async function run() {
  console.log('====================================================================');
  console.log('PHASE 13: REPORT STORED PROCEDURES DEPLOYMENT & ISOLATED TESTS');
  console.log('====================================================================');

  const spScriptPath = path.join(__dirname, '../database/17_ReportStoredProcedures.sql');
  const roleScriptPath = path.join(__dirname, '../database/18_ReportSecurityRole.sql');
  const testScriptPath = path.join(__dirname, '../database/tests/17_ReportStoredProcedures_Test.sql');
  const regressionTestScriptPath = path.join(__dirname, '../database/tests/17_ReportStoredProcedures_Regression_Test.sql');

  // STEP 1: Connect to Isolated Test Database
  console.log('\n>>> STEP 1: Connecting to RestaurantManagementDB_IsolatedTest...');
  const isolatedConfig = getDbConfig('RestaurantManagementDB_IsolatedTest');
  const isolatedPool = await new sql.ConnectionPool(isolatedConfig).connect();
  console.log('  Connected to RestaurantManagementDB_IsolatedTest.');

  // STEP 2: Deploy 17_ReportStoredProcedures.sql & 18_ReportSecurityRole.sql to Isolated DB
  console.log('\n>>> STEP 2: Deploying database/17_ReportStoredProcedures.sql to Isolated DB...');
  await executeSqlFileInBatches(isolatedPool, spScriptPath);
  console.log('  Successfully executed 17_ReportStoredProcedures.sql in RestaurantManagementDB_IsolatedTest.');

  console.log('\n>>> STEP 2.1: Deploying database/18_ReportSecurityRole.sql to Isolated DB...');
  await executeSqlFileInBatches(isolatedPool, roleScriptPath);
  console.log('  Successfully executed 18_ReportSecurityRole.sql in RestaurantManagementDB_IsolatedTest.');

  // STEP 3: Verify all 25 procedures exist in Isolated DB
  console.log('\n>>> STEP 3: Verifying all 25 Report stored procedures exist...');
  const routineRes = await isolatedPool.request().query(`
    SELECT ROUTINE_NAME 
    FROM INFORMATION_SCHEMA.ROUTINES 
    WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'usp_Report_%'
    ORDER BY ROUTINE_NAME
  `);
  const routines = routineRes.recordset.map(r => r.ROUTINE_NAME);
  console.log(`  Discovered ${routines.length} Report stored procedures:`);
  routines.forEach((r, idx) => console.log(`    ${idx + 1}. ${r}`));

  const expectedProcedures = [
    'usp_Report_ExecutiveDashboardSummary',
    'usp_Report_SalesDaily',
    'usp_Report_SalesMonthly',
    'usp_Report_SalesTrends',
    'usp_Report_SalesByBranch',
    'usp_Report_SalesByRestaurant',
    'usp_Report_SalesByItem',
    'usp_Report_SalesByCategory',
    'usp_Report_RevenueSummary',
    'usp_Report_RevenueByPaymentMethod',
    'usp_Report_RevenueRefunds',
    'usp_Report_OrdersSummary',
    'usp_Report_OrdersPeakHours',
    'usp_Report_TopSellingItems',
    'usp_Report_InventoryCurrentStock',
    'usp_Report_InventoryLowStock',
    'usp_Report_InventoryTransactions',
    'usp_Report_InventoryValuation',
    'usp_Report_InventoryConsumption',
    'usp_Report_ReservationSummary',
    'usp_Report_ReservationTrends',
    'usp_Report_CustomerAnalytics',
    'usp_Report_CustomerTopSpenders',
    'usp_Report_BranchPerformance',
    'usp_Report_RestaurantPerformance'
  ];

  for (const expected of expectedProcedures) {
    if (!routines.includes(expected)) {
      throw new Error(`Missing expected procedure: ${expected}`);
    }
  }

  if (routines.length < 25) {
    throw new Error(`Expected at least 25 procedures, but found ${routines.length}`);
  }
  console.log('  [PASS] All 25 stored procedures verified in database schema.');

  // STEP 4: Execute SQL Unit Tests in Isolated DB
  console.log('\n>>> STEP 4: Executing database/tests/17_ReportStoredProcedures_Test.sql...');
  
  isolatedPool.on('info', info => {
    if (info && info.message) {
      console.log(`  [SQL OUTPUT] ${info.message}`);
    }
  });

  await executeSqlFileInBatches(isolatedPool, testScriptPath);
  console.log('  [PASS] All unit tests passed in isolated test database.');

  // STEP 5: Execute Critical SQL Regression Unit Tests in Isolated DB
  console.log('\n>>> STEP 5: Executing database/tests/17_ReportStoredProcedures_Regression_Test.sql...');
  await executeSqlFileInBatches(isolatedPool, regressionTestScriptPath);
  console.log('  [PASS] All critical regression tests passed with controlled test data.');

  // STEP 6: Primary RestaurantManagementDB Status Check
  console.log('\n>>> STEP 6: Auditing Primary RestaurantManagementDB status...');
  const prodConfig = getDbConfig('RestaurantManagementDB');
  const prodPool = await new sql.ConnectionPool(prodConfig).connect();
  const prodRoutineRes = await prodPool.request().query(`
    SELECT COUNT(1) AS ReportProcCount 
    FROM INFORMATION_SCHEMA.ROUTINES 
    WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'usp_Report_%'
  `);
  const prodCount = prodRoutineRes.recordset[0].ReportProcCount;
  await prodPool.close();
  await isolatedPool.close();

  if (prodCount === 0) {
    console.log('  [PASS] Pre-deployment state: Exactly 0 report procedures in main RestaurantManagementDB.');
  } else if (prodCount === 25) {
    console.log('  [PASS] Post-deployment state: Exactly 25 report procedures active in main RestaurantManagementDB.');
  } else {
    throw new Error(`Incomplete deployment state: Found ${prodCount} report procedures (expected 0 or 25) in RestaurantManagementDB!`);
  }

  console.log('\n====================================================================');
  console.log('PHASE 13 ISOLATED DATABASE DEPLOYMENT AND VERIFICATION COMPLETED (25/25 PASSED)');
  console.log('NOTE: Main RestaurantManagementDB preserved untouched per instructions.');
  console.log('====================================================================\n');
}

if (require.main === module) {
  run().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('\n[FATAL ERROR IN DATABASE DEPLOYMENT/TESTS]:', err);
    process.exit(1);
  });
}

module.exports = { run };
