/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH SERVICE
 * File: backend/auth-service/src/controllers/authController.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const authService = require('../services/authService');
const {
  validateRegister,
  validateLogin,
  validatePosPinLogin,
  validateRefreshToken,
} = require('../validators/authValidators');

async function register(req, res) {
  try {
    const { isValid, errors } = validateRegister(req.body);
    if (!isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid registration parameters.',
        details: errors,
      });
    }

    const result = await authService.registerCustomer(req.body);
    return successResponse(res, {
      statusCode: 201,
      message: 'Customer registered successfully.',
      data: result,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'REGISTRATION_ERROR',
      message: err.message,
    });
  }
}

async function login(req, res) {
  try {
    const { isValid, errors } = validateLogin(req.body);
    if (!isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid login parameters.',
        details: errors,
      });
    }

    const { emailOrPhone, password } = req.body;
    const result = await authService.login(emailOrPhone, password);
    return successResponse(res, {
      statusCode: 200,
      message: 'Logged in successfully.',
      data: result,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'LOGIN_ERROR',
      message: err.message,
    });
  }
}

async function staffLogin(req, res) {
  try {
    const { isValid, errors } = validateLogin(req.body);
    if (!isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid staff login parameters.',
        details: errors,
      });
    }

    const { emailOrPhone, password } = req.body;
    const result = await authService.staffLogin(emailOrPhone, password);
    return successResponse(res, {
      statusCode: 200,
      message: 'Staff authenticated successfully.',
      data: result,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'STAFF_LOGIN_ERROR',
      message: err.message,
    });
  }
}

async function posPinLogin(req, res) {
  try {
    const { isValid, errors } = validatePosPinLogin(req.body);
    if (!isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid POS PIN login parameters.',
        details: errors,
      });
    }

    const result = await authService.posPinLogin(req.body);
    return successResponse(res, {
      statusCode: 200,
      message: 'POS PIN authenticated successfully.',
      data: result,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'POS_LOGIN_ERROR',
      message: err.message,
      details: err.retryAfter ? { retryAfterSeconds: err.retryAfter } : undefined,
    });
  }
}

async function refreshToken(req, res) {
  try {
    const { isValid, errors } = validateRefreshToken(req.body);
    if (!isValid) {
      return errorResponse(res, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid refresh token parameters.',
        details: errors,
      });
    }

    const tokens = await authService.refreshToken(req.body.refreshToken);
    return successResponse(res, {
      statusCode: 200,
      message: 'Tokens refreshed successfully.',
      data: tokens,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'REFRESH_ERROR',
      message: err.message,
    });
  }
}

async function logout(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const { refreshToken: refToken } = req.body || {};

    const result = await authService.logout({ accessToken, refreshToken: refToken });
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
      data: null,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'LOGOUT_ERROR',
      message: err.message,
    });
  }
}

async function getMyRoles(req, res) {
  try {
    const { userId } = req.user;
    const data = await authService.getUserRolesAndPermissions(userId);
    return successResponse(res, {
      statusCode: 200,
      message: 'Roles and permissions retrieved successfully.',
      data,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'ROLES_FETCH_ERROR',
      message: err.message,
    });
  }
}

module.exports = {
  register,
  login,
  staffLogin,
  posPinLogin,
  refreshToken,
  logout,
  getMyRoles,
};

