/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/validators/authValidators.js
 * ============================================================================
 */

function validateRegister(body) {
  const errors = [];
  const { firstName, lastName, email, phoneNumber, password } = body || {};

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
    errors.push('firstName is required and must be a non-empty string');
  }

  if (lastName && typeof lastName !== 'string') {
    errors.push('lastName must be a string');
  }

  if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim().length < 8) {
    errors.push('phoneNumber is required and must contain at least 8 characters');
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('email must be a valid email address format');
    }
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('password is required and must be at least 8 characters long');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateLogin(body) {
  const errors = [];
  const { emailOrPhone, password } = body || {};

  if (!emailOrPhone || typeof emailOrPhone !== 'string' || emailOrPhone.trim().length === 0) {
    errors.push('emailOrPhone is required');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('password is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validatePosPinLogin(body) {
  const errors = [];
  const { employeeCode, pin, branchId } = body || {};

  if (!employeeCode || typeof employeeCode !== 'string' || employeeCode.trim().length === 0) {
    errors.push('employeeCode is required');
  }

  if (!pin || !/^\d{4}$/.test(String(pin))) {
    errors.push('pin is required and must be exactly 4 digits');
  }

  if (branchId === undefined || branchId === null || isNaN(parseInt(branchId, 10))) {
    errors.push('branchId is required and must be a valid integer');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateRefreshToken(body) {
  const errors = [];
  const { refreshToken } = body || {};

  if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
    errors.push('refreshToken is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateRegister,
  validateLogin,
  validatePosPinLogin,
  validateRefreshToken,
};

