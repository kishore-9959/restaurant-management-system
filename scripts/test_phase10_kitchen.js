/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 10 KITCHEN SERVICE TEST SUITE
 * File: scripts/test_phase10_kitchen.js
 * Description: Automated test suite for KDS tickets, station routing, chef
 *              assignment, item status rollups, bump operations, and metrics.
 * ============================================================================
 */

const http = require('http');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { app } = require('../backend/kitchen-service/src/app');
const { config, sql, getPool, closePool } = require('../backend/shared');

const PORT = 8010;
const BASE_URL = `http://localhost:${PORT}/api/v1/kds`;

let server = null;
let client = null;

// Auth Tokens
const jwtSecret = config.jwtAccessSecret || 'rms_super_secret_jwt_access_key_min_32_characters_long_12345';
const chefToken = jwt.sign(
  { userId: 5, email: 'chef.blr@antigravitybistro.com', role: 'KITCHEN_CHEF', roles: ['KITCHEN_CHEF'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);
const managerToken = jwt.sign(
  { userId: 2, email: 'manager.blr@antigravitybistro.com', role: 'RESTAURANT_MANAGER', roles: ['RESTAURANT_MANAGER'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);
const customerToken = jwt.sign(
  { userId: 6, email: 'customer@example.com', role: 'CUSTOMER', roles: ['CUSTOMER'], branchId: 1 },
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
  console.log('PHASE 10: KITCHEN SERVICE (KDS) AUTOMATED TEST SUITE');
  console.log('===============================================================');

  try {
    // 1. Start Kitchen Service HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`Kitchen Service listening on port ${PORT}`);

    client = axios.create({
      baseURL: BASE_URL,
      timeout: 5000,
      validateStatus: () => true, // Don't throw on HTTP error codes
    });

    // 2. Health Checks
    console.log('\n--- Group 1: Service Health Probes ---');
    const liveRes = await axios.get(`http://localhost:${PORT}/health/live`);
    assert(liveRes.status === 200 && liveRes.data?.data?.status === 'UP', 'GET /health/live returns UP');

    const readyRes = await axios.get(`http://localhost:${PORT}/health/ready`);
    assert(readyRes.status === 200 && readyRes.data?.data?.status === 'UP', 'GET /health/ready returns UP');

    // 3. Setup Mock Order in Database for Testing
    console.log('\n--- Group 2: Test Data Setup ---');
    const pool = await getPool();
    const orderNum = 'ORD-KDS-' + Date.now();
    const orderInsert = await pool.request().query(`
      INSERT INTO dbo.Orders (
        BranchId, OrderNumber, TableId, CustomerId, GuestName, OrderType, OrderStatus, PaymentStatus, SubTotal, TaxTotal, GrandTotal, CreatedAt, UpdatedAt
      )
      VALUES (
        1, '${orderNum}', 1, 6, 'KDS Test Diner', 'DINE_IN', 'CONFIRMED', 'PAID', 500.00, 25.00, 525.00, SYSUTCDATETIME(), SYSUTCDATETIME()
      );
      SELECT SCOPE_IDENTITY() AS OrderId;
    `);
    const testOrderId = orderInsert.recordset[0].OrderId;

    const itemInsert1 = await pool.request().query(`
      INSERT INTO dbo.OrderItems (OrderId, MenuItemId, ItemNameSnapshot, UnitPrice, Quantity, ItemTotal, SpecialInstructions, ItemStatus)
      VALUES (${testOrderId}, 1, 'Woodfired Truffle Pizza', 350.00, 1, 350.00, 'Crispy crust', 'PENDING');
      SELECT SCOPE_IDENTITY() AS OrderItemId;
    `);
    const testOrderItemId1 = itemInsert1.recordset[0].OrderItemId;

    const itemInsert2 = await pool.request().query(`
      INSERT INTO dbo.OrderItems (OrderId, MenuItemId, ItemNameSnapshot, UnitPrice, Quantity, ItemTotal, SpecialInstructions, ItemStatus)
      VALUES (${testOrderId}, 2, 'Passionfruit Mojito', 150.00, 1, 150.00, 'Less ice', 'PENDING');
      SELECT SCOPE_IDENTITY() AS OrderItemId;
    `);
    const testOrderItemId2 = itemInsert2.recordset[0].OrderItemId;

    assert(Boolean(testOrderId && testOrderItemId1 && testOrderItemId2), 'Mock Order & Items seeded in database');

    // 4. Create KOT Ticket
    console.log('\n--- Group 3: KOT Creation & Idempotency ---');
    const createRes = await client.post(
      '/tickets',
      {
        branchId: 1,
        orderId: testOrderId,
        kitchenStation: 'MAIN_KITCHEN',
        specialKitchenNotes: 'VIP Table 1',
      },
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );

    assert(createRes.status === 201, 'POST /tickets returns 201 Created');
    assert(createRes.data?.data?.kotNumber?.startsWith('KOT-'), 'KOTNumber format is valid');
    assert(createRes.data?.data?.isIdempotent === false, 'isIdempotent is false on first creation');
    const testKOTId = createRes.data?.data?.kotId;

    // Idempotent duplicate call
    const dupRes = await client.post(
      '/tickets',
      {
        branchId: 1,
        orderId: testOrderId,
        kitchenStation: 'MAIN_KITCHEN',
      },
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );
    assert(dupRes.status === 200, 'Duplicate POST /tickets returns 200 OK');
    assert(dupRes.data?.data?.isIdempotent === true, 'isIdempotent is true on duplicate creation');
    assert(String(dupRes.data?.data?.kotId) === String(testKOTId), 'Duplicate call returned same KOTId');

    // 5. Get KOT Details
    console.log('\n--- Group 4: KOT Retrieval & Multi-Recordset Inspection ---');
    const getRes = await client.get(`/tickets/${testKOTId}`, {
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    assert(getRes.status === 200, 'GET /tickets/:id returns 200 OK');
    assert(getRes.data?.data?.KOTNumber === createRes.data?.data?.kotNumber, 'Retrieved matching KOTNumber');
    assert(Array.isArray(getRes.data?.data?.items) && getRes.data?.data?.items.length >= 2, 'KOT contains order items snapshot');
    const kotItemId = getRes.data?.data?.items[0]?.KOTItemId;

    // Order KOT listing
    const orderKOTsRes = await client.get(`/orders/${testOrderId}/tickets`, {
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    assert(orderKOTsRes.status === 200 && Array.isArray(orderKOTsRes.data?.data), 'GET /orders/:orderId/tickets returns 200 list');

    // 6. Active KDS Board
    console.log('\n--- Group 5: Active KDS Display Screen ---');
    const boardRes = await client.get('/active?branchId=1', {
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    assert(boardRes.status === 200 && Array.isArray(boardRes.data?.data), 'GET /active returns active board array');
    const boardTicket = boardRes.data?.data?.find((t) => String(t.KOTId) === String(testKOTId));
    assert(Boolean(boardTicket), 'Newly created KOT is visible on active KDS board');

    // 7. Chef Assignment
    console.log('\n--- Group 6: Chef Assignment ---');
    const assignRes = await client.post(
      `/tickets/${testKOTId}/assign-chef`,
      { chefUserId: 5 },
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );
    assert(assignRes.status === 200, 'POST /tickets/:id/assign-chef returns 200');
    assert(assignRes.data?.data?.SpecialKitchenNotes?.includes('[CHEF:'), 'SpecialKitchenNotes tagged with Chef info');

    // 8. Item Status Updates & Parent KOT Rollup
    console.log('\n--- Group 7: Item Status Updates & Lifecycle Rollup ---');
    const item1Res = await client.patch(
      `/items/${kotItemId}/status`,
      { status: 'COOKING' },
      { headers: { Authorization: `Bearer ${chefToken}` } }
    );
    assert(item1Res.status === 200, 'PATCH /items/:itemId/status (COOKING) returns 200');
    assert(item1Res.data?.data?.parentKOTStatus === 'PREPARING', 'Parent KOT rolled up to PREPARING');

    // Mark all items READY
    for (const item of getRes.data?.data?.items) {
      await client.patch(
        `/items/${item.KOTItemId}/status`,
        { status: 'READY' },
        { headers: { Authorization: `Bearer ${chefToken}` } }
      );
    }
    const readyKOT = await client.get(`/tickets/${testKOTId}`, {
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    assert(readyKOT.data?.data?.TicketStatus === 'READY', 'All items ready rolled parent KOT status to READY');

    // 9. Bump KOT
    console.log('\n--- Group 8: Bump Ticket Operation ---');
    const bumpRes = await client.post(`/tickets/${testKOTId}/bump`, {}, {
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    assert(bumpRes.status === 200, 'POST /tickets/:id/bump returns 200');
    assert(bumpRes.data?.data?.TicketStatus === 'BUMPED', 'KOT status transitioned to BUMPED');
    assert(Boolean(bumpRes.data?.data?.BumpedAt), 'BumpedAt timestamp recorded');

    // Verify bumped ticket no longer appears on active board
    const boardAfterBump = await client.get('/active?branchId=1', {
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    const stillActive = boardAfterBump.data?.data?.some((t) => String(t.KOTId) === String(testKOTId));
    assert(!stillActive, 'Bumped KOT successfully dismissed from active KDS board');

    // 10. Operational Metrics
    console.log('\n--- Group 9: KDS Metrics & Turnaround Reporting ---');
    const metricsRes = await client.get('/metrics?branchId=1', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(metricsRes.status === 200, 'GET /metrics returns 200');
    assert(metricsRes.data?.data?.TotalTicketsToday >= 1, 'Metrics reports TotalTicketsToday >= 1');
    assert(metricsRes.data?.data?.CompletedTicketsToday >= 1, 'Metrics reports CompletedTicketsToday >= 1');

    // 11. Security & RBAC Protection
    console.log('\n--- Group 10: Security & RBAC Enforcement ---');
    const unauthBump = await client.post(`/tickets/${testKOTId}/bump`, {}, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(unauthBump.status === 403, 'Customer token rejected on POST /tickets/:id/bump (403 Forbidden)');

    const noTokenRes = await client.get('/active');
    assert(noTokenRes.status === 401, 'Request with no token rejected on GET /active (401 Unauthorized)');

  } catch (err) {
    console.error('Unhandled Test Exception:', err.message);
    failedCount++;
  } finally {
    if (server) {
      server.close();
      console.log('\nKitchen Service test server closed.');
    }
    await closePool();
  }

  console.log('\n===============================================================');
  console.log(`KITCHEN SERVICE TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('===============================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();

