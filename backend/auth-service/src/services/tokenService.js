/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/services/tokenService.js
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { config, redisClient, createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('auth-token-service');

const ACCESS_SECRET = config.jwtAccessSecret;
const REFRESH_SECRET = config.jwtRefreshSecret;
const ACCESS_EXPIRY = config.jwtAccessExpiry || '15m';
const REFRESH_EXPIRY = config.jwtRefreshExpiry || '7d';

// Seconds helper
function parseExpirySeconds(expiryStr) {
  if (typeof expiryStr === 'number') return expiryStr;
  const match = String(expiryStr).match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return val;
    case 'm': return val * 60;
    case 'h': return val * 3600;
    case 'd': return val * 86400;
    default: return 900;
  }
}

const REFRESH_TTL_SEC = parseExpirySeconds(REFRESH_EXPIRY);
const ACCESS_TTL_SEC = parseExpirySeconds(ACCESS_EXPIRY);

/**
 * Generate Access and Refresh token pair
 */
async function generateTokenPair(user, roles = [], permissions = []) {
  const accessJti = uuidv4();
  const refreshJti = uuidv4();

  const accessPayload = {
    sub: String(user.userId),
    userId: user.userId,
    email: user.email || null,
    phoneNumber: user.phoneNumber,
    userType: user.userType,
    branchId: user.branchId || null,
    roles,
    permissions,
    jti: accessJti,
  };

  const refreshPayload = {
    sub: String(user.userId),
    userId: user.userId,
    jti: refreshJti,
    type: 'refresh',
  };

  const accessToken = jwt.sign(accessPayload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY,
    issuer: 'rms-auth-service',
    audience: 'rms-client',
  });

  const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY,
    issuer: 'rms-auth-service',
    audience: 'rms-client',
  });

  // Store active refresh token in Redis
  try {
    const key = `auth:refresh:${refreshJti}`;
    await redisClient.set(key, JSON.stringify({
      userId: user.userId,
      roles,
      permissions,
      createdAt: new Date().toISOString(),
    }), 'EX', REFRESH_TTL_SEC);
  } catch (err) {
    logger.warn('Failed to cache refresh token in Redis:', err.message);
  }

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TTL_SEC,
    tokenType: 'Bearer',
  };
}

/**
 * Rotate Refresh Token with Reuse Detection
 */
async function rotateRefreshToken(tokenString) {
  let decoded;
  try {
    decoded = jwt.verify(tokenString, REFRESH_SECRET, {
      issuer: 'rms-auth-service',
      audience: 'rms-client',
    });
  } catch (err) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    error.code = 'INVALID_REFRESH_TOKEN';
    throw error;
  }

  if (decoded.type !== 'refresh' || !decoded.jti) {
    const error = new Error('Malformed refresh token');
    error.statusCode = 401;
    error.code = 'INVALID_REFRESH_TOKEN';
    throw error;
  }

  const { jti, userId } = decoded;
  const activeKey = `auth:refresh:${jti}`;
  const usedKey = `auth:refresh:used:${jti}`;

  // Check if token was already used (Reuse Detection!)
  try {
    const wasUsed = await redisClient.get(usedKey);
    if (wasUsed) {
      logger.error(`REFRESH TOKEN REUSE DETECTED for userId ${userId}! Revoking all sessions.`);
      // Security measure: Invalidate all refresh tokens for this user
      const keys = await redisClient.keys(`auth:refresh:*`);
      for (const k of keys) {
        if (!k.includes(':used:')) {
          const val = await redisClient.get(k);
          if (val) {
            try {
              const parsed = JSON.parse(val);
              if (String(parsed.userId) === String(userId)) {
                await redisClient.del(k);
              }
            } catch {
              // ignore
            }
          }
        }
      }
      const error = new Error('Token reuse detected. All sessions revoked for security.');
      error.statusCode = 403;
      error.code = 'TOKEN_REUSE_DETECTED';
      throw error;
    }
  } catch (err) {
    if (err.code === 'TOKEN_REUSE_DETECTED') throw err;
  }

  // Check active key in Redis
  let sessionData = null;
  try {
    const raw = await redisClient.get(activeKey);
    if (raw) {
      sessionData = JSON.parse(raw);
    }
  } catch (err) {
    logger.warn('Redis read failed during refresh rotation:', err.message);
  }

  // Delete active token and mark as used for reuse detection
  try {
    await redisClient.del(activeKey);
    await redisClient.set(usedKey, '1', 'EX', 86400); // 24hr reuse detection window
  } catch (err) {
    logger.warn('Redis write failed during refresh rotation:', err.message);
  }

  return {
    userId,
    sessionData,
  };
}

/**
 * Revoke tokens upon logout
 */
async function revokeTokens({ accessToken, refreshToken }) {
  if (refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken);
      if (decoded && decoded.jti) {
        await redisClient.del(`auth:refresh:${decoded.jti}`);
      }
    } catch {
      // Ignore
    }
  }

  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken);
      if (decoded && decoded.jti) {
        const exp = decoded.exp || Math.floor(Date.now() / 1000) + ACCESS_TTL_SEC;
        const ttl = Math.max(1, exp - Math.floor(Date.now() / 1000));
        await redisClient.set(`auth:revoked:${decoded.jti}`, '1', 'EX', ttl);
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * Check if access token is revoked in Redis
 */
async function isTokenRevoked(jti) {
  if (!jti) return false;
  try {
    const isRevoked = await redisClient.get(`auth:revoked:${jti}`);
    return Boolean(isRevoked);
  } catch (err) {
    logger.warn('Failed to query token revocation status in Redis:', err.message);
    return false;
  }
}

/**
 * Verify Access Token
 */
function verifyAccessToken(tokenString) {
  return jwt.verify(tokenString, ACCESS_SECRET, {
    issuer: 'rms-auth-service',
    audience: 'rms-client',
  });
}

module.exports = {
  generateTokenPair,
  rotateRefreshToken,
  revokeTokens,
  isTokenRevoked,
  verifyAccessToken,
};

