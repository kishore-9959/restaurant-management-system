-- ============================================================================
-- Script: 06_StoredProcedures.sql
-- Description: Mission-critical, ACID-compliant stored procedures for high-concurrency
--              restaurant operations:
--              1. sp_PlaceOrderWithBOMDepletion (Order placement + KOT + Inventory BOM deduction)
--              2. sp_SettlePaymentAndCompleteOrder (Payment settlement + table status update)
--              3. sp_OpenCashRegisterShift (POS shift open & float initialization)
--              4. sp_CloseCashRegisterShift (POS shift close, Z-report & discrepancy calculation)
--              5. sp_CheckTableAvailability (Reservation conflict prevention engine)
-- Database: RestaurantManagementDB
-- Engine: Microsoft SQL Server 2019 / 2022
-- Author: Senior SQL Server Database Architect
-- Date: 2026-11-08
-- ============================================================================

USE RestaurantManagementDB;
GO

-- ============================================================================
-- PROCEDURE 1: sp_PlaceOrderWithBOMDepletion
-- Description: Places an order, generates KOTs, calculates totals, and automatically
--              deducts raw ingredient inventory via Recipe BOM within an atomic transaction.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_PlaceOrderWithBOMDepletion
    @BranchId INT,
    @OrderType NVARCHAR(30), -- 'DINE_IN', 'TAKEAWAY', 'DELIVERY'
    @TableId INT = NULL,
    @CustomerId BIGINT = NULL,
    @GuestName NVARCHAR(100) = NULL,
    @GuestPhone NVARCHAR(25) = NULL,
    @WaitstaffUserId BIGINT = NULL,
    @CustomerNotes NVARCHAR(500) = NULL,
    @ItemsJson NVARCHAR(MAX), -- JSON array: [{"menuItemId": 3, "variantId": 1, "quantity": 2, "specialInstructions": "Extra crispy"}]
    @NewOrderId BIGINT OUTPUT,
    @NewOrderNumber NVARCHAR(35) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Generate Order Number
        DECLARE @DateStamp NVARCHAR(8) = CONVERT(NVARCHAR(8), GETUTCDATE(), 112);
        DECLARE @Sequence INT;

        SELECT @Sequence = ISNULL(MAX(CAST(RIGHT(OrderNumber, 4) AS INT)), 0) + 1
        FROM dbo.Orders WITH (UPDLOCK, HOLDLOCK)
        WHERE OrderNumber LIKE 'ORD-' + @DateStamp + '-%';

        SET @NewOrderNumber = 'ORD-' + @DateStamp + '-' + RIGHT('0000' + CAST(@Sequence AS NVARCHAR(4)), 4);

        -- 2. Insert Base Order Header
        INSERT INTO dbo.Orders (
            BranchId, OrderNumber, OrderType, TableId, CustomerId,
            GuestName, GuestPhone, WaitstaffUserId, OrderStatus, PaymentStatus,
            CustomerNotes, CreatedAt, UpdatedAt
        ) VALUES (
            @BranchId, @NewOrderNumber, @OrderType, @TableId, @CustomerId,
            @GuestName, @GuestPhone, @WaitstaffUserId, 'ACCEPTED', 'PENDING',
            @CustomerNotes, SYSUTCDATETIME(), SYSUTCDATETIME()
        );

        SET @NewOrderId = SCOPE_IDENTITY();

        -- 3. If Table Dine-In, mark Table as OCCUPIED and assign ActiveOrderId
        IF @TableId IS NOT NULL
        BEGIN
            UPDATE dbo.RestaurantTables
            SET CurrentStatus = 'OCCUPIED',
                ActiveOrderId = @NewOrderId,
                UpdatedAt = SYSUTCDATETIME()
            WHERE TableId = @TableId;
        END

        -- 4. Parse Items JSON and Insert OrderItems
        DECLARE @OrderItemsTable TABLE (
            MenuItemId BIGINT,
            VariantId BIGINT,
            Quantity INT,
            SpecialInstructions NVARCHAR(255)
        );

        INSERT INTO @OrderItemsTable (MenuItemId, VariantId, Quantity, SpecialInstructions)
        SELECT 
            JSON_VALUE(value, '$.menuItemId'),
            JSON_VALUE(value, '$.variantId'),
            JSON_VALUE(value, '$.quantity'),
            JSON_VALUE(value, '$.specialInstructions')
        FROM OPENJSON(@ItemsJson);

        -- Insert with price snapshots
        INSERT INTO dbo.OrderItems (
            OrderId, MenuItemId, VariantId, ItemNameSnapshot, VariantNameSnapshot,
            UnitPrice, Quantity, ItemTotal, SpecialInstructions, ItemStatus, CreatedAt, UpdatedAt
        )
        SELECT 
            @NewOrderId,
            oit.MenuItemId,
            oit.VariantId,
            m.ItemName,
            v.VariantName,
            (m.BasePrice + ISNULL(v.PriceAdjustment, 0.00)),
            oit.Quantity,
            ((m.BasePrice + ISNULL(v.PriceAdjustment, 0.00)) * oit.Quantity),
            oit.SpecialInstructions,
            'PENDING',
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        FROM @OrderItemsTable oit
        JOIN dbo.MenuItems m ON oit.MenuItemId = m.MenuItemId
        LEFT JOIN dbo.MenuItemVariants v ON oit.VariantId = v.VariantId;

        -- 5. Calculate Order Totals
        DECLARE @SubTotal DECIMAL(10,2) = 0.00;
        DECLARE @TaxTotal DECIMAL(10,2) = 0.00;
        DECLARE @GrandTotal DECIMAL(10,2) = 0.00;

        SELECT @SubTotal = SUM(ItemTotal) FROM dbo.OrderItems WHERE OrderId = @NewOrderId;
        SET @TaxTotal = ROUND(@SubTotal * 0.05, 2); -- 5% GST
        SET @GrandTotal = @SubTotal + @TaxTotal;

        UPDATE dbo.Orders
        SET SubTotal = @SubTotal,
            TaxTotal = @TaxTotal,
            GrandTotal = @GrandTotal
        WHERE OrderId = @NewOrderId;

        -- 6. Generate Kitchen Order Ticket (KOT)
        DECLARE @KOTNumber NVARCHAR(35) = 'KOT-' + @DateStamp + '-' + RIGHT('000' + CAST(@NewOrderId AS NVARCHAR(10)), 4);
        DECLARE @NewKOTId BIGINT;

        INSERT INTO dbo.KitchenOrderTickets (
            BranchId, KOTNumber, OrderId, KitchenStation, TicketStatus, CreatedAt
        ) VALUES (
            @BranchId, @KOTNumber, @NewOrderId, 'MAIN_KITCHEN', 'NEW', SYSUTCDATETIME()
        );

        SET @NewKOTId = SCOPE_IDENTITY();

        INSERT INTO dbo.KOTItems (KOTId, OrderItemId, PreparationStatus)
        SELECT @NewKOTId, OrderItemId, 'PENDING'
        FROM dbo.OrderItems
        WHERE OrderId = @NewOrderId;

        -- 7. Deduct Inventory Stock via Recipe Bill of Materials (BOM)
        -- Identify required ingredients across all items ordered
        DECLARE @BOMDeductions TABLE (
            IngredientId BIGINT,
            TotalDeduction DECIMAL(12,4)
        );

        INSERT INTO @BOMDeductions (IngredientId, TotalDeduction)
        SELECT 
            ri.IngredientId,
            SUM(ri.RequiredQuantity * (1.0 + (ri.WastagePercentage / 100.0)) * oi.Quantity)
        FROM dbo.OrderItems oi
        JOIN dbo.Recipes r ON oi.MenuItemId = r.MenuItemId 
            AND (r.VariantId IS NULL OR r.VariantId = oi.VariantId)
        JOIN dbo.RecipeIngredients ri ON r.RecipeId = ri.RecipeId
        WHERE oi.OrderId = @NewOrderId
        GROUP BY ri.IngredientId;

        -- Deduct from current stock
        UPDATE ing
        SET ing.CurrentStock = ing.CurrentStock - bom.TotalDeduction,
            ing.UpdatedAt = SYSUTCDATETIME()
        FROM dbo.InventoryIngredients ing
        JOIN @BOMDeductions bom ON ing.IngredientId = bom.IngredientId;

        -- Record Inventory Consumption Transactions
        INSERT INTO dbo.InventoryTransactions (
            BranchId, IngredientId, TransactionType, QuantityChanged,
            UnitCost, BalanceAfter, ReferenceOrderId, Notes, CreatedAt
        )
        SELECT 
            @BranchId,
            ing.IngredientId,
            'CONSUMPTION',
            (-1.0 * bom.TotalDeduction),
            ing.CostPerUnit,
            ing.CurrentStock,
            @NewOrderId,
            N'Auto BOM deduction for Order #' + @NewOrderNumber,
            SYSUTCDATETIME()
        FROM dbo.InventoryIngredients ing
        JOIN @BOMDeductions bom ON ing.IngredientId = bom.IngredientId;

        -- 8. Record Order Status History
        INSERT INTO dbo.OrderStatusHistory (
            OrderId, PreviousStatus, NewStatus, ChangedByUserId, Notes, ChangedAt
        ) VALUES (
            @NewOrderId, 'NONE', 'ACCEPTED', @WaitstaffUserId,
            N'Order created and KOT generated successfully', SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;

        SELECT 
            @NewOrderId AS OrderId,
            @NewOrderNumber AS OrderNumber,
            @GrandTotal AS GrandTotal,
            @NewKOTId AS KOTId,
            'SUCCESS' AS ResultStatus;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO

-- ============================================================================
-- PROCEDURE 2: sp_SettlePaymentAndCompleteOrder
-- Description: Records payment (Razorpay, Cash, Card, UPI), checks if fully paid,
--              updates Order to COMPLETED, and frees Table to CLEANING status.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_SettlePaymentAndCompleteOrder
    @OrderId BIGINT,
    @BranchId INT,
    @PaymentMethod NVARCHAR(30), -- 'RAZORPAY', 'CASH', 'CREDIT_CARD', 'UPI_OFFLINE'
    @Amount DECIMAL(10,2),
    @GatewayOrderId NVARCHAR(100) = NULL,
    @GatewayPaymentId NVARCHAR(100) = NULL,
    @GatewaySignature NVARCHAR(255) = NULL,
    @SettledByUserId BIGINT = NULL,
    @PaymentId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Verify Order Exists
        DECLARE @GrandTotal DECIMAL(10,2);
        DECLARE @CurrentPaymentStatus NVARCHAR(30);
        DECLARE @TableId INT;

        SELECT 
            @GrandTotal = GrandTotal,
            @CurrentPaymentStatus = PaymentStatus,
            @TableId = TableId
        FROM dbo.Orders WITH (UPDLOCK, HOLDLOCK)
        WHERE OrderId = @OrderId;

        IF @GrandTotal IS NULL
        BEGIN
            RAISERROR('Order does not exist.', 16, 1);
            RETURN;
        END

        -- 2. Insert Payment Record
        DECLARE @PaymentRef NVARCHAR(60) = 'PAY-' + CONVERT(NVARCHAR(8), GETUTCDATE(), 112) + '-' + RIGHT('00000' + CAST(@OrderId AS NVARCHAR(10)), 5);

        INSERT INTO dbo.Payments (
            OrderId, BranchId, PaymentReference, PaymentMethod, Amount,
            GatewayOrderId, GatewayPaymentId, GatewaySignature,
            PaymentStatus, SettledByUserId, SettledAt, CreatedAt, UpdatedAt
        ) VALUES (
            @OrderId, @BranchId, @PaymentRef, @PaymentMethod, @Amount,
            @GatewayOrderId, @GatewayPaymentId, @GatewaySignature,
            'SUCCESS', @SettledByUserId, SYSUTCDATETIME(), SYSUTCDATETIME(), SYSUTCDATETIME()
        );

        SET @PaymentId = SCOPE_IDENTITY();

        -- 3. Calculate Total Settled Payments
        DECLARE @TotalPaid DECIMAL(10,2);
        SELECT @TotalPaid = SUM(Amount) FROM dbo.Payments WHERE OrderId = @OrderId AND PaymentStatus = 'SUCCESS';

        -- 4. If Paid in Full, Complete Order and Free Table
        IF @TotalPaid >= @GrandTotal
        BEGIN
            UPDATE dbo.Orders
            SET PaymentStatus = 'PAID',
                OrderStatus = 'COMPLETED',
                UpdatedAt = SYSUTCDATETIME()
            WHERE OrderId = @OrderId;

            -- Table goes from OCCUPIED -> CLEANING
            IF @TableId IS NOT NULL
            BEGIN
                UPDATE dbo.RestaurantTables
                SET CurrentStatus = 'CLEANING',
                    ActiveOrderId = NULL,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE TableId = @TableId;
            END

            -- Log Status Change
            INSERT INTO dbo.OrderStatusHistory (OrderId, PreviousStatus, NewStatus, ChangedByUserId, Notes)
            VALUES (@OrderId, 'SERVED', 'COMPLETED', @SettledByUserId, N'Order paid in full and completed.');
        END
        ELSE
        BEGIN
            UPDATE dbo.Orders
            SET PaymentStatus = 'PARTIALLY_PAID',
                UpdatedAt = SYSUTCDATETIME()
            WHERE OrderId = @OrderId;
        END

        COMMIT TRANSACTION;

        SELECT 
            @PaymentId AS PaymentId,
            @PaymentRef AS PaymentReference,
            @TotalPaid AS TotalAmountPaid,
            (@GrandTotal - @TotalPaid) AS RemainingBalance,
            'SETTLED' AS TransactionStatus;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO

-- ============================================================================
-- PROCEDURE 3: sp_OpenCashRegisterShift
-- Description: Initializes a cashier's POS shift with starting float.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_OpenCashRegisterShift
    @BranchId INT,
    @CashierUserId BIGINT,
    @OpeningFloat DECIMAL(10,2),
    @ShiftNotes NVARCHAR(500) = NULL,
    @ShiftId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Ensure no open shift already exists for this cashier in this branch
    IF EXISTS (SELECT 1 FROM dbo.RegisterShifts WHERE BranchId = @BranchId AND CashierUserId = @CashierUserId AND Status = 'OPEN')
    BEGIN
        RAISERROR('Cashier already has an active OPEN register shift.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.RegisterShifts (
        BranchId, CashierUserId, OpenedAt, OpeningFloat, Status, ShiftNotes
    ) VALUES (
        @BranchId, @CashierUserId, SYSUTCDATETIME(), @OpeningFloat, 'OPEN', @ShiftNotes
    );

    SET @ShiftId = SCOPE_IDENTITY();
    SELECT @ShiftId AS ShiftId, 'OPEN' AS Status, @OpeningFloat AS OpeningFloat;
END;
GO

-- ============================================================================
-- PROCEDURE 4: sp_CloseCashRegisterShift
-- Description: Closes a cashier's POS shift, reconciles all tender types, computes
--              discrepancy (over/short), and generates Z-Report summary.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_CloseCashRegisterShift
    @ShiftId BIGINT,
    @ActualCashCounted DECIMAL(10,2),
    @ShiftNotes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @BranchId INT, @CashierUserId BIGINT, @OpenedAt DATETIME2(3), @OpeningFloat DECIMAL(10,2);

        SELECT 
            @BranchId = BranchId,
            @CashierUserId = CashierUserId,
            @OpenedAt = OpenedAt,
            @OpeningFloat = OpeningFloat
        FROM dbo.RegisterShifts WITH (UPDLOCK, HOLDLOCK)
        WHERE ShiftId = @ShiftId AND Status = 'OPEN';

        IF @BranchId IS NULL
        BEGIN
            RAISERROR('Register shift not found or already closed.', 16, 1);
            RETURN;
        END

        DECLARE @ClosedAt DATETIME2(3) = SYSUTCDATETIME();

        -- Aggregate sales processed during shift
        DECLARE @TotalCash DECIMAL(10,2) = 0.00;
        DECLARE @TotalCard DECIMAL(10,2) = 0.00;
        DECLARE @TotalUpi DECIMAL(10,2)  = 0.00;
        DECLARE @TotalRefunds DECIMAL(10,2) = 0.00;

        SELECT 
            @TotalCash = ISNULL(SUM(CASE WHEN PaymentMethod = 'CASH' THEN Amount ELSE 0 END), 0.00),
            @TotalCard = ISNULL(SUM(CASE WHEN PaymentMethod IN ('CREDIT_CARD', 'DEBIT_CARD') THEN Amount ELSE 0 END), 0.00),
            @TotalUpi  = ISNULL(SUM(CASE WHEN PaymentMethod IN ('RAZORPAY', 'UPI_OFFLINE') THEN Amount ELSE 0 END), 0.00)
        FROM dbo.Payments
        WHERE BranchId = @BranchId
          AND SettledByUserId = @CashierUserId
          AND PaymentStatus = 'SUCCESS'
          AND SettledAt BETWEEN @OpenedAt AND @ClosedAt;

        -- Aggregate refunds
        SELECT @TotalRefunds = ISNULL(SUM(RefundAmount), 0.00)
        FROM dbo.PaymentRefunds
        WHERE InitiatedByUserId = @CashierUserId
          AND ProcessedAt BETWEEN @OpenedAt AND @ClosedAt;

        DECLARE @ExpectedCash DECIMAL(10,2) = @OpeningFloat + @TotalCash - @TotalRefunds;
        DECLARE @CashDiff DECIMAL(10,2) = @ActualCashCounted - @ExpectedCash;

        -- Update Register Shift
        UPDATE dbo.RegisterShifts
        SET ClosedAt = @ClosedAt,
            TotalCashSales = @TotalCash,
            TotalCardSales = @TotalCard,
            TotalUpiSales = @TotalUpi,
            TotalRefunds = @TotalRefunds,
            ExpectedCash = @ExpectedCash,
            ActualCashCounted = @ActualCashCounted,
            CashDifference = @CashDiff,
            Status = 'CLOSED',
            ShiftNotes = ISNULL(@ShiftNotes, ShiftNotes)
        WHERE ShiftId = @ShiftId;

        COMMIT TRANSACTION;

        -- Return Z-Report Summary
        SELECT 
            @ShiftId AS ShiftId,
            @OpenedAt AS ShiftOpenedAt,
            @ClosedAt AS ShiftClosedAt,
            @OpeningFloat AS OpeningFloat,
            @TotalCash AS CashSales,
            @TotalCard AS CardSales,
            @TotalUpi AS UpiSales,
            @TotalRefunds AS Refunds,
            @ExpectedCash AS ExpectedDrawerCash,
            @ActualCashCounted AS ActualDrawerCash,
            @CashDiff AS DiscrepancyOverShort,
            'CLOSED' AS ShiftStatus;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO

-- ============================================================================
-- PROCEDURE 5: sp_CheckTableAvailability
-- Description: Queries non-conflicting available tables matching party capacity.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_CheckTableAvailability
    @BranchId INT,
    @ReservationDate DATE,
    @StartTime TIME(0),
    @EndTime TIME(0),
    @PartySize INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        t.TableId,
        t.TableNumber,
        s.SectionName,
        t.SeatingCapacity,
        t.CurrentStatus
    FROM dbo.RestaurantTables t
    JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE t.BranchId = @BranchId
      AND t.IsActive = 1
      AND t.IsDeleted = 0
      AND t.SeatingCapacity >= @PartySize
      -- Ensure no overlapping confirmed or seated reservation
      AND NOT EXISTS (
          SELECT 1 
          FROM dbo.Reservations r
          WHERE r.TableId = t.TableId
            AND r.ReservationDate = @ReservationDate
            AND r.Status IN ('CONFIRMED', 'SEATED')
            AND r.IsDeleted = 0
            -- Overlap condition: start < other.end AND end > other.start
            AND (@StartTime < r.EndTime AND @EndTime > r.StartTime)
      )
    ORDER BY t.SeatingCapacity ASC, t.TableNumber ASC;
END;
GO

PRINT 'All mission-critical stored procedures compiled successfully.';
GO

