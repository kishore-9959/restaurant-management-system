/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CMS SERVICES EXPORT
 * File: backend/cms-service/src/services/index.js
 * ============================================================================
 */

const websiteSettingsService = require('./websiteSettings.service');
const seoService = require('./seo.service');
const pageService = require('./page.service');
const sectionService = require('./section.service');
const bannerService = require('./banner.service');
const navigationService = require('./navigation.service');
const footerService = require('./footer.service');
const faqService = require('./faq.service');
const testimonialService = require('./testimonial.service');
const socialMediaService = require('./socialMedia.service');
const contactMessageService = require('./contactMessage.service');
const mediaService = require('./media.service');
const notificationClient = require('./notificationClient');

module.exports = {
  websiteSettingsService,
  seoService,
  pageService,
  sectionService,
  bannerService,
  navigationService,
  footerService,
  faqService,
  testimonialService,
  socialMediaService,
  contactMessageService,
  mediaService,
  notificationClient,
};

