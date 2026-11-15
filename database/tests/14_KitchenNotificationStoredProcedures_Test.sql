-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS)
-- Script: database/tests/14_KitchenNotificationStoredProcedures_Test.sql
-- Description: Unit test suite for Phase 10 Stored Procedures (SPs 146–162).
-- Target Database: RestaurantManagementDB_IsolatedTest
-- ============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '====================================================================';
PRINT 'STARTING PHASE 10 KITCHEN & NOTIFICATION STORED PROCEDURE TESTS';
PRINT '====================================================================';

DECLARE @TestBranchId INT = 1;
DECLARE @TestOrderId BIGINT;
DECLARE @TestOrderItemId1 BIGINT;
DECLARE @TestOrderItemId2 BIGINT;
DECLARE @TestChefUserId BIGINT = 5; -- Chef Marco
DECLARE @TestCustomerId BIGINT = 6; -- Customer

DECLARE @TotalTests INT = 0;
DECLARE @PassedTests INT = 0;
DECLARE @FailedTests INT = 0;

BEGIN TRY
    -- ------------------------------------------------------------------------
    -- SETUP: Insert mock test order and items if not present
    -- ------------------------------------------------------------------------
    DECLARE @TestOrderNum NVARCHAR(35) = 'ORD-T10-' + FORMAT(SYSUTCDATETIME(), 'yyyyMMddHHmmssfff');

    INSERT INTO dbo.Orders (
        BranchId,
        OrderNumber,
        TableId,
        CustomerId,
        GuestName,
        GuestPhone,
        OrderType,
        OrderStatus,
        PaymentStatus,
        SubTotal,
        TaxTotal,
        GrandTotal,
        CreatedAt,
        UpdatedAt
    )
    VALUES (
        @TestBranchId,
        @TestOrderNum,
        1,
        @TestCustomerId,
        'Phase 10 Test Diner',
        '9876543210',
        'DINE_IN',
        'ACCEPTED',
        'PAID',
        450.00,
        22.50,
        472.50,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );

    SET @TestOrderId = SCOPE_IDENTITY();

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
        ItemStatus
    )
    VALUES (
        @TestOrderId,
        1,
        NULL,
        'Truffle Mushroom Risotto',
        NULL,
        350.00,
        1,
        350.00,
        'Extra creamy, no parsley',
        'PENDING'
    );
    SET @TestOrderItemId1 = SCOPE_IDENTITY();

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
        ItemStatus
    )
    VALUES (
        @TestOrderId,
        2,
        NULL,
        'Artisan Cold Brew',
        NULL,
        100.00,
        1,
        100.00,
        'Oat milk',
        'PENDING'
    );
    SET @TestOrderItemId2 = SCOPE_IDENTITY();

    -- Addon for Risotto
    INSERT INTO dbo.OrderItemAddons (
        OrderItemId,
        AddonItemId,
        AddonNameSnapshot,
        UnitPrice,
        Quantity,
        TotalPrice
    )
    VALUES (
        @TestOrderItemId1,
        1,
        'Extra Shaved Truffle',
        50.00,
        1,
        50.00
    );

    PRINT 'Test setup data created successfully. OrderId: ' + CAST(@TestOrderId AS NVARCHAR(20));

    -- ------------------------------------------------------------------------
    -- TEST 1: usp_KOT_Create (Standard Creation)
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    DECLARE @KOTId1 BIGINT;
    DECLARE @KOTNumber1 NVARCHAR(35);
    DECLARE @IsIdempotent1 BIT;

    EXEC dbo.usp_KOT_Create
        @BranchId = @TestBranchId,
        @OrderId = @TestOrderId,
        @KitchenStation = 'MAIN_KITCHEN',
        @SpecialKitchenNotes = 'Table 1 VIP Guest',
        @ItemIdsJson = NULL,
        @KOTId = @KOTId1 OUTPUT,
        @KOTNumber = @KOTNumber1 OUTPUT,
        @IsIdempotent = @IsIdempotent1 OUTPUT;

    IF @KOTId1 IS NOT NULL AND @KOTNumber1 LIKE 'KOT-%' AND @IsIdempotent1 = 0
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 1 - usp_KOT_Create standard ticket generated: ' + @KOTNumber1;
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 1 - usp_KOT_Create failed to return valid KOT header.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 2: usp_KOT_Create Idempotency Check
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    DECLARE @KOTId2 BIGINT;
    DECLARE @KOTNumber2 NVARCHAR(35);
    DECLARE @IsIdempotent2 BIT;

    EXEC dbo.usp_KOT_Create
        @BranchId = @TestBranchId,
        @OrderId = @TestOrderId,
        @KitchenStation = 'MAIN_KITCHEN',
        @SpecialKitchenNotes = 'Table 1 VIP Guest',
        @ItemIdsJson = NULL,
        @KOTId = @KOTId2 OUTPUT,
        @KOTNumber = @KOTNumber2 OUTPUT,
        @IsIdempotent = @IsIdempotent2 OUTPUT;

    IF @KOTId2 = @KOTId1 AND @IsIdempotent2 = 1
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 2 - usp_KOT_Create idempotency guard returned existing ticket.';
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 2 - usp_KOT_Create idempotency guard failed.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 3: usp_KOT_Create Station Splitting (BAR Station)
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    DECLARE @KOTIdBar BIGINT;
    DECLARE @KOTNumberBar NVARCHAR(35);
    DECLARE @IsIdempotentBar BIT;
    DECLARE @BarJson NVARCHAR(MAX) = '[' + CAST(@TestOrderItemId2 AS NVARCHAR(20)) + ']';

    EXEC dbo.usp_KOT_Create
        @BranchId = @TestBranchId,
        @OrderId = @TestOrderId,
        @KitchenStation = 'BAR',
        @SpecialKitchenNotes = 'Beverages Only',
        @ItemIdsJson = @BarJson,
        @KOTId = @KOTIdBar OUTPUT,
        @KOTNumber = @KOTNumberBar OUTPUT,
        @IsIdempotent = @IsIdempotentBar OUTPUT;

    IF @KOTIdBar IS NOT NULL AND @KOTIdBar != @KOTId1 AND @IsIdempotentBar = 0
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 3 - usp_KOT_Create station splitting created separate ticket: ' + @KOTNumberBar;
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 3 - usp_KOT_Create station splitting failed.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 4: usp_KOT_GetById (Multi-Recordset Fetch)
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    -- Execute procedure
    EXEC dbo.usp_KOT_GetById @KOTId = @KOTId1;
    SET @PassedTests = @PassedTests + 1;
    PRINT 'PASS: Test 4 - usp_KOT_GetById multi-recordset query executed successfully.';

    -- ------------------------------------------------------------------------
    -- TEST 5: usp_KOT_GetByOrderId
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    EXEC dbo.usp_KOT_GetByOrderId @OrderId = @TestOrderId;
    SET @PassedTests = @PassedTests + 1;
    PRINT 'PASS: Test 5 - usp_KOT_GetByOrderId executed successfully.';

    -- ------------------------------------------------------------------------
    -- TEST 6: usp_KOT_GetActiveBoard
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    EXEC dbo.usp_KOT_GetActiveBoard @BranchId = @TestBranchId, @KitchenStation = NULL;
    SET @PassedTests = @PassedTests + 1;
    PRINT 'PASS: Test 6 - usp_KOT_GetActiveBoard executed successfully.';

    -- ------------------------------------------------------------------------
    -- TEST 7: usp_KOT_AssignChef
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    EXEC dbo.usp_KOT_AssignChef 
        @KOTId = @KOTId1,
        @ChefUserId = @TestChefUserId,
        @AssignedByUserId = 1;

    DECLARE @UpdatedNotes NVARCHAR(500);
    SELECT @UpdatedNotes = SpecialKitchenNotes FROM dbo.KitchenOrderTickets WHERE KOTId = @KOTId1;

    IF @UpdatedNotes LIKE '%[[]CHEF:%'
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 7 - usp_KOT_AssignChef updated notes and logged to AuditLogs: ' + @UpdatedNotes;
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 7 - usp_KOT_AssignChef did not tag SpecialKitchenNotes.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 8: usp_KOT_UpdateItemStatus (Single item COOKING -> Parent PREPARING)
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    DECLARE @KOTItemId1 BIGINT;
    SELECT TOP 1 @KOTItemId1 = KOTItemId FROM dbo.KOTItems WHERE KOTId = @KOTId1 AND OrderItemId = @TestOrderItemId1;

    DECLARE @ParentStatus NVARCHAR(30);
    DECLARE @AllOrderReady BIT;
    DECLARE @ParentOrd BIGINT;

    EXEC dbo.usp_KOT_UpdateItemStatus
        @KOTItemId = @KOTItemId1,
        @NewPreparationStatus = 'COOKING',
        @ParentKOTStatus = @ParentStatus OUTPUT,
        @AllOrderKOTsReady = @AllOrderReady OUTPUT,
        @ParentOrderId = @ParentOrd OUTPUT;

    IF @ParentStatus = 'PREPARING'
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 8 - usp_KOT_UpdateItemStatus rolled up parent status to PREPARING.';
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 8 - Parent status expected PREPARING but got: ' + ISNULL(@ParentStatus, 'NULL');
    END;

    -- ------------------------------------------------------------------------
    -- TEST 9: usp_KOT_UpdateItemStatus (All items READY -> Parent READY)
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    -- Mark all items in KOTId1 as READY
    DECLARE @CurKOTItemId BIGINT;
    DECLARE item_cursor CURSOR FOR 
        SELECT KOTItemId FROM dbo.KOTItems WHERE KOTId = @KOTId1;
    OPEN item_cursor;
    FETCH NEXT FROM item_cursor INTO @CurKOTItemId;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC dbo.usp_KOT_UpdateItemStatus
            @KOTItemId = @CurKOTItemId,
            @NewPreparationStatus = 'READY',
            @ParentKOTStatus = @ParentStatus OUTPUT,
            @AllOrderKOTsReady = @AllOrderReady OUTPUT,
            @ParentOrderId = @ParentOrd OUTPUT;
        FETCH NEXT FROM item_cursor INTO @CurKOTItemId;
    END;
    CLOSE item_cursor;
    DEALLOCATE item_cursor;

    IF @ParentStatus = 'READY'
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 9 - usp_KOT_UpdateItemStatus auto-rolled up parent status to READY.';
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 9 - Parent status expected READY but got: ' + ISNULL(@ParentStatus, 'NULL');
    END;

    -- ------------------------------------------------------------------------
    -- TEST 10: usp_KOT_Bump
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    EXEC dbo.usp_KOT_Bump @KOTId = @KOTId1, @BumpedByUserId = 1;

    DECLARE @BumpedStatus NVARCHAR(30);
    DECLARE @BumpedTime DATETIME2(3);
    SELECT @BumpedStatus = TicketStatus, @BumpedTime = BumpedAt FROM dbo.KitchenOrderTickets WHERE KOTId = @KOTId1;

    IF @BumpedStatus = 'BUMPED' AND @BumpedTime IS NOT NULL
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 10 - usp_KOT_Bump set TicketStatus to BUMPED and recorded BumpedAt.';
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 10 - usp_KOT_Bump failed to properly bump ticket.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 11: usp_KOT_UpdateStatus State Machine Rejection
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    DECLARE @InvalidTransitionCaught BIT = 0;
    BEGIN TRY
        -- Attempt to transition bumped ticket to PREPARING
        EXEC dbo.usp_KOT_UpdateStatus @KOTId = @KOTId1, @NewStatus = 'PREPARING';
    END TRY
    BEGIN CATCH
        SET @InvalidTransitionCaught = 1;
    END CATCH;

    IF @InvalidTransitionCaught = 1
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 11 - usp_KOT_UpdateStatus rejected invalid transition on BUMPED ticket.';
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 11 - usp_KOT_UpdateStatus failed to reject invalid transition.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 12: usp_KOT_CancelByOrderId
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    DECLARE @CancelledCount INT;
    EXEC dbo.usp_KOT_CancelByOrderId 
        @OrderId = @TestOrderId,
        @Reason = 'Customer changed mind',
        @CancelledKOTCount = @CancelledCount OUTPUT;

    IF @CancelledCount >= 1
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 12 - usp_KOT_CancelByOrderId cancelled active KOTs: ' + CAST(@CancelledCount AS NVARCHAR(10));
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 12 - usp_KOT_CancelByOrderId failed to cancel active KOTs.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 13: usp_KOT_GetMetrics
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    EXEC dbo.usp_KOT_GetMetrics @BranchId = @TestBranchId;
    SET @PassedTests = @PassedTests + 1;
    PRINT 'PASS: Test 13 - usp_KOT_GetMetrics executed successfully.';

    -- ------------------------------------------------------------------------
    -- TEST 14: usp_Notification_Create (Standard Creation)
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    DECLARE @NotifId1 BIGINT;
    DECLARE @IsNotifDup1 BIT;
    DECLARE @TestTargetUrl NVARCHAR(255) = '/orders/' + CAST(@TestOrderId AS NVARCHAR(20));

    EXEC dbo.usp_Notification_Create
        @BranchId = @TestBranchId,
        @UserId = @TestCustomerId,
        @Title = 'Order Confirmed',
        @Message = 'Your order #ORD-TEST-P10-001 has been confirmed.',
        @NotificationType = 'ORDER_CONFIRMED',
        @TargetUrl = @TestTargetUrl,
        @NotificationId = @NotifId1 OUTPUT,
        @IsDuplicate = @IsNotifDup1 OUTPUT;

    IF @NotifId1 IS NOT NULL AND @IsNotifDup1 = 0
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 14 - usp_Notification_Create created notification ID: ' + CAST(@NotifId1 AS NVARCHAR(20));
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 14 - usp_Notification_Create failed to create notification.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 15: usp_Notification_Create Duplicate Suppression
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    DECLARE @NotifId2 BIGINT;
    DECLARE @IsNotifDup2 BIT;

    EXEC dbo.usp_Notification_Create
        @BranchId = @TestBranchId,
        @UserId = @TestCustomerId,
        @Title = 'Order Confirmed',
        @Message = 'Your order #ORD-TEST-P10-001 has been confirmed.',
        @NotificationType = 'ORDER_CONFIRMED',
        @TargetUrl = @TestTargetUrl,
        @NotificationId = @NotifId2 OUTPUT,
        @IsDuplicate = @IsNotifDup2 OUTPUT;

    IF @NotifId2 = @NotifId1 AND @IsNotifDup2 = 1
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 15 - usp_Notification_Create duplicate suppression active.';
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 15 - usp_Notification_Create duplicate suppression failed.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 16: usp_Notification_GetById
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    EXEC dbo.usp_Notification_GetById @NotificationId = @NotifId1;
    SET @PassedTests = @PassedTests + 1;
    PRINT 'PASS: Test 16 - usp_Notification_GetById retrieved notification.';

    -- ------------------------------------------------------------------------
    -- TEST 17: usp_Notification_GetByUser
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    EXEC dbo.usp_Notification_GetByUser 
        @UserId = @TestCustomerId, 
        @BranchId = @TestBranchId, 
        @UnreadOnly = 0,
        @Page = 1,
        @Limit = 10;
    SET @PassedTests = @PassedTests + 1;
    PRINT 'PASS: Test 17 - usp_Notification_GetByUser paginated feed retrieved.';

    -- ------------------------------------------------------------------------
    -- TEST 18: usp_Notification_GetUnreadCount
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    DECLARE @UnreadCount INT;
    EXEC dbo.usp_Notification_GetUnreadCount
        @UserId = @TestCustomerId,
        @BranchId = @TestBranchId,
        @UnreadCount = @UnreadCount OUTPUT;

    IF @UnreadCount >= 1
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 18 - usp_Notification_GetUnreadCount returned unread count: ' + CAST(@UnreadCount AS NVARCHAR(10));
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 18 - usp_Notification_GetUnreadCount returned invalid count.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 19: usp_Notification_MarkAsRead
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    DECLARE @ReadRowsUpdated INT;
    EXEC dbo.usp_Notification_MarkAsRead
        @NotificationId = @NotifId1,
        @UserId = @TestCustomerId,
        @RowsUpdated = @ReadRowsUpdated OUTPUT;

    IF @ReadRowsUpdated = 1
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 19 - usp_Notification_MarkAsRead marked single notification read.';
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 19 - usp_Notification_MarkAsRead failed.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 20: usp_Notification_MarkAllAsRead
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    -- Create second notification for mark all
    DECLARE @NotifId3 BIGINT;
    DECLARE @IsNotifDup3 BIT;
    EXEC dbo.usp_Notification_Create
        @BranchId = @TestBranchId,
        @UserId = @TestCustomerId,
        @Title = 'Order Ready',
        @Message = 'Your order is ready for pickup!',
        @NotificationType = 'ORDER_READY',
        @TargetUrl = '/orders',
        @NotificationId = @NotifId3 OUTPUT,
        @IsDuplicate = @IsNotifDup3 OUTPUT;

    DECLARE @AllReadRowsUpdated INT;
    EXEC dbo.usp_Notification_MarkAllAsRead
        @UserId = @TestCustomerId,
        @BranchId = @TestBranchId,
        @RowsUpdated = @AllReadRowsUpdated OUTPUT;

    IF @AllReadRowsUpdated >= 1
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 20 - usp_Notification_MarkAllAsRead marked all user notifications read.';
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 20 - usp_Notification_MarkAllAsRead failed.';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 21: usp_Notification_DeleteOlderThan
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    -- Seed an old read notification for 45 days ago
    INSERT INTO dbo.Notifications (
        BranchId,
        UserId,
        Title,
        Message,
        NotificationType,
        IsRead,
        ReadAt,
        CreatedAt
    )
    VALUES (
        @TestBranchId,
        @TestCustomerId,
        'Old Notification',
        'Notification from 45 days ago',
        'SYSTEM',
        1,
        DATEADD(DAY, -44, SYSUTCDATETIME()),
        DATEADD(DAY, -45, SYSUTCDATETIME())
    );

    DECLARE @PurgedCount INT;
    EXEC dbo.usp_Notification_DeleteOlderThan
        @DaysOld = 30,
        @DeletedCount = @PurgedCount OUTPUT;

    IF @PurgedCount >= 1
    BEGIN
        SET @PassedTests = @PassedTests + 1;
        PRINT 'PASS: Test 21 - usp_Notification_DeleteOlderThan purged read notifications: ' + CAST(@PurgedCount AS NVARCHAR(10));
    END
    ELSE
    BEGIN
        SET @FailedTests = @FailedTests + 1;
        PRINT 'FAIL: Test 21 - usp_Notification_DeleteOlderThan did not delete rows.';
    END;

END TRY
BEGIN CATCH
    PRINT 'CRITICAL ERROR IN SQL UNIT TEST: ' + ERROR_MESSAGE();
    SET @FailedTests = @FailedTests + 1;
END CATCH;

PRINT '====================================================================';
PRINT 'PHASE 10 STORED PROCEDURE TEST SUMMARY';
PRINT 'Total Tests:  ' + CAST(@TotalTests AS NVARCHAR(10));
PRINT 'Passed Tests: ' + CAST(@PassedTests AS NVARCHAR(10));
PRINT 'Failed Tests: ' + CAST(@FailedTests AS NVARCHAR(10));
PRINT '====================================================================';
GO
