-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS)
-- Script 14: Kitchen Service & Notification Service Stored Procedures
-- File: database/14_KitchenNotificationStoredProcedures.sql
-- Description: 100% Parameterized Stored Procedures for KDS & Real-time Notifications.
-- Procedures: 146 through 162
-- ============================================================================

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- SECTION 1: KITCHEN ORDER TICKETS (KDS) STORED PROCEDURES
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 146: dbo.usp_KOT_Create
-- Description: Creates a new Kitchen Order Ticket (KOT) with station splitting
--              and idempotency guard.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_KOT_Create', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_KOT_Create;
GO

CREATE PROCEDURE dbo.usp_KOT_Create
    @BranchId INT,
    @OrderId BIGINT,
    @KitchenStation NVARCHAR(40) = 'MAIN_KITCHEN',
    @SpecialKitchenNotes NVARCHAR(500) = NULL,
    @ItemIdsJson NVARCHAR(MAX) = NULL,
    @KOTId BIGINT OUTPUT,
    @KOTNumber NVARCHAR(35) OUTPUT,
    @IsIdempotent BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @IsIdempotent = 0;
    SET @KOTId = NULL;
    SET @KOTNumber = NULL;

    BEGIN TRY
        -- 1. Input Validation
        IF @BranchId IS NULL OR @BranchId <= 0
            THROW 50001, 'BranchId is required and must be a positive integer.', 1;

        IF @OrderId IS NULL OR @OrderId <= 0
            THROW 50001, 'OrderId is required and must be a positive integer.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchId = @BranchId)
            THROW 50002, 'Specified BranchId does not exist.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderId = @OrderId)
            THROW 50002, 'Specified OrderId does not exist.', 1;

        IF @KitchenStation IS NULL OR LTRIM(RTRIM(@KitchenStation)) = ''
            SET @KitchenStation = 'MAIN_KITCHEN';

        -- 2. Idempotency Check: Active KOT for the same Order and Station
        SELECT TOP 1 
            @KOTId = KOTId,
            @KOTNumber = KOTNumber
        FROM dbo.KitchenOrderTickets WITH (UPDLOCK, HOLDLOCK)
        WHERE OrderId = @OrderId
          AND KitchenStation = @KitchenStation
          AND TicketStatus IN ('NEW', 'PREPARING', 'READY');

        IF @KOTId IS NOT NULL
        BEGIN
            SET @IsIdempotent = 1;
            RETURN;
        END;

        BEGIN TRANSACTION;

        -- 3. Generate Sequential Unique KOTNumber
        DECLARE @DatePart NVARCHAR(8) = FORMAT(SYSUTCDATETIME(), 'yyyyMMdd');
        DECLARE @BranchPart NVARCHAR(10) = CAST(@BranchId AS NVARCHAR(10));
        DECLARE @NextSeq INT;

        SELECT @NextSeq = ISNULL(COUNT(1), 0) + 1
        FROM dbo.KitchenOrderTickets WITH (UPDLOCK, HOLDLOCK)
        WHERE BranchId = @BranchId
          AND CAST(CreatedAt AS DATE) = CAST(SYSUTCDATETIME() AS DATE);

        SET @KOTNumber = 'KOT-' + @DatePart + '-' + @BranchPart + '-' + RIGHT('00000' + CAST(@NextSeq AS NVARCHAR(5)), 5);

        -- Double check uniqueness, handle rare race
        WHILE EXISTS (SELECT 1 FROM dbo.KitchenOrderTickets WHERE KOTNumber = @KOTNumber)
        BEGIN
            SET @NextSeq = @NextSeq + 1;
            SET @KOTNumber = 'KOT-' + @DatePart + '-' + @BranchPart + '-' + RIGHT('00000' + CAST(@NextSeq AS NVARCHAR(5)), 5);
        END;

        -- 4. Insert KOT Header
        INSERT INTO dbo.KitchenOrderTickets (
            BranchId,
            KOTNumber,
            OrderId,
            KitchenStation,
            TicketStatus,
            SpecialKitchenNotes,
            CreatedAt,
            BumpedAt
        )
        VALUES (
            @BranchId,
            @KOTNumber,
            @OrderId,
            @KitchenStation,
            'NEW',
            @SpecialKitchenNotes,
            SYSUTCDATETIME(),
            NULL
        );

        SET @KOTId = SCOPE_IDENTITY();

        -- 5. Insert KOT Items
        IF @ItemIdsJson IS NOT NULL AND ISJSON(@ItemIdsJson) = 1
        BEGIN
            INSERT INTO dbo.KOTItems (
                KOTId,
                OrderItemId,
                PreparationStatus,
                CompletedAt
            )
            SELECT 
                @KOTId,
                oi.OrderItemId,
                'PENDING',
                NULL
            FROM OPENJSON(@ItemIdsJson) WITH (OrderItemId BIGINT '$') j
            INNER JOIN dbo.OrderItems oi ON oi.OrderItemId = j.OrderItemId
            WHERE oi.OrderId = @OrderId;
        END
        ELSE
        BEGIN
            -- Default: associate all order items of this order
            INSERT INTO dbo.KOTItems (
                KOTId,
                OrderItemId,
                PreparationStatus,
                CompletedAt
            )
            SELECT 
                @KOTId,
                oi.OrderItemId,
                'PENDING',
                NULL
            FROM dbo.OrderItems oi
            WHERE oi.OrderId = @OrderId;
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrNum INT = ERROR_NUMBER();
        DECLARE @ErrState INT = ERROR_STATE();
        RAISERROR(@ErrMsg, 16, @ErrState);
    END CATCH
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 147: dbo.usp_KOT_GetById
-- Description: Multi-recordset fetch returning ticket header, order info,
--              items snapshot, and modifiers/addons.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_KOT_GetById', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_KOT_GetById;
GO

CREATE PROCEDURE dbo.usp_KOT_GetById
    @KOTId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @KOTId IS NULL OR @KOTId <= 0
    BEGIN
        RAISERROR('KOTId is required and must be a positive integer.', 16, 1);
        RETURN;
    END;

    -- Recordset 1: KOT Header & Parent Order metadata
    SELECT 
        kot.KOTId,
        kot.BranchId,
        b.BranchName,
        b.BranchCode,
        kot.KOTNumber,
        kot.OrderId,
        o.OrderNumber,
        o.OrderType,
        o.TableId,
        t.TableNumber,
        o.GuestName,
        o.GuestPhone,
        kot.KitchenStation,
        kot.TicketStatus,
        kot.SpecialKitchenNotes,
        kot.CreatedAt,
        kot.BumpedAt,
        DATEDIFF(MINUTE, kot.CreatedAt, ISNULL(kot.BumpedAt, SYSUTCDATETIME())) AS ElapsedMinutes
    FROM dbo.KitchenOrderTickets kot
    LEFT JOIN dbo.Branches b ON kot.BranchId = b.BranchId
    LEFT JOIN dbo.Orders o ON kot.OrderId = o.OrderId
    LEFT JOIN dbo.RestaurantTables t ON o.TableId = t.TableId
    WHERE kot.KOTId = @KOTId;

    -- Recordset 2: KOT Items
    SELECT 
        ki.KOTItemId,
        ki.KOTId,
        ki.OrderItemId,
        oi.MenuItemId,
        oi.ItemNameSnapshot,
        oi.VariantId,
        oi.VariantNameSnapshot,
        oi.UnitPrice,
        oi.Quantity,
        oi.ItemTotal,
        oi.SpecialInstructions,
        ki.PreparationStatus,
        ki.CompletedAt
    FROM dbo.KOTItems ki
    INNER JOIN dbo.OrderItems oi ON ki.OrderItemId = oi.OrderItemId
    WHERE ki.KOTId = @KOTId
    ORDER BY ki.KOTItemId ASC;

    -- Recordset 3: Addons for KOT Items
    SELECT 
        oia.OrderItemAddonId,
        oia.OrderItemId,
        oia.AddonItemId,
        oia.AddonNameSnapshot,
        oia.UnitPrice,
        oia.Quantity,
        oia.TotalPrice
    FROM dbo.OrderItemAddons oia
    INNER JOIN dbo.KOTItems ki ON oia.OrderItemId = ki.OrderItemId
    WHERE ki.KOTId = @KOTId
    ORDER BY oia.OrderItemAddonId ASC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 148: dbo.usp_KOT_GetByOrderId
-- Description: Returns all KOT tickets and summary counts for a given order.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_KOT_GetByOrderId', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_KOT_GetByOrderId;
GO

CREATE PROCEDURE dbo.usp_KOT_GetByOrderId
    @OrderId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrderId IS NULL OR @OrderId <= 0
    BEGIN
        RAISERROR('OrderId is required and must be a positive integer.', 16, 1);
        RETURN;
    END;

    SELECT 
        kot.KOTId,
        kot.BranchId,
        kot.KOTNumber,
        kot.OrderId,
        kot.KitchenStation,
        kot.TicketStatus,
        kot.SpecialKitchenNotes,
        kot.CreatedAt,
        kot.BumpedAt,
        DATEDIFF(MINUTE, kot.CreatedAt, ISNULL(kot.BumpedAt, SYSUTCDATETIME())) AS ElapsedMinutes,
        (SELECT COUNT(1) FROM dbo.KOTItems ki WHERE ki.KOTId = kot.KOTId) AS TotalItems,
        (SELECT COUNT(1) FROM dbo.KOTItems ki WHERE ki.KOTId = kot.KOTId AND ki.PreparationStatus = 'READY') AS ReadyItems
    FROM dbo.KitchenOrderTickets kot
    WHERE kot.OrderId = @OrderId
    ORDER BY kot.CreatedAt ASC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 149: dbo.usp_KOT_GetActiveBoard
-- Description: Primary KDS display screen procedure returning active tickets.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_KOT_GetActiveBoard', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_KOT_GetActiveBoard;
GO

CREATE PROCEDURE dbo.usp_KOT_GetActiveBoard
    @BranchId INT,
    @KitchenStation NVARCHAR(40) = NULL,
    @TicketStatus NVARCHAR(30) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @BranchId IS NULL OR @BranchId <= 0
    BEGIN
        RAISERROR('BranchId is required and must be a positive integer.', 16, 1);
        RETURN;
    END;

    SELECT 
        kot.KOTId,
        kot.BranchId,
        b.BranchName,
        b.BranchCode,
        kot.KOTNumber,
        kot.OrderId,
        o.OrderNumber,
        o.OrderType,
        o.TableId,
        t.TableNumber,
        o.GuestName,
        kot.KitchenStation,
        kot.TicketStatus,
        kot.SpecialKitchenNotes,
        kot.CreatedAt,
        kot.BumpedAt,
        DATEDIFF(MINUTE, kot.CreatedAt, SYSUTCDATETIME()) AS ElapsedMinutes,
        (SELECT COUNT(1) FROM dbo.KOTItems ki WHERE ki.KOTId = kot.KOTId) AS TotalItems,
        (SELECT COUNT(1) FROM dbo.KOTItems ki WHERE ki.KOTId = kot.KOTId AND ki.PreparationStatus = 'READY') AS ReadyItems
    FROM dbo.KitchenOrderTickets kot
    LEFT JOIN dbo.Branches b ON kot.BranchId = b.BranchId
    LEFT JOIN dbo.Orders o ON kot.OrderId = o.OrderId
    LEFT JOIN dbo.RestaurantTables t ON o.TableId = t.TableId
    WHERE kot.BranchId = @BranchId
      AND (@KitchenStation IS NULL OR kot.KitchenStation = @KitchenStation)
      AND (
          (@TicketStatus IS NOT NULL AND kot.TicketStatus = @TicketStatus)
          OR (@TicketStatus IS NULL AND kot.TicketStatus IN ('NEW', 'PREPARING', 'READY'))
      )
    ORDER BY kot.CreatedAt ASC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 150: dbo.usp_KOT_UpdateStatus
-- Description: Updates the lifecycle status of a KOT with state machine validation.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_KOT_UpdateStatus', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_KOT_UpdateStatus;
GO

CREATE PROCEDURE dbo.usp_KOT_UpdateStatus
    @KOTId BIGINT,
    @NewStatus NVARCHAR(30),
    @UpdatedByUserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @KOTId IS NULL OR @KOTId <= 0
            THROW 50001, 'KOTId is required and must be a positive integer.', 1;

        IF @NewStatus IS NULL OR LTRIM(RTRIM(@NewStatus)) = ''
            THROW 50001, 'NewStatus is required.', 1;

        SET @NewStatus = UPPER(LTRIM(RTRIM(@NewStatus)));

        IF @NewStatus NOT IN ('NEW', 'PREPARING', 'READY', 'BUMPED')
            THROW 50001, 'Invalid NewStatus. Allowed values: NEW, PREPARING, READY, BUMPED.', 1;

        BEGIN TRANSACTION;

        DECLARE @CurrentStatus NVARCHAR(30);
        DECLARE @BranchId INT;
        DECLARE @OrderId BIGINT;

        SELECT 
            @CurrentStatus = TicketStatus,
            @BranchId = BranchId,
            @OrderId = OrderId
        FROM dbo.KitchenOrderTickets WITH (UPDLOCK, HOLDLOCK)
        WHERE KOTId = @KOTId;

        IF @CurrentStatus IS NULL
            THROW 50004, 'KOT ticket not found.', 1;

        -- State Machine Validation
        IF @CurrentStatus = 'BUMPED'
            THROW 50001, 'Cannot transition a ticket that has already been BUMPED.', 1;

        IF @CurrentStatus = @NewStatus
        BEGIN
            -- Idempotent no-op
            COMMIT TRANSACTION;
            RETURN;
        END;

        IF @CurrentStatus = 'NEW' AND @NewStatus NOT IN ('PREPARING', 'READY', 'BUMPED')
            THROW 50001, 'Invalid transition from NEW.', 1;

        IF @CurrentStatus = 'PREPARING' AND @NewStatus NOT IN ('READY', 'BUMPED')
            THROW 50001, 'Invalid transition from PREPARING.', 1;

        IF @CurrentStatus = 'READY' AND @NewStatus NOT IN ('BUMPED')
            THROW 50001, 'Invalid transition from READY.', 1;

        -- Update Ticket
        UPDATE dbo.KitchenOrderTickets
        SET TicketStatus = @NewStatus,
            BumpedAt = CASE WHEN @NewStatus = 'BUMPED' THEN SYSUTCDATETIME() ELSE BumpedAt END
        WHERE KOTId = @KOTId;

        -- If transitioned to READY, set all items to READY
        IF @NewStatus = 'READY'
        BEGIN
            UPDATE dbo.KOTItems
            SET PreparationStatus = 'READY',
                CompletedAt = ISNULL(CompletedAt, SYSUTCDATETIME())
            WHERE KOTId = @KOTId AND PreparationStatus != 'READY';
        END;

        -- Audit Log if requested
        IF @UpdatedByUserId IS NOT NULL
        BEGIN
            INSERT INTO dbo.AuditLogs (
                BranchId,
                UserId,
                EntityName,
                EntityId,
                ActionType,
                ActionDescription,
                CreatedAt
            )
            VALUES (
                @BranchId,
                @UpdatedByUserId,
                'KitchenOrderTickets',
                CAST(@KOTId AS NVARCHAR(60)),
                'UPDATE_STATUS',
                'KOT status transitioned from ' + @CurrentStatus + ' to ' + @NewStatus,
                SYSUTCDATETIME()
            );
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrState INT = ERROR_STATE();
        RAISERROR(@ErrMsg, 16, @ErrState);
    END CATCH
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 151: dbo.usp_KOT_UpdateItemStatus
-- Description: Updates individual KOT item preparation status with parent rollup.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_KOT_UpdateItemStatus', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_KOT_UpdateItemStatus;
GO

CREATE PROCEDURE dbo.usp_KOT_UpdateItemStatus
    @KOTItemId BIGINT,
    @NewPreparationStatus NVARCHAR(30),
    @ParentKOTStatus NVARCHAR(30) = NULL OUTPUT,
    @AllOrderKOTsReady BIT = 0 OUTPUT,
    @ParentOrderId BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @AllOrderKOTsReady = 0;

    BEGIN TRY
        IF @KOTItemId IS NULL OR @KOTItemId <= 0
            THROW 50001, 'KOTItemId is required and must be a positive integer.', 1;

        IF @NewPreparationStatus IS NULL OR LTRIM(RTRIM(@NewPreparationStatus)) = ''
            THROW 50001, 'NewPreparationStatus is required.', 1;

        SET @NewPreparationStatus = UPPER(LTRIM(RTRIM(@NewPreparationStatus)));

        IF @NewPreparationStatus NOT IN ('PENDING', 'COOKING', 'READY')
            THROW 50001, 'Invalid NewPreparationStatus. Allowed values: PENDING, COOKING, READY.', 1;

        BEGIN TRANSACTION;

        DECLARE @KOTId BIGINT;
        DECLARE @CurrentItemStatus NVARCHAR(30);

        SELECT 
            @KOTId = ki.KOTId,
            @CurrentItemStatus = ki.PreparationStatus,
            @ParentOrderId = kot.OrderId
        FROM dbo.KOTItems ki WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.KitchenOrderTickets kot ON ki.KOTId = kot.KOTId
        WHERE ki.KOTItemId = @KOTItemId;

        IF @KOTId IS NULL
            THROW 50004, 'KOT item not found.', 1;

        -- Update Item
        UPDATE dbo.KOTItems
        SET PreparationStatus = @NewPreparationStatus,
            CompletedAt = CASE WHEN @NewPreparationStatus = 'READY' THEN SYSUTCDATETIME() ELSE NULL END
        WHERE KOTItemId = @KOTItemId;

        -- Re-evaluate Parent KOT Status
        DECLARE @TotalItems INT;
        DECLARE @ReadyItems INT;
        DECLARE @CookingItems INT;
        DECLARE @CurrentKOTStatus NVARCHAR(30);

        SELECT 
            @CurrentKOTStatus = TicketStatus
        FROM dbo.KitchenOrderTickets WITH (UPDLOCK, HOLDLOCK)
        WHERE KOTId = @KOTId;

        SELECT 
            @TotalItems = COUNT(1),
            @ReadyItems = SUM(CASE WHEN PreparationStatus = 'READY' THEN 1 ELSE 0 END),
            @CookingItems = SUM(CASE WHEN PreparationStatus = 'COOKING' THEN 1 ELSE 0 END)
        FROM dbo.KOTItems
        WHERE KOTId = @KOTId;

        IF @ReadyItems = @TotalItems AND @TotalItems > 0
        BEGIN
            IF @CurrentKOTStatus != 'READY' AND @CurrentKOTStatus != 'BUMPED'
            BEGIN
                UPDATE dbo.KitchenOrderTickets
                SET TicketStatus = 'READY'
                WHERE KOTId = @KOTId;
                SET @ParentKOTStatus = 'READY';
            END
            ELSE
            BEGIN
                SET @ParentKOTStatus = @CurrentKOTStatus;
            END;
        END
        ELSE IF @CookingItems > 0 OR @ReadyItems > 0
        BEGIN
            IF @CurrentKOTStatus = 'NEW'
            BEGIN
                UPDATE dbo.KitchenOrderTickets
                SET TicketStatus = 'PREPARING'
                WHERE KOTId = @KOTId;
                SET @ParentKOTStatus = 'PREPARING';
            END
            ELSE
            BEGIN
                SET @ParentKOTStatus = @CurrentKOTStatus;
            END;
        END
        ELSE
        BEGIN
            SET @ParentKOTStatus = @CurrentKOTStatus;
        END;

        -- Check if all KOTs for the parent order are now ready
        IF NOT EXISTS (
            SELECT 1 
            FROM dbo.KitchenOrderTickets 
            WHERE OrderId = @ParentOrderId 
              AND TicketStatus IN ('NEW', 'PREPARING')
        )
        BEGIN
            SET @AllOrderKOTsReady = 1;
        END
        ELSE
        BEGIN
            SET @AllOrderKOTsReady = 0;
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrState INT = ERROR_STATE();
        RAISERROR(@ErrMsg, 16, @ErrState);
    END CATCH
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 152: dbo.usp_KOT_Bump
-- Description: Bumps a completed ticket off the KDS active screen.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_KOT_Bump', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_KOT_Bump;
GO

CREATE PROCEDURE dbo.usp_KOT_Bump
    @KOTId BIGINT,
    @BumpedByUserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @KOTId IS NULL OR @KOTId <= 0
            THROW 50001, 'KOTId is required and must be a positive integer.', 1;

        BEGIN TRANSACTION;

        DECLARE @CurrentStatus NVARCHAR(30);
        DECLARE @BranchId INT;

        SELECT 
            @CurrentStatus = TicketStatus,
            @BranchId = BranchId
        FROM dbo.KitchenOrderTickets WITH (UPDLOCK, HOLDLOCK)
        WHERE KOTId = @KOTId;

        IF @CurrentStatus IS NULL
            THROW 50004, 'KOT ticket not found.', 1;

        IF @CurrentStatus = 'BUMPED'
        BEGIN
            -- Already bumped, exit gracefully
            COMMIT TRANSACTION;
            RETURN;
        END;

        UPDATE dbo.KitchenOrderTickets
        SET TicketStatus = 'BUMPED',
            BumpedAt = SYSUTCDATETIME()
        WHERE KOTId = @KOTId;

        -- Ensure all items are marked READY if bumped
        UPDATE dbo.KOTItems
        SET PreparationStatus = 'READY',
            CompletedAt = ISNULL(CompletedAt, SYSUTCDATETIME())
        WHERE KOTId = @KOTId AND PreparationStatus != 'READY';

        IF @BumpedByUserId IS NOT NULL
        BEGIN
            INSERT INTO dbo.AuditLogs (
                BranchId,
                UserId,
                EntityName,
                EntityId,
                ActionType,
                ActionDescription,
                CreatedAt
            )
            VALUES (
                @BranchId,
                @BumpedByUserId,
                'KitchenOrderTickets',
                CAST(@KOTId AS NVARCHAR(60)),
                'BUMP_KOT',
                'KOT ticket bumped off active screen by user ID ' + CAST(@BumpedByUserId AS NVARCHAR(20)),
                SYSUTCDATETIME()
            );
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrState INT = ERROR_STATE();
        RAISERROR(@ErrMsg, 16, @ErrState);
    END CATCH
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 153: dbo.usp_KOT_CancelByOrderId
-- Description: Cancels and bumps all active KOT tickets for an order.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_KOT_CancelByOrderId', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_KOT_CancelByOrderId;
GO

CREATE PROCEDURE dbo.usp_KOT_CancelByOrderId
    @OrderId BIGINT,
    @Reason NVARCHAR(255) = NULL,
    @CancelledKOTCount INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @CancelledKOTCount = 0;

    BEGIN TRY
        IF @OrderId IS NULL OR @OrderId <= 0
            THROW 50001, 'OrderId is required and must be a positive integer.', 1;

        BEGIN TRANSACTION;

        DECLARE @CancelTag NVARCHAR(300) = '[ORDER CANCELLED' + CASE WHEN @Reason IS NOT NULL AND LTRIM(RTRIM(@Reason)) != '' THEN ': ' + LTRIM(RTRIM(@Reason)) ELSE '' END + ']';

        UPDATE dbo.KitchenOrderTickets
        SET TicketStatus = 'BUMPED',
            BumpedAt = SYSUTCDATETIME(),
            SpecialKitchenNotes = CASE 
                WHEN SpecialKitchenNotes IS NULL OR LTRIM(RTRIM(SpecialKitchenNotes)) = '' THEN @CancelTag
                ELSE @CancelTag + ' | ' + SpecialKitchenNotes
            END
        WHERE OrderId = @OrderId
          AND TicketStatus != 'BUMPED';

        SET @CancelledKOTCount = @@ROWCOUNT;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrState INT = ERROR_STATE();
        RAISERROR(@ErrMsg, 16, @ErrState);
    END CATCH
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 154: dbo.usp_KOT_GetMetrics
-- Description: Aggregates operational performance and turnaround times for KDS.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_KOT_GetMetrics', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_KOT_GetMetrics;
GO

CREATE PROCEDURE dbo.usp_KOT_GetMetrics
    @BranchId INT,
    @Date DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @BranchId IS NULL OR @BranchId <= 0
    BEGIN
        RAISERROR('BranchId is required and must be a positive integer.', 16, 1);
        RETURN;
    END;

    IF @Date IS NULL
        SET @Date = CAST(SYSUTCDATETIME() AS DATE);

    -- Recordset 1: Overall summary metrics for the target date
    SELECT 
        @BranchId AS BranchId,
        @Date AS MetricDate,
        COUNT(1) AS TotalTicketsToday,
        SUM(CASE WHEN TicketStatus = 'BUMPED' THEN 1 ELSE 0 END) AS CompletedTicketsToday,
        SUM(CASE WHEN TicketStatus IN ('NEW', 'PREPARING', 'READY') THEN 1 ELSE 0 END) AS ActiveTicketsCount,
        SUM(CASE WHEN TicketStatus IN ('NEW', 'PREPARING') AND DATEDIFF(MINUTE, CreatedAt, SYSUTCDATETIME()) > 20 THEN 1 ELSE 0 END) AS OverdueTicketsCount,
        ISNULL(AVG(CASE WHEN TicketStatus = 'BUMPED' AND BumpedAt IS NOT NULL THEN DATEDIFF(MINUTE, CreatedAt, BumpedAt) ELSE NULL END), 0) AS AvgTurnaroundMinutes
    FROM dbo.KitchenOrderTickets
    WHERE BranchId = @BranchId
      AND CAST(CreatedAt AS DATE) = @Date;

    -- Recordset 2: Breakdown by Kitchen Station
    SELECT 
        KitchenStation,
        COUNT(1) AS TotalTickets,
        SUM(CASE WHEN TicketStatus = 'BUMPED' THEN 1 ELSE 0 END) AS CompletedTickets,
        SUM(CASE WHEN TicketStatus IN ('NEW', 'PREPARING', 'READY') THEN 1 ELSE 0 END) AS ActiveTickets,
        ISNULL(AVG(CASE WHEN TicketStatus = 'BUMPED' AND BumpedAt IS NOT NULL THEN DATEDIFF(MINUTE, CreatedAt, BumpedAt) ELSE NULL END), 0) AS AvgTurnaroundMinutes
    FROM dbo.KitchenOrderTickets
    WHERE BranchId = @BranchId
      AND CAST(CreatedAt AS DATE) = @Date
    GROUP BY KitchenStation
    ORDER BY TotalTickets DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 155: dbo.usp_KOT_AssignChef
-- Description: Logs chef assignment to dbo.AuditLogs and updates SpecialKitchenNotes.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_KOT_AssignChef', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_KOT_AssignChef;
GO

CREATE PROCEDURE dbo.usp_KOT_AssignChef
    @KOTId BIGINT,
    @ChefUserId BIGINT,
    @AssignedByUserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @KOTId IS NULL OR @KOTId <= 0
            THROW 50001, 'KOTId is required and must be a positive integer.', 1;

        IF @ChefUserId IS NULL OR @ChefUserId <= 0
            THROW 50001, 'ChefUserId is required and must be a positive integer.', 1;

        BEGIN TRANSACTION;

        DECLARE @BranchId INT;
        DECLARE @Notes NVARCHAR(500);

        SELECT 
            @BranchId = BranchId,
            @Notes = SpecialKitchenNotes
        FROM dbo.KitchenOrderTickets WITH (UPDLOCK, HOLDLOCK)
        WHERE KOTId = @KOTId;

        IF @BranchId IS NULL
            THROW 50004, 'KOT ticket not found.', 1;

        DECLARE @ChefName NVARCHAR(120);
        SELECT @ChefName = FirstName + ISNULL(' ' + LastName, '')
        FROM dbo.Users
        WHERE UserId = @ChefUserId;

        IF @ChefName IS NULL
            THROW 50002, 'Specified ChefUserId does not exist.', 1;

        -- Format chef note
        DECLARE @ChefTag NVARCHAR(150) = '[CHEF: ' + @ChefName + ' (ID: ' + CAST(@ChefUserId AS NVARCHAR(20)) + ')]';

        UPDATE dbo.KitchenOrderTickets
        SET SpecialKitchenNotes = CASE 
            WHEN @Notes IS NULL OR LTRIM(RTRIM(@Notes)) = '' THEN @ChefTag
            ELSE @ChefTag + ' ' + @Notes
        END
        WHERE KOTId = @KOTId;

        -- Record formal audit log
        INSERT INTO dbo.AuditLogs (
            BranchId,
            UserId,
            EntityName,
            EntityId,
            ActionType,
            ActionDescription,
            CreatedAt
        )
        VALUES (
            @BranchId,
            @ChefUserId,
            'KitchenOrderTickets',
            CAST(@KOTId AS NVARCHAR(60)),
            'ASSIGN_CHEF',
            'KOT assigned to chef ' + @ChefName + ' (ID: ' + CAST(@ChefUserId AS NVARCHAR(20)) + ')',
            SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrState INT = ERROR_STATE();
        RAISERROR(@ErrMsg, 16, @ErrState);
    END CATCH
END;
GO

-- ============================================================================
-- SECTION 2: NOTIFICATION SERVICE STORED PROCEDURES
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 156: dbo.usp_Notification_Create
-- Description: Persists an in-app notification with a 60-second duplicate
--              suppression window.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Notification_Create', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Notification_Create;
GO

CREATE PROCEDURE dbo.usp_Notification_Create
    @BranchId INT = NULL,
    @UserId BIGINT = NULL,
    @Title NVARCHAR(150),
    @Message NVARCHAR(1000),
    @NotificationType NVARCHAR(40),
    @TargetUrl NVARCHAR(255) = NULL,
    @NotificationId BIGINT = NULL OUTPUT,
    @IsDuplicate BIT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @IsDuplicate = 0;
    SET @NotificationId = NULL;

    BEGIN TRY
        IF @Title IS NULL OR LTRIM(RTRIM(@Title)) = ''
            THROW 50001, 'Title is required.', 1;

        IF @Message IS NULL OR LTRIM(RTRIM(@Message)) = ''
            THROW 50001, 'Message is required.', 1;

        IF @NotificationType IS NULL OR LTRIM(RTRIM(@NotificationType)) = ''
            THROW 50001, 'NotificationType is required.', 1;

        SET @Title = LTRIM(RTRIM(@Title));
        SET @Message = LTRIM(RTRIM(@Message));
        SET @NotificationType = UPPER(LTRIM(RTRIM(@NotificationType)));

        -- Duplicate Suppression Window (60 seconds)
        SELECT TOP 1 
            @NotificationId = NotificationId
        FROM dbo.Notifications WITH (UPDLOCK, HOLDLOCK)
        WHERE ISNULL(UserId, -1) = ISNULL(@UserId, -1)
          AND ISNULL(BranchId, -1) = ISNULL(@BranchId, -1)
          AND NotificationType = @NotificationType
          AND Title = @Title
          AND CreatedAt >= DATEADD(SECOND, -60, SYSUTCDATETIME());

        IF @NotificationId IS NOT NULL
        BEGIN
            SET @IsDuplicate = 1;
            RETURN;
        END;

        BEGIN TRANSACTION;

        INSERT INTO dbo.Notifications (
            BranchId,
            UserId,
            Title,
            Message,
            NotificationType,
            TargetUrl,
            IsRead,
            ReadAt,
            CreatedAt
        )
        VALUES (
            @BranchId,
            @UserId,
            @Title,
            @Message,
            @NotificationType,
            @TargetUrl,
            0,
            NULL,
            SYSUTCDATETIME()
        );

        SET @NotificationId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrState INT = ERROR_STATE();
        RAISERROR(@ErrMsg, 16, @ErrState);
    END CATCH
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 157: dbo.usp_Notification_GetById
-- Description: Retrieves single notification by ID.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Notification_GetById', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Notification_GetById;
GO

CREATE PROCEDURE dbo.usp_Notification_GetById
    @NotificationId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @NotificationId IS NULL OR @NotificationId <= 0
    BEGIN
        RAISERROR('NotificationId is required and must be a positive integer.', 16, 1);
        RETURN;
    END;

    SELECT 
        NotificationId,
        BranchId,
        UserId,
        Title,
        Message,
        NotificationType,
        TargetUrl,
        IsRead,
        ReadAt,
        CreatedAt
    FROM dbo.Notifications
    WHERE NotificationId = @NotificationId;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 158: dbo.usp_Notification_GetByUser
-- Description: Paginated user notification inbox feed.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Notification_GetByUser', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Notification_GetByUser;
GO

CREATE PROCEDURE dbo.usp_Notification_GetByUser
    @UserId BIGINT,
    @BranchId INT = NULL,
    @UnreadOnly BIT = 0,
    @Page INT = 1,
    @Limit INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF @UserId IS NULL OR @UserId <= 0
    BEGIN
        RAISERROR('UserId is required and must be a positive integer.', 16, 1);
        RETURN;
    END;

    IF @Page IS NULL OR @Page < 1
        SET @Page = 1;

    IF @Limit IS NULL OR @Limit < 1 OR @Limit > 100
        SET @Limit = 20;

    DECLARE @Offset INT = (@Page - 1) * @Limit;

    -- Recordset 1: Total records matching filter
    SELECT COUNT(1) AS TotalCount
    FROM dbo.Notifications
    WHERE (
        UserId = @UserId 
        OR (UserId IS NULL AND (BranchId = @BranchId OR @BranchId IS NULL))
    )
    AND (@UnreadOnly = 0 OR IsRead = 0);

    -- Recordset 2: Paginated data rows
    SELECT 
        NotificationId,
        BranchId,
        UserId,
        Title,
        Message,
        NotificationType,
        TargetUrl,
        IsRead,
        ReadAt,
        CreatedAt
    FROM dbo.Notifications
    WHERE (
        UserId = @UserId 
        OR (UserId IS NULL AND (BranchId = @BranchId OR @BranchId IS NULL))
    )
    AND (@UnreadOnly = 0 OR IsRead = 0)
    ORDER BY CreatedAt DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 159: dbo.usp_Notification_MarkAsRead
-- Description: Marks a single notification as read.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Notification_MarkAsRead', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Notification_MarkAsRead;
GO

CREATE PROCEDURE dbo.usp_Notification_MarkAsRead
    @NotificationId BIGINT,
    @UserId BIGINT = NULL,
    @RowsUpdated INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @RowsUpdated = 0;

    BEGIN TRY
        IF @NotificationId IS NULL OR @NotificationId <= 0
            THROW 50001, 'NotificationId is required and must be a positive integer.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.Notifications
        SET IsRead = 1,
            ReadAt = SYSUTCDATETIME()
        WHERE NotificationId = @NotificationId
          AND (@UserId IS NULL OR UserId = @UserId OR UserId IS NULL);

        SET @RowsUpdated = @@ROWCOUNT;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrState INT = ERROR_STATE();
        RAISERROR(@ErrMsg, 16, @ErrState);
    END CATCH
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 160: dbo.usp_Notification_MarkAllAsRead
-- Description: Marks all unread notifications for a user/branch as read.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Notification_MarkAllAsRead', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Notification_MarkAllAsRead;
GO

CREATE PROCEDURE dbo.usp_Notification_MarkAllAsRead
    @UserId BIGINT,
    @BranchId INT = NULL,
    @RowsUpdated INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @RowsUpdated = 0;

    BEGIN TRY
        IF @UserId IS NULL OR @UserId <= 0
            THROW 50001, 'UserId is required and must be a positive integer.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.Notifications
        SET IsRead = 1,
            ReadAt = SYSUTCDATETIME()
        WHERE (
            UserId = @UserId 
            OR (UserId IS NULL AND (BranchId = @BranchId OR @BranchId IS NULL))
        )
        AND IsRead = 0;

        SET @RowsUpdated = @@ROWCOUNT;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrState INT = ERROR_STATE();
        RAISERROR(@ErrMsg, 16, @ErrState);
    END CATCH
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 161: dbo.usp_Notification_GetUnreadCount
-- Description: Fast count of unread notifications for notification badge icon.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Notification_GetUnreadCount', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Notification_GetUnreadCount;
GO

CREATE PROCEDURE dbo.usp_Notification_GetUnreadCount
    @UserId BIGINT,
    @BranchId INT = NULL,
    @UnreadCount INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF @UserId IS NULL OR @UserId <= 0
    BEGIN
        RAISERROR('UserId is required and must be a positive integer.', 16, 1);
        RETURN;
    END;

    SELECT @UnreadCount = COUNT(1)
    FROM dbo.Notifications
    WHERE (
        UserId = @UserId 
        OR (UserId IS NULL AND (BranchId = @BranchId OR @BranchId IS NULL))
    )
    AND IsRead = 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 162: dbo.usp_Notification_DeleteOlderThan
-- Description: Maintenance retention cleanup for expired read notifications.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Notification_DeleteOlderThan', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Notification_DeleteOlderThan;
GO

CREATE PROCEDURE dbo.usp_Notification_DeleteOlderThan
    @DaysOld INT = 30,
    @DeletedCount INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @DeletedCount = 0;

    BEGIN TRY
        IF @DaysOld IS NULL OR @DaysOld < 0
            SET @DaysOld = 30;

        BEGIN TRANSACTION;

        DELETE FROM dbo.Notifications
        WHERE IsRead = 1
          AND CreatedAt < DATEADD(DAY, -@DaysOld, SYSUTCDATETIME());

        SET @DeletedCount = @@ROWCOUNT;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrState INT = ERROR_STATE();
        RAISERROR(@ErrMsg, 16, @ErrState);
    END CATCH
END;
GO
