/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MASTER PHASE 11 TEST RUNNER
 * File: scripts/test_phase11.js
 * Description: Master orchestration runner executing all Phase 11 test suites:
 *   1. CMS Stored Procedures (SPs 163–209 Verification)
 *   2. CMS Backend REST API (48 Assertions across Public & Admin Endpoints)
 *   3. Customer Web Frontend (98 Assertions across Registry, Pages & Theming)
 *   4. End-to-End Inter-Service Integration (22 Assertions across Gateway, CMS, Notifications)
 * ============================================================================
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('='.repeat(80));
console.log('  RESTAURANT MANAGEMENT SYSTEM (RMS)');
console.log('  MASTER PHASE 11: DYNAMIC CMS & PUBLIC CUSTOMER FRONTEND TEST RUNNER');
console.log('='.repeat(80));

const suites = [
  { name: 'Database Stored Procedures Suite (SPs 163-209)', file: 'scripts/test_phase11_database.js' },
  { name: 'CMS Backend REST API Suite', file: 'scripts/test_phase11_cms_api.js' },
  { name: 'Customer Web Frontend Architecture Suite', file: 'scripts/test_phase11_frontend.js' },
  { name: 'End-to-End Inter-Service Integration Suite', file: 'scripts/test_phase11_integration.js' },
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
      timeout: 120000,
    });
    passedSuites++;
    console.log(`>>> SUITE PASSED: ${suite.name}`);
  } catch (err) {
    failedSuites++;
    console.error(`>>> SUITE FAILED: ${suite.name} - ${err.message}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`  MASTER PHASE 11 SUMMARY: ${passedSuites} / ${totalSuites} SUITES PASSED`);
console.log('='.repeat(80));

if (failedSuites > 0) {
  process.exit(1);
} else {
  console.log('\n>>> ALL PHASE 11 TEST SUITES PASSED WITH 100% SUCCESS RATE! <<<\n');
  process.exit(0);
}

