/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MASTER PHASE 12 TEST RUNNER
 * File: scripts/test_phase12.js
 * Description: Master orchestration runner executing all Phase 12 test suites:
 *   1. Reservation Stored Procedures Suite (SPs 210â€“225 Verification)
 *   2. Reservation Backend REST API Suite (29 Assertions across All Endpoints)
 *   3. Customer Web Reservation Frontend Architecture Suite (21 Assertions)
 *   4. End-to-End Inter-Service Integration Suite (16 Assertions)
 * ============================================================================
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('='.repeat(80));
console.log('  RESTAURANT MANAGEMENT SYSTEM (RMS)');
console.log('  MASTER PHASE 12: RESERVATION SERVICE & FLOOR SCHEDULING TEST RUNNER');
console.log('='.repeat(80));

const suites = [
  { name: 'Database Stored Procedures Suite (SPs 210-225)', file: 'scripts/test_phase12_database.js' },
  { name: 'Reservation Backend REST API Suite', file: 'scripts/test_phase12_api.js' },
  { name: 'Customer Web Frontend Architecture Suite', file: 'scripts/test_phase12_frontend.js' },
  { name: 'End-to-End Inter-Service Integration Suite', file: 'scripts/test_phase12_integration.js' },
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
    });
    passedSuites++;
    console.log(`>>> SUITE PASSED: ${suite.name}`);
  } catch (err) {
    failedSuites++;
    console.error(`>>> SUITE FAILED: ${suite.name} - ${err.message}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`  MASTER PHASE 12 SUMMARY: ${passedSuites} / ${totalSuites} SUITES PASSED`);
console.log('='.repeat(80));

if (failedSuites > 0) {
  process.exit(1);
} else {
  console.log('\n>>> ALL PHASE 12 TEST SUITES PASSED WITH 100% SUCCESS RATE! <<<\n');
  process.exit(0);
}

