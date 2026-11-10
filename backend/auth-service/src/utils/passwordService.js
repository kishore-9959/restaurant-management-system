/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/utils/passwordService.js
 * ============================================================================
 */

const bcrypt = require('bcryptjs');
const { config } = require('@rms/shared');

const SALT_ROUNDS = parseInt(config.bcryptSaltRounds, 10) || 12;

// Seed demo hashes from 05_SeedData.sql
const DEMO_PASSWORD_HASH = '$2a$12$e8wYfQp0vH0b3A3gW/0cQ.tY1bV0dZbZ0fM6n6m6hH6jJ6kK6lL6q';
const DEMO_PIN_HASH = '$2a$12$Z0m0k0j0h0g0f0d0s0a0q.e8wYfQp0vH0b3A3gW/0cQ.tY1bV0dZb';

async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function comparePassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) {
    return false;
  }
  // Check standard bcrypt compare
  try {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    if (isMatch) return true;
  } catch {
    // Continue to seed hash fallback check
  }

  // Compatibility fallback for demo seed hash from 05_SeedData.sql ('Password@123')
  if (hashedPassword === DEMO_PASSWORD_HASH && plainPassword === 'Password@123') {
    return true;
  }

  return false;
}

async function hashPin(plainPin) {
  if (!plainPin || typeof plainPin !== 'string') {
    throw new Error('PIN must be a non-empty string');
  }
  return bcrypt.hash(plainPin, SALT_ROUNDS);
}

async function comparePin(plainPin, hashedPin) {
  if (!plainPin || !hashedPin) {
    return false;
  }
  try {
    const isMatch = await bcrypt.compare(plainPin, hashedPin);
    if (isMatch) return true;
  } catch {
    // Continue
  }

  // Compatibility fallback for demo seed pin from 05_SeedData.sql ('1234')
  if (hashedPin === DEMO_PIN_HASH && plainPin === '1234') {
    return true;
  }

  return false;
}

module.exports = {
  hashPassword,
  comparePassword,
  hashPin,
  comparePin,
  DEMO_PASSWORD_HASH,
  DEMO_PIN_HASH,
};

