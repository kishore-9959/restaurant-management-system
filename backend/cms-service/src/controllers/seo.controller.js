/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SEO CONTROLLER
 * File: backend/cms-service/src/controllers/seo.controller.js
 * ============================================================================
 */

const { seoService } = require('../services');
const { successResponse, asyncHandler } = require('@rms/shared');

const getSEO = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const pageId = req.query.pageId ? parseInt(req.query.pageId, 10) : null;
  const pageSlug = req.query.slug || null;

  const seo = await seoService.getSEOSettings({ restaurantId, pageId, pageSlug });
  return successResponse(res, {
    statusCode: 200,
    message: 'SEO settings retrieved successfully',
    data: seo,
  });
});

const updateSEO = asyncHandler(async (req, res) => {
  const data = req.body;
  const updated = await seoService.updateSEOSettings(data);
  return successResponse(res, {
    statusCode: 200,
    message: 'SEO settings updated successfully',
    data: updated,
  });
});

module.exports = {
  getSEO,
  updateSEO,
};
