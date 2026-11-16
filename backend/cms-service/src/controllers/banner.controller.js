/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - BANNERS CONTROLLER
 * File: backend/cms-service/src/controllers/banner.controller.js
 * ============================================================================
 */

const { bannerService } = require('../services');
const { successResponse, asyncHandler } = require('@rms/shared');

const getActiveBanners = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : null;
  const bannerLocation = req.query.location || 'HOME_HERO';

  const banners = await bannerService.getActiveBanners({ restaurantId, branchId, bannerLocation });
  return successResponse(res, {
    statusCode: 200,
    message: 'Active banners retrieved successfully',
    data: banners,
  });
});

const listBanners = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const bannerLocation = req.query.location || null;
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;

  const result = await bannerService.listBanners({ restaurantId, bannerLocation, page, limit });
  return successResponse(res, {
    statusCode: 200,
    message: 'Banners retrieved successfully',
    data: result,
  });
});

const createBanner = asyncHandler(async (req, res) => {
  const banner = await bannerService.createBanner(req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Banner created successfully',
    data: banner,
  });
});

const updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await bannerService.updateBanner(parseInt(id, 10), req.body);
  return successResponse(res, {
    statusCode: 200,
    message: 'Banner updated successfully',
    data: updated,
  });
});

const deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await bannerService.deleteBanner(parseInt(id, 10));
  return successResponse(res, {
    statusCode: 200,
    message: 'Banner deleted successfully',
    data: result,
  });
});

module.exports = {
  getActiveBanners,
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};
