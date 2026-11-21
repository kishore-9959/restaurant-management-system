-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS)
-- Script 16: Reservation Service & Floor Scheduling Stored Procedures
-- File: database/16_ReservationStoredProcedures.sql
-- Description: 100% Parameterized T-SQL Stored Procedures for Reservation Service.
--              Includes Booking Creation, Retrieval, Filtering, Cancellation,
--              Status State Machine Transitions, Table Assignment & Release,
--              Table Availability Discovery, Dynamic Time Slot Calculation,
--              Customer Booking History, Dashboard KPIs, Walk-in Seating,
--              Floor Timeline Grid, Audit Logs, and Automated No-Show Sweep.
-- Procedures: 210 through 225 (Total: 16 Procedures)
-- ============================================================================

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- SECTION 1: RESERVATION CREATION & RETRIEVAL (SPs 210â€“212)
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 210: dbo.usp_Reservation_Create
-- Description: Creates a new dining reservation. Validates branch existence,
--              party size, operating hours, and performs overlap / capacity
--              checks if a table is requested or ensures availability exists.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_Create', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_Create;
GO

CREATE PROCEDURE dbo.usp_Reservation_Create
    @BranchId INT,
    @TableId INT = NULL,
    @CustomerId BIGINT = NULL,
    @GuestName NVARCHAR(100),
    @GuestPhone NVARCHAR(25),
    @GuestEmail NVARCHAR(120) = NULL,
    @PartySize INT,
    @ReservationDate DATE,
    @StartTime TIME(0),
    @EndTime TIME(0) = NULL,
    @SpecialRequests NVARCHAR(500) = NULL,
    @DepositAmount DECIMAL(10,2) = 0.00,
    @DepositPaymentId BIGINT = NULL,
    @CreatedByUserId BIGINT = NULL,
    @NewReservationId BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        -- 1. Input parameter validation
        IF @BranchId IS NULL OR @BranchId <= 0
            THROW 51000, 'Invalid BranchId specified.', 1;

        IF @GuestName IS NULL OR LTRIM(RTRIM(@GuestName)) = ''
            THROW 51000, 'GuestName is required.', 1;

        IF @GuestPhone IS NULL OR LTRIM(RTRIM(@GuestPhone)) = ''
            THROW 51000, 'GuestPhone is required.', 1;

        IF @PartySize IS NULL OR @PartySize <= 0
            THROW 51000, 'PartySize must be greater than zero.', 1;

        IF @ReservationDate IS NULL
            THROW 51000, 'ReservationDate is required.', 1;

        IF @StartTime IS NULL
            THROW 51000, 'StartTime is required.', 1;

        -- 2. Validate branch exists and retrieve operating hours
        DECLARE @OpeningTime TIME(0);
        DECLARE @ClosingTime TIME(0);
        SELECT @OpeningTime = OpeningTime, @ClosingTime = ClosingTime
        FROM dbo.Branches
        WHERE BranchId = @BranchId AND IsActive = 1;

        IF @OpeningTime IS NULL
            THROW 51000, 'Branch not found or inactive.', 1;

        -- 3. Calculate EndTime if omitted (90 mins for <= 4 guests; 120 mins for > 4)
        IF @EndTime IS NULL
        BEGIN
            DECLARE @DurationMinutes INT = CASE WHEN @PartySize <= 4 THEN 90 ELSE 120 END;
            SET @EndTime = CAST(DATEADD(MINUTE, @DurationMinutes, CAST(@StartTime AS DATETIME)) AS TIME(0));
        END

        IF @EndTime <= @StartTime AND @ClosingTime >= @OpeningTime
            THROW 51000, 'EndTime must be later than StartTime.', 1;

        -- 4. Validate requested window against branch operating hours
        -- Note: If ClosingTime is 00:00:00 (midnight), allow up to midnight
        IF @ClosingTime > @OpeningTime
        BEGIN
            IF @StartTime < @OpeningTime OR @EndTime > @ClosingTime
                THROW 51000, 'Requested reservation time is outside branch operating hours.', 1;
        END

        BEGIN TRANSACTION;

        -- 5. If specific TableId was specified, validate capacity and overlap
        IF @TableId IS NOT NULL
        BEGIN
            DECLARE @TableCap INT;
            DECLARE @TableActive BIT;
            DECLARE @TableDeleted BIT;
            DECLARE @TableBranch INT;

            SELECT @TableCap = SeatingCapacity,
                   @TableActive = IsActive,
                   @TableDeleted = IsDeleted,
                   @TableBranch = BranchId
            FROM dbo.RestaurantTables WITH (UPDLOCK, HOLDLOCK)
            WHERE TableId = @TableId;

            IF @TableCap IS NULL OR @TableBranch <> @BranchId OR @TableActive = 0 OR @TableDeleted = 1
                THROW 51000, 'Specified table not found, inactive, or belongs to another branch.', 1;

            IF @TableCap < @PartySize
                THROW 51000, 'Specified table capacity is less than party size.', 1;

            -- Check overlap on table
            IF EXISTS (
                SELECT 1
                FROM dbo.Reservations WITH (UPDLOCK, HOLDLOCK)
                WHERE TableId = @TableId
                  AND ReservationDate = @ReservationDate
                  AND Status IN ('CONFIRMED', 'SEATED')
                  AND IsDeleted = 0
                  AND (@StartTime < EndTime AND @EndTime > StartTime)
            )
            BEGIN
                THROW 51000, 'Selected table is already booked for this time window.', 1;
            END
        END
        ELSE
        BEGIN
            -- Check general availability: must have at least one active table matching capacity
            IF NOT EXISTS (
                SELECT 1
                FROM dbo.RestaurantTables t WITH (UPDLOCK, HOLDLOCK)
                WHERE t.BranchId = @BranchId
                  AND t.IsActive = 1
                  AND t.IsDeleted = 0
                  AND t.SeatingCapacity >= @PartySize
                  AND NOT EXISTS (
                      SELECT 1
                      FROM dbo.Reservations r WITH (UPDLOCK, HOLDLOCK)
                      WHERE r.TableId = t.TableId
                        AND r.ReservationDate = @ReservationDate
                        AND r.Status IN ('CONFIRMED', 'SEATED')
                        AND r.IsDeleted = 0
                        AND (@StartTime < r.EndTime AND @EndTime > r.StartTime)
                  )
            )
            BEGIN
                THROW 51001, 'No available tables matching party size for requested time window.', 1;
            END
        END

        -- 6. Insert Reservation
        INSERT INTO dbo.Reservations (
            BranchId,
            TableId,
            CustomerId,
            GuestName,
            GuestPhone,
            GuestEmail,
            PartySize,
            ReservationDate,
            StartTime,
            EndTime,
            Status,
            SpecialRequests,
            DepositAmount,
            DepositPaymentId,
            CreatedByUserId,
            CreatedAt,
            UpdatedAt,
            IsDeleted
        ) VALUES (
            @BranchId,
            @TableId,
            @CustomerId,
            LTRIM(RTRIM(@GuestName)),
            LTRIM(RTRIM(@GuestPhone)),
            NULLIF(LTRIM(RTRIM(@GuestEmail)), ''),
            @PartySize,
            @ReservationDate,
            @StartTime,
            @EndTime,
            'CONFIRMED',
            NULLIF(LTRIM(RTRIM(@SpecialRequests)), ''),
            ISNULL(@DepositAmount, 0.00),
            @DepositPaymentId,
            @CreatedByUserId,
            SYSUTCDATETIME(),
            SYSUTCDATETIME(),
            0
        );

        SET @NewReservationId = SCOPE_IDENTITY();

        -- 7. Audit Log
        DECLARE @AuditJson NVARCHAR(MAX) = (
            SELECT @NewReservationId AS ReservationId,
                   @BranchId AS BranchId,
                   @TableId AS TableId,
                   @GuestName AS GuestName,
                   @GuestPhone AS GuestPhone,
                   @PartySize AS PartySize,
                   @ReservationDate AS ReservationDate,
                   CAST(@StartTime AS NVARCHAR(8)) AS StartTime,
                   CAST(@EndTime AS NVARCHAR(8)) AS EndTime,
                   'CONFIRMED' AS Status
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        INSERT INTO dbo.AuditLogs (
            BranchId,
            UserId,
            EntityName,
            EntityId,
            ActionType,
            ActionDescription,
            NewValuesJson,
            CreatedAt
        ) VALUES (
            @BranchId,
            @CreatedByUserId,
            'Reservations',
            CAST(@NewReservationId AS NVARCHAR(60)),
            'CREATE',
            'Reservation booked successfully',
            @AuditJson,
            SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;

        -- Return reservation row
        SELECT @NewReservationId AS ReservationId;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 211: dbo.usp_Reservation_GetById
-- Description: Retrieves single reservation by ID including branch details,
--              assigned table number, dining section, and customer info.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_GetById', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_GetById;
GO

CREATE PROCEDURE dbo.usp_Reservation_GetById
    @ReservationId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @ReservationId IS NULL OR @ReservationId <= 0
    BEGIN
        RAISERROR('Invalid ReservationId specified.', 16, 1);
        RETURN;
    END

    SELECT
        r.ReservationId,
        r.BranchId,
        b.BranchName,
        b.BranchCode,
        b.Phone AS BranchPhone,
        b.OpeningTime,
        b.ClosingTime,
        r.TableId,
        t.TableNumber,
        t.SeatingCapacity AS TableCapacity,
        s.SectionId,
        s.SectionName,
        r.CustomerId,
        u.FirstName AS CustomerFirstName,
        u.LastName AS CustomerLastName,
        u.Email AS CustomerEmail,
        r.GuestName,
        r.GuestPhone,
        r.GuestEmail,
        r.PartySize,
        r.ReservationDate,
        r.StartTime,
        r.EndTime,
        r.Status,
        r.SpecialRequests,
        r.DepositAmount,
        r.DepositPaymentId,
        r.CreatedByUserId,
        r.CreatedAt,
        r.UpdatedAt
    FROM dbo.Reservations r
    INNER JOIN dbo.Branches b ON r.BranchId = b.BranchId
    LEFT JOIN dbo.RestaurantTables t ON r.TableId = t.TableId
    LEFT JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    LEFT JOIN dbo.Users u ON r.CustomerId = u.UserId
    WHERE r.ReservationId = @ReservationId
      AND r.IsDeleted = 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 212: dbo.usp_Reservation_List
-- Description: Paginated reservation search filtered by branch, date range,
--              status, table, and guest name/phone search query.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_List', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_List;
GO

CREATE PROCEDURE dbo.usp_Reservation_List
    @BranchId INT = NULL,
    @ReservationDate DATE = NULL,
    @StartDate DATE = NULL,
    @EndDate DATE = NULL,
    @Status NVARCHAR(30) = NULL,
    @TableId INT = NULL,
    @Search NVARCHAR(100) = NULL,
    @Page INT = 1,
    @Limit INT = 20,
    @TotalCount INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF @Page < 1 SET @Page = 1;
    IF @Limit < 1 OR @Limit > 200 SET @Limit = 20;

    DECLARE @Offset INT = (@Page - 1) * @Limit;
    SET @Search = NULLIF(LTRIM(RTRIM(@Search)), '');

    -- Compute total matching count
    SELECT @TotalCount = COUNT(1)
    FROM dbo.Reservations r
    WHERE r.IsDeleted = 0
      AND (@BranchId IS NULL OR r.BranchId = @BranchId)
      AND (
          (@ReservationDate IS NOT NULL AND r.ReservationDate = @ReservationDate)
          OR
          (@ReservationDate IS NULL AND
              (@StartDate IS NULL OR r.ReservationDate >= @StartDate) AND
              (@EndDate IS NULL OR r.ReservationDate <= @EndDate)
          )
      )
      AND (@Status IS NULL OR r.Status = @Status)
      AND (@TableId IS NULL OR r.TableId = @TableId)
      AND (
          @Search IS NULL OR
          r.GuestName LIKE '%' + @Search + '%' OR
          r.GuestPhone LIKE '%' + @Search + '%' OR
          r.GuestEmail LIKE '%' + @Search + '%'
      );

    -- Return paginated page
    SELECT
        r.ReservationId,
        r.BranchId,
        b.BranchName,
        b.BranchCode,
        r.TableId,
        t.TableNumber,
        t.SeatingCapacity AS TableCapacity,
        s.SectionId,
        s.SectionName,
        r.CustomerId,
        r.GuestName,
        r.GuestPhone,
        r.GuestEmail,
        r.PartySize,
        r.ReservationDate,
        r.StartTime,
        r.EndTime,
        r.Status,
        r.SpecialRequests,
        r.DepositAmount,
        r.DepositPaymentId,
        r.CreatedByUserId,
        r.CreatedAt,
        r.UpdatedAt
    FROM dbo.Reservations r
    INNER JOIN dbo.Branches b ON r.BranchId = b.BranchId
    LEFT JOIN dbo.RestaurantTables t ON r.TableId = t.TableId
    LEFT JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE r.IsDeleted = 0
      AND (@BranchId IS NULL OR r.BranchId = @BranchId)
      AND (
          (@ReservationDate IS NOT NULL AND r.ReservationDate = @ReservationDate)
          OR
          (@ReservationDate IS NULL AND
              (@StartDate IS NULL OR r.ReservationDate >= @StartDate) AND
              (@EndDate IS NULL OR r.ReservationDate <= @EndDate)
          )
      )
      AND (@Status IS NULL OR r.Status = @Status)
      AND (@TableId IS NULL OR r.TableId = @TableId)
      AND (
          @Search IS NULL OR
          r.GuestName LIKE '%' + @Search + '%' OR
          r.GuestPhone LIKE '%' + @Search + '%' OR
          r.GuestEmail LIKE '%' + @Search + '%'
      )
    ORDER BY r.ReservationDate ASC, r.StartTime ASC, r.ReservationId ASC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END;
GO

-- ============================================================================
-- SECTION 2: RESERVATION LIFECYCLE & STATUS WORKFLOW (SPs 213â€“217)
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 213: dbo.usp_Reservation_Update
-- Description: Updates reservation parameters (party size, date, time slot,
--              requests). Verifies overlap against existing assigned table.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_Update', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_Update;
GO

CREATE PROCEDURE dbo.usp_Reservation_Update
    @ReservationId BIGINT,
    @GuestName NVARCHAR(100),
    @GuestPhone NVARCHAR(25),
    @GuestEmail NVARCHAR(120) = NULL,
    @PartySize INT,
    @ReservationDate DATE,
    @StartTime TIME(0),
    @EndTime TIME(0) = NULL,
    @SpecialRequests NVARCHAR(500) = NULL,
    @DepositAmount DECIMAL(10,2) = NULL,
    @UpdatedByUserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @ReservationId IS NULL OR @ReservationId <= 0
            THROW 51000, 'Invalid ReservationId specified.', 1;

        IF @GuestName IS NULL OR LTRIM(RTRIM(@GuestName)) = ''
            THROW 51000, 'GuestName is required.', 1;

        IF @GuestPhone IS NULL OR LTRIM(RTRIM(@GuestPhone)) = ''
            THROW 51000, 'GuestPhone is required.', 1;

        IF @PartySize IS NULL OR @PartySize <= 0
            THROW 51000, 'PartySize must be greater than zero.', 1;

        IF @ReservationDate IS NULL
            THROW 51000, 'ReservationDate is required.', 1;

        IF @StartTime IS NULL
            THROW 51000, 'StartTime is required.', 1;

        -- EndTime calculation if omitted
        IF @EndTime IS NULL
        BEGIN
            DECLARE @DurationMinutes INT = CASE WHEN @PartySize <= 4 THEN 90 ELSE 120 END;
            SET @EndTime = CAST(DATEADD(MINUTE, @DurationMinutes, CAST(@StartTime AS DATETIME)) AS TIME(0));
        END

        BEGIN TRANSACTION;

        DECLARE @OldBranchId INT;
        DECLARE @OldTableId INT;
        DECLARE @OldStatus NVARCHAR(30);
        DECLARE @OldDate DATE;
        DECLARE @OldStartTime TIME(0);
        DECLARE @OldEndTime TIME(0);
        DECLARE @OldPartySize INT;

        SELECT
            @OldBranchId = BranchId,
            @OldTableId = TableId,
            @OldStatus = Status,
            @OldDate = ReservationDate,
            @OldStartTime = StartTime,
            @OldEndTime = EndTime,
            @OldPartySize = PartySize
        FROM dbo.Reservations WITH (UPDLOCK, HOLDLOCK)
        WHERE ReservationId = @ReservationId AND IsDeleted = 0;

        IF @OldStatus IS NULL
            THROW 51000, 'Reservation not found or is deleted.', 1;

        IF @OldStatus IN ('CANCELLED', 'COMPLETED')
            THROW 51000, 'Cannot update a cancelled or completed reservation.', 1;

        -- If table was already assigned, verify it is still valid and has no overlap
        DECLARE @NewTableId INT = @OldTableId;
        IF @OldTableId IS NOT NULL
        BEGIN
            -- Check if party size exceeds table capacity
            DECLARE @Cap INT;
            SELECT @Cap = SeatingCapacity FROM dbo.RestaurantTables WHERE TableId = @OldTableId;
            IF @Cap < @PartySize
            BEGIN
                -- Unassign table because party size exceeded capacity
                SET @NewTableId = NULL;
            END
            ELSE
            BEGIN
                -- Check if updated time/date creates conflict on that table
                IF EXISTS (
                    SELECT 1
                    FROM dbo.Reservations WITH (UPDLOCK, HOLDLOCK)
                    WHERE TableId = @OldTableId
                      AND ReservationDate = @ReservationDate
                      AND Status IN ('CONFIRMED', 'SEATED')
                      AND IsDeleted = 0
                      AND ReservationId <> @ReservationId
                      AND (@StartTime < EndTime AND @EndTime > StartTime)
                )
                BEGIN
                    -- Table conflict on new slot; unassign table to avoid double booking
                    SET @NewTableId = NULL;
                END
            END
        END

        -- Old Values for Audit
        DECLARE @OldJson NVARCHAR(MAX) = (
            SELECT @OldTableId AS TableId, @OldPartySize AS PartySize,
                   @OldDate AS ReservationDate, CAST(@OldStartTime AS NVARCHAR(8)) AS StartTime,
                   CAST(@OldEndTime AS NVARCHAR(8)) AS EndTime
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        -- Update record
        UPDATE dbo.Reservations
        SET GuestName = LTRIM(RTRIM(@GuestName)),
            GuestPhone = LTRIM(RTRIM(@GuestPhone)),
            GuestEmail = NULLIF(LTRIM(RTRIM(@GuestEmail)), ''),
            PartySize = @PartySize,
            ReservationDate = @ReservationDate,
            StartTime = @StartTime,
            EndTime = @EndTime,
            TableId = @NewTableId,
            SpecialRequests = NULLIF(LTRIM(RTRIM(@SpecialRequests)), ''),
            DepositAmount = ISNULL(@DepositAmount, DepositAmount),
            UpdatedAt = SYSUTCDATETIME()
        WHERE ReservationId = @ReservationId;

        -- New Values for Audit
        DECLARE @NewJson NVARCHAR(MAX) = (
            SELECT @NewTableId AS TableId, @PartySize AS PartySize,
                   @ReservationDate AS ReservationDate, CAST(@StartTime AS NVARCHAR(8)) AS StartTime,
                   CAST(@EndTime AS NVARCHAR(8)) AS EndTime
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        INSERT INTO dbo.AuditLogs (
            BranchId,
            UserId,
            EntityName,
            EntityId,
            ActionType,
            ActionDescription,
            OldValuesJson,
            NewValuesJson,
            CreatedAt
        ) VALUES (
            @OldBranchId,
            @UpdatedByUserId,
            'Reservations',
            CAST(@ReservationId AS NVARCHAR(60)),
            'UPDATE',
            'Reservation updated',
            @OldJson,
            @NewJson,
            SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;

        -- Return updated row
        EXEC dbo.usp_Reservation_GetById @ReservationId = @ReservationId;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 214: dbo.usp_Reservation_Cancel
-- Description: Cancels an active reservation, releases any assigned table,
--              and records cancellation reason into dbo.AuditLogs.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_Cancel', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_Cancel;
GO

CREATE PROCEDURE dbo.usp_Reservation_Cancel
    @ReservationId BIGINT,
    @CancellationReason NVARCHAR(500) = NULL,
    @CancelledByUserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @ReservationId IS NULL OR @ReservationId <= 0
            THROW 51000, 'Invalid ReservationId specified.', 1;

        BEGIN TRANSACTION;

        DECLARE @BranchId INT;
        DECLARE @TableId INT;
        DECLARE @CurrentStatus NVARCHAR(30);

        SELECT
            @BranchId = BranchId,
            @TableId = TableId,
            @CurrentStatus = Status
        FROM dbo.Reservations WITH (UPDLOCK, HOLDLOCK)
        WHERE ReservationId = @ReservationId AND IsDeleted = 0;

        IF @CurrentStatus IS NULL
            THROW 51004, 'Reservation not found or is deleted.', 1;

        IF @CurrentStatus IN ('CANCELLED', 'COMPLETED')
            THROW 51005, 'Reservation is already cancelled or completed.', 1;

        UPDATE dbo.Reservations
        SET Status = 'CANCELLED',
            TableId = NULL,
            UpdatedAt = SYSUTCDATETIME()
        WHERE ReservationId = @ReservationId;

        INSERT INTO dbo.AuditLogs (
            BranchId,
            UserId,
            EntityName,
            EntityId,
            ActionType,
            ActionDescription,
            OldValuesJson,
            NewValuesJson,
            CreatedAt
        ) VALUES (
            @BranchId,
            @CancelledByUserId,
            'Reservations',
            CAST(@ReservationId AS NVARCHAR(60)),
            'CANCEL',
            ISNULL(@CancellationReason, 'Reservation cancelled by user or staff'),
            (SELECT @CurrentStatus AS Status, @TableId AS TableId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT 'CANCELLED' AS Status, NULL AS TableId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;

        SELECT @ReservationId AS ReservationId, 'CANCELLED' AS Status;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 215: dbo.usp_Reservation_UpdateStatus
-- Description: State machine governor for reservation statuses:
--              'CONFIRMED' -> 'SEATED' -> 'COMPLETED'
--              'CONFIRMED' -> 'CANCELLED' / 'NO_SHOW'
--              Enforces table assignment check before seating.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_UpdateStatus', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_UpdateStatus;
GO

CREATE PROCEDURE dbo.usp_Reservation_UpdateStatus
    @ReservationId BIGINT,
    @NewStatus NVARCHAR(30),
    @UpdatedByUserId BIGINT = NULL,
    @Notes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @ReservationId IS NULL OR @ReservationId <= 0
            THROW 51000, 'Invalid ReservationId specified.', 1;

        SET @NewStatus = UPPER(LTRIM(RTRIM(@NewStatus)));

        IF @NewStatus NOT IN ('CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
            THROW 51000, 'Invalid reservation status specified.', 1;

        BEGIN TRANSACTION;

        DECLARE @BranchId INT;
        DECLARE @TableId INT;
        DECLARE @CurrentStatus NVARCHAR(30);

        SELECT
            @BranchId = BranchId,
            @TableId = TableId,
            @CurrentStatus = Status
        FROM dbo.Reservations WITH (UPDLOCK, HOLDLOCK)
        WHERE ReservationId = @ReservationId AND IsDeleted = 0;

        IF @CurrentStatus IS NULL
            THROW 51004, 'Reservation not found or is deleted.', 1;

        -- State machine rules
        IF @CurrentStatus = 'CANCELLED' AND @NewStatus <> 'CANCELLED'
            THROW 51007, 'Cannot change status of a cancelled reservation.', 1;

        IF @CurrentStatus = 'COMPLETED' AND @NewStatus <> 'COMPLETED'
            THROW 51008, 'Cannot change status of a completed reservation.', 1;

        IF @NewStatus = 'SEATED' AND @TableId IS NULL
            THROW 51006, 'Cannot seat reservation without assigning a table first.', 1;

        -- If transitioning to CANCELLED or NO_SHOW, release table
        DECLARE @FinalTableId INT = @TableId;
        IF @NewStatus IN ('CANCELLED', 'NO_SHOW')
            SET @FinalTableId = NULL;

        UPDATE dbo.Reservations
        SET Status = @NewStatus,
            TableId = @FinalTableId,
            UpdatedAt = SYSUTCDATETIME()
        WHERE ReservationId = @ReservationId;

        INSERT INTO dbo.AuditLogs (
            BranchId,
            UserId,
            EntityName,
            EntityId,
            ActionType,
            ActionDescription,
            OldValuesJson,
            NewValuesJson,
            CreatedAt
        ) VALUES (
            @BranchId,
            @UpdatedByUserId,
            'Reservations',
            CAST(@ReservationId AS NVARCHAR(60)),
            'STATUS_CHANGE',
            ISNULL(@Notes, 'Reservation status transitioned to ' + @NewStatus),
            (SELECT @CurrentStatus AS Status, @TableId AS TableId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT @NewStatus AS Status, @FinalTableId AS TableId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;

        SELECT @ReservationId AS ReservationId, @NewStatus AS Status, @FinalTableId AS TableId;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 216: dbo.usp_Reservation_AssignTable
-- Description: Assigns a physical dining table to a reservation with atomic
--              UPDLOCK concurrency lock and strict overlap verification.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_AssignTable', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_AssignTable;
GO

CREATE PROCEDURE dbo.usp_Reservation_AssignTable
    @ReservationId BIGINT,
    @TableId INT,
    @AssignedByUserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @ReservationId IS NULL OR @ReservationId <= 0
            THROW 51000, 'Invalid ReservationId specified.', 1;

        IF @TableId IS NULL OR @TableId <= 0
            THROW 51000, 'Invalid TableId specified.', 1;

        BEGIN TRANSACTION;

        DECLARE @BranchId INT;
        DECLARE @PartySize INT;
        DECLARE @ResDate DATE;
        DECLARE @StartTime TIME(0);
        DECLARE @EndTime TIME(0);
        DECLARE @OldTableId INT;
        DECLARE @Status NVARCHAR(30);

        SELECT
            @BranchId = BranchId,
            @PartySize = PartySize,
            @ResDate = ReservationDate,
            @StartTime = StartTime,
            @EndTime = EndTime,
            @OldTableId = TableId,
            @Status = Status
        FROM dbo.Reservations WITH (UPDLOCK, HOLDLOCK)
        WHERE ReservationId = @ReservationId AND IsDeleted = 0;

        IF @BranchId IS NULL
            THROW 51004, 'Reservation not found or is deleted.', 1;

        IF @Status IN ('CANCELLED', 'COMPLETED')
            THROW 51000, 'Cannot assign table to a cancelled or completed reservation.', 1;

        -- Validate table
        DECLARE @TableCap INT;
        DECLARE @TableBranch INT;
        DECLARE @TableActive BIT;
        DECLARE @TableDeleted BIT;
        DECLARE @TableNum NVARCHAR(20);

        SELECT
            @TableCap = SeatingCapacity,
            @TableBranch = BranchId,
            @TableActive = IsActive,
            @TableDeleted = IsDeleted,
            @TableNum = TableNumber
        FROM dbo.RestaurantTables WITH (UPDLOCK, HOLDLOCK)
        WHERE TableId = @TableId;

        IF @TableCap IS NULL OR @TableBranch <> @BranchId OR @TableActive = 0 OR @TableDeleted = 1
            THROW 51000, 'Specified table not found, inactive, or belongs to another branch.', 1;

        IF @TableCap < @PartySize
            THROW 51009, 'Table seating capacity is smaller than party size.', 1;

        -- Check overlap with any other reservation on this table
        IF EXISTS (
            SELECT 1
            FROM dbo.Reservations WITH (UPDLOCK, HOLDLOCK)
            WHERE TableId = @TableId
              AND ReservationDate = @ResDate
              AND Status IN ('CONFIRMED', 'SEATED')
              AND IsDeleted = 0
              AND ReservationId <> @ReservationId
              AND (@StartTime < EndTime AND @EndTime > StartTime)
        )
        BEGIN
            THROW 51010, 'Table is already booked during this time interval.', 1;
        END

        -- Assign table
        UPDATE dbo.Reservations
        SET TableId = @TableId,
            UpdatedAt = SYSUTCDATETIME()
        WHERE ReservationId = @ReservationId;

        INSERT INTO dbo.AuditLogs (
            BranchId,
            UserId,
            EntityName,
            EntityId,
            ActionType,
            ActionDescription,
            OldValuesJson,
            NewValuesJson,
            CreatedAt
        ) VALUES (
            @BranchId,
            @AssignedByUserId,
            'Reservations',
            CAST(@ReservationId AS NVARCHAR(60)),
            'ASSIGN_TABLE',
            'Assigned table ' + @TableNum + ' (ID: ' + CAST(@TableId AS NVARCHAR(20)) + ')',
            (SELECT @OldTableId AS TableId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT @TableId AS TableId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;

        EXEC dbo.usp_Reservation_GetById @ReservationId = @ReservationId;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 217: dbo.usp_Reservation_ReleaseTable
-- Description: Unassigns table from a reservation without cancelling booking.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_ReleaseTable', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_ReleaseTable;
GO

CREATE PROCEDURE dbo.usp_Reservation_ReleaseTable
    @ReservationId BIGINT,
    @ReleasedByUserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @ReservationId IS NULL OR @ReservationId <= 0
            THROW 51000, 'Invalid ReservationId specified.', 1;

        BEGIN TRANSACTION;

        DECLARE @BranchId INT;
        DECLARE @OldTableId INT;

        SELECT @BranchId = BranchId, @OldTableId = TableId
        FROM dbo.Reservations WITH (UPDLOCK, HOLDLOCK)
        WHERE ReservationId = @ReservationId AND IsDeleted = 0;

        IF @BranchId IS NULL
            THROW 51004, 'Reservation not found or is deleted.', 1;

        UPDATE dbo.Reservations
        SET TableId = NULL,
            UpdatedAt = SYSUTCDATETIME()
        WHERE ReservationId = @ReservationId;

        INSERT INTO dbo.AuditLogs (
            BranchId,
            UserId,
            EntityName,
            EntityId,
            ActionType,
            ActionDescription,
            OldValuesJson,
            NewValuesJson,
            CreatedAt
        ) VALUES (
            @BranchId,
            @ReleasedByUserId,
            'Reservations',
            CAST(@ReservationId AS NVARCHAR(60)),
            'RELEASE_TABLE',
            'Released assigned table from reservation',
            (SELECT @OldTableId AS TableId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT NULL AS TableId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;

        SELECT @ReservationId AS ReservationId, NULL AS TableId;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ============================================================================
-- SECTION 3: AVAILABILITY DISCOVERY & TIME SLOTS (SPs 218â€“219)
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 218: dbo.usp_Reservation_CheckAvailability
-- Description: Discovers all available physical tables for a given branch, date,
--              start time, and party size without overlapping reservations.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_CheckAvailability', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_CheckAvailability;
GO

CREATE PROCEDURE dbo.usp_Reservation_CheckAvailability
    @BranchId INT,
    @ReservationDate DATE,
    @StartTime TIME(0),
    @PartySize INT,
    @DurationMinutes INT = NULL,
    @SectionId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @BranchId IS NULL OR @BranchId <= 0
    BEGIN
        RAISERROR('BranchId is required.', 16, 1);
        RETURN;
    END

    IF @PartySize IS NULL OR @PartySize <= 0
        SET @PartySize = 2;

    IF @DurationMinutes IS NULL OR @DurationMinutes <= 0
        SET @DurationMinutes = CASE WHEN @PartySize <= 4 THEN 90 ELSE 120 END;

    DECLARE @EndTime TIME(0) = CAST(DATEADD(MINUTE, @DurationMinutes, CAST(@StartTime AS DATETIME)) AS TIME(0));

    SELECT
        t.TableId,
        t.BranchId,
        t.TableNumber,
        t.SeatingCapacity,
        t.CurrentStatus,
        t.SectionId,
        s.SectionName,
        s.FloorLevel,
        t.PosX,
        t.PosY
    FROM dbo.RestaurantTables t
    INNER JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE t.BranchId = @BranchId
      AND t.IsActive = 1
      AND t.IsDeleted = 0
      AND t.SeatingCapacity >= @PartySize
      AND (@SectionId IS NULL OR t.SectionId = @SectionId)
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.Reservations r
          WHERE r.TableId = t.TableId
            AND r.ReservationDate = @ReservationDate
            AND r.Status IN ('CONFIRMED', 'SEATED')
            AND r.IsDeleted = 0
            AND (@StartTime < r.EndTime AND @EndTime > r.StartTime)
      )
    ORDER BY t.SeatingCapacity ASC, t.TableNumber ASC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 219: dbo.usp_Reservation_GetTimeSlots
-- Description: Dynamically generates interval booking slots between branch
--              opening and closing times with real-time available table counts.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_GetTimeSlots', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_GetTimeSlots;
GO

CREATE PROCEDURE dbo.usp_Reservation_GetTimeSlots
    @BranchId INT,
    @ReservationDate DATE,
    @PartySize INT,
    @SlotIntervalMinutes INT = 30
AS
BEGIN
    SET NOCOUNT ON;

    IF @BranchId IS NULL OR @BranchId <= 0
    BEGIN
        RAISERROR('BranchId is required.', 16, 1);
        RETURN;
    END

    IF @PartySize IS NULL OR @PartySize <= 0
        SET @PartySize = 2;

    IF @SlotIntervalMinutes IS NULL OR @SlotIntervalMinutes < 15
        SET @SlotIntervalMinutes = 30;

    DECLARE @DurationMinutes INT = CASE WHEN @PartySize <= 4 THEN 90 ELSE 120 END;

    -- Retrieve operating hours
    DECLARE @OpeningTime TIME(0);
    DECLARE @ClosingTime TIME(0);

    SELECT @OpeningTime = OpeningTime, @ClosingTime = ClosingTime
    FROM dbo.Branches
    WHERE BranchId = @BranchId AND IsActive = 1;

    IF @OpeningTime IS NULL
    BEGIN
        RAISERROR('Branch not found or inactive.', 16, 1);
        RETURN;
    END

    -- If closing time is 00:00:00 (midnight), represent as 23:59:59 for calculations
    DECLARE @EffectiveClosingMinutes INT;
    IF @ClosingTime = '00:00:00'
        SET @EffectiveClosingMinutes = 24 * 60;
    ELSE
        SET @EffectiveClosingMinutes = DATEDIFF(MINUTE, '00:00:00', @ClosingTime);

    DECLARE @OpeningMinutes INT = DATEDIFF(MINUTE, '00:00:00', @OpeningTime);
    DECLARE @LatestSlotStartMinutes INT = @EffectiveClosingMinutes - @DurationMinutes;

    -- Generate slot table
    DECLARE @Slots TABLE (
        SlotTime TIME(0) NOT NULL,
        SlotEndTime TIME(0) NOT NULL
    );

    DECLARE @CurMin INT = @OpeningMinutes;
    WHILE @CurMin <= @LatestSlotStartMinutes
    BEGIN
        DECLARE @SlotStart TIME(0) = DATEADD(MINUTE, @CurMin, CAST('00:00:00' AS TIME(0)));
        DECLARE @SlotEnd TIME(0) = DATEADD(MINUTE, @CurMin + @DurationMinutes, CAST('00:00:00' AS TIME(0)));
        INSERT INTO @Slots (SlotTime, SlotEndTime) VALUES (@SlotStart, @SlotEnd);
        SET @CurMin = @CurMin + @SlotIntervalMinutes;
    END

    -- Count total suitable tables in branch
    DECLARE @TotalTables INT;
    SELECT @TotalTables = COUNT(1)
    FROM dbo.RestaurantTables
    WHERE BranchId = @BranchId AND IsActive = 1 AND IsDeleted = 0 AND SeatingCapacity >= @PartySize;

    -- For each slot, calculate available table count
    SELECT
        s.SlotTime,
        s.SlotEndTime,
        COUNT(t.TableId) AS AvailableTableCount,
        CASE WHEN COUNT(t.TableId) > 0 THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS IsAvailable
    FROM @Slots s
    LEFT JOIN dbo.RestaurantTables t ON t.BranchId = @BranchId
        AND t.IsActive = 1
        AND t.IsDeleted = 0
        AND t.SeatingCapacity >= @PartySize
        AND NOT EXISTS (
            SELECT 1
            FROM dbo.Reservations r
            WHERE r.TableId = t.TableId
              AND r.ReservationDate = @ReservationDate
              AND r.Status IN ('CONFIRMED', 'SEATED')
              AND r.IsDeleted = 0
              AND (s.SlotTime < r.EndTime AND s.SlotEndTime > r.StartTime)
        )
    GROUP BY s.SlotTime, s.SlotEndTime
    ORDER BY s.SlotTime ASC;
END;
GO

-- ============================================================================
-- SECTION 4: CUSTOMER BOOKINGS & OPERATIONAL DASHBOARD (SPs 220â€“222)
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 220: dbo.usp_Reservation_ListByCustomer
-- Description: Retrieves chronological booking history for registered customer.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_ListByCustomer', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_ListByCustomer;
GO

CREATE PROCEDURE dbo.usp_Reservation_ListByCustomer
    @CustomerId BIGINT,
    @Page INT = 1,
    @Limit INT = 20,
    @TotalCount INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF @CustomerId IS NULL OR @CustomerId <= 0
    BEGIN
        RAISERROR('CustomerId is required.', 16, 1);
        RETURN;
    END

    IF @Page < 1 SET @Page = 1;
    IF @Limit < 1 OR @Limit > 100 SET @Limit = 20;

    DECLARE @Offset INT = (@Page - 1) * @Limit;

    SELECT @TotalCount = COUNT(1)
    FROM dbo.Reservations
    WHERE CustomerId = @CustomerId AND IsDeleted = 0;

    SELECT
        r.ReservationId,
        r.BranchId,
        b.BranchName,
        b.BranchCode,
        b.Phone AS BranchPhone,
        r.TableId,
        t.TableNumber,
        r.GuestName,
        r.GuestPhone,
        r.GuestEmail,
        r.PartySize,
        r.ReservationDate,
        r.StartTime,
        r.EndTime,
        r.Status,
        r.SpecialRequests,
        r.DepositAmount,
        r.CreatedAt,
        r.UpdatedAt
    FROM dbo.Reservations r
    INNER JOIN dbo.Branches b ON r.BranchId = b.BranchId
    LEFT JOIN dbo.RestaurantTables t ON r.TableId = t.TableId
    WHERE r.CustomerId = @CustomerId
      AND r.IsDeleted = 0
    ORDER BY r.ReservationDate DESC, r.StartTime DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 221: dbo.usp_Reservation_GetDashboardSummary
-- Description: Real-time operational KPIs: total bookings, status counts,
--              and expected vs seated covers for a branch and date.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_GetDashboardSummary', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_GetDashboardSummary;
GO

CREATE PROCEDURE dbo.usp_Reservation_GetDashboardSummary
    @BranchId INT,
    @TargetDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @BranchId IS NULL OR @BranchId <= 0
    BEGIN
        RAISERROR('BranchId is required.', 16, 1);
        RETURN;
    END

    IF @TargetDate IS NULL
        SET @TargetDate = CAST(SYSUTCDATETIME() AS DATE);

    SELECT
        @BranchId AS BranchId,
        @TargetDate AS TargetDate,
        COUNT(1) AS TotalBookings,
        ISNULL(SUM(CASE WHEN r.Status = 'CONFIRMED' THEN 1 ELSE 0 END), 0) AS ConfirmedCount,
        ISNULL(SUM(CASE WHEN r.Status = 'SEATED' THEN 1 ELSE 0 END), 0) AS SeatedCount,
        ISNULL(SUM(CASE WHEN r.Status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS CompletedCount,
        ISNULL(SUM(CASE WHEN r.Status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS CancelledCount,
        ISNULL(SUM(CASE WHEN r.Status = 'NO_SHOW' THEN 1 ELSE 0 END), 0) AS NoShowCount,
        ISNULL(SUM(CASE WHEN r.Status IN ('CONFIRMED', 'SEATED', 'COMPLETED') THEN r.PartySize ELSE 0 END), 0) AS TotalExpectedCovers,
        ISNULL(SUM(CASE WHEN r.Status = 'SEATED' THEN r.PartySize ELSE 0 END), 0) AS TotalSeatedCovers,
        ISNULL(SUM(CASE WHEN r.Status = 'COMPLETED' THEN r.PartySize ELSE 0 END), 0) AS TotalCompletedCovers
    FROM dbo.Reservations r
    WHERE r.BranchId = @BranchId
      AND r.ReservationDate = @TargetDate
      AND r.IsDeleted = 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 222: dbo.usp_Reservation_CreateWalkIn
-- Description: Instant walk-in seating: assigns table immediately with 'SEATED'
--              status, sets current timestamp, and logs audit record.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_CreateWalkIn', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_CreateWalkIn;
GO

CREATE PROCEDURE dbo.usp_Reservation_CreateWalkIn
    @BranchId INT,
    @TableId INT,
    @GuestName NVARCHAR(100),
    @GuestPhone NVARCHAR(25),
    @PartySize INT,
    @SpecialRequests NVARCHAR(500) = NULL,
    @CreatedByUserId BIGINT = NULL,
    @NewReservationId BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @BranchId IS NULL OR @BranchId <= 0
            THROW 51000, 'Invalid BranchId specified.', 1;

        IF @TableId IS NULL OR @TableId <= 0
            THROW 51000, 'TableId is required for walk-in seating.', 1;

        IF @GuestName IS NULL OR LTRIM(RTRIM(@GuestName)) = ''
            SET @GuestName = 'Walk-In Guest';

        IF @GuestPhone IS NULL OR LTRIM(RTRIM(@GuestPhone)) = ''
            SET @GuestPhone = 'N/A';

        IF @PartySize IS NULL OR @PartySize <= 0
            SET @PartySize = 2;

        DECLARE @Now DATETIME2 = SYSUTCDATETIME();
        DECLARE @Today DATE = CAST(@Now AS DATE);
        DECLARE @StartTime TIME(0) = CAST(@Now AS TIME(0));
        DECLARE @Duration INT = CASE WHEN @PartySize <= 4 THEN 90 ELSE 120 END;
        DECLARE @EndTime TIME(0) = CAST(DATEADD(MINUTE, @Duration, @Now) AS TIME(0));

        BEGIN TRANSACTION;

        -- Validate table
        DECLARE @TableCap INT;
        DECLARE @TableBranch INT;
        DECLARE @TableActive BIT;
        DECLARE @TableDeleted BIT;
        DECLARE @TableNum NVARCHAR(20);

        SELECT
            @TableCap = SeatingCapacity,
            @TableBranch = BranchId,
            @TableActive = IsActive,
            @TableDeleted = IsDeleted,
            @TableNum = TableNumber
        FROM dbo.RestaurantTables WITH (UPDLOCK, HOLDLOCK)
        WHERE TableId = @TableId;

        IF @TableCap IS NULL OR @TableBranch <> @BranchId OR @TableActive = 0 OR @TableDeleted = 1
            THROW 51000, 'Specified table not found, inactive, or belongs to another branch.', 1;

        IF @TableCap < @PartySize
            THROW 51009, 'Table seating capacity is smaller than party size.', 1;

        -- Check overlap
        IF EXISTS (
            SELECT 1
            FROM dbo.Reservations WITH (UPDLOCK, HOLDLOCK)
            WHERE TableId = @TableId
              AND ReservationDate = @Today
              AND Status IN ('CONFIRMED', 'SEATED')
              AND IsDeleted = 0
              AND (@StartTime < EndTime AND @EndTime > StartTime)
        )
        BEGIN
            THROW 51000, 'Table is already booked during this time window.', 1;
        END

        -- Insert Walk-In Reservation
        INSERT INTO dbo.Reservations (
            BranchId,
            TableId,
            CustomerId,
            GuestName,
            GuestPhone,
            GuestEmail,
            PartySize,
            ReservationDate,
            StartTime,
            EndTime,
            Status,
            SpecialRequests,
            DepositAmount,
            CreatedByUserId,
            CreatedAt,
            UpdatedAt,
            IsDeleted
        ) VALUES (
            @BranchId,
            @TableId,
            NULL,
            LTRIM(RTRIM(@GuestName)),
            LTRIM(RTRIM(@GuestPhone)),
            NULL,
            @PartySize,
            @Today,
            @StartTime,
            @EndTime,
            'SEATED',
            NULLIF(LTRIM(RTRIM(@SpecialRequests)), ''),
            0.00,
            @CreatedByUserId,
            @Now,
            @Now,
            0
        );

        SET @NewReservationId = SCOPE_IDENTITY();

        -- Audit Log
        INSERT INTO dbo.AuditLogs (
            BranchId,
            UserId,
            EntityName,
            EntityId,
            ActionType,
            ActionDescription,
            NewValuesJson,
            CreatedAt
        ) VALUES (
            @BranchId,
            @CreatedByUserId,
            'Reservations',
            CAST(@NewReservationId AS NVARCHAR(60)),
            'WALK_IN',
            'Walk-in customer seated at Table ' + @TableNum,
            (SELECT @NewReservationId AS ReservationId, @TableId AS TableId, 'SEATED' AS Status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            @Now
        );

        COMMIT TRANSACTION;

        SELECT @NewReservationId AS ReservationId, 'SEATED' AS Status, @TableId AS TableId;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ============================================================================
-- SECTION 5: FLOOR TIMELINE, AUDIT & AUTOMATED SWEEP (SPs 223â€“225)
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 223: dbo.usp_Reservation_GetFloorTimeline
-- Description: Visual floor timeline data: active tables with all reservations
--              for a target date, supporting real-time Gantt / scheduler view.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_GetFloorTimeline', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_GetFloorTimeline;
GO

CREATE PROCEDURE dbo.usp_Reservation_GetFloorTimeline
    @BranchId INT,
    @ReservationDate DATE,
    @SectionId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @BranchId IS NULL OR @BranchId <= 0
    BEGIN
        RAISERROR('BranchId is required.', 16, 1);
        RETURN;
    END

    IF @ReservationDate IS NULL
        SET @ReservationDate = CAST(SYSUTCDATETIME() AS DATE);

    SELECT
        t.TableId,
        t.TableNumber,
        t.SeatingCapacity,
        t.CurrentStatus AS TableCurrentStatus,
        t.PosX,
        t.PosY,
        s.SectionId,
        s.SectionName,
        s.FloorLevel,
        r.ReservationId,
        r.GuestName,
        r.GuestPhone,
        r.PartySize,
        r.StartTime,
        r.EndTime,
        r.Status AS ReservationStatus,
        r.SpecialRequests
    FROM dbo.RestaurantTables t
    INNER JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    LEFT JOIN dbo.Reservations r ON t.TableId = r.TableId
        AND r.ReservationDate = @ReservationDate
        AND r.Status IN ('CONFIRMED', 'SEATED', 'COMPLETED')
        AND r.IsDeleted = 0
    WHERE t.BranchId = @BranchId
      AND t.IsActive = 1
      AND t.IsDeleted = 0
      AND (@SectionId IS NULL OR t.SectionId = @SectionId)
    ORDER BY s.DisplayOrder ASC, t.TableNumber ASC, r.StartTime ASC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 224: dbo.usp_Reservation_GetStatusHistory
-- Description: Retrieves complete audit log trail for a reservation.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_GetStatusHistory', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_GetStatusHistory;
GO

CREATE PROCEDURE dbo.usp_Reservation_GetStatusHistory
    @ReservationId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @ReservationId IS NULL OR @ReservationId <= 0
    BEGIN
        RAISERROR('ReservationId is required.', 16, 1);
        RETURN;
    END

    SELECT
        a.AuditId,
        a.BranchId,
        a.UserId,
        u.FirstName AS UserFirstName,
        u.LastName AS UserLastName,
        a.EntityName,
        a.EntityId,
        a.ActionType,
        a.ActionDescription,
        a.OldValuesJson,
        a.NewValuesJson,
        a.CreatedAt
    FROM dbo.AuditLogs a
    LEFT JOIN dbo.Users u ON a.UserId = u.UserId
    WHERE a.EntityName = 'Reservations'
      AND a.EntityId = CAST(@ReservationId AS NVARCHAR(60))
    ORDER BY a.CreatedAt DESC, a.AuditId DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 225: dbo.usp_Reservation_AutoMarkNoShows
-- Description: Automated sweep for overdue reservations: identifies confirmed
--              bookings exceeding grace period past start time, transitions them
--              to 'NO_SHOW', unassigns tables, and writes audit log entries.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_Reservation_AutoMarkNoShows', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Reservation_AutoMarkNoShows;
GO

CREATE PROCEDURE dbo.usp_Reservation_AutoMarkNoShows
    @BranchId INT = NULL,
    @GracePeriodMinutes INT = 15,
    @CurrentUtcDateTime DATETIME2(3) = NULL,
    @UpdatedCount INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @GracePeriodMinutes IS NULL OR @GracePeriodMinutes < 0
            SET @GracePeriodMinutes = 15;

        IF @CurrentUtcDateTime IS NULL
            SET @CurrentUtcDateTime = SYSUTCDATETIME();

        DECLARE @Today DATE = CAST(@CurrentUtcDateTime AS DATE);
        DECLARE @NowTime TIME(0) = CAST(@CurrentUtcDateTime AS TIME(0));

        -- Identify overdue reservations
        DECLARE @Overdue TABLE (
            ReservationId BIGINT NOT NULL,
            BranchId INT NOT NULL,
            TableId INT NULL,
            GuestName NVARCHAR(100) NOT NULL
        );

        INSERT INTO @Overdue (ReservationId, BranchId, TableId, GuestName)
        SELECT
            r.ReservationId,
            r.BranchId,
            r.TableId,
            r.GuestName
        FROM dbo.Reservations r
        WHERE r.Status = 'CONFIRMED'
          AND r.IsDeleted = 0
          AND (@BranchId IS NULL OR r.BranchId = @BranchId)
          AND (
              r.ReservationDate < @Today
              OR
              (
                  r.ReservationDate = @Today
                  AND DATEADD(MINUTE, @GracePeriodMinutes, CAST(r.StartTime AS DATETIME)) < CAST(@NowTime AS DATETIME)
              )
          );

        SELECT @UpdatedCount = COUNT(1) FROM @Overdue;

        IF @UpdatedCount > 0
        BEGIN
            BEGIN TRANSACTION;

            -- Update status to NO_SHOW and unassign table
            UPDATE r
            SET r.Status = 'NO_SHOW',
                r.TableId = NULL,
                r.UpdatedAt = @CurrentUtcDateTime
            FROM dbo.Reservations r
            INNER JOIN @Overdue o ON r.ReservationId = o.ReservationId;

            -- Insert audit records
            INSERT INTO dbo.AuditLogs (
                BranchId,
                EntityName,
                EntityId,
                ActionType,
                ActionDescription,
                OldValuesJson,
                NewValuesJson,
                CreatedAt
            )
            SELECT
                o.BranchId,
                'Reservations',
                CAST(o.ReservationId AS NVARCHAR(60)),
                'NO_SHOW',
                'System automated sweep marked reservation as NO_SHOW (Grace period: ' + CAST(@GracePeriodMinutes AS NVARCHAR(10)) + 'm)',
                (SELECT 'CONFIRMED' AS Status, o.TableId AS TableId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                (SELECT 'NO_SHOW' AS Status, NULL AS TableId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                @CurrentUtcDateTime
            FROM @Overdue o;

            COMMIT TRANSACTION;
        END

        -- Return list of updated reservations
        SELECT
            o.ReservationId,
            o.BranchId,
            o.GuestName,
            'NO_SHOW' AS NewStatus
        FROM @Overdue o;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
