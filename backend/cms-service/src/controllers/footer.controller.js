/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - FOOTER CONTROLLER
 * File: backend/cms-service/src/controllers/footer.controller.js
 * ============================================================================
 */

const { footerService } = require('../services');
const { successResponse, asyncHandler } = require('@rms/shared');

const getPublicFooter = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const footer = await footerService.getPublicFooter(restaurantId);
  return successResponse(res, {
    statusCode: 200,
    message: 'Public footer retrieved successfully',
    data: footer,
  });
});

const listFooterSections = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const sections = await footerService.listFooterSections(restaurantId);
  return successResponse(res, {
    statusCode: 200,
    message: 'Footer sections retrieved successfully',
    data: sections,
  });
});

const createFooterSection = asyncHandler(async (req, res) => {
  const section = await footerService.createFooterSection(req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Footer section created successfully',
    data: section,
  });
});

const updateFooterSection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await footerService.updateFooterSection(parseInt(id, 10), req.body);
  return successResponse(res, {
    statusCode: 200,
    message: 'Footer section updated successfully',
    data: updated,
  });
});

const deleteFooterSection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await footerService.deleteFooterSection(parseInt(id, 10));
  return successResponse(res, {
    statusCode: 200,
    message: 'Footer section deleted successfully',
    data: result,
  });
});

module.exports = {
  getPublicFooter,
  listFooterSections,
  createFooterSection,
  updateFooterSection,
  deleteFooterSection,
};
