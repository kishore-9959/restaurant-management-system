/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PAGE SECTION CONTROLLER
 * File: backend/cms-service/src/controllers/section.controller.js
 * ============================================================================
 */

const { sectionService } = require('../services');
const { successResponse, asyncHandler } = require('@rms/shared');

const createSection = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const data = {
    ...req.body,
    pageId: parseInt(pageId, 10),
  };
  const section = await sectionService.createSection(data);
  return successResponse(res, {
    statusCode: 201,
    message: 'Page section created successfully',
    data: section,
  });
});

const updateSection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await sectionService.updateSection(parseInt(id, 10), req.body);
  return successResponse(res, {
    statusCode: 200,
    message: 'Page section updated successfully',
    data: updated,
  });
});

const reorderSections = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { sectionsOrder } = req.body;
  const sections = await sectionService.reorderSections(parseInt(pageId, 10), sectionsOrder);
  return successResponse(res, {
    statusCode: 200,
    message: 'Page sections reordered successfully',
    data: sections,
  });
});

const deleteSection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await sectionService.deleteSection(parseInt(id, 10));
  return successResponse(res, {
    statusCode: 200,
    message: 'Page section deleted successfully',
    data: result,
  });
});

module.exports = {
  createSection,
  updateSection,
  reorderSections,
  deleteSection,
};
