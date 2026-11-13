/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 5 AUTOMATED VERIFICATION SUITE
 * File: scripts/test_phase5.js
 * Description: Exhaustive verification runner for all Phase 5 requirements:
 *              Restaurant CRUD, Branch CRUD, Dining Section CRUD, Table CRUD,
 *              Table Availability, Status Transitions, QR scanning, Floor Plan,
 *              Validation, Security, API Gateway routing, and DB connectivity.
 * ============================================================================
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const { config, getPool, closePool } = require('../backend/shared');

const GATEWAY_URL = 'http://localhost:8000';
const RESTAURANT_SERVICE_URL = 'http://localhost:8003';

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
  console.log('  RMS PHASE 5: RESTAURANT SERVICE & FLOOR MANAGEMENT SUITE');
  console.log('================================================================\n');

  // Boot servers in-process
  const { app: restaurantApp } = require('../backend/restaurant-service/src/app');
  const { app: gatewayApp } = require('../backend/api-gateway/src/app');

  const restaurantServer = restaurantApp.listen(8003);
  const gatewayServer = gatewayApp.listen(8000);

  // Wait 1 second for socket readiness
  await new Promise((r) => setTimeout(r, 1000));

  // Generate test JWT tokens
  const superAdminToken = jwt.sign(
    {
      userId: 1,
      email: 'admin@antigravitybistro.com',
      userType: 'EMPLOYEE',
      roles: ['SUPER_ADMIN'],
      permissions: ['*'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  const managerToken = jwt.sign(
    {
      userId: 2,
      email: 'manager.blr@antigravitybistro.com',
      userType: 'EMPLOYEE',
      roles: ['RESTAURANT_MANAGER'],
      permissions: ['RESTAURANT.READ', 'TABLES.MANAGE', 'BRANCH.MANAGE'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  const staffToken = jwt.sign(
    {
      userId: 5,
      email: 'staff.blr@antigravitybistro.com',
      userType: 'EMPLOYEE',
      roles: ['WAITSTAFF'],
      permissions: ['TABLES.READ', 'TABLES.STATUS_UPDATE'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  const customerToken = jwt.sign(
    {
      userId: 10,
      email: 'customer@example.com',
      userType: 'CUSTOMER',
      roles: ['CUSTOMER'],
      permissions: [],
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  const authHeaders = (token) => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  const uniqueSuffix = Date.now();
  let createdRestaurantId = null;
  let createdBranchId = null;
  let createdSectionId = null;
  let createdTableId = null;
  let createdQrHash = null;

  try {
    // ------------------------------------------------------------------
    // TEST 01: Service Health Liveness Probe
    // ------------------------------------------------------------------
    try {
      const res = await request(`${RESTAURANT_SERVICE_URL}/health/live`);
      const ok = res.status === 200 && res.data?.data?.status === 'UP';
      recordTest(1, 'Service Health Liveness probe', ok, `Status: ${res.data?.data?.status}, Uptime: ${res.data?.data?.uptimeSeconds}s`);
    } catch (e) {
      recordTest(1, 'Service Health Liveness probe', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 02: Service Readiness Probe & Database Connectivity
    // ------------------------------------------------------------------
    try {
      const res = await request(`${RESTAURANT_SERVICE_URL}/health/ready`);
      const dbHealthy = res.data?.data?.dependencies?.database?.healthy === true;
      const ok = res.status === 200 && res.data?.data?.status === 'UP' && dbHealthy;
      recordTest(2, 'Service Readiness probe & DB connectivity', ok, `Readiness: ${res.data?.data?.status}, DB Healthy: ${dbHealthy}`);
    } catch (e) {
      recordTest(2, 'Service Readiness probe & DB connectivity', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 03: Unauthorized Access Rejection (Missing Token)
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/restaurants`);
      const code = getErrorCode(res);
      const ok = res.status === 401 && code === 'AUTH_REQUIRED';
      recordTest(3, 'Unauthorized access rejection (Missing Token)', ok, `Received HTTP ${res.status} (${code})`);
    } catch (e) {
      recordTest(3, 'Unauthorized access rejection (Missing Token)', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 04: Role-Based Authorization Rejection (Customer Token)
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/restaurants`, {
        method: 'POST',
        ...authHeaders(customerToken),
      }, {
        restaurantName: 'Hacker Bistro',
        primaryContactEmail: 'hacker@example.com',
        primaryContactPhone: '+919999999999',
      });
      const ok = res.status === 403;
      recordTest(4, 'Role-based access rejection (Customer Token)', ok, `Customer denied access: HTTP ${res.status} (${getErrorCode(res)})`);
    } catch (e) {
      recordTest(4, 'Role-based access rejection (Customer Token)', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 05: Invalid Restaurant Input Handling
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/restaurants`, {
        method: 'POST',
        ...authHeaders(superAdminToken),
      }, {
        restaurantName: '',
        primaryContactEmail: 'not-an-email',
        primaryContactPhone: '123',
      });
      const code = getErrorCode(res);
      const ok = res.status === 400 && code === 'VALIDATION_ERROR';
      recordTest(5, 'Invalid restaurant input handling', ok, `Expected 400 VALIDATION_ERROR, received: ${res.status} (${code})`);
    } catch (e) {
      recordTest(5, 'Invalid restaurant input handling', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 06: Invalid Branch Input Handling
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/branches`, {
        method: 'POST',
        ...authHeaders(superAdminToken),
      }, {
        restaurantId: 1,
        branchCode: '', // Empty branch code
        branchName: 'Missing Code Branch',
      });
      const code = getErrorCode(res);
      const ok = res.status === 400 && code === 'VALIDATION_ERROR';
      recordTest(6, 'Invalid branch input handling', ok, `Expected 400 VALIDATION_ERROR, received: ${res.status} (${code})`);
    } catch (e) {
      recordTest(6, 'Invalid branch input handling', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 07: Invalid Table Status Rejection
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/tables/1/status`, {
        method: 'PATCH',
        ...authHeaders(staffToken),
      }, {
        currentStatus: 'DISINTEGRATED',
      });
      const code = getErrorCode(res);
      const ok = res.status === 400 && code === 'VALIDATION_ERROR';
      recordTest(7, 'Invalid table status rejection', ok, `Expected 400 VALIDATION_ERROR, received: ${res.status} (${code})`);
    } catch (e) {
      recordTest(7, 'Invalid table status rejection', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 08: Existing Seed Restaurant Verification (Read-Only)
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/restaurants/1`, {
        method: 'GET',
        ...authHeaders(managerToken),
      });
      const rest = res.data?.data;
      const ok = res.status === 200 && rest?.RestaurantId === 1 && rest?.RestaurantName === 'Antigravity Gourmet Bistro';
      recordTest(8, 'Existing seed restaurant verification', ok, `Found Restaurant 1: '${rest?.RestaurantName}', Currency: ${rest?.DefaultCurrency}`);
    } catch (e) {
      recordTest(8, 'Existing seed restaurant verification', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 09: Existing Seed Branch & Sections Verification
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/branches/1`, {
        method: 'GET',
        ...authHeaders(staffToken),
      });
      const br = res.data?.data;
      const ok = res.status === 200 && br?.BranchCode === 'BR-BLR-01' && br?.diningSections?.length >= 3;
      recordTest(9, 'Existing seed branch & sections verification', ok, `Branch: '${br?.BranchName}', Sections: ${br?.diningSections?.length}`);
    } catch (e) {
      recordTest(9, 'Existing seed branch & sections verification', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 10: Existing Seed Tables Verification (Branch 1)
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/branches/1/tables`, {
        method: 'GET',
        ...authHeaders(staffToken),
      });
      const tables = res.data?.data;
      const ok = res.status === 200 && Array.isArray(tables) && tables.length >= 8;
      recordTest(10, 'Existing seed tables verification', ok, `Retrieved ${tables?.length} tables in Branch 1 (T-01 to BAR-02)`);
    } catch (e) {
      recordTest(10, 'Existing seed tables verification', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 11: Restaurant CRUD - Create New Restaurant
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/restaurants`, {
        method: 'POST',
        ...authHeaders(superAdminToken),
      }, {
        restaurantName: `Trattoria Antigravity ${uniqueSuffix}`,
        legalEntityName: `Antigravity Italian LLC ${uniqueSuffix}`,
        taxIdentificationNumber: `29AAACG${String(uniqueSuffix).slice(-5)}M`,
        primaryContactEmail: `italian.${uniqueSuffix}@antigravity.com`,
        primaryContactPhone: '+919876500001',
        defaultCurrency: 'INR',
        defaultTimezone: 'India Standard Time',
      });
      const ok = res.status === 201 && res.data?.data?.RestaurantId;
      createdRestaurantId = res.data?.data?.RestaurantId;
      recordTest(11, 'Restaurant CRUD - Create restaurant', ok, `Created RestaurantId: ${createdRestaurantId}, HTTP ${res.status}`);
    } catch (e) {
      recordTest(11, 'Restaurant CRUD - Create restaurant', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 12: Restaurant CRUD - Update & Status Toggle
    // ------------------------------------------------------------------
    try {
      const updateRes = await request(`${GATEWAY_URL}/api/v1/restaurants/${createdRestaurantId}`, {
        method: 'PUT',
        ...authHeaders(superAdminToken),
      }, {
        restaurantName: `Trattoria Antigravity Updated ${uniqueSuffix}`,
        primaryContactEmail: `italian.${uniqueSuffix}@antigravity.com`,
        primaryContactPhone: '+919876500002',
      });
      const statusRes = await request(`${GATEWAY_URL}/api/v1/restaurants/${createdRestaurantId}/status`, {
        method: 'PATCH',
        ...authHeaders(superAdminToken),
      }, {
        isActive: true,
      });
      const ok = updateRes.status === 200 && statusRes.status === 200 && updateRes.data?.data?.RestaurantName.includes('Updated');
      recordTest(12, 'Restaurant CRUD - Update & status toggle', ok, `Updated Name: '${updateRes.data?.data?.RestaurantName}', Status: ACTIVE`);
    } catch (e) {
      recordTest(12, 'Restaurant CRUD - Update & status toggle', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 13: Restaurant CRUD - List with Pagination
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/restaurants?page=1&pageSize=10`, {
        method: 'GET',
        ...authHeaders(managerToken),
      });
      const ok = res.status === 200 && Array.isArray(res.data?.data) && res.data?.meta?.totalCount >= 2;
      recordTest(13, 'Restaurant CRUD - List with pagination', ok, `Total Restaurants: ${res.data?.meta?.totalCount}, Page: ${res.data?.meta?.page}`);
    } catch (e) {
      recordTest(13, 'Restaurant CRUD - List with pagination', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 14: Branch CRUD - Create New Branch
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/restaurants/${createdRestaurantId}/branches`, {
        method: 'POST',
        ...authHeaders(superAdminToken),
      }, {
        branchCode: `BR-EXP-${String(uniqueSuffix).slice(-5)}`,
        branchName: `Express Outpost ${uniqueSuffix}`,
        addressLine1: '45 Outer Ring Road',
        city: 'Bengaluru',
        stateProvince: 'Karnataka',
        postalCode: '560103',
        country: 'India',
        phone: '+918045000001',
        email: `express.${uniqueSuffix}@antigravity.com`,
        openingTime: '08:00:00',
        closingTime: '23:00:00',
        isMainBranch: false,
      });
      const ok = res.status === 201 && res.data?.data?.BranchId;
      createdBranchId = res.data?.data?.BranchId;
      recordTest(14, 'Branch CRUD - Create branch', ok, `Created BranchId: ${createdBranchId}, Code: ${res.data?.data?.BranchCode}`);
    } catch (e) {
      recordTest(14, 'Branch CRUD - Create branch', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 15: Branch CRUD - Update & Status Toggle
    // ------------------------------------------------------------------
    try {
      const updateRes = await request(`${GATEWAY_URL}/api/v1/branches/${createdBranchId}`, {
        method: 'PUT',
        ...authHeaders(managerToken),
      }, {
        branchName: `Express Outpost Updated ${uniqueSuffix}`,
        addressLine1: '45 Outer Ring Road, 2nd Floor',
        city: 'Bengaluru',
        stateProvince: 'Karnataka',
        postalCode: '560103',
        phone: '+918045000002',
      });
      const statusRes = await request(`${GATEWAY_URL}/api/v1/branches/${createdBranchId}/status`, {
        method: 'PATCH',
        ...authHeaders(superAdminToken),
      }, {
        isActive: true,
      });
      const ok = updateRes.status === 200 && statusRes.status === 200 && updateRes.data?.data?.BranchName.includes('Updated');
      recordTest(15, 'Branch CRUD - Update & status toggle', ok, `Updated Branch: '${updateRes.data?.data?.BranchName}', Status: ACTIVE`);
    } catch (e) {
      recordTest(15, 'Branch CRUD - Update & status toggle', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 16: Dining Section CRUD - Create, Update & List
    // ------------------------------------------------------------------
    try {
      const createRes = await request(`${GATEWAY_URL}/api/v1/branches/${createdBranchId}/sections`, {
        method: 'POST',
        ...authHeaders(managerToken),
      }, {
        sectionName: 'Rooftop Skylounge',
        floorLevel: 3,
        displayOrder: 1,
      });
      createdSectionId = createRes.data?.data?.SectionId;

      const updateRes = await request(`${GATEWAY_URL}/api/v1/sections/${createdSectionId}`, {
        method: 'PUT',
        ...authHeaders(managerToken),
      }, {
        sectionName: 'Rooftop Skylounge & Observatory',
        floorLevel: 3,
        displayOrder: 2,
      });

      const listRes = await request(`${GATEWAY_URL}/api/v1/branches/${createdBranchId}/sections`, {
        method: 'GET',
        ...authHeaders(staffToken),
      });

      const ok = createRes.status === 201 && updateRes.status === 200 && listRes.status === 200 && listRes.data?.data?.length >= 1;
      recordTest(16, 'Dining Section CRUD (Create, Update, List)', ok, `SectionId: ${createdSectionId}, Name: '${updateRes.data?.data?.SectionName}', Total: ${listRes.data?.data?.length}`);
    } catch (e) {
      recordTest(16, 'Dining Section CRUD (Create, Update, List)', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 17: Dining Table CRUD - Create Table with QR Code
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/branches/${createdBranchId}/tables`, {
        method: 'POST',
        ...authHeaders(managerToken),
      }, {
        sectionId: createdSectionId,
        tableNumber: 'SKY-01',
        seatingCapacity: 4,
        posX: 120,
        posY: 180,
      });
      const table = res.data?.data;
      const ok = res.status === 201 && table?.TableId && table?.QrCodeHash && table?.qrCodeDataUrl?.startsWith('data:image/png');
      createdTableId = table?.TableId;
      createdQrHash = table?.QrCodeHash;
      recordTest(17, 'Dining Table CRUD - Create table with QR Code', ok, `TableId: ${createdTableId}, Table: '${table?.TableNumber}', QR Hash: ${createdQrHash.slice(0, 16)}...`);
    } catch (e) {
      recordTest(17, 'Dining Table CRUD - Create table with QR Code', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 18: Dining Table CRUD - Update Details & Capacity
    // ------------------------------------------------------------------
    try {
      const updateRes = await request(`${GATEWAY_URL}/api/v1/tables/${createdTableId}`, {
        method: 'PUT',
        ...authHeaders(managerToken),
      }, {
        tableNumber: 'SKY-01-VIP',
        seatingCapacity: 6,
        posX: 150,
        posY: 220,
      });

      const capRes = await request(`${GATEWAY_URL}/api/v1/tables/${createdTableId}/capacity`, {
        method: 'PATCH',
        ...authHeaders(managerToken),
      }, {
        seatingCapacity: 8,
      });

      const ok = updateRes.status === 200 && capRes.status === 200 && capRes.data?.data?.SeatingCapacity === 8;
      recordTest(18, 'Dining Table CRUD - Update details & capacity', ok, `Updated Table: '${updateRes.data?.data?.TableNumber}', Final Capacity: ${capRes.data?.data?.SeatingCapacity}`);
    } catch (e) {
      recordTest(18, 'Dining Table CRUD - Update details & capacity', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 19: Table Availability & Capacity Filtering
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/branches/${createdBranchId}/tables/available?minCapacity=6`, {
        method: 'GET',
        ...authHeaders(staffToken),
      });
      const tables = res.data?.data;
      const ok = res.status === 200 && Array.isArray(tables) && tables.length >= 1 && tables.every((t) => t.CurrentStatus === 'AVAILABLE' && t.SeatingCapacity >= 6);
      recordTest(19, 'Table availability & capacity filtering', ok, `Found ${tables?.length} available table(s) with capacity >= 6`);
    } catch (e) {
      recordTest(19, 'Table availability & capacity filtering', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 20: Table Status Lifecycle Transitions
    // ------------------------------------------------------------------
    try {
      // 1. Transition to OCCUPIED with active order
      const occRes = await request(`${GATEWAY_URL}/api/v1/tables/${createdTableId}/status`, {
        method: 'PATCH',
        ...authHeaders(staffToken),
      }, {
        currentStatus: 'OCCUPIED',
        activeOrderId: 9001,
      });

      // 2. Transition to BILLED
      const billRes = await request(`${GATEWAY_URL}/api/v1/tables/${createdTableId}/status`, {
        method: 'PATCH',
        ...authHeaders(staffToken),
      }, {
        currentStatus: 'BILLED',
      });

      // 3. Transition to CLEANING
      const cleanRes = await request(`${GATEWAY_URL}/api/v1/tables/${createdTableId}/status`, {
        method: 'PATCH',
        ...authHeaders(staffToken),
      }, {
        currentStatus: 'CLEANING',
      });

      // 4. Release to AVAILABLE
      const availRes = await request(`${GATEWAY_URL}/api/v1/tables/${createdTableId}/status`, {
        method: 'PATCH',
        ...authHeaders(staffToken),
      }, {
        currentStatus: 'AVAILABLE',
      });

      const ok = occRes.status === 200 && billRes.status === 200 && cleanRes.status === 200 && availRes.status === 200 &&
                 availRes.data?.data?.CurrentStatus === 'AVAILABLE' && availRes.data?.data?.ActiveOrderId === null;
      recordTest(20, 'Table status lifecycle transitions', ok, `AVAILABLE -> OCCUPIED -> BILLED -> CLEANING -> AVAILABLE (ActiveOrderId cleared)`);
    } catch (e) {
      recordTest(20, 'Table status lifecycle transitions', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 21: Customer Public QR Table Scan (No Auth Token)
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/tables/qr/${createdQrHash}`);
      const table = res.data?.data;
      const ok = res.status === 200 && table?.TableId === createdTableId && table?.QrCodeHash === createdQrHash;
      recordTest(21, 'Customer public QR table scan (Unauthenticated)', ok, `Scanned Table: '${table?.TableNumber}', Section: '${table?.SectionName}', Branch: '${table?.BranchName}'`);
    } catch (e) {
      recordTest(21, 'Customer public QR table scan (Unauthenticated)', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 22: Floor Management & 2D Visual Floor Plan
    // ------------------------------------------------------------------
    try {
      const res = await request(`${GATEWAY_URL}/api/v1/branches/${createdBranchId}/floor-plan`, {
        method: 'GET',
        ...authHeaders(staffToken),
      });
      const layout = res.data?.data;
      const ok = res.status === 200 && layout?.summary?.TotalTables >= 1 && Array.isArray(layout?.sections) && layout?.allTables?.[0]?.PosX !== undefined;
      recordTest(22, 'Floor Management & 2D visual floor plan', ok, `Total Tables: ${layout?.summary?.TotalTables}, Seating: ${layout?.summary?.TotalSeatingCapacity}, Utilization: ${layout?.summary?.utilizationRate}%`);
    } catch (e) {
      recordTest(22, 'Floor Management & 2D visual floor plan', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 23: Dining Table Soft Deletion
    // ------------------------------------------------------------------
    try {
      const delRes = await request(`${GATEWAY_URL}/api/v1/tables/${createdTableId}`, {
        method: 'DELETE',
        ...authHeaders(managerToken),
      });
      const getRes = await request(`${GATEWAY_URL}/api/v1/tables/${createdTableId}`, {
        method: 'GET',
        ...authHeaders(staffToken),
      });
      const ok = delRes.status === 200 && getRes.status === 404;
      recordTest(23, 'Dining table soft deletion', ok, `Deleted TableId: ${createdTableId}, Subsequent GET returned 404 TABLE_NOT_FOUND`);
    } catch (e) {
      recordTest(23, 'Dining table soft deletion', false, e.message);
    }

    // ------------------------------------------------------------------
    // TEST 24: Direct Microservice Port 8003 Execution Verification
    // ------------------------------------------------------------------
    try {
      const res = await request(`${RESTAURANT_SERVICE_URL}/restaurants/1`, {
        method: 'GET',
        ...authHeaders(superAdminToken),
      });
      const ok = res.status === 200 && res.data?.data?.RestaurantId === 1;
      recordTest(24, 'Direct microservice port 8003 execution', ok, `Direct call to :8003 returned Restaurant 1 successfully`);
    } catch (e) {
      recordTest(24, 'Direct microservice port 8003 execution', false, e.message);
    }

  } finally {
    // Graceful teardown
    try {
      restaurantServer.close();
      gatewayServer.close();
      await closePool();
    } catch (closeErr) {
      // Ignore teardown errors
    }
  }

  // Final summary
  const passedCount = testResults.filter((t) => t.passed).length;
  const failedCount = testResults.length - passedCount;

  console.log('\n================================================================');
  console.log('  TEST SUMMARY');
  console.log('================================================================');
  console.log(`  Total Tests Run: ${testResults.length}`);
  console.log(`  Passed:          ${passedCount} / ${testResults.length}`);
  console.log(`  Failed:          ${failedCount}`);
  console.log('================================================================\n');

  if (failedCount === 0) {
    console.log('🎉 ALL 24 PHASE 5 TEST REQUIREMENTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } else {
    console.error(`💥 ${failedCount} test(s) failed.`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

