/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CMS INPUT VALIDATORS
 * File: backend/cms-service/src/validators/cms.validators.js
 * Description: Request body and parameter sanitization and validation.
 * ============================================================================
 */

const { errorResponse } = require('@rms/shared');

function validateBody(requiredFields) {
  return (req, res, next) => {
    const missing = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: `Missing or empty required field(s): ${missing.join(', ')}`,
        errors: missing.map(f => ({ field: f, message: `${f} is required` })),
      });
    }

    next();
  };
}

const validateWebsiteSettings = validateBody(['siteTitle', 'contactEmail', 'contactPhone', 'addressLine']);
const validateSEOSettings = validateBody(['metaTitle', 'metaDescription']);
const validateCreatePage = validateBody(['pageTitle', 'pageSlug']);
const validateCreateSection = validateBody(['sectionKey', 'componentType']);
const validateCreateBanner = validateBody(['bannerTitle', 'imageUrl']);
const validateCreateNavigation = validateBody(['title', 'targetUrl']);
const validateCreateFooter = validateBody(['sectionTitle']);
const validateCreateFAQ = validateBody(['question', 'answer']);

function validateTestimonial(req, res, next) {
  const { authorName, reviewContent, rating } = req.body;
  if (!authorName || !authorName.trim()) {
    return errorResponse(res, { statusCode: 400, code: 'VALIDATION_FAILED', message: 'authorName is required' });
  }
  if (!reviewContent || !reviewContent.trim()) {
    return errorResponse(res, { statusCode: 400, code: 'VALIDATION_FAILED', message: 'reviewContent is required' });
  }
  if (rating !== undefined) {
    const r = parseInt(rating, 10);
    if (isNaN(r) || r < 1 || r > 5) {
      return errorResponse(res, { statusCode: 400, code: 'VALIDATION_FAILED', message: 'Rating must be an integer between 1 and 5' });
    }
  }
  next();
}

const validateSocialLink = validateBody(['platformName', 'platformUrl', 'iconKey']);

function validateContactMessage(req, res, next) {
  const { senderName, senderEmail, subject, messageBody } = req.body;
  if (!senderName || !senderName.trim()) {
    return errorResponse(res, { statusCode: 400, code: 'VALIDATION_FAILED', message: 'senderName is required' });
  }
  if (!senderEmail || !senderEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
    return errorResponse(res, { statusCode: 400, code: 'VALIDATION_FAILED', message: 'Valid senderEmail is required' });
  }
  if (!subject || !subject.trim()) {
    return errorResponse(res, { statusCode: 400, code: 'VALIDATION_FAILED', message: 'subject is required' });
  }
  if (!messageBody || !messageBody.trim()) {
    return errorResponse(res, { statusCode: 400, code: 'VALIDATION_FAILED', message: 'messageBody is required' });
  }
  next();
}

module.exports = {
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
  validateContactMessage,
};

