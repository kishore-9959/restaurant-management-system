/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 11 DATABASE DEPLOYMENT & TEST
 * File: scripts/test_phase11_database.js
 * Description: Deploys all 47 CMS stored procedures (SPs 163–209) to
 *              RestaurantManagementDB_IsolatedTest, executes exhaustive unit
 *              tests, verifies routine existence, and deploys to production DB.
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
  // Split batches by GO (line starting with GO)
  const batches = content
    .split(/^\s*GO\s*$/gmi)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await pool.request().query(batch);
    } catch (err) {
      console.error(`Error in batch ${i + 1} of ${filePath}:`, err.message);
      console.error('Batch snippet:', batch.substring(0, 200));
      throw err;
    }
  }
}

async function run() {
  console.log('====================================================================');
  console.log('PHASE 11: CMS STORED PROCEDURES DEPLOYMENT & AUTOMATED SQL TESTS');
  console.log('====================================================================');

  const spScriptPath = path.join(__dirname, '../database/15_CMSStoredProcedures.sql');
  const testScriptPath = path.join(__dirname, '../database/tests/15_CMSStoredProcedures_Test.sql');

  // STEP 1: Connect to Isolated Test Database
  console.log('\n>>> STEP 1: Connecting to RestaurantManagementDB_IsolatedTest...');
  const isolatedConfig = getDbConfig('RestaurantManagementDB_IsolatedTest');
  const isolatedPool = await new sql.ConnectionPool(isolatedConfig).connect();
  console.log('  Connected to RestaurantManagementDB_IsolatedTest.');

  // STEP 2: Deploy 15_CMSStoredProcedures.sql to Isolated DB
  console.log('\n>>> STEP 2: Deploying database/15_CMSStoredProcedures.sql to Isolated DB...');
  await executeSqlFileInBatches(isolatedPool, spScriptPath);
  console.log('  Successfully executed 15_CMSStoredProcedures.sql in RestaurantManagementDB_IsolatedTest.');

  // STEP 3: Verify all 47 procedures exist in Isolated DB
  console.log('\n>>> STEP 3: Verifying all 47 CMS stored procedures exist...');
  const routineRes = await isolatedPool.request().query(`
    SELECT ROUTINE_NAME 
    FROM INFORMATION_SCHEMA.ROUTINES 
    WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'usp_CMS_%'
    ORDER BY ROUTINE_NAME
  `);
  const routines = routineRes.recordset.map(r => r.ROUTINE_NAME);
  console.log(`  Discovered ${routines.length} CMS stored procedures:`);
  routines.forEach((r, idx) => console.log(`    ${idx + 1}. ${r}`));

  if (routines.length !== 47) {
    throw new Error(`Expected exactly 47 procedures, but found ${routines.length}`);
  }
  console.log('  [PASS] All 47 stored procedures verified in database schema.');

  // STEP 4: Execute SQL Unit Tests in Isolated DB
  console.log('\n>>> STEP 4: Executing database/tests/15_CMSStoredProcedures_Test.sql...');
  
  // Intercept SQL PRINT statements
  isolatedPool.on('info', info => {
    if (info && info.message) {
      console.log(`  [SQL OUTPUT] ${info.message}`);
    }
  });

  await executeSqlFileInBatches(isolatedPool, testScriptPath);
  console.log('  [PASS] All unit tests completed with zero assertion failures in Isolated DB.');
  await isolatedPool.close();

  // STEP 5: Deploy to Primary Database (RestaurantManagementDB)
  console.log('\n>>> STEP 5: Deploying verified procedures to primary RestaurantManagementDB...');
  const prodConfig = getDbConfig('RestaurantManagementDB');
  const prodPool = await new sql.ConnectionPool(prodConfig).connect();
  await executeSqlFileInBatches(prodPool, spScriptPath);
  console.log('  Successfully deployed 15_CMSStoredProcedures.sql to RestaurantManagementDB.');

  const prodRoutineRes = await prodPool.request().query(`
    SELECT COUNT(1) AS TotalCount
    FROM INFORMATION_SCHEMA.ROUTINES 
    WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'usp_CMS_%'
  `);
  console.log(`  Verified ${prodRoutineRes.recordset[0].TotalCount} CMS procedures active in RestaurantManagementDB.`);
  await prodPool.close();

  console.log('\n====================================================================');
  console.log('PHASE 11 DATABASE DEPLOYMENT & SQL TEST SUITE PASSED SUCCESSFULLY');
  console.log('====================================================================\n');
}

run().catch(err => {
  console.error('\n[FATAL ERROR]:', err);
  process.exit(1);
});

