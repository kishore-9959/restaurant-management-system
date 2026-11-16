/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MEDIA CONTROLLER
 * File: backend/cms-service/src/controllers/media.controller.js
 * ============================================================================
 */

const { mediaService } = require('../services');
const { successResponse, asyncHandler } = require('@rms/shared');

const getUploadSignature = asyncHandler(async (req, res) => {
  const folder = req.query.folder || 'rms/cms';
  const tags = req.query.tags || 'cms';
  const signData = mediaService.getUploadSignature(folder, tags);
  return successResponse(res, {
    statusCode: 200,
    message: 'Upload signature generated successfully',
    data: signData,
  });
});

const deleteMedia = asyncHandler(async (req, res) => {
  const { publicId } = req.body;
  const result = await mediaService.deleteMedia(publicId);
  return successResponse(res, {
    statusCode: 200,
    message: 'Media asset deletion completed',
    data: result,
  });
});

module.exports = {
  getUploadSignature,
  deleteMedia,
};
