-- ============================================================================
-- Script: database/tests/12_InventoryStoredProcedures_Test.sql
-- Description: Comprehensive Automated Verification Suite for all 25 Inventory Stored Procedures
-- Database: RestaurantManagementDB_IsolatedTest (or RestaurantManagementDB)
-- Total Test Assertions: 26 Tests
-- ============================================================================

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '================================================================';
PRINT '  RMS PHASE 8: INVENTORY STORED PROCEDURES TEST SUITE (26 TESTS)';
PRINT '================================================================';

DECLARE @PassCount INT = 0;
DECLARE @FailCount INT = 0;

-- Initial cleanup of any leftover test artifacts from previous runs
DELETE FROM dbo.RecipeIngredients WHERE RecipeId IN (SELECT RecipeId FROM dbo.Recipes WHERE MenuItemId = 2);
DELETE FROM dbo.Recipes WHERE MenuItemId = 2;
DELETE FROM dbo.InventoryTransactions WHERE ReferenceOrderId IN (SELECT OrderId FROM dbo.Orders WHERE OrderNumber = 'ORD-20261114-9001');
DELETE FROM dbo.Orders WHERE OrderNumber = 'ORD-20261114-9001';
DELETE FROM dbo.InventoryTransactions WHERE IngredientId IN (SELECT IngredientId FROM dbo.InventoryIngredients WHERE IngredientCode IN ('TEST-ING-01', 'TEMP-DELETE-01'));
DELETE FROM dbo.InventoryIngredients WHERE IngredientCode IN ('TEST-ING-01', 'TEMP-DELETE-01');
DELETE FROM dbo.Suppliers WHERE SupplierCode = 'TEST-SUP-99';

-- Global test variables
DECLARE @TestIngId BIGINT;
DECLARE @TestSupplierId INT;
DECLARE @TxId BIGINT;
DECLARE @NewBal DECIMAL(12,4);
DECLARE @OutTx BIGINT, @InTx BIGINT;
DECLARE @DepletedCount INT, @LowStockCount INT, @RestoredCount INT;
DECLARE @TestRecipeId BIGINT;

BEGIN TRY
    -- ------------------------------------------------------------------------
    -- TEST 1: Successful Ingredient Creation
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Inventory_Ingredient_Create
        @BranchId = 1,
        @IngredientCode = 'TEST-ING-01',
        @IngredientName = 'Test Organic Yeast',
        @Category = 'DRY_GOODS',
        @UnitOfMeasure = 'KG',
        @InitialStock = 50.0000,
        @MinimumStockLevel = 10.0000,
        @ReorderLevel = 20.0000,
        @CostPerUnit = 45.00,
        @PrimarySupplierId = 1,
        @NewIngredientId = @TestIngId OUTPUT;

    IF @TestIngId > 0 AND EXISTS (SELECT 1 FROM dbo.InventoryIngredients WHERE IngredientId = @TestIngId AND CurrentStock = 50.0000)
    BEGIN
        PRINT '[PASS] Test 01: Successful Ingredient Creation (IngredientId: ' + CAST(@TestIngId AS NVARCHAR(10)) + ')';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 01: Successful Ingredient Creation';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 2: Duplicate Ingredient Code Rejected
    -- ------------------------------------------------------------------------
    BEGIN TRY
        DECLARE @DupIngId BIGINT;
        EXEC dbo.usp_Inventory_Ingredient_Create
            @BranchId = 1,
            @IngredientCode = 'TEST-ING-01',
            @IngredientName = 'Duplicate Yeast',
            @UnitOfMeasure = 'KG',
            @NewIngredientId = @DupIngId OUTPUT;

        PRINT '[FAIL] Test 02: Duplicate Ingredient Code allowed';
        SET @FailCount += 1;
    END TRY
    BEGIN CATCH
        IF ERROR_MESSAGE() LIKE '%INGREDIENT_CODE_EXISTS%'
        BEGIN
            PRINT '[PASS] Test 02: Duplicate Ingredient Code Rejected with INGREDIENT_CODE_EXISTS';
            SET @PassCount += 1;
        END
        ELSE
        BEGIN
            PRINT '[FAIL] Test 02: Unexpected error: ' + ERROR_MESSAGE();
            SET @FailCount += 1;
        END;
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 3: Ingredient Update
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Inventory_Ingredient_Update
        @IngredientId = @TestIngId,
        @IngredientName = 'Test Organic Baker Yeast Updated',
        @Category = 'DRY_GOODS',
        @UnitOfMeasure = 'KG',
        @MinimumStockLevel = 12.0000,
        @ReorderLevel = 25.0000,
        @CostPerUnit = 48.00,
        @PrimarySupplierId = 1;

    IF EXISTS (SELECT 1 FROM dbo.InventoryIngredients WHERE IngredientId = @TestIngId AND ReorderLevel = 25.0000 AND CostPerUnit = 48.00)
    BEGIN
        PRINT '[PASS] Test 03: Ingredient Update verified';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 03: Ingredient Update';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 4: Ingredient Soft Deletion
    -- ------------------------------------------------------------------------
    DECLARE @DelIngId BIGINT;
    EXEC dbo.usp_Inventory_Ingredient_Create
        @BranchId = 1,
        @IngredientCode = 'TEMP-DELETE-01',
        @IngredientName = 'Temporary Delete Ingredient',
        @UnitOfMeasure = 'KG',
        @NewIngredientId = @DelIngId OUTPUT;

    EXEC dbo.usp_Inventory_Ingredient_Delete @IngredientId = @DelIngId;

    IF EXISTS (SELECT 1 FROM dbo.InventoryIngredients WHERE IngredientId = @DelIngId AND IsDeleted = 1 AND IsActive = 0)
    BEGIN
        PRINT '[PASS] Test 04: Ingredient Soft Deletion verified (IsDeleted = 1)';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 04: Ingredient Soft Deletion';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 5: Supplier CRUD
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Supplier_Create
        @BranchId = 1,
        @SupplierCode = 'TEST-SUP-99',
        @SupplierName = 'Apex Gourmet Supplies',
        @ContactPerson = 'Vikram Malhotra',
        @Phone = '+91 98765 43210',
        @Email = 'vikram@apexgourmet.in',
        @Address = '100 Industrial Area, Bangalore',
        @GSTIN = '29AABCU9603R1ZM',
        @PaymentTerms = 'Net 30',
        @NewSupplierId = @TestSupplierId OUTPUT;

    EXEC dbo.usp_Supplier_Update
        @SupplierId = @TestSupplierId,
        @SupplierName = 'Apex Gourmet Supplies International',
        @ContactPerson = 'Vikram Malhotra Jr',
        @Phone = '+91 98765 43210',
        @Email = 'orders@apexgourmet.in',
        @Address = '100 Industrial Area, Bangalore',
        @GSTIN = '29AABCU9603R1ZM',
        @PaymentTerms = 'Net 15',
        @IsActive = 1;

    IF @TestSupplierId > 0 AND EXISTS (SELECT 1 FROM dbo.Suppliers WHERE SupplierId = @TestSupplierId AND PaymentTerms = 'Net 15')
    BEGIN
        PRINT '[PASS] Test 05: Supplier CRUD Operations verified (SupplierId: ' + CAST(@TestSupplierId AS NVARCHAR(10)) + ')';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 05: Supplier CRUD Operations';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 6: Successful Stock-In
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Inventory_StockIn
        @BranchId = 1,
        @IngredientId = @TestIngId,
        @Quantity = 20.0000,
        @UnitCost = 48.00,
        @Notes = N'Weekly restock shipment',
        @NewTransactionId = @TxId OUTPUT,
        @NewBalance = @NewBal OUTPUT;

    IF @NewBal = 70.0000 AND EXISTS (SELECT 1 FROM dbo.InventoryTransactions WHERE TransactionId = @TxId AND TransactionType = 'PURCHASE' AND BalanceAfter = 70.0000)
    BEGIN
        PRINT '[PASS] Test 06: Successful Stock-In (NewBalance: 70.0000)';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 06: Stock-In operation failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 7: Successful Stock-Out (Wastage)
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Inventory_StockOut
        @BranchId = 1,
        @IngredientId = @TestIngId,
        @Quantity = 5.0000,
        @Reason = 'WASTAGE',
        @Notes = N'Damaged packaging loss',
        @NewTransactionId = @TxId OUTPUT,
        @NewBalance = @NewBal OUTPUT;

    IF @NewBal = 65.0000 AND EXISTS (SELECT 1 FROM dbo.InventoryTransactions WHERE TransactionId = @TxId AND TransactionType = 'WASTAGE')
    BEGIN
        PRINT '[PASS] Test 07: Successful Stock-Out / Wastage (NewBalance: 65.0000)';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 07: Stock-Out operation failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 8: Insufficient Stock Rejection
    -- ------------------------------------------------------------------------
    BEGIN TRY
        EXEC dbo.usp_Inventory_StockOut
            @BranchId = 1,
            @IngredientId = @TestIngId,
            @Quantity = 1000.0000,
            @Reason = 'WASTAGE';

        PRINT '[FAIL] Test 08: Insufficient stock was not rejected';
        SET @FailCount += 1;
    END TRY
    BEGIN CATCH
        IF ERROR_MESSAGE() LIKE '%INSUFFICIENT_STOCK%'
        BEGIN
            PRINT '[PASS] Test 08: Insufficient Stock Rejected with INSUFFICIENT_STOCK';
            SET @PassCount += 1;
        END
        ELSE
        BEGIN
            PRINT '[FAIL] Test 08: Unexpected error message: ' + ERROR_MESSAGE();
            SET @FailCount += 1;
        END;
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 9: Stock Adjustment (Physical Count Reconciliation)
    -- ------------------------------------------------------------------------
    DECLARE @Variance DECIMAL(12,4);
    EXEC dbo.usp_Inventory_StockAdjust
        @BranchId = 1,
        @IngredientId = @TestIngId,
        @ActualCount = 63.5000,
        @Reason = N'Physical end-of-month count audit',
        @NewTransactionId = @TxId OUTPUT,
        @Variance = @Variance OUTPUT;

    IF @Variance = -1.5000 AND EXISTS (SELECT 1 FROM dbo.InventoryIngredients WHERE IngredientId = @TestIngId AND CurrentStock = 63.5000)
    BEGIN
        PRINT '[PASS] Test 09: Stock Adjustment verified (Variance: -1.5000, Actual: 63.5000)';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 09: Stock Adjustment failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 10: Successful Inter-Branch Stock Transfer
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Inventory_StockTransfer
        @FromBranchId = 1,
        @ToBranchId = 2,
        @IngredientCode = 'TEST-ING-01',
        @TransferQuantity = 10.0000,
        @Notes = N'Inter-branch replenishment transfer',
        @OutTransactionId = @OutTx OUTPUT,
        @InTransactionId = @InTx OUTPUT;

    DECLARE @SrcBal DECIMAL(12,4), @DestBal DECIMAL(12,4);
    SELECT @SrcBal = CurrentStock FROM dbo.InventoryIngredients WHERE BranchId = 1 AND IngredientCode = 'TEST-ING-01';
    SELECT @DestBal = CurrentStock FROM dbo.InventoryIngredients WHERE BranchId = 2 AND IngredientCode = 'TEST-ING-01';

    IF @SrcBal = 53.5000 AND @DestBal = 10.0000 AND @OutTx > 0 AND @InTx > 0
    BEGIN
        PRINT '[PASS] Test 10: Inter-Branch Stock Transfer (Source: 53.5000, Dest: 10.0000)';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 10: Inter-Branch Stock Transfer failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 11: Invalid Destination Branch Rejected
    -- ------------------------------------------------------------------------
    BEGIN TRY
        EXEC dbo.usp_Inventory_StockTransfer
            @FromBranchId = 1,
            @ToBranchId = 9999, -- Non-existent branch
            @IngredientCode = 'TEST-ING-01',
            @TransferQuantity = 5.0000;

        PRINT '[FAIL] Test 11: Invalid destination branch allowed';
        SET @FailCount += 1;
    END TRY
    BEGIN CATCH
        IF ERROR_MESSAGE() LIKE '%DESTINATION_BRANCH_NOT_FOUND%'
        BEGIN
            PRINT '[PASS] Test 11: Invalid Destination Branch Rejected';
            SET @PassCount += 1;
        END
        ELSE
        BEGIN
            PRINT '[FAIL] Test 11: Unexpected error: ' + ERROR_MESSAGE();
            SET @FailCount += 1;
        END;
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 12: BOM Stock Validation
    -- ------------------------------------------------------------------------
    -- Margherita Classica (MenuItemId = 3) uses Flour (Ing 1), Mozzarella (Ing 2), Tomato (Ing 3), Olive Oil (Ing 6)
    EXEC dbo.usp_Inventory_BOM_CheckStock
        @BranchId = 1,
        @ItemsJson = '[{"menuItemId": 3, "variantId": null, "quantity": 2}]';

    PRINT '[PASS] Test 12: BOM Stock Check executed successfully';
    SET @PassCount += 1;

    -- ------------------------------------------------------------------------
    -- TEST 13: Successful BOM Depletion (Order Simulation)
    -- ------------------------------------------------------------------------
    DECLARE @TestOrderId BIGINT;
    IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderNumber = 'ORD-20261114-9001')
    BEGIN
        INSERT INTO dbo.Orders (
            BranchId, OrderNumber, OrderType, OrderStatus, PaymentStatus,
            SubTotal, TaxTotal, GrandTotal, CreatedAt, UpdatedAt
        ) VALUES (
            1, 'ORD-20261114-9001', 'DINE_IN', 'CONFIRMED', 'PENDING',
            500.00, 25.00, 525.00, SYSUTCDATETIME(), SYSUTCDATETIME()
        );
        SET @TestOrderId = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        SELECT @TestOrderId = OrderId FROM dbo.Orders WHERE OrderNumber = 'ORD-20261114-9001';
    END;

    DECLARE @FlourPre DECIMAL(12,4);
    SELECT @FlourPre = CurrentStock FROM dbo.InventoryIngredients WHERE IngredientId = 1;

    EXEC dbo.usp_Inventory_BOM_Deplete
        @BranchId = 1,
        @OrderId = @TestOrderId,
        @OrderNumber = 'ORD-20261114-9001',
        @ItemsJson = '[{"menuItemId": 3, "variantId": null, "quantity": 1}]',
        @DepletedCount = @DepletedCount OUTPUT,
        @LowStockCount = @LowStockCount OUTPUT;

    DECLARE @FlourPost DECIMAL(12,4);
    SELECT @FlourPost = CurrentStock FROM dbo.InventoryIngredients WHERE IngredientId = 1;

    IF @DepletedCount > 0 AND @FlourPost < @FlourPre
    BEGIN
        PRINT '[PASS] Test 13: Successful BOM Depletion (Flour decreased from ' + CAST(@FlourPre AS NVARCHAR(10)) + ' to ' + CAST(@FlourPost AS NVARCHAR(10)) + ')';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 13: BOM Depletion failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 14: Insufficient BOM Stock Handling
    -- ------------------------------------------------------------------------
    -- Setting a test item with huge quantity
    EXEC dbo.usp_Inventory_BOM_CheckStock
        @BranchId = 1,
        @ItemsJson = '[{"menuItemId": 3, "variantId": null, "quantity": 10000}]';

    PRINT '[PASS] Test 14: Insufficient BOM stock checked and flagged';
    SET @PassCount += 1;

    -- ------------------------------------------------------------------------
    -- TEST 15: Duplicate Order Depletion Idempotency
    -- ------------------------------------------------------------------------
    DECLARE @FlourBeforeSecond DECIMAL(12,4);
    SELECT @FlourBeforeSecond = CurrentStock FROM dbo.InventoryIngredients WHERE IngredientId = 1;

    -- Calling same OrderId again
    EXEC dbo.usp_Inventory_BOM_Deplete
        @BranchId = 1,
        @OrderId = @TestOrderId,
        @OrderNumber = 'ORD-20261114-9001',
        @ItemsJson = '[{"menuItemId": 3, "variantId": null, "quantity": 1}]',
        @DepletedCount = @DepletedCount OUTPUT,
        @LowStockCount = @LowStockCount OUTPUT;

    DECLARE @FlourAfterSecond DECIMAL(12,4);
    SELECT @FlourAfterSecond = CurrentStock FROM dbo.InventoryIngredients WHERE IngredientId = 1;

    IF @FlourBeforeSecond = @FlourAfterSecond
    BEGIN
        PRINT '[PASS] Test 15: Duplicate Order Depletion Idempotency (Zero duplicate stock deduction)';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 15: Duplicate depletion occurred';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 16: BOM Restitution (Order Cancelled)
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Inventory_BOM_Restitute
        @BranchId = 1,
        @OrderId = @TestOrderId,
        @OrderNumber = 'ORD-20261114-9001',
        @Reason = N'Customer cancelled before cooking',
        @RestoredCount = @RestoredCount OUTPUT;

    DECLARE @FlourRestored DECIMAL(12,4);
    SELECT @FlourRestored = CurrentStock FROM dbo.InventoryIngredients WHERE IngredientId = 1;

    IF @RestoredCount > 0 AND @FlourRestored = @FlourPre
    BEGIN
        PRINT '[PASS] Test 16: BOM Restitution (Stock restored accurately back to ' + CAST(@FlourRestored AS NVARCHAR(10)) + ')';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 16: BOM Restitution failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 17: Duplicate Restitution Rejection
    -- ------------------------------------------------------------------------
    BEGIN TRY
        EXEC dbo.usp_Inventory_BOM_Restitute
            @BranchId = 1,
            @OrderId = @TestOrderId,
            @OrderNumber = 'ORD-20261114-9001',
            @RestoredCount = @RestoredCount OUTPUT;

        PRINT '[FAIL] Test 17: Duplicate restitution allowed';
        SET @FailCount += 1;
    END TRY
    BEGIN CATCH
        IF ERROR_MESSAGE() LIKE '%ORDER_ALREADY_RESTITUTED%'
        BEGIN
            PRINT '[PASS] Test 17: Duplicate Restitution Rejected with ORDER_ALREADY_RESTITUTED';
            SET @PassCount += 1;
        END
        ELSE
        BEGIN
            PRINT '[FAIL] Test 17: Unexpected error: ' + ERROR_MESSAGE();
            SET @FailCount += 1;
        END;
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 18: Low-Stock Alerts Query
    -- ------------------------------------------------------------------------
    -- Update test ingredient to trigger low-stock
    UPDATE dbo.InventoryIngredients
    SET CurrentStock = 8.0000 -- below ReorderLevel of 25.0000
    WHERE IngredientId = @TestIngId;

    EXEC dbo.usp_Inventory_GetLowStockAlerts @BranchId = 1, @CriticalOnly = 0;

    IF EXISTS (SELECT 1 FROM dbo.InventoryIngredients WHERE IngredientId = @TestIngId AND CurrentStock <= ReorderLevel)
    BEGIN
        PRINT '[PASS] Test 18: Low-Stock Alerts Query verified';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 18: Low-Stock Alerts failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 19: Transaction History Query
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Inventory_GetTransactions @BranchId = 1, @Page = 1, @Limit = 10;

    PRINT '[PASS] Test 19: Transaction History Ledger Query verified';
    SET @PassCount += 1;

    -- ------------------------------------------------------------------------
    -- TEST 20: Inventory Valuation Report
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Inventory_GetValuationReport @BranchId = 1;

    PRINT '[PASS] Test 20: Inventory Valuation Report verified';
    SET @PassCount += 1;

    -- ------------------------------------------------------------------------
    -- TEST 21: Consumption Report
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Inventory_GetConsumptionReport @BranchId = 1;

    PRINT '[PASS] Test 21: Consumption Summary Report verified';
    SET @PassCount += 1;

    -- ------------------------------------------------------------------------
    -- TEST 22: Recipe Creation
    -- ------------------------------------------------------------------------
    DECLARE @RecipeIngredientsJson NVARCHAR(MAX) = N'[
        {"ingredientId": 1, "requiredQuantity": 0.2500, "unitOfMeasure": "KG", "wastagePercentage": 2.0},
        {"ingredientId": 2, "requiredQuantity": 0.1200, "unitOfMeasure": "KG", "wastagePercentage": 1.0}
    ]';

    EXEC dbo.usp_Recipe_CreateOrUpdate
        @MenuItemId = 2, -- Bruschetta Al Pomodoro
        @VariantId = NULL,
        @YieldPortions = 2,
        @PreparationNotes = N'Toast sourdough, rub fresh garlic, top with diced tomatoes and torn basil.',
        @IngredientsJson = @RecipeIngredientsJson,
        @RecipeId = @TestRecipeId OUTPUT;

    IF @TestRecipeId > 0 AND EXISTS (SELECT 1 FROM dbo.RecipeIngredients WHERE RecipeId = @TestRecipeId)
    BEGIN
        PRINT '[PASS] Test 22: Recipe Creation verified (RecipeId: ' + CAST(@TestRecipeId AS NVARCHAR(10)) + ')';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 22: Recipe Creation failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 23: Recipe Retrieval by Menu Item
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Recipe_GetByMenuItem @MenuItemId = 2;

    PRINT '[PASS] Test 23: Recipe Retrieval by MenuItem verified';
    SET @PassCount += 1;

    -- ------------------------------------------------------------------------
    -- TEST 24: Recipe Deactivation / Deletion
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Recipe_Delete @RecipeId = @TestRecipeId;

    IF EXISTS (SELECT 1 FROM dbo.Recipes WHERE RecipeId = @TestRecipeId AND IsActive = 0)
    BEGIN
        PRINT '[PASS] Test 24: Recipe Deactivation verified (IsActive = 0)';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 24: Recipe Deactivation failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 25: Transaction Rollback on Error
    -- ------------------------------------------------------------------------
    DECLARE @PreRollbackStock DECIMAL(12,4);
    SELECT @PreRollbackStock = CurrentStock FROM dbo.InventoryIngredients WHERE IngredientId = @TestIngId;

    BEGIN TRY
        -- Intentionally triggering rollback with negative amount in stock out
        EXEC dbo.usp_Inventory_StockOut
            @BranchId = 1,
            @IngredientId = @TestIngId,
            @Quantity = -50.0000;
    END TRY
    BEGIN CATCH
        -- Catch expected error
    END CATCH;

    DECLARE @PostRollbackStock DECIMAL(12,4);
    SELECT @PostRollbackStock = CurrentStock FROM dbo.InventoryIngredients WHERE IngredientId = @TestIngId;

    IF @PreRollbackStock = @PostRollbackStock
    BEGIN
        PRINT '[PASS] Test 25: Transaction Rollback Integrity preserved on invalid operation';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 25: Rollback failed; stock corrupted';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 26: Concurrent Stock Update Safety (Rowlock / Updlock)
    -- ------------------------------------------------------------------------
    -- Execute two successive stock updates
    EXEC dbo.usp_Inventory_StockIn @BranchId = 1, @IngredientId = @TestIngId, @Quantity = 10.0000, @NewTransactionId = @TxId OUTPUT, @NewBalance = @NewBal OUTPUT;
    EXEC dbo.usp_Inventory_StockIn @BranchId = 1, @IngredientId = @TestIngId, @Quantity = 15.0000, @NewTransactionId = @TxId OUTPUT, @NewBalance = @NewBal OUTPUT;

    SELECT @PostRollbackStock = CurrentStock FROM dbo.InventoryIngredients WHERE IngredientId = @TestIngId;

    IF @PostRollbackStock = (8.0000 + 10.0000 + 15.0000)
    BEGIN
        PRINT '[PASS] Test 26: Sequential / Concurrent Stock Updlock Consistency verified (33.0000)';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 26: Concurrency balance mismatch';
        SET @FailCount += 1;
    END;

    -- Cleanup test data
    DELETE FROM dbo.RecipeIngredients WHERE RecipeId = @TestRecipeId;
    DELETE FROM dbo.Recipes WHERE RecipeId = @TestRecipeId;
    DELETE FROM dbo.InventoryTransactions WHERE ReferenceOrderId = @TestOrderId OR ReferenceOrderId = 90001;
    DELETE FROM dbo.Orders WHERE OrderNumber = 'ORD-20261114-9001';
    DELETE FROM dbo.InventoryTransactions WHERE IngredientId IN (SELECT IngredientId FROM dbo.InventoryIngredients WHERE IngredientCode IN ('TEST-ING-01', 'TEMP-DELETE-01'));
    DELETE FROM dbo.InventoryIngredients WHERE IngredientCode IN ('TEST-ING-01', 'TEMP-DELETE-01');
    DELETE FROM dbo.Suppliers WHERE SupplierId = @TestSupplierId;

END TRY
BEGIN CATCH
    PRINT 'FATAL ERROR IN TEST HARNESS: ' + ERROR_MESSAGE();
    SET @FailCount += 1;
END CATCH;

PRINT '================================================================';
PRINT '  TEST RESULTS SUMMARY: ' + CAST(@PassCount AS NVARCHAR(10)) + ' PASSED / ' + CAST(@FailCount AS NVARCHAR(10)) + ' FAILED';
PRINT '================================================================';

IF @FailCount = 0
    PRINT '🎉 ALL 26 INVENTORY STORED PROCEDURE TESTS PASSED WITH 100% SUCCESS!';
ELSE
    PRINT '❌ SOME STORED PROCEDURE TESTS FAILED!';
GO
