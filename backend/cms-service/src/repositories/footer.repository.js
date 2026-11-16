/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - FOOTER SECTIONS REPOSITORY
 * File: backend/cms-service/src/repositories/footer.repository.js
 * Description: 100% Parameterized Stored Procedure execution for Footer.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class FooterRepository {
  async getPublicFooter(restaurantId = 1) {
    const result = await executeProcedure('dbo.usp_CMS_GetPublicFooter', {
      RestaurantId: { type: sql.Int, value: restaurantId },
    });

    const footerSections = result.recordsets[0] || [];
    const socialLinks = result.recordsets[1] || [];

    return {
      footerSections,
      socialLinks,
    };
  }

  async listFooterSections(restaurantId = 1) {
    const result = await executeProcedure('dbo.usp_CMS_ListFooterSections', {
      RestaurantId: { type: sql.Int, value: restaurantId },
    });
    return result.recordset || [];
  }

  async createFooterSection(data) {
    const result = await executeProcedure(
      'dbo.usp_CMS_CreateFooterSection',
      {
        RestaurantId: { type: sql.Int, value: data.restaurantId || 1 },
        SectionTitle: { type: sql.NVarChar(80), value: data.sectionTitle },
        ContentType: { type: sql.NVarChar(40), value: data.contentType || 'LINKS' },
        ContentHtml: { type: sql.NVarChar(sql.MAX), value: data.contentHtml || null },
        DisplayOrder: { type: sql.Int, value: data.displayOrder || 0 },
        IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
      },
      {
        NewFooterSectionId: sql.Int,
      }
    );

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async updateFooterSection(footerSectionId, data) {
    const result = await executeProcedure('dbo.usp_CMS_UpdateFooterSection', {
      FooterSectionId: { type: sql.Int, value: footerSectionId },
      SectionTitle: { type: sql.NVarChar(80), value: data.sectionTitle },
      ContentType: { type: sql.NVarChar(40), value: data.contentType },
      ContentHtml: { type: sql.NVarChar(sql.MAX), value: data.contentHtml || null },
      DisplayOrder: { type: sql.Int, value: data.displayOrder !== undefined ? data.displayOrder : 0 },
      IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
    });

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async deleteFooterSection(footerSectionId) {
    const result = await executeProcedure('dbo.usp_CMS_DeleteFooterSection', {
      FooterSectionId: { type: sql.Int, value: footerSectionId },
    });
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }
}

module.exports = new FooterRepository();

