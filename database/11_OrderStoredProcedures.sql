-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS) - ORDER SERVICE STORED PROCEDURES
-- File: database/11_OrderStoredProcedures.sql
-- Description: Stored procedures for complete order placement, multi-recordset
--              retrieval, status lifecycle state machine, historical snapshots,
--              status history tracking, and cancellation.
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
-- 1. usp_Order_Create
-- Description: Transactionally places a new order with human-readable order number,
--              stores historical pricing/item snapshots, records addons, sets
--              initial PENDING status, and marks table as OCCUPIED (if dine-in).
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Order_Create
    @BranchId INT,
    @OrderType NVARCHAR(30) = 'DINE_IN', -- 'DINE_IN', 'TAKEAWAY', 'DELIVERY'
    @TableId INT = NULL,
    @CustomerId BIGINT = NULL,
    @GuestName NVARCHAR(100) = NULL,
    @GuestPhone NVARCHAR(25) = NULL,
    @DeliveryAddressId BIGINT = NULL,
    @WaitstaffUserId BIGINT = NULL,
    @CustomerNotes NVARCHAR(500) = NULL,
    @SubTotal DECIMAL(10,2),
    @TaxTotal DECIMAL(10,2),
    @ServiceCharge DECIMAL(10,2) = 0.00,
    @PackagingCharge DECIMAL(10,2) = 0.00,
    @DiscountTotal DECIMAL(10,2) = 0.00,
    @GrandTotal DECIMAL(10,2),
    @EstimatedDeliveryMinutes INT = NULL,
    @ItemsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Validate Branch
    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchId = @BranchId AND IsDeleted = 0)
    BEGIN
        RAISERROR('The specified branch does not exist.', 16, 1);
        RETURN;
    END;

    -- Validate OrderType
    IF @OrderType NOT IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY')
    BEGIN
        RAISERROR('Invalid order type. Must be DINE_IN, TAKEAWAY, or DELIVERY.', 16, 1);
        RETURN;
    END;

    -- If Dine-in, validate Table
    IF @OrderType = 'DINE_IN' AND @TableId IS NOT NULL
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM dbo.RestaurantTables 
            WHERE TableId = @TableId AND BranchId = @BranchId AND IsDeleted = 0
        )
        BEGIN
            RAISERROR('The specified dining table does not exist at this branch.', 16, 1);
            RETURN;
        END;
    END;

    -- If Delivery, validate Address
    IF @OrderType = 'DELIVERY' AND @DeliveryAddressId IS NOT NULL
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM dbo.CustomerAddresses 
            WHERE AddressId = @DeliveryAddressId AND IsDeleted = 0
        )
        BEGIN
            RAISERROR('The specified delivery address does not exist.', 16, 1);
            RETURN;
        END;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Generate Human-Readable Order Number (ORD-YYYYMMDD-XXXX)
        DECLARE @DateStamp NVARCHAR(8) = CONVERT(NVARCHAR(8), GETUTCDATE(), 112);
        DECLARE @Sequence INT;

        SELECT @Sequence = ISNULL(MAX(CAST(RIGHT(OrderNumber, 4) AS INT)), 0) + 1
        FROM dbo.Orders WITH (UPDLOCK, HOLDLOCK)
        WHERE OrderNumber LIKE 'ORD-' + @DateStamp + '-%';

        DECLARE @NewOrderNumber NVARCHAR(35) = 'ORD-' + @DateStamp + '-' + RIGHT('0000' + CAST(@Sequence AS NVARCHAR(4)), 4);

        -- 2. Insert Order Header
        INSERT INTO dbo.Orders (
            BranchId,
            OrderNumber,
            OrderType,
            TableId,
            CustomerId,
            GuestName,
            GuestPhone,
            DeliveryAddressId,
            WaitstaffUserId,
            OrderStatus,
            PaymentStatus,
            SubTotal,
            TaxTotal,
            ServiceCharge,
            PackagingCharge,
            DiscountTotal,
            TipAmount,
            GrandTotal,
            CustomerNotes,
            EstimatedDeliveryMinutes,
            CreatedAt,
            UpdatedAt,
            IsDeleted
        ) VALUES (
            @BranchId,
            @NewOrderNumber,
            @OrderType,
            @TableId,
            @CustomerId,
            @GuestName,
            @GuestPhone,
            @DeliveryAddressId,
            @WaitstaffUserId,
            'PENDING',
            'PENDING',
            @SubTotal,
            @TaxTotal,
            ISNULL(@ServiceCharge, 0.00),
            ISNULL(@PackagingCharge, 0.00),
            ISNULL(@DiscountTotal, 0.00),
            0.00,
            @GrandTotal,
            @CustomerNotes,
            @EstimatedDeliveryMinutes,
            SYSUTCDATETIME(),
            SYSUTCDATETIME(),
            0
        );

        DECLARE @NewOrderId BIGINT = SCOPE_IDENTITY();

        -- 3. If Table Dine-In, update Table Status to OCCUPIED and set ActiveOrderId
        IF @TableId IS NOT NULL
        BEGIN
            UPDATE dbo.RestaurantTables
            SET CurrentStatus = 'OCCUPIED',
                ActiveOrderId = @NewOrderId,
                UpdatedAt = SYSUTCDATETIME()
            WHERE TableId = @TableId;
        END;

        -- 4. Parse Items JSON and Insert OrderItems with Historical Snapshots
        IF @ItemsJson IS NOT NULL AND ISJSON(@ItemsJson) = 1
        BEGIN
            DECLARE item_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT 
                CAST(JSON_VALUE(value, '$.menuItemId') AS BIGINT),
                CASE WHEN JSON_VALUE(value, '$.variantId') IS NOT NULL 
                     THEN CAST(JSON_VALUE(value, '$.variantId') AS BIGINT) 
                     ELSE NULL END,
                JSON_VALUE(value, '$.itemNameSnapshot'),
                JSON_VALUE(value, '$.variantNameSnapshot'),
                CAST(JSON_VALUE(value, '$.unitPrice') AS DECIMAL(10,2)),
                CAST(JSON_VALUE(value, '$.quantity') AS INT),
                CAST(JSON_VALUE(value, '$.itemTotal') AS DECIMAL(10,2)),
                JSON_VALUE(value, '$.specialInstructions'),
                JSON_QUERY(value, '$.addons')
            FROM OPENJSON(@ItemsJson);

            DECLARE @cMenuItemId BIGINT, @cVariantId BIGINT, @cItemName NVARCHAR(120), @cVariantName NVARCHAR(60);
            DECLARE @cUnitPrice DECIMAL(10,2), @cQuantity INT, @cItemTotal DECIMAL(10,2), @cInstructions NVARCHAR(255);
            DECLARE @cAddonsJson NVARCHAR(MAX);

            OPEN item_cursor;
            FETCH NEXT FROM item_cursor INTO 
                @cMenuItemId, @cVariantId, @cItemName, @cVariantName, 
                @cUnitPrice, @cQuantity, @cItemTotal, @cInstructions, @cAddonsJson;

            WHILE @@FETCH_STATUS = 0
            BEGIN
                INSERT INTO dbo.OrderItems (
                    OrderId,
                    MenuItemId,
                    VariantId,
                    ItemNameSnapshot,
                    VariantNameSnapshot,
                    UnitPrice,
                    Quantity,
                    ItemTotal,
                    SpecialInstructions,
                    ItemStatus,
                    CreatedAt,
                    UpdatedAt
                ) VALUES (
                    @NewOrderId,
                    @cMenuItemId,
                    @cVariantId,
                    @cItemName,
                    @cVariantName,
                    @cUnitPrice,
                    @cQuantity,
                    @cItemTotal,
                    @cInstructions,
                    'PENDING',
                    SYSUTCDATETIME(),
                    SYSUTCDATETIME()
                );

                DECLARE @NewOrderItemId BIGINT = SCOPE_IDENTITY();

                -- Insert item addons if present
                IF @cAddonsJson IS NOT NULL AND ISJSON(@cAddonsJson) = 1
                BEGIN
                    INSERT INTO dbo.OrderItemAddons (
                        OrderItemId,
                        AddonItemId,
                        AddonNameSnapshot,
                        UnitPrice,
                        Quantity,
                        TotalPrice
                    )
                    SELECT 
                        @NewOrderItemId,
                        CAST(JSON_VALUE(a.value, '$.addonItemId') AS BIGINT),
                        JSON_VALUE(a.value, '$.addonNameSnapshot'),
                        CAST(JSON_VALUE(a.value, '$.unitPrice') AS DECIMAL(10,2)),
                        CAST(JSON_VALUE(a.value, '$.quantity') AS INT),
                        CAST(JSON_VALUE(a.value, '$.totalPrice') AS DECIMAL(10,2))
                    FROM OPENJSON(@cAddonsJson) a;
                END;

                FETCH NEXT FROM item_cursor INTO 
                    @cMenuItemId, @cVariantId, @cItemName, @cVariantName, 
                    @cUnitPrice, @cQuantity, @cItemTotal, @cInstructions, @cAddonsJson;
            END;

            CLOSE item_cursor;
            DEALLOCATE item_cursor;
        END;

        -- 5. Record Initial Order Status History
        INSERT INTO dbo.OrderStatusHistory (
            OrderId,
            PreviousStatus,
            NewStatus,
            ChangedByUserId,
            Notes,
            ChangedAt
        ) VALUES (
            @NewOrderId,
            'NONE',
            'PENDING',
            ISNULL(@CustomerId, @WaitstaffUserId),
            N'Order created successfully via RMS Order Service',
            SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;

        -- Return complete order
        EXEC dbo.usp_Order_GetById @OrderId = @NewOrderId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 2. usp_Order_GetById
-- Description: Multi-recordset returning Header, Items, Addons, and Status History.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Order_GetById
    @OrderId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 1: Order Header
    SELECT 
        o.OrderId,
        o.BranchId,
        b.BranchName,
        o.OrderNumber,
        o.OrderType,
        o.TableId,
        t.TableNumber,
        sec.SectionName,
        o.CustomerId,
        u.FirstName + ' ' + u.LastName AS CustomerName,
        u.Email AS CustomerEmail,
        u.PhoneNumber AS CustomerPhone,
        o.GuestName,
        o.GuestPhone,
        o.DeliveryAddressId,
        addr.AddressLine1 + ISNULL(', ' + addr.AddressLine2, '') AS DeliveryAddressLine,
        addr.City AS DeliveryCity,
        addr.PostalCode AS DeliveryPostalCode,
        o.WaitstaffUserId,
        w.FirstName + ' ' + w.LastName AS WaitstaffName,
        o.OrderStatus,
        o.PaymentStatus,
        o.SubTotal,
        o.TaxTotal,
        o.ServiceCharge,
        o.PackagingCharge,
        o.DiscountTotal,
        o.TipAmount,
        o.GrandTotal,
        o.CustomerNotes,
        o.VoidReason,
        o.VoidedByUserId,
        o.EstimatedDeliveryMinutes,
        o.CreatedAt,
        o.UpdatedAt
    FROM dbo.Orders o
    JOIN dbo.Branches b ON o.BranchId = b.BranchId
    LEFT JOIN dbo.RestaurantTables t ON o.TableId = t.TableId
    LEFT JOIN dbo.DiningSections sec ON t.SectionId = sec.SectionId
    LEFT JOIN dbo.Users u ON o.CustomerId = u.UserId
    LEFT JOIN dbo.CustomerAddresses addr ON o.DeliveryAddressId = addr.AddressId
    LEFT JOIN dbo.Users w ON o.WaitstaffUserId = w.UserId
    WHERE o.OrderId = @OrderId AND o.IsDeleted = 0;

    -- Recordset 2: Order Items
    SELECT 
        oi.OrderItemId,
        oi.OrderId,
        oi.MenuItemId,
        oi.VariantId,
        oi.ItemNameSnapshot,
        oi.VariantNameSnapshot,
        oi.UnitPrice,
        oi.Quantity,
        oi.ItemTotal,
        oi.SpecialInstructions,
        oi.ItemStatus,
        oi.CreatedAt,
        oi.UpdatedAt
    FROM dbo.OrderItems oi
    WHERE oi.OrderId = @OrderId
    ORDER BY oi.OrderItemId ASC;

    -- Recordset 3: Order Item Addons
    SELECT 
        oia.OrderItemAddonId,
        oia.OrderItemId,
        oia.AddonItemId,
        oia.AddonNameSnapshot,
        oia.UnitPrice,
        oia.Quantity,
        oia.TotalPrice
    FROM dbo.OrderItemAddons oia
    JOIN dbo.OrderItems oi ON oia.OrderItemId = oi.OrderItemId
    WHERE oi.OrderId = @OrderId
    ORDER BY oia.OrderItemId ASC, oia.OrderItemAddonId ASC;

    -- Recordset 4: Order Status History
    SELECT 
        h.HistoryId,
        h.OrderId,
        h.PreviousStatus,
        h.NewStatus,
        h.ChangedByUserId,
        hu.FirstName + ' ' + hu.LastName AS ChangedByName,
        h.Notes,
        h.ChangedAt
    FROM dbo.OrderStatusHistory h
    LEFT JOIN dbo.Users hu ON h.ChangedByUserId = hu.UserId
    WHERE h.OrderId = @OrderId
    ORDER BY h.ChangedAt ASC;
END;
GO

-- ============================================================================
-- 3. usp_Order_GetByNumber
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Order_GetByNumber
    @OrderNumber NVARCHAR(35)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @OrderId BIGINT;

    SELECT @OrderId = OrderId
    FROM dbo.Orders
    WHERE OrderNumber = @OrderNumber AND IsDeleted = 0;

    IF @OrderId IS NULL
    BEGIN
        -- Empty result sets
        SELECT TOP 0 * FROM dbo.Orders;
        SELECT TOP 0 * FROM dbo.OrderItems;
        SELECT TOP 0 * FROM dbo.OrderItemAddons;
        SELECT TOP 0 * FROM dbo.OrderStatusHistory;
        RETURN;
    END;

    EXEC dbo.usp_Order_GetById @OrderId = @OrderId;
END;
GO

-- ============================================================================
-- 4. usp_Order_List
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Order_List
    @BranchId INT = NULL,
    @CustomerId BIGINT = NULL,
    @OrderStatus NVARCHAR(30) = NULL,
    @PaymentStatus NVARCHAR(30) = NULL,
    @OrderType NVARCHAR(30) = NULL,
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

    DECLARE @TotalCount INT;

    SELECT @TotalCount = COUNT(1)
    FROM dbo.Orders o
    WHERE o.IsDeleted = 0
      AND (@BranchId IS NULL OR o.BranchId = @BranchId)
      AND (@CustomerId IS NULL OR o.CustomerId = @CustomerId)
      AND (@OrderStatus IS NULL OR o.OrderStatus = @OrderStatus)
      AND (@PaymentStatus IS NULL OR o.PaymentStatus = @PaymentStatus)
      AND (@OrderType IS NULL OR o.OrderType = @OrderType)
      AND (@StartDate IS NULL OR o.CreatedAt >= @StartDate)
      AND (@EndDate IS NULL OR o.CreatedAt <= @EndDate);

    SELECT 
        o.OrderId,
        o.BranchId,
        b.BranchName,
        o.OrderNumber,
        o.OrderType,
        o.TableId,
        t.TableNumber,
        o.CustomerId,
        u.FirstName + ' ' + u.LastName AS CustomerName,
        o.GuestName,
        o.GuestPhone,
        o.OrderStatus,
        o.PaymentStatus,
        o.SubTotal,
        o.TaxTotal,
        o.GrandTotal,
        (SELECT COUNT(1) FROM dbo.OrderItems oi WHERE oi.OrderId = o.OrderId) AS TotalItems,
        o.CreatedAt,
        o.UpdatedAt,
        @TotalCount AS TotalCount,
        @Page AS CurrentPage,
        CEILING(CAST(@TotalCount AS FLOAT) / @Limit) AS TotalPages
    FROM dbo.Orders o
    JOIN dbo.Branches b ON o.BranchId = b.BranchId
    LEFT JOIN dbo.RestaurantTables t ON o.TableId = t.TableId
    LEFT JOIN dbo.Users u ON o.CustomerId = u.UserId
    WHERE o.IsDeleted = 0
      AND (@BranchId IS NULL OR o.BranchId = @BranchId)
      AND (@CustomerId IS NULL OR o.CustomerId = @CustomerId)
      AND (@OrderStatus IS NULL OR o.OrderStatus = @OrderStatus)
      AND (@PaymentStatus IS NULL OR o.PaymentStatus = @PaymentStatus)
      AND (@OrderType IS NULL OR o.OrderType = @OrderType)
      AND (@StartDate IS NULL OR o.CreatedAt >= @StartDate)
      AND (@EndDate IS NULL OR o.CreatedAt <= @EndDate)
    ORDER BY o.CreatedAt DESC
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY;
END;
GO

-- ============================================================================
-- 5. usp_Order_UpdateStatus
-- Description: State-machine status transitions:
--              PENDING -> CONFIRMED -> PREPARING -> READY -> COMPLETED (or CANCELLED)
--              Validates allowed transitions and updates table state.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Order_UpdateStatus
    @OrderId BIGINT,
    @NewStatus NVARCHAR(30),
    @ChangedByUserId BIGINT = NULL,
    @Notes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @CurrentStatus NVARCHAR(30);
    DECLARE @TableId INT;

    SELECT @CurrentStatus = OrderStatus, @TableId = TableId
    FROM dbo.Orders
    WHERE OrderId = @OrderId AND IsDeleted = 0;

    IF @CurrentStatus IS NULL
    BEGIN
        RAISERROR('Order not found.', 16, 1);
        RETURN;
    END;

    -- Validate transition logic
    IF @CurrentStatus = 'COMPLETED'
    BEGIN
        RAISERROR('Cannot change status of a COMPLETED order.', 16, 1);
        RETURN;
    END;

    IF @CurrentStatus = 'CANCELLED'
    BEGIN
        RAISERROR('Cannot change status of a CANCELLED order.', 16, 1);
        RETURN;
    END;

    -- Allowed state transitions:
    -- PENDING -> CONFIRMED, CANCELLED
    -- CONFIRMED -> PREPARING, CANCELLED
    -- PREPARING -> READY, CANCELLED
    -- READY -> SERVED, COMPLETED
    -- SERVED -> COMPLETED
    DECLARE @IsValidTransition BIT = 0;

    IF @CurrentStatus = 'PENDING' AND @NewStatus IN ('CONFIRMED', 'CANCELLED') SET @IsValidTransition = 1;
    IF @CurrentStatus = 'CONFIRMED' AND @NewStatus IN ('PREPARING', 'CANCELLED') SET @IsValidTransition = 1;
    IF @CurrentStatus = 'PREPARING' AND @NewStatus IN ('READY', 'CANCELLED') SET @IsValidTransition = 1;
    IF @CurrentStatus = 'READY' AND @NewStatus IN ('SERVED', 'COMPLETED') SET @IsValidTransition = 1;
    IF @CurrentStatus = 'SERVED' AND @NewStatus IN ('COMPLETED') SET @IsValidTransition = 1;

    IF @IsValidTransition = 0
    BEGIN
        DECLARE @ErrMsg NVARCHAR(200) = 'Invalid status transition from ' + @CurrentStatus + ' to ' + @NewStatus + '.';
        RAISERROR(@ErrMsg, 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Update order status
        UPDATE dbo.Orders
        SET OrderStatus = @NewStatus,
            UpdatedAt = SYSUTCDATETIME()
        WHERE OrderId = @OrderId;

        -- Record status change in history
        INSERT INTO dbo.OrderStatusHistory (
            OrderId,
            PreviousStatus,
            NewStatus,
            ChangedByUserId,
            Notes,
            ChangedAt
        ) VALUES (
            @OrderId,
            @CurrentStatus,
            @NewStatus,
            @ChangedByUserId,
            ISNULL(@Notes, N'Status updated from ' + @CurrentStatus + ' to ' + @NewStatus),
            SYSUTCDATETIME()
        );

        -- If completed and table was occupied, set table to CLEANING
        IF @NewStatus = 'COMPLETED' AND @TableId IS NOT NULL
        BEGIN
            UPDATE dbo.RestaurantTables
            SET CurrentStatus = 'CLEANING',
                ActiveOrderId = NULL,
                UpdatedAt = SYSUTCDATETIME()
            WHERE TableId = @TableId;
        END;

        COMMIT TRANSACTION;

        EXEC dbo.usp_Order_GetById @OrderId = @OrderId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 6. usp_Order_Cancel
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Order_Cancel
    @OrderId BIGINT,
    @CancelledByUserId BIGINT = NULL,
    @CancelReason NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @CurrentStatus NVARCHAR(30);
    DECLARE @TableId INT;

    SELECT @CurrentStatus = OrderStatus, @TableId = TableId
    FROM dbo.Orders
    WHERE OrderId = @OrderId AND IsDeleted = 0;

    IF @CurrentStatus IS NULL
    BEGIN
        RAISERROR('Order not found.', 16, 1);
        RETURN;
    END;

    IF @CurrentStatus IN ('COMPLETED', 'CANCELLED')
    BEGIN
        DECLARE @ErrMsg NVARCHAR(200) = 'Order is already ' + @CurrentStatus + ' and cannot be cancelled.';
        RAISERROR(@ErrMsg, 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Orders
        SET OrderStatus = 'CANCELLED',
            VoidReason = @CancelReason,
            VoidedByUserId = @CancelledByUserId,
            UpdatedAt = SYSUTCDATETIME()
        WHERE OrderId = @OrderId;

        INSERT INTO dbo.OrderStatusHistory (
            OrderId,
            PreviousStatus,
            NewStatus,
            ChangedByUserId,
            Notes,
            ChangedAt
        ) VALUES (
            @OrderId,
            @CurrentStatus,
            'CANCELLED',
            @CancelledByUserId,
            @CancelReason,
            SYSUTCDATETIME()
        );

        -- Free up table if occupied
        IF @TableId IS NOT NULL
        BEGIN
            UPDATE dbo.RestaurantTables
            SET CurrentStatus = 'AVAILABLE',
                ActiveOrderId = NULL,
                UpdatedAt = SYSUTCDATETIME()
            WHERE TableId = @TableId;
        END;

        COMMIT TRANSACTION;

        EXEC dbo.usp_Order_GetById @OrderId = @OrderId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- 7. usp_Order_GetStatusHistory
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Order_GetStatusHistory
    @OrderId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        h.HistoryId,
        h.OrderId,
        h.PreviousStatus,
        h.NewStatus,
        h.ChangedByUserId,
        u.FirstName + ' ' + u.LastName AS ChangedByName,
        h.Notes,
        h.ChangedAt
    FROM dbo.OrderStatusHistory h
    LEFT JOIN dbo.Users u ON h.ChangedByUserId = u.UserId
    WHERE h.OrderId = @OrderId
    ORDER BY h.ChangedAt ASC;
END;
GO

PRINT 'Order Service stored procedures successfully created in RestaurantManagementDB.';
GO
