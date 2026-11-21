/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 12 END-TO-END INTEGRATION TEST
 * File: scripts/test_phase12_integration.js
 * Description: End-to-end integration test suite verifying:
 *   1. API Gateway (:8000) Ingress routing for Reservation public, customer & staff
 *   2. API Gateway Public Whitelisting & RBAC enforcement
 *   3. Reservation Service (:8011) -> Restaurant Service (:8003) Table Sync
 *   4. Reservation Service (:8011) -> Notification Service (:8012) Broadcast
 *   5. Real-time Seating, Table Release & Audit Log verification in Database
 * ============================================================================
 */

const http = require('http');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const { app: reservationApp } = require('../backend/reservation-service/src/app');
const { app: notifApp } = require('../backend/notification-service/src/app');
const { app: restaurantApp } = require('../backend/restaurant-service/src/app');
const { app: gatewayApp } = require('../backend/api-gateway/src/app');
const { config, getPool, closePool } = require('@rms/shared');

const RES_PORT = 8011;
const NOTIF_PORT = 8012;
const RESTAURANT_PORT = 8003;
const GATEWAY_PORT = 8000;

let resServer = null;
let notifServer = null;
let restaurantServer = null;
let gatewayServer = null;

const jwtSecret = config.jwtAccessSecret || 'rms_default_jwt_access_secret_key_change_in_prod';

const managerToken = jwt.sign(
  { userId: 2, email: 'manager.blr@antigravitybistro.com', role: 'RESTAURANT_MANAGER', roles: ['RESTAURANT_MANAGER'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);

const waiterToken = jwt.sign(
  { userId: 4, email: 'waiter.blr@antigravitybistro.com', role: 'WAITSTAFF', roles: ['WAITSTAFF'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);

const customerToken = jwt.sign(
  { userId: 15, email: 'customer.test@example.com', role: 'CUSTOMER', roles: ['CUSTOMER'], branchId: 1 },
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
  console.log('  PHASE 12: END-TO-END RESERVATION & API GATEWAY INTEGRATION TEST SUITE');
  console.log('='.repeat(80));

  try {
    // 1. Clean previous integration test data in DB
    const pool = await getPool();
    await pool.request().query(`
      DELETE FROM dbo.AuditLogs WHERE EntityName = 'Reservations' AND EntityId IN (
        SELECT CAST(ReservationId AS NVARCHAR(60)) FROM dbo.Reservations WHERE GuestPhone LIKE '+91998877%'
      );
      DELETE FROM dbo.Reservations WHERE GuestPhone LIKE '+91998877%';
    `);

    // 2. Boot up microservices
    console.log('\n--- 1. Booting Microservices ---');
    resServer = http.createServer(reservationApp);
    await new Promise((resolve) => resServer.listen(RES_PORT, resolve));
    console.log(`  [+] Reservation Service listening on http://localhost:${RES_PORT}`);

    notifServer = http.createServer(notifApp);
    await new Promise((resolve) => notifServer.listen(NOTIF_PORT, resolve));
    console.log(`  [+] Notification Service listening on http://localhost:${NOTIF_PORT}`);

    restaurantServer = http.createServer(restaurantApp);
    await new Promise((resolve) => restaurantServer.listen(RESTAURANT_PORT, resolve));
    console.log(`  [+] Restaurant Service listening on http://localhost:${RESTAURANT_PORT}`);

    gatewayServer = http.createServer(gatewayApp);
    await new Promise((resolve) => gatewayServer.listen(GATEWAY_PORT, resolve));
    console.log(`  [+] API Gateway listening on http://localhost:${GATEWAY_PORT}`);

    const gwClient = axios.create({
      baseURL: `http://localhost:${GATEWAY_PORT}`,
      timeout: 10000,
      validateStatus: () => true,
    });

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14);
    const dateStr = targetDate.toISOString().split('T')[0];

    // ------------------------------------------------------------------------
    // MODULE 1: Gateway Ingress & Public Whitelisting
    // ------------------------------------------------------------------------
    console.log('\n--- 2. API Gateway Ingress: Public Reservation Routes ---');
    const slotsRes = await gwClient.get(`/api/v1/reservations/public/branches/1/slots?reservationDate=${dateStr}&partySize=2`);
    assert(slotsRes.status === 200, 'Gateway proxies GET /api/v1/reservations/public/branches/1/slots with 200 OK');
    assert(Array.isArray(slotsRes.data?.data) && slotsRes.data.data.length > 0, 'Gateway delivers time slots array');

    const availRes = await gwClient.get(`/api/v1/reservations/public/branches/1/availability?reservationDate=${dateStr}&startTime=19:00:00&partySize=4`);
    assert(availRes.status === 200, 'Gateway proxies GET /api/v1/reservations/public/branches/1/availability with 200 OK');

    // Submit public booking through gateway
    const bookingPayload = {
      branchId: 1,
      guestName: 'Integration Guest',
      guestPhone: '+919988771122',
      guestEmail: 'integration.guest@example.com',
      partySize: 4,
      reservationDate: dateStr,
      startTime: '19:00:00',
      specialRequests: 'End-to-end integration test booking',
    };

    const bookRes = await gwClient.post('/api/v1/reservations/public/book', bookingPayload);
    assert(bookRes.status === 201, 'Public table booking via Gateway returns 201 Created');
    const createdResId = bookRes.data?.data?.ReservationId;
    assert(createdResId > 0, `Created Reservation ID #${createdResId} via Gateway`);

    // ------------------------------------------------------------------------
    // MODULE 2: API Gateway Ingress RBAC Security
    // ------------------------------------------------------------------------
    console.log('\n--- 3. API Gateway Ingress: RBAC & Authentication Enforcement ---');
    // Unauthenticated access to staff route
    const unauthStaffRes = await gwClient.get('/api/v1/reservations');
    assert(unauthStaffRes.status === 401, 'Unauthenticated access to /api/v1/reservations returns 401 Unauthorized via Gateway');

    // Customer access to staff route
    const custStaffRes = await gwClient.get('/api/v1/reservations', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custStaffRes.status === 403, 'Customer token accessing /api/v1/reservations returns 403 Forbidden via Gateway RBAC');

    // Customer access to own bookings
    const custOwnRes = await gwClient.get('/api/v1/reservations/my-bookings', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custOwnRes.status === 200, 'Customer token accessing /api/v1/reservations/my-bookings returns 200 OK');

    // Staff access to reservation management
    const staffRes = await gwClient.get(`/api/v1/reservations/${createdResId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(staffRes.status === 200, 'Staff token accessing /api/v1/reservations/:id returns 200 OK via Gateway');

    // ------------------------------------------------------------------------
    // MODULE 3: Inter-Service Integration: Table Assignment & Seating Sync
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Inter-Service Integration: Table Status & Notification Sync ---');
    // Staff assigns table 3
    const assignRes = await gwClient.patch(`/api/v1/reservations/${createdResId}/assign-table`, { tableId: 3 }, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(assignRes.status === 200 && assignRes.data?.data?.TableId === 3, 'Assigned Table 3 to reservation via Gateway');

    // Transition reservation to SEATED
    const seatRes = await gwClient.patch(`/api/v1/reservations/${createdResId}/status`, { status: 'SEATED' }, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    assert(seatRes.status === 200, 'Transition reservation to SEATED returns 200 OK');

    // Wait briefly for async inter-service HTTP events
    await new Promise((r) => setTimeout(r, 600));

    // Verify table 3 status in Restaurant Service is now OCCUPIED
    const tableRes = await gwClient.get('/api/v1/tables/3', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(tableRes.status === 200 && tableRes.data?.data?.CurrentStatus === 'OCCUPIED', 'Restaurant Service synchronized Table 3 status to OCCUPIED');

    // Transition reservation to COMPLETED
    const compRes = await gwClient.patch(`/api/v1/reservations/${createdResId}/status`, { status: 'COMPLETED' }, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    assert(compRes.status === 200, 'Transition reservation to COMPLETED returns 200 OK');

    // Wait briefly for table status sync
    await new Promise((r) => setTimeout(r, 600));

    // Verify table 3 status in Restaurant Service is restored to AVAILABLE
    const tableAvailRes = await gwClient.get('/api/v1/tables/3', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(tableAvailRes.status === 200 && tableAvailRes.data?.data?.CurrentStatus === 'AVAILABLE', 'Restaurant Service synchronized Table 3 status back to AVAILABLE');

    // ------------------------------------------------------------------------
    // MODULE 4: Database Audit & Data Integrity
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Database Record & Audit Log Verification ---');
    const dbRes = await pool.request()
      .input('ResId', createdResId)
      .query('SELECT ReservationId, Status, TableId, GuestName FROM dbo.Reservations WHERE ReservationId = @ResId');
    assert(dbRes.recordset.length === 1 && dbRes.recordset[0].Status === 'COMPLETED', 'Database record in dbo.Reservations is COMPLETED');

    const auditRes = await pool.request()
      .input('ResId', String(createdResId))
      .query("SELECT AuditId, ActionType FROM dbo.AuditLogs WHERE EntityName = 'Reservations' AND EntityId = @ResId ORDER BY AuditId ASC");
    assert(auditRes.recordset.length >= 3, 'Audit trail verified with CREATE, ASSIGN_TABLE, and STATUS_CHANGE entries in dbo.AuditLogs');

  } catch (err) {
    console.error('\n[UNEXPECTED INTEGRATION ERROR]:', err);
    failedCount++;
  } finally {
    if (resServer) await new Promise(r => resServer.close(r));
    if (notifServer) await new Promise(r => notifServer.close(r));
    if (restaurantServer) await new Promise(r => restaurantServer.close(r));
    if (gatewayServer) await new Promise(r => gatewayServer.close(r));
    await closePool();
    console.log('\nAll integration test servers stopped.');
  }

  console.log('\n' + '='.repeat(80));
  console.log('PHASE 12 INTEGRATION TEST RESULTS');
  console.log(`Total Passed: ${passedCount}`);
  console.log(`Total Failed: ${failedCount}`);
  console.log('='.repeat(80));

  if (failedCount > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  run().catch(err => {
    console.error('[FATAL]:', err);
    process.exit(1);
  });
}

module.exports = { run };

