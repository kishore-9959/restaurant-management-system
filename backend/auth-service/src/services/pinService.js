/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/services/pinService.js
 * ============================================================================
 */

const { redisClient, createServiceLogger } = require('@rms/shared');
const { comparePin, hashPin } = require('../utils/passwordService');

const logger = createServiceLogger('auth-pin-service');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 120; // 2 minutes lockout

/**
 * Check if the user is currently locked out from PIN attempts
 */
async function checkLockout(userId) {
  const lockKey = `auth:pin:locked:${userId}`;
  try {
    const isLocked = await redisClient.get(lockKey);
    if (isLocked) {
      const ttl = await redisClient.ttl(lockKey);
      const error = new Error(`POS PIN login is locked due to too many failed attempts. Please retry in ${ttl > 0 ? ttl : LOCKOUT_SECONDS} seconds.`);
      error.statusCode = 423; // Locked
      error.code = 'PIN_LOCKED';
      error.retryAfter = ttl > 0 ? ttl : LOCKOUT_SECONDS;
      throw error;
    }
  } catch (err) {
    if (err.code === 'PIN_LOCKED') throw err;
    logger.warn('Failed to check PIN lockout in Redis:', err.message);
  }
}

/**
 * Record a failed PIN attempt; trigger 2-minute lockout on 5th consecutive failure
 */
async function recordFailedAttempt(userId) {
  const attemptKey = `auth:pin:attempts:${userId}`;
  const lockKey = `auth:pin:locked:${userId}`;

  try {
    const attempts = await redisClient.incr(attemptKey);
    // Set 2-minute TTL on attempt counter if first attempt
    if (attempts === 1) {
      await redisClient.expire(attemptKey, LOCKOUT_SECONDS);
    }

    logger.warn(`Failed PIN attempt ${attempts}/${MAX_FAILED_ATTEMPTS} for userId ${userId}`);

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      await redisClient.set(lockKey, '1', 'EX', LOCKOUT_SECONDS);
      await redisClient.del(attemptKey); // reset attempts after applying lock
      const error = new Error(`Too many consecutive failed PIN attempts. Account locked for 2 minutes.`);
      error.statusCode = 423;
      error.code = 'PIN_LOCKED';
      error.retryAfter = LOCKOUT_SECONDS;
      throw error;
    }

    const remaining = MAX_FAILED_ATTEMPTS - attempts;
    const error = new Error(`Invalid PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`);
    error.statusCode = 401;
    error.code = 'INVALID_PIN';
    error.remainingAttempts = remaining;
    throw error;
  } catch (err) {
    if (err.statusCode) throw err;
    logger.warn('Redis error during failed PIN recording:', err.message);
    const error = new Error('Invalid PIN.');
    error.statusCode = 401;
    error.code = 'INVALID_PIN';
    throw error;
  }
}

/**
 * Clear failed attempt count on successful login
 */
async function clearAttempts(userId) {
  try {
    await redisClient.del(`auth:pin:attempts:${userId}`);
    await redisClient.del(`auth:pin:locked:${userId}`);
  } catch (err) {
    logger.warn('Failed to clear PIN attempts in Redis:', err.message);
  }
}

/**
 * Verify employee PIN with lockout defense
 */
async function verifyPinAttempt(userId, plainPin, hashedPin) {
  // 1. Check lockout first
  await checkLockout(userId);

  // 2. Validate format (exactly 4 digits)
  if (!plainPin || !/^\d{4}$/.test(plainPin)) {
    const error = new Error('PIN must be exactly 4 digits');
    error.statusCode = 400;
    error.code = 'INVALID_PIN_FORMAT';
    throw error;
  }

  // 3. Compare PIN
  const isValid = await comparePin(plainPin, hashedPin);
  if (!isValid) {
    await recordFailedAttempt(userId);
  }

  // 4. Success -> clear failed attempts
  await clearAttempts(userId);
  return true;
}

module.exports = {
  checkLockout,
  recordFailedAttempt,
  clearAttempts,
  verifyPinAttempt,
  hashPin,
};

