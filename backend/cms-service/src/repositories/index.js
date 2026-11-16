/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CMS REPOSITORIES EXPORT
 * File: backend/cms-service/src/repositories/index.js
 * ============================================================================
 */

const websiteSettingsRepository = require('./websiteSettings.repository');
const seoRepository = require('./seo.repository');
const pageRepository = require('./page.repository');
const sectionRepository = require('./section.repository');
const bannerRepository = require('./banner.repository');
const navigationRepository = require('./navigation.repository');
const footerRepository = require('./footer.repository');
const faqRepository = require('./faq.repository');
const testimonialRepository = require('./testimonial.repository');
const socialMediaRepository = require('./socialMedia.repository');
const contactMessageRepository = require('./contactMessage.repository');

module.exports = {
  websiteSettingsRepository,
  seoRepository,
  pageRepository,
  sectionRepository,
  bannerRepository,
  navigationRepository,
  footerRepository,
  faqRepository,
  testimonialRepository,
  socialMediaRepository,
  contactMessageRepository,
};
