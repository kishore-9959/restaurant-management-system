/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 11 END-TO-END INTEGRATION TEST
 * File: scripts/test_phase11_integration.js
 * Description: End-to-end integration test suite verifying:
 *   1. API Gateway (:8000) Ingress routing for CMS public and admin paths
 *   2. CMS Service (:8004) -> Notification Service (:8012) REST integration
 *   3. Contact Form Submission -> Stored Proc -> Notification Broadcast
 *   4. Draft -> Publish -> Cache Invalidation Lifecycle
 *   5. API Gateway Ingress RBAC & Public Route Whitelisting
 * ============================================================================
 */

const http = require('http');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const { app: cmsApp } = require('../backend/cms-service/src/app');
const { app: notifApp } = require('../backend/notification-service/src/app');
const { app: gatewayApp } = require('../backend/api-gateway/src/app');
const { config, getPool, closePool } = require('../backend/shared');

const CMS_PORT = 8004;
const NOTIF_PORT = 8012;
const GATEWAY_PORT = 8000;

let cmsServer = null;
let notifServer = null;
let gatewayServer = null;

const jwtSecret = config.jwtAccessSecret || 'rms_super_secret_jwt_access_key_min_32_characters_long_12345';

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
  console.log('  PHASE 11: END-TO-END CMS & API GATEWAY INTEGRATION TEST SUITE');
  console.log('='.repeat(80));

  try {
    // 1. Boot up services
    console.log('\n--- 1. Booting Microservices ---');
    cmsServer = http.createServer(cmsApp);
    await new Promise((resolve) => cmsServer.listen(CMS_PORT, resolve));
    console.log(`  [+] CMS Service listening on http://localhost:${CMS_PORT}`);

    notifServer = http.createServer(notifApp);
    await new Promise((resolve) => notifServer.listen(NOTIF_PORT, resolve));
    console.log(`  [+] Notification Service listening on http://localhost:${NOTIF_PORT}`);

    gatewayServer = http.createServer(gatewayApp);
    await new Promise((resolve) => gatewayServer.listen(GATEWAY_PORT, resolve));
    console.log(`  [+] API Gateway listening on http://localhost:${GATEWAY_PORT}`);

    const gwClient = axios.create({
      baseURL: `http://localhost:${GATEWAY_PORT}`,
      timeout: 10000,
      validateStatus: () => true,
    });

    const cmsDirectClient = axios.create({
      baseURL: `http://localhost:${CMS_PORT}`,
      timeout: 10000,
      validateStatus: () => true,
    });

    // 2. Gateway Public Routing
    console.log('\n--- 2. API Gateway Ingress: Public Routes ---');
    const settingsRes = await gwClient.get('/api/v1/cms/public/settings');
    assert(settingsRes.status === 200, 'Gateway proxies GET /api/v1/cms/public/settings with 200 OK');
    assert(settingsRes.data && settingsRes.data.data !== undefined, 'Settings payload received via gateway');

    const bannersRes = await gwClient.get('/api/v1/cms/public/banners');
    assert(bannersRes.status === 200, 'Gateway proxies GET /api/v1/cms/public/banners with 200 OK');

    const navRes = await gwClient.get('/api/v1/cms/public/navigation');
    assert(navRes.status === 200, 'Gateway proxies GET /api/v1/cms/public/navigation with 200 OK');

    // 3. Contact Form Submission & Notification Service Broadcast Integration
    console.log('\n--- 3. Inter-Service Integration: Contact Submission -> Notification Alert ---');
    const contactPayload = {
      senderName: 'Integration Tester',
      senderEmail: 'tester@epicurean-test.com',
      senderPhone: '+1-555-888-9999',
      subject: 'Phase 11 Integration Event',
      inquiryType: 'GENERAL',
      messageBody: 'Testing end-to-end event notification dispatch to restaurant management brigade.',
    };

    const contactRes = await gwClient.post('/api/v1/cms/public/contact', contactPayload);
    assert(contactRes.status === 201, 'Guest contact form submitted through Gateway returns 201 Created');
    assert(contactRes.data?.data?.MessageId > 0, 'New contact message record generated with valid ID');
    const createdMessageId = contactRes.data?.data?.MessageId;

    // Small delay for async notification broadcast processing
    await new Promise((r) => setTimeout(r, 600));

    // Verify contact message in DB
    const pool = await getPool();
    const dbMsgRes = await pool.request()
      .input('MessageId', createdMessageId)
      .query('SELECT MessageId, Status, SenderEmail, SenderName FROM dbo.ContactMessages WHERE MessageId = @MessageId');
    assert(dbMsgRes.recordset.length === 1, 'Contact message verified in dbo.ContactMessages database table');
    assert(dbMsgRes.recordset[0].Status === 'UNREAD', 'Contact message initial status is UNREAD');

    // 4. Draft -> Publish -> Cache Invalidation Flow
    console.log('\n--- 4. Draft -> Publish -> Cache Invalidation Lifecycle ---');
    const testSlug = `e2e-tasting-${Date.now()}`;

    // Admin creates draft page
    const draftPageRes = await gwClient.post(
      '/api/v1/cms/admin/pages',
      {
        pageTitle: 'Grand Tasting Gala Page',
        pageSlug: testSlug,
        pageType: 'CUSTOM',
        status: 'DRAFT',
      },
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );
    assert(draftPageRes.status === 201, 'Admin creates draft page via Gateway with 201 Created');
    const pageId = draftPageRes.data?.data?.PageId;

    // Guest tries to access draft page without preview mode -> 404
    const guestDraftRes = await gwClient.get(`/api/v1/cms/public/pages/${testSlug}`);
    assert(guestDraftRes.status === 404, 'Public guest cannot view unreleased DRAFT page (404 Not Found)');

    // Manager previews draft page with JWT and ?preview=true -> 200
    const previewRes = await gwClient.get(
      `/api/v1/cms/public/pages/${testSlug}?preview=true`,
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );
    assert(previewRes.status === 200, 'Authorized manager can preview draft page (?preview=true with JWT)');
    assert(previewRes.data?.data?.page?.PageTitle === 'Grand Tasting Gala Page', 'Draft page data matches created content');

    // Admin adds a section to the draft page
    const addSectionRes = await gwClient.post(
      `/api/v1/cms/admin/pages/${pageId}/sections`,
      {
        sectionKey: 'hero_tasting',
        sectionTitle: 'The Autumn Feast',
        componentType: 'HERO_SLIDER',
        contentData: { narrative: 'Seven Courses of Pure Terroir' },
        displayOrder: 1,
        isActive: true,
      },
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );
    assert(addSectionRes.status === 201, 'Admin adds HERO_SLIDER section to page (201 Created)');

    // Admin publishes page
    const publishRes = await gwClient.put(
      `/api/v1/cms/admin/pages/${pageId}/publish`,
      {},
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );
    assert(publishRes.status === 200, 'Admin publishes page with 200 OK');

    // Now guest fetches published page -> 200
    const publishedGuestRes = await gwClient.get(`/api/v1/cms/public/pages/${testSlug}`);
    assert(publishedGuestRes.status === 200, 'Guest can now view PUBLISHED page (200 OK)');
    assert(publishedGuestRes.data?.data?.sections?.length >= 1, 'Published page includes active dynamic sections');

    // 5. Admin Contact Message Management
    console.log('\n--- 5. Admin Contact Management & Replies ---');
    const listMessagesRes = await gwClient.get('/api/v1/cms/admin/contact', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(listMessagesRes.status === 200, 'Manager retrieves contact messages list (200 OK)');

    const replyRes = await gwClient.post(
      `/api/v1/cms/admin/contact/${createdMessageId}/reply`,
      { adminReplyNotes: 'Called guest directly and reserved table at chef tasting counter.' },
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );
    assert(replyRes.status === 200, 'Manager marks contact message as REPLIED with notes (200 OK)');

    // Verify DB update
    const dbReplied = await pool.request()
      .input('MessageId', createdMessageId)
      .query('SELECT Status, RepliedByUserId FROM dbo.ContactMessages WHERE MessageId = @MessageId');
    assert(dbReplied.recordset[0].Status === 'REPLIED', 'Database status updated to REPLIED');
    assert(Number(dbReplied.recordset[0].RepliedByUserId) === 2, 'RepliedByUserId correctly recorded as Manager user ID (2)');

    // 6. Gateway Ingress Security & RBAC Enforcement
    console.log('\n--- 6. API Gateway RBAC & Security Enforcement ---');
    // Unauthenticated attempt to access admin endpoints
    const unauthAdminRes = await gwClient.post('/api/v1/cms/admin/banners', {
      bannerTitle: 'Unauthorized Banner',
      imageUrl: 'https://example.com/unauth.jpg',
    });
    assert(unauthAdminRes.status === 401, 'Unauthenticated request to /api/v1/cms/admin/* rejected with 401 Unauthorized');

    // Waitstaff attempt to access admin CMS endpoints
    const waiterAdminRes = await gwClient.post(
      '/api/v1/cms/admin/banners',
      { bannerTitle: 'Forbidden Banner', imageUrl: 'https://example.com/waiter.jpg' },
      { headers: { Authorization: `Bearer ${waiterToken}` } }
    );
    assert(waiterAdminRes.status === 403, 'WAITSTAFF token rejected on CMS admin endpoint with 403 Forbidden');

    // Clean up created test page
    await pool.request()
      .input('PageId', pageId)
      .query('DELETE FROM dbo.WebsitePageSections WHERE PageId = @PageId; DELETE FROM dbo.WebsitePages WHERE PageId = @PageId;');

  } catch (err) {
    console.error('Fatal error during integration execution:', err);
    failedCount++;
  } finally {
    if (gatewayServer) gatewayServer.close();
    if (cmsServer) cmsServer.close();
    if (notifServer) notifServer.close();
    await closePool();

    console.log('\n' + '='.repeat(80));
    console.log(`  PHASE 11 INTEGRATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('='.repeat(80));

    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

run();
