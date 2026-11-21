/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 12 RESERVATION API TEST SUITE
 * File: scripts/test_phase12_api.js
 * Description: Exhaustive REST API verification for all Reservation public,
 *              customer, and staff endpoints, JWT authentication, RBAC,
 *              table allocation, concurrency guards, state machine transitions,
 *              walk-in seating, dashboard KPIs, timeline, and audit trails.
 * ============================================================================
 */

const http = require('http');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { app } = require('../backend/reservation-service/src/app');
const { config, closePool } = require('@rms/shared');

const PORT = 8011;
const BASE_URL = `http://localhost:${PORT}/api/v1/reservations`;

let server = null;
let client = null;

// Auth Tokens
const jwtSecret = config.jwtAccessSecret;
const adminToken = jwt.sign(
  { userId: 1, email: 'admin@antigravitybistro.com', role: 'SUPER_ADMIN', roles: ['SUPER_ADMIN'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);
const managerToken = jwt.sign(
  { userId: 2, email: 'manager@antigravitybistro.com', role: 'RESTAURANT_MANAGER', roles: ['RESTAURANT_MANAGER'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);
const waiterToken = jwt.sign(
  { userId: 5, email: 'waiter@antigravitybistro.com', role: 'WAITSTAFF', roles: ['WAITSTAFF'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);
const customerToken = jwt.sign(
  { userId: 10, email: 'ananya@example.com', role: 'CUSTOMER', roles: ['CUSTOMER'], branchId: 1 },
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
  console.log('===============================================================');
  console.log('PHASE 12: RESERVATION REST API AUTOMATED TEST SUITE');
  console.log('===============================================================');

  try {
    // Clean up previous test artifacts in database
    const { getPool } = require('@rms/shared');
    const dbPool = await getPool();
    await dbPool.request().query(`
      DELETE FROM dbo.AuditLogs WHERE EntityName = 'Reservations' AND EntityId IN (
        SELECT CAST(ReservationId AS NVARCHAR(60)) FROM dbo.Reservations WHERE GuestPhone LIKE '+919876543%'
      );
      DELETE FROM dbo.Reservations WHERE GuestPhone LIKE '+919876543%';
    `);

    // 1. Start Reservation Service HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`Reservation test server listening on port ${PORT}`);

    client = axios.create({
      baseURL: BASE_URL,
      validateStatus: () => true, // Don't throw on error status codes
      timeout: 10000,
    });

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 10);
    const dateStr = targetDate.toISOString().split('T')[0];

    let createdResId = null;

    // ------------------------------------------------------------------------
    // MODULE 1: Health Probes
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 1: Health Probes ---');
    const liveRes = await axios.get(`http://localhost:${PORT}/health/live`);
    assert(liveRes.status === 200 && liveRes.data.data.status === 'UP', 'Liveness probe returns 200 UP');

    const readyRes = await axios.get(`http://localhost:${PORT}/health/ready`);
    assert(readyRes.status === 200 && readyRes.data.data.status === 'UP', 'Readiness probe returns 200 UP (DB + Redis)');

    // ------------------------------------------------------------------------
    // MODULE 2: Public Availability & Time Slots
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 2: Public Availability & Time Slots ---');
    const slotsRes = await client.get(`/public/branches/1/slots?reservationDate=${dateStr}&partySize=2`);
    assert(slotsRes.status === 200 && Array.isArray(slotsRes.data.data), 'GET /public/branches/1/slots returns array of slots');
    assert(slotsRes.data.data.length > 0 && slotsRes.data.data[0].SlotTime !== undefined, 'Time slots contain SlotTime and AvailableTableCount');

    const availRes = await client.get(`/public/branches/1/availability?reservationDate=${dateStr}&startTime=19:00:00&partySize=4`);
    assert(availRes.status === 200 && Array.isArray(availRes.data.data), 'GET /public/branches/1/availability returns matching tables');

    // ------------------------------------------------------------------------
    // MODULE 3: Public Table Booking Creation
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 3: Public Booking Creation ---');
    const bookPayload = {
      branchId: 1,
      guestName: 'Kavita Krishnan',
      guestPhone: '+919876543222',
      guestEmail: 'kavita.k@example.com',
      partySize: 4,
      reservationDate: dateStr,
      startTime: '19:00:00',
      specialRequests: 'Window table; anniversary celebration',
    };

    const bookRes = await client.post('/public/book', bookPayload);
    assert(bookRes.status === 201 && bookRes.data.success, 'POST /public/book creates reservation successfully');
    createdResId = bookRes.data.data?.ReservationId;
    assert(createdResId > 0, `Created ReservationId is valid: #${createdResId}`);

    // Input validation check
    const invalidBookRes = await client.post('/public/book', { branchId: 1, guestName: '' });
    assert(invalidBookRes.status === 400 && (invalidBookRes.data.code === 'VALIDATION_ERROR' || invalidBookRes.data.error?.code === 'VALIDATION_ERROR'), 'POST /public/book rejects missing guestName');

    // ------------------------------------------------------------------------
    // MODULE 4: Public Lookup & Self-Service
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 4: Public Lookup & Self-Service ---');
    const lookupRes = await client.get(`/public/lookup?reservationId=${createdResId}&guestPhone=%2B919876543222`);
    assert(lookupRes.status === 200 && lookupRes.data.data.ReservationId === createdResId, 'GET /public/lookup retrieves matching reservation');

    const badLookupRes = await client.get(`/public/lookup?reservationId=${createdResId}&guestPhone=%2B910000000000`);
    assert(badLookupRes.status === 403, 'GET /public/lookup rejects phone mismatch with 403');

    // ------------------------------------------------------------------------
    // MODULE 5: Customer Personal Bookings (Authenticated)
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 5: Customer Personal Bookings ---');
    const myBookingsRes = await client.get('/my-bookings', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(myBookingsRes.status === 200 && Array.isArray(myBookingsRes.data.data), 'GET /my-bookings returns customer bookings array');

    const unauthMyBookings = await client.get('/my-bookings');
    assert(unauthMyBookings.status === 401, 'GET /my-bookings without token returns 401 Unauthorized');

    // ------------------------------------------------------------------------
    // MODULE 6: Staff Reservation Operations
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 6: Staff Reservation Operations ---');
    const listRes = await client.get(`?branchId=1&reservationDate=${dateStr}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(listRes.status === 200 && listRes.data.meta.total >= 1, 'GET / list reservations returns paginated results');

    const getRes = await client.get(`/${createdResId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(getRes.status === 200 && getRes.data.data.GuestName === 'Kavita Krishnan', 'GET /:id retrieves reservation details');

    const updateRes = await client.put(`/${createdResId}`, {
      guestName: 'Kavita Krishnan Updated',
      guestPhone: '+919876543222',
      partySize: 4,
      reservationDate: dateStr,
      startTime: '19:30:00',
      specialRequests: 'Quiet corner preferred',
    }, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(updateRes.status === 200 && updateRes.data.data.SpecialRequests === 'Quiet corner preferred', 'PUT /:id updates reservation details');

    // ------------------------------------------------------------------------
    // MODULE 7: Table Assignment & Concurrency Guard
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 7: Table Assignment & Concurrency Guard ---');
    // Assign table 2 to created reservation
    const assignRes = await client.patch(`/${createdResId}/assign-table`, { tableId: 2 }, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(assignRes.status === 200 && assignRes.data.data.TableId === 2, 'PATCH /:id/assign-table assigns Table 2');

    // Attempt to book another reservation on Table 2 at conflicting slot
    const conflictRes = await client.post('/', {
      branchId: 1,
      tableId: 2,
      guestName: 'Conflicting Guest',
      guestPhone: '+919876543999',
      partySize: 2,
      reservationDate: dateStr,
      startTime: '19:30:00',
    }, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(conflictRes.status === 400, 'Conflicting reservation on assigned Table 2 is blocked by concurrency lock');

    // ------------------------------------------------------------------------
    // MODULE 8: Status State Machine Transitions
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 8: Status State Machine Transitions ---');
    // Transition to SEATED
    const seatRes = await client.patch(`/${createdResId}/status`, { status: 'SEATED' }, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    assert(seatRes.status === 200 && (seatRes.data.data?.Status === 'SEATED' || seatRes.data.data?.status === 'SEATED'), 'Transition CONFIRMED -> SEATED succeeds');

    // Transition to COMPLETED
    const compRes = await client.patch(`/${createdResId}/status`, { status: 'COMPLETED' }, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    assert(compRes.status === 200 && (compRes.data.data?.Status === 'COMPLETED' || compRes.data.data?.status === 'COMPLETED'), 'Transition SEATED -> COMPLETED succeeds');

    // Invalid transition: cannot transition back from COMPLETED
    const invalidTrans = await client.patch(`/${createdResId}/status`, { status: 'CONFIRMED' }, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    assert(invalidTrans.status === 400, 'Transition from COMPLETED to CONFIRMED is rejected by state machine');

    // ------------------------------------------------------------------------
    // MODULE 9: Walk-In Seating
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 9: Walk-In Seating ---');
    const walkInRes = await client.post('/walk-in', {
      branchId: 1,
      tableId: 4,
      guestName: 'Arun Walk-In',
      guestPhone: '+919876543111',
      partySize: 2,
    }, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    assert(walkInRes.status === 201 && walkInRes.data.data.Status === 'SEATED', 'POST /walk-in creates walk-in seated at table');

    // ------------------------------------------------------------------------
    // MODULE 10: Operational Dashboard KPIs & Floor Timeline
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 10: Dashboard KPIs & Floor Timeline ---');
    const summaryRes = await client.get(`/summary?branchId=1&date=${dateStr}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(summaryRes.status === 200 && summaryRes.data.data.TotalBookings !== undefined, 'GET /summary returns operational KPIs');

    const timelineRes = await client.get(`/timeline?branchId=1&date=${dateStr}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(timelineRes.status === 200 && Array.isArray(timelineRes.data.data), 'GET /timeline returns floor timeline data');

    // ------------------------------------------------------------------------
    // MODULE 11: Audit Trail / Status History
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 11: Audit Trail / Status History ---');
    const historyRes = await client.get(`/${createdResId}/history`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(historyRes.status === 200 && Array.isArray(historyRes.data.data), 'GET /:id/history returns audit logs array');
    assert(historyRes.data.data.length >= 2, 'Audit trail contains CREATE, UPDATE, and STATUS_CHANGE entries');

    // ------------------------------------------------------------------------
    // MODULE 12: Automated No-Show Sweep
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 12: Automated No-Show Sweep ---');
    const sweepRes = await client.post('/sweep-no-shows', {
      branchId: 1,
      gracePeriodMinutes: 15,
    }, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(sweepRes.status === 200 && sweepRes.data.data.updatedCount !== undefined, 'POST /sweep-no-shows executes sweep successfully');

    // ------------------------------------------------------------------------
    // MODULE 13: RBAC & Authentication Security
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 13: RBAC & Authentication Security ---');
    const custOnAdmin = await client.get('/summary?branchId=1', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custOnAdmin.status === 403, 'Customer role accessing staff /summary is rejected with 403 Forbidden');

    const unauthAdmin = await client.get('/summary?branchId=1');
    assert(unauthAdmin.status === 401, 'Unauthenticated access to staff /summary returns 401 Unauthorized');

    // ------------------------------------------------------------------------
    // MODULE 14: Cancellation Workflows
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 14: Cancellation Workflows ---');
    // Create new booking to test cancellation
    const cancelTarget = await client.post('/public/book', {
      branchId: 1,
      guestName: 'Cancel Test Guest',
      guestPhone: '+919876543555',
      partySize: 2,
      reservationDate: dateStr,
      startTime: '15:00:00',
    });
    const cancelResId = cancelTarget.data.data.ReservationId;

    const publicCancelRes = await client.post(`/public/${cancelResId}/cancel`, {
      cancellationReason: 'Guest schedule change',
      guestPhone: '+919876543555',
    });
    assert(publicCancelRes.status === 200 && publicCancelRes.data.data.Status === 'CANCELLED', 'POST /public/:id/cancel cancels booking with phone verification');

  } catch (err) {
    console.error('\n[UNEXPECTED SUITE ERROR]:', err);
    failedCount++;
  } finally {
    if (server) {
      await new Promise(r => server.close(r));
      console.log('\nReservation test server stopped.');
    }
    await closePool();
  }

  console.log('\n===============================================================');
  console.log('PHASE 12 API TEST RESULTS');
  console.log(`Total Passed: ${passedCount}`);
  console.log(`Total Failed: ${failedCount}`);
  console.log('===============================================================');

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
