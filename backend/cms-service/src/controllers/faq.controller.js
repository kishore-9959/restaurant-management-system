/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - FAQS CONTROLLER
 * File: backend/cms-service/src/controllers/faq.controller.js
 * ============================================================================
 */

const { faqService } = require('../services');
const { successResponse, asyncHandler } = require('@rms/shared');

const getPublicFAQs = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const category = req.query.category || null;

  const faqs = await faqService.getPublicFAQs({ restaurantId, category });
  return successResponse(res, {
    statusCode: 200,
    message: 'Public FAQs retrieved successfully',
    data: faqs,
  });
});

const listFAQs = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const category = req.query.category || null;
  const search = req.query.search || null;

  const faqs = await faqService.listFAQs({ restaurantId, category, search });
  return successResponse(res, {
    statusCode: 200,
    message: 'FAQs retrieved successfully',
    data: faqs,
  });
});

const createFAQ = asyncHandler(async (req, res) => {
  const faq = await faqService.createFAQ(req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'FAQ created successfully',
    data: faq,
  });
});

const updateFAQ = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await faqService.updateFAQ(parseInt(id, 10), req.body);
  return successResponse(res, {
    statusCode: 200,
    message: 'FAQ updated successfully',
    data: updated,
  });
});

const deleteFAQ = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await faqService.deleteFAQ(parseInt(id, 10));
  return successResponse(res, {
    statusCode: 200,
    message: 'FAQ deleted successfully',
    data: result,
  });
});

module.exports = {
  getPublicFAQs,
  listFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
};
