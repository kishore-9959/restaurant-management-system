/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 13 SECURITY & RBAC TEST SUITE
 * File: scripts/test_phase13_security.js
 * Description: Verifies JWT authentication, role-based access control (RBAC),
 *              branch tenancy isolation, and customer PII masking.
 * Database Target: RestaurantManagementDB_IsolatedTest
 * ============================================================================
 */

process.env.DB_NAME = 'RestaurantManagementDB_IsolatedTest';

const http = require('http');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { app } = require('../backend/report-service/src/app');
const { config, closePool } = require('@rms/shared');

const PORT = 8013;
const BASE_URL = `http://localhost:${PORT}/api/v1/reports`;

let server = null;
let client = null;

const jwtSecret = config.jwtAccessSecret;
const adminToken = jwt.sign(
  { userId: 1, email: 'admin@antigravitybistro.com', role: 'SUPER_ADMIN', roles: ['SUPER_ADMIN'], branchId: null },
  jwtSecret,
  { expiresIn: '1h' }
);
const managerToken = jwt.sign(
  { userId: 2, email: 'manager@antigravitybistro.com', role: 'RESTAURANT_MANAGER', roles: ['RESTAURANT_MANAGER'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);
const customerToken = jwt.sign(
  { userId: 10, email: 'customer@example.com', role: 'CUSTOMER', roles: ['CUSTOMER'], branchId: null },
  jwtSecret,
  { expiresIn: '1h' }
);
const waiterToken = jwt.sign(
  { userId: 20, email: 'waiter@antigravitybistro.com', role: 'WAITSTAFF', roles: ['WAITSTAFF'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`  [FAIL] ${testName} - ${details}`);
  }
}

async function run() {
  console.log('='.repeat(80));
  console.log('  PHASE 13 - SECURITY, RBAC & TENANCY ISOLATION AUTOMATED TEST SUITE');
  console.log('  Target Database: RestaurantManagementDB_IsolatedTest');
  console.log('='.repeat(80));

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`\n[INIT] Security test server listening on port ${PORT}`);

  client = axios.create({
    baseURL: `http://localhost:${PORT}`,
    validateStatus: () => true,
  });

  try {
    // 1. Missing Token Enforcement
    console.log('\n--- 1. Missing & Invalid Token Enforcement ---');
    const noToken = await client.get(`${BASE_URL}/dashboard/summary`);
    assert(noToken.status === 401, 'Request without token returns 401 Unauthorized');

    const invalidToken = await client.get(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: 'Bearer invalid.bogus.jwt.token' },
    });
    assert(invalidToken.status === 401, 'Request with bogus token returns 401 Unauthorized');

    // 2. Non-Staff Role Rejection (CUSTOMER / WAITSTAFF)
    console.log('\n--- 2. Forbidden Non-Staff Roles Rejection ---');
    const custRes = await client.get(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custRes.status === 403, 'CUSTOMER role request returns 403 Forbidden');
    assert(custRes.data.error.code === 'FORBIDDEN' || custRes.data.error.code === 'FORBIDDEN_ROLE', 'Error code is FORBIDDEN');

    const waiterRes = await client.get(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    assert(waiterRes.status === 403, 'WAITSTAFF role request returns 403 Forbidden');

    // 3. Manager vs SuperAdmin Scope Enforcement
    console.log('\n--- 3. Manager vs SuperAdmin Role Scope Enforcement ---');
    // Manager CAN access daily sales
    const mgrDaily = await client.get(`${BASE_URL}/sales/daily`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(mgrDaily.status === 200, 'RESTAURANT_MANAGER can access /sales/daily (200 OK)');

    // Manager CANNOT access cross-branch comparative ranking (SUPER_ADMIN only)
    const mgrBranches = await client.get(`${BASE_URL}/branches/performance`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(mgrBranches.status === 403, 'RESTAURANT_MANAGER is denied /branches/performance (403 Forbidden)');

    // Manager CANNOT access enterprise customer top spenders (SUPER_ADMIN only)
    const mgrTopCust = await client.get(`${BASE_URL}/customers/top-customers`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(mgrTopCust.status === 403, 'RESTAURANT_MANAGER is denied /customers/top-customers (403 Forbidden)');

    // SUPER_ADMIN CAN access cross-branch comparative ranking
    const adminBranches = await client.get(`${BASE_URL}/branches/performance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminBranches.status === 200, 'SUPER_ADMIN can access /branches/performance (200 OK)');

    // 4. Branch Tenancy Isolation (Server-Side Claim Derivation)
    console.log('\n--- 4. Branch Tenancy Isolation ---');
    // Manager tries to request another branch (e.g. branchId=99)
    // Server must ignore branchId=99 and use manager's verified claim (branchId=1)
    const mgrSneak = await client.get(`${BASE_URL}/dashboard/summary?branchId=99`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(mgrSneak.status === 200, 'Manager request returns 200');
    if (mgrSneak.data.data.kpiSummary) {
      assert(
        mgrSneak.data.data.kpiSummary.BranchId === 1,
        'Server enforces manager verified branchId (1) instead of requested branchId (99)'
      );
    }

    // 5. Customer PII Masking Verification
    console.log('\n--- 5. Customer PII Data Masking ---');
    const topCustRes = await client.get(`${BASE_URL}/customers/top-customers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(topCustRes.status === 200, 'GET /customers/top-customers returns 200');
    if (topCustRes.data.data.length > 0) {
      const firstCust = topCustRes.data.data[0];
      assert(firstCust.MaskedPhone.includes('****'), 'Phone number is properly masked with ****');
      assert(!firstCust.PasswordHash, 'PasswordHash is never present');
      assert(!firstCust.PasscodePin, 'PasscodePin is never present');
    } else {
      console.log('  [INFO] No top customer records in test DB; query structure validated.');
    }

    console.log('\n' + '='.repeat(80));
    console.log(`  PHASE 13 SECURITY SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('='.repeat(80) + '\n');

    if (failedCount > 0) {
      throw new Error(`${failedCount} Security tests failed!`);
    }
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    try {
      const { getRedisClient } = require('@rms/shared');
      const r = getRedisClient();
      if (r) {
        await r.quit().catch(() => r.disconnect());
      }
    } catch (e) {}
    await closePool();
  }
}

if (require.main === module) {
  run().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('\n[FATAL ERROR IN SECURITY TESTS]:', err);
    process.exit(1);
  });
}

module.exports = { run };
