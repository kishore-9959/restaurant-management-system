/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/controllers/customerController.js
 * ============================================================================
 */

const { successResponse, errorResponse } = require('@rms/shared');
const customerService = require('../services/customerService');

function getReqMetadata(req) {
  return {
    ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

async function getProfile(req, res) {
  try {
    const userId = req.user.userId;
    const profile = await customerService.getProfile(userId);
    return successResponse(res, {
      statusCode: 200,
      message: 'Profile retrieved successfully.',
      data: profile,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'PROFILE_FETCH_ERROR',
      message: err.message,
    });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const updated = await customerService.updateProfile(userId, req.body, getReqMetadata(req));
    return successResponse(res, {
      statusCode: 200,
      message: 'Profile updated successfully.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'PROFILE_UPDATE_ERROR',
      message: err.message,
    });
  }
}

async function getAddresses(req, res) {
  try {
    const userId = req.user.userId;
    const addresses = await customerService.getAddresses(userId);
    return successResponse(res, {
      statusCode: 200,
      message: 'Customer addresses retrieved successfully.',
      data: addresses,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'ADDRESS_FETCH_ERROR',
      message: err.message,
    });
  }
}

async function createAddress(req, res) {
  try {
    const userId = req.user.userId;
    const address = await customerService.createAddress(userId, req.body, getReqMetadata(req));
    return successResponse(res, {
      statusCode: 201,
      message: 'Delivery address created successfully.',
      data: address,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'ADDRESS_CREATE_ERROR',
      message: err.message,
    });
  }
}

async function updateAddress(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const updated = await customerService.updateAddress(userId, id, req.body, getReqMetadata(req));
    return successResponse(res, {
      statusCode: 200,
      message: 'Delivery address updated successfully.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'ADDRESS_UPDATE_ERROR',
      message: err.message,
    });
  }
}

async function deleteAddress(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const result = await customerService.deleteAddress(userId, id, getReqMetadata(req));
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
      data: null,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'ADDRESS_DELETE_ERROR',
      message: err.message,
    });
  }
}

async function setDefaultAddress(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const updated = await customerService.setDefaultAddress(userId, id, getReqMetadata(req));
    return successResponse(res, {
      statusCode: 200,
      message: 'Default delivery address updated successfully.',
      data: updated,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      code: err.code || 'ADDRESS_SET_DEFAULT_ERROR',
      message: err.message,
    });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};

