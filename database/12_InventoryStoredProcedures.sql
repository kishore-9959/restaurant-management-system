-- ============================================================================
-- Script: 12_InventoryStoredProcedures.sql
-- Description: Production-ready ACID Stored Procedures for Phase 8 Inventory
--              Management Microservice (Port 8009) in Restaurant Management System.
--
-- Procedures implemented (25 Total):
-- 1.  usp_Inventory_Ingredient_Create
-- 2.  usp_Inventory_Ingredient_GetById
-- 3.  usp_Inventory_Ingredient_List
-- 4.  usp_Inventory_Ingredient_Update
-- 5.  usp_Inventory_Ingredient_SetStatus
-- 6.  usp_Inventory_Ingredient_Delete
-- 7.  usp_Inventory_StockIn
-- 8.  usp_Inventory_StockOut
-- 9.  usp_Inventory_StockAdjust
-- 10. usp_Inventory_StockTransfer
-- 11. usp_Inventory_BOM_CheckStock
-- 12. usp_Inventory_BOM_Deplete
-- 13. usp_Inventory_BOM_Restitute
-- 14. usp_Inventory_GetLowStockAlerts
-- 15. usp_Inventory_GetTransactions
-- 16. usp_Inventory_GetValuationReport
-- 17. usp_Inventory_GetConsumptionReport
-- 18. usp_Recipe_CreateOrUpdate
-- 19. usp_Recipe_GetByMenuItem
-- 20. usp_Recipe_Delete
-- 21. usp_Supplier_Create
-- 22. usp_Supplier_GetById
-- 23. usp_Supplier_List
-- 24. usp_Supplier_Update
-- 25. usp_Supplier_Delete
--
-- Database: RestaurantManagementDB
-- Engine: Microsoft SQL Server 2019 / 2022
-- Author: Senior SQL Server Database Architect & Microservices Architect
-- Date: 2026-11-14
-- ============================================================================

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- 1. usp_Inventory_Ingredient_Create
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_Ingredient_Create
    @BranchId INT,
    @IngredientCode NVARCHAR(30),
    @IngredientName NVARCHAR(100),
    @Category NVARCHAR(50) = 'GENERAL',
    @UnitOfMeasure NVARCHAR(20),
    @InitialStock DECIMAL(12,4) = 0.0000,
    @MinimumStockLevel DECIMAL(12,4) = 5.0000,
    @ReorderLevel DECIMAL(12,4) = 10.0000,
    @CostPerUnit DECIMAL(10,2) = 0.00,
    @PrimarySupplierId INT = NULL,
    @RecordedByUserId BIGINT = NULL,
    @NewIngredientId BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Pre-transaction validation
    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchId = @BranchId AND IsDeleted = 0)
    BEGIN
        RAISERROR('BRANCH_NOT_FOUND', 16, 1);
        RETURN;
    END;

    IF @PrimarySupplierId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Suppliers WHERE SupplierId = @PrimarySupplierId AND IsDeleted = 0)
    BEGIN
        RAISERROR('SUPPLIER_NOT_FOUND', 16, 1);
        RETURN;
    END;

    IF EXISTS (
        SELECT 1 FROM dbo.InventoryIngredients 
        WHERE BranchId = @BranchId AND IngredientCode = @IngredientCode AND IsDeleted = 0
    )
    BEGIN
        RAISERROR('INGREDIENT_CODE_EXISTS', 16, 1);
        RETURN;
    END;

    IF @InitialStock < 0 OR @MinimumStockLevel < 0 OR @ReorderLevel < 0 OR @CostPerUnit < 0
    BEGIN
        RAISERROR('NEGATIVE_VALUE_NOT_ALLOWED', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT INTO dbo.InventoryIngredients (
            BranchId, IngredientCode, IngredientName, Category, UnitOfMeasure,
            CurrentStock, MinimumStockLevel, ReorderLevel, CostPerUnit,
            PrimarySupplierId, IsActive, CreatedAt, UpdatedAt, IsDeleted
        ) VALUES (
            @BranchId, UPPER(LTRIM(RTRIM(@IngredientCode))), LTRIM(RTRIM(@IngredientName)),
            UPPER(LTRIM(RTRIM(@Category))), UPPER(LTRIM(RTRIM(@UnitOfMeasure))),
            @InitialStock, @MinimumStockLevel, @ReorderLevel, @CostPerUnit,
            @PrimarySupplierId, 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0
        );

        SET @NewIngredientId = SCOPE_IDENTITY();

        IF @InitialStock > 0
        BEGIN
            INSERT INTO dbo.InventoryTransactions (
                BranchId, IngredientId, TransactionType, QuantityChanged,
                UnitCost, BalanceAfter, Notes, RecordedByUserId, CreatedAt
            ) VALUES (
                @BranchId, @NewIngredientId, 'PURCHASE', @InitialStock,
                @CostPerUnit, @InitialStock, N'Initial stock balance on ingredient creation',
                @RecordedByUserId, SYSUTCDATETIME()
            );
        END;

        COMMIT TRANSACTION;

        SELECT 
            i.IngredientId,
            i.BranchId,
            b.BranchName,
            i.IngredientCode,
            i.IngredientName,
            i.Category,
            i.UnitOfMeasure,
            i.CurrentStock,
            i.MinimumStockLevel,
            i.ReorderLevel,
            i.CostPerUnit,
            i.PrimarySupplierId,
            s.SupplierName AS PrimarySupplierName,
            s.SupplierCode AS PrimarySupplierCode,
            i.IsActive,
            i.CreatedAt,
            i.UpdatedAt
        FROM dbo.InventoryIngredients i
        JOIN dbo.Branches b ON i.BranchId = b.BranchId
        LEFT JOIN dbo.Suppliers s ON i.PrimarySupplierId = s.SupplierId
        WHERE i.IngredientId = @NewIngredientId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 2. usp_Inventory_Ingredient_GetById
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_Ingredient_GetById
    @IngredientId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        i.IngredientId,
        i.BranchId,
        b.BranchName,
        b.BranchCode,
        i.IngredientCode,
        i.IngredientName,
        i.Category,
        i.UnitOfMeasure,
        i.CurrentStock,
        i.MinimumStockLevel,
        i.ReorderLevel,
        i.CostPerUnit,
        (i.CurrentStock * i.CostPerUnit) AS StockValuation,
        CASE WHEN i.CurrentStock <= i.MinimumStockLevel THEN 1 ELSE 0 END AS IsCriticalLowStock,
        CASE WHEN i.CurrentStock <= i.ReorderLevel THEN 1 ELSE 0 END AS IsReorderRequired,
        i.PrimarySupplierId,
        s.SupplierName AS PrimarySupplierName,
        s.SupplierCode AS PrimarySupplierCode,
        s.Phone AS SupplierPhone,
        s.Email AS SupplierEmail,
        i.IsActive,
        i.CreatedAt,
        i.UpdatedAt
    FROM dbo.InventoryIngredients i
    JOIN dbo.Branches b ON i.BranchId = b.BranchId
    LEFT JOIN dbo.Suppliers s ON i.PrimarySupplierId = s.SupplierId
    WHERE i.IngredientId = @IngredientId AND i.IsDeleted = 0;
END;
GO

-- ============================================================================
-- 3. usp_Inventory_Ingredient_List
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_Ingredient_List
    @BranchId INT = NULL,
    @Category NVARCHAR(50) = NULL,
    @Search NVARCHAR(100) = NULL,
    @IsActive BIT = NULL,
    @LowStockOnly BIT = 0,
    @Page INT = 1,
    @Limit INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    SET @Page = ISNULL(@Page, 1);
    IF @Page < 1 SET @Page = 1;
    SET @Limit = ISNULL(@Limit, 20);
    IF @Limit < 1 SET @Limit = 20;
    IF @Limit > 100 SET @Limit = 100;

    DECLARE @Offset INT = (@Page - 1) * @Limit;

    -- Recordset 1: Paginated Rows
    SELECT 
        i.IngredientId,
        i.BranchId,
        b.BranchName,
        i.IngredientCode,
        i.IngredientName,
        i.Category,
        i.UnitOfMeasure,
        i.CurrentStock,
        i.MinimumStockLevel,
        i.ReorderLevel,
        i.CostPerUnit,
        (i.CurrentStock * i.CostPerUnit) AS StockValuation,
        CASE WHEN i.CurrentStock <= i.MinimumStockLevel THEN 1 ELSE 0 END AS IsCriticalLowStock,
        CASE WHEN i.CurrentStock <= i.ReorderLevel THEN 1 ELSE 0 END AS IsReorderRequired,
        i.PrimarySupplierId,
        s.SupplierName AS PrimarySupplierName,
        i.IsActive,
        i.CreatedAt,
        i.UpdatedAt
    FROM dbo.InventoryIngredients i
    JOIN dbo.Branches b ON i.BranchId = b.BranchId
    LEFT JOIN dbo.Suppliers s ON i.PrimarySupplierId = s.SupplierId
    WHERE i.IsDeleted = 0
      AND (@BranchId IS NULL OR i.BranchId = @BranchId)
      AND (@Category IS NULL OR i.Category = @Category)
      AND (@IsActive IS NULL OR i.IsActive = @IsActive)
      AND (@LowStockOnly = 0 OR i.CurrentStock <= i.ReorderLevel)
      AND (
          @Search IS NULL OR 
          i.IngredientName LIKE '%' + @Search + '%' OR 
          i.IngredientCode LIKE '%' + @Search + '%'
      )
    ORDER BY i.IngredientName ASC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

    -- Recordset 2: Total Count
    SELECT COUNT(*) AS TotalCount
    FROM dbo.InventoryIngredients i
    WHERE i.IsDeleted = 0
      AND (@BranchId IS NULL OR i.BranchId = @BranchId)
      AND (@Category IS NULL OR i.Category = @Category)
      AND (@IsActive IS NULL OR i.IsActive = @IsActive)
      AND (@LowStockOnly = 0 OR i.CurrentStock <= i.ReorderLevel)
      AND (
          @Search IS NULL OR 
          i.IngredientName LIKE '%' + @Search + '%' OR 
          i.IngredientCode LIKE '%' + @Search + '%'
      );
END;
GO

-- ============================================================================
-- 4. usp_Inventory_Ingredient_Update
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_Ingredient_Update
    @IngredientId BIGINT,
    @IngredientName NVARCHAR(100),
    @Category NVARCHAR(50),
    @UnitOfMeasure NVARCHAR(20),
    @MinimumStockLevel DECIMAL(12,4),
    @ReorderLevel DECIMAL(12,4),
    @CostPerUnit DECIMAL(10,2),
    @PrimarySupplierId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.InventoryIngredients WHERE IngredientId = @IngredientId AND IsDeleted = 0)
    BEGIN
        RAISERROR('INGREDIENT_NOT_FOUND', 16, 1);
        RETURN;
    END;

    IF @PrimarySupplierId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Suppliers WHERE SupplierId = @PrimarySupplierId AND IsDeleted = 0)
    BEGIN
        RAISERROR('SUPPLIER_NOT_FOUND', 16, 1);
        RETURN;
    END;

    IF @MinimumStockLevel < 0 OR @ReorderLevel < 0 OR @CostPerUnit < 0
    BEGIN
        RAISERROR('NEGATIVE_VALUE_NOT_ALLOWED', 16, 1);
        RETURN;
    END;

    UPDATE dbo.InventoryIngredients
    SET 
        IngredientName = LTRIM(RTRIM(@IngredientName)),
        Category = UPPER(LTRIM(RTRIM(@Category))),
        UnitOfMeasure = UPPER(LTRIM(RTRIM(@UnitOfMeasure))),
        MinimumStockLevel = @MinimumStockLevel,
        ReorderLevel = @ReorderLevel,
        CostPerUnit = @CostPerUnit,
        PrimarySupplierId = @PrimarySupplierId,
        UpdatedAt = SYSUTCDATETIME()
    WHERE IngredientId = @IngredientId AND IsDeleted = 0;

    EXEC dbo.usp_Inventory_Ingredient_GetById @IngredientId;
END;
GO

-- ============================================================================
-- 5. usp_Inventory_Ingredient_SetStatus
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_Ingredient_SetStatus
    @IngredientId BIGINT,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.InventoryIngredients WHERE IngredientId = @IngredientId AND IsDeleted = 0)
    BEGIN
        RAISERROR('INGREDIENT_NOT_FOUND', 16, 1);
        RETURN;
    END;

    UPDATE dbo.InventoryIngredients
    SET IsActive = @IsActive,
        UpdatedAt = SYSUTCDATETIME()
    WHERE IngredientId = @IngredientId AND IsDeleted = 0;

    EXEC dbo.usp_Inventory_Ingredient_GetById @IngredientId;
END;
GO

-- ============================================================================
-- 6. usp_Inventory_Ingredient_Delete (Soft Delete)
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_Ingredient_Delete
    @IngredientId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.InventoryIngredients WHERE IngredientId = @IngredientId AND IsDeleted = 0)
    BEGIN
        RAISERROR('INGREDIENT_NOT_FOUND', 16, 1);
        RETURN;
    END;

    UPDATE dbo.InventoryIngredients
    SET IsDeleted = 1,
        IsActive = 0,
        DeletedAt = SYSUTCDATETIME(),
        UpdatedAt = SYSUTCDATETIME()
    WHERE IngredientId = @IngredientId;

    SELECT 1 AS Success, 'Ingredient soft deleted successfully' AS Message;
END;
GO

-- ============================================================================
-- 7. usp_Inventory_StockIn
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_StockIn
    @BranchId INT,
    @IngredientId BIGINT,
    @Quantity DECIMAL(12,4),
    @UnitCost DECIMAL(10,2) = NULL,
    @ReferencePOId BIGINT = NULL,
    @RecordedByUserId BIGINT = NULL,
    @Notes NVARCHAR(500) = NULL,
    @NewTransactionId BIGINT = NULL OUTPUT,
    @NewBalance DECIMAL(12,4) = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF @Quantity <= 0
    BEGIN
        RAISERROR('QUANTITY_MUST_BE_POSITIVE', 16, 1);
        RETURN;
    END;

    DECLARE @CurrentStock DECIMAL(12,4);
    DECLARE @ExistingCost DECIMAL(10,2);

    SELECT 
        @CurrentStock = CurrentStock,
        @ExistingCost = CostPerUnit
    FROM dbo.InventoryIngredients
    WHERE IngredientId = @IngredientId AND BranchId = @BranchId AND IsDeleted = 0;

    IF @CurrentStock IS NULL
    BEGIN
        RAISERROR('INGREDIENT_NOT_FOUND', 16, 1);
        RETURN;
    END;

    DECLARE @EffectiveCost DECIMAL(10,2) = ISNULL(@UnitCost, @ExistingCost);
    SET @NewBalance = @CurrentStock + @Quantity;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Update Stock
        UPDATE dbo.InventoryIngredients
        SET CurrentStock = @NewBalance,
            CostPerUnit = @EffectiveCost,
            UpdatedAt = SYSUTCDATETIME()
        WHERE IngredientId = @IngredientId;

        -- Record Purchase Ledger
        INSERT INTO dbo.InventoryTransactions (
            BranchId, IngredientId, TransactionType, QuantityChanged,
            UnitCost, BalanceAfter, ReferencePOId, Notes, RecordedByUserId, CreatedAt
        ) VALUES (
            @BranchId, @IngredientId, 'PURCHASE', @Quantity,
            @EffectiveCost, @NewBalance, @ReferencePOId, @Notes, @RecordedByUserId, SYSUTCDATETIME()
        );

        SET @NewTransactionId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT 
            @NewTransactionId AS TransactionId,
            @IngredientId AS IngredientId,
            @CurrentStock AS PreviousStock,
            @Quantity AS QuantityAdded,
            @NewBalance AS NewBalance,
            @EffectiveCost AS UnitCost,
            'PURCHASE' AS TransactionType;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 8. usp_Inventory_StockOut
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_StockOut
    @BranchId INT,
    @IngredientId BIGINT,
    @Quantity DECIMAL(12,4),
    @Reason NVARCHAR(30) = 'WASTAGE',
    @RecordedByUserId BIGINT = NULL,
    @Notes NVARCHAR(500) = NULL,
    @NewTransactionId BIGINT = NULL OUTPUT,
    @NewBalance DECIMAL(12,4) = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF @Quantity <= 0
    BEGIN
        RAISERROR('QUANTITY_MUST_BE_POSITIVE', 16, 1);
        RETURN;
    END;

    DECLARE @CurrentStock DECIMAL(12,4);
    DECLARE @UnitCost DECIMAL(10,2);

    SELECT 
        @CurrentStock = CurrentStock,
        @UnitCost = CostPerUnit
    FROM dbo.InventoryIngredients
    WHERE IngredientId = @IngredientId AND BranchId = @BranchId AND IsDeleted = 0;

    IF @CurrentStock IS NULL
    BEGIN
        RAISERROR('INGREDIENT_NOT_FOUND', 16, 1);
        RETURN;
    END;

    IF @CurrentStock < @Quantity
    BEGIN
        RAISERROR('INSUFFICIENT_STOCK', 16, 1);
        RETURN;
    END;

    SET @NewBalance = @CurrentStock - @Quantity;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Update Stock
        UPDATE dbo.InventoryIngredients
        SET CurrentStock = @NewBalance,
            UpdatedAt = SYSUTCDATETIME()
        WHERE IngredientId = @IngredientId;

        -- Record Wastage/Stock-Out Ledger
        INSERT INTO dbo.InventoryTransactions (
            BranchId, IngredientId, TransactionType, QuantityChanged,
            UnitCost, BalanceAfter, Notes, RecordedByUserId, CreatedAt
        ) VALUES (
            @BranchId, @IngredientId, UPPER(@Reason), (-1.0 * @Quantity),
            @UnitCost, @NewBalance, @Notes, @RecordedByUserId, SYSUTCDATETIME()
        );

        SET @NewTransactionId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT 
            @NewTransactionId AS TransactionId,
            @IngredientId AS IngredientId,
            @CurrentStock AS PreviousStock,
            @Quantity AS QuantityDeducted,
            @NewBalance AS NewBalance,
            @UnitCost AS UnitCost,
            UPPER(@Reason) AS TransactionType;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 9. usp_Inventory_StockAdjust
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_StockAdjust
    @BranchId INT,
    @IngredientId BIGINT,
    @ActualCount DECIMAL(12,4),
    @Reason NVARCHAR(100) = 'Physical Audit Reconciliation',
    @RecordedByUserId BIGINT = NULL,
    @Notes NVARCHAR(500) = NULL,
    @NewTransactionId BIGINT = NULL OUTPUT,
    @Variance DECIMAL(12,4) = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF @ActualCount < 0
    BEGIN
        RAISERROR('ACTUAL_COUNT_CANNOT_BE_NEGATIVE', 16, 1);
        RETURN;
    END;

    DECLARE @CurrentStock DECIMAL(12,4);
    DECLARE @UnitCost DECIMAL(10,2);

    SELECT 
        @CurrentStock = CurrentStock,
        @UnitCost = CostPerUnit
    FROM dbo.InventoryIngredients
    WHERE IngredientId = @IngredientId AND BranchId = @BranchId AND IsDeleted = 0;

    IF @CurrentStock IS NULL
    BEGIN
        RAISERROR('INGREDIENT_NOT_FOUND', 16, 1);
        RETURN;
    END;

    SET @Variance = @ActualCount - @CurrentStock;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Update Stock to exact physical count
        UPDATE dbo.InventoryIngredients
        SET CurrentStock = @ActualCount,
            UpdatedAt = SYSUTCDATETIME()
        WHERE IngredientId = @IngredientId;

        -- Record Adjustment Ledger
        INSERT INTO dbo.InventoryTransactions (
            BranchId, IngredientId, TransactionType, QuantityChanged,
            UnitCost, BalanceAfter, Notes, RecordedByUserId, CreatedAt
        ) VALUES (
            @BranchId, @IngredientId, 'ADJUSTMENT', @Variance,
            @UnitCost, @ActualCount, ISNULL(@Notes, @Reason), @RecordedByUserId, SYSUTCDATETIME()
        );

        SET @NewTransactionId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT 
            @NewTransactionId AS TransactionId,
            @IngredientId AS IngredientId,
            @CurrentStock AS PreviousBalance,
            @ActualCount AS ActualCount,
            @Variance AS Variance,
            @ActualCount AS NewBalance,
            'ADJUSTMENT' AS TransactionType;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 10. usp_Inventory_StockTransfer
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_StockTransfer
    @FromBranchId INT,
    @ToBranchId INT,
    @IngredientCode NVARCHAR(30),
    @TransferQuantity DECIMAL(12,4),
    @RecordedByUserId BIGINT = NULL,
    @Notes NVARCHAR(500) = NULL,
    @OutTransactionId BIGINT = NULL OUTPUT,
    @InTransactionId BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF @FromBranchId = @ToBranchId
    BEGIN
        RAISERROR('SOURCE_AND_DEST_BRANCHES_MUST_DIFFER', 16, 1);
        RETURN;
    END;

    IF @TransferQuantity <= 0
    BEGIN
        RAISERROR('QUANTITY_MUST_BE_POSITIVE', 16, 1);
        RETURN;
    END;

    -- Validate branches
    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchId = @FromBranchId AND IsDeleted = 0)
    BEGIN
        RAISERROR('SOURCE_BRANCH_NOT_FOUND', 16, 1);
        RETURN;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchId = @ToBranchId AND IsDeleted = 0)
    BEGIN
        RAISERROR('DESTINATION_BRANCH_NOT_FOUND', 16, 1);
        RETURN;
    END;

    -- Validate source ingredient
    DECLARE @SourceIngredientId BIGINT;
    DECLARE @SourceStock DECIMAL(12,4);
    DECLARE @SourceCost DECIMAL(10,2);
    DECLARE @IngName NVARCHAR(100);
    DECLARE @Category NVARCHAR(50);
    DECLARE @UOM NVARCHAR(20);
    DECLARE @MinStock DECIMAL(12,4);
    DECLARE @Reorder DECIMAL(12,4);

    SELECT 
        @SourceIngredientId = IngredientId,
        @SourceStock = CurrentStock,
        @SourceCost = CostPerUnit,
        @IngName = IngredientName,
        @Category = Category,
        @UOM = UnitOfMeasure,
        @MinStock = MinimumStockLevel,
        @Reorder = ReorderLevel
    FROM dbo.InventoryIngredients
    WHERE BranchId = @FromBranchId AND IngredientCode = @IngredientCode AND IsDeleted = 0;

    IF @SourceIngredientId IS NULL
    BEGIN
        RAISERROR('SOURCE_INGREDIENT_NOT_FOUND', 16, 1);
        RETURN;
    END;

    IF @SourceStock < @TransferQuantity
    BEGIN
        RAISERROR('INSUFFICIENT_STOCK_FOR_TRANSFER', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Find or provision destination ingredient
        DECLARE @DestIngredientId BIGINT;
        DECLARE @DestStock DECIMAL(12,4);

        SELECT 
            @DestIngredientId = IngredientId,
            @DestStock = CurrentStock
        FROM dbo.InventoryIngredients WITH (UPDLOCK, ROWLOCK)
        WHERE BranchId = @ToBranchId AND IngredientCode = @IngredientCode AND IsDeleted = 0;

        IF @DestIngredientId IS NULL
        BEGIN
            INSERT INTO dbo.InventoryIngredients (
                BranchId, IngredientCode, IngredientName, Category, UnitOfMeasure,
                CurrentStock, MinimumStockLevel, ReorderLevel, CostPerUnit,
                IsActive, CreatedAt, UpdatedAt, IsDeleted
            ) VALUES (
                @ToBranchId, @IngredientCode, @IngName, @Category, @UOM,
                0.0000, @MinStock, @Reorder, @SourceCost,
                1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0
            );
            SET @DestIngredientId = SCOPE_IDENTITY();
            SET @DestStock = 0.0000;
        END;

        DECLARE @SourceNewBalance DECIMAL(12,4) = @SourceStock - @TransferQuantity;
        DECLARE @DestNewBalance DECIMAL(12,4) = @DestStock + @TransferQuantity;

        -- Deduct source
        UPDATE dbo.InventoryIngredients
        SET CurrentStock = @SourceNewBalance,
            UpdatedAt = SYSUTCDATETIME()
        WHERE IngredientId = @SourceIngredientId;

        -- Add destination
        UPDATE dbo.InventoryIngredients
        SET CurrentStock = @DestNewBalance,
            CostPerUnit = @SourceCost,
            UpdatedAt = SYSUTCDATETIME()
        WHERE IngredientId = @DestIngredientId;

        -- Log Outgoing Transfer
        INSERT INTO dbo.InventoryTransactions (
            BranchId, IngredientId, TransactionType, QuantityChanged,
            UnitCost, BalanceAfter, Notes, RecordedByUserId, CreatedAt
        ) VALUES (
            @FromBranchId, @SourceIngredientId, 'TRANSFER_OUT', (-1.0 * @TransferQuantity),
            @SourceCost, @SourceNewBalance, 
            ISNULL(@Notes, N'Transfer to Branch #' + CAST(@ToBranchId AS NVARCHAR(10))),
            @RecordedByUserId, SYSUTCDATETIME()
        );
        SET @OutTransactionId = SCOPE_IDENTITY();

        -- Log Incoming Transfer
        INSERT INTO dbo.InventoryTransactions (
            BranchId, IngredientId, TransactionType, QuantityChanged,
            UnitCost, BalanceAfter, Notes, RecordedByUserId, CreatedAt
        ) VALUES (
            @ToBranchId, @DestIngredientId, 'TRANSFER_IN', @TransferQuantity,
            @SourceCost, @DestNewBalance, 
            ISNULL(@Notes, N'Transfer from Branch #' + CAST(@FromBranchId AS NVARCHAR(10))),
            @RecordedByUserId, SYSUTCDATETIME()
        );
        SET @InTransactionId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT 
            @FromBranchId AS FromBranchId,
            @ToBranchId AS ToBranchId,
            @IngredientCode AS IngredientCode,
            @TransferQuantity AS TransferQuantity,
            @SourceNewBalance AS SourceNewBalance,
            @DestNewBalance AS DestNewBalance,
            @OutTransactionId AS OutTransactionId,
            @InTransactionId AS InTransactionId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 11. usp_Inventory_BOM_CheckStock
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_BOM_CheckStock
    @BranchId INT,
    @ItemsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- Parse Items
    DECLARE @Items TABLE (
        MenuItemId BIGINT,
        VariantId BIGINT,
        Quantity INT
    );

    INSERT INTO @Items (MenuItemId, VariantId, Quantity)
    SELECT 
        JSON_VALUE(value, '$.menuItemId'),
        JSON_VALUE(value, '$.variantId'),
        JSON_VALUE(value, '$.quantity')
    FROM OPENJSON(@ItemsJson);

    -- Calculate total required per ingredient
    DECLARE @Required TABLE (
        IngredientId BIGINT,
        TotalRequired DECIMAL(12,4)
    );

    INSERT INTO @Required (IngredientId, TotalRequired)
    SELECT 
        ri.IngredientId,
        SUM(ri.RequiredQuantity * (1.0 + (ri.WastagePercentage / 100.0)) * i.Quantity / ISNULL(r.YieldPortions, 1))
    FROM @Items i
    JOIN dbo.Recipes r ON i.MenuItemId = r.MenuItemId 
        AND (r.VariantId IS NULL OR r.VariantId = i.VariantId)
        AND r.IsActive = 1
    JOIN dbo.RecipeIngredients ri ON r.RecipeId = ri.RecipeId
    GROUP BY ri.IngredientId;

    -- Recordset 1: Summary Flag
    DECLARE @TotalChecked INT;
    DECLARE @DeficitCount INT;

    SELECT 
        @TotalChecked = COUNT(*),
        @DeficitCount = SUM(CASE WHEN ing.CurrentStock < req.TotalRequired THEN 1 ELSE 0 END)
    FROM @Required req
    JOIN dbo.InventoryIngredients ing ON req.IngredientId = ing.IngredientId
    WHERE ing.BranchId = @BranchId AND ing.IsDeleted = 0;

    SELECT 
        CASE WHEN ISNULL(@DeficitCount, 0) = 0 AND ISNULL(@TotalChecked, 0) > 0 THEN 1 ELSE 0 END AS HasSufficientStock,
        ISNULL(@TotalChecked, 0) AS TotalIngredientsChecked,
        ISNULL(@DeficitCount, 0) AS DeficitCount;

    -- Recordset 2: Detailed Line Items
    SELECT 
        ing.IngredientId,
        ing.IngredientCode,
        ing.IngredientName,
        ing.UnitOfMeasure,
        req.TotalRequired AS RequiredQuantity,
        ing.CurrentStock AS AvailableStock,
        CASE WHEN ing.CurrentStock < req.TotalRequired 
             THEN (req.TotalRequired - ing.CurrentStock) 
             ELSE 0.0000 
        END AS DeficitQuantity,
        CASE WHEN ing.CurrentStock >= req.TotalRequired THEN 1 ELSE 0 END AS IsSufficient
    FROM @Required req
    JOIN dbo.InventoryIngredients ing ON req.IngredientId = ing.IngredientId
    WHERE ing.BranchId = @BranchId AND ing.IsDeleted = 0;
END;
GO

-- ============================================================================
-- 12. usp_Inventory_BOM_Deplete
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_BOM_Deplete
    @BranchId INT,
    @OrderId BIGINT,
    @OrderNumber NVARCHAR(35),
    @ItemsJson NVARCHAR(MAX),
    @RecordedByUserId BIGINT = NULL,
    @DepletedCount INT = NULL OUTPUT,
    @LowStockCount INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Idempotency Check: Prevent duplicate consumption for same order
    IF EXISTS (
        SELECT 1 FROM dbo.InventoryTransactions 
        WHERE ReferenceOrderId = @OrderId AND TransactionType = 'CONSUMPTION'
    )
    BEGIN
        SELECT 
            @OrderId AS OrderId,
            @OrderNumber AS OrderNumber,
            0 AS DepletedCount,
            0 AS LowStockTriggered,
            1 AS IsIdempotentDuplicate;

        SELECT TOP 0 
            IngredientId, IngredientName, CurrentStock, ReorderLevel 
        FROM dbo.InventoryIngredients;

        RETURN;
    END;

    -- 2. Parse Items JSON
    DECLARE @Items TABLE (
        MenuItemId BIGINT,
        VariantId BIGINT,
        Quantity INT
    );

    INSERT INTO @Items (MenuItemId, VariantId, Quantity)
    SELECT 
        JSON_VALUE(value, '$.menuItemId'),
        JSON_VALUE(value, '$.variantId'),
        JSON_VALUE(value, '$.quantity')
    FROM OPENJSON(@ItemsJson);

    -- 3. Calculate Ingredient Requirements
    DECLARE @Required TABLE (
        IngredientId BIGINT,
        TotalRequired DECIMAL(12,4)
    );

    INSERT INTO @Required (IngredientId, TotalRequired)
    SELECT 
        ri.IngredientId,
        SUM(ri.RequiredQuantity * (1.0 + (ri.WastagePercentage / 100.0)) * i.Quantity / ISNULL(r.YieldPortions, 1))
    FROM @Items i
    JOIN dbo.Recipes r ON i.MenuItemId = r.MenuItemId 
        AND (r.VariantId IS NULL OR r.VariantId = i.VariantId)
        AND r.IsActive = 1
    JOIN dbo.RecipeIngredients ri ON r.RecipeId = ri.RecipeId
    GROUP BY ri.IngredientId;

    -- If no recipe mapped, return gracefully
    IF NOT EXISTS (SELECT 1 FROM @Required)
    BEGIN
        SELECT 
            @OrderId AS OrderId,
            @OrderNumber AS OrderNumber,
            0 AS DepletedCount,
            0 AS LowStockTriggered,
            0 AS IsIdempotentDuplicate;

        SELECT TOP 0 
            IngredientId, IngredientName, CurrentStock, ReorderLevel 
        FROM dbo.InventoryIngredients;
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 4. Deduct Ingredients and insert Consumption transactions
        UPDATE ing
        SET ing.CurrentStock = ing.CurrentStock - req.TotalRequired,
            ing.UpdatedAt = SYSUTCDATETIME()
        FROM dbo.InventoryIngredients ing WITH (UPDLOCK, ROWLOCK)
        JOIN @Required req ON ing.IngredientId = req.IngredientId
        WHERE ing.BranchId = @BranchId AND ing.IsDeleted = 0;

        INSERT INTO dbo.InventoryTransactions (
            BranchId, IngredientId, TransactionType, QuantityChanged,
            UnitCost, BalanceAfter, ReferenceOrderId, Notes, RecordedByUserId, CreatedAt
        )
        SELECT 
            @BranchId,
            ing.IngredientId,
            'CONSUMPTION',
            (-1.0 * req.TotalRequired),
            ing.CostPerUnit,
            ing.CurrentStock,
            @OrderId,
            N'Auto BOM deduction for Order #' + @OrderNumber,
            @RecordedByUserId,
            SYSUTCDATETIME()
        FROM dbo.InventoryIngredients ing
        JOIN @Required req ON ing.IngredientId = req.IngredientId
        WHERE ing.BranchId = @BranchId;

        SET @DepletedCount = @@ROWCOUNT;

        -- 5. Identify ingredients crossing ReorderLevel or MinimumStockLevel
        SELECT @LowStockCount = COUNT(*)
        FROM dbo.InventoryIngredients ing
        JOIN @Required req ON ing.IngredientId = req.IngredientId
        WHERE ing.BranchId = @BranchId AND ing.CurrentStock <= ing.ReorderLevel;

        COMMIT TRANSACTION;

        -- Recordset 1: Header summary
        SELECT 
            @OrderId AS OrderId,
            @OrderNumber AS OrderNumber,
            @DepletedCount AS DepletedCount,
            CASE WHEN @LowStockCount > 0 THEN 1 ELSE 0 END AS LowStockTriggered,
            0 AS IsIdempotentDuplicate;

        -- Recordset 2: Low-Stock alerts triggered by this depletion
        SELECT 
            ing.IngredientId,
            ing.IngredientCode,
            ing.IngredientName,
            ing.UnitOfMeasure,
            ing.CurrentStock,
            ing.MinimumStockLevel,
            ing.ReorderLevel,
            CASE WHEN ing.CurrentStock <= ing.MinimumStockLevel THEN 'CRITICAL' ELSE 'WARNING' END AS AlertSeverity
        FROM dbo.InventoryIngredients ing
        JOIN @Required req ON ing.IngredientId = req.IngredientId
        WHERE ing.BranchId = @BranchId AND ing.CurrentStock <= ing.ReorderLevel;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 13. usp_Inventory_BOM_Restitute
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_BOM_Restitute
    @BranchId INT,
    @OrderId BIGINT,
    @OrderNumber NVARCHAR(35),
    @Reason NVARCHAR(255) = 'Order Cancelled/Voided',
    @RecordedByUserId BIGINT = NULL,
    @RestoredCount INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Check if consumption occurred for this order
    IF NOT EXISTS (
        SELECT 1 FROM dbo.InventoryTransactions 
        WHERE ReferenceOrderId = @OrderId AND TransactionType = 'CONSUMPTION'
    )
    BEGIN
        RAISERROR('NO_CONSUMPTION_FOUND_FOR_ORDER', 16, 1);
        RETURN;
    END;

    -- Prevent duplicate restitution!
    IF EXISTS (
        SELECT 1 FROM dbo.InventoryTransactions 
        WHERE ReferenceOrderId = @OrderId AND TransactionType = 'RESTITUTION'
    )
    BEGIN
        RAISERROR('ORDER_ALREADY_RESTITUTED', 16, 1);
        RETURN;
    END;

    -- Aggregate previously consumed ingredients for this order
    DECLARE @Consumed TABLE (
        IngredientId BIGINT,
        TotalConsumed DECIMAL(12,4),
        UnitCost DECIMAL(10,2)
    );

    INSERT INTO @Consumed (IngredientId, TotalConsumed, UnitCost)
    SELECT 
        IngredientId,
        SUM(ABS(QuantityChanged)),
        MAX(UnitCost)
    FROM dbo.InventoryTransactions
    WHERE ReferenceOrderId = @OrderId AND TransactionType = 'CONSUMPTION'
    GROUP BY IngredientId;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Restore CurrentStock
        UPDATE ing
        SET ing.CurrentStock = ing.CurrentStock + c.TotalConsumed,
            ing.UpdatedAt = SYSUTCDATETIME()
        FROM dbo.InventoryIngredients ing WITH (UPDLOCK, ROWLOCK)
        JOIN @Consumed c ON ing.IngredientId = c.IngredientId;

        -- Log RESTITUTION ledger rows
        INSERT INTO dbo.InventoryTransactions (
            BranchId, IngredientId, TransactionType, QuantityChanged,
            UnitCost, BalanceAfter, ReferenceOrderId, Notes, RecordedByUserId, CreatedAt
        )
        SELECT 
            @BranchId,
            ing.IngredientId,
            'RESTITUTION',
            c.TotalConsumed,
            c.UnitCost,
            ing.CurrentStock,
            @OrderId,
            ISNULL(@Reason, N'Stock restitution for Order #' + @OrderNumber),
            @RecordedByUserId,
            SYSUTCDATETIME()
        FROM dbo.InventoryIngredients ing
        JOIN @Consumed c ON ing.IngredientId = c.IngredientId;

        SET @RestoredCount = @@ROWCOUNT;

        COMMIT TRANSACTION;

        SELECT 
            @OrderId AS OrderId,
            @OrderNumber AS OrderNumber,
            @RestoredCount AS RestoredCount,
            'RESTITUTION' AS TransactionType;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 14. usp_Inventory_GetLowStockAlerts
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_GetLowStockAlerts
    @BranchId INT = NULL,
    @CriticalOnly BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        i.IngredientId,
        i.BranchId,
        b.BranchName,
        i.IngredientCode,
        i.IngredientName,
        i.Category,
        i.UnitOfMeasure,
        i.CurrentStock,
        i.MinimumStockLevel,
        i.ReorderLevel,
        (i.ReorderLevel - i.CurrentStock) AS DeficitQuantity,
        i.CostPerUnit,
        (i.ReorderLevel - i.CurrentStock) * i.CostPerUnit AS EstimatedRestockCost,
        CASE 
            WHEN i.CurrentStock <= i.MinimumStockLevel THEN 'CRITICAL'
            ELSE 'WARNING'
        END AS AlertLevel,
        i.PrimarySupplierId,
        s.SupplierName AS PrimarySupplierName,
        s.Phone AS SupplierPhone,
        s.Email AS SupplierEmail
    FROM dbo.InventoryIngredients i
    JOIN dbo.Branches b ON i.BranchId = b.BranchId
    LEFT JOIN dbo.Suppliers s ON i.PrimarySupplierId = s.SupplierId
    WHERE i.IsDeleted = 0
      AND i.IsActive = 1
      AND (@BranchId IS NULL OR i.BranchId = @BranchId)
      AND (
          (@CriticalOnly = 1 AND i.CurrentStock <= i.MinimumStockLevel) OR
          (@CriticalOnly = 0 AND i.CurrentStock <= i.ReorderLevel)
      )
    ORDER BY 
        CASE WHEN i.CurrentStock <= i.MinimumStockLevel THEN 0 ELSE 1 END ASC,
        (i.CurrentStock / NULLIF(i.MinimumStockLevel, 0)) ASC;
END;
GO

-- ============================================================================
-- 15. usp_Inventory_GetTransactions
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_GetTransactions
    @BranchId INT = NULL,
    @IngredientId BIGINT = NULL,
    @TransactionType NVARCHAR(30) = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL,
    @Page INT = 1,
    @Limit INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    SET @Page = ISNULL(@Page, 1);
    IF @Page < 1 SET @Page = 1;
    SET @Limit = ISNULL(@Limit, 20);
    IF @Limit < 1 SET @Limit = 20;
    IF @Limit > 100 SET @Limit = 100;

    DECLARE @Offset INT = (@Page - 1) * @Limit;

    -- Recordset 1: Paginated Rows
    SELECT 
        t.TransactionId,
        t.BranchId,
        b.BranchName,
        t.IngredientId,
        i.IngredientName,
        i.IngredientCode,
        i.UnitOfMeasure,
        t.TransactionType,
        t.QuantityChanged,
        t.UnitCost,
        t.BalanceAfter,
        t.ReferenceOrderId,
        o.OrderNumber AS ReferenceOrderNumber,
        t.ReferencePOId,
        po.PONumber AS ReferencePONumber,
        t.Notes,
        t.RecordedByUserId,
        LTRIM(RTRIM(CONCAT(u.FirstName, ' ', ISNULL(u.LastName, '')))) AS RecordedByUserName,
        t.CreatedAt
    FROM dbo.InventoryTransactions t
    JOIN dbo.InventoryIngredients i ON t.IngredientId = i.IngredientId
    JOIN dbo.Branches b ON t.BranchId = b.BranchId
    LEFT JOIN dbo.Orders o ON t.ReferenceOrderId = o.OrderId
    LEFT JOIN dbo.PurchaseOrders po ON t.ReferencePOId = po.POId
    LEFT JOIN dbo.Users u ON t.RecordedByUserId = u.UserId
    WHERE (@BranchId IS NULL OR t.BranchId = @BranchId)
      AND (@IngredientId IS NULL OR t.IngredientId = @IngredientId)
      AND (@TransactionType IS NULL OR t.TransactionType = @TransactionType)
      AND (@StartDate IS NULL OR t.CreatedAt >= @StartDate)
      AND (@EndDate IS NULL OR t.CreatedAt <= @EndDate)
    ORDER BY t.CreatedAt DESC, t.TransactionId DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

    -- Recordset 2: Total Count
    SELECT COUNT(*) AS TotalCount
    FROM dbo.InventoryTransactions t
    WHERE (@BranchId IS NULL OR t.BranchId = @BranchId)
      AND (@IngredientId IS NULL OR t.IngredientId = @IngredientId)
      AND (@TransactionType IS NULL OR t.TransactionType = @TransactionType)
      AND (@StartDate IS NULL OR t.CreatedAt >= @StartDate)
      AND (@EndDate IS NULL OR t.CreatedAt <= @EndDate);
END;
GO

-- ============================================================================
-- 16. usp_Inventory_GetValuationReport
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_GetValuationReport
    @BranchId INT = NULL,
    @Category NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 1: Category Breakdown
    SELECT 
        i.Category,
        COUNT(*) AS IngredientsCount,
        SUM(i.CurrentStock) AS TotalStockUnits,
        SUM(i.CurrentStock * i.CostPerUnit) AS CategoryValuation
    FROM dbo.InventoryIngredients i
    WHERE i.IsDeleted = 0
      AND (@BranchId IS NULL OR i.BranchId = @BranchId)
      AND (@Category IS NULL OR i.Category = @Category)
    GROUP BY i.Category
    ORDER BY CategoryValuation DESC;

    -- Recordset 2: Overall Summary
    SELECT 
        COUNT(*) AS TotalActiveIngredients,
        SUM(i.CurrentStock * i.CostPerUnit) AS TotalInventoryValuation,
        SUM(CASE WHEN i.CurrentStock <= i.ReorderLevel THEN 1 ELSE 0 END) AS LowStockIngredientsCount,
        SUM(CASE WHEN i.CurrentStock <= i.MinimumStockLevel THEN 1 ELSE 0 END) AS CriticalStockIngredientsCount
    FROM dbo.InventoryIngredients i
    WHERE i.IsDeleted = 0
      AND (@BranchId IS NULL OR i.BranchId = @BranchId)
      AND (@Category IS NULL OR i.Category = @Category);
END;
GO

-- ============================================================================
-- 17. usp_Inventory_GetConsumptionReport
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Inventory_GetConsumptionReport
    @BranchId INT = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @StartDate = ISNULL(@StartDate, DATEADD(DAY, -30, SYSUTCDATETIME()));
    SET @EndDate = ISNULL(@EndDate, SYSUTCDATETIME());

    -- Recordset 1: Per-Ingredient Consumption and Wastage
    SELECT 
        i.IngredientId,
        i.IngredientCode,
        i.IngredientName,
        i.Category,
        i.UnitOfMeasure,
        ABS(SUM(CASE WHEN t.TransactionType = 'CONSUMPTION' THEN t.QuantityChanged ELSE 0 END)) AS TotalQuantityConsumed,
        SUM(CASE WHEN t.TransactionType = 'CONSUMPTION' THEN ABS(t.QuantityChanged) * t.UnitCost ELSE 0 END) AS TotalConsumptionCost,
        ABS(SUM(CASE WHEN t.TransactionType = 'WASTAGE' THEN t.QuantityChanged ELSE 0 END)) AS TotalQuantityWasted,
        SUM(CASE WHEN t.TransactionType = 'WASTAGE' THEN ABS(t.QuantityChanged) * t.UnitCost ELSE 0 END) AS TotalWastageCost,
        SUM(CASE WHEN t.TransactionType = 'RESTITUTION' THEN t.QuantityChanged ELSE 0 END) AS TotalQuantityRestituted
    FROM dbo.InventoryIngredients i
    JOIN dbo.InventoryTransactions t ON i.IngredientId = t.IngredientId
    WHERE i.IsDeleted = 0
      AND (@BranchId IS NULL OR i.BranchId = @BranchId)
      AND t.CreatedAt >= @StartDate AND t.CreatedAt <= @EndDate
      AND t.TransactionType IN ('CONSUMPTION', 'WASTAGE', 'RESTITUTION')
    GROUP BY i.IngredientId, i.IngredientCode, i.IngredientName, i.Category, i.UnitOfMeasure
    ORDER BY TotalConsumptionCost DESC;

    -- Recordset 2: Grand Totals
    SELECT 
        SUM(CASE WHEN t.TransactionType = 'CONSUMPTION' THEN ABS(t.QuantityChanged) * t.UnitCost ELSE 0 END) AS GrandConsumptionCost,
        SUM(CASE WHEN t.TransactionType = 'WASTAGE' THEN ABS(t.QuantityChanged) * t.UnitCost ELSE 0 END) AS GrandWastageCost,
        SUM(CASE WHEN t.TransactionType = 'RESTITUTION' THEN ABS(t.QuantityChanged) * t.UnitCost ELSE 0 END) AS GrandRestitutionCost
    FROM dbo.InventoryTransactions t
    WHERE (@BranchId IS NULL OR t.BranchId = @BranchId)
      AND t.CreatedAt >= @StartDate AND t.CreatedAt <= @EndDate
      AND t.TransactionType IN ('CONSUMPTION', 'WASTAGE', 'RESTITUTION');
END;
GO

-- ============================================================================
-- 18. usp_Recipe_CreateOrUpdate
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Recipe_CreateOrUpdate
    @MenuItemId BIGINT,
    @VariantId BIGINT = NULL,
    @YieldPortions INT = 1,
    @PreparationNotes NVARCHAR(MAX) = NULL,
    @IngredientsJson NVARCHAR(MAX),
    @RecipeId BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate MenuItem exists
    IF NOT EXISTS (SELECT 1 FROM dbo.MenuItems WHERE MenuItemId = @MenuItemId AND IsDeleted = 0)
    BEGIN
        RAISERROR('MENU_ITEM_NOT_FOUND', 16, 1);
        RETURN;
    END;

    -- Validate Variant if provided
    IF @VariantId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.MenuItemVariants WHERE VariantId = @VariantId AND MenuItemId = @MenuItemId AND IsDeleted = 0)
    BEGIN
        RAISERROR('VARIANT_NOT_FOUND_FOR_ITEM', 16, 1);
        RETURN;
    END;

    IF @YieldPortions < 1 SET @YieldPortions = 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Check if recipe already exists
        SELECT @RecipeId = RecipeId
        FROM dbo.Recipes
        WHERE MenuItemId = @MenuItemId 
          AND ((@VariantId IS NULL AND VariantId IS NULL) OR VariantId = @VariantId);

        IF @RecipeId IS NOT NULL
        BEGIN
            UPDATE dbo.Recipes
            SET YieldPortions = @YieldPortions,
                PreparationNotes = @PreparationNotes,
                IsActive = 1,
                UpdatedAt = SYSUTCDATETIME()
            WHERE RecipeId = @RecipeId;

            -- Clear existing ingredient mappings
            DELETE FROM dbo.RecipeIngredients WHERE RecipeId = @RecipeId;
        END
        ELSE
        BEGIN
            INSERT INTO dbo.Recipes (
                MenuItemId, VariantId, YieldPortions, PreparationNotes, IsActive, CreatedAt, UpdatedAt
            ) VALUES (
                @MenuItemId, @VariantId, @YieldPortions, @PreparationNotes, 1, SYSUTCDATETIME(), SYSUTCDATETIME()
            );
            SET @RecipeId = SCOPE_IDENTITY();
        END;

        -- Parse and Insert Recipe Ingredients
        INSERT INTO dbo.RecipeIngredients (
            RecipeId, IngredientId, RequiredQuantity, UnitOfMeasure, WastagePercentage
        )
        SELECT 
            @RecipeId,
            JSON_VALUE(value, '$.ingredientId'),
            CAST(JSON_VALUE(value, '$.requiredQuantity') AS DECIMAL(12,4)),
            UPPER(LTRIM(RTRIM(JSON_VALUE(value, '$.unitOfMeasure')))),
            ISNULL(CAST(JSON_VALUE(value, '$.wastagePercentage') AS DECIMAL(5,2)), 0.00)
        FROM OPENJSON(@IngredientsJson);

        COMMIT TRANSACTION;

        -- Return Recipe Detail
        EXEC dbo.usp_Recipe_GetByMenuItem @MenuItemId, @VariantId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 19. usp_Recipe_GetByMenuItem
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Recipe_GetByMenuItem
    @MenuItemId BIGINT,
    @VariantId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @RecipeId BIGINT;

    SELECT @RecipeId = RecipeId
    FROM dbo.Recipes
    WHERE MenuItemId = @MenuItemId 
      AND ((@VariantId IS NULL AND VariantId IS NULL) OR VariantId = @VariantId)
      AND IsActive = 1;

    -- Recordset 1: Recipe Header
    SELECT 
        r.RecipeId,
        r.MenuItemId,
        m.ItemName AS MenuItemName,
        m.ItemCode AS MenuItemCode,
        r.VariantId,
        v.VariantName,
        r.YieldPortions,
        r.PreparationNotes,
        r.IsActive,
        r.CreatedAt,
        r.UpdatedAt
    FROM dbo.Recipes r
    JOIN dbo.MenuItems m ON r.MenuItemId = m.MenuItemId
    LEFT JOIN dbo.MenuItemVariants v ON r.VariantId = v.VariantId
    WHERE r.RecipeId = @RecipeId;

    -- Recordset 2: Recipe Line Items
    SELECT 
        ri.RecipeIngredientId,
        ri.RecipeId,
        ri.IngredientId,
        ing.IngredientCode,
        ing.IngredientName,
        ri.RequiredQuantity,
        ri.UnitOfMeasure,
        ri.WastagePercentage,
        ing.CostPerUnit,
        (ri.RequiredQuantity * (1.0 + (ri.WastagePercentage / 100.0)) * ing.CostPerUnit) AS IngredientCostContribution,
        ing.CurrentStock
    FROM dbo.RecipeIngredients ri
    JOIN dbo.InventoryIngredients ing ON ri.IngredientId = ing.IngredientId
    WHERE ri.RecipeId = @RecipeId;
END;
GO

-- ============================================================================
-- 20. usp_Recipe_Delete
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Recipe_Delete
    @RecipeId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Recipes WHERE RecipeId = @RecipeId)
    BEGIN
        RAISERROR('RECIPE_NOT_FOUND', 16, 1);
        RETURN;
    END;

    UPDATE dbo.Recipes
    SET IsActive = 0,
        UpdatedAt = SYSUTCDATETIME()
    WHERE RecipeId = @RecipeId;

    SELECT 1 AS Success, 'Recipe deactivated successfully' AS Message;
END;
GO

-- ============================================================================
-- 21. usp_Supplier_Create
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Supplier_Create
    @BranchId INT = NULL,
    @SupplierCode NVARCHAR(30),
    @SupplierName NVARCHAR(120),
    @ContactPerson NVARCHAR(80) = NULL,
    @Phone NVARCHAR(25),
    @Email NVARCHAR(120) = NULL,
    @Address NVARCHAR(255) = NULL,
    @GSTIN NVARCHAR(50) = NULL,
    @PaymentTerms NVARCHAR(100) = NULL,
    @NewSupplierId INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM dbo.Suppliers WHERE SupplierCode = @SupplierCode AND IsDeleted = 0)
    BEGIN
        RAISERROR('SUPPLIER_CODE_EXISTS', 16, 1);
        RETURN;
    END;

    INSERT INTO dbo.Suppliers (
        BranchId, SupplierCode, SupplierName, ContactPerson, Phone,
        Email, Address, GSTIN, PaymentTerms, IsActive, CreatedAt, UpdatedAt, IsDeleted
    ) VALUES (
        @BranchId, UPPER(LTRIM(RTRIM(@SupplierCode))), LTRIM(RTRIM(@SupplierName)),
        @ContactPerson, LTRIM(RTRIM(@Phone)), @Email, @Address, @GSTIN,
        @PaymentTerms, 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0
    );

    SET @NewSupplierId = SCOPE_IDENTITY();

    SELECT 
        SupplierId, BranchId, SupplierCode, SupplierName, ContactPerson,
        Phone, Email, Address, GSTIN, PaymentTerms, IsActive, CreatedAt, UpdatedAt
    FROM dbo.Suppliers
    WHERE SupplierId = @NewSupplierId;
END;
GO

-- ============================================================================
-- 22. usp_Supplier_GetById
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Supplier_GetById
    @SupplierId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        s.SupplierId,
        s.BranchId,
        b.BranchName,
        s.SupplierCode,
        s.SupplierName,
        s.ContactPerson,
        s.Phone,
        s.Email,
        s.Address,
        s.GSTIN,
        s.PaymentTerms,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    FROM dbo.Suppliers s
    LEFT JOIN dbo.Branches b ON s.BranchId = b.BranchId
    WHERE s.SupplierId = @SupplierId AND s.IsDeleted = 0;
END;
GO

-- ============================================================================
-- 23. usp_Supplier_List
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Supplier_List
    @BranchId INT = NULL,
    @Search NVARCHAR(100) = NULL,
    @IsActive BIT = NULL,
    @Page INT = 1,
    @Limit INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    SET @Page = ISNULL(@Page, 1);
    IF @Page < 1 SET @Page = 1;
    SET @Limit = ISNULL(@Limit, 20);
    IF @Limit < 1 SET @Limit = 20;

    DECLARE @Offset INT = (@Page - 1) * @Limit;

    -- Recordset 1: Paginated Rows
    SELECT 
        s.SupplierId,
        s.BranchId,
        b.BranchName,
        s.SupplierCode,
        s.SupplierName,
        s.ContactPerson,
        s.Phone,
        s.Email,
        s.Address,
        s.GSTIN,
        s.PaymentTerms,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    FROM dbo.Suppliers s
    LEFT JOIN dbo.Branches b ON s.BranchId = b.BranchId
    WHERE s.IsDeleted = 0
      AND (@BranchId IS NULL OR s.BranchId IS NULL OR s.BranchId = @BranchId)
      AND (@IsActive IS NULL OR s.IsActive = @IsActive)
      AND (
          @Search IS NULL OR 
          s.SupplierName LIKE '%' + @Search + '%' OR 
          s.SupplierCode LIKE '%' + @Search + '%' OR
          s.ContactPerson LIKE '%' + @Search + '%'
      )
    ORDER BY s.SupplierName ASC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

    -- Recordset 2: Total Count
    SELECT COUNT(*) AS TotalCount
    FROM dbo.Suppliers s
    WHERE s.IsDeleted = 0
      AND (@BranchId IS NULL OR s.BranchId IS NULL OR s.BranchId = @BranchId)
      AND (@IsActive IS NULL OR s.IsActive = @IsActive)
      AND (
          @Search IS NULL OR 
          s.SupplierName LIKE '%' + @Search + '%' OR 
          s.SupplierCode LIKE '%' + @Search + '%' OR
          s.ContactPerson LIKE '%' + @Search + '%'
      );
END;
GO

-- ============================================================================
-- 24. usp_Supplier_Update
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Supplier_Update
    @SupplierId INT,
    @SupplierName NVARCHAR(120),
    @ContactPerson NVARCHAR(80) = NULL,
    @Phone NVARCHAR(25),
    @Email NVARCHAR(120) = NULL,
    @Address NVARCHAR(255) = NULL,
    @GSTIN NVARCHAR(50) = NULL,
    @PaymentTerms NVARCHAR(100) = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Suppliers WHERE SupplierId = @SupplierId AND IsDeleted = 0)
    BEGIN
        RAISERROR('SUPPLIER_NOT_FOUND', 16, 1);
        RETURN;
    END;

    UPDATE dbo.Suppliers
    SET 
        SupplierName = LTRIM(RTRIM(@SupplierName)),
        ContactPerson = @ContactPerson,
        Phone = LTRIM(RTRIM(@Phone)),
        Email = @Email,
        Address = @Address,
        GSTIN = @GSTIN,
        PaymentTerms = @PaymentTerms,
        IsActive = @IsActive,
        UpdatedAt = SYSUTCDATETIME()
    WHERE SupplierId = @SupplierId AND IsDeleted = 0;

    EXEC dbo.usp_Supplier_GetById @SupplierId;
END;
GO

-- ============================================================================
-- 25. usp_Supplier_Delete
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Supplier_Delete
    @SupplierId INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Suppliers WHERE SupplierId = @SupplierId AND IsDeleted = 0)
    BEGIN
        RAISERROR('SUPPLIER_NOT_FOUND', 16, 1);
        RETURN;
    END;

    -- Soft delete supplier
    UPDATE dbo.Suppliers
    SET IsDeleted = 1,
        IsActive = 0,
        DeletedAt = SYSUTCDATETIME(),
        UpdatedAt = SYSUTCDATETIME()
    WHERE SupplierId = @SupplierId;

    -- Nullify supplier reference in inventory items
    UPDATE dbo.InventoryIngredients
    SET PrimarySupplierId = NULL,
        UpdatedAt = SYSUTCDATETIME()
    WHERE PrimarySupplierId = @SupplierId;

    SELECT 1 AS Success, 'Supplier soft deleted successfully' AS Message;
END;
GO
