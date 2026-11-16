/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PAGE SECTIONS REPOSITORY
 * File: backend/cms-service/src/repositories/section.repository.js
 * Description: 100% Parameterized Stored Procedure execution for Page Sections.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class SectionRepository {
  async createSection(data) {
    const contentDataJson = typeof data.contentData === 'object' && data.contentData !== null
      ? JSON.stringify(data.contentData)
      : (data.contentDataJson || null);

    const result = await executeProcedure(
      'dbo.usp_CMS_CreatePageSection',
      {
        PageId: { type: sql.BigInt, value: data.pageId },
        SectionKey: { type: sql.NVarChar(80), value: data.sectionKey },
        SectionTitle: { type: sql.NVarChar(150), value: data.sectionTitle || null },
        SectionSubtitle: { type: sql.NVarChar(255), value: data.sectionSubtitle || null },
        ComponentType: { type: sql.NVarChar(50), value: data.componentType },
        ContentDataJson: { type: sql.NVarChar(sql.MAX), value: contentDataJson },
        BackgroundType: { type: sql.NVarChar(30), value: data.backgroundType || 'COLOR' },
        BackgroundColor: { type: sql.NVarChar(30), value: data.backgroundColor || null },
        BackgroundImageUrl: { type: sql.NVarChar(500), value: data.backgroundImageUrl || null },
        BackgroundImagePublicId: { type: sql.NVarChar(150), value: data.backgroundImagePublicId || null },
        DisplayOrder: { type: sql.Int, value: data.displayOrder || null },
        IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
      },
      {
        NewSectionId: sql.BigInt,
      }
    );

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async updateSection(sectionId, data) {
    const contentDataJson = typeof data.contentData === 'object' && data.contentData !== null
      ? JSON.stringify(data.contentData)
      : (data.contentDataJson || null);

    const result = await executeProcedure('dbo.usp_CMS_UpdatePageSection', {
      SectionId: { type: sql.BigInt, value: sectionId },
      SectionTitle: { type: sql.NVarChar(150), value: data.sectionTitle || null },
      SectionSubtitle: { type: sql.NVarChar(255), value: data.sectionSubtitle || null },
      ComponentType: { type: sql.NVarChar(50), value: data.componentType },
      ContentDataJson: { type: sql.NVarChar(sql.MAX), value: contentDataJson },
      BackgroundType: { type: sql.NVarChar(30), value: data.backgroundType || 'COLOR' },
      BackgroundColor: { type: sql.NVarChar(30), value: data.backgroundColor || null },
      BackgroundImageUrl: { type: sql.NVarChar(500), value: data.backgroundImageUrl || null },
      BackgroundImagePublicId: { type: sql.NVarChar(150), value: data.backgroundImagePublicId || null },
      DisplayOrder: { type: sql.Int, value: data.displayOrder || null },
      IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
    });

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async reorderSections(pageId, sectionsOrder) {
    const jsonStr = typeof sectionsOrder === 'string' ? sectionsOrder : JSON.stringify(sectionsOrder);

    const result = await executeProcedure('dbo.usp_CMS_ReorderPageSections', {
      PageId: { type: sql.BigInt, value: pageId },
      SectionsOrderJson: { type: sql.NVarChar(sql.MAX), value: jsonStr },
    });

    return result.recordset || [];
  }

  async deleteSection(sectionId) {
    const result = await executeProcedure('dbo.usp_CMS_DeletePageSection', {
      SectionId: { type: sql.BigInt, value: sectionId },
    });
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }
}

module.exports = new SectionRepository();

