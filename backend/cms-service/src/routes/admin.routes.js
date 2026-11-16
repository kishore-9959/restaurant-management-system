/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CMS ADMIN ROUTES
 * File: backend/cms-service/src/routes/admin.routes.js
 * Ingress Prefix: /api/v1/cms/admin
 * Protected by JWT Authentication and RBAC (SUPER_ADMIN, RESTAURANT_MANAGER)
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticationMiddleware, requireRoles } = require('@rms/shared');

// Controllers
const websiteSettingsController = require('../controllers/websiteSettings.controller');
const seoController = require('../controllers/seo.controller');
const pageController = require('../controllers/page.controller');
const sectionController = require('../controllers/section.controller');
const bannerController = require('../controllers/banner.controller');
const navigationController = require('../controllers/navigation.controller');
const footerController = require('../controllers/footer.controller');
const faqController = require('../controllers/faq.controller');
const testimonialController = require('../controllers/testimonial.controller');
const socialMediaController = require('../controllers/socialMedia.controller');
const contactMessageController = require('../controllers/contactMessage.controller');
const mediaController = require('../controllers/media.controller');

// Validators
const {
  validateWebsiteSettings,
  validateSEOSettings,
  validateCreatePage,
  validateCreateSection,
  validateCreateBanner,
  validateCreateNavigation,
  validateCreateFooter,
  validateCreateFAQ,
  validateTestimonial,
  validateSocialLink,
} = require('../validators/cms.validators');

// Enforce JWT Auth and RBAC across all administrative routes
router.use(authenticationMiddleware);
router.use(requireRoles('SUPER_ADMIN', 'RESTAURANT_MANAGER'));

// ----------------------------------------------------------------------------
// 1. Website Settings & Branding
// ----------------------------------------------------------------------------
router.get('/settings', websiteSettingsController.getSettings);
router.put('/settings', validateWebsiteSettings, websiteSettingsController.updateSettings);

// ----------------------------------------------------------------------------
// 2. SEO Settings
// ----------------------------------------------------------------------------
router.get('/seo', seoController.getSEO);
router.put('/seo', validateSEOSettings, seoController.updateSEO);

// ----------------------------------------------------------------------------
// 3. Website Pages
// ----------------------------------------------------------------------------
router.get('/pages', pageController.listPages);
router.get('/pages/:id', pageController.getPageById);
router.post('/pages', validateCreatePage, pageController.createPage);
router.put('/pages/:id', pageController.updatePage);
router.put('/pages/:id/publish', pageController.publishPage);
router.put('/pages/:id/archive', pageController.archivePage);
router.delete('/pages/:id', pageController.deletePage);

// ----------------------------------------------------------------------------
// 4. Page Sections (Component Registry)
// ----------------------------------------------------------------------------
router.post('/pages/:pageId/sections', validateCreateSection, sectionController.createSection);
router.put('/sections/:id', sectionController.updateSection);
router.put('/pages/:pageId/sections/reorder', sectionController.reorderSections);
router.delete('/sections/:id', sectionController.deleteSection);

// ----------------------------------------------------------------------------
// 5. Promotional Banners & Carousels
// ----------------------------------------------------------------------------
router.get('/banners', bannerController.listBanners);
router.post('/banners', validateCreateBanner, bannerController.createBanner);
router.put('/banners/:id', bannerController.updateBanner);
router.delete('/banners/:id', bannerController.deleteBanner);

// ----------------------------------------------------------------------------
// 6. Navigation Menus
// ----------------------------------------------------------------------------
router.get('/navigation', navigationController.listNavigationMenus);
router.post('/navigation', validateCreateNavigation, navigationController.createNavigationMenu);
router.put('/navigation/:id', navigationController.updateNavigationMenu);
router.delete('/navigation/:id', navigationController.deleteNavigationMenu);

// ----------------------------------------------------------------------------
// 7. Footer Sections
// ----------------------------------------------------------------------------
router.get('/footer', footerController.listFooterSections);
router.post('/footer', validateCreateFooter, footerController.createFooterSection);
router.put('/footer/:id', footerController.updateFooterSection);
router.delete('/footer/:id', footerController.deleteFooterSection);

// ----------------------------------------------------------------------------
// 8. FAQs
// ----------------------------------------------------------------------------
router.get('/faqs', faqController.listFAQs);
router.post('/faqs', validateCreateFAQ, faqController.createFAQ);
router.put('/faqs/:id', faqController.updateFAQ);
router.delete('/faqs/:id', faqController.deleteFAQ);

// ----------------------------------------------------------------------------
// 9. Testimonials & Reviews
// ----------------------------------------------------------------------------
router.get('/testimonials', testimonialController.listTestimonials);
router.post('/testimonials', validateTestimonial, testimonialController.createTestimonial);
router.put('/testimonials/:id', validateTestimonial, testimonialController.updateTestimonial);
router.delete('/testimonials/:id', testimonialController.deleteTestimonial);

// ----------------------------------------------------------------------------
// 10. Social Media Links
// ----------------------------------------------------------------------------
router.get('/social-links', socialMediaController.listSocialLinks);
router.post('/social-links', validateSocialLink, socialMediaController.saveSocialMediaLink);
router.delete('/social-links/:id', socialMediaController.deleteSocialMediaLink);

// ----------------------------------------------------------------------------
// 11. Contact Inquiries & Resolution
// ----------------------------------------------------------------------------
router.get('/contact', contactMessageController.listContactMessages);
router.get('/contact/:id', contactMessageController.getContactMessageById);
router.post('/contact/:id/reply', contactMessageController.replyContactMessage);

// ----------------------------------------------------------------------------
// 12. Media Management (Cloudinary direct uploads & deletion)
// ----------------------------------------------------------------------------
router.get('/media/sign', mediaController.getUploadSignature);
router.delete('/media', mediaController.deleteMedia);

module.exports = router;
