/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - TESTIMONIALS REPOSITORY
 * File: backend/cms-service/src/repositories/testimonial.repository.js
 * Description: 100% Parameterized Stored Procedure execution for Testimonials.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class TestimonialRepository {
  async getPublicTestimonials({ restaurantId = 1, featuredOnly = true }) {
    const result = await executeProcedure('dbo.usp_CMS_GetPublicTestimonials', {
      RestaurantId: { type: sql.Int, value: restaurantId },
      FeaturedOnly: { type: sql.Bit, value: Boolean(featuredOnly) },
    });
    return result.recordset || [];
  }

  async listTestimonials({ restaurantId = 1, page = 1, limit = 20 }) {
    const result = await executeProcedure('dbo.usp_CMS_ListTestimonials', {
      RestaurantId: { type: sql.Int, value: restaurantId },
      Page: { type: sql.Int, value: page },
      Limit: { type: sql.Int, value: limit },
    });

    const totalCount = result.recordsets[0] && result.recordsets[0][0] ? result.recordsets[0][0].TotalCount : 0;
    const testimonials = result.recordsets[1] || [];

    return {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      testimonials,
    };
  }

  async createTestimonial(data) {
    const result = await executeProcedure(
      'dbo.usp_CMS_CreateTestimonial',
      {
        RestaurantId: { type: sql.Int, value: data.restaurantId || 1 },
        AuthorName: { type: sql.NVarChar(100), value: data.authorName },
        AuthorRole: { type: sql.NVarChar(80), value: data.authorRole || null },
        AuthorAvatarUrl: { type: sql.NVarChar(500), value: data.authorAvatarUrl || null },
        AuthorAvatarPublicId: { type: sql.NVarChar(150), value: data.authorAvatarPublicId || null },
        Rating: { type: sql.Int, value: data.rating !== undefined ? data.rating : 5 },
        ReviewContent: { type: sql.NVarChar(1000), value: data.reviewContent },
        SourcePlatform: { type: sql.NVarChar(50), value: data.sourcePlatform || 'GOOGLE' },
        IsFeatured: { type: sql.Bit, value: data.isFeatured !== undefined ? Boolean(data.isFeatured) : true },
        DisplayOrder: { type: sql.Int, value: data.displayOrder || 0 },
        IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
      },
      {
        NewTestimonialId: sql.BigInt,
      }
    );

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async updateTestimonial(testimonialId, data) {
    const result = await executeProcedure('dbo.usp_CMS_UpdateTestimonial', {
      TestimonialId: { type: sql.BigInt, value: testimonialId },
      AuthorName: { type: sql.NVarChar(100), value: data.authorName },
      AuthorRole: { type: sql.NVarChar(80), value: data.authorRole || null },
      AuthorAvatarUrl: { type: sql.NVarChar(500), value: data.authorAvatarUrl || null },
      AuthorAvatarPublicId: { type: sql.NVarChar(150), value: data.authorAvatarPublicId || null },
      Rating: { type: sql.Int, value: data.rating !== undefined ? data.rating : 5 },
      ReviewContent: { type: sql.NVarChar(1000), value: data.reviewContent },
      SourcePlatform: { type: sql.NVarChar(50), value: data.sourcePlatform || null },
      IsFeatured: { type: sql.Bit, value: data.isFeatured !== undefined ? Boolean(data.isFeatured) : true },
      DisplayOrder: { type: sql.Int, value: data.displayOrder !== undefined ? data.displayOrder : 0 },
      IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
    });

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async deleteTestimonial(testimonialId) {
    const result = await executeProcedure('dbo.usp_CMS_DeleteTestimonial', {
      TestimonialId: { type: sql.BigInt, value: testimonialId },
    });
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }
}

module.exports = new TestimonialRepository();

