/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 10 END-TO-END INTEGRATION TEST
 * File: scripts/test_phase10_integration.js
 * Description: Tests full inter-service flow:
 *   Order Service (:8007) -> Kitchen Service (:8010) -> Notification Service (:8012)
 *   with live Socket.IO events and automated order status synchronization.
 * ============================================================================
 */

const http = require('http');
const axios = require('axios');
const ioClient = require('socket.io-client');
const jwt = require('jsonwebtoken');

const { app: orderApp } = require('../backend/order-service/src/app');
const { app: kitchenApp } = require('../backend/kitchen-service/src/app');
const { app: notifApp } = require('../backend/notification-service/src/app');
const { initSocketServer } = require('../backend/notification-service/src/socket');
const { config, getPool, closePool } = require('../backend/shared');

const ORDER_PORT = 8007;
const KITCHEN_PORT = 8010;
const NOTIF_PORT = 8012;

let orderServer = null;
let kitchenServer = null;
let notifServer = null;

const jwtSecret = config.jwtAccessSecret || 'rms_super_secret_jwt_access_key_min_32_characters_long_12345';

const managerToken = jwt.sign(
  { userId: 2, email: 'manager.blr@antigravitybistro.com', role: 'RESTAURANT_MANAGER', roles: ['RESTAURANT_MANAGER'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);
const chefToken = jwt.sign(
  { userId: 5, email: 'chef.blr@antigravitybistro.com', role: 'KITCHEN_CHEF', roles: ['KITCHEN_CHEF'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);
const waiterToken = jwt.sign(
  { userId: 4, email: 'waiter.blr@antigravitybistro.com', role: 'WAITSTAFF', roles: ['WAITSTAFF'], branchId: 1 },
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
  console.log('PHASE 10: END-TO-END INTER-SERVICE INTEGRATION TEST SUITE');
  console.log('===============================================================');

  let socketChef = null;
  let socketWaiter = null;

  try {
    // 1. Boot up all 3 participating microservices
    console.log('\n--- Step 1: Booting Microservices ---');

    notifServer = http.createServer(notifApp);
    initSocketServer(notifServer);
    await new Promise((resolve) => notifServer.listen(NOTIF_PORT, resolve));
    console.log(`  [OK] Notification Service & Socket.IO running on port ${NOTIF_PORT}`);

    kitchenServer = http.createServer(kitchenApp);
    await new Promise((resolve) => kitchenServer.listen(KITCHEN_PORT, resolve));
    console.log(`  [OK] Kitchen Service running on port ${KITCHEN_PORT}`);

    orderServer = http.createServer(orderApp);
    await new Promise((resolve) => orderServer.listen(ORDER_PORT, resolve));
    console.log(`  [OK] Order Service running on port ${ORDER_PORT}`);

    assert(Boolean(notifServer && kitchenServer && orderServer), 'All 3 microservices booted successfully');

    // 2. Connect Real-time Socket.IO Clients
    console.log('\n--- Step 2: Establishing Real-time Socket.IO Subscriptions ---');
    socketChef = await new Promise((resolve, reject) => {
      const s = ioClient(`http://localhost:${NOTIF_PORT}`, {
        auth: { token: chefToken },
        transports: ['websocket'],
      });
      s.on('connect', () => resolve(s));
      s.on('connect_error', reject);
    });

    await new Promise((resolve) => {
      socketChef.emit('join', { room: 'branch:1:kitchen' }, resolve);
    });
    assert(socketChef.connected, 'Chef tablet connected & subscribed to branch:1:kitchen');

    socketWaiter = await new Promise((resolve, reject) => {
      const s = ioClient(`http://localhost:${NOTIF_PORT}`, {
        auth: { token: waiterToken },
        transports: ['websocket'],
      });
      s.on('connect', () => resolve(s));
      s.on('connect_error', reject);
    });

    await new Promise((resolve) => {
      socketWaiter.emit('join', { room: 'branch:1:waitstaff' }, resolve);
    });
    assert(socketWaiter.connected, 'Waitstaff device connected & subscribed to branch:1:waitstaff');

    // 3. Seed an active Order in database (PENDING status)
    console.log('\n--- Step 3: Seeding Order with Order Items ---');
    const pool = await getPool();
    const orderNum = 'ORD-E2E-' + Date.now();
    const orderRes = await pool.request().query(`
      INSERT INTO dbo.Orders (
        BranchId, OrderNumber, TableId, CustomerId, GuestName, OrderType, OrderStatus, PaymentStatus, SubTotal, TaxTotal, GrandTotal, CreatedAt, UpdatedAt
      )
      VALUES (
        1, '${orderNum}', 2, 6, 'Integration Diner', 'DINE_IN', 'PENDING', 'PAID', 400.00, 20.00, 420.00, SYSUTCDATETIME(), SYSUTCDATETIME()
      );
      SELECT SCOPE_IDENTITY() AS OrderId;
    `);
    const orderId = orderRes.recordset[0].OrderId;

    const itemRes = await pool.request().query(`
      INSERT INTO dbo.OrderItems (OrderId, MenuItemId, ItemNameSnapshot, UnitPrice, Quantity, ItemTotal, SpecialInstructions, ItemStatus)
      VALUES (${orderId}, 1, 'Margherita Basil Pizza', 400.00, 1, 400.00, 'Well done', 'PENDING');
      SELECT SCOPE_IDENTITY() AS OrderItemId;
    `);
    const orderItemId = itemRes.recordset[0].OrderItemId;
    assert(Boolean(orderId && orderItemId), `Created Order #${orderNum} (ID: ${orderId})`);

    // 4. Confirm Order in Order Service -> Triggers KOT Creation & Socket Broadcast
    console.log('\n--- Step 4: Order Service Confirm -> Kitchen Service KOT Creation ---');
    const kotEventPromise = new Promise((resolve) => {
      socketChef.once('kot:created', (data) => resolve(data));
    });

    const confirmRes = await axios.put(
      `http://localhost:${ORDER_PORT}/api/v1/orders/${orderId}/status`,
      { status: 'CONFIRMED', notes: 'Confirmed by manager for preparation' },
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );
    assert(confirmRes.status === 200, 'Order Service updated status to CONFIRMED');

    // Wait for Chef tablet to receive kot:created via Socket.IO
    const receivedKOT = await Promise.race([
      kotEventPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for kot:created on Chef tablet')), 4000)),
    ]);
    assert(Boolean(receivedKOT), "Chef tablet received real-time 'kot:created' event");
    const kotId = receivedKOT?.data?.KOTId || receivedKOT?.KOTId;
    assert(Boolean(kotId), `KOT ticket verified in real-time event (KOTId: ${kotId})`);

    // Verify KOT exists in Kitchen Service
    const kotDetailsRes = await axios.get(`http://localhost:${KITCHEN_PORT}/api/v1/kds/tickets/${kotId}`, {
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    assert(kotDetailsRes.status === 200, 'Kitchen Service retrieved newly created KOT');
    const kotItem = kotDetailsRes.data?.data?.items?.[0];
    assert(Boolean(kotItem?.KOTItemId), 'KOT item identified');

    // 5. Chef Updates Item Status to READY -> Kitchen Service Auto-Syncs Order Status
    console.log('\n--- Step 5: Chef Prepares Dish & Marks READY ---');
    const orderReadyPromise = new Promise((resolve) => {
      socketWaiter.once('order:ready', (data) => resolve(data));
    });

    const itemUpdateRes = await axios.patch(
      `http://localhost:${KITCHEN_PORT}/api/v1/kds/items/${kotItem.KOTItemId}/status`,
      { status: 'READY' },
      { headers: { Authorization: `Bearer ${chefToken}` } }
    );
    assert(itemUpdateRes.status === 200, 'Kitchen Service updated item status to READY');
    assert(itemUpdateRes.data?.data?.allOrderKOTsReady === true, 'allOrderKOTsReady evaluated to true');

    // Wait for Waitstaff device to receive order:ready event
    const receivedOrderReady = await Promise.race([
      orderReadyPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for order:ready on Waitstaff device')), 4000)),
    ]);
    assert(Boolean(receivedOrderReady), "Waitstaff device received real-time 'order:ready' pickup alert");

    // Verify Order Service status was automatically synchronized to READY
    const syncedOrderRes = await axios.get(`http://localhost:${ORDER_PORT}/api/v1/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(syncedOrderRes.data?.data?.orderStatus === 'READY', 'Order Service orderStatus automatically synchronized to READY');

    // 6. Chef Bumps Ticket off Screen
    console.log('\n--- Step 6: Bumping Completed Ticket ---');
    const kotBumpPromise = new Promise((resolve) => {
      socketChef.once('kot:bumped', (data) => resolve(data));
    });

    const bumpRes = await axios.post(
      `http://localhost:${KITCHEN_PORT}/api/v1/kds/tickets/${kotId}/bump`,
      {},
      { headers: { Authorization: `Bearer ${chefToken}` } }
    );
    assert(bumpRes.status === 200, 'KOT successfully bumped');

    const receivedBump = await Promise.race([
      kotBumpPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for kot:bumped')), 3000)),
    ]);
    assert(Boolean(receivedBump), "Chef screen received 'kot:bumped' event to dismiss ticket card");

    // 7. Verify Database Persistence
    console.log('\n--- Step 7: Final Database Integrity Verification ---');
    const dbCheck = await pool.request().query(`
      SELECT kot.TicketStatus, kot.BumpedAt, o.OrderStatus, o.PaymentStatus
      FROM dbo.KitchenOrderTickets kot
      INNER JOIN dbo.Orders o ON kot.OrderId = o.OrderId
      WHERE kot.KOTId = ${kotId};
    `);
    const dbRow = dbCheck.recordset[0];
    assert(dbRow.TicketStatus === 'BUMPED', 'Database verified: TicketStatus is BUMPED');
    assert(Boolean(dbRow.BumpedAt), 'Database verified: BumpedAt timestamp is recorded');
    assert(dbRow.OrderStatus === 'READY', 'Database verified: OrderStatus is READY');

    // Clean disconnects
    socketChef.disconnect();
    socketWaiter.disconnect();

  } catch (err) {
    console.error('Unhandled Integration Test Exception:', err.message);
    failedCount++;
  } finally {
    if (orderServer) orderServer.close();
    if (kitchenServer) kitchenServer.close();
    if (notifServer) notifServer.close();
    await closePool();
    console.log('\nAll test microservice servers closed.');
  }

  console.log('\n===============================================================');
  console.log(`END-TO-END INTEGRATION TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('===============================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();

