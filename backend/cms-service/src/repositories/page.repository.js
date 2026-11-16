/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - WEBSITE PAGES REPOSITORY
 * File: backend/cms-service/src/repositories/page.repository.js
 * Description: 100% Parameterized Stored Procedure execution for Dynamic Pages.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class PageRepository {
  async getPublicPageWithSections(slug, previewMode = false) {
    const result = await executeProcedure('dbo.usp_CMS_GetPublicPageWithSections', {
      PageSlug: { type: sql.NVarChar(150), value: slug },
      PreviewMode: { type: sql.Bit, value: Boolean(previewMode) },
    });

    const page = result.recordsets[0] && result.recordsets[0][0] ? result.recordsets[0][0] : null;
    if (!page) return null;

    const sections = result.recordsets[1] || [];
    const banners = result.recordsets[2] || [];

    // Parse JSON data for sections
    const formattedSections = sections.map(sec => {
      let contentData = null;
      if (sec.ContentDataJson) {
        try {
          contentData = JSON.parse(sec.ContentDataJson);
        } catch {
          contentData = sec.ContentDataJson;
        }
      }
      return {
        ...sec,
        ContentData: contentData,
      };
    });

    return {
      page,
      sections: formattedSections,
      heroBanners: banners,
    };
  }

  async listPages({ restaurantId = 1, status = null, search = null, page = 1, limit = 20 }) {
    const result = await executeProcedure('dbo.usp_CMS_ListPages', {
      RestaurantId: { type: sql.Int, value: restaurantId },
      Status: { type: sql.NVarChar(20), value: status || null },
      Search: { type: sql.NVarChar(100), value: search || null },
      Page: { type: sql.Int, value: page },
      Limit: { type: sql.Int, value: limit },
    });

    const totalCount = result.recordsets[0] && result.recordsets[0][0] ? result.recordsets[0][0].TotalCount : 0;
    const pages = result.recordsets[1] || [];

    return {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      pages,
    };
  }

  async getPageById(pageId) {
    const result = await executeProcedure('dbo.usp_CMS_GetPageById', {
      PageId: { type: sql.BigInt, value: pageId },
    });

    const page = result.recordsets[0] && result.recordsets[0][0] ? result.recordsets[0][0] : null;
    if (!page) return null;

    const seo = result.recordsets[1] && result.recordsets[1][0] ? result.recordsets[1][0] : null;
    const sections = (result.recordsets[2] || []).map(sec => {
      let contentData = null;
      if (sec.ContentDataJson) {
        try {
          contentData = JSON.parse(sec.ContentDataJson);
        } catch {
          contentData = sec.ContentDataJson;
        }
      }
      return {
        ...sec,
        ContentData: contentData,
      };
    });

    return {
      page,
      seo,
      sections,
    };
  }

  async createPage(data) {
    const result = await executeProcedure(
      'dbo.usp_CMS_CreatePage',
      {
        RestaurantId: { type: sql.Int, value: data.restaurantId || 1 },
        BranchId: { type: sql.Int, value: data.branchId || null },
        PageTitle: { type: sql.NVarChar(150), value: data.pageTitle },
        PageSlug: { type: sql.NVarChar(150), value: data.pageSlug },
        PageType: { type: sql.NVarChar(50), value: data.pageType || 'CUSTOM' },
        HeroBannerTitle: { type: sql.NVarChar(200), value: data.heroBannerTitle || null },
        HeroBannerSubtitle: { type: sql.NVarChar(500), value: data.heroBannerSubtitle || null },
        HeroImageUrl: { type: sql.NVarChar(500), value: data.heroImageUrl || null },
        HeroImagePublicId: { type: sql.NVarChar(150), value: data.heroImagePublicId || null },
        ContentHtml: { type: sql.NVarChar(sql.MAX), value: data.contentHtml || null },
        Status: { type: sql.NVarChar(20), value: data.status || 'DRAFT' },
        DisplayOrder: { type: sql.Int, value: data.displayOrder || 0 },
        IsSystemPage: { type: sql.Bit, value: Boolean(data.isSystemPage) },
      },
      {
        NewPageId: sql.BigInt,
      }
    );

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async updatePage(pageId, data) {
    const result = await executeProcedure('dbo.usp_CMS_UpdatePage', {
      PageId: { type: sql.BigInt, value: pageId },
      PageTitle: { type: sql.NVarChar(150), value: data.pageTitle },
      HeroBannerTitle: { type: sql.NVarChar(200), value: data.heroBannerTitle || null },
      HeroBannerSubtitle: { type: sql.NVarChar(500), value: data.heroBannerSubtitle || null },
      HeroImageUrl: { type: sql.NVarChar(500), value: data.heroImageUrl || null },
      HeroImagePublicId: { type: sql.NVarChar(150), value: data.heroImagePublicId || null },
      ContentHtml: { type: sql.NVarChar(sql.MAX), value: data.contentHtml || null },
      DisplayOrder: { type: sql.Int, value: data.displayOrder !== undefined ? data.displayOrder : 0 },
    });

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async setPageStatus(pageId, newStatus) {
    const result = await executeProcedure('dbo.usp_CMS_SetPageStatus', {
      PageId: { type: sql.BigInt, value: pageId },
      NewStatus: { type: sql.NVarChar(20), value: newStatus },
    });
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async deletePage(pageId, deletedByUserId = null) {
    const result = await executeProcedure('dbo.usp_CMS_DeletePage', {
      PageId: { type: sql.BigInt, value: pageId },
      DeletedByUserId: { type: sql.BigInt, value: deletedByUserId },
    });
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }
}

module.exports = new PageRepository();

