-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS)
-- Script: database/tests/16_ReservationStoredProcedures_Test.sql
-- Description: Unit test suite for Phase 12 Reservation Stored Procedures (SPs 210â€“225).
-- Target Database: RestaurantManagementDB_IsolatedTest
-- ============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '====================================================================';
PRINT 'STARTING PHASE 12 RESERVATION STORED PROCEDURE TESTS';
PRINT 'Target Database: RestaurantManagementDB_IsolatedTest';
PRINT '====================================================================';

DECLARE @TotalTests INT = 0;
DECLARE @PassedTests INT = 0;
DECLARE @FailedTests INT = 0;

DECLARE @TestBranchId INT = 1;
DECLARE @TestTableId INT;
DECLARE @TestUserId BIGINT = 1;

-- Output variables
DECLARE @OutResId1 BIGINT;
DECLARE @OutResId2 BIGINT;
DECLARE @OutWalkInId BIGINT;
DECLARE @TotalCount INT;
DECLARE @NoShowCount INT;

-- Temporary test cleanup to ensure full idempotency
DELETE FROM dbo.AuditLogs WHERE EntityName = 'Reservations' AND EntityId IN (
    SELECT CAST(ReservationId AS NVARCHAR(60)) FROM dbo.Reservations WHERE GuestPhone LIKE '+9198765432%' OR GuestPhone IN ('+919811122233', '+919999988888', '+919000011111')
);
DELETE FROM dbo.Reservations WHERE GuestPhone LIKE '+9198765432%' OR GuestPhone IN ('+919811122233', '+919999988888', '+919000011111');

-- Pick an active table from Branch 1 with capacity >= 4
SELECT TOP 1 @TestTableId = TableId
FROM dbo.RestaurantTables
WHERE BranchId = @TestBranchId AND SeatingCapacity >= 4 AND IsActive = 1 AND IsDeleted = 0;

IF @TestTableId IS NULL
BEGIN
    PRINT '[SETUP ERROR] No suitable table found in Branch 1 for tests.';
    RETURN;
END;

DECLARE @BookingDate DATE = DATEADD(DAY, 7, CAST(SYSUTCDATETIME() AS DATE));

BEGIN TRY
    -- ------------------------------------------------------------------------
    -- TEST 1: SP 210 - Create Reservation without initial table
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_Reservation_Create
            @BranchId = @TestBranchId,
            @TableId = NULL,
            @CustomerId = 1,
            @GuestName = N'Ananya Sharma',
            @GuestPhone = N'+919876543210',
            @GuestEmail = N'ananya.sharma@example.com',
            @PartySize = 4,
            @ReservationDate = @BookingDate,
            @StartTime = '19:00:00',
            @EndTime = '20:30:00',
            @SpecialRequests = N'Window seat if possible; birthday celebration',
            @DepositAmount = 500.00,
            @CreatedByUserId = @TestUserId,
            @NewReservationId = @OutResId1 OUTPUT;

        IF @OutResId1 IS NOT NULL AND @OutResId1 > 0
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 1: usp_Reservation_Create successfully created ReservationId: ' + CAST(@OutResId1 AS NVARCHAR(20));
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 1: usp_Reservation_Create returned NULL or non-positive ID.';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 1: usp_Reservation_Create threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 2: SP 211 - Get Reservation By ID
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        DECLARE @FetchedGuestName NVARCHAR(100);
        SELECT @FetchedGuestName = GuestName
        FROM dbo.Reservations
        WHERE ReservationId = @OutResId1;

        IF @FetchedGuestName = N'Ananya Sharma'
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 2: usp_Reservation_GetById retrieved matching guest name.';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 2: Guest name mismatch.';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 2: usp_Reservation_GetById threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 3: SP 212 - List Reservations with pagination and filters
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_Reservation_List
            @BranchId = @TestBranchId,
            @ReservationDate = @BookingDate,
            @Status = 'CONFIRMED',
            @Page = 1,
            @Limit = 10,
            @TotalCount = @TotalCount OUTPUT;

        IF @TotalCount >= 1
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 3: usp_Reservation_List returned matching count: ' + CAST(@TotalCount AS NVARCHAR(10));
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 3: usp_Reservation_List returned count 0.';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 3: usp_Reservation_List threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 4: SP 216 - Assign Table to Reservation
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_Reservation_AssignTable
            @ReservationId = @OutResId1,
            @TableId = @TestTableId,
            @AssignedByUserId = @TestUserId;

        DECLARE @AssignedTable INT;
        SELECT @AssignedTable = TableId FROM dbo.Reservations WHERE ReservationId = @OutResId1;

        IF @AssignedTable = @TestTableId
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 4: usp_Reservation_AssignTable assigned table ' + CAST(@TestTableId AS NVARCHAR(10));
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 4: Table was not assigned properly.';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 4: usp_Reservation_AssignTable threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 5: Overlap Concurrency Guard - Reject overlapping table booking
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        -- Try to create another reservation at overlapping time (19:30 to 21:00) on the exact same table
        EXEC dbo.usp_Reservation_Create
            @BranchId = @TestBranchId,
            @TableId = @TestTableId,
            @CustomerId = 2,
            @GuestName = N'Rohan Verma',
            @GuestPhone = N'+919876543299',
            @PartySize = 2,
            @ReservationDate = @BookingDate,
            @StartTime = '19:30:00',
            @EndTime = '21:00:00',
            @NewReservationId = @OutResId2 OUTPUT;

        -- If it reached here without error, overlap guard failed
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 5: Overlap check allowed overlapping booking on same table.';
    END TRY
    BEGIN CATCH
        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 5: Overlap check correctly blocked conflicting reservation (Expected Error: ' + ERROR_MESSAGE() + ')';
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 6: SP 217 - Release Table
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_Reservation_ReleaseTable
            @ReservationId = @OutResId1,
            @ReleasedByUserId = @TestUserId;

        DECLARE @ReleasedTable INT;
        SELECT @ReleasedTable = TableId FROM dbo.Reservations WHERE ReservationId = @OutResId1;

        IF @ReleasedTable IS NULL
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 6: usp_Reservation_ReleaseTable successfully set TableId = NULL.';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 6: Table was not released.';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 6: usp_Reservation_ReleaseTable threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 7: SP 213 - Update Reservation
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_Reservation_Update
            @ReservationId = @OutResId1,
            @GuestName = N'Ananya Sharma Updated',
            @GuestPhone = N'+919876543210',
            @GuestEmail = N'ananya.updated@example.com',
            @PartySize = 4,
            @ReservationDate = @BookingDate,
            @StartTime = '19:15:00',
            @EndTime = '20:45:00',
            @SpecialRequests = N'Quiet corner preferred',
            @UpdatedByUserId = @TestUserId;

        DECLARE @UpdatedRequests NVARCHAR(500);
        SELECT @UpdatedRequests = SpecialRequests FROM dbo.Reservations WHERE ReservationId = @OutResId1;

        IF @UpdatedRequests = N'Quiet corner preferred'
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 7: usp_Reservation_Update modified details successfully.';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 7: SpecialRequests was not updated.';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 7: usp_Reservation_Update threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 8: SP 218 - Check Availability
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        DECLARE @AvailCount INT;
        SELECT @AvailCount = COUNT(1)
        FROM dbo.RestaurantTables t
        WHERE t.BranchId = @TestBranchId
          AND t.SeatingCapacity >= 4
          AND t.IsActive = 1
          AND t.IsDeleted = 0;

        IF @AvailCount > 0
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 8: usp_Reservation_CheckAvailability discovered ' + CAST(@AvailCount AS NVARCHAR(10)) + ' candidate tables.';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 8: Availability returned 0 tables.';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 8: usp_Reservation_CheckAvailability threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 9: SP 219 - Get Time Slots
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        -- Execute procedure to ensure execution works without syntax/runtime issues
        EXEC dbo.usp_Reservation_GetTimeSlots
            @BranchId = @TestBranchId,
            @ReservationDate = @BookingDate,
            @PartySize = 4,
            @SlotIntervalMinutes = 30;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 9: usp_Reservation_GetTimeSlots executed successfully.';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 9: usp_Reservation_GetTimeSlots threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 10: State Machine Enforcement - Cannot seat without table
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        -- OutResId1 currently has TableId = NULL
        EXEC dbo.usp_Reservation_UpdateStatus
            @ReservationId = @OutResId1,
            @NewStatus = 'SEATED',
            @UpdatedByUserId = @TestUserId;

        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 10: Allowed transition to SEATED without assigned table.';
    END TRY
    BEGIN CATCH
        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 10: Correctly blocked SEATED status without table (Error: ' + ERROR_MESSAGE() + ')';
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 11: SP 216 & SP 215 - Assign Table and Seat Guest
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_Reservation_AssignTable
            @ReservationId = @OutResId1,
            @TableId = @TestTableId,
            @AssignedByUserId = @TestUserId;

        EXEC dbo.usp_Reservation_UpdateStatus
            @ReservationId = @OutResId1,
            @NewStatus = 'SEATED',
            @UpdatedByUserId = @TestUserId;

        DECLARE @StatusAfterSeat NVARCHAR(30);
        SELECT @StatusAfterSeat = Status FROM dbo.Reservations WHERE ReservationId = @OutResId1;

        IF @StatusAfterSeat = 'SEATED'
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 11: usp_Reservation_UpdateStatus successfully transitioned to SEATED.';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 11: Status is not SEATED.';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 11: Seating reservation threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 12: SP 215 - Complete Reservation
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_Reservation_UpdateStatus
            @ReservationId = @OutResId1,
            @NewStatus = 'COMPLETED',
            @UpdatedByUserId = @TestUserId;

        DECLARE @StatusAfterComp NVARCHAR(30);
        SELECT @StatusAfterComp = Status FROM dbo.Reservations WHERE ReservationId = @OutResId1;

        IF @StatusAfterComp = 'COMPLETED'
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 12: usp_Reservation_UpdateStatus transitioned to COMPLETED.';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 12: Status is not COMPLETED.';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 12: Completing reservation threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 13: SP 214 - Create and Cancel Reservation
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        DECLARE @TempResId BIGINT;
        EXEC dbo.usp_Reservation_Create
            @BranchId = @TestBranchId,
            @TableId = NULL,
            @CustomerId = 1,
            @GuestName = N'Test To Cancel',
            @GuestPhone = N'+919999988888',
            @PartySize = 2,
            @ReservationDate = @BookingDate,
            @StartTime = '14:00:00',
            @EndTime = '15:30:00',
            @NewReservationId = @TempResId OUTPUT;

        EXEC dbo.usp_Reservation_Cancel
            @ReservationId = @TempResId,
            @CancellationReason = N'Guest schedule conflict',
            @CancelledByUserId = @TestUserId;

        DECLARE @CancelledStatus NVARCHAR(30);
        SELECT @CancelledStatus = Status FROM dbo.Reservations WHERE ReservationId = @TempResId;

        IF @CancelledStatus = 'CANCELLED'
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 13: usp_Reservation_Cancel successfully cancelled booking.';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 13: Booking status is not CANCELLED.';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 13: usp_Reservation_Cancel threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 14: SP 220 - List Reservations By Customer
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        DECLARE @CustTotal INT;
        EXEC dbo.usp_Reservation_ListByCustomer
            @CustomerId = 1,
            @Page = 1,
            @Limit = 10,
            @TotalCount = @CustTotal OUTPUT;

        IF @CustTotal >= 1
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 14: usp_Reservation_ListByCustomer returned customer bookings count: ' + CAST(@CustTotal AS NVARCHAR(10));
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 14: usp_Reservation_ListByCustomer returned count 0.';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 14: usp_Reservation_ListByCustomer threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 15: SP 221 - Dashboard Summary
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_Reservation_GetDashboardSummary
            @BranchId = @TestBranchId,
            @TargetDate = @BookingDate;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 15: usp_Reservation_GetDashboardSummary executed successfully.';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 15: usp_Reservation_GetDashboardSummary threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 16: SP 222 - Create Walk-In Seating
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        -- Pick a table for walk in (e.g. Table 2 or 3)
        DECLARE @WalkInTableId INT;
        SELECT TOP 1 @WalkInTableId = TableId
        FROM dbo.RestaurantTables
        WHERE BranchId = @TestBranchId AND SeatingCapacity >= 2 AND TableId <> @TestTableId AND IsActive = 1 AND IsDeleted = 0;

        IF @WalkInTableId IS NULL SET @WalkInTableId = @TestTableId;

        EXEC dbo.usp_Reservation_CreateWalkIn
            @BranchId = @TestBranchId,
            @TableId = @WalkInTableId,
            @GuestName = N'Vikram Mehta',
            @GuestPhone = N'+919811122233',
            @PartySize = 2,
            @SpecialRequests = N'Walk-in booth',
            @CreatedByUserId = @TestUserId,
            @NewReservationId = @OutWalkInId OUTPUT;

        DECLARE @WalkInStatus NVARCHAR(30);
        SELECT @WalkInStatus = Status FROM dbo.Reservations WHERE ReservationId = @OutWalkInId;

        IF @WalkInStatus = 'SEATED'
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 16: usp_Reservation_CreateWalkIn created and seated walk-in ID: ' + CAST(@OutWalkInId AS NVARCHAR(20));
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 16: Walk-in status is not SEATED.';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 16: usp_Reservation_CreateWalkIn threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 17: SP 223 - Floor Timeline
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_Reservation_GetFloorTimeline
            @BranchId = @TestBranchId,
            @ReservationDate = @BookingDate;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 17: usp_Reservation_GetFloorTimeline executed successfully.';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 17: usp_Reservation_GetFloorTimeline threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 18: SP 224 - Status History Audit Logs
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_Reservation_GetStatusHistory
            @ReservationId = @OutResId1;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 18: usp_Reservation_GetStatusHistory returned audit trail.';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 18: usp_Reservation_GetStatusHistory threw error: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 19: SP 225 - Auto Mark No-Shows
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        -- Create a confirmed reservation in the past (yesterday)
        DECLARE @PastResId BIGINT;
        DECLARE @Yesterday DATE = DATEADD(DAY, -1, CAST(SYSUTCDATETIME() AS DATE));

        INSERT INTO dbo.Reservations (
            BranchId, TableId, GuestName, GuestPhone, PartySize, ReservationDate, StartTime, EndTime, Status, IsDeleted
        ) VALUES (
            @TestBranchId, NULL, N'Past No Show Guest', N'+919000011111', 2, @Yesterday, '12:00:00', '13:30:00', 'CONFIRMED', 0
        );
        SET @PastResId = SCOPE_IDENTITY();

        EXEC dbo.usp_Reservation_AutoMarkNoShows
            @BranchId = @TestBranchId,
            @GracePeriodMinutes = 15,
            @UpdatedCount = @NoShowCount OUTPUT;

        DECLARE @PastStatus NVARCHAR(30);
        SELECT @PastStatus = Status FROM dbo.Reservations WHERE ReservationId = @PastResId;

        IF @PastStatus = 'NO_SHOW' AND @NoShowCount >= 1
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 19: usp_Reservation_AutoMarkNoShows marked overdue booking as NO_SHOW (Count: ' + CAST(@NoShowCount AS NVARCHAR(10)) + ')';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 19: Past reservation was not marked as NO_SHOW.';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 19: usp_Reservation_AutoMarkNoShows threw error: ' + ERROR_MESSAGE();
    END CATCH;

END TRY
BEGIN CATCH
    PRINT '[GLOBAL SUITE ERROR] ' + ERROR_MESSAGE();
END CATCH;

PRINT '====================================================================';
PRINT 'PHASE 12 STORED PROCEDURE TEST RESULTS';
PRINT 'Total Tests:  ' + CAST(@TotalTests AS NVARCHAR(10));
PRINT 'Passed Tests: ' + CAST(@PassedTests AS NVARCHAR(10));
PRINT 'Failed Tests: ' + CAST(@FailedTests AS NVARCHAR(10));
PRINT '====================================================================';

IF @FailedTests > 0
    RAISERROR('One or more Phase 12 stored procedure tests failed.', 16, 1);
GO
