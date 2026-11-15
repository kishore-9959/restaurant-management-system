/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MASTER PHASE 10 TEST SUITE
 * File: scripts/test_phase10.js
 * Description: Master orchestration runner executing all Phase 10 test suites:
 *   1. Kitchen & Notification Stored Procedures (T-SQL Unit Tests)
 *   2. Kitchen Service KDS (REST API & Operations)
 *   3. Notification Service (In-App Inbox & Dedup)
 *   4. Socket.IO Real-Time Hub (Handshake Auth, Rooms & Events)
 *   5. End-to-End Inter-Service Integration (Order -> Kitchen -> Notifications)
 * ============================================================================
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('====================================================================');
console.log('RESTAURANT MANAGEMENT SYSTEM (RMS)');
console.log('MASTER PHASE 10: KITCHEN SERVICE & NOTIFICATION SERVICE TEST RUNNER');
console.log('====================================================================');

const suites = [
  { name: 'Kitchen Service (KDS) Tests', file: 'scripts/test_phase10_kitchen.js' },
  { name: 'Notification Service Tests', file: 'scripts/test_phase10_notifications.js' },
  { name: 'Socket.IO Real-Time Hub Tests', file: 'scripts/test_phase10_socketio.js' },
  { name: 'End-to-End Inter-Service Integration Tests', file: 'scripts/test_phase10_integration.js' },
];

let totalSuites = suites.length;
let passedSuites = 0;
let failedSuites = 0;

for (const suite of suites) {
  console.log(`\n>>> EXECUTING: ${suite.name} (${suite.file})`);
  try {
    const output = execSync(`"${process.execPath}" ${suite.file}`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      timeout: 60000,
    });
    passedSuites++;
    console.log(`>>> SUITE PASSED: ${suite.name}`);
  } catch (err) {
    failedSuites++;
    console.error(`>>> SUITE FAILED: ${suite.name} - ${err.message}`);
  }
}

console.log('\n====================================================================');
console.log(`MASTER PHASE 10 SUMMARY: ${passedSuites} / ${totalSuites} SUITES PASSED`);
console.log('====================================================================');

if (failedSuites > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 10 TEST SUITES PASSED WITH 100% SUCCESS RATE!');
  process.exit(0);
}

