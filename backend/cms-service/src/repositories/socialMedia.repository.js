/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SOCIAL MEDIA LINKS REPOSITORY
 * File: backend/cms-service/src/repositories/socialMedia.repository.js
 * Description: 100% Parameterized Stored Procedure execution for Social Links.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class SocialMediaRepository {
  async listSocialLinks({ restaurantId = 1, activeOnly = false }) {
    const result = await executeProcedure('dbo.usp_CMS_ListSocialLinks', {
      RestaurantId: { type: sql.Int, value: restaurantId },
      ActiveOnly: { type: sql.Bit, value: Boolean(activeOnly) },
    });
    return result.recordset || [];
  }

  async saveSocialMediaLink(data) {
    const result = await executeProcedure(
      'dbo.usp_CMS_SaveSocialMediaLink',
      {
        RestaurantId: { type: sql.Int, value: data.restaurantId || 1 },
        SocialLinkId: { type: sql.Int, value: data.socialLinkId || null },
        PlatformName: { type: sql.NVarChar(50), value: data.platformName },
        PlatformUrl: { type: sql.NVarChar(500), value: data.platformUrl },
        IconKey: { type: sql.NVarChar(50), value: data.iconKey },
        DisplayOrder: { type: sql.Int, value: data.displayOrder || 0 },
        IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
      },
      {
        ResultSocialLinkId: sql.Int,
      }
    );

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async deleteSocialMediaLink(socialLinkId) {
    const result = await executeProcedure('dbo.usp_CMS_DeleteSocialMediaLink', {
      SocialLinkId: { type: sql.Int, value: socialLinkId },
    });
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }
}

module.exports = new SocialMediaRepository();

