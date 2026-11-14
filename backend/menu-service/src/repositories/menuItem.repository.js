/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - MENU ITEM REPOSITORY
 * File: backend/menu-service/src/repositories/menuItem.repository.js
 * Description: Data access methods for Menu Items, Variants, Images,
 *              Pricing, Availability ("86") and Public Catalog using Stored Procedures.
 * ============================================================================
 */

const { executeProcedure } = require('@rms/shared');

class MenuItemRepository {
  /**
   * Create a menu item
   */
  async create(data) {
    const result = await executeProcedure('dbo.usp_MenuItem_Create', {
      BranchId: parseInt(data.branchId, 10),
      CategoryId: parseInt(data.categoryId, 10),
      ItemCode: data.itemCode,
      ItemName: data.itemName,
      Description: data.description || null,
      BasePrice: parseFloat(data.basePrice),
      CostPrice: data.costPrice !== undefined ? parseFloat(data.costPrice) : 0.00,
      TaxPercentage: data.taxPercentage !== undefined ? parseFloat(data.taxPercentage) : 5.00,
      DietaryType: data.dietaryType || 'VEG',
      SpicyLevel: data.spicyLevel !== undefined ? parseInt(data.spicyLevel, 10) : 0,
      PreparationTimeMinutes: data.preparationTimeMinutes !== undefined ? parseInt(data.preparationTimeMinutes, 10) : 15,
      IsAvailable: data.isAvailable !== undefined ? (data.isAvailable ? 1 : 0) : 1,
      IsFeatured: data.isFeatured !== undefined ? (data.isFeatured ? 1 : 0) : 0,
      DisplayOrder: data.displayOrder !== undefined ? parseInt(data.displayOrder, 10) : 0,
    });
    return result.recordset?.[0] || null;
  }

  /**
   * Update a menu item
   */
  async update(menuItemId, data) {
    const result = await executeProcedure('dbo.usp_MenuItem_Update', {
      MenuItemId: parseInt(menuItemId, 10),
      CategoryId: parseInt(data.categoryId, 10),
      ItemCode: data.itemCode,
      ItemName: data.itemName,
      Description: data.description !== undefined ? data.description : null,
      BasePrice: parseFloat(data.basePrice),
      CostPrice: data.costPrice !== undefined ? parseFloat(data.costPrice) : 0.00,
      TaxPercentage: data.taxPercentage !== undefined ? parseFloat(data.taxPercentage) : 5.00,
      DietaryType: data.dietaryType || 'VEG',
      SpicyLevel: data.spicyLevel !== undefined ? parseInt(data.spicyLevel, 10) : 0,
      PreparationTimeMinutes: data.preparationTimeMinutes !== undefined ? parseInt(data.preparationTimeMinutes, 10) : 15,
      IsAvailable: data.isAvailable !== undefined ? (data.isAvailable ? 1 : 0) : 1,
      IsFeatured: data.isFeatured !== undefined ? (data.isFeatured ? 1 : 0) : 0,
      DisplayOrder: data.displayOrder !== undefined ? parseInt(data.displayOrder, 10) : 0,
    });
    return result.recordset?.[0] || null;
  }

  /**
   * Get menu item by ID with variants, linked addons and images
   */
  async getById(menuItemId) {
    const result = await executeProcedure('dbo.usp_MenuItem_GetById', {
      MenuItemId: parseInt(menuItemId, 10),
    });

    const item = result.recordsets?.[0]?.[0] || null;
    if (!item) return null;

    item.variants = result.recordsets?.[1] || [];

    // Group addon items under their parent addon group
    const rawAddons = result.recordsets?.[2] || [];
    const addonGroupsMap = new Map();

    for (const row of rawAddons) {
      if (!addonGroupsMap.has(row.AddonGroupId)) {
        addonGroupsMap.set(row.AddonGroupId, {
          addonGroupId: row.AddonGroupId,
          groupName: row.GroupName,
          minSelections: row.MinSelections,
          maxSelections: row.MaxSelections,
          isActive: row.IsActive,
          displayOrder: row.GroupDisplayOrder,
          items: [],
        });
      }
      if (row.AddonItemId) {
        addonGroupsMap.get(row.AddonGroupId).items.push({
          addonItemId: row.AddonItemId,
          itemName: row.AddonItemName,
          price: row.AddonPrice,
          isAvailable: row.AddonIsAvailable,
        });
      }
    }
    item.addonGroups = Array.from(addonGroupsMap.values());
    item.images = result.recordsets?.[3] || [];

    return item;
  }

  /**
   * List menu items by branch with pagination, filters and search
   */
  async listByBranch({
    branchId,
    categoryId = null,
    dietaryType = null,
    isFeatured = null,
    isAvailable = null,
    search = null,
    page = 1,
    limit = 50,
  }) {
    const result = await executeProcedure('dbo.usp_MenuItem_ListByBranch', {
      BranchId: parseInt(branchId, 10),
      CategoryId: categoryId ? parseInt(categoryId, 10) : null,
      DietaryType: dietaryType || null,
      IsFeatured: isFeatured === null || isFeatured === undefined ? null : (isFeatured ? 1 : 0),
      IsAvailable: isAvailable === null || isAvailable === undefined ? null : (isAvailable ? 1 : 0),
      Search: search || null,
      Page: parseInt(page, 10) || 1,
      Limit: parseInt(limit, 10) || 50,
    });

    const items = result.recordset || [];
    const totalCount = items[0]?.TotalCount || 0;
    const totalPages = items[0]?.TotalPages || 1;

    return {
      items,
      pagination: {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
        totalCount,
        totalPages,
      },
    };
  }

  /**
   * Toggle menu item availability (the "86" out-of-stock toggle)
   */
  async setAvailability(menuItemId, isAvailable) {
    const result = await executeProcedure('dbo.usp_MenuItem_SetAvailability', {
      MenuItemId: parseInt(menuItemId, 10),
      IsAvailable: isAvailable ? 1 : 0,
    });
    return result.recordset?.[0] || null;
  }

  /**
   * Update menu item pricing
   */
  async updatePricing(menuItemId, { basePrice, costPrice = null, taxPercentage = null }) {
    const result = await executeProcedure('dbo.usp_MenuItem_UpdatePricing', {
      MenuItemId: parseInt(menuItemId, 10),
      BasePrice: parseFloat(basePrice),
      CostPrice: costPrice !== null && costPrice !== undefined ? parseFloat(costPrice) : null,
      TaxPercentage: taxPercentage !== null && taxPercentage !== undefined ? parseFloat(taxPercentage) : null,
    });
    return result.recordset?.[0] || null;
  }

  /**
   * Soft delete menu item
   */
  async delete(menuItemId) {
    const result = await executeProcedure('dbo.usp_MenuItem_Delete', {
      MenuItemId: parseInt(menuItemId, 10),
    });
    return result.recordset?.[0] || null;
  }

  // --------------------------------------------------------------------------
  // VARIANTS
  // --------------------------------------------------------------------------

  async createVariant(data) {
    const result = await executeProcedure('dbo.usp_MenuItemVariant_Create', {
      MenuItemId: parseInt(data.menuItemId, 10),
      VariantName: data.variantName,
      SKU: data.sku || null,
      PriceAdjustment: data.priceAdjustment !== undefined ? parseFloat(data.priceAdjustment) : 0.00,
      IsDefault: data.isDefault !== undefined ? (data.isDefault ? 1 : 0) : 0,
      IsAvailable: data.isAvailable !== undefined ? (data.isAvailable ? 1 : 0) : 1,
    });
    return result.recordset?.[0] || null;
  }

  async updateVariant(variantId, data) {
    const result = await executeProcedure('dbo.usp_MenuItemVariant_Update', {
      VariantId: parseInt(variantId, 10),
      VariantName: data.variantName,
      SKU: data.sku !== undefined ? data.sku : null,
      PriceAdjustment: data.priceAdjustment !== undefined ? parseFloat(data.priceAdjustment) : 0.00,
      IsDefault: data.isDefault !== undefined ? (data.isDefault ? 1 : 0) : 0,
      IsAvailable: data.isAvailable !== undefined ? (data.isAvailable ? 1 : 0) : 1,
    });
    return result.recordset?.[0] || null;
  }

  async setVariantAvailability(variantId, isAvailable) {
    const result = await executeProcedure('dbo.usp_MenuItemVariant_SetAvailability', {
      VariantId: parseInt(variantId, 10),
      IsAvailable: isAvailable ? 1 : 0,
    });
    return result.recordset?.[0] || null;
  }

  async deleteVariant(variantId) {
    const result = await executeProcedure('dbo.usp_MenuItemVariant_Delete', {
      VariantId: parseInt(variantId, 10),
    });
    return result.recordset?.[0] || null;
  }

  async listVariantsByItem(menuItemId) {
    const result = await executeProcedure('dbo.usp_MenuItemVariant_ListByItem', {
      MenuItemId: parseInt(menuItemId, 10),
    });
    return result.recordset || [];
  }

  // --------------------------------------------------------------------------
  // IMAGES
  // --------------------------------------------------------------------------

  async addImage(data) {
    const result = await executeProcedure('dbo.usp_MenuItemImage_Add', {
      MenuItemId: parseInt(data.menuItemId, 10),
      ImageUrl: data.imageUrl,
      IsPrimary: data.isPrimary !== undefined ? (data.isPrimary ? 1 : 0) : 0,
      DisplayOrder: data.displayOrder !== undefined ? parseInt(data.displayOrder, 10) : 0,
    });
    return result.recordset?.[0] || null;
  }

  async deleteImage(imageId) {
    const result = await executeProcedure('dbo.usp_MenuItemImage_Delete', {
      ImageId: parseInt(imageId, 10),
    });
    return result.recordset?.[0] || null;
  }

  async setImagePrimary(imageId) {
    const result = await executeProcedure('dbo.usp_MenuItemImage_SetPrimary', {
      ImageId: parseInt(imageId, 10),
    });
    return result.recordset?.[0] || null;
  }

  async listImagesByItem(menuItemId) {
    const result = await executeProcedure('dbo.usp_MenuItemImage_ListByItem', {
      MenuItemId: parseInt(menuItemId, 10),
    });
    return result.recordset || [];
  }

  // --------------------------------------------------------------------------
  // PUBLIC CATALOG ENGINE
  // --------------------------------------------------------------------------

  /**
   * Retrieves complete catalog tree for a branch, building hierarchical structure
   */
  async getCatalogByBranch(branchId, categoryId = null) {
    const result = await executeProcedure('dbo.usp_Menu_GetCatalogByBranch', {
      BranchId: parseInt(branchId, 10),
      CategoryId: categoryId ? parseInt(categoryId, 10) : null,
    });

    const categories = result.recordsets?.[0] || [];
    const items = result.recordsets?.[1] || [];
    const variants = result.recordsets?.[2] || [];
    const rawAddons = result.recordsets?.[3] || [];
    const images = result.recordsets?.[4] || [];

    // Map variants by MenuItemId
    const variantsByItem = new Map();
    for (const v of variants) {
      if (!variantsByItem.has(v.MenuItemId)) {
        variantsByItem.set(v.MenuItemId, []);
      }
      variantsByItem.get(v.MenuItemId).push({
        variantId: v.VariantId,
        variantName: v.VariantName,
        sku: v.SKU,
        priceAdjustment: v.PriceAdjustment,
        isDefault: v.IsDefault,
      });
    }

    // Map addon groups and items by MenuItemId
    const addonsByItem = new Map();
    for (const row of rawAddons) {
      if (!addonsByItem.has(row.MenuItemId)) {
        addonsByItem.set(row.MenuItemId, new Map());
      }
      const itemGroups = addonsByItem.get(row.MenuItemId);
      if (!itemGroups.has(row.AddonGroupId)) {
        itemGroups.set(row.AddonGroupId, {
          addonGroupId: row.AddonGroupId,
          groupName: row.GroupName,
          minSelections: row.MinSelections,
          maxSelections: row.MaxSelections,
          displayOrder: row.GroupDisplayOrder,
          items: [],
        });
      }
      if (row.AddonItemId) {
        itemGroups.get(row.AddonGroupId).items.push({
          addonItemId: row.AddonItemId,
          itemName: row.AddonItemName,
          price: row.AddonPrice,
        });
      }
    }

    // Map images by MenuItemId
    const imagesByItem = new Map();
    for (const img of images) {
      if (!imagesByItem.has(img.MenuItemId)) {
        imagesByItem.set(img.MenuItemId, []);
      }
      imagesByItem.get(img.MenuItemId).push({
        imageId: img.ImageId,
        imageUrl: img.ImageUrl,
        isPrimary: img.IsPrimary,
        displayOrder: img.DisplayOrder,
      });
    }

    // Attach items to categories
    const itemsByCategory = new Map();
    for (const item of items) {
      const formattedItem = {
        menuItemId: item.MenuItemId,
        branchId: item.BranchId,
        categoryId: item.CategoryId,
        itemCode: item.ItemCode,
        itemName: item.ItemName,
        description: item.Description,
        basePrice: item.BasePrice,
        taxPercentage: item.TaxPercentage,
        dietaryType: item.DietaryType,
        spicyLevel: item.SpicyLevel,
        preparationTimeMinutes: item.PreparationTimeMinutes,
        isFeatured: item.IsFeatured,
        displayOrder: item.DisplayOrder,
        primaryImageUrl: item.PrimaryImageUrl,
        variants: variantsByItem.get(item.MenuItemId) || [],
        addonGroups: addonsByItem.has(item.MenuItemId)
          ? Array.from(addonsByItem.get(item.MenuItemId).values())
          : [],
        images: imagesByItem.get(item.MenuItemId) || [],
      };

      if (!itemsByCategory.has(item.CategoryId)) {
        itemsByCategory.set(item.CategoryId, []);
      }
      itemsByCategory.get(item.CategoryId).push(formattedItem);
    }

    // Build hierarchical categories
    const catalogCategories = categories.map((cat) => ({
      categoryId: cat.CategoryId,
      parentCategoryId: cat.ParentCategoryId,
      categoryName: cat.CategoryName,
      categorySlug: cat.CategorySlug,
      description: cat.Description,
      displayOrder: cat.DisplayOrder,
      imageUrl: cat.ImageUrl,
      items: itemsByCategory.get(cat.CategoryId) || [],
    }));

    return {
      branchId: parseInt(branchId, 10),
      totalCategories: catalogCategories.length,
      totalItems: items.length,
      categories: catalogCategories,
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = new MenuItemRepository();

