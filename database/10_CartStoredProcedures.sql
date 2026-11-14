-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS) - CART SERVICE STORED PROCEDURES
-- File: database/10_CartStoredProcedures.sql
-- Description: Stored procedures for shopping cart creation, item management,
--              variants & addons attachment, live total calculations, and clearing.
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
-- 1. usp_Cart_GetOrCreate
-- Description: Retrieves an existing active cart by UserId or SessionToken,
--              or initializes a new ShoppingCarts record with 7-day TTL.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Cart_GetOrCreate
    @BranchId INT,
    @UserId BIGINT = NULL,
    @SessionToken NVARCHAR(120),
    @TableId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate Branch
    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchId = @BranchId AND IsDeleted = 0)
    BEGIN
        RAISERROR('The specified branch does not exist.', 16, 1);
        RETURN;
    END;

    -- Validate Table if provided
    IF @TableId IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.RestaurantTables WHERE TableId = @TableId AND BranchId = @BranchId AND IsDeleted = 0
    )
    BEGIN
        RAISERROR('The specified table does not belong to the selected branch.', 16, 1);
        RETURN;
    END;

    DECLARE @CartId BIGINT = NULL;

    -- 1. Try to find active non-expired cart by UserId (if authenticated)
    IF @UserId IS NOT NULL
    BEGIN
        SELECT TOP 1 @CartId = CartId
        FROM dbo.ShoppingCarts
        WHERE UserId = @UserId 
          AND BranchId = @BranchId 
          AND ExpiresAt > SYSUTCDATETIME()
        ORDER BY UpdatedAt DESC;
    END;

    -- 2. If not found by UserId, search by SessionToken
    IF @CartId IS NULL
    BEGIN
        SELECT TOP 1 @CartId = CartId
        FROM dbo.ShoppingCarts
        WHERE SessionToken = @SessionToken 
          AND ExpiresAt > SYSUTCDATETIME();
    END;

    -- 3. If found, update contextual fields and extend expiration
    IF @CartId IS NOT NULL
    BEGIN
        UPDATE dbo.ShoppingCarts
        SET BranchId = @BranchId,
            UserId = ISNULL(@UserId, UserId),
            TableId = ISNULL(@TableId, TableId),
            SessionToken = @SessionToken,
            ExpiresAt = DATEADD(DAY, 7, SYSUTCDATETIME()),
            UpdatedAt = SYSUTCDATETIME()
        WHERE CartId = @CartId;
    END
    ELSE
    BEGIN
        -- 4. Create fresh Cart record
        INSERT INTO dbo.ShoppingCarts (
            BranchId,
            TableId,
            UserId,
            SessionToken,
            SubTotal,
            TaxTotal,
            GrandTotal,
            CreatedAt,
            UpdatedAt,
            ExpiresAt
        ) VALUES (
            @BranchId,
            @TableId,
            @UserId,
            @SessionToken,
            0.00,
            0.00,
            0.00,
            SYSUTCDATETIME(),
            SYSUTCDATETIME(),
            DATEADD(DAY, 7, SYSUTCDATETIME())
        );

        SET @CartId = SCOPE_IDENTITY();
    END;

    -- 5. Return complete cart details via standard GetById
    EXEC dbo.usp_Cart_GetById @CartId = @CartId;
END;
GO

-- ============================================================================
-- 2. usp_Cart_GetById
-- Description: Multi-recordset query returning Cart Header, Items, and Addons.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Cart_GetById
    @CartId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 1: Cart Header
    SELECT 
        c.CartId,
        c.BranchId,
        b.BranchName,
        c.TableId,
        t.TableNumber,
        c.UserId,
        u.Email AS UserEmail,
        u.FirstName + ' ' + u.LastName AS UserName,
        c.SessionToken,
        c.SubTotal,
        c.TaxTotal,
        c.GrandTotal,
        c.CreatedAt,
        c.UpdatedAt,
        c.ExpiresAt,
        (SELECT ISNULL(SUM(ci.Quantity), 0) FROM dbo.CartItems ci WHERE ci.CartId = c.CartId) AS TotalItemsCount
    FROM dbo.ShoppingCarts c
    JOIN dbo.Branches b ON c.BranchId = b.BranchId
    LEFT JOIN dbo.RestaurantTables t ON c.TableId = t.TableId
    LEFT JOIN dbo.Users u ON c.UserId = u.UserId
    WHERE c.CartId = @CartId;

    -- Recordset 2: Cart Items
    SELECT 
        ci.CartItemId,
        ci.CartId,
        ci.MenuItemId,
        mi.ItemCode,
        mi.ItemName,
        mi.DietaryType,
        mi.SpicyLevel,
        ci.VariantId,
        v.VariantName,
        ci.Quantity,
        ci.UnitPrice,
        ci.TotalPrice,
        ci.SpecialInstructions,
        ci.CreatedAt,
        ci.UpdatedAt,
        (
            SELECT TOP 1 img.ImageUrl 
            FROM dbo.MenuItemImages img 
            WHERE img.MenuItemId = ci.MenuItemId 
            ORDER BY img.IsPrimary DESC, img.DisplayOrder ASC
        ) AS PrimaryImageUrl
    FROM dbo.CartItems ci
    JOIN dbo.MenuItems mi ON ci.MenuItemId = mi.MenuItemId
    LEFT JOIN dbo.MenuItemVariants v ON ci.VariantId = v.VariantId
    WHERE ci.CartId = @CartId
    ORDER BY ci.CreatedAt ASC;

    -- Recordset 3: Cart Item Addons
    SELECT 
        cia.CartItemAddonId,
        cia.CartItemId,
        cia.AddonItemId,
        ai.ItemName AS AddonItemName,
        cia.UnitPrice,
        cia.Quantity,
        cia.TotalPrice
    FROM dbo.CartItemAddons cia
    JOIN dbo.CartItems ci ON cia.CartItemId = ci.CartItemId
    JOIN dbo.AddonItems ai ON cia.AddonItemId = ai.AddonItemId
    WHERE ci.CartId = @CartId
    ORDER BY cia.CartItemId ASC, cia.CartItemAddonId ASC;
END;
GO

-- ============================================================================
-- 3. usp_Cart_GetByCustomerOrSession
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Cart_GetByCustomerOrSession
    @UserId BIGINT = NULL,
    @SessionToken NVARCHAR(120) = NULL,
    @BranchId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CartId BIGINT = NULL;

    IF @UserId IS NOT NULL
    BEGIN
        SELECT TOP 1 @CartId = CartId
        FROM dbo.ShoppingCarts
        WHERE UserId = @UserId 
          AND (@BranchId IS NULL OR BranchId = @BranchId)
          AND ExpiresAt > SYSUTCDATETIME()
        ORDER BY UpdatedAt DESC;
    END;

    IF @CartId IS NULL AND @SessionToken IS NOT NULL
    BEGIN
        SELECT TOP 1 @CartId = CartId
        FROM dbo.ShoppingCarts
        WHERE SessionToken = @SessionToken 
          AND (@BranchId IS NULL OR BranchId = @BranchId)
          AND ExpiresAt > SYSUTCDATETIME()
        ORDER BY UpdatedAt DESC;
    END;

    IF @CartId IS NULL
    BEGIN
        -- Return empty result sets
        SELECT TOP 0 * FROM dbo.ShoppingCarts;
        SELECT TOP 0 * FROM dbo.CartItems;
        SELECT TOP 0 * FROM dbo.CartItemAddons;
        RETURN;
    END;

    EXEC dbo.usp_Cart_GetById @CartId = @CartId;
END;
GO

-- ============================================================================
-- 4. usp_Cart_AddItem
-- Description: Adds a validated menu item + selected addons to the cart.
--              Automatically recalculates subtotal, tax and grand total.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Cart_AddItem
    @CartId BIGINT,
    @MenuItemId BIGINT,
    @VariantId BIGINT = NULL,
    @Quantity INT = 1,
    @UnitPrice DECIMAL(10,2),
    @SpecialInstructions NVARCHAR(255) = NULL,
    @AddonsJson NVARCHAR(MAX) = NULL -- JSON: [{"addonItemId": 1, "unitPrice": 80.00}]
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.ShoppingCarts WHERE CartId = @CartId)
    BEGIN
        RAISERROR('Cart not found.', 16, 1);
        RETURN;
    END;

    IF @Quantity < 1
    BEGIN
        RAISERROR('Quantity must be at least 1.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @ItemTotalPrice DECIMAL(10,2) = @UnitPrice * @Quantity;
        DECLARE @NewCartItemId BIGINT;

        -- Insert Cart Item
        INSERT INTO dbo.CartItems (
            CartId,
            MenuItemId,
            VariantId,
            Quantity,
            UnitPrice,
            TotalPrice,
            SpecialInstructions,
            CreatedAt,
            UpdatedAt
        ) VALUES (
            @CartId,
            @MenuItemId,
            @VariantId,
            @Quantity,
            @UnitPrice,
            @ItemTotalPrice,
            @SpecialInstructions,
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        );

        SET @NewCartItemId = SCOPE_IDENTITY();

        -- Insert Addons if provided
        IF @AddonsJson IS NOT NULL AND ISJSON(@AddonsJson) = 1
        BEGIN
            INSERT INTO dbo.CartItemAddons (
                CartItemId,
                AddonItemId,
                UnitPrice,
                Quantity,
                TotalPrice
            )
            SELECT 
                @NewCartItemId,
                CAST(JSON_VALUE(value, '$.addonItemId') AS BIGINT),
                CAST(JSON_VALUE(value, '$.unitPrice') AS DECIMAL(10,2)),
                @Quantity,
                (CAST(JSON_VALUE(value, '$.unitPrice') AS DECIMAL(10,2)) * @Quantity)
            FROM OPENJSON(@AddonsJson);
        END;

        -- Recalculate Cart Totals
        EXEC dbo.usp_Cart_RecalculateTotals @CartId = @CartId;

        COMMIT TRANSACTION;

        -- Return full cart state
        EXEC dbo.usp_Cart_GetById @CartId = @CartId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 5. usp_Cart_UpdateItemQuantity
-- Description: Updates the quantity of a specific cart item and its addons.
--              If quantity is <= 0, item and addons are removed.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Cart_UpdateItemQuantity
    @CartItemId BIGINT,
    @Quantity INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @CartId BIGINT;

    SELECT @CartId = CartId 
    FROM dbo.CartItems 
    WHERE CartItemId = @CartItemId;

    IF @CartId IS NULL
    BEGIN
        RAISERROR('Cart item not found.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF @Quantity <= 0
        BEGIN
            -- Delete Item (Cascade deletes CartItemAddons)
            DELETE FROM dbo.CartItems WHERE CartItemId = @CartItemId;
        END
        ELSE
        BEGIN
            -- Update Cart Item
            UPDATE dbo.CartItems
            SET Quantity = @Quantity,
                TotalPrice = UnitPrice * @Quantity,
                UpdatedAt = SYSUTCDATETIME()
            WHERE CartItemId = @CartItemId;

            -- Update linked addons quantity & total
            UPDATE dbo.CartItemAddons
            SET Quantity = @Quantity,
                TotalPrice = UnitPrice * @Quantity
            WHERE CartItemId = @CartItemId;
        END;

        -- Recalculate Cart Totals
        EXEC dbo.usp_Cart_RecalculateTotals @CartId = @CartId;

        COMMIT TRANSACTION;

        -- Return full cart state
        EXEC dbo.usp_Cart_GetById @CartId = @CartId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 6. usp_Cart_RemoveItem
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Cart_RemoveItem
    @CartItemId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @CartId BIGINT;

    SELECT @CartId = CartId 
    FROM dbo.CartItems 
    WHERE CartItemId = @CartItemId;

    IF @CartId IS NULL
    BEGIN
        RAISERROR('Cart item not found.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        DELETE FROM dbo.CartItems WHERE CartItemId = @CartItemId;

        EXEC dbo.usp_Cart_RecalculateTotals @CartId = @CartId;

        COMMIT TRANSACTION;

        EXEC dbo.usp_Cart_GetById @CartId = @CartId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 7. usp_Cart_Clear
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Cart_Clear
    @CartId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.ShoppingCarts WHERE CartId = @CartId)
    BEGIN
        RAISERROR('Cart not found.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Delete all items (cascades to addons)
        DELETE FROM dbo.CartItems WHERE CartId = @CartId;

        -- Reset totals
        UPDATE dbo.ShoppingCarts
        SET SubTotal = 0.00,
            TaxTotal = 0.00,
            GrandTotal = 0.00,
            UpdatedAt = SYSUTCDATETIME()
        WHERE CartId = @CartId;

        COMMIT TRANSACTION;

        SELECT @CartId AS CartId, 1 AS Success;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 8. usp_Cart_RecalculateTotals
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Cart_RecalculateTotals
    @CartId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ItemsSubTotal DECIMAL(10,2) = 0.00;
    DECLARE @AddonsSubTotal DECIMAL(10,2) = 0.00;
    DECLARE @CalculatedSubTotal DECIMAL(10,2) = 0.00;
    DECLARE @CalculatedTax DECIMAL(10,2) = 0.00;
    DECLARE @CalculatedGrandTotal DECIMAL(10,2) = 0.00;

    -- Sum cart items total
    SELECT @ItemsSubTotal = ISNULL(SUM(TotalPrice), 0.00)
    FROM dbo.CartItems
    WHERE CartId = @CartId;

    -- Sum cart item addons total
    SELECT @AddonsSubTotal = ISNULL(SUM(cia.TotalPrice), 0.00)
    FROM dbo.CartItemAddons cia
    JOIN dbo.CartItems ci ON cia.CartItemId = ci.CartItemId
    WHERE ci.CartId = @CartId;

    SET @CalculatedSubTotal = @ItemsSubTotal + @AddonsSubTotal;

    -- Compute GST tax based on menu item configured tax percentages
    SELECT @CalculatedTax = ISNULL(SUM(
        ROUND(((ci.TotalPrice + ISNULL(addonTotals.AddonTotal, 0.00)) * (mi.TaxPercentage / 100.0)), 2)
    ), 0.00)
    FROM dbo.CartItems ci
    JOIN dbo.MenuItems mi ON ci.MenuItemId = mi.MenuItemId
    OUTER APPLY (
        SELECT SUM(cia.TotalPrice) AS AddonTotal
        FROM dbo.CartItemAddons cia
        WHERE cia.CartItemId = ci.CartItemId
    ) addonTotals
    WHERE ci.CartId = @CartId;

    SET @CalculatedGrandTotal = @CalculatedSubTotal + @CalculatedTax;

    UPDATE dbo.ShoppingCarts
    SET SubTotal = @CalculatedSubTotal,
        TaxTotal = @CalculatedTax,
        GrandTotal = @CalculatedGrandTotal,
        UpdatedAt = SYSUTCDATETIME()
    WHERE CartId = @CartId;
END;
GO

PRINT 'Cart Service stored procedures successfully created in RestaurantManagementDB.';
GO

