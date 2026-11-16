/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - WEBSITE SETTINGS REPOSITORY
 * File: backend/cms-service/src/repositories/websiteSettings.repository.js
 * Description: 100% Parameterized Stored Procedure execution for Website Settings.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class WebsiteSettingsRepository {
  async getSettings({ restaurantId = 1, branchId = null }) {
    const result = await executeProcedure('dbo.usp_CMS_GetWebsiteSettings', {
      RestaurantId: { type: sql.Int, value: restaurantId },
      BranchId: { type: sql.Int, value: branchId },
    });
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async updateSettings(data) {
    const result = await executeProcedure(
      'dbo.usp_CMS_UpdateWebsiteSettings',
      {
        RestaurantId: { type: sql.Int, value: data.restaurantId || 1 },
        BranchId: { type: sql.Int, value: data.branchId || null },
        SiteTitle: { type: sql.NVarChar(150), value: data.siteTitle },
        Tagline: { type: sql.NVarChar(255), value: data.tagline || null },
        HeaderLogoUrl: { type: sql.NVarChar(500), value: data.headerLogoUrl || null },
        HeaderLogoPublicId: { type: sql.NVarChar(150), value: data.headerLogoPublicId || null },
        FooterLogoUrl: { type: sql.NVarChar(500), value: data.footerLogoUrl || null },
        FooterLogoPublicId: { type: sql.NVarChar(150), value: data.footerLogoPublicId || null },
        FaviconUrl: { type: sql.NVarChar(500), value: data.faviconUrl || null },
        PrimaryColor: { type: sql.NVarChar(20), value: data.primaryColor || '#E63946' },
        SecondaryColor: { type: sql.NVarChar(20), value: data.secondaryColor || '#1D3557' },
        AccentColor: { type: sql.NVarChar(20), value: data.accentColor || '#F1FAEE' },
        FontFamily: { type: sql.NVarChar(80), value: data.fontFamily || 'Inter, sans-serif' },
        ContactEmail: { type: sql.NVarChar(120), value: data.contactEmail },
        ContactPhone: { type: sql.NVarChar(25), value: data.contactPhone },
        WhatsappNumber: { type: sql.NVarChar(25), value: data.whatsappNumber || null },
        AddressLine: { type: sql.NVarChar(255), value: data.addressLine },
        GoogleMapsEmbedUrl: { type: sql.NVarChar(1000), value: data.googleMapsEmbedUrl || null },
        IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
      },
      {
        SettingId: sql.Int,
      }
    );
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }
}

module.exports = new WebsiteSettingsRepository();

