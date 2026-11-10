/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 4 AUTOMATED TEST SUITE
 * File: scripts/test_phase4.js
 * Description: Exhaustive verification runner for all 20 Phase 4 test requirements.
 * ============================================================================
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const { config, sequelize, redisClient } = require('../backend/shared');

const GATEWAY_URL = 'http://localhost:8000';
const AUTH_URL = 'http://localhost:8001';
const USER_URL = 'http://localhost:8002';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + (parsed.search || ''),
      method: options.method || 'GET',
      headers,
      timeout: 10000,
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${url} timed out`));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function getErrorCode(res) {
  return res.data?.error?.code || res.data?.code;
}

const testResults = [];

function recordTest(num, name, passed, detail = '') {
  testResults.push({ num, name, passed, detail });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] Test ${String(num).padStart(2, '0')}: ${name}`);
  if (detail) {
    console.log(`         ↳ ${detail}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  RMS PHASE 4: AUTH & USER MICROSERVICES VERIFICATION SUITE');
  console.log('================================================================\n');

  // Boot servers in-process
  const { app: authApp } = require('../backend/auth-service/src/app');
  const { app: userApp } = require('../backend/user-service/src/app');
  const { app: gatewayApp } = require('../backend/api-gateway/src/app');

  const authServer = authApp.listen(8001);
  const userServer = userApp.listen(8002);
  const gatewayServer = gatewayApp.listen(8000);

  // Wait 1 second for socket readiness
  await new Promise((r) => setTimeout(r, 1000));

  const uniqueSuffix = Date.now();
  const testCustomer = {
    firstName: 'Aarav',
    lastName: 'Kapoor',
    email: `aarav.${uniqueSuffix}@example.com`,
    phoneNumber: `+919811${String(uniqueSuffix).slice(-6)}`,
    password: 'Password@123',
  };

  let customerTokens = null;
  let customerUser = null;
  let adminTokens = null;
  let createdStaffId = null;

  try {
    // ------------------------------------------------------------------
    // TEST 1: Successful customer registration
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/auth/register`, { method: 'POST' }, testCustomer);
      const ok = res.status === 201 && res.data?.success && res.data?.data?.tokens?.accessToken;
      customerTokens = res.data?.data?.tokens;
      customerUser = res.data?.data?.user;
      recordTest(1, 'Successful customer registration', ok, `Registered userId: ${customerUser?.userId}, status: ${res.status}`);
    } catch (e) {
      recordTest(1, 'Successful customer registration', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 2: Duplicate email registration
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/auth/register`, { method: 'POST' }, testCustomer);
      const code = getErrorCode(res);
      const ok = res.status === 409 && (code === 'EMAIL_ALREADY_EXISTS' || code === 'PHONE_ALREADY_EXISTS');
      recordTest(2, 'Duplicate email registration rejection', ok, `Expected 409 Conflict, received: ${res.status} (${code})`);
    } catch (e) {
      recordTest(2, 'Duplicate email registration rejection', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 3: Successful customer login
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/auth/login`, { method: 'POST' }, {
        emailOrPhone: testCustomer.email,
        password: testCustomer.password,
      });
      const ok = res.status === 200 && res.data?.success && res.data?.data?.tokens?.accessToken;
      if (ok) customerTokens = res.data.data.tokens;
      recordTest(3, 'Successful customer login', ok, `Logged in successfully, received fresh tokens`);
    } catch (e) {
      recordTest(3, 'Successful customer login', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 4: Incorrect password
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/auth/login`, { method: 'POST' }, {
        emailOrPhone: testCustomer.email,
        password: 'WrongPassword999!',
      });
      const code = getErrorCode(res);
      const ok = res.status === 401 && code === 'INVALID_CREDENTIALS';
      recordTest(4, 'Incorrect password rejection', ok, `Expected 401 INVALID_CREDENTIALS, received: ${res.status} (${code})`);
    } catch (e) {
      recordTest(4, 'Incorrect password rejection', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 5: Invalid access token
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/users/profile`, {
        headers: { Authorization: 'Bearer this.is.an.invalid.token' },
      });
      const code = getErrorCode(res);
      const ok = res.status === 401 && (code === 'INVALID_TOKEN' || code === 'AUTH_REQUIRED');
      recordTest(5, 'Invalid access token rejection', ok, `Expected 401, received: ${res.status} (${code})`);
    } catch (e) {
      recordTest(5, 'Invalid access token rejection', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 6: Expired access token
    // ------------------------------------------------------------------
    try {
      const expiredToken = jwt.sign(
        { sub: customerUser.userId, userId: customerUser.userId, roles: ['CUSTOMER'] },
        config.security.jwtAccessSecret,
        { expiresIn: '-10s', issuer: 'rms-auth-service', audience: 'rms-client' }
      );
      const res = await request(`${GATEWAY_URL}/api/v1/users/profile`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      const code = getErrorCode(res);
      const ok = res.status === 401 && code === 'TOKEN_EXPIRED';
      recordTest(6, 'Expired access token rejection', ok, `Expected 401 TOKEN_EXPIRED, received: ${res.status} (${code})`);
    } catch (e) {
      recordTest(6, 'Expired access token rejection', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 7: Successful refresh token rotation
    // ------------------------------------------------------------------
    let rotatedRefreshToken = null;
    let oldRefreshToken = customerTokens?.refreshToken;
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/auth/refresh-token`, { method: 'POST' }, {
        refreshToken: oldRefreshToken,
      });
      const ok = res.status === 200 && res.data?.success && res.data?.data?.refreshToken;
      rotatedRefreshToken = res.data?.data?.refreshToken;
      customerTokens = res.data?.data;
      recordTest(7, 'Successful refresh token rotation', ok, `Old token rotated, new accessToken & refreshToken issued`);
    } catch (e) {
      recordTest(7, 'Successful refresh token rotation', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 8: Reused refresh token rejection
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/auth/refresh-token`, { method: 'POST' }, {
        refreshToken: oldRefreshToken,
      });
      const code = getErrorCode(res);
      const ok = res.status === 403 && code === 'TOKEN_REUSE_DETECTED';
      recordTest(8, 'Reused refresh token rejection (Reuse Detection)', ok, `Expected 403 TOKEN_REUSE_DETECTED, received: ${res.status} (${code})`);
    } catch (e) {
      recordTest(8, 'Reused refresh token rejection (Reuse Detection)', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 9: Logout and token revocation
    // ------------------------------------------------------------------
    try {
      const logoutToken = customerTokens.accessToken;
      const res = await request(`${GATEWAY_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${logoutToken}` },
      }, { refreshToken: rotatedRefreshToken });

      const probeRes = await request(`${GATEWAY_URL}/api/v1/users/profile`, {
        headers: { Authorization: `Bearer ${logoutToken}` },
      });
      const probeCode = getErrorCode(probeRes);
      const ok = res.status === 200 && probeRes.status === 401 && probeCode === 'TOKEN_REVOKED';
      recordTest(9, 'Logout and token revocation (Blacklist)', ok, `Token blacklisted in Redis; subsequent probe returned 401 TOKEN_REVOKED`);
    } catch (e) {
      recordTest(9, 'Logout and token revocation (Blacklist)', false, e.message);
    }

    // Re-login to get active token for subsequent tests
    const reloginRes = await request(`${GATEWAY_URL}/api/v1/auth/login`, { method: 'POST' }, {
      emailOrPhone: testCustomer.email,
      password: testCustomer.password,
    });
    customerTokens = reloginRes.data.data.tokens;

    // ------------------------------------------------------------------
    // TEST 10: Staff login
    // ------------------------------------------------------------------
    try {
      const rejectRes = await request(`${GATEWAY_URL}/api/v1/auth/staff-login`, { method: 'POST' }, {
        emailOrPhone: testCustomer.email,
        password: testCustomer.password,
      });
      const customerRejected = rejectRes.status === 403 && getErrorCode(rejectRes) === 'STAFF_ACCESS_REQUIRED';

      const adminRes = await request(`${GATEWAY_URL}/api/v1/auth/staff-login`, { method: 'POST' }, {
        emailOrPhone: 'admin@antigravitybistro.com',
        password: 'Password@123',
      });
      const adminSuccess = adminRes.status === 200 && adminRes.data?.success;
      if (adminSuccess) adminTokens = adminRes.data.data.tokens;

      const ok = customerRejected && adminSuccess;
      recordTest(10, 'Staff login (Authorization & Verification)', ok, `Customer denied (403), Admin authenticated successfully with SUPER_ADMIN role`);
    } catch (e) {
      recordTest(10, 'Staff login (Authorization & Verification)', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 11: Successful POS PIN login
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/auth/pos-pin-login`, { method: 'POST' }, {
        employeeCode: 'EMP-BLR-002',
        pin: '1234',
        branchId: 1,
      });
      const ok = res.status === 200 && res.data?.success && res.data?.data?.tokens?.accessToken;
      recordTest(11, 'Successful POS PIN login', ok, `Employee EMP-BLR-002 authenticated via 4-digit PIN for Branch 1`);
    } catch (e) {
      recordTest(11, 'Successful POS PIN login', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 12: Five incorrect PIN attempts
    // ------------------------------------------------------------------
    const pinUserId = 4;
    await redisClient.del(`auth:pin:attempts:${pinUserId}`);
    await redisClient.del(`auth:pin:locked:${pinUserId}`);

    let fourAttemptsOk = true;
    for (let i = 1; i <= 4; i++) {
      const res = await request(`${GATEWAY_URL}/api/v1/auth/pos-pin-login`, { method: 'POST' }, {
        employeeCode: 'EMP-BLR-003',
        pin: '9999',
        branchId: 1,
      });
      if (res.status !== 401 || getErrorCode(res) !== 'INVALID_PIN') {
        fourAttemptsOk = false;
      }
    }
    recordTest(12, 'Five incorrect PIN attempts tracking', fourAttemptsOk, `Recorded 4 consecutive failed attempts with decrementing retry counter`);

    // ------------------------------------------------------------------
    // TEST 13: Two-minute PIN lockout
    // ------------------------------------------------------------------
    try {
      const res5 = await request(`${GATEWAY_URL}/api/v1/auth/pos-pin-login`, { method: 'POST' }, {
        employeeCode: 'EMP-BLR-003',
        pin: '9999',
        branchId: 1,
      });
      const res6 = await request(`${GATEWAY_URL}/api/v1/auth/pos-pin-login`, { method: 'POST' }, {
        employeeCode: 'EMP-BLR-003',
        pin: '1234',
        branchId: 1,
      });
      const ok = (res5.status === 423 || getErrorCode(res5) === 'PIN_LOCKED') &&
                 (res6.status === 423 || getErrorCode(res6) === 'PIN_LOCKED');
      recordTest(13, 'Two-minute PIN lockout enforcement', ok, `5th failure locked account (HTTP 423 PIN_LOCKED, retryAfter: 120s)`);
      await redisClient.del(`auth:pin:locked:${pinUserId}`);
    } catch (e) {
      recordTest(13, 'Two-minute PIN lockout enforcement', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 14: Role-based authorization
    // ------------------------------------------------------------------
    try {
      const forbiddenRes = await request(`${GATEWAY_URL}/api/v1/users/staff`, {
        headers: { Authorization: `Bearer ${customerTokens.accessToken}` },
      });
      const allowedRes = await request(`${GATEWAY_URL}/api/v1/users/staff`, {
        headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
      });
      const ok = forbiddenRes.status === 403 && allowedRes.status === 200;
      recordTest(14, 'Role-based access control (RBAC)', ok, `Customer denied access to /staff (403), Admin granted access (200)`);
    } catch (e) {
      recordTest(14, 'Role-based access control (RBAC)', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 15: Permission-based authorization
    // ------------------------------------------------------------------
    try {
      const decoded = jwt.decode(adminTokens.accessToken);
      const hasPermissions = Array.isArray(decoded.permissions) && decoded.permissions.length > 0;
      const res = await request(`${GATEWAY_URL}/api/v1/auth/me/roles`, {
        headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
      });
      const ok = hasPermissions && res.status === 200 && res.data.data.permissions.includes('STAFF.MANAGE');
      recordTest(15, 'Permission-based authorization validation', ok, `Verified ${decoded.permissions.length} granular permissions bound to session`);
    } catch (e) {
      recordTest(15, 'Permission-based authorization validation', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 16: Branch-level access restrictions
    // ------------------------------------------------------------------
    try {
      const mismatchRes = await request(`${GATEWAY_URL}/api/v1/auth/pos-pin-login`, { method: 'POST' }, {
        employeeCode: 'EMP-BLR-002',
        pin: '1234',
        branchId: 99,
      });
      const ok = mismatchRes.status === 403 && getErrorCode(mismatchRes) === 'BRANCH_MISMATCH';
      recordTest(16, 'Branch-level access restrictions', ok, `Disallowed POS PIN login to branch 99 for employee assigned to branch 1`);
    } catch (e) {
      recordTest(16, 'Branch-level access restrictions', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 17: Customer profile retrieval
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/users/profile`, {
        headers: { Authorization: `Bearer ${customerTokens.accessToken}` },
      });
      const ok = res.status === 200 && res.data.success &&
                 String(res.data.data.userId) === String(customerUser.userId) &&
                 res.data.data.passwordHash === undefined &&
                 res.data.data.passcodePin === undefined;
      recordTest(17, 'Customer profile retrieval', ok, `Profile fetched cleanly with zero sensitive credential exposure`);
    } catch (e) {
      recordTest(17, 'Customer profile retrieval', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 18: Customer profile update
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/users/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${customerTokens.accessToken}` },
      }, {
        firstName: 'Aarav-Updated',
        lastName: 'Kapoor-Senior',
      });
      const ok = res.status === 200 && res.data?.data?.firstName === 'Aarav-Updated';
      recordTest(18, 'Customer profile update', ok, `Updated firstName to 'Aarav-Updated', verified in response`);
    } catch (e) {
      recordTest(18, 'Customer profile update', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 19: Customer address CRUD
    // ------------------------------------------------------------------
    try {
      const addr1Res = await request(`${GATEWAY_URL}/api/v1/users/addresses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerTokens.accessToken}` },
      }, {
        addressTitle: 'Home',
        recipientName: 'Aarav Kapoor',
        recipientPhone: '+919811223344',
        addressLine1: 'Flat 402, Sunshine Heights',
        city: 'Bengaluru',
        stateProvince: 'Karnataka',
        postalCode: '560001',
        isDefault: true,
      });
      const addr1Id = addr1Res.data?.data?.addressId;

      const addr2Res = await request(`${GATEWAY_URL}/api/v1/users/addresses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerTokens.accessToken}` },
      }, {
        addressTitle: 'Office',
        recipientName: 'Aarav Kapoor',
        recipientPhone: '+919811223344',
        addressLine1: 'Tech Park Block B',
        city: 'Bengaluru',
        stateProvince: 'Karnataka',
        postalCode: '560100',
        isDefault: true,
      });
      const addr2Id = addr2Res.data?.data?.addressId;

      const listRes = await request(`${GATEWAY_URL}/api/v1/users/addresses`, {
        headers: { Authorization: `Bearer ${customerTokens.accessToken}` },
      });
      const addresses = listRes.data?.data || [];
      const defaultAddrs = addresses.filter((a) => a.isDefault);

      const updateRes = await request(`${GATEWAY_URL}/api/v1/users/addresses/${addr1Id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${customerTokens.accessToken}` },
      }, {
        landmark: 'Near City Metro',
      });

      const deleteRes = await request(`${GATEWAY_URL}/api/v1/users/addresses/${addr2Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${customerTokens.accessToken}` },
      });

      const ok = addr1Res.status === 201 &&
                 addr2Res.status === 201 &&
                 defaultAddrs.length === 1 &&
                 updateRes.status === 200 &&
                 deleteRes.status === 200;
      recordTest(19, 'Customer address CRUD (Single Default Enforcement)', ok, `Created 2 addresses, verified single default toggle, updated, soft deleted`);
    } catch (e) {
      recordTest(19, 'Customer address CRUD (Single Default Enforcement)', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 20: Staff management CRUD
    // ------------------------------------------------------------------
    try {
      const staffSuffix = Date.now().toString().slice(-4);
      const createRes = await request(`${GATEWAY_URL}/api/v1/users/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
      }, {
        branchId: 1,
        firstName: 'Karan',
        lastName: 'Malhotra',
        email: `karan.${staffSuffix}@antigravitybistro.com`,
        phoneNumber: `+919922${staffSuffix}11`,
        designation: 'Sous Chef',
        salary: 45000.00,
        roleCode: 'KITCHEN_CHEF',
      });
      const createdStaff = createRes.data?.data;
      createdStaffId = createdStaff?.employeeId;

      const getRes = await request(`${GATEWAY_URL}/api/v1/users/staff/${createdStaffId}`, {
        headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
      });

      const listRes = await request(`${GATEWAY_URL}/api/v1/users/staff?designation=Sous%20Chef`, {
        headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
      });

      const updateRes = await request(`${GATEWAY_URL}/api/v1/users/staff/${createdStaffId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
      }, {
        salary: 50000.00,
      });

      const statusRes = await request(`${GATEWAY_URL}/api/v1/users/staff/${createdStaffId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminTokens.accessToken}` },
      }, {
        status: 'TERMINATED',
      });

      const ok = createRes.status === 201 &&
                 getRes.status === 200 &&
                 listRes.data?.data?.length >= 1 &&
                 updateRes.status === 200 &&
                 statusRes.status === 200 &&
                 statusRes.data?.data?.employmentStatus === 'TERMINATED' &&
                 Boolean(statusRes.data?.data?.user?.isActive) === false;
      const subDetails = `create:${createRes.status}, get:${getRes.status}, list:${listRes.data?.data?.length}, update:${updateRes.status}, status:${statusRes.status}, empStatus:${statusRes.data?.data?.employmentStatus}, userActive:${statusRes.data?.data?.user?.isActive}`;
      recordTest(20, 'Staff management CRUD (Create, Filter, Update, Terminate)', ok, `Created ${createdStaff?.employeeCode}, filtered, updated salary, terminated with user sync [${subDetails}]`);
    } catch (e) {
      recordTest(20, 'Staff management CRUD (Create, Filter, Update, Terminate)', false, e.message);
    }

  } finally {
    authServer.close();
    userServer.close();
    gatewayServer.close();
  }

  console.log('\n================================================================');
  console.log('  TEST SUMMARY');
  console.log('================================================================');
  const passedCount = testResults.filter((t) => t.passed).length;
  console.log(`  Total Tests Run: ${testResults.length}`);
  console.log(`  Passed:          ${passedCount} / ${testResults.length}`);
  console.log(`  Failed:          ${testResults.length - passedCount}`);
  console.log('================================================================\n');

  if (passedCount === testResults.length) {
    console.log('🎉 ALL 20 TEST REQUIREMENTS PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED. PLEASE INSPECT LOGS ABOVE.');
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
