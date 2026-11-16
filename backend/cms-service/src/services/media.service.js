/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MEDIA SERVICE
 * File: backend/cms-service/src/services/media.service.js
 * ============================================================================
 */

const { generateUploadSignature, deleteAsset } = require('../config/cloudinary');

class MediaService {
  getUploadSignature(folder = 'rms/cms', tags = 'cms') {
    return generateUploadSignature(folder, tags);
  }

  async deleteMedia(publicId, resourceType = 'image') {
    return deleteAsset(publicId, resourceType);
  }
}

module.exports = new MediaService();

