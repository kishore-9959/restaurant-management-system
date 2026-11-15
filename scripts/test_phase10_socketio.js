/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 10 SOCKET.IO TEST SUITE
 * File: scripts/test_phase10_socketio.js
 * Description: Automated test suite for WebSocket handshake authentication,
 *              branch/role room isolation, event delivery, and acknowledgements.
 * ============================================================================
 */

const http = require('http');
const ioClient = require('socket.io-client');
const jwt = require('jsonwebtoken');
const { app } = require('../backend/notification-service/src/app');
const { initSocketServer, socketManager } = require('../backend/notification-service/src/socket');
const { config, closePool } = require('../backend/shared');

const PORT = 8012;
const SERVER_URL = `http://localhost:${PORT}`;

let server = null;

const jwtSecret = config.jwtAccessSecret || 'rms_super_secret_jwt_access_key_min_32_characters_long_12345';

// Tokens
const chefBranch1Token = jwt.sign(
  { userId: 5, email: 'chef.blr@antigravitybistro.com', role: 'KITCHEN_CHEF', roles: ['KITCHEN_CHEF'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);
const waiterBranch1Token = jwt.sign(
  { userId: 4, email: 'waiter.blr@antigravitybistro.com', role: 'WAITSTAFF', roles: ['WAITSTAFF'], branchId: 1 },
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
  console.log('PHASE 10: REAL-TIME SOCKET.IO AUTOMATED TEST SUITE');
  console.log('===============================================================');

  try {
    // 1. Start Notification Service with Socket.IO hub attached
    server = http.createServer(app);
    initSocketServer(server);
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`Socket.IO server running on port ${PORT}`);

    // --- Group 1: Handshake Authentication ---
    console.log('\n--- Group 1: Handshake Authentication ---');

    // Test 1: Connect with valid JWT
    const clientChef = await new Promise((resolve, reject) => {
      const socket = ioClient(SERVER_URL, {
        auth: { token: chefBranch1Token },
        transports: ['websocket'],
        reconnection: false,
      });
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', (err) => reject(err));
    });
    assert(clientChef.connected === true, 'Socket connection with valid JWT succeeds');

    // Test 2: Connect without token -> should fail
    let unauthRejected = false;
    try {
      await new Promise((resolve, reject) => {
        const socket = ioClient(SERVER_URL, {
          transports: ['websocket'],
          reconnection: false,
        });
        socket.on('connect', () => {
          socket.disconnect();
          resolve(socket);
        });
        socket.on('connect_error', (err) => {
          unauthRejected = true;
          socket.disconnect();
          resolve(err);
        });
      });
    } catch (e) {
      unauthRejected = true;
    }
    assert(unauthRejected, 'Socket connection without token is rejected');

    // Test 3: Connect with malformed/expired token -> should fail
    let badTokenRejected = false;
    try {
      await new Promise((resolve, reject) => {
        const socket = ioClient(SERVER_URL, {
          auth: { token: 'invalid_malformed_jwt_token_xyz' },
          transports: ['websocket'],
          reconnection: false,
        });
        socket.on('connect', () => {
          socket.disconnect();
          resolve(socket);
        });
        socket.on('connect_error', (err) => {
          badTokenRejected = true;
          socket.disconnect();
          resolve(err);
        });
      });
    } catch (e) {
      badTokenRejected = true;
    }
    assert(badTokenRejected, 'Socket connection with invalid token is rejected');

    // --- Group 2: Room Authorization & Branch Isolation ---
    console.log('\n--- Group 2: Room Authorization & Branch Isolation ---');

    // Test 4: Chef joins branch 1 kitchen room -> Success
    const joinKitchenAck = await new Promise((resolve) => {
      clientChef.emit('join', { room: 'branch:1:kitchen' }, (response) => {
        resolve(response);
      });
    });
    assert(joinKitchenAck?.success === true, 'Chef authorized to join branch:1:kitchen room');

    // Test 5: Chef attempts to join branch 2 kitchen room (Cross-Branch) -> Forbidden
    let forbiddenCaught = false;
    clientChef.once('error', (err) => {
      if (err.code === 'FORBIDDEN_ROOM') forbiddenCaught = true;
    });

    const crossBranchAck = await new Promise((resolve) => {
      clientChef.emit('join', { room: 'branch:2:kitchen' }, (response) => {
        resolve(response);
      });
      setTimeout(() => resolve(null), 500);
    });
    assert(crossBranchAck?.success === false || forbiddenCaught, 'Chef rejected from cross-branch room (branch:2:kitchen)');

    // Test 6: Connect Waitstaff and join waitstaff room
    const clientWaiter = await new Promise((resolve, reject) => {
      const socket = ioClient(SERVER_URL, {
        auth: { token: waiterBranch1Token },
        transports: ['websocket'],
        reconnection: false,
      });
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', (err) => reject(err));
    });
    assert(clientWaiter.connected === true, 'Waitstaff socket connected');

    const joinWaitstaffAck = await new Promise((resolve) => {
      clientWaiter.emit('join', { room: 'branch:1:waitstaff' }, (response) => {
        resolve(response);
      });
    });
    assert(joinWaitstaffAck?.success === true, 'Waitstaff authorized to join branch:1:waitstaff room');

    // Test 7: Customer attempts to join kitchen room -> Forbidden
    const clientCustomer = await new Promise((resolve, reject) => {
      const socket = ioClient(SERVER_URL, {
        auth: { token: customerToken },
        transports: ['websocket'],
        reconnection: false,
      });
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', (err) => reject(err));
    });

    let customerForbidden = false;
    clientCustomer.once('error', (err) => {
      if (err.code === 'FORBIDDEN_ROOM') customerForbidden = true;
    });

    const custJoinAck = await new Promise((resolve) => {
      clientCustomer.emit('join', { room: 'branch:1:kitchen' }, (response) => {
        resolve(response);
      });
      setTimeout(() => resolve(null), 500);
    });
    assert(custJoinAck?.success === false || customerForbidden, 'Customer rejected from kitchen room');

    // --- Group 3: Real-Time Event Delivery ---
    console.log('\n--- Group 3: Real-Time Event Delivery ---');

    // Test 8: Kitchen event (kot:created) delivered to kitchen room
    const kotEventPromise = new Promise((resolve) => {
      clientChef.once('kot:created', (data) => resolve(data));
    });

    socketManager.broadcast({
      room: 'branch:1:kitchen',
      event: 'kot:created',
      data: { kotId: 50001, kotNumber: 'KOT-20261115-1-00001', station: 'MAIN_KITCHEN' },
    });

    const receivedKot = await Promise.race([
      kotEventPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for kot:created')), 3000)),
    ]);
    assert(receivedKot?.kotNumber === 'KOT-20261115-1-00001', "Kitchen tablet receives 'kot:created' event");

    // Test 9: Waitstaff event (order:ready) delivered to waitstaff room
    const orderReadyPromise = new Promise((resolve) => {
      clientWaiter.once('order:ready', (data) => resolve(data));
    });

    socketManager.broadcast({
      room: 'branch:1:waitstaff',
      event: 'order:ready',
      data: { orderId: 10001, orderNumber: 'ORD-10001', tableNumber: 'Table 4' },
    });

    const receivedOrderReady = await Promise.race([
      orderReadyPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for order:ready')), 3000)),
    ]);
    assert(receivedOrderReady?.tableNumber === 'Table 4', "Waitstaff receives 'order:ready' event");

    // Test 10: Private user notification event (notification:new)
    const userNotifPromise = new Promise((resolve) => {
      clientCustomer.once('notification:new', (data) => resolve(data));
    });

    socketManager.emitToUser(6, 'notification:new', {
      notificationId: 1,
      title: 'Payment Confirmed',
      message: 'Your payment was successful.',
    });

    const receivedUserNotif = await Promise.race([
      userNotifPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for user notification')), 3000)),
    ]);
    assert(receivedUserNotif?.title === 'Payment Confirmed', 'Private notification delivered to user:6 private room');

    // Clean disconnects
    clientChef.disconnect();
    clientWaiter.disconnect();
    clientCustomer.disconnect();

  } catch (err) {
    console.error('Unhandled Test Exception:', err.message);
    failedCount++;
  } finally {
    if (server) {
      server.close();
      console.log('\nSocket.IO test server closed.');
    }
    await closePool();
  }

  console.log('\n===============================================================');
  console.log(`SOCKET.IO TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('===============================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();

