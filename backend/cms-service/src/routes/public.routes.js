/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CMS PUBLIC ROUTES
 * File: backend/cms-service/src/routes/public.routes.js
 * Ingress Prefix: /api/v1/cms/public
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

const {
  getSettings,
} = require('../controllers/websiteSettings.controller');
const {
  getSEO,
} = require('../controllers/seo.controller');
const {
  getPublicPage,
} = require('../controllers/page.controller');
const {
  getActiveBanners,
} = require('../controllers/banner.controller');
const {
  getPublicNavigation,
} = require('../controllers/navigation.controller');
const {
  getPublicFooter,
} = require('../controllers/footer.controller');
const {
  getPublicFAQs,
} = require('../controllers/faq.controller');
const {
  getPublicTestimonials,
} = require('../controllers/testimonial.controller');
const {
  getPublicSocialLinks,
} = require('../controllers/socialMedia.controller');
const {
  submitContactMessage,
} = require('../controllers/contactMessage.controller');

const previewAuth = require('../middleware/previewAuth');
const { validateContactMessage } = require('../validators/cms.validators');

// Public Guest Endpoints
router.get('/settings', getSettings);
router.get('/seo', getSEO);
router.get('/pages/:slug', previewAuth, getPublicPage);
router.get('/banners', getActiveBanners);
router.get('/navigation', getPublicNavigation);
router.get('/footer', getPublicFooter);
router.get('/faqs', getPublicFAQs);
router.get('/testimonials', getPublicTestimonials);
router.get('/social-links', getPublicSocialLinks);
router.post('/contact', validateContactMessage, submitContactMessage);

module.exports = router;

