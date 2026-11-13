/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SHARED VALIDATORS
 * File: backend/shared/validators/index.js
 * Description: Common parameter validation helpers.
 * ============================================================================
 */

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const regex = /^\+?[0-9]{7,15}$/;
  return regex.test(phone.trim());
}

function isValidPin(pin) {
  if (!pin || typeof pin !== 'string') return false;
  return /^\d{4}$/.test(pin.trim());
}

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidPin,
};

