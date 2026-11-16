/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SOCIAL MEDIA CONTROLLER
 * File: backend/cms-service/src/controllers/socialMedia.controller.js
 * ============================================================================
 */

const { socialMediaService } = require('../services');
const { successResponse, asyncHandler } = require('@rms/shared');

const getPublicSocialLinks = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const links = await socialMediaService.getPublicSocialLinks(restaurantId);
  return successResponse(res, {
    statusCode: 200,
    message: 'Public social media links retrieved successfully',
    data: links,
  });
});

const listSocialLinks = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const activeOnly = req.query.activeOnly === 'true';
  const links = await socialMediaService.listSocialLinks({ restaurantId, activeOnly });
  return successResponse(res, {
    statusCode: 200,
    message: 'Social media links retrieved successfully',
    data: links,
  });
});

const saveSocialMediaLink = asyncHandler(async (req, res) => {
  const link = await socialMediaService.saveSocialMediaLink(req.body);
  return successResponse(res, {
    statusCode: 200,
    message: 'Social media link saved successfully',
    data: link,
  });
});

const deleteSocialMediaLink = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await socialMediaService.deleteSocialMediaLink(parseInt(id, 10));
  return successResponse(res, {
    statusCode: 200,
    message: 'Social media link deleted successfully',
    data: result,
  });
});

module.exports = {
  getPublicSocialLinks,
  listSocialLinks,
  saveSocialMediaLink,
  deleteSocialMediaLink,
};
