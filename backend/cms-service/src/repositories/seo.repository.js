/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SEO REPOSITORY
 * File: backend/cms-service/src/repositories/seo.repository.js
 * Description: 100% Parameterized Stored Procedure execution for SEO Settings.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class SEORepository {
  async getSEOSettings({ restaurantId = 1, pageId = null, pageSlug = null }) {
    const result = await executeProcedure('dbo.usp_CMS_GetSEOSettings', {
      RestaurantId: { type: sql.Int, value: restaurantId },
      PageId: { type: sql.BigInt, value: pageId },
      PageSlug: { type: sql.NVarChar(150), value: pageSlug },
    });
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async updateSEOSettings(data) {
    const result = await executeProcedure(
      'dbo.usp_CMS_UpdateSEOSettings',
      {
        RestaurantId: { type: sql.Int, value: data.restaurantId || 1 },
        PageId: { type: sql.BigInt, value: data.pageId || null },
        MetaTitle: { type: sql.NVarChar(150), value: data.metaTitle },
        MetaDescription: { type: sql.NVarChar(500), value: data.metaDescription },
        MetaKeywords: { type: sql.NVarChar(500), value: data.metaKeywords || null },
        CanonicalUrl: { type: sql.NVarChar(500), value: data.canonicalUrl || null },
        OgTitle: { type: sql.NVarChar(150), value: data.ogTitle || null },
        OgDescription: { type: sql.NVarChar(500), value: data.ogDescription || null },
        OgImageUrl: { type: sql.NVarChar(500), value: data.ogImageUrl || null },
        OgImagePublicId: { type: sql.NVarChar(150), value: data.ogImagePublicId || null },
        TwitterCardType: { type: sql.NVarChar(30), value: data.twitterCardType || 'summary_large_image' },
        StructuredDataJson: { type: sql.NVarChar(sql.MAX), value: data.structuredDataJson || null },
        GoogleAnalyticsId: { type: sql.NVarChar(50), value: data.googleAnalyticsId || null },
        GoogleTagManagerId: { type: sql.NVarChar(50), value: data.googleTagManagerId || null },
      },
      {
        SEOId: sql.Int,
      }
    );
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }
}

module.exports = new SEORepository();

