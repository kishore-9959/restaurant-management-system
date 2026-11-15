/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 10 NOTIFICATION SERVICE TEST SUITE
 * File: scripts/test_phase10_notifications.js
 * Description: Automated test suite for Notification Service REST endpoints,
 *              deduplication, read/unread tracking, and inter-service broadcast.
 * ============================================================================
 */

const http = require('http');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { app } = require('../backend/notification-service/src/app');
const { initSocketServer } = require('../backend/notification-service/src/socket');
const { config, closePool } = require('../backend/shared');

const PORT = 8012;
const BASE_URL = `http://localhost:${PORT}/api/v1/notifications`;

let server = null;
let client = null;

const jwtSecret = config.jwtAccessSecret || 'rms_super_secret_jwt_access_key_min_32_characters_long_12345';
const userToken = jwt.sign(
  { userId: 6, email: 'customer@example.com', role: 'CUSTOMER', roles: ['CUSTOMER'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);
const internalKey = config.security?.internalServiceKey || config.internalServiceKey;

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
  console.log('PHASE 10: NOTIFICATION SERVICE AUTOMATED TEST SUITE');
  console.log('===============================================================');

  try {
    // 1. Start Notification Service server with Socket.IO hub attached
    server = http.createServer(app);
    initSocketServer(server);
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`Notification Service listening on port ${PORT}`);

    client = axios.create({
      baseURL: BASE_URL,
      timeout: 5000,
      validateStatus: () => true,
    });

    // 2. Health Checks
    console.log('\n--- Group 1: Service Health Probes ---');
    const liveRes = await axios.get(`http://localhost:${PORT}/health/live`);
    assert(liveRes.status === 200 && liveRes.data?.data?.status === 'UP', 'GET /health/live returns UP');

    const readyRes = await axios.get(`http://localhost:${PORT}/health/ready`);
    assert(readyRes.status === 200 && readyRes.data?.data?.status === 'UP', 'GET /health/ready returns UP');

    // 3. Create Notification & Deduplication
    console.log('\n--- Group 2: Notification Creation & Deduplication ---');
    const title = 'Order Placed #' + Date.now();
    const createRes = await client.post(
      '/',
      {
        branchId: 1,
        userId: 6,
        title,
        message: 'Your order has been confirmed by kitchen.',
        notificationType: 'ORDER_CONFIRMED',
        targetUrl: '/orders/101',
      },
      { headers: { 'X-Internal-Service-Key': internalKey } }
    );

    assert(createRes.status === 201, 'POST / returns 201 Created');
    assert(createRes.data?.data?.isDuplicate === false, 'isDuplicate is false on first creation');
    const notificationId = createRes.data?.data?.notificationId;
    assert(Boolean(notificationId), 'Generated NotificationId returned');

    // Duplicate call within 60s
    const dupRes = await client.post(
      '/',
      {
        branchId: 1,
        userId: 6,
        title,
        message: 'Your order has been confirmed by kitchen.',
        notificationType: 'ORDER_CONFIRMED',
      },
      { headers: { 'X-Internal-Service-Key': internalKey } }
    );

    assert(dupRes.status === 201 || dupRes.status === 200, 'Duplicate POST / handled gracefully');
    assert(dupRes.data?.data?.isDuplicate === true, 'isDuplicate is true on identical rapid call');
    assert(String(dupRes.data?.data?.notificationId) === String(notificationId), 'Duplicate call returned existing NotificationId');

    // 4. Retrieve Notifications
    console.log('\n--- Group 3: User Notification Feed & Details ---');
    const feedRes = await client.get('/', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(feedRes.status === 200, 'GET / returns 200 OK');
    assert(Array.isArray(feedRes.data?.data), 'Returns notifications array');
    const found = feedRes.data?.data?.find((n) => String(n.NotificationId) === String(notificationId));
    assert(Boolean(found), 'Newly created notification present in user feed');

    // Unread count
    const unreadRes = await client.get('/unread-count', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(unreadRes.status === 200, 'GET /unread-count returns 200');
    assert(unreadRes.data?.data?.unreadCount >= 1, 'Unread count is at least 1');

    // Get by ID
    const singleRes = await client.get(`/${notificationId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(singleRes.status === 200, 'GET /:id returns 200');
    assert(singleRes.data?.data?.Title === title, 'Notification title matches');

    // 5. Mark as Read Operations
    console.log('\n--- Group 4: Read/Unread State Transitions ---');
    const readRes = await client.patch(`/${notificationId}/read`, {}, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(readRes.status === 200, 'PATCH /:id/read returns 200');
    assert(readRes.data?.data?.rowsUpdated === 1, 'RowsUpdated is 1');

    // Bulk mark all read
    const allReadRes = await client.patch('/read-all', {}, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(allReadRes.status === 200, 'PATCH /read-all returns 200');

    // Check count is now 0
    const finalUnreadRes = await client.get('/unread-count', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(finalUnreadRes.data?.data?.unreadCount === 0, 'Unread count is 0 after mark-all-read');

    // 6. Inter-Service Broadcast Endpoint
    console.log('\n--- Group 5: Inter-Service Mesh Broadcast ---');
    const broadcastRes = await axios.post(
      `http://localhost:${PORT}/api/v1/notifications/internal/broadcast`,
      {
        branchId: 1,
        targetRoom: 'branch:1:kitchen',
        event: 'kot:created',
        title: 'New Table 4 Order',
        message: 'Table 4 sent 3 items to Main Kitchen',
        notificationType: 'KOT_CREATED',
        payload: { table: 4, itemsCount: 3 },
      },
      {
        headers: { 'X-Internal-Service-Key': internalKey },
      }
    );
    assert(broadcastRes.status === 200, 'POST /internal/broadcast returns 200');
    assert(broadcastRes.data?.data?.broadcasted === true, 'Broadcasted flag is true');
    assert(Boolean(broadcastRes.data?.data?.notificationId), 'Broadcast persisted with NotificationId');

    // 7. Security & Unauthenticated Requests
    console.log('\n--- Group 6: Security & Auth Guard ---');
    const unauthFeed = await client.get('/');
    assert(unauthFeed.status === 401, 'GET / without token returns 401 Unauthorized');

    const unauthBroadcast = await axios.post(
      `http://localhost:${PORT}/api/v1/notifications/internal/broadcast`,
      { event: 'hack' },
      { validateStatus: () => true }
    );
    assert(unauthBroadcast.status === 401 || unauthBroadcast.status === 403, 'POST /internal/broadcast without internal key rejected');

  } catch (err) {
    console.error('Unhandled Test Exception:', err.message);
    failedCount++;
  } finally {
    if (server) {
      server.close();
      console.log('\nNotification Service test server closed.');
    }
    await closePool();
  }

  console.log('\n===============================================================');
  console.log(`NOTIFICATION SERVICE TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('===============================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();

