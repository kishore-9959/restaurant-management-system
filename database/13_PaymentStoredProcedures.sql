-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS) - DATABASE MIGRATION SCRIPT
-- File: database/13_PaymentStoredProcedures.sql
-- Description: Stored Procedures for Phase 9 - Payment Service
-- Author: Senior Microservices Architect & SQL Server Database Architect
-- Date: November 15, 2026
--
-- Tables Owned by Payment Service:
--   1. dbo.Payments (Table 31)
--   2. dbo.PaymentTransactions (Table 32)
--   3. dbo.PaymentRefunds (Table 33)
--
-- Stored Procedures Included (SPs 132 - 144):
--   132. dbo.usp_Payment_Create
--   133. dbo.usp_Payment_VerifyAndCapture
--   134. dbo.usp_Payment_RecordFailure
--   135. dbo.usp_Payment_SettleOffline
--   136. dbo.usp_Payment_GetById
--   137. dbo.usp_Payment_GetByOrderId
--   138. dbo.usp_Payment_GetByGatewayOrderId
--   139. dbo.usp_Payment_GetByGatewayPaymentId
--   140. dbo.usp_Payment_List
--   141. dbo.usp_Payment_LogTransaction
--   142. dbo.usp_Payment_Refund_Create
--   143. dbo.usp_Payment_Refund_GetById
--   144. dbo.usp_Payment_GetReconciliationSummary
--   145. dbo.usp_Payment_GetStatus
-- ============================================================================

-- ============================================================================
-- PROCEDURE 132: dbo.usp_Payment_Create
-- Description: Inserts a pending payment record for an order and logs the initial
--              payment intent in the immutable transaction ledger.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_Create
    @OrderId BIGINT,
    @BranchId INT,
    @PaymentMethod NVARCHAR(30), -- 'RAZORPAY', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI_OFFLINE', 'SPLIT'
    @Amount DECIMAL(10,2),
    @GatewayOrderId NVARCHAR(100) = NULL,
    @SettledByUserId BIGINT = NULL,
    @PaymentReference NVARCHAR(60) = NULL OUTPUT,
    @PaymentId BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 1. Input Validation
    IF @OrderId IS NULL OR @OrderId <= 0
    BEGIN
        RAISERROR('OrderId is required and must be greater than zero.', 16, 1);
        RETURN;
    END;

    IF @BranchId IS NULL OR @BranchId <= 0
    BEGIN
        RAISERROR('BranchId is required and must be greater than zero.', 16, 1);
        RETURN;
    END;

    IF @Amount IS NULL OR @Amount <= 0.00
    BEGIN
        RAISERROR('Payment Amount must be greater than zero.', 16, 1);
        RETURN;
    END;

    IF @PaymentMethod IS NULL OR @PaymentMethod NOT IN ('RAZORPAY', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI_OFFLINE', 'SPLIT')
    BEGIN
        RAISERROR('Invalid PaymentMethod specified.', 16, 1);
        RETURN;
    END;

    -- 2. Idempotency Check: Prevent duplicate pending payment for the same GatewayOrderId
    IF @GatewayOrderId IS NOT NULL AND RTRIM(LTRIM(@GatewayOrderId)) <> ''
    BEGIN
        SELECT TOP 1 
            @PaymentId = PaymentId,
            @PaymentReference = PaymentReference
        FROM dbo.Payments
        WHERE GatewayOrderId = @GatewayOrderId;

        IF @PaymentId IS NOT NULL
        BEGIN
            -- Return existing record idempotently
            SELECT 
                p.PaymentId,
                p.OrderId,
                p.BranchId,
                p.PaymentReference,
                p.PaymentMethod,
                p.Amount,
                p.GatewayOrderId,
                p.GatewayPaymentId,
                p.PaymentStatus,
                p.SettledByUserId,
                p.SettledAt,
                p.CreatedAt,
                p.UpdatedAt
            FROM dbo.Payments p
            WHERE p.PaymentId = @PaymentId;
            RETURN;
        END;
    END;

    -- 3. Atomic Insertion
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Generate unique business payment reference: PAY-YYYYMMDD-ORDERID-SUFFIX
        DECLARE @DateStr NVARCHAR(8) = CONVERT(NVARCHAR(8), GETUTCDATE(), 112);
        DECLARE @RandSuffix NVARCHAR(6) = UPPER(SUBSTRING(REPLACE(CAST(NEWID() AS NVARCHAR(36)), '-', ''), 1, 6));
        SET @PaymentReference = 'PAY-' + @DateStr + '-' + RIGHT('00000' + CAST(@OrderId AS NVARCHAR(10)), 5) + '-' + @RandSuffix;

        INSERT INTO dbo.Payments (
            OrderId,
            BranchId,
            PaymentReference,
            PaymentMethod,
            Amount,
            GatewayOrderId,
            GatewayPaymentId,
            GatewaySignature,
            PaymentStatus,
            SettledByUserId,
            SettledAt,
            CreatedAt,
            UpdatedAt
        ) VALUES (
            @OrderId,
            @BranchId,
            @PaymentReference,
            @PaymentMethod,
            @Amount,
            @GatewayOrderId,
            NULL,
            NULL,
            'PENDING',
            @SettledByUserId,
            NULL,
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        );

        SET @PaymentId = SCOPE_IDENTITY();

        -- Record initial intent in transaction ledger
        INSERT INTO dbo.PaymentTransactions (
            PaymentId,
            TransactionType,
            Amount,
            GatewayTransactionId,
            GatewayResponseCode,
            GatewayPayloadJson,
            Status,
            TransactionDate
        ) VALUES (
            @PaymentId,
            'CHARGE',
            @Amount,
            @GatewayOrderId,
            'PENDING',
            NULL,
            'SUCCESS',
            SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;

        -- Return newly created payment record
        SELECT 
            p.PaymentId,
            p.OrderId,
            p.BranchId,
            p.PaymentReference,
            p.PaymentMethod,
            p.Amount,
            p.GatewayOrderId,
            p.GatewayPaymentId,
            p.PaymentStatus,
            p.SettledByUserId,
            p.SettledAt,
            p.CreatedAt,
            p.UpdatedAt
        FROM dbo.Payments p
        WHERE p.PaymentId = @PaymentId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- PROCEDURE 133: dbo.usp_Payment_VerifyAndCapture
-- Description: Cryptographically verifies and captures an online payment.
--              Updates PaymentStatus to 'SUCCESS', saves gateway payment ID and
--              signature, and logs a WEBHOOK_CAPTURE event in PaymentTransactions.
--              Idempotent on repeated client/webhook captures.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_VerifyAndCapture
    @PaymentId BIGINT = NULL,
    @GatewayOrderId NVARCHAR(100) = NULL,
    @GatewayPaymentId NVARCHAR(100),
    @GatewaySignature NVARCHAR(255) = NULL,
    @SettledByUserId BIGINT = NULL,
    @RawPayloadJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF (@PaymentId IS NULL OR @PaymentId <= 0) AND (@GatewayOrderId IS NULL OR RTRIM(LTRIM(@GatewayOrderId)) = '')
    BEGIN
        RAISERROR('Either PaymentId or GatewayOrderId must be provided.', 16, 1);
        RETURN;
    END;

    IF @GatewayPaymentId IS NULL OR RTRIM(LTRIM(@GatewayPaymentId)) = ''
    BEGIN
        RAISERROR('GatewayPaymentId is required for payment capture.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Locate and lock target payment record
        DECLARE @TargetPaymentId BIGINT;
        DECLARE @CurrentStatus NVARCHAR(30);
        DECLARE @ExistingGatewayPaymentId NVARCHAR(100);
        DECLARE @OrderId BIGINT;
        DECLARE @Amount DECIMAL(10,2);
        DECLARE @BranchId INT;

        SELECT 
            @TargetPaymentId = PaymentId,
            @CurrentStatus = PaymentStatus,
            @ExistingGatewayPaymentId = GatewayPaymentId,
            @OrderId = OrderId,
            @Amount = Amount,
            @BranchId = BranchId
        FROM dbo.Payments WITH (UPDLOCK, HOLDLOCK)
        WHERE (@PaymentId IS NOT NULL AND PaymentId = @PaymentId)
           OR (@PaymentId IS NULL AND GatewayOrderId = @GatewayOrderId);

        IF @TargetPaymentId IS NULL
        BEGIN
            RAISERROR('Target payment record not found.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- 2. Idempotency Check: Already captured with the same gateway payment ID
        IF @CurrentStatus = 'SUCCESS' AND @ExistingGatewayPaymentId = @GatewayPaymentId
        BEGIN
            COMMIT TRANSACTION;

            -- Return cleanly with current state
            SELECT 
                p.PaymentId,
                p.OrderId,
                p.BranchId,
                p.PaymentReference,
                p.PaymentMethod,
                p.Amount,
                p.GatewayOrderId,
                p.GatewayPaymentId,
                p.PaymentStatus,
                p.SettledByUserId,
                p.SettledAt,
                p.CreatedAt,
                p.UpdatedAt,
                CAST(1 AS BIT) AS IsIdempotent
            FROM dbo.Payments p
            WHERE p.PaymentId = @TargetPaymentId;
            RETURN;
        END;

        -- 3. Validation: Cannot capture a payment that is already REFUNDED
        IF @CurrentStatus = 'REFUNDED'
        BEGIN
            RAISERROR('Cannot capture payment: Payment is already in REFUNDED status.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- 4. Update Payment to SUCCESS
        UPDATE dbo.Payments
        SET GatewayPaymentId = @GatewayPaymentId,
            GatewaySignature = ISNULL(@GatewaySignature, GatewaySignature),
            PaymentStatus = 'SUCCESS',
            SettledByUserId = ISNULL(@SettledByUserId, SettledByUserId),
            SettledAt = ISNULL(SettledAt, SYSUTCDATETIME()),
            UpdatedAt = SYSUTCDATETIME()
        WHERE PaymentId = @TargetPaymentId;

        -- 5. Record capture in PaymentTransactions ledger
        INSERT INTO dbo.PaymentTransactions (
            PaymentId,
            TransactionType,
            Amount,
            GatewayTransactionId,
            GatewayResponseCode,
            GatewayPayloadJson,
            Status,
            TransactionDate
        ) VALUES (
            @TargetPaymentId,
            'WEBHOOK_CAPTURE',
            @Amount,
            @GatewayPaymentId,
            'CAPTURED',
            @RawPayloadJson,
            'SUCCESS',
            SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;

        -- 6. Return captured payment record
        SELECT 
            p.PaymentId,
            p.OrderId,
            p.BranchId,
            p.PaymentReference,
            p.PaymentMethod,
            p.Amount,
            p.GatewayOrderId,
            p.GatewayPaymentId,
            p.PaymentStatus,
            p.SettledByUserId,
            p.SettledAt,
            p.CreatedAt,
            p.UpdatedAt,
            CAST(0 AS BIT) AS IsIdempotent
        FROM dbo.Payments p
        WHERE p.PaymentId = @TargetPaymentId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- PROCEDURE 134: dbo.usp_Payment_RecordFailure
-- Description: Records an asynchronous or client-side payment failure.
--              Updates PaymentStatus to 'FAILED' and logs failure details in
--              PaymentTransactions. Idempotent on repeated calls.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_RecordFailure
    @PaymentId BIGINT = NULL,
    @GatewayOrderId NVARCHAR(100) = NULL,
    @GatewayPaymentId NVARCHAR(100) = NULL,
    @ErrorCode NVARCHAR(50) = NULL,
    @ErrorMessage NVARCHAR(255) = NULL,
    @RawPayloadJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF (@PaymentId IS NULL OR @PaymentId <= 0) AND (@GatewayOrderId IS NULL OR RTRIM(LTRIM(@GatewayOrderId)) = '')
    BEGIN
        RAISERROR('Either PaymentId or GatewayOrderId must be provided.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Locate and lock target payment record
        DECLARE @TargetPaymentId BIGINT;
        DECLARE @CurrentStatus NVARCHAR(30);
        DECLARE @Amount DECIMAL(10,2);

        SELECT 
            @TargetPaymentId = PaymentId,
            @CurrentStatus = PaymentStatus,
            @Amount = Amount
        FROM dbo.Payments WITH (UPDLOCK, HOLDLOCK)
        WHERE (@PaymentId IS NOT NULL AND PaymentId = @PaymentId)
           OR (@PaymentId IS NULL AND GatewayOrderId = @GatewayOrderId);

        IF @TargetPaymentId IS NULL
        BEGIN
            RAISERROR('Target payment record not found.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- 2. Guard: Cannot mark a SUCCESS payment as FAILED
        IF @CurrentStatus = 'SUCCESS'
        BEGIN
            RAISERROR('Invalid operation: Cannot mark a settled SUCCESS payment as FAILED.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- 3. Update status to FAILED
        UPDATE dbo.Payments
        SET GatewayPaymentId = ISNULL(@GatewayPaymentId, GatewayPaymentId),
            PaymentStatus = 'FAILED',
            UpdatedAt = SYSUTCDATETIME()
        WHERE PaymentId = @TargetPaymentId;

        -- 4. Record failure in transaction ledger
        INSERT INTO dbo.PaymentTransactions (
            PaymentId,
            TransactionType,
            Amount,
            GatewayTransactionId,
            GatewayResponseCode,
            GatewayPayloadJson,
            Status,
            TransactionDate
        ) VALUES (
            @TargetPaymentId,
            'FAILURE',
            @Amount,
            @GatewayPaymentId,
            ISNULL(@ErrorCode, 'PAYMENT_FAILED'),
            @RawPayloadJson,
            'FAILED',
            SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;

        -- 5. Return updated payment record
        SELECT 
            p.PaymentId,
            p.OrderId,
            p.BranchId,
            p.PaymentReference,
            p.PaymentMethod,
            p.Amount,
            p.GatewayOrderId,
            p.GatewayPaymentId,
            p.PaymentStatus,
            p.SettledByUserId,
            p.SettledAt,
            p.CreatedAt,
            p.UpdatedAt
        FROM dbo.Payments p
        WHERE p.PaymentId = @TargetPaymentId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- PROCEDURE 135: dbo.usp_Payment_SettleOffline
-- Description: Atomically records and settles an on-premise offline payment
--              (CASH, CREDIT_CARD, DEBIT_CARD, UPI_OFFLINE) by POS staff.
--              Immediately marks PaymentStatus as 'SUCCESS' and records SettledAt.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_SettleOffline
    @OrderId BIGINT,
    @BranchId INT,
    @PaymentMethod NVARCHAR(30), -- 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI_OFFLINE'
    @Amount DECIMAL(10,2),
    @SettledByUserId BIGINT,
    @Notes NVARCHAR(500) = NULL,
    @PaymentReference NVARCHAR(60) = NULL OUTPUT,
    @PaymentId BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 1. Input Validations
    IF @OrderId IS NULL OR @OrderId <= 0
    BEGIN
        RAISERROR('OrderId is required and must be greater than zero.', 16, 1);
        RETURN;
    END;

    IF @BranchId IS NULL OR @BranchId <= 0
    BEGIN
        RAISERROR('BranchId is required and must be greater than zero.', 16, 1);
        RETURN;
    END;

    IF @Amount IS NULL OR @Amount <= 0.00
    BEGIN
        RAISERROR('Settlement Amount must be greater than zero.', 16, 1);
        RETURN;
    END;

    IF @SettledByUserId IS NULL OR @SettledByUserId <= 0
    BEGIN
        RAISERROR('SettledByUserId is required for offline settlement.', 16, 1);
        RETURN;
    END;

    IF @PaymentMethod IS NULL OR @PaymentMethod NOT IN ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI_OFFLINE')
    BEGIN
        RAISERROR('Invalid offline PaymentMethod. Must be CASH, CREDIT_CARD, DEBIT_CARD, or UPI_OFFLINE.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 2. Generate unique reference: PAY-YYYYMMDD-ORDERID-SUFFIX
        DECLARE @DateStr NVARCHAR(8) = CONVERT(NVARCHAR(8), GETUTCDATE(), 112);
        DECLARE @RandSuffix NVARCHAR(6) = UPPER(SUBSTRING(REPLACE(CAST(NEWID() AS NVARCHAR(36)), '-', ''), 1, 6));
        SET @PaymentReference = 'PAY-' + @DateStr + '-' + RIGHT('00000' + CAST(@OrderId AS NVARCHAR(10)), 5) + '-' + @RandSuffix;

        -- 3. Insert settled payment
        INSERT INTO dbo.Payments (
            OrderId,
            BranchId,
            PaymentReference,
            PaymentMethod,
            Amount,
            GatewayOrderId,
            GatewayPaymentId,
            GatewaySignature,
            PaymentStatus,
            SettledByUserId,
            SettledAt,
            CreatedAt,
            UpdatedAt
        ) VALUES (
            @OrderId,
            @BranchId,
            @PaymentReference,
            @PaymentMethod,
            @Amount,
            NULL,
            NULL,
            NULL,
            'SUCCESS',
            @SettledByUserId,
            SYSUTCDATETIME(),
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        );

        SET @PaymentId = SCOPE_IDENTITY();

        -- 4. Record transaction in ledger
        INSERT INTO dbo.PaymentTransactions (
            PaymentId,
            TransactionType,
            Amount,
            GatewayTransactionId,
            GatewayResponseCode,
            GatewayPayloadJson,
            Status,
            TransactionDate
        ) VALUES (
            @PaymentId,
            'CHARGE',
            @Amount,
            @PaymentReference,
            'SETTLED_OFFLINE',
            CASE WHEN @Notes IS NOT NULL THEN '{"notes":"' + REPLACE(@Notes, '"', '\"') + '"}' ELSE NULL END,
            'SUCCESS',
            SYSUTCDATETIME()
        );

        -- 5. Calculate total settled payments for this order
        DECLARE @TotalPaidForOrder DECIMAL(10,2);
        SELECT @TotalPaidForOrder = ISNULL(SUM(Amount), 0.00)
        FROM dbo.Payments
        WHERE OrderId = @OrderId AND PaymentStatus = 'SUCCESS';

        COMMIT TRANSACTION;

        -- 6. Return payment record with order aggregate
        SELECT 
            p.PaymentId,
            p.OrderId,
            p.BranchId,
            p.PaymentReference,
            p.PaymentMethod,
            p.Amount,
            p.PaymentStatus,
            p.SettledByUserId,
            p.SettledAt,
            p.CreatedAt,
            p.UpdatedAt,
            @TotalPaidForOrder AS TotalPaidForOrder
        FROM dbo.Payments p
        WHERE p.PaymentId = @PaymentId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- PROCEDURE 136: dbo.usp_Payment_GetById
-- Description: Multi-recordset fetch returning payment header details, transaction
--              audit events, refund history, and calculated settlement balances.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_GetById
    @PaymentId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @PaymentId IS NULL OR @PaymentId <= 0
    BEGIN
        RAISERROR('Valid PaymentId is required.', 16, 1);
        RETURN;
    END;

    -- Recordset 1: Payment Header
    SELECT 
        p.PaymentId,
        p.OrderId,
        p.BranchId,
        b.BranchName,
        p.PaymentReference,
        p.PaymentMethod,
        p.Amount,
        p.GatewayOrderId,
        p.GatewayPaymentId,
        p.GatewaySignature,
        p.PaymentStatus,
        p.SettledByUserId,
        u.FirstName + ' ' + u.LastName AS SettledByUserName,
        p.SettledAt,
        p.CreatedAt,
        p.UpdatedAt
    FROM dbo.Payments p
    JOIN dbo.Branches b ON p.BranchId = b.BranchId
    LEFT JOIN dbo.Users u ON p.SettledByUserId = u.UserId
    WHERE p.PaymentId = @PaymentId;

    -- Recordset 2: Transaction History
    SELECT 
        pt.TransactionId,
        pt.PaymentId,
        pt.TransactionType,
        pt.Amount,
        pt.GatewayTransactionId,
        pt.GatewayResponseCode,
        pt.GatewayPayloadJson,
        pt.Status,
        pt.TransactionDate
    FROM dbo.PaymentTransactions pt
    WHERE pt.PaymentId = @PaymentId
    ORDER BY pt.TransactionDate DESC, pt.TransactionId DESC;

    -- Recordset 3: Refunds History
    SELECT 
        pr.RefundId,
        pr.PaymentId,
        pr.GatewayRefundId,
        pr.RefundAmount,
        pr.Reason,
        pr.Status,
        pr.InitiatedByUserId,
        u.FirstName + ' ' + u.LastName AS InitiatedByUserName,
        pr.ProcessedAt,
        pr.CreatedAt
    FROM dbo.PaymentRefunds pr
    JOIN dbo.Users u ON pr.InitiatedByUserId = u.UserId
    WHERE pr.PaymentId = @PaymentId
    ORDER BY pr.CreatedAt DESC;

    -- Recordset 4: Summary Calculations
    SELECT 
        p.Amount AS OriginalAmount,
        ISNULL(SUM(pr.RefundAmount), 0.00) AS TotalRefunded,
        (p.Amount - ISNULL(SUM(pr.RefundAmount), 0.00)) AS NetSettledAmount
    FROM dbo.Payments p
    LEFT JOIN dbo.PaymentRefunds pr ON p.PaymentId = pr.PaymentId AND pr.Status = 'PROCESSED'
    WHERE p.PaymentId = @PaymentId
    GROUP BY p.Amount;
END;
GO

-- ============================================================================
-- PROCEDURE 137: dbo.usp_Payment_GetByOrderId
-- Description: Multi-recordset fetch returning all payments and refunds for a
--              specific order to support split billing and payment status checks.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_GetByOrderId
    @OrderId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @OrderId IS NULL OR @OrderId <= 0
    BEGIN
        RAISERROR('Valid OrderId is required.', 16, 1);
        RETURN;
    END;

    -- Recordset 1: Payments List
    SELECT 
        p.PaymentId,
        p.OrderId,
        p.BranchId,
        p.PaymentReference,
        p.PaymentMethod,
        p.Amount,
        p.GatewayOrderId,
        p.GatewayPaymentId,
        p.PaymentStatus,
        p.SettledByUserId,
        u.FirstName + ' ' + u.LastName AS SettledByUserName,
        p.SettledAt,
        p.CreatedAt,
        p.UpdatedAt
    FROM dbo.Payments p
    LEFT JOIN dbo.Users u ON p.SettledByUserId = u.UserId
    WHERE p.OrderId = @OrderId
    ORDER BY p.CreatedAt ASC;

    -- Recordset 2: Refunds List
    SELECT 
        pr.RefundId,
        pr.PaymentId,
        p.PaymentReference,
        pr.GatewayRefundId,
        pr.RefundAmount,
        pr.Reason,
        pr.Status,
        pr.InitiatedByUserId,
        u.FirstName + ' ' + u.LastName AS InitiatedByUserName,
        pr.ProcessedAt,
        pr.CreatedAt
    FROM dbo.PaymentRefunds pr
    JOIN dbo.Payments p ON pr.PaymentId = p.PaymentId
    JOIN dbo.Users u ON pr.InitiatedByUserId = u.UserId
    WHERE p.OrderId = @OrderId
    ORDER BY pr.CreatedAt ASC;

    -- Recordset 3: Aggregated Financial Summary
    SELECT 
        ISNULL(SUM(CASE WHEN p.PaymentStatus = 'SUCCESS' THEN p.Amount ELSE 0.00 END), 0.00) AS TotalPaid,
        ISNULL((
            SELECT SUM(pr.RefundAmount)
            FROM dbo.PaymentRefunds pr
            JOIN dbo.Payments p2 ON pr.PaymentId = p2.PaymentId
            WHERE p2.OrderId = @OrderId AND pr.Status = 'PROCESSED'
        ), 0.00) AS TotalRefunded,
        (
            ISNULL(SUM(CASE WHEN p.PaymentStatus = 'SUCCESS' THEN p.Amount ELSE 0.00 END), 0.00) -
            ISNULL((
                SELECT SUM(pr.RefundAmount)
                FROM dbo.PaymentRefunds pr
                JOIN dbo.Payments p2 ON pr.PaymentId = p2.PaymentId
                WHERE p2.OrderId = @OrderId AND pr.Status = 'PROCESSED'
            ), 0.00)
        ) AS NetAmountPaid
    FROM dbo.Payments p
    WHERE p.OrderId = @OrderId;
END;
GO

-- ============================================================================
-- PROCEDURE 138: dbo.usp_Payment_GetByGatewayOrderId
-- Description: Looks up payment header by Razorpay GatewayOrderId.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_GetByGatewayOrderId
    @GatewayOrderId NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    IF @GatewayOrderId IS NULL OR RTRIM(LTRIM(@GatewayOrderId)) = ''
    BEGIN
        RAISERROR('GatewayOrderId is required.', 16, 1);
        RETURN;
    END;

    SELECT 
        p.PaymentId,
        p.OrderId,
        p.BranchId,
        b.BranchName,
        p.PaymentReference,
        p.PaymentMethod,
        p.Amount,
        p.GatewayOrderId,
        p.GatewayPaymentId,
        p.PaymentStatus,
        p.SettledByUserId,
        p.SettledAt,
        p.CreatedAt,
        p.UpdatedAt
    FROM dbo.Payments p
    JOIN dbo.Branches b ON p.BranchId = b.BranchId
    WHERE p.GatewayOrderId = @GatewayOrderId;
END;
GO

-- ============================================================================
-- PROCEDURE 139: dbo.usp_Payment_GetByGatewayPaymentId
-- Description: Looks up payment header by Razorpay GatewayPaymentId.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_GetByGatewayPaymentId
    @GatewayPaymentId NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    IF @GatewayPaymentId IS NULL OR RTRIM(LTRIM(@GatewayPaymentId)) = ''
    BEGIN
        RAISERROR('GatewayPaymentId is required.', 16, 1);
        RETURN;
    END;

    SELECT 
        p.PaymentId,
        p.OrderId,
        p.BranchId,
        b.BranchName,
        p.PaymentReference,
        p.PaymentMethod,
        p.Amount,
        p.GatewayOrderId,
        p.GatewayPaymentId,
        p.PaymentStatus,
        p.SettledByUserId,
        p.SettledAt,
        p.CreatedAt,
        p.UpdatedAt
    FROM dbo.Payments p
    JOIN dbo.Branches b ON p.BranchId = b.BranchId
    WHERE p.GatewayPaymentId = @GatewayPaymentId;
END;
GO

-- ============================================================================
-- PROCEDURE 140: dbo.usp_Payment_List
-- Description: Filtered and paginated listing of payments with branch, method,
--              status, order, and date-range filters.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_List
    @BranchId INT = NULL,
    @PaymentStatus NVARCHAR(30) = NULL,
    @PaymentMethod NVARCHAR(30) = NULL,
    @OrderId BIGINT = NULL,
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
    DECLARE @TotalRecords INT;

    SELECT @TotalRecords = COUNT(1)
    FROM dbo.Payments p
    WHERE (@BranchId IS NULL OR p.BranchId = @BranchId)
      AND (@PaymentStatus IS NULL OR p.PaymentStatus = @PaymentStatus)
      AND (@PaymentMethod IS NULL OR p.PaymentMethod = @PaymentMethod)
      AND (@OrderId IS NULL OR p.OrderId = @OrderId)
      AND (@StartDate IS NULL OR p.CreatedAt >= @StartDate)
      AND (@EndDate IS NULL OR p.CreatedAt <= @EndDate);

    -- Recordset 1: Paginated Payment Records
    SELECT 
        p.PaymentId,
        p.OrderId,
        p.BranchId,
        b.BranchName,
        p.PaymentReference,
        p.PaymentMethod,
        p.Amount,
        p.GatewayOrderId,
        p.GatewayPaymentId,
        p.PaymentStatus,
        p.SettledByUserId,
        u.FirstName + ' ' + u.LastName AS SettledByUserName,
        p.SettledAt,
        p.CreatedAt,
        p.UpdatedAt
    FROM dbo.Payments p
    JOIN dbo.Branches b ON p.BranchId = b.BranchId
    LEFT JOIN dbo.Users u ON p.SettledByUserId = u.UserId
    WHERE (@BranchId IS NULL OR p.BranchId = @BranchId)
      AND (@PaymentStatus IS NULL OR p.PaymentStatus = @PaymentStatus)
      AND (@PaymentMethod IS NULL OR p.PaymentMethod = @PaymentMethod)
      AND (@OrderId IS NULL OR p.OrderId = @OrderId)
      AND (@StartDate IS NULL OR p.CreatedAt >= @StartDate)
      AND (@EndDate IS NULL OR p.CreatedAt <= @EndDate)
    ORDER BY p.CreatedAt DESC
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY;

    -- Recordset 2: Pagination Metadata
    SELECT 
        @Page AS CurrentPage,
        @Limit AS PageLimit,
        @TotalRecords AS TotalRecords,
        CAST(CEILING(CAST(@TotalRecords AS FLOAT) / CAST(@Limit AS FLOAT)) AS INT) AS TotalPages;
END;
GO

-- ============================================================================
-- PROCEDURE 141: dbo.usp_Payment_LogTransaction
-- Description: Appends raw gateway payloads, transaction snapshots, and webhook
--              events into the immutable PaymentTransactions audit ledger.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_LogTransaction
    @PaymentId BIGINT,
    @TransactionType NVARCHAR(30), -- 'CHARGE', 'WEBHOOK_CAPTURE', 'REFUND', 'FAILURE'
    @Amount DECIMAL(10,2),
    @GatewayTransactionId NVARCHAR(120) = NULL,
    @GatewayResponseCode NVARCHAR(50) = NULL,
    @GatewayPayloadJson NVARCHAR(MAX) = NULL,
    @Status NVARCHAR(30) = 'SUCCESS', -- 'SUCCESS', 'FAILED'
    @TransactionId BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF @PaymentId IS NULL OR @PaymentId <= 0
    BEGIN
        RAISERROR('Valid PaymentId is required.', 16, 1);
        RETURN;
    END;

    IF @TransactionType IS NULL OR RTRIM(LTRIM(@TransactionType)) = ''
    BEGIN
        RAISERROR('TransactionType is required.', 16, 1);
        RETURN;
    END;

    IF @Amount IS NULL
        SET @Amount = 0.00;

    INSERT INTO dbo.PaymentTransactions (
        PaymentId,
        TransactionType,
        Amount,
        GatewayTransactionId,
        GatewayResponseCode,
        GatewayPayloadJson,
        Status,
        TransactionDate
    ) VALUES (
        @PaymentId,
        @TransactionType,
        @Amount,
        @GatewayTransactionId,
        @GatewayResponseCode,
        @GatewayPayloadJson,
        ISNULL(@Status, 'SUCCESS'),
        SYSUTCDATETIME()
    );

    SET @TransactionId = SCOPE_IDENTITY();

    SELECT 
        TransactionId,
        PaymentId,
        TransactionType,
        Amount,
        GatewayTransactionId,
        GatewayResponseCode,
        Status,
        TransactionDate
    FROM dbo.PaymentTransactions
    WHERE TransactionId = @TransactionId;
END;
GO

-- ============================================================================
-- PROCEDURE 142: dbo.usp_Payment_Refund_Create
-- Description: Processes a partial or full refund against a SUCCESS payment.
--              Enforces row-level locking (UPDLOCK, HOLDLOCK) to prevent concurrent
--              over-refunding. Records entry in PaymentRefunds and logs ledger event.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_Refund_Create
    @PaymentId BIGINT,
    @RefundAmount DECIMAL(10,2),
    @Reason NVARCHAR(255),
    @InitiatedByUserId BIGINT,
    @GatewayRefundId NVARCHAR(100) = NULL,
    @RefundId BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 1. Input Validations
    IF @PaymentId IS NULL OR @PaymentId <= 0
    BEGIN
        RAISERROR('Valid PaymentId is required.', 16, 1);
        RETURN;
    END;

    IF @RefundAmount IS NULL OR @RefundAmount <= 0.00
    BEGIN
        RAISERROR('RefundAmount must be greater than zero.', 16, 1);
        RETURN;
    END;

    IF @Reason IS NULL OR RTRIM(LTRIM(@Reason)) = ''
    BEGIN
        RAISERROR('Refund Reason is required.', 16, 1);
        RETURN;
    END;

    IF @InitiatedByUserId IS NULL OR @InitiatedByUserId <= 0
    BEGIN
        RAISERROR('InitiatedByUserId is required.', 16, 1);
        RETURN;
    END;

    -- 2. Idempotency Check: Prevent duplicate processing for same GatewayRefundId
    IF @GatewayRefundId IS NOT NULL AND RTRIM(LTRIM(@GatewayRefundId)) <> ''
    BEGIN
        SELECT TOP 1 @RefundId = RefundId
        FROM dbo.PaymentRefunds
        WHERE GatewayRefundId = @GatewayRefundId;

        IF @RefundId IS NOT NULL
        BEGIN
            EXEC dbo.usp_Payment_Refund_GetById @RefundId = @RefundId;
            RETURN;
        END;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 3. Lock target payment record to prevent concurrent refund races
        DECLARE @OriginalAmount DECIMAL(10,2);
        DECLARE @CurrentPaymentStatus NVARCHAR(30);
        DECLARE @OrderId BIGINT;

        SELECT 
            @OriginalAmount = Amount,
            @CurrentPaymentStatus = PaymentStatus,
            @OrderId = OrderId
        FROM dbo.Payments WITH (UPDLOCK, HOLDLOCK)
        WHERE PaymentId = @PaymentId;

        IF @OriginalAmount IS NULL
        BEGIN
            RAISERROR('Payment record does not exist.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- 4. Payment must be in SUCCESS status to be refundable
        IF @CurrentPaymentStatus NOT IN ('SUCCESS', 'REFUNDED')
        BEGIN
            RAISERROR('Payment must be in SUCCESS status to be refunded.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- 5. Calculate cumulative prior refunds
        DECLARE @TotalPriorRefunds DECIMAL(10,2);
        SELECT @TotalPriorRefunds = ISNULL(SUM(RefundAmount), 0.00)
        FROM dbo.PaymentRefunds WITH (UPDLOCK, HOLDLOCK)
        WHERE PaymentId = @PaymentId AND Status = 'PROCESSED';

        DECLARE @AvailableRefundableBalance DECIMAL(10,2) = @OriginalAmount - @TotalPriorRefunds;

        -- 6. Guard: Refund amount cannot exceed available balance
        IF @RefundAmount > @AvailableRefundableBalance
        BEGIN
            DECLARE @ErrMsg NVARCHAR(200) = 'Refund amount (' + CAST(@RefundAmount AS NVARCHAR(20)) + 
                ') exceeds remaining refundable balance (' + CAST(@AvailableRefundableBalance AS NVARCHAR(20)) + ').';
            RAISERROR(@ErrMsg, 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- 7. Insert into PaymentRefunds
        INSERT INTO dbo.PaymentRefunds (
            PaymentId,
            GatewayRefundId,
            RefundAmount,
            Reason,
            Status,
            InitiatedByUserId,
            ProcessedAt,
            CreatedAt
        ) VALUES (
            @PaymentId,
            @GatewayRefundId,
            @RefundAmount,
            @Reason,
            'PROCESSED',
            @InitiatedByUserId,
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        );

        SET @RefundId = SCOPE_IDENTITY();

        -- 8. Append to PaymentTransactions audit ledger
        INSERT INTO dbo.PaymentTransactions (
            PaymentId,
            TransactionType,
            Amount,
            GatewayTransactionId,
            GatewayResponseCode,
            GatewayPayloadJson,
            Status,
            TransactionDate
        ) VALUES (
            @PaymentId,
            'REFUND',
            @RefundAmount,
            @GatewayRefundId,
            'REFUND_PROCESSED',
            '{"reason":"' + REPLACE(@Reason, '"', '\"') + '"}',
            'SUCCESS',
            SYSUTCDATETIME()
        );

        -- 9. If fully refunded, transition PaymentStatus to 'REFUNDED'
        DECLARE @NewTotalRefunded DECIMAL(10,2) = @TotalPriorRefunds + @RefundAmount;
        DECLARE @NewRemainingBalance DECIMAL(10,2) = @OriginalAmount - @NewTotalRefunded;
        DECLARE @NewPaymentStatus NVARCHAR(30) = @CurrentPaymentStatus;

        IF @NewRemainingBalance <= 0.00
        BEGIN
            SET @NewPaymentStatus = 'REFUNDED';
            UPDATE dbo.Payments
            SET PaymentStatus = 'REFUNDED',
                UpdatedAt = SYSUTCDATETIME()
            WHERE PaymentId = @PaymentId;
        END;

        COMMIT TRANSACTION;

        -- 10. Return refund details and balance calculation
        SELECT 
            pr.RefundId,
            pr.PaymentId,
            pr.GatewayRefundId,
            pr.RefundAmount,
            pr.Reason,
            pr.Status,
            pr.InitiatedByUserId,
            pr.ProcessedAt,
            pr.CreatedAt,
            @OriginalAmount AS OriginalAmount,
            @NewTotalRefunded AS TotalRefunded,
            @NewRemainingBalance AS RemainingBalance,
            @NewPaymentStatus AS PaymentStatus
        FROM dbo.PaymentRefunds pr
        WHERE pr.RefundId = @RefundId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- PROCEDURE 143: dbo.usp_Payment_Refund_GetById
-- Description: Retrieves refund details by RefundId, including parent payment
--              attributes and initiator user details.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_Refund_GetById
    @RefundId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    IF @RefundId IS NULL OR @RefundId <= 0
    BEGIN
        RAISERROR('Valid RefundId is required.', 16, 1);
        RETURN;
    END;

    SELECT 
        pr.RefundId,
        pr.PaymentId,
        p.PaymentReference,
        p.OrderId,
        p.BranchId,
        p.PaymentMethod,
        p.Amount AS OriginalPaymentAmount,
        p.PaymentStatus AS CurrentPaymentStatus,
        pr.GatewayRefundId,
        pr.RefundAmount,
        pr.Reason,
        pr.Status,
        pr.InitiatedByUserId,
        u.FirstName + ' ' + u.LastName AS InitiatedByUserName,
        pr.ProcessedAt,
        pr.CreatedAt
    FROM dbo.PaymentRefunds pr
    JOIN dbo.Payments p ON pr.PaymentId = p.PaymentId
    JOIN dbo.Users u ON pr.InitiatedByUserId = u.UserId
    WHERE pr.RefundId = @RefundId;
END;
GO

-- ============================================================================
-- PROCEDURE 144: dbo.usp_Payment_GetReconciliationSummary
-- Description: Aggregates periodic payment financials, gross collections, refunds,
--              net collections, and method breakdown for financial reporting.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_GetReconciliationSummary
    @BranchId INT = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 1: High-Level Executive Summary
    SELECT 
        COUNT(1) AS TotalTransactions,
        ISNULL(SUM(CASE WHEN p.PaymentStatus IN ('SUCCESS', 'REFUNDED') THEN p.Amount ELSE 0.00 END), 0.00) AS GrossCollections,
        ISNULL((
            SELECT SUM(pr.RefundAmount)
            FROM dbo.PaymentRefunds pr
            JOIN dbo.Payments p2 ON pr.PaymentId = p2.PaymentId
            WHERE pr.Status = 'PROCESSED'
              AND (@BranchId IS NULL OR p2.BranchId = @BranchId)
              AND (@StartDate IS NULL OR pr.CreatedAt >= @StartDate)
              AND (@EndDate IS NULL OR pr.CreatedAt <= @EndDate)
        ), 0.00) AS TotalRefunds,
        (
            ISNULL(SUM(CASE WHEN p.PaymentStatus IN ('SUCCESS', 'REFUNDED') THEN p.Amount ELSE 0.00 END), 0.00) -
            ISNULL((
                SELECT SUM(pr.RefundAmount)
                FROM dbo.PaymentRefunds pr
                JOIN dbo.Payments p2 ON pr.PaymentId = p2.PaymentId
                WHERE pr.Status = 'PROCESSED'
                  AND (@BranchId IS NULL OR p2.BranchId = @BranchId)
                  AND (@StartDate IS NULL OR pr.CreatedAt >= @StartDate)
                  AND (@EndDate IS NULL OR pr.CreatedAt <= @EndDate)
            ), 0.00)
        ) AS NetCollections,
        SUM(CASE WHEN p.PaymentStatus IN ('SUCCESS', 'REFUNDED') THEN 1 ELSE 0 END) AS SuccessCount,
        SUM(CASE WHEN p.PaymentStatus = 'FAILED' THEN 1 ELSE 0 END) AS FailedCount,
        SUM(CASE WHEN p.PaymentStatus = 'PENDING' THEN 1 ELSE 0 END) AS PendingCount,
        SUM(CASE WHEN p.PaymentStatus = 'REFUNDED' THEN 1 ELSE 0 END) AS FullyRefundedCount
    FROM dbo.Payments p
    WHERE (@BranchId IS NULL OR p.BranchId = @BranchId)
      AND (@StartDate IS NULL OR p.CreatedAt >= @StartDate)
      AND (@EndDate IS NULL OR p.CreatedAt <= @EndDate);

    -- Recordset 2: Breakdown by Payment Method
    SELECT 
        p.PaymentMethod,
        COUNT(1) AS TransactionCount,
        ISNULL(SUM(CASE WHEN p.PaymentStatus IN ('SUCCESS', 'REFUNDED') THEN p.Amount ELSE 0.00 END), 0.00) AS GrossAmount,
        ISNULL((
            SELECT SUM(pr.RefundAmount)
            FROM dbo.PaymentRefunds pr
            JOIN dbo.Payments p2 ON pr.PaymentId = p2.PaymentId
            WHERE p2.PaymentMethod = p.PaymentMethod
              AND pr.Status = 'PROCESSED'
              AND (@BranchId IS NULL OR p2.BranchId = @BranchId)
              AND (@StartDate IS NULL OR pr.CreatedAt >= @StartDate)
              AND (@EndDate IS NULL OR pr.CreatedAt <= @EndDate)
        ), 0.00) AS RefundAmount,
        (
            ISNULL(SUM(CASE WHEN p.PaymentStatus IN ('SUCCESS', 'REFUNDED') THEN p.Amount ELSE 0.00 END), 0.00) -
            ISNULL((
                SELECT SUM(pr.RefundAmount)
                FROM dbo.PaymentRefunds pr
                JOIN dbo.Payments p2 ON pr.PaymentId = p2.PaymentId
                WHERE p2.PaymentMethod = p.PaymentMethod
                  AND pr.Status = 'PROCESSED'
                  AND (@BranchId IS NULL OR p2.BranchId = @BranchId)
                  AND (@StartDate IS NULL OR pr.CreatedAt >= @StartDate)
                  AND (@EndDate IS NULL OR pr.CreatedAt <= @EndDate)
            ), 0.00)
        ) AS NetAmount
    FROM dbo.Payments p
    WHERE (@BranchId IS NULL OR p.BranchId = @BranchId)
      AND (@StartDate IS NULL OR p.CreatedAt >= @StartDate)
      AND (@EndDate IS NULL OR p.CreatedAt <= @EndDate)
    GROUP BY p.PaymentMethod
    ORDER BY GrossAmount DESC;
END;
GO

-- ============================================================================
-- PROCEDURE 145: dbo.usp_Payment_GetStatus
-- Description: Retrieves lightweight payment status and settlement timestamps
--              by PaymentId or PaymentReference.
-- ============================================================================
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Payment_GetStatus
    @PaymentId BIGINT = NULL,
    @PaymentReference NVARCHAR(60) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF (@PaymentId IS NULL OR @PaymentId <= 0) AND (@PaymentReference IS NULL OR RTRIM(LTRIM(@PaymentReference)) = '')
    BEGIN
        RAISERROR('Either PaymentId or PaymentReference must be provided.', 16, 1);
        RETURN;
    END;

    SELECT 
        p.PaymentId,
        p.OrderId,
        p.BranchId,
        p.PaymentReference,
        p.PaymentMethod,
        p.Amount,
        p.GatewayOrderId,
        p.GatewayPaymentId,
        p.PaymentStatus,
        p.SettledByUserId,
        p.SettledAt,
        p.CreatedAt,
        p.UpdatedAt
    FROM dbo.Payments p
    WHERE (@PaymentId IS NOT NULL AND p.PaymentId = @PaymentId)
       OR (@PaymentId IS NULL AND p.PaymentReference = @PaymentReference);
END;
GO


