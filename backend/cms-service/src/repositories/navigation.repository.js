/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - NAVIGATION MENUS REPOSITORY
 * File: backend/cms-service/src/repositories/navigation.repository.js
 * Description: 100% Parameterized Stored Procedure execution for Navigation.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class NavigationRepository {
  async getPublicNavigation(restaurantId = 1) {
    const result = await executeProcedure('dbo.usp_CMS_GetPublicNavigation', {
      RestaurantId: { type: sql.Int, value: restaurantId },
    });
    return result.recordset || [];
  }

  async listNavigationMenus({ restaurantId = 1, menuLocation = null }) {
    const result = await executeProcedure('dbo.usp_CMS_ListNavigationMenus', {
      RestaurantId: { type: sql.Int, value: restaurantId },
      MenuLocation: { type: sql.NVarChar(40), value: menuLocation || null },
    });
    return result.recordset || [];
  }

  async createNavigationMenu(data) {
    const result = await executeProcedure(
      'dbo.usp_CMS_CreateNavigationMenu',
      {
        RestaurantId: { type: sql.Int, value: data.restaurantId || 1 },
        ParentMenuId: { type: sql.Int, value: data.parentMenuId || null },
        MenuLocation: { type: sql.NVarChar(40), value: data.menuLocation || 'HEADER' },
        Title: { type: sql.NVarChar(80), value: data.title },
        TargetUrl: { type: sql.NVarChar(255), value: data.targetUrl },
        OpenInNewTab: { type: sql.Bit, value: Boolean(data.openInNewTab) },
        DisplayOrder: { type: sql.Int, value: data.displayOrder || 0 },
        IconName: { type: sql.NVarChar(50), value: data.iconName || null },
        IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
      },
      {
        NewMenuId: sql.Int,
      }
    );

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async updateNavigationMenu(menuId, data) {
    const result = await executeProcedure('dbo.usp_CMS_UpdateNavigationMenu', {
      MenuId: { type: sql.Int, value: menuId },
      ParentMenuId: { type: sql.Int, value: data.parentMenuId || null },
      MenuLocation: { type: sql.NVarChar(40), value: data.menuLocation || 'HEADER' },
      Title: { type: sql.NVarChar(80), value: data.title },
      TargetUrl: { type: sql.NVarChar(255), value: data.targetUrl },
      OpenInNewTab: { type: sql.Bit, value: Boolean(data.openInNewTab) },
      DisplayOrder: { type: sql.Int, value: data.displayOrder !== undefined ? data.displayOrder : 0 },
      IsActive: { type: sql.Bit, value: data.isActive !== undefined ? Boolean(data.isActive) : true },
      IconName: { type: sql.NVarChar(50), value: data.iconName || null },
    });

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async deleteNavigationMenu(menuId) {
    const result = await executeProcedure('dbo.usp_CMS_DeleteNavigationMenu', {
      MenuId: { type: sql.Int, value: menuId },
    });
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }
}

module.exports = new NavigationRepository();

