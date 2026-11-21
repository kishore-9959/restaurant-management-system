/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 13 FRONTEND TEST SUITE
 * File: scripts/test_phase13_frontend.js
 * Description: Validates frontend component integrity, admin route decoupling,
 *              API client methods, and zero exposure in public customer navigation.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'customer-web');

console.log('='.repeat(80));
console.log('  PHASE 13 - ADMIN ANALYTICS DASHBOARD FRONTEND VERIFICATION');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function run() {
  // 1. Files existence
  console.log('\n--- 1. File Existence & Integrity ---');
  const requiredFiles = [
    'src/services/reportService.js',
    'src/pages/AdminAnalyticsDashboard.jsx',
    'src/routes/AppRoutes.jsx',
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(FRONTEND_DIR, file);
    assert(fs.existsSync(filePath), `File exists: ${file}`);
  }

  // 2. Report Service Client Methods
  console.log('\n--- 2. Report Service Client API Methods ---');
  const serviceContent = fs.readFileSync(path.join(FRONTEND_DIR, 'src/services/reportService.js'), 'utf8');
  assert(serviceContent.includes('getDashboardSummary'), 'reportService exports getDashboardSummary');
  assert(serviceContent.includes('getSalesDaily'), 'reportService exports getSalesDaily');
  assert(serviceContent.includes('getSalesTrends'), 'reportService exports getSalesTrends');
  assert(serviceContent.includes('getRevenueSummary'), 'reportService exports getRevenueSummary');
  assert(serviceContent.includes('getOrdersSummary'), 'reportService exports getOrdersSummary');
  assert(serviceContent.includes('getInventoryCurrentStock'), 'reportService exports getInventoryCurrentStock');
  assert(serviceContent.includes('getBranchPerformance'), 'reportService exports getBranchPerformance');
  assert(serviceContent.includes('downloadExport'), 'reportService exports downloadExport');

  // 3. Admin Analytics Dashboard Component
  console.log('\n--- 3. Admin Analytics Dashboard Component ---');
  const dashboardContent = fs.readFileSync(path.join(FRONTEND_DIR, 'src/pages/AdminAnalyticsDashboard.jsx'), 'utf8');
  assert(dashboardContent.includes('export default function AdminAnalyticsDashboard'), 'AdminAnalyticsDashboard default export exists');
  assert(dashboardContent.includes('Enterprise Analytics Cockpit'), 'Cockpit title is rendered');
  assert(dashboardContent.includes('handleExport'), 'Export trigger is present');
  assert(dashboardContent.includes('calculateDateRange'), 'Dynamic date range calculations exist');

  // 4. Decoupled Route Isolation
  console.log('\n--- 4. Route Isolation & Decoupling ---');
  const routesContent = fs.readFileSync(path.join(FRONTEND_DIR, 'src/routes/AppRoutes.jsx'), 'utf8');
  assert(routesContent.includes('/admin/analytics'), 'AppRoutes registers /admin/analytics');
  assert(routesContent.includes('/admin/reports'), 'AppRoutes registers /admin/reports alias');

  // 5. Customer Navigation Security (Zero exposure of admin links)
  console.log('\n--- 5. Public Customer Navigation Protection ---');
  const headerContent = fs.readFileSync(path.join(FRONTEND_DIR, 'src/components/Header.jsx'), 'utf8');
  assert(!headerContent.includes('/admin/analytics'), 'Public customer Header has zero admin analytics links');
  assert(!headerContent.includes('/admin/reports'), 'Public customer Header has zero admin report links');

  console.log('\n' + '='.repeat(80));
  console.log(`  PHASE 13 FRONTEND SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(80) + '\n');

  if (failed > 0) {
    throw new Error(`${failed} frontend tests failed!`);
  }
}

if (require.main === module) {
  run().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('\n[FATAL ERROR IN FRONTEND TESTS]:', err);
    process.exit(1);
  });
}

module.exports = { run };

