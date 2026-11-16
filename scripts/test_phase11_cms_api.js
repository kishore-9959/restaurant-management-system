/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 11 CMS API AUTOMATED TEST SUITE
 * File: scripts/test_phase11_cms_api.js
 * Description: Exhaustive REST API verification for all CMS public & admin endpoints,
 *              JWT authentication, RBAC, draft preview security, Cloudinary,
 *              Redis caching and cache invalidation.
 * ============================================================================
 */

const http = require('http');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { app } = require('../backend/cms-service/src/app');
const { config, closePool } = require('@rms/shared');

const PORT = 8004;
const BASE_URL = `http://localhost:${PORT}/api/v1/cms`;

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
const customerToken = jwt.sign(
  { userId: 10, email: 'guest@example.com', role: 'CUSTOMER', roles: ['CUSTOMER'], branchId: 1 },
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
  console.log('PHASE 11: CMS REST API AUTOMATED TEST SUITE');
  console.log('===============================================================');

  try {
    // 1. Start CMS Service HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`CMS test server listening on port ${PORT}`);

    client = axios.create({
      baseURL: BASE_URL,
      validateStatus: () => true, // Don't throw on error status codes
      timeout: 10000,
    });

    // ------------------------------------------------------------------------
    // MODULE 1: Health Probes
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 1: Health Probes ---');
    const liveRes = await axios.get(`http://localhost:${PORT}/health/live`);
    assert(liveRes.status === 200 && liveRes.data.data.status === 'UP', 'Liveness probe returns 200 UP');

    const readyRes = await axios.get(`http://localhost:${PORT}/health/ready`);
    assert(readyRes.status === 200 && readyRes.data.data.status === 'UP', 'Readiness probe returns 200 UP (DB + Redis)');

    // ------------------------------------------------------------------------
    // MODULE 2: Public Guest Endpoints
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 2: Public Guest Endpoints ---');
    
    // Website Settings
    const pubSettingsRes = await client.get('/public/settings');
    assert(pubSettingsRes.status === 200 && pubSettingsRes.data.success, 'GET /public/settings returns branding data');

    // SEO Settings
    const pubSEORes = await client.get('/public/seo');
    assert(pubSEORes.status === 200 && pubSEORes.data.success, 'GET /public/seo returns meta tags');

    // Banners
    const pubBannersRes = await client.get('/public/banners?location=HOME_HERO');
    assert(pubBannersRes.status === 200 && Array.isArray(pubBannersRes.data.data), 'GET /public/banners returns array');

    // Navigation
    const pubNavRes = await client.get('/public/navigation');
    assert(pubNavRes.status === 200 && pubNavRes.data.data.header !== undefined, 'GET /public/navigation returns header structure');

    // Footer
    const pubFooterRes = await client.get('/public/footer');
    assert(pubFooterRes.status === 200 && Array.isArray(pubFooterRes.data.data.footerSections), 'GET /public/footer returns columns & social');

    // FAQs
    const pubFAQsRes = await client.get('/public/faqs');
    assert(pubFAQsRes.status === 200 && Array.isArray(pubFAQsRes.data.data), 'GET /public/faqs returns array');

    // Testimonials
    const pubTestimonialsRes = await client.get('/public/testimonials');
    assert(pubTestimonialsRes.status === 200 && Array.isArray(pubTestimonialsRes.data.data), 'GET /public/testimonials returns array');

    // Social Links
    const pubSocialRes = await client.get('/public/social-links');
    assert(pubSocialRes.status === 200 && Array.isArray(pubSocialRes.data.data), 'GET /public/social-links returns array');

    // Submit Contact Message (Success)
    const validContactPayload = {
      senderName: 'Automated Tester',
      senderEmail: 'tester@example.com',
      senderPhone: '+91 91234 56789',
      subject: 'Private Dining Event Inquiry',
      inquiryType: 'PRIVATE_EVENT',
      messageBody: 'Inquiry regarding event catering for 40 guests.',
    };
    const contactRes = await client.post('/public/contact', validContactPayload);
    assert(contactRes.status === 201 && contactRes.data.data.MessageId, 'POST /public/contact successfully creates inquiry');
    const createdMessageId = contactRes.data.data.MessageId;

    // Submit Contact Message (Validation Failure: missing email)
    const invalidContactRes = await client.post('/public/contact', { senderName: 'Tester', subject: 'Hi' });
    const isValidationErr = invalidContactRes.status === 400 && (invalidContactRes.data.error?.code === 'VALIDATION_FAILED' || invalidContactRes.data.code === 'VALIDATION_FAILED');
    assert(isValidationErr, 'POST /public/contact rejects invalid payload with 400');

    // Non-existent page slug
    const missingPageRes = await client.get('/public/pages/this-slug-definitely-does-not-exist-999');
    assert(missingPageRes.status === 404, 'GET /public/pages/:slug returns 404 for unknown slug');

    // ------------------------------------------------------------------------
    // MODULE 3: Draft Preview Security
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 3: Draft Preview Security ---');
    
    // Create a draft page as admin first
    const testSlug = `exclusive-vip-${Date.now()}`;
    const draftPageRes = await client.post(
      '/admin/pages',
      {
        pageTitle: 'Exclusive VIP Tasting Lounge',
        pageSlug: testSlug,
        pageType: 'CUSTOM',
        status: 'DRAFT',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(draftPageRes.status === 201, 'Admin created draft page');
    const draftPageId = draftPageRes.data.data.PageId;

    // Public guest tries to view draft -> should receive 404
    const guestDraftRes = await client.get(`/public/pages/${testSlug}`);
    assert(guestDraftRes.status === 404, 'Public visitor CANNOT view unauthenticated draft (404)');

    // Public visitor requests preview without token -> 401
    const unauthPreviewRes = await client.get(`/public/pages/${testSlug}?preview=true`);
    assert(unauthPreviewRes.status === 401, 'Preview mode without Bearer token rejected with 401');

    // CUSTOMER role tries to preview -> 403
    const forbiddenPreviewRes = await client.get(`/public/pages/${testSlug}?preview=true`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(forbiddenPreviewRes.status === 403, 'Preview mode with CUSTOMER role rejected with 403');

    // SUPER_ADMIN role previews draft -> 200 with draft content
    const adminPreviewRes = await client.get(`/public/pages/${testSlug}?preview=true`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminPreviewRes.status === 200 && adminPreviewRes.data.data.page.PageSlug === testSlug, 'SUPER_ADMIN authorized to preview draft page');

    // RESTAURANT_MANAGER role previews draft -> 200 with draft content
    const managerPreviewRes = await client.get(`/public/pages/${testSlug}?preview=true`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(managerPreviewRes.status === 200 && managerPreviewRes.data.data.page.PageSlug === testSlug, 'RESTAURANT_MANAGER authorized to preview draft page');

    // ------------------------------------------------------------------------
    // MODULE 4: Admin Authentication & RBAC Guards
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 4: Admin RBAC Guards ---');
    const noAuthRes = await client.get('/admin/pages');
    assert(noAuthRes.status === 401, 'Admin routes reject unauthenticated requests with 401');

    const customerAdminRes = await client.get('/admin/pages', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(customerAdminRes.status === 403, 'Admin routes reject CUSTOMER role with 403');

    // ------------------------------------------------------------------------
    // MODULE 5: Admin Full CRUD Operations
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 5: Admin Full CRUD Operations ---');

    // 1. Update Website Settings
    const updateSettingsRes = await client.put(
      '/admin/settings',
      {
        siteTitle: 'Antigravity Bistro Bangalore',
        contactEmail: 'info@antigravitybistro.com',
        contactPhone: '+91 80 1234 5678',
        addressLine: '456 Brigade Road, Ashok Nagar, Bengaluru',
        primaryColor: '#E63946',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(updateSettingsRes.status === 200 && updateSettingsRes.data.data.SiteTitle === 'Antigravity Bistro Bangalore', 'PUT /admin/settings updates branding');

    // 2. Update SEO Settings
    const updateSEORes = await client.put(
      '/admin/seo',
      {
        metaTitle: 'Antigravity Bistro | Best Fine Dining Bengaluru',
        metaDescription: 'Michelin-starred sensory dining and seasonal gastronomy.',
        canonicalUrl: 'https://antigravitybistro.com',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(updateSEORes.status === 200 && updateSEORes.data.data.MetaTitle.includes('Best Fine Dining'), 'PUT /admin/seo updates metadata');

    // 3. Section Component Registry: Add section to draft page
    const addSectionRes = await client.post(
      `/admin/pages/${draftPageId}/sections`,
      {
        sectionKey: 'lounge_ambiance',
        sectionTitle: 'Sophisticated Atmosphere',
        componentType: 'ABOUT_STORY',
        contentData: { narrative: 'Crafted with bespoke Italian leather and ambient lighting.' },
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(addSectionRes.status === 201 && addSectionRes.data.data.SectionKey === 'lounge_ambiance', 'POST /admin/pages/:id/sections creates section block');
    const sectionId = addSectionRes.data.data.SectionId;

    // 4. Update section
    const updateSectionRes = await client.put(
      `/admin/sections/${sectionId}`,
      {
        sectionTitle: 'Ultra-Sophisticated Atmosphere',
        componentType: 'ABOUT_STORY',
        contentData: { narrative: 'Updated ambient narrative.' },
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(updateSectionRes.status === 200, 'PUT /admin/sections/:id updates section block');

    // 5. Reorder sections
    const reorderRes = await client.put(
      `/admin/pages/${draftPageId}/sections/reorder`,
      {
        sectionsOrder: [{ sectionId, displayOrder: 1 }],
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(reorderRes.status === 200, 'PUT /admin/pages/:id/sections/reorder updates sequence atomically');

    // 6. Publish Page
    const publishRes = await client.put(
      `/admin/pages/${draftPageId}/publish`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(publishRes.status === 200 && publishRes.data.data.Status === 'PUBLISHED', 'PUT /admin/pages/:id/publish publishes page');

    // Verify page is now accessible to public guests without preview flag!
    const publicPublishedRes = await client.get(`/public/pages/${testSlug}`);
    assert(publicPublishedRes.status === 200 && publicPublishedRes.data.data.page.Status === 'PUBLISHED', 'Published page is immediately accessible to public guests');

    // 7. Archive Page
    const archiveRes = await client.put(
      `/admin/pages/${draftPageId}/archive`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(archiveRes.status === 200 && archiveRes.data.data.Status === 'ARCHIVED', 'PUT /admin/pages/:id/archive archives page');

    // 8. Delete Page (Soft Delete)
    const deletePageRes = await client.delete(
      `/admin/pages/${draftPageId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(deletePageRes.status === 200, 'DELETE /admin/pages/:id soft deletes page');

    // 9. Banner Management
    const createBannerRes = await client.post(
      '/admin/banners',
      {
        bannerTitle: 'Truffle & Wine Gala',
        subtitle: 'An intimate 5-course black truffle pairing evening.',
        imageUrl: 'https://res.cloudinary.com/rms/image/upload/truffle.jpg',
        bannerLocation: 'PROMO_BAR',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(createBannerRes.status === 201, 'POST /admin/banners creates banner');
    const bannerId = createBannerRes.data.data.BannerId;

    const deleteBannerRes = await client.delete(
      `/admin/banners/${bannerId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(deleteBannerRes.status === 200, 'DELETE /admin/banners/:id soft deletes banner');

    // 10. Navigation Menu Management
    const createNavRes = await client.post(
      '/admin/navigation',
      {
        title: 'Wine Cellar',
        targetUrl: '/cellar',
        menuLocation: 'HEADER',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(createNavRes.status === 201, 'POST /admin/navigation creates nav link');
    const navMenuId = createNavRes.data.data.MenuId;

    const deleteNavRes = await client.delete(
      `/admin/navigation/${navMenuId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(deleteNavRes.status === 200, 'DELETE /admin/navigation/:id deletes nav link');

    // 11. Footer Column Management
    const createFooterRes = await client.post(
      '/admin/footer',
      {
        sectionTitle: 'Accreditation',
        contentType: 'RICH_TEXT',
        contentHtml: '<p>Michelin Guide 2026 Recommended Restaurant</p>',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(createFooterRes.status === 201, 'POST /admin/footer creates footer section');
    const footerSecId = createFooterRes.data.data.FooterSectionId;

    const deleteFooterRes = await client.delete(
      `/admin/footer/${footerSecId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(deleteFooterRes.status === 200, 'DELETE /admin/footer/:id deletes footer section');

    // 12. FAQ Management
    const createFAQRes = await client.post(
      '/admin/faqs',
      {
        category: 'DELIVERY',
        question: 'Do you offer private catering delivery?',
        answer: 'Yes, white-glove private dining setup is available within a 15km radius.',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(createFAQRes.status === 201, 'POST /admin/faqs creates FAQ entry');
    const faqId = createFAQRes.data.data.FAQId;

    const deleteFAQRes = await client.delete(
      `/admin/faqs/${faqId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(deleteFAQRes.status === 200, 'DELETE /admin/faqs/:id soft deletes FAQ');

    // 13. Testimonials Management & Rating Constraint
    const createTestimonialRes = await client.post(
      '/admin/testimonials',
      {
        authorName: 'Lady Genevieve',
        reviewContent: 'The sensory pairing was transcendent. A true culinary landmark.',
        rating: 5,
        isFeatured: true,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(createTestimonialRes.status === 201, 'POST /admin/testimonials creates 5-star review');
    const testimonialId = createTestimonialRes.data.data.TestimonialId;

    // Rating validation guard: rating = 7 must return 400
    const invalidRatingRes = await client.post(
      '/admin/testimonials',
      {
        authorName: 'Invalid Rating Tester',
        reviewContent: 'Rating exceeds 5',
        rating: 7,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(invalidRatingRes.status === 400, 'POST /admin/testimonials rejects rating > 5 with 400');

    const deleteTestimonialRes = await client.delete(
      `/admin/testimonials/${testimonialId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(deleteTestimonialRes.status === 200, 'DELETE /admin/testimonials/:id soft deletes review');

    // 14. Social Media Links
    const saveSocialRes = await client.post(
      '/admin/social-links',
      {
        platformName: 'YOUTUBE',
        platformUrl: 'https://youtube.com/@antigravitybistro',
        iconKey: 'youtube',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(saveSocialRes.status === 200 && saveSocialRes.data.data.SocialLinkId, 'POST /admin/social-links upserts channel');
    const socialId = saveSocialRes.data.data.SocialLinkId;

    const deleteSocialRes = await client.delete(
      `/admin/social-links/${socialId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(deleteSocialRes.status === 200, 'DELETE /admin/social-links/:id deletes social link');

    // 15. Contact Inquiries Admin & Staff Resolution
    const listInquiriesRes = await client.get('/admin/contact', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listInquiriesRes.status === 200 && Array.isArray(listInquiriesRes.data.data.messages), 'GET /admin/contact returns paginated inquiries');

    const getInquiryRes = await client.get(`/admin/contact/${createdMessageId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getInquiryRes.status === 200 && getInquiryRes.data.data.Status === 'READ', 'GET /admin/contact/:id transitions status to READ');

    const replyInquiryRes = await client.post(
      `/admin/contact/${createdMessageId}/reply`,
      {
        adminReplyNotes: 'Called guest and finalized private dining reservation details.',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(replyInquiryRes.status === 200 && replyInquiryRes.data.data.Status === 'REPLIED', 'POST /admin/contact/:id/reply sets status to REPLIED with staff resolution notes');

    // 16. Media Management (Cloudinary signature & delete)
    const signRes = await client.get('/admin/media/sign?folder=rms/cms', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(signRes.status === 200 && signRes.data.data.signature && signRes.data.data.timestamp, 'GET /admin/media/sign returns signed upload parameters');

    const delMediaRes = await client.delete('/admin/media', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { publicId: 'test_asset_dummy_123' },
    });
    assert(delMediaRes.status === 200, 'DELETE /admin/media completes asset deletion call');

  } catch (err) {
    console.error('\n[UNEXPECTED SUITE ERROR]:', err);
    failedCount++;
  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
      console.log('CMS test server closed.');
    }
    await closePool();
  }

  console.log('\n===============================================================');
  console.log(`PHASE 11 CMS API TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('===============================================================');

  if (server) {
    server.close();
  }
  await closePool();
  process.exit(failedCount > 0 ? 1 : 0);
}

run();
