/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PAGE CONTROLLER
 * File: backend/cms-service/src/controllers/page.controller.js
 * ============================================================================
 */

const { pageService } = require('../services');
const { successResponse, errorResponse, asyncHandler } = require('@rms/shared');

const getPublicPage = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const isPreview = Boolean(req.query.preview === 'true' && req.isPreviewAuthorized);

  const pageData = await pageService.getPublicPage(slug, isPreview);
  if (!pageData || !pageData.page) {
    return errorResponse(res, {
      statusCode: 404,
      code: 'PAGE_NOT_FOUND',
      message: `Page '${slug}' was not found or is unpublished.`,
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: 'Public page retrieved successfully',
    data: pageData,
  });
});

const listPages = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const status = req.query.status || null;
  const search = req.query.search || null;
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;

  const result = await pageService.listPages({ restaurantId, status, search, page, limit });
  return successResponse(res, {
    statusCode: 200,
    message: 'Pages retrieved successfully',
    data: result,
  });
});

const getPageById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pageData = await pageService.getPageById(parseInt(id, 10));

  if (!pageData || !pageData.page) {
    return errorResponse(res, {
      statusCode: 404,
      code: 'PAGE_NOT_FOUND',
      message: `Page with ID ${id} was not found.`,
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: 'Page retrieved successfully',
    data: pageData,
  });
});

const createPage = asyncHandler(async (req, res) => {
  const newPage = await pageService.createPage(req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Page created successfully',
    data: newPage,
  });
});

const updatePage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await pageService.updatePage(parseInt(id, 10), req.body);
  return successResponse(res, {
    statusCode: 200,
    message: 'Page updated successfully',
    data: updated,
  });
});

const publishPage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const published = await pageService.publishPage(parseInt(id, 10));
  return successResponse(res, {
    statusCode: 200,
    message: 'Page published successfully',
    data: published,
  });
});

const archivePage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const archived = await pageService.archivePage(parseInt(id, 10));
  return successResponse(res, {
    statusCode: 200,
    message: 'Page archived successfully',
    data: archived,
  });
});

const deletePage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user ? req.user.userId : null;
  const deleted = await pageService.deletePage(parseInt(id, 10), userId);
  return successResponse(res, {
    statusCode: 200,
    message: 'Page deleted successfully',
    data: deleted,
  });
});

module.exports = {
  getPublicPage,
  listPages,
  getPageById,
  createPage,
  updatePage,
  publishPage,
  archivePage,
  deletePage,
};
