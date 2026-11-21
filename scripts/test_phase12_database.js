/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 12 DATABASE DEPLOYMENT & TEST
 * File: scripts/test_phase12_database.js
 * Description: Deploys all 16 Reservation stored procedures (SPs 210â€“225) to
 *              RestaurantManagementDB_IsolatedTest, executes comprehensive unit
 *              tests, verifies routine existence, and upon success, deploys
 *              to primary database RestaurantManagementDB.
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
  // Split batches by GO
  const batches = content
    .split(/^\s*GO\s*$/gmi)
    .map(b => b.trim())
    .filter(b => b.length > 0);

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
  console.log('PHASE 12: RESERVATION STORED PROCEDURES DEPLOYMENT & AUTOMATED TESTS');
  console.log('====================================================================');

  const spScriptPath = path.join(__dirname, '../database/16_ReservationStoredProcedures.sql');
  const testScriptPath = path.join(__dirname, '../database/tests/16_ReservationStoredProcedures_Test.sql');

  // STEP 1: Connect to Isolated Test Database
  console.log('\n>>> STEP 1: Connecting to RestaurantManagementDB_IsolatedTest...');
  const isolatedConfig = getDbConfig('RestaurantManagementDB_IsolatedTest');
  const isolatedPool = await new sql.ConnectionPool(isolatedConfig).connect();
  console.log('  Connected to RestaurantManagementDB_IsolatedTest.');

  // STEP 2: Deploy 16_ReservationStoredProcedures.sql to Isolated DB
  console.log('\n>>> STEP 2: Deploying database/16_ReservationStoredProcedures.sql to Isolated DB...');
  await executeSqlFileInBatches(isolatedPool, spScriptPath);
  console.log('  Successfully executed 16_ReservationStoredProcedures.sql in RestaurantManagementDB_IsolatedTest.');

  // STEP 3: Verify all 16 procedures exist in Isolated DB
  console.log('\n>>> STEP 3: Verifying all 16 Reservation stored procedures exist...');
  const routineRes = await isolatedPool.request().query(`
    SELECT ROUTINE_NAME 
    FROM INFORMATION_SCHEMA.ROUTINES 
    WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'usp_Reservation_%'
    ORDER BY ROUTINE_NAME
  `);
  const routines = routineRes.recordset.map(r => r.ROUTINE_NAME);
  console.log(`  Discovered ${routines.length} Reservation stored procedures:`);
  routines.forEach((r, idx) => console.log(`    ${idx + 1}. ${r}`));

  if (routines.length !== 16) {
    throw new Error(`Expected exactly 16 procedures, but found ${routines.length}`);
  }
  console.log('  [PASS] All 16 stored procedures verified in database schema.');

  // STEP 4: Execute SQL Unit Tests in Isolated DB
  console.log('\n>>> STEP 4: Executing database/tests/16_ReservationStoredProcedures_Test.sql...');
  
  isolatedPool.on('info', info => {
    if (info && info.message) {
      console.log(`  [SQL OUTPUT] ${info.message}`);
    }
  });

  await executeSqlFileInBatches(isolatedPool, testScriptPath);
  console.log('  [PASS] All unit tests passed in isolated test database.');
  await isolatedPool.close();

  // STEP 5: Deploy to Primary Database (RestaurantManagementDB)
  console.log('\n>>> STEP 5: Deploying database/16_ReservationStoredProcedures.sql to primary RestaurantManagementDB...');
  const prodConfig = getDbConfig('RestaurantManagementDB');
  const prodPool = await new sql.ConnectionPool(prodConfig).connect();
  console.log('  Connected to RestaurantManagementDB.');

  await executeSqlFileInBatches(prodPool, spScriptPath);
  console.log('  Successfully executed 16_ReservationStoredProcedures.sql in RestaurantManagementDB.');

  // STEP 6: Verify all 16 procedures exist in Primary DB
  const prodRoutineRes = await prodPool.request().query(`
    SELECT ROUTINE_NAME 
    FROM INFORMATION_SCHEMA.ROUTINES 
    WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'usp_Reservation_%'
    ORDER BY ROUTINE_NAME
  `);
  const prodRoutines = prodRoutineRes.recordset.map(r => r.ROUTINE_NAME);
  console.log(`  Discovered ${prodRoutines.length} Reservation stored procedures in primary DB:`);
  prodRoutines.forEach((r, idx) => console.log(`    ${idx + 1}. ${r}`));

  if (prodRoutines.length !== 16) {
    throw new Error(`Primary DB procedure verification failed! Expected 16, found ${prodRoutines.length}`);
  }

  await prodPool.close();

  console.log('\n====================================================================');
  console.log('PHASE 12 DATABASE DEPLOYMENT AND VERIFICATION COMPLETED SUCCESSFULLY!');
  console.log('====================================================================\n');
}

if (require.main === module) {
  run().catch(err => {
    console.error('\n[FATAL ERROR IN DATABASE DEPLOYMENT/TESTS]:', err);
    process.exit(1);
  });
}

module.exports = { run };
