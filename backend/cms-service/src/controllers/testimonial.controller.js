/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - TESTIMONIALS CONTROLLER
 * File: backend/cms-service/src/controllers/testimonial.controller.js
 * ============================================================================
 */

const { testimonialService } = require('../services');
const { successResponse, asyncHandler } = require('@rms/shared');

const getPublicTestimonials = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const featuredOnly = req.query.featured === 'true' || req.query.featured === undefined;

  const testimonials = await testimonialService.getPublicTestimonials({ restaurantId, featuredOnly });
  return successResponse(res, {
    statusCode: 200,
    message: 'Public testimonials retrieved successfully',
    data: testimonials,
  });
});

const listTestimonials = asyncHandler(async (req, res) => {
  const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId, 10) : 1;
  const page = req.query.page ? parseInt(req.query.page, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;

  const result = await testimonialService.listTestimonials({ restaurantId, page, limit });
  return successResponse(res, {
    statusCode: 200,
    message: 'Testimonials retrieved successfully',
    data: result,
  });
});

const createTestimonial = asyncHandler(async (req, res) => {
  const testimonial = await testimonialService.createTestimonial(req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Testimonial created successfully',
    data: testimonial,
  });
});

const updateTestimonial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await testimonialService.updateTestimonial(parseInt(id, 10), req.body);
  return successResponse(res, {
    statusCode: 200,
    message: 'Testimonial updated successfully',
    data: updated,
  });
});

const deleteTestimonial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await testimonialService.deleteTestimonial(parseInt(id, 10));
  return successResponse(res, {
    statusCode: 200,
    message: 'Testimonial deleted successfully',
    data: result,
  });
});

module.exports = {
  getPublicTestimonials,
  listTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
};
