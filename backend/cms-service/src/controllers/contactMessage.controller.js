/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CONTACT MESSAGE CONTROLLER
 * File: backend/cms-service/src/controllers/contactMessage.controller.js
 * ============================================================================
 */

const { contactMessageService } = require('../services');
const { successResponse, errorResponse, asyncHandler } = require('@rms/shared');

const submitContactMessage = asyncHandler(async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || null;
  const message = await contactMessageService.submitContactMessage(req.body, correlationId);
  return successResponse(res, {
    statusCode: 201,
    message: 'Thank you! Your message has been received and our team will get back to you shortly.',
    data: message,
  });
});

const listContactMessages = asyncHandler(async (req, res) => {
  const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : null;
  const status = req.query.status || null;
  const inquiryType = req.query.inquiryType || null;
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;

  const result = await contactMessageService.listContactMessages({ branchId, status, inquiryType, page, limit });
  return successResponse(res, {
    statusCode: 200,
    message: 'Contact inquiries retrieved successfully',
    data: result,
  });
});

const getContactMessageById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const message = await contactMessageService.getContactMessageById(parseInt(id, 10));

  if (!message) {
    return errorResponse(res, {
      statusCode: 404,
      code: 'MESSAGE_NOT_FOUND',
      message: `Contact message #${id} was not found.`,
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: 'Contact inquiry details retrieved successfully',
    data: message,
  });
});

const replyContactMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { adminReplyNotes } = req.body;
  const repliedByUserId = req.user ? req.user.userId : 1;

  if (!adminReplyNotes || !adminReplyNotes.trim()) {
    return errorResponse(res, {
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'adminReplyNotes is required.',
    });
  }

  const replied = await contactMessageService.replyContactMessage({
    messageId: parseInt(id, 10),
    adminReplyNotes,
    repliedByUserId,
  });

  return successResponse(res, {
    statusCode: 200,
    message: 'Inquiry replied and resolved successfully',
    data: replied,
  });
});

module.exports = {
  submitContactMessage,
  listContactMessages,
  getContactMessageById,
  replyContactMessage,
};
