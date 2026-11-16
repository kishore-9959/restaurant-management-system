/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CLOUDINARY CONFIGURATION & UTILITY
 * File: backend/cms-service/src/config/cloudinary.js
 * Description: Cloudinary v2 signed upload parameter generator and media utility.
 * ============================================================================
 */

const cloudinary = require('cloudinary').v2;
const { config, createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('cms-cloudinary');

// Configure Cloudinary from shared environment
if (config.cloudinary && config.cloudinary.cloudName) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

/**
 * Generate secure signed upload parameters for client-side Direct Uploads.
 * Never exposes Cloudinary API Secret to browser/frontend.
 */
function generateUploadSignature(folder = 'rms/cms', tags = 'cms') {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const paramsToSign = {
    folder,
    tags,
    timestamp,
  };

  const signature = config.cloudinary && config.cloudinary.apiSecret
    ? cloudinary.utils.api_sign_request(paramsToSign, config.cloudinary.apiSecret)
    : 'mock_signature_test_env';

  return {
    signature,
    timestamp,
    apiKey: (config.cloudinary && config.cloudinary.apiKey) || 'mock_api_key',
    cloudName: (config.cloudinary && config.cloudinary.cloudName) || 'mock_cloud',
    folder,
    tags,
  };
}

/**
 * Delete an asset from Cloudinary by public ID.
 */
async function deleteAsset(publicId, resourceType = 'image') {
  try {
    if (!publicId) return { result: 'not_found' };
    if (!config.cloudinary || !config.cloudinary.apiSecret) {
      logger.info(`[MOCK CLOUDINARY] Deleting asset ${publicId}`);
      return { result: 'ok' };
    }
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return res;
  } catch (err) {
    logger.warn(`Failed to destroy Cloudinary asset ${publicId}:`, err.message);
    return { result: 'error', error: err.message };
  }
}

module.exports = {
  cloudinary,
  generateUploadSignature,
  deleteAsset,
};

