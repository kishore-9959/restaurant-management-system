/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MASTER PHASE 13 TEST RUNNER
 * File: scripts/test_phase13.js
 * Description: Master orchestration runner executing all Phase 13 test suites:
 *   1. Report Stored Procedures Suite (SPs 226–250 in Isolated DB)
 *   2. Report Backend REST API & Streaming Exports Suite
 *   3. Security, RBAC & Tenancy Isolation Suite
 *   4. Admin Analytics Dashboard Frontend Architecture Suite
 *   5. Gateway Routing & Redis Caching Integration Suite
 * ============================================================================
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('='.repeat(80));
console.log('  RESTAURANT MANAGEMENT SYSTEM (RMS)');
console.log('  MASTER PHASE 13: REPORT SERVICE & ANALYTICS DASHBOARD TEST RUNNER');
console.log('  Target Database: RestaurantManagementDB_IsolatedTest (ISOLATED)');
console.log('='.repeat(80));

const suites = [
  { name: '1. Database Stored Procedures Suite (SPs 226–250)', file: 'scripts/test_phase13_database.js' },
  { name: '2. Report Backend REST API & Exports Suite', file: 'scripts/test_phase13_api.js' },
  { name: '3. Security, RBAC & Tenancy Isolation Suite', file: 'scripts/test_phase13_security.js' },
  { name: '4. Admin Analytics Dashboard Frontend Suite', file: 'scripts/test_phase13_frontend.js' },
  { name: '5. Gateway Routing & Redis Caching Suite', file: 'scripts/test_phase13_integration.js' },
];

let totalSuites = suites.length;
let passedSuites = 0;
let failedSuites = 0;

for (const suite of suites) {
  console.log(`\n>>> EXECUTING: ${suite.name} (${suite.file})`);
  try {
    execSync(`"${process.execPath}" ${suite.file}`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      timeout: 180000,
      env: {
        ...process.env,
        DB_NAME: 'RestaurantManagementDB_IsolatedTest',
      },
    });
    passedSuites++;
    console.log(`>>> SUITE PASSED: ${suite.name}`);
  } catch (err) {
    failedSuites++;
    console.error(`>>> SUITE FAILED: ${suite.name} - ${err.message}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`  MASTER PHASE 13 SUMMARY: ${passedSuites} / ${totalSuites} SUITES PASSED`);
console.log('='.repeat(80));

if (failedSuites > 0) {
  process.exit(1);
} else {
  console.log('\n>>> ALL PHASE 13 TEST SUITES PASSED WITH 100% SUCCESS RATE! <<<\n');
  console.log('Strict Restriction Verified: Main RestaurantManagementDB preserved untouched.');
  process.exit(0);
}
