/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - FAQS REPOSITORY
 * File: backend/cms-service/src/repositories/faq.repository.js
 * Description: 100% Parameterized Stored Procedure execution for FAQs.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class FAQRepository {
  async getPublicFAQs({ restaurantId = 1, category = null }) {
    const result = await executeProcedure('dbo.usp_CMS_GetPublicFAQs', {
      RestaurantId: { type: sql.Int, value: restaurantId },
      Category: { type: sql.NVarChar(60), value: category || null },
    });
    return result.recordset || [];
  }

  async listFAQs({ restaurantId = 1, category = null, search = null }) {
    const result = await executeProcedure('dbo.usp_CMS_ListFAQs', {
      RestaurantId: { type: sql.Int, value: restaurantId },
      Category: { type: sql.NVarChar(60), value: category || null },
      Search: { type: sql.NVarChar(100), value: search || null },
    });
    return result.recordset || [];
  }

  async createFAQ(data) {
    const result = await executeProcedure(
      'dbo.usp_CMS_CreateFAQ',
      {
        RestaurantId: { type: sql.Int, value: data.restaurantId || 1 },
        Category: { type: sql.NVarChar(60), value: data.category || 'GENERAL' },
        Question: { type: sql.NVarChar(300), value: data.question },
        Answer: { type: sql.NVarChar(sql.MAX), value: data.answer },
        DisplayOrder: { type: sql.Int, value: data.displayOrder || 0 },
        IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
      },
      {
        NewFAQId: sql.Int,
      }
    );

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async updateFAQ(faqId, data) {
    const result = await executeProcedure('dbo.usp_CMS_UpdateFAQ', {
      FAQId: { type: sql.Int, value: faqId },
      Category: { type: sql.NVarChar(60), value: data.category },
      Question: { type: sql.NVarChar(300), value: data.question },
      Answer: { type: sql.NVarChar(sql.MAX), value: data.answer },
      DisplayOrder: { type: sql.Int, value: data.displayOrder !== undefined ? data.displayOrder : 0 },
      IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
    });

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async deleteFAQ(faqId) {
    const result = await executeProcedure('dbo.usp_CMS_DeleteFAQ', {
      FAQId: { type: sql.Int, value: faqId },
    });
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }
}

module.exports = new FAQRepository();

