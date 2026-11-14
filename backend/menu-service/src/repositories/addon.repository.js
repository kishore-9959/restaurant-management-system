/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - ADDON REPOSITORY
 * File: backend/menu-service/src/repositories/addon.repository.js
 * Description: Data access methods for Addon Groups and Addon Items using Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class AddonRepository {
  /**
   * Create an addon group
   */
  async createGroup(data) {
    const result = await executeProcedure('dbo.usp_AddonGroup_Create', {
      BranchId: data.branchId ? parseInt(data.branchId, 10) : null,
      GroupName: data.groupName,
      MinSelections: data.minSelections !== undefined ? parseInt(data.minSelections, 10) : 0,
      MaxSelections: data.maxSelections !== undefined ? parseInt(data.maxSelections, 10) : 10,
      IsActive: data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
    });
    return result.recordset?.[0] || null;
  }

  /**
   * Update an addon group
   */
  async updateGroup(addonGroupId, data) {
    const result = await executeProcedure('dbo.usp_AddonGroup_Update', {
      AddonGroupId: parseInt(addonGroupId, 10),
      GroupName: data.groupName,
      MinSelections: data.minSelections !== undefined ? parseInt(data.minSelections, 10) : 0,
      MaxSelections: data.maxSelections !== undefined ? parseInt(data.maxSelections, 10) : 10,
      IsActive: data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
    });
    return result.recordset?.[0] || null;
  }

  /**
   * Get addon group by ID with its items
   */
  async getGroupById(addonGroupId) {
    const result = await executeProcedure('dbo.usp_AddonGroup_GetById', {
      AddonGroupId: parseInt(addonGroupId, 10),
    });

    const group = result.recordsets?.[0]?.[0] || null;
    if (group) {
      group.items = result.recordsets?.[1] || [];
    }
    return group;
  }

  /**
   * List addon groups by branch
   */
  async listGroupsByBranch(branchId = null) {
    const result = await executeProcedure('dbo.usp_AddonGroup_ListByBranch', {
      BranchId: branchId ? parseInt(branchId, 10) : null,
    });
    return result.recordset || [];
  }

  /**
   * Link addon group to a menu item
   */
  async linkGroupToMenuItem(menuItemId, addonGroupId, displayOrder = 0) {
    const result = await executeProcedure('dbo.usp_AddonGroup_LinkToMenuItem', {
      MenuItemId: parseInt(menuItemId, 10),
      AddonGroupId: parseInt(addonGroupId, 10),
      DisplayOrder: parseInt(displayOrder, 10) || 0,
    });
    return result.recordset?.[0] || null;
  }

  /**
   * Unlink addon group from a menu item
   */
  async unlinkGroupFromMenuItem(menuItemId, addonGroupId) {
    const result = await executeProcedure('dbo.usp_AddonGroup_UnlinkFromMenuItem', {
      MenuItemId: parseInt(menuItemId, 10),
      AddonGroupId: parseInt(addonGroupId, 10),
    });
    return result.recordset?.[0] || null;
  }

  // --------------------------------------------------------------------------
  // ADDON ITEMS
  // --------------------------------------------------------------------------

  /**
   * Create an addon item
   */
  async createItem(data) {
    const result = await executeProcedure('dbo.usp_AddonItem_Create', {
      AddonGroupId: parseInt(data.addonGroupId, 10),
      ItemName: data.itemName,
      Price: data.price !== undefined ? parseFloat(data.price) : 0.00,
      IsAvailable: data.isAvailable !== undefined ? (data.isAvailable ? 1 : 0) : 1,
    });
    return result.recordset?.[0] || null;
  }

  /**
   * Update an addon item
   */
  async updateItem(addonItemId, data) {
    const result = await executeProcedure('dbo.usp_AddonItem_Update', {
      AddonItemId: parseInt(addonItemId, 10),
      ItemName: data.itemName,
      Price: data.price !== undefined ? parseFloat(data.price) : 0.00,
      IsAvailable: data.isAvailable !== undefined ? (data.isAvailable ? 1 : 0) : 1,
    });
    return result.recordset?.[0] || null;
  }

  /**
   * Toggle addon item availability ("86" toggle)
   */
  async setItemAvailability(addonItemId, isAvailable) {
    const result = await executeProcedure('dbo.usp_AddonItem_SetAvailability', {
      AddonItemId: parseInt(addonItemId, 10),
      IsAvailable: isAvailable ? 1 : 0,
    });
    return result.recordset?.[0] || null;
  }

  /**
   * Soft delete addon item
   */
  async deleteItem(addonItemId) {
    const result = await executeProcedure('dbo.usp_AddonItem_Delete', {
      AddonItemId: parseInt(addonItemId, 10),
    });
    return result.recordset?.[0] || null;
  }
}

module.exports = new AddonRepository();

