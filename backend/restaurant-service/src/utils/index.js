/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - RESTAURANT SERVICE UTILITIES
 * File: backend/restaurant-service/src/utils/index.js
 * ============================================================================
 */

const QRCode = require('qrcode');

/**
 * Generates base64 PNG data URL for a given QR string
 * @param {string} text - Payload to encode in the QR code
 * @param {object} [options] - Optional QRCode rendering options
 */
async function generateQrCodeDataUrl(text, options = {}) {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#1f2937',
        light: '#ffffff',
      },
      ...options,
    });
  } catch (error) {
    throw new Error(`Failed to generate QR Code: ${error.message}`);
  }
}

module.exports = {
  generateQrCodeDataUrl,
};
