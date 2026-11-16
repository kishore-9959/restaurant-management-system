/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - BANNERS REPOSITORY
 * File: backend/cms-service/src/repositories/banner.repository.js
 * Description: 100% Parameterized Stored Procedure execution for Website Banners.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class BannerRepository {
  async getActiveBanners({ restaurantId = 1, branchId = null, bannerLocation = 'HOME_HERO' }) {
    const result = await executeProcedure('dbo.usp_CMS_GetActiveBanners', {
      RestaurantId: { type: sql.Int, value: restaurantId },
      BranchId: { type: sql.Int, value: branchId },
      BannerLocation: { type: sql.NVarChar(50), value: bannerLocation },
    });
    return result.recordset || [];
  }

  async listBanners({ restaurantId = 1, bannerLocation = null, page = 1, limit = 20 }) {
    const result = await executeProcedure('dbo.usp_CMS_ListBanners', {
      RestaurantId: { type: sql.Int, value: restaurantId },
      BannerLocation: { type: sql.NVarChar(50), value: bannerLocation || null },
      Page: { type: sql.Int, value: page },
      Limit: { type: sql.Int, value: limit },
    });

    const totalCount = result.recordsets[0] && result.recordsets[0][0] ? result.recordsets[0][0].TotalCount : 0;
    const banners = result.recordsets[1] || [];

    return {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      banners,
    };
  }

  async createBanner(data) {
    const result = await executeProcedure(
      'dbo.usp_CMS_CreateBanner',
      {
        RestaurantId: { type: sql.Int, value: data.restaurantId || 1 },
        BranchId: { type: sql.Int, value: data.branchId || null },
        BannerTitle: { type: sql.NVarChar(150), value: data.bannerTitle },
        Subtitle: { type: sql.NVarChar(300), value: data.subtitle || null },
        BadgeText: { type: sql.NVarChar(60), value: data.badgeText || null },
        ButtonText: { type: sql.NVarChar(60), value: data.buttonText || null },
        ButtonLink: { type: sql.NVarChar(255), value: data.buttonLink || null },
        SecondaryButtonText: { type: sql.NVarChar(60), value: data.secondaryButtonText || null },
        SecondaryButtonLink: { type: sql.NVarChar(255), value: data.secondaryButtonLink || null },
        ImageUrl: { type: sql.NVarChar(500), value: data.imageUrl },
        ImagePublicId: { type: sql.NVarChar(150), value: data.imagePublicId || null },
        MobileImageUrl: { type: sql.NVarChar(500), value: data.mobileImageUrl || null },
        MobileImagePublicId: { type: sql.NVarChar(150), value: data.mobileImagePublicId || null },
        BannerLocation: { type: sql.NVarChar(50), value: data.bannerLocation || 'HOME_HERO' },
        DisplayOrder: { type: sql.Int, value: data.displayOrder || 0 },
        StartDate: { type: sql.DateTime2, value: data.startDate || null },
        EndDate: { type: sql.DateTime2, value: data.endDate || null },
        IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
      },
      {
        NewBannerId: sql.BigInt,
      }
    );

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async updateBanner(bannerId, data) {
    const result = await executeProcedure('dbo.usp_CMS_UpdateBanner', {
      BannerId: { type: sql.BigInt, value: bannerId },
      BannerTitle: { type: sql.NVarChar(150), value: data.bannerTitle },
      Subtitle: { type: sql.NVarChar(300), value: data.subtitle || null },
      BadgeText: { type: sql.NVarChar(60), value: data.badgeText || null },
      ButtonText: { type: sql.NVarChar(60), value: data.buttonText || null },
      ButtonLink: { type: sql.NVarChar(255), value: data.buttonLink || null },
      SecondaryButtonText: { type: sql.NVarChar(60), value: data.secondaryButtonText || null },
      SecondaryButtonLink: { type: sql.NVarChar(255), value: data.secondaryButtonLink || null },
      ImageUrl: { type: sql.NVarChar(500), value: data.imageUrl },
      ImagePublicId: { type: sql.NVarChar(150), value: data.imagePublicId || null },
      MobileImageUrl: { type: sql.NVarChar(500), value: data.mobileImageUrl || null },
      MobileImagePublicId: { type: sql.NVarChar(150), value: data.mobileImagePublicId || null },
      BannerLocation: { type: sql.NVarChar(50), value: data.bannerLocation || 'HOME_HERO' },
      DisplayOrder: { type: sql.Int, value: data.displayOrder !== undefined ? data.displayOrder : 0 },
      StartDate: { type: sql.DateTime2, value: data.startDate || null },
      EndDate: { type: sql.DateTime2, value: data.endDate || null },
      IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
    });

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async deleteBanner(bannerId) {
    const result = await executeProcedure('dbo.usp_CMS_DeleteBanner', {
      BannerId: { type: sql.BigInt, value: bannerId },
    });
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }
}

module.exports = new BannerRepository();

