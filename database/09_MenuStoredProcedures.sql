-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS) - MENU SERVICE STORED PROCEDURES
-- File: database/09_MenuStoredProcedures.sql
-- Description: Stored procedures for pure stored-procedure-based Category,
--              Menu Item, Variant, Addon Group, Addon Item, Image,
--              Pricing & Availability ("86") operations.
-- Database: RestaurantManagementDB
-- Engine: Microsoft SQL Server 2019 / 2022
-- ============================================================================

USE [RestaurantManagementDB];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- 1. CATEGORY MANAGEMENT PROCEDURES
-- ============================================================================

-- 1.1 usp_Category_Create
CREATE OR ALTER PROCEDURE dbo.usp_Category_Create
    @BranchId INT = NULL,
    @ParentCategoryId INT = NULL,
    @CategoryName NVARCHAR(80),
    @CategorySlug NVARCHAR(100),
    @Description NVARCHAR(255) = NULL,
    @DisplayOrder INT = 0,
    @ImageUrl NVARCHAR(500) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate Branch if provided
    IF @BranchId IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.Branches WHERE BranchId = @BranchId AND IsDeleted = 0
    )
    BEGIN
        RAISERROR('The specified branch does not exist.', 16, 1);
        RETURN;
    END;

    -- Validate Parent Category if provided
    IF @ParentCategoryId IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.Categories WHERE CategoryId = @ParentCategoryId AND IsDeleted = 0
    )
    BEGIN
        RAISERROR('The specified parent category does not exist.', 16, 1);
        RETURN;
    END;

    -- Validate unique slug within branch context
    IF EXISTS (
        SELECT 1 FROM dbo.Categories 
        WHERE CategorySlug = @CategorySlug 
          AND ((BranchId = @BranchId) OR (BranchId IS NULL AND @BranchId IS NULL))
          AND IsDeleted = 0
    )
    BEGIN
        RAISERROR('A category with this slug already exists for the specified branch scope.', 16, 1);
        RETURN;
    END;

    INSERT INTO dbo.Categories (
        BranchId,
        ParentCategoryId,
        CategoryName,
        CategorySlug,
        Description,
        DisplayOrder,
        ImageUrl,
        IsActive,
        CreatedAt,
        UpdatedAt,
        IsDeleted
    ) VALUES (
        @BranchId,
        @ParentCategoryId,
        @CategoryName,
        @CategorySlug,
        @Description,
        ISNULL(@DisplayOrder, 0),
        @ImageUrl,
        ISNULL(@IsActive, 1),
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        0
    );

    DECLARE @NewCategoryId INT = SCOPE_IDENTITY();

    SELECT 
        c.CategoryId,
        c.BranchId,
        b.BranchName,
        c.ParentCategoryId,
        p.CategoryName AS ParentCategoryName,
        c.CategoryName,
        c.CategorySlug,
        c.Description,
        c.DisplayOrder,
        c.ImageUrl,
        c.IsActive,
        c.CreatedAt,
        c.UpdatedAt
    FROM dbo.Categories c
    LEFT JOIN dbo.Branches b ON c.BranchId = b.BranchId
    LEFT JOIN dbo.Categories p ON c.ParentCategoryId = p.CategoryId
    WHERE c.CategoryId = @NewCategoryId;
END;
GO

-- 1.2 usp_Category_Update
CREATE OR ALTER PROCEDURE dbo.usp_Category_Update
    @CategoryId INT,
    @ParentCategoryId INT = NULL,
    @CategoryName NVARCHAR(80),
    @CategorySlug NVARCHAR(100),
    @Description NVARCHAR(255) = NULL,
    @DisplayOrder INT = 0,
    @ImageUrl NVARCHAR(500) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @BranchId INT;

    SELECT @BranchId = BranchId 
    FROM dbo.Categories 
    WHERE CategoryId = @CategoryId AND IsDeleted = 0;

    IF @BranchId IS NULL AND NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE CategoryId = @CategoryId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Category not found.', 16, 1);
        RETURN;
    END;

    -- Prevent self-referencing circular hierarchy
    IF @ParentCategoryId = @CategoryId
    BEGIN
        RAISERROR('A category cannot be its own parent.', 16, 1);
        RETURN;
    END;

    IF @ParentCategoryId IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.Categories WHERE CategoryId = @ParentCategoryId AND IsDeleted = 0
    )
    BEGIN
        RAISERROR('The specified parent category does not exist.', 16, 1);
        RETURN;
    END;

    -- Validate slug uniqueness (excluding current category)
    IF EXISTS (
        SELECT 1 FROM dbo.Categories 
        WHERE CategorySlug = @CategorySlug 
          AND CategoryId <> @CategoryId
          AND ((BranchId = @BranchId) OR (BranchId IS NULL AND @BranchId IS NULL))
          AND IsDeleted = 0
    )
    BEGIN
        RAISERROR('A category with this slug already exists for the specified branch scope.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.Categories
    SET ParentCategoryId = @ParentCategoryId,
        CategoryName = @CategoryName,
        CategorySlug = @CategorySlug,
        Description = @Description,
        DisplayOrder = ISNULL(@DisplayOrder, DisplayOrder),
        ImageUrl = @ImageUrl,
        IsActive = ISNULL(@IsActive, IsActive),
        UpdatedAt = SYSUTCDATETIME()
    WHERE CategoryId = @CategoryId;

    SELECT 
        c.CategoryId,
        c.BranchId,
        b.BranchName,
        c.ParentCategoryId,
        p.CategoryName AS ParentCategoryName,
        c.CategoryName,
        c.CategorySlug,
        c.Description,
        c.DisplayOrder,
        c.ImageUrl,
        c.IsActive,
        c.CreatedAt,
        c.UpdatedAt
    FROM dbo.Categories c
    LEFT JOIN dbo.Branches b ON c.BranchId = b.BranchId
    LEFT JOIN dbo.Categories p ON c.ParentCategoryId = p.CategoryId
    WHERE c.CategoryId = @CategoryId;
END;
GO

-- 1.3 usp_Category_GetById
CREATE OR ALTER PROCEDURE dbo.usp_Category_GetById
    @CategoryId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.CategoryId,
        c.BranchId,
        b.BranchName,
        c.ParentCategoryId,
        p.CategoryName AS ParentCategoryName,
        c.CategoryName,
        c.CategorySlug,
        c.Description,
        c.DisplayOrder,
        c.ImageUrl,
        c.IsActive,
        c.CreatedAt,
        c.UpdatedAt,
        (SELECT COUNT(1) FROM dbo.MenuItems mi WHERE mi.CategoryId = c.CategoryId AND mi.IsDeleted = 0) AS ItemCount,
        (SELECT COUNT(1) FROM dbo.Categories sub WHERE sub.ParentCategoryId = c.CategoryId AND sub.IsDeleted = 0) AS SubcategoryCount
    FROM dbo.Categories c
    LEFT JOIN dbo.Branches b ON c.BranchId = b.BranchId
    LEFT JOIN dbo.Categories p ON c.ParentCategoryId = p.CategoryId
    WHERE c.CategoryId = @CategoryId AND c.IsDeleted = 0;
END;
GO

-- 1.4 usp_Category_ListByBranch
CREATE OR ALTER PROCEDURE dbo.usp_Category_ListByBranch
    @BranchId INT = NULL,
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.CategoryId,
        c.BranchId,
        b.BranchName,
        c.ParentCategoryId,
        p.CategoryName AS ParentCategoryName,
        c.CategoryName,
        c.CategorySlug,
        c.Description,
        c.DisplayOrder,
        c.ImageUrl,
        c.IsActive,
        c.CreatedAt,
        c.UpdatedAt,
        (SELECT COUNT(1) FROM dbo.MenuItems mi WHERE mi.CategoryId = c.CategoryId AND mi.IsDeleted = 0) AS ItemCount
    FROM dbo.Categories c
    LEFT JOIN dbo.Branches b ON c.BranchId = b.BranchId
    LEFT JOIN dbo.Categories p ON c.ParentCategoryId = p.CategoryId
    WHERE c.IsDeleted = 0
      AND (@BranchId IS NULL OR c.BranchId = @BranchId OR c.BranchId IS NULL)
      AND (@IncludeInactive = 1 OR c.IsActive = 1)
    ORDER BY c.DisplayOrder ASC, c.CategoryName ASC;
END;
GO

-- 1.5 usp_Category_SetStatus
CREATE OR ALTER PROCEDURE dbo.usp_Category_SetStatus
    @CategoryId INT,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE CategoryId = @CategoryId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Category not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.Categories
    SET IsActive = @IsActive,
        UpdatedAt = SYSUTCDATETIME()
    WHERE CategoryId = @CategoryId;

    SELECT 
        CategoryId,
        BranchId,
        CategoryName,
        CategorySlug,
        IsActive,
        UpdatedAt
    FROM dbo.Categories
    WHERE CategoryId = @CategoryId;
END;
GO

-- 1.6 usp_Category_Delete
CREATE OR ALTER PROCEDURE dbo.usp_Category_Delete
    @CategoryId INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE CategoryId = @CategoryId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Category not found.', 16, 1);
        RETURN;
    END;

    -- Check if child categories exist
    IF EXISTS (SELECT 1 FROM dbo.Categories WHERE ParentCategoryId = @CategoryId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Cannot delete category because it contains active subcategories. Please reassign or delete subcategories first.', 16, 1);
        RETURN;
    END;

    -- Check if active menu items exist
    IF EXISTS (SELECT 1 FROM dbo.MenuItems WHERE CategoryId = @CategoryId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Cannot delete category because it contains active menu items. Please reassign or delete items first.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.Categories
    SET IsDeleted = 1,
        DeletedAt = SYSUTCDATETIME(),
        UpdatedAt = SYSUTCDATETIME()
    WHERE CategoryId = @CategoryId;

    SELECT @CategoryId AS DeletedCategoryId, 1 AS Success;
END;
GO


-- ============================================================================
-- 2. MENU ITEM MANAGEMENT PROCEDURES
-- ============================================================================

-- 2.1 usp_MenuItem_Create
CREATE OR ALTER PROCEDURE dbo.usp_MenuItem_Create
    @BranchId INT,
    @CategoryId INT,
    @ItemCode NVARCHAR(30),
    @ItemName NVARCHAR(120),
    @Description NVARCHAR(1000) = NULL,
    @BasePrice DECIMAL(10,2),
    @CostPrice DECIMAL(10,2) = 0.00,
    @TaxPercentage DECIMAL(5,2) = 5.00,
    @DietaryType NVARCHAR(30) = 'VEG',
    @SpicyLevel INT = 0,
    @PreparationTimeMinutes INT = 15,
    @IsAvailable BIT = 1,
    @IsFeatured BIT = 0,
    @DisplayOrder INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate Branch
    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchId = @BranchId AND IsDeleted = 0)
    BEGIN
        RAISERROR('The specified branch does not exist.', 16, 1);
        RETURN;
    END;

    -- Validate Category
    IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE CategoryId = @CategoryId AND IsDeleted = 0)
    BEGIN
        RAISERROR('The specified category does not exist.', 16, 1);
        RETURN;
    END;

    -- Validate DietaryType
    IF @DietaryType NOT IN ('VEG', 'NON_VEG', 'VEGAN', 'EGG', 'HALAL')
    BEGIN
        RAISERROR('Invalid dietary type. Must be VEG, NON_VEG, VEGAN, EGG, or HALAL.', 16, 1);
        RETURN;
    END;

    -- Validate SpicyLevel (0-3)
    IF @SpicyLevel < 0 OR @SpicyLevel > 3
    BEGIN
        RAISERROR('Spicy level must be between 0 (None) and 3 (Extra Hot).', 16, 1);
        RETURN;
    END;

    -- Validate unique ItemCode per Branch
    IF EXISTS (
        SELECT 1 FROM dbo.MenuItems 
        WHERE BranchId = @BranchId 
          AND ItemCode = @ItemCode 
          AND IsDeleted = 0
    )
    BEGIN
        RAISERROR('A menu item with this item code already exists for the branch.', 16, 1);
        RETURN;
    END;

    INSERT INTO dbo.MenuItems (
        BranchId,
        CategoryId,
        ItemCode,
        ItemName,
        Description,
        BasePrice,
        CostPrice,
        TaxPercentage,
        DietaryType,
        SpicyLevel,
        PreparationTimeMinutes,
        IsAvailable,
        IsFeatured,
        DisplayOrder,
        CreatedAt,
        UpdatedAt,
        IsDeleted
    ) VALUES (
        @BranchId,
        @CategoryId,
        @ItemCode,
        @ItemName,
        @Description,
        @BasePrice,
        ISNULL(@CostPrice, 0.00),
        ISNULL(@TaxPercentage, 5.00),
        @DietaryType,
        ISNULL(@SpicyLevel, 0),
        ISNULL(@PreparationTimeMinutes, 15),
        ISNULL(@IsAvailable, 1),
        ISNULL(@IsFeatured, 0),
        ISNULL(@DisplayOrder, 0),
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        0
    );

    DECLARE @NewMenuItemId BIGINT = SCOPE_IDENTITY();

    SELECT 
        m.MenuItemId,
        m.BranchId,
        b.BranchName,
        m.CategoryId,
        c.CategoryName,
        c.CategorySlug,
        m.ItemCode,
        m.ItemName,
        m.Description,
        m.BasePrice,
        m.CostPrice,
        m.TaxPercentage,
        m.DietaryType,
        m.SpicyLevel,
        m.PreparationTimeMinutes,
        m.IsAvailable,
        m.IsFeatured,
        m.DisplayOrder,
        m.CreatedAt,
        m.UpdatedAt
    FROM dbo.MenuItems m
    JOIN dbo.Branches b ON m.BranchId = b.BranchId
    JOIN dbo.Categories c ON m.CategoryId = c.CategoryId
    WHERE m.MenuItemId = @NewMenuItemId;
END;
GO

-- 2.2 usp_MenuItem_Update
CREATE OR ALTER PROCEDURE dbo.usp_MenuItem_Update
    @MenuItemId BIGINT,
    @CategoryId INT,
    @ItemCode NVARCHAR(30),
    @ItemName NVARCHAR(120),
    @Description NVARCHAR(1000) = NULL,
    @BasePrice DECIMAL(10,2),
    @CostPrice DECIMAL(10,2) = 0.00,
    @TaxPercentage DECIMAL(5,2) = 5.00,
    @DietaryType NVARCHAR(30) = 'VEG',
    @SpicyLevel INT = 0,
    @PreparationTimeMinutes INT = 15,
    @IsAvailable BIT = 1,
    @IsFeatured BIT = 0,
    @DisplayOrder INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @BranchId INT;

    SELECT @BranchId = BranchId 
    FROM dbo.MenuItems 
    WHERE MenuItemId = @MenuItemId AND IsDeleted = 0;

    IF @BranchId IS NULL
    BEGIN
        RAISERROR('Menu item not found.', 16, 1);
        RETURN;
    END;

    -- Validate Category
    IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE CategoryId = @CategoryId AND IsDeleted = 0)
    BEGIN
        RAISERROR('The specified category does not exist.', 16, 1);
        RETURN;
    END;

    -- Validate DietaryType
    IF @DietaryType NOT IN ('VEG', 'NON_VEG', 'VEGAN', 'EGG', 'HALAL')
    BEGIN
        RAISERROR('Invalid dietary type. Must be VEG, NON_VEG, VEGAN, EGG, or HALAL.', 16, 1);
        RETURN;
    END;

    -- Validate unique ItemCode per Branch (excluding current item)
    IF EXISTS (
        SELECT 1 FROM dbo.MenuItems 
        WHERE BranchId = @BranchId 
          AND ItemCode = @ItemCode 
          AND MenuItemId <> @MenuItemId
          AND IsDeleted = 0
    )
    BEGIN
        RAISERROR('A menu item with this item code already exists for the branch.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.MenuItems
    SET CategoryId = @CategoryId,
        ItemCode = @ItemCode,
        ItemName = @ItemName,
        Description = @Description,
        BasePrice = @BasePrice,
        CostPrice = ISNULL(@CostPrice, CostPrice),
        TaxPercentage = ISNULL(@TaxPercentage, TaxPercentage),
        DietaryType = @DietaryType,
        SpicyLevel = ISNULL(@SpicyLevel, SpicyLevel),
        PreparationTimeMinutes = ISNULL(@PreparationTimeMinutes, PreparationTimeMinutes),
        IsAvailable = ISNULL(@IsAvailable, IsAvailable),
        IsFeatured = ISNULL(@IsFeatured, IsFeatured),
        DisplayOrder = ISNULL(@DisplayOrder, DisplayOrder),
        UpdatedAt = SYSUTCDATETIME()
    WHERE MenuItemId = @MenuItemId;

    SELECT 
        m.MenuItemId,
        m.BranchId,
        b.BranchName,
        m.CategoryId,
        c.CategoryName,
        c.CategorySlug,
        m.ItemCode,
        m.ItemName,
        m.Description,
        m.BasePrice,
        m.CostPrice,
        m.TaxPercentage,
        m.DietaryType,
        m.SpicyLevel,
        m.PreparationTimeMinutes,
        m.IsAvailable,
        m.IsFeatured,
        m.DisplayOrder,
        m.CreatedAt,
        m.UpdatedAt
    FROM dbo.MenuItems m
    JOIN dbo.Branches b ON m.BranchId = b.BranchId
    JOIN dbo.Categories c ON m.CategoryId = c.CategoryId
    WHERE m.MenuItemId = @MenuItemId;
END;
GO

-- 2.3 usp_MenuItem_GetById (Multi-recordset: item details, variants, addons, images)
CREATE OR ALTER PROCEDURE dbo.usp_MenuItem_GetById
    @MenuItemId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 1: MenuItem Details
    SELECT 
        m.MenuItemId,
        m.BranchId,
        b.BranchName,
        m.CategoryId,
        c.CategoryName,
        c.CategorySlug,
        m.ItemCode,
        m.ItemName,
        m.Description,
        m.BasePrice,
        m.CostPrice,
        m.TaxPercentage,
        m.DietaryType,
        m.SpicyLevel,
        m.PreparationTimeMinutes,
        m.IsAvailable,
        m.IsFeatured,
        m.DisplayOrder,
        m.CreatedAt,
        m.UpdatedAt
    FROM dbo.MenuItems m
    JOIN dbo.Branches b ON m.BranchId = b.BranchId
    JOIN dbo.Categories c ON m.CategoryId = c.CategoryId
    WHERE m.MenuItemId = @MenuItemId AND m.IsDeleted = 0;

    -- Recordset 2: Variants
    SELECT 
        VariantId,
        MenuItemId,
        VariantName,
        SKU,
        PriceAdjustment,
        IsDefault,
        IsAvailable,
        CreatedAt,
        UpdatedAt
    FROM dbo.MenuItemVariants
    WHERE MenuItemId = @MenuItemId AND IsDeleted = 0
    ORDER BY IsDefault DESC, PriceAdjustment ASC;

    -- Recordset 3: Addon Groups & Items linked to this item
    SELECT 
        ag.AddonGroupId,
        ag.GroupName,
        ag.MinSelections,
        ag.MaxSelections,
        ag.IsActive,
        miag.DisplayOrder AS GroupDisplayOrder,
        ai.AddonItemId,
        ai.ItemName AS AddonItemName,
        ai.Price AS AddonPrice,
        ai.IsAvailable AS AddonIsAvailable
    FROM dbo.MenuItemAddonGroups miag
    JOIN dbo.AddonGroups ag ON miag.AddonGroupId = ag.AddonGroupId
    LEFT JOIN dbo.AddonItems ai ON ag.AddonGroupId = ai.AddonGroupId AND ai.IsDeleted = 0
    WHERE miag.MenuItemId = @MenuItemId AND ag.IsActive = 1
    ORDER BY miag.DisplayOrder ASC, ag.AddonGroupId ASC, ai.Price ASC;

    -- Recordset 4: Images
    SELECT 
        ImageId,
        MenuItemId,
        ImageUrl,
        IsPrimary,
        DisplayOrder,
        CreatedAt
    FROM dbo.MenuItemImages
    WHERE MenuItemId = @MenuItemId
    ORDER BY IsPrimary DESC, DisplayOrder ASC;
END;
GO

-- 2.4 usp_MenuItem_ListByBranch (Paginated with search and filters)
CREATE OR ALTER PROCEDURE dbo.usp_MenuItem_ListByBranch
    @BranchId INT,
    @CategoryId INT = NULL,
    @DietaryType NVARCHAR(30) = NULL,
    @IsFeatured BIT = NULL,
    @IsAvailable BIT = NULL,
    @Search NVARCHAR(100) = NULL,
    @Page INT = 1,
    @Limit INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    SET @Page = ISNULL(@Page, 1);
    IF @Page < 1 SET @Page = 1;
    SET @Limit = ISNULL(@Limit, 50);
    IF @Limit < 1 SET @Limit = 50;
    IF @Limit > 200 SET @Limit = 200;

    DECLARE @Offset INT = (@Page - 1) * @Limit;

    -- Total Count
    DECLARE @TotalCount INT;

    SELECT @TotalCount = COUNT(1)
    FROM dbo.MenuItems m
    WHERE m.BranchId = @BranchId 
      AND m.IsDeleted = 0
      AND (@CategoryId IS NULL OR m.CategoryId = @CategoryId)
      AND (@DietaryType IS NULL OR m.DietaryType = @DietaryType)
      AND (@IsFeatured IS NULL OR m.IsFeatured = @IsFeatured)
      AND (@IsAvailable IS NULL OR m.IsAvailable = @IsAvailable)
      AND (@Search IS NULL OR m.ItemName LIKE '%' + @Search + '%' OR m.ItemCode LIKE '%' + @Search + '%');

    -- Paginated Items
    SELECT 
        m.MenuItemId,
        m.BranchId,
        m.CategoryId,
        c.CategoryName,
        c.CategorySlug,
        m.ItemCode,
        m.ItemName,
        m.Description,
        m.BasePrice,
        m.CostPrice,
        m.TaxPercentage,
        m.DietaryType,
        m.SpicyLevel,
        m.PreparationTimeMinutes,
        m.IsAvailable,
        m.IsFeatured,
        m.DisplayOrder,
        m.CreatedAt,
        m.UpdatedAt,
        (
            SELECT TOP 1 ImageUrl 
            FROM dbo.MenuItemImages img 
            WHERE img.MenuItemId = m.MenuItemId 
            ORDER BY img.IsPrimary DESC, img.DisplayOrder ASC
        ) AS PrimaryImageUrl,
        (
            SELECT COUNT(1) 
            FROM dbo.MenuItemVariants v 
            WHERE v.MenuItemId = m.MenuItemId AND v.IsDeleted = 0
        ) AS VariantCount,
        @TotalCount AS TotalCount,
        @Page AS CurrentPage,
        CEILING(CAST(@TotalCount AS FLOAT) / @Limit) AS TotalPages
    FROM dbo.MenuItems m
    JOIN dbo.Categories c ON m.CategoryId = c.CategoryId
    WHERE m.BranchId = @BranchId 
      AND m.IsDeleted = 0
      AND (@CategoryId IS NULL OR m.CategoryId = @CategoryId)
      AND (@DietaryType IS NULL OR m.DietaryType = @DietaryType)
      AND (@IsFeatured IS NULL OR m.IsFeatured = @IsFeatured)
      AND (@IsAvailable IS NULL OR m.IsAvailable = @IsAvailable)
      AND (@Search IS NULL OR m.ItemName LIKE '%' + @Search + '%' OR m.ItemCode LIKE '%' + @Search + '%')
    ORDER BY m.DisplayOrder ASC, m.ItemName ASC
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY;
END;
GO

-- 2.5 usp_MenuItem_SetAvailability (The "86" toggle)
CREATE OR ALTER PROCEDURE dbo.usp_MenuItem_SetAvailability
    @MenuItemId BIGINT,
    @IsAvailable BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuItems WHERE MenuItemId = @MenuItemId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Menu item not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.MenuItems
    SET IsAvailable = @IsAvailable,
        UpdatedAt = SYSUTCDATETIME()
    WHERE MenuItemId = @MenuItemId;

    SELECT 
        MenuItemId,
        BranchId,
        ItemCode,
        ItemName,
        IsAvailable,
        UpdatedAt
    FROM dbo.MenuItems
    WHERE MenuItemId = @MenuItemId;
END;
GO

-- 2.6 usp_MenuItem_UpdatePricing
CREATE OR ALTER PROCEDURE dbo.usp_MenuItem_UpdatePricing
    @MenuItemId BIGINT,
    @BasePrice DECIMAL(10,2),
    @CostPrice DECIMAL(10,2) = NULL,
    @TaxPercentage DECIMAL(5,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuItems WHERE MenuItemId = @MenuItemId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Menu item not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.MenuItems
    SET BasePrice = @BasePrice,
        CostPrice = ISNULL(@CostPrice, CostPrice),
        TaxPercentage = ISNULL(@TaxPercentage, TaxPercentage),
        UpdatedAt = SYSUTCDATETIME()
    WHERE MenuItemId = @MenuItemId;

    SELECT 
        MenuItemId,
        BranchId,
        ItemCode,
        ItemName,
        BasePrice,
        CostPrice,
        TaxPercentage,
        UpdatedAt
    FROM dbo.MenuItems
    WHERE MenuItemId = @MenuItemId;
END;
GO

-- 2.7 usp_MenuItem_Delete
CREATE OR ALTER PROCEDURE dbo.usp_MenuItem_Delete
    @MenuItemId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuItems WHERE MenuItemId = @MenuItemId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Menu item not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.MenuItems
    SET IsDeleted = 1,
        DeletedAt = SYSUTCDATETIME(),
        UpdatedAt = SYSUTCDATETIME()
    WHERE MenuItemId = @MenuItemId;

    SELECT @MenuItemId AS DeletedMenuItemId, 1 AS Success;
END;
GO


-- ============================================================================
-- 3. MENU ITEM VARIANTS PROCEDURES
-- ============================================================================

-- 3.1 usp_MenuItemVariant_Create
CREATE OR ALTER PROCEDURE dbo.usp_MenuItemVariant_Create
    @MenuItemId BIGINT,
    @VariantName NVARCHAR(60),
    @SKU NVARCHAR(50) = NULL,
    @PriceAdjustment DECIMAL(10,2) = 0.00,
    @IsDefault BIT = 0,
    @IsAvailable BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuItems WHERE MenuItemId = @MenuItemId AND IsDeleted = 0)
    BEGIN
        RAISERROR('The specified menu item does not exist.', 16, 1);
        RETURN;
    END;

    -- If default variant is specified, clear existing default for this item
    IF @IsDefault = 1
    BEGIN
        UPDATE dbo.MenuItemVariants
        SET IsDefault = 0,
            UpdatedAt = SYSUTCDATETIME()
        WHERE MenuItemId = @MenuItemId AND IsDeleted = 0;
    END;

    INSERT INTO dbo.MenuItemVariants (
        MenuItemId,
        VariantName,
        SKU,
        PriceAdjustment,
        IsDefault,
        IsAvailable,
        CreatedAt,
        UpdatedAt,
        IsDeleted
    ) VALUES (
        @MenuItemId,
        @VariantName,
        @SKU,
        ISNULL(@PriceAdjustment, 0.00),
        ISNULL(@IsDefault, 0),
        ISNULL(@IsAvailable, 1),
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        0
    );

    DECLARE @NewVariantId BIGINT = SCOPE_IDENTITY();

    SELECT 
        VariantId,
        MenuItemId,
        VariantName,
        SKU,
        PriceAdjustment,
        IsDefault,
        IsAvailable,
        CreatedAt,
        UpdatedAt
    FROM dbo.MenuItemVariants
    WHERE VariantId = @NewVariantId;
END;
GO

-- 3.2 usp_MenuItemVariant_Update
CREATE OR ALTER PROCEDURE dbo.usp_MenuItemVariant_Update
    @VariantId BIGINT,
    @VariantName NVARCHAR(60),
    @SKU NVARCHAR(50) = NULL,
    @PriceAdjustment DECIMAL(10,2) = 0.00,
    @IsDefault BIT = 0,
    @IsAvailable BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @MenuItemId BIGINT;

    SELECT @MenuItemId = MenuItemId 
    FROM dbo.MenuItemVariants 
    WHERE VariantId = @VariantId AND IsDeleted = 0;

    IF @MenuItemId IS NULL
    BEGIN
        RAISERROR('Variant not found.', 16, 1);
        RETURN;
    END;

    -- If default variant is set, reset others
    IF @IsDefault = 1
    BEGIN
        UPDATE dbo.MenuItemVariants
        SET IsDefault = 0,
            UpdatedAt = SYSUTCDATETIME()
        WHERE MenuItemId = @MenuItemId AND VariantId <> @VariantId AND IsDeleted = 0;
    END;

    UPDATE dbo.MenuItemVariants
    SET VariantName = @VariantName,
        SKU = @SKU,
        PriceAdjustment = ISNULL(@PriceAdjustment, PriceAdjustment),
        IsDefault = ISNULL(@IsDefault, IsDefault),
        IsAvailable = ISNULL(@IsAvailable, IsAvailable),
        UpdatedAt = SYSUTCDATETIME()
    WHERE VariantId = @VariantId;

    SELECT 
        VariantId,
        MenuItemId,
        VariantName,
        SKU,
        PriceAdjustment,
        IsDefault,
        IsAvailable,
        CreatedAt,
        UpdatedAt
    FROM dbo.MenuItemVariants
    WHERE VariantId = @VariantId;
END;
GO

-- 3.3 usp_MenuItemVariant_SetAvailability
CREATE OR ALTER PROCEDURE dbo.usp_MenuItemVariant_SetAvailability
    @VariantId BIGINT,
    @IsAvailable BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuItemVariants WHERE VariantId = @VariantId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Variant not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.MenuItemVariants
    SET IsAvailable = @IsAvailable,
        UpdatedAt = SYSUTCDATETIME()
    WHERE VariantId = @VariantId;

    SELECT 
        VariantId,
        MenuItemId,
        VariantName,
        IsAvailable,
        UpdatedAt
    FROM dbo.MenuItemVariants
    WHERE VariantId = @VariantId;
END;
GO

-- 3.4 usp_MenuItemVariant_Delete
CREATE OR ALTER PROCEDURE dbo.usp_MenuItemVariant_Delete
    @VariantId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuItemVariants WHERE VariantId = @VariantId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Variant not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.MenuItemVariants
    SET IsDeleted = 1,
        DeletedAt = SYSUTCDATETIME(),
        UpdatedAt = SYSUTCDATETIME()
    WHERE VariantId = @VariantId;

    SELECT @VariantId AS DeletedVariantId, 1 AS Success;
END;
GO

-- 3.5 usp_MenuItemVariant_ListByItem
CREATE OR ALTER PROCEDURE dbo.usp_MenuItemVariant_ListByItem
    @MenuItemId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        VariantId,
        MenuItemId,
        VariantName,
        SKU,
        PriceAdjustment,
        IsDefault,
        IsAvailable,
        CreatedAt,
        UpdatedAt
    FROM dbo.MenuItemVariants
    WHERE MenuItemId = @MenuItemId AND IsDeleted = 0
    ORDER BY IsDefault DESC, PriceAdjustment ASC;
END;
GO


-- ============================================================================
-- 4. MENU ITEM IMAGES PROCEDURES
-- ============================================================================

-- 4.1 usp_MenuItemImage_Add
CREATE OR ALTER PROCEDURE dbo.usp_MenuItemImage_Add
    @MenuItemId BIGINT,
    @ImageUrl NVARCHAR(500),
    @IsPrimary BIT = 0,
    @DisplayOrder INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuItems WHERE MenuItemId = @MenuItemId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Menu item not found.', 16, 1);
        RETURN;
    END;

    -- If primary image, clear primary flag on other images
    IF @IsPrimary = 1
    BEGIN
        UPDATE dbo.MenuItemImages
        SET IsPrimary = 0
        WHERE MenuItemId = @MenuItemId;
    END;

    INSERT INTO dbo.MenuItemImages (
        MenuItemId,
        ImageUrl,
        IsPrimary,
        DisplayOrder,
        CreatedAt
    ) VALUES (
        @MenuItemId,
        @ImageUrl,
        ISNULL(@IsPrimary, 0),
        ISNULL(@DisplayOrder, 0),
        SYSUTCDATETIME()
    );

    DECLARE @NewImageId BIGINT = SCOPE_IDENTITY();

    SELECT 
        ImageId,
        MenuItemId,
        ImageUrl,
        IsPrimary,
        DisplayOrder,
        CreatedAt
    FROM dbo.MenuItemImages
    WHERE ImageId = @NewImageId;
END;
GO

-- 4.2 usp_MenuItemImage_Delete
CREATE OR ALTER PROCEDURE dbo.usp_MenuItemImage_Delete
    @ImageId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuItemImages WHERE ImageId = @ImageId)
    BEGIN
        RAISERROR('Image not found.', 16, 1);
        RETURN;
    END;

    DELETE FROM dbo.MenuItemImages WHERE ImageId = @ImageId;

    SELECT @ImageId AS DeletedImageId, 1 AS Success;
END;
GO

-- 4.3 usp_MenuItemImage_SetPrimary
CREATE OR ALTER PROCEDURE dbo.usp_MenuItemImage_SetPrimary
    @ImageId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @MenuItemId BIGINT;

    SELECT @MenuItemId = MenuItemId 
    FROM dbo.MenuItemImages 
    WHERE ImageId = @ImageId;

    IF @MenuItemId IS NULL
    BEGIN
        RAISERROR('Image not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.MenuItemImages
    SET IsPrimary = 0
    WHERE MenuItemId = @MenuItemId;

    UPDATE dbo.MenuItemImages
    SET IsPrimary = 1
    WHERE ImageId = @ImageId;

    SELECT 
        ImageId,
        MenuItemId,
        ImageUrl,
        IsPrimary,
        DisplayOrder
    FROM dbo.MenuItemImages
    WHERE ImageId = @ImageId;
END;
GO

-- 4.4 usp_MenuItemImage_ListByItem
CREATE OR ALTER PROCEDURE dbo.usp_MenuItemImage_ListByItem
    @MenuItemId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        ImageId,
        MenuItemId,
        ImageUrl,
        IsPrimary,
        DisplayOrder,
        CreatedAt
    FROM dbo.MenuItemImages
    WHERE MenuItemId = @MenuItemId
    ORDER BY IsPrimary DESC, DisplayOrder ASC;
END;
GO


-- ============================================================================
-- 5. ADDON GROUPS & ADDON ITEMS PROCEDURES
-- ============================================================================

-- 5.1 usp_AddonGroup_Create
CREATE OR ALTER PROCEDURE dbo.usp_AddonGroup_Create
    @BranchId INT = NULL,
    @GroupName NVARCHAR(80),
    @MinSelections INT = 0,
    @MaxSelections INT = 10,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF @BranchId IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.Branches WHERE BranchId = @BranchId AND IsDeleted = 0
    )
    BEGIN
        RAISERROR('The specified branch does not exist.', 16, 1);
        RETURN;
    END;

    INSERT INTO dbo.AddonGroups (
        BranchId,
        GroupName,
        MinSelections,
        MaxSelections,
        IsActive,
        CreatedAt,
        UpdatedAt
    ) VALUES (
        @BranchId,
        @GroupName,
        ISNULL(@MinSelections, 0),
        ISNULL(@MaxSelections, 10),
        ISNULL(@IsActive, 1),
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );

    DECLARE @NewGroupId INT = SCOPE_IDENTITY();

    SELECT 
        AddonGroupId,
        BranchId,
        GroupName,
        MinSelections,
        MaxSelections,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.AddonGroups
    WHERE AddonGroupId = @NewGroupId;
END;
GO

-- 5.2 usp_AddonGroup_Update
CREATE OR ALTER PROCEDURE dbo.usp_AddonGroup_Update
    @AddonGroupId INT,
    @GroupName NVARCHAR(80),
    @MinSelections INT = 0,
    @MaxSelections INT = 10,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.AddonGroups WHERE AddonGroupId = @AddonGroupId)
    BEGIN
        RAISERROR('Addon group not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.AddonGroups
    SET GroupName = @GroupName,
        MinSelections = ISNULL(@MinSelections, MinSelections),
        MaxSelections = ISNULL(@MaxSelections, MaxSelections),
        IsActive = ISNULL(@IsActive, IsActive),
        UpdatedAt = SYSUTCDATETIME()
    WHERE AddonGroupId = @AddonGroupId;

    SELECT 
        AddonGroupId,
        BranchId,
        GroupName,
        MinSelections,
        MaxSelections,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.AddonGroups
    WHERE AddonGroupId = @AddonGroupId;
END;
GO

-- 5.3 usp_AddonGroup_GetById
CREATE OR ALTER PROCEDURE dbo.usp_AddonGroup_GetById
    @AddonGroupId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 1: Group
    SELECT 
        ag.AddonGroupId,
        ag.BranchId,
        b.BranchName,
        ag.GroupName,
        ag.MinSelections,
        ag.MaxSelections,
        ag.IsActive,
        ag.CreatedAt,
        ag.UpdatedAt
    FROM dbo.AddonGroups ag
    LEFT JOIN dbo.Branches b ON ag.BranchId = b.BranchId
    WHERE ag.AddonGroupId = @AddonGroupId;

    -- Recordset 2: Items
    SELECT 
        AddonItemId,
        AddonGroupId,
        ItemName,
        Price,
        IsAvailable,
        CreatedAt,
        UpdatedAt
    FROM dbo.AddonItems
    WHERE AddonGroupId = @AddonGroupId AND IsDeleted = 0
    ORDER BY Price ASC, ItemName ASC;
END;
GO

-- 5.4 usp_AddonGroup_ListByBranch
CREATE OR ALTER PROCEDURE dbo.usp_AddonGroup_ListByBranch
    @BranchId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        ag.AddonGroupId,
        ag.BranchId,
        b.BranchName,
        ag.GroupName,
        ag.MinSelections,
        ag.MaxSelections,
        ag.IsActive,
        ag.CreatedAt,
        ag.UpdatedAt,
        (SELECT COUNT(1) FROM dbo.AddonItems ai WHERE ai.AddonGroupId = ag.AddonGroupId AND ai.IsDeleted = 0) AS ItemCount,
        (SELECT COUNT(1) FROM dbo.MenuItemAddonGroups miag WHERE miag.AddonGroupId = ag.AddonGroupId) AS LinkedItemCount
    FROM dbo.AddonGroups ag
    LEFT JOIN dbo.Branches b ON ag.BranchId = b.BranchId
    WHERE (@BranchId IS NULL OR ag.BranchId = @BranchId OR ag.BranchId IS NULL)
    ORDER BY ag.GroupName ASC;
END;
GO

-- 5.5 usp_AddonGroup_LinkToMenuItem
CREATE OR ALTER PROCEDURE dbo.usp_AddonGroup_LinkToMenuItem
    @MenuItemId BIGINT,
    @AddonGroupId INT,
    @DisplayOrder INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuItems WHERE MenuItemId = @MenuItemId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Menu item not found.', 16, 1);
        RETURN;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.AddonGroups WHERE AddonGroupId = @AddonGroupId AND IsActive = 1)
    BEGIN
        RAISERROR('Addon group not found or is inactive.', 16, 1);
        RETURN;
    END;

    IF EXISTS (SELECT 1 FROM dbo.MenuItemAddonGroups WHERE MenuItemId = @MenuItemId AND AddonGroupId = @AddonGroupId)
    BEGIN
        UPDATE dbo.MenuItemAddonGroups
        SET DisplayOrder = ISNULL(@DisplayOrder, DisplayOrder)
        WHERE MenuItemId = @MenuItemId AND AddonGroupId = @AddonGroupId;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.MenuItemAddonGroups (MenuItemId, AddonGroupId, DisplayOrder)
        VALUES (@MenuItemId, @AddonGroupId, ISNULL(@DisplayOrder, 0));
    END;

    SELECT 
        miag.MenuItemId,
        miag.AddonGroupId,
        ag.GroupName,
        miag.DisplayOrder
    FROM dbo.MenuItemAddonGroups miag
    JOIN dbo.AddonGroups ag ON miag.AddonGroupId = ag.AddonGroupId
    WHERE miag.MenuItemId = @MenuItemId AND miag.AddonGroupId = @AddonGroupId;
END;
GO

-- 5.6 usp_AddonGroup_UnlinkFromMenuItem
CREATE OR ALTER PROCEDURE dbo.usp_AddonGroup_UnlinkFromMenuItem
    @MenuItemId BIGINT,
    @AddonGroupId INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.MenuItemAddonGroups 
    WHERE MenuItemId = @MenuItemId AND AddonGroupId = @AddonGroupId;

    SELECT @MenuItemId AS MenuItemId, @AddonGroupId AS AddonGroupId, 1 AS Success;
END;
GO

-- 5.7 usp_AddonItem_Create
CREATE OR ALTER PROCEDURE dbo.usp_AddonItem_Create
    @AddonGroupId INT,
    @ItemName NVARCHAR(80),
    @Price DECIMAL(10,2) = 0.00,
    @IsAvailable BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.AddonGroups WHERE AddonGroupId = @AddonGroupId)
    BEGIN
        RAISERROR('Addon group not found.', 16, 1);
        RETURN;
    END;

    INSERT INTO dbo.AddonItems (
        AddonGroupId,
        ItemName,
        Price,
        IsAvailable,
        CreatedAt,
        UpdatedAt,
        IsDeleted
    ) VALUES (
        @AddonGroupId,
        @ItemName,
        ISNULL(@Price, 0.00),
        ISNULL(@IsAvailable, 1),
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        0
    );

    DECLARE @NewItemId BIGINT = SCOPE_IDENTITY();

    SELECT 
        AddonItemId,
        AddonGroupId,
        ItemName,
        Price,
        IsAvailable,
        CreatedAt,
        UpdatedAt
    FROM dbo.AddonItems
    WHERE AddonItemId = @NewItemId;
END;
GO

-- 5.8 usp_AddonItem_Update
CREATE OR ALTER PROCEDURE dbo.usp_AddonItem_Update
    @AddonItemId BIGINT,
    @ItemName NVARCHAR(80),
    @Price DECIMAL(10,2) = 0.00,
    @IsAvailable BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.AddonItems WHERE AddonItemId = @AddonItemId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Addon item not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.AddonItems
    SET ItemName = @ItemName,
        Price = ISNULL(@Price, Price),
        IsAvailable = ISNULL(@IsAvailable, IsAvailable),
        UpdatedAt = SYSUTCDATETIME()
    WHERE AddonItemId = @AddonItemId;

    SELECT 
        AddonItemId,
        AddonGroupId,
        ItemName,
        Price,
        IsAvailable,
        CreatedAt,
        UpdatedAt
    FROM dbo.AddonItems
    WHERE AddonItemId = @AddonItemId;
END;
GO

-- 5.9 usp_AddonItem_SetAvailability
CREATE OR ALTER PROCEDURE dbo.usp_AddonItem_SetAvailability
    @AddonItemId BIGINT,
    @IsAvailable BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.AddonItems WHERE AddonItemId = @AddonItemId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Addon item not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.AddonItems
    SET IsAvailable = @IsAvailable,
        UpdatedAt = SYSUTCDATETIME()
    WHERE AddonItemId = @AddonItemId;

    SELECT 
        AddonItemId,
        AddonGroupId,
        ItemName,
        IsAvailable,
        UpdatedAt
    FROM dbo.AddonItems
    WHERE AddonItemId = @AddonItemId;
END;
GO

-- 5.10 usp_AddonItem_Delete
CREATE OR ALTER PROCEDURE dbo.usp_AddonItem_Delete
    @AddonItemId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.AddonItems WHERE AddonItemId = @AddonItemId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Addon item not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.AddonItems
    SET IsDeleted = 1,
        DeletedAt = SYSUTCDATETIME(),
        UpdatedAt = SYSUTCDATETIME()
    WHERE AddonItemId = @AddonItemId;

    SELECT @AddonItemId AS DeletedAddonItemId, 1 AS Success;
END;
GO


-- ============================================================================
-- 6. PUBLIC MENU CATALOG ENGINE (Multi-Recordset Customer Catalog)
-- ============================================================================

-- 6.1 usp_Menu_GetCatalogByBranch
CREATE OR ALTER PROCEDURE dbo.usp_Menu_GetCatalogByBranch
    @BranchId INT,
    @CategoryId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate Branch
    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchId = @BranchId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Branch not found.', 16, 1);
        RETURN;
    END;

    -- Recordset 1: Categories
    SELECT 
        c.CategoryId,
        c.ParentCategoryId,
        c.CategoryName,
        c.CategorySlug,
        c.Description,
        c.DisplayOrder,
        c.ImageUrl
    FROM dbo.Categories c
    WHERE c.IsDeleted = 0 
      AND c.IsActive = 1
      AND (c.BranchId = @BranchId OR c.BranchId IS NULL)
      AND (@CategoryId IS NULL OR c.CategoryId = @CategoryId OR c.ParentCategoryId = @CategoryId)
    ORDER BY c.DisplayOrder ASC, c.CategoryName ASC;

    -- Recordset 2: Available Menu Items
    SELECT 
        m.MenuItemId,
        m.BranchId,
        m.CategoryId,
        m.ItemCode,
        m.ItemName,
        m.Description,
        m.BasePrice,
        m.TaxPercentage,
        m.DietaryType,
        m.SpicyLevel,
        m.PreparationTimeMinutes,
        m.IsFeatured,
        m.DisplayOrder,
        (
            SELECT TOP 1 img.ImageUrl 
            FROM dbo.MenuItemImages img 
            WHERE img.MenuItemId = m.MenuItemId 
            ORDER BY img.IsPrimary DESC, img.DisplayOrder ASC
        ) AS PrimaryImageUrl
    FROM dbo.MenuItems m
    WHERE m.BranchId = @BranchId 
      AND m.IsDeleted = 0 
      AND m.IsAvailable = 1
      AND (@CategoryId IS NULL OR m.CategoryId = @CategoryId)
    ORDER BY m.DisplayOrder ASC, m.ItemName ASC;

    -- Recordset 3: Available Variants for these items
    SELECT 
        v.VariantId,
        v.MenuItemId,
        v.VariantName,
        v.SKU,
        v.PriceAdjustment,
        v.IsDefault
    FROM dbo.MenuItemVariants v
    JOIN dbo.MenuItems m ON v.MenuItemId = m.MenuItemId
    WHERE m.BranchId = @BranchId 
      AND m.IsDeleted = 0 
      AND m.IsAvailable = 1
      AND v.IsDeleted = 0 
      AND v.IsAvailable = 1
      AND (@CategoryId IS NULL OR m.CategoryId = @CategoryId)
    ORDER BY v.MenuItemId ASC, v.IsDefault DESC, v.PriceAdjustment ASC;

    -- Recordset 4: Addon Groups & Items for these items
    SELECT 
        miag.MenuItemId,
        ag.AddonGroupId,
        ag.GroupName,
        ag.MinSelections,
        ag.MaxSelections,
        miag.DisplayOrder AS GroupDisplayOrder,
        ai.AddonItemId,
        ai.ItemName AS AddonItemName,
        ai.Price AS AddonPrice
    FROM dbo.MenuItemAddonGroups miag
    JOIN dbo.MenuItems m ON miag.MenuItemId = m.MenuItemId
    JOIN dbo.AddonGroups ag ON miag.AddonGroupId = ag.AddonGroupId
    JOIN dbo.AddonItems ai ON ag.AddonGroupId = ai.AddonGroupId AND ai.IsDeleted = 0 AND ai.IsAvailable = 1
    WHERE m.BranchId = @BranchId 
      AND m.IsDeleted = 0 
      AND m.IsAvailable = 1
      AND ag.IsActive = 1
      AND (@CategoryId IS NULL OR m.CategoryId = @CategoryId)
    ORDER BY miag.MenuItemId ASC, miag.DisplayOrder ASC, ai.Price ASC;

    -- Recordset 5: All Images for these items
    SELECT 
        img.ImageId,
        img.MenuItemId,
        img.ImageUrl,
        img.IsPrimary,
        img.DisplayOrder
    FROM dbo.MenuItemImages img
    JOIN dbo.MenuItems m ON img.MenuItemId = m.MenuItemId
    WHERE m.BranchId = @BranchId 
      AND m.IsDeleted = 0 
      AND m.IsAvailable = 1
      AND (@CategoryId IS NULL OR m.CategoryId = @CategoryId)
    ORDER BY img.MenuItemId ASC, img.IsPrimary DESC, img.DisplayOrder ASC;
END;
GO

PRINT 'Menu Service stored procedures successfully created/updated in RestaurantManagementDB.';
GO

