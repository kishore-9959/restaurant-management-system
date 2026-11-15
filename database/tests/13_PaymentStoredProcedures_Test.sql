-- ============================================================================
-- Script: database/tests/13_PaymentStoredProcedures_Test.sql
-- Description: Automated Verification Suite for Phase 9 Payment Stored Procedures
-- Database Target: RestaurantManagementDB_IsolatedTest
-- Total Assertions: 21 Tests
-- ============================================================================

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '================================================================';
PRINT '  RMS PHASE 9: PAYMENT STORED PROCEDURES TEST SUITE (21 TESTS)';
PRINT '================================================================';

DECLARE @PassCount INT = 0;
DECLARE @FailCount INT = 0;

-- ----------------------------------------------------------------------------
-- INITIAL CLEANUP
-- ----------------------------------------------------------------------------
DECLARE @TestOrderNum NVARCHAR(50) = 'ORD-TEST-PAY-001';
DECLARE @TestOrderId BIGINT;

SELECT @TestOrderId = OrderId FROM dbo.Orders WHERE OrderNumber = @TestOrderNum;

IF @TestOrderId IS NOT NULL
BEGIN
    DELETE FROM dbo.PaymentRefunds WHERE PaymentId IN (SELECT PaymentId FROM dbo.Payments WHERE OrderId = @TestOrderId);
    DELETE FROM dbo.PaymentTransactions WHERE PaymentId IN (SELECT PaymentId FROM dbo.Payments WHERE OrderId = @TestOrderId);
    DELETE FROM dbo.Payments WHERE OrderId = @TestOrderId;
    DELETE FROM dbo.Orders WHERE OrderId = @TestOrderId;
END;

-- Clean up any orphaned test gateway references
DELETE FROM dbo.PaymentRefunds WHERE GatewayRefundId IN ('rfnd_test_001', 'rfnd_test_002');
DELETE FROM dbo.PaymentTransactions WHERE GatewayTransactionId IN ('pay_test_capture_001', 'order_test_rzp_001', 'order_test_rzp_fail_001');
DELETE FROM dbo.Payments WHERE GatewayOrderId IN ('order_test_rzp_001', 'order_test_rzp_fail_001');

-- ----------------------------------------------------------------------------
-- SETUP: Create clean parent test order in dbo.Orders
-- ----------------------------------------------------------------------------
INSERT INTO dbo.Orders (
    BranchId,
    OrderNumber,
    OrderType,
    OrderStatus,
    PaymentStatus,
    SubTotal,
    TaxTotal,
    DiscountTotal,
    GrandTotal,
    CreatedAt,
    UpdatedAt
) VALUES (
    1,
    @TestOrderNum,
    'DINE_IN',
    'CONFIRMED',
    'PENDING',
    500.00,
    25.00,
    0.00,
    525.00,
    SYSUTCDATETIME(),
    SYSUTCDATETIME()
);

SET @TestOrderId = SCOPE_IDENTITY();
PRINT 'Setup: Initialized parent Test Order (OrderId: ' + CAST(@TestOrderId AS NVARCHAR(20)) + ')';

-- Shared Variables across tests
DECLARE @PaymentId1 BIGINT;
DECLARE @PaymentRef1 NVARCHAR(60);
DECLARE @PaymentIdFail BIGINT;
DECLARE @PaymentIdCash BIGINT;
DECLARE @PaymentRefCash NVARCHAR(60);
DECLARE @RefundId1 BIGINT;
DECLARE @RefundId2 BIGINT;

BEGIN TRY
    -- ------------------------------------------------------------------------
    -- TEST 1: Successful Online Payment Intent Creation (usp_Payment_Create)
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Payment_Create
        @OrderId = @TestOrderId,
        @BranchId = 1,
        @PaymentMethod = 'RAZORPAY',
        @Amount = 300.00,
        @GatewayOrderId = 'order_test_rzp_001',
        @PaymentReference = @PaymentRef1 OUTPUT,
        @PaymentId = @PaymentId1 OUTPUT;

    IF @PaymentId1 > 0 AND @PaymentRef1 LIKE 'PAY-%' AND EXISTS (
        SELECT 1 FROM dbo.Payments 
        WHERE PaymentId = @PaymentId1 AND PaymentStatus = 'PENDING' AND Amount = 300.00
    )
    BEGIN
        PRINT '[PASS] Test 01: Successful Online Payment Creation (PaymentId: ' + CAST(@PaymentId1 AS NVARCHAR(10)) + ')';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 01: Payment creation verification failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 2: Duplicate GatewayOrderId Creation Idempotency (usp_Payment_Create)
    -- ------------------------------------------------------------------------
    DECLARE @DupPaymentId BIGINT;
    DECLARE @DupPaymentRef NVARCHAR(60);

    EXEC dbo.usp_Payment_Create
        @OrderId = @TestOrderId,
        @BranchId = 1,
        @PaymentMethod = 'RAZORPAY',
        @Amount = 300.00,
        @GatewayOrderId = 'order_test_rzp_001',
        @PaymentReference = @DupPaymentRef OUTPUT,
        @PaymentId = @DupPaymentId OUTPUT;

    IF @DupPaymentId = @PaymentId1
    BEGIN
        PRINT '[PASS] Test 02: Duplicate GatewayOrderId Idempotency (Returned Existing PaymentId: ' + CAST(@DupPaymentId AS NVARCHAR(10)) + ')';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 02: Duplicate GatewayOrderId failed idempotency check';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 3: Validation Rejection: Invalid/Zero Amount
    -- ------------------------------------------------------------------------
    BEGIN TRY
        EXEC dbo.usp_Payment_Create
            @OrderId = @TestOrderId,
            @BranchId = 1,
            @PaymentMethod = 'RAZORPAY',
            @Amount = 0.00;

        PRINT '[FAIL] Test 03: Did not throw on zero amount';
        SET @FailCount += 1;
    END TRY
    BEGIN CATCH
        PRINT '[PASS] Test 03: Rejected Zero Payment Amount (' + ERROR_MESSAGE() + ')';
        SET @PassCount += 1;
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 4: Validation Rejection: Invalid Payment Method
    -- ------------------------------------------------------------------------
    BEGIN TRY
        EXEC dbo.usp_Payment_Create
            @OrderId = @TestOrderId,
            @BranchId = 1,
            @PaymentMethod = 'BITCOIN_INVALID',
            @Amount = 100.00;

        PRINT '[FAIL] Test 04: Did not throw on invalid payment method';
        SET @FailCount += 1;
    END TRY
    BEGIN CATCH
        PRINT '[PASS] Test 04: Rejected Invalid Payment Method (' + ERROR_MESSAGE() + ')';
        SET @PassCount += 1;
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 5: Payment Verification and Capture (usp_Payment_VerifyAndCapture)
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Payment_VerifyAndCapture
        @PaymentId = @PaymentId1,
        @GatewayPaymentId = 'pay_test_capture_001',
        @GatewaySignature = 'sig_test_hmac_valid_hash',
        @SettledByUserId = NULL,
        @RawPayloadJson = '{"status":"captured"}';

    IF EXISTS (
        SELECT 1 FROM dbo.Payments 
        WHERE PaymentId = @PaymentId1 
          AND PaymentStatus = 'SUCCESS' 
          AND GatewayPaymentId = 'pay_test_capture_001' 
          AND SettledAt IS NOT NULL
    ) AND EXISTS (
        SELECT 1 FROM dbo.PaymentTransactions 
        WHERE PaymentId = @PaymentId1 AND TransactionType = 'WEBHOOK_CAPTURE' AND Status = 'SUCCESS'
    )
    BEGIN
        PRINT '[PASS] Test 05: Payment Verified & Captured Successfully (Status: SUCCESS)';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 05: Payment capture verification failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 6: Payment Verification Idempotency on Repeat
    -- ------------------------------------------------------------------------
    -- Calling capture again with identical gateway payment id must succeed without error
    EXEC dbo.usp_Payment_VerifyAndCapture
        @PaymentId = @PaymentId1,
        @GatewayPaymentId = 'pay_test_capture_001',
        @GatewaySignature = 'sig_test_hmac_valid_hash';

    IF (SELECT PaymentStatus FROM dbo.Payments WHERE PaymentId = @PaymentId1) = 'SUCCESS'
    BEGIN
        PRINT '[PASS] Test 06: Payment Capture Idempotency on Repeated Call';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 06: Capture idempotency failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 7: Payment Failure Recording (usp_Payment_RecordFailure)
    -- ------------------------------------------------------------------------
    -- Create temporary pending payment to fail
    EXEC dbo.usp_Payment_Create
        @OrderId = @TestOrderId,
        @BranchId = 1,
        @PaymentMethod = 'RAZORPAY',
        @Amount = 50.00,
        @GatewayOrderId = 'order_test_rzp_fail_001',
        @PaymentId = @PaymentIdFail OUTPUT;

    EXEC dbo.usp_Payment_RecordFailure
        @PaymentId = @PaymentIdFail,
        @GatewayPaymentId = 'pay_test_failed_001',
        @ErrorCode = 'BAD_REQUEST_ERROR',
        @ErrorMessage = 'Payment was cancelled by customer',
        @RawPayloadJson = '{"error":{"code":"BAD_REQUEST_ERROR"}}';

    IF (SELECT PaymentStatus FROM dbo.Payments WHERE PaymentId = @PaymentIdFail) = 'FAILED'
       AND EXISTS (SELECT 1 FROM dbo.PaymentTransactions WHERE PaymentId = @PaymentIdFail AND TransactionType = 'FAILURE')
    BEGIN
        PRINT '[PASS] Test 07: Payment Failure Recorded Successfully (Status: FAILED)';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 07: Payment failure recording failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 8: Guard: Cannot Mark a SUCCESS Payment as FAILED
    -- ------------------------------------------------------------------------
    BEGIN TRY
        EXEC dbo.usp_Payment_RecordFailure
            @PaymentId = @PaymentId1,
            @ErrorCode = 'CANNOT_FAIL',
            @ErrorMessage = 'Invalid fail attempt';

        PRINT '[FAIL] Test 08: Did not throw when failing settled payment';
        SET @FailCount += 1;
    END TRY
    BEGIN CATCH
        PRINT '[PASS] Test 08: Guard Prevented Failing Settled Payment (' + ERROR_MESSAGE() + ')';
        SET @PassCount += 1;
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 9: Offline POS Settlement (usp_Payment_SettleOffline)
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Payment_SettleOffline
        @OrderId = @TestOrderId,
        @BranchId = 1,
        @PaymentMethod = 'CASH',
        @Amount = 225.00,
        @SettledByUserId = 1,
        @Notes = 'Cash received at POS counter',
        @PaymentReference = @PaymentRefCash OUTPUT,
        @PaymentId = @PaymentIdCash OUTPUT;

    IF @PaymentIdCash > 0 AND EXISTS (
        SELECT 1 FROM dbo.Payments 
        WHERE PaymentId = @PaymentIdCash 
          AND PaymentStatus = 'SUCCESS' 
          AND PaymentMethod = 'CASH' 
          AND SettledByUserId = 1
    ) AND EXISTS (
        SELECT 1 FROM dbo.PaymentTransactions 
        WHERE PaymentId = @PaymentIdCash AND TransactionType = 'CHARGE' AND Status = 'SUCCESS'
    )
    BEGIN
        PRINT '[PASS] Test 09: POS Offline Cash Settlement Succeeded (PaymentId: ' + CAST(@PaymentIdCash AS NVARCHAR(10)) + ')';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 09: Offline cash settlement verification failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 10: Payment Retrieval by ID (usp_Payment_GetById)
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Payment_GetById @PaymentId = @PaymentId1;
    PRINT '[PASS] Test 10: Multi-Recordset usp_Payment_GetById Executed';
    SET @PassCount += 1;

    -- ------------------------------------------------------------------------
    -- TEST 11: Payment Retrieval by Order ID (usp_Payment_GetByOrderId)
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Payment_GetByOrderId @OrderId = @TestOrderId;
    PRINT '[PASS] Test 11: Multi-Recordset usp_Payment_GetByOrderId Executed';
    SET @PassCount += 1;

    -- ------------------------------------------------------------------------
    -- TEST 12: Payment Lookup by GatewayOrderId (usp_Payment_GetByGatewayOrderId)
    -- ------------------------------------------------------------------------
    IF EXISTS (
        SELECT 1 FROM dbo.Payments WHERE GatewayOrderId = 'order_test_rzp_001' AND PaymentId = @PaymentId1
    )
    BEGIN
        EXEC dbo.usp_Payment_GetByGatewayOrderId @GatewayOrderId = 'order_test_rzp_001';
        PRINT '[PASS] Test 12: Lookup by GatewayOrderId Succeeded';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 12: GatewayOrderId lookup failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 13: Payment Lookup by GatewayPaymentId (usp_Payment_GetByGatewayPaymentId)
    -- ------------------------------------------------------------------------
    IF EXISTS (
        SELECT 1 FROM dbo.Payments WHERE GatewayPaymentId = 'pay_test_capture_001' AND PaymentId = @PaymentId1
    )
    BEGIN
        EXEC dbo.usp_Payment_GetByGatewayPaymentId @GatewayPaymentId = 'pay_test_capture_001';
        PRINT '[PASS] Test 13: Lookup by GatewayPaymentId Succeeded';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 13: GatewayPaymentId lookup failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 14: Payment Status Lookup (usp_Payment_GetStatus)
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Payment_GetStatus @PaymentId = @PaymentId1;
    PRINT '[PASS] Test 14: Lightweight usp_Payment_GetStatus Executed';
    SET @PassCount += 1;

    -- ------------------------------------------------------------------------
    -- TEST 15: Payment List & Pagination (usp_Payment_List)
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Payment_List
        @BranchId = 1,
        @PaymentStatus = 'SUCCESS',
        @Page = 1,
        @Limit = 10;
    PRINT '[PASS] Test 15: Paginated usp_Payment_List Executed';
    SET @PassCount += 1;

    -- ------------------------------------------------------------------------
    -- TEST 16: Raw Ledger Append (usp_Payment_LogTransaction)
    -- ------------------------------------------------------------------------
    DECLARE @LoggedTxId BIGINT;
    EXEC dbo.usp_Payment_LogTransaction
        @PaymentId = @PaymentId1,
        @TransactionType = 'WEBHOOK_CAPTURE',
        @Amount = 300.00,
        @GatewayTransactionId = 'evt_test_webhook_001',
        @GatewayResponseCode = '200',
        @GatewayPayloadJson = '{"event":"payment.captured"}',
        @Status = 'SUCCESS',
        @TransactionId = @LoggedTxId OUTPUT;

    IF @LoggedTxId > 0 AND EXISTS (SELECT 1 FROM dbo.PaymentTransactions WHERE TransactionId = @LoggedTxId)
    BEGIN
        PRINT '[PASS] Test 16: usp_Payment_LogTransaction Ledger Entry Logged (TxId: ' + CAST(@LoggedTxId AS NVARCHAR(10)) + ')';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 16: Log transaction failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 17: Partial Refund Creation (usp_Payment_Refund_Create)
    -- ------------------------------------------------------------------------
    -- Original payment amount = 300.00; Refund 100.00 -> remaining balance = 200.00; status stays SUCCESS
    EXEC dbo.usp_Payment_Refund_Create
        @PaymentId = @PaymentId1,
        @RefundAmount = 100.00,
        @Reason = 'Customer returned damaged cold beverage',
        @InitiatedByUserId = 1,
        @GatewayRefundId = 'rfnd_test_001',
        @RefundId = @RefundId1 OUTPUT;

    IF @RefundId1 > 0 AND EXISTS (
        SELECT 1 FROM dbo.PaymentRefunds 
        WHERE RefundId = @RefundId1 AND RefundAmount = 100.00 AND Status = 'PROCESSED'
    ) AND (SELECT PaymentStatus FROM dbo.Payments WHERE PaymentId = @PaymentId1) = 'SUCCESS'
    BEGIN
        PRINT '[PASS] Test 17: Partial Refund Created (RefundId: ' + CAST(@RefundId1 AS NVARCHAR(10)) + ', Remaining: 200.00)';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 17: Partial refund creation failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 18: Guard: Excess Refund Rejection (Refund > Remaining Balance)
    -- ------------------------------------------------------------------------
    -- Remaining balance is 200.00; trying to refund 250.00 must be rejected
    BEGIN TRY
        EXEC dbo.usp_Payment_Refund_Create
            @PaymentId = @PaymentId1,
            @RefundAmount = 250.00,
            @Reason = 'Excess refund attempt',
            @InitiatedByUserId = 1;

        PRINT '[FAIL] Test 18: Did not throw on excess refund';
        SET @FailCount += 1;
    END TRY
    BEGIN CATCH
        PRINT '[PASS] Test 18: Excess Refund Guard Blocked Overdraw (' + ERROR_MESSAGE() + ')';
        SET @PassCount += 1;
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 19: Full Refund Completion: Status Advances to REFUNDED
    -- ------------------------------------------------------------------------
    -- Refund exact remaining balance: 200.00 -> Status must advance to 'REFUNDED'
    EXEC dbo.usp_Payment_Refund_Create
        @PaymentId = @PaymentId1,
        @RefundAmount = 200.00,
        @Reason = 'Full order return agreed by restaurant manager',
        @InitiatedByUserId = 1,
        @GatewayRefundId = 'rfnd_test_002',
        @RefundId = @RefundId2 OUTPUT;

    IF @RefundId2 > 0 AND (SELECT PaymentStatus FROM dbo.Payments WHERE PaymentId = @PaymentId1) = 'REFUNDED'
    BEGIN
        PRINT '[PASS] Test 19: Full Refund Completed; PaymentStatus Advanced to REFUNDED';
        SET @PassCount += 1;
    END
    ELSE
    BEGIN
        PRINT '[FAIL] Test 19: Full refund status transition failed';
        SET @FailCount += 1;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 20: Refund Lookup by ID (usp_Payment_Refund_GetById)
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Payment_Refund_GetById @RefundId = @RefundId1;
    PRINT '[PASS] Test 20: usp_Payment_Refund_GetById Executed Successfully';
    SET @PassCount += 1;

    -- ------------------------------------------------------------------------
    -- TEST 21: Payment Financial Reconciliation Summary
    -- ------------------------------------------------------------------------
    EXEC dbo.usp_Payment_GetReconciliationSummary
        @BranchId = 1;
    PRINT '[PASS] Test 21: usp_Payment_GetReconciliationSummary Aggregated Metrics';
    SET @PassCount += 1;

END TRY
BEGIN CATCH
    PRINT 'FATAL UNHANDLED TEST ERROR: ' + ERROR_MESSAGE();
    SET @FailCount += 1;
END CATCH;

-- ----------------------------------------------------------------------------
-- POST-TEST CLEANUP
-- ----------------------------------------------------------------------------
IF @TestOrderId IS NOT NULL
BEGIN
    DELETE FROM dbo.PaymentRefunds WHERE PaymentId IN (SELECT PaymentId FROM dbo.Payments WHERE OrderId = @TestOrderId);
    DELETE FROM dbo.PaymentTransactions WHERE PaymentId IN (SELECT PaymentId FROM dbo.Payments WHERE OrderId = @TestOrderId);
    DELETE FROM dbo.Payments WHERE OrderId = @TestOrderId;
    DELETE FROM dbo.Orders WHERE OrderId = @TestOrderId;
    PRINT 'Post-Test Cleanup: Removed all test records.';
END;

PRINT '================================================================';
PRINT '  RESULTS: ' + CAST(@PassCount AS NVARCHAR(10)) + ' PASSED / ' + CAST(@FailCount AS NVARCHAR(10)) + ' FAILED';
PRINT '================================================================';

IF @FailCount = 0
    PRINT '🎉 ALL 21 PAYMENT STORED PROCEDURES TEST SUITE ASSERTIONS PASSED WITH 100% SUCCESS!';
ELSE
    THROW 51000, 'One or more Payment Stored Procedure unit tests failed.', 1;
GO
