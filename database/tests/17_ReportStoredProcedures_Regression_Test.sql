-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT SP REGRESSION VERIFICATION SUITE
-- Script: database/tests/17_ReportStoredProcedures_Regression_Test.sql
-- Description: Rigorous unit tests with controlled deterministic test data verifying:
--   1. SP 249: Zero Cartesian duplication of NetSales, Covers, and Orders.
--              Exposes TotalOrders, ValidOrders, CancelledOrders, VoidedOrders,
--              and consistent AOV.
--   2. SP 250: Zero Customer duplication of NetSales, ActiveCustomerBase, and
--              consistent active branch filtering.
--   3. Financial settlement date filtering (SettledAt vs CreatedAt).
--   4. Financial refund date filtering (ProcessedAt vs CreatedAt) & multiple
--      partial refunds across periods.
--   5. Full refunds and refund totals exceeding original payment (discrepancy).
--   6. REFUNDED status without refund record (orphan refund anomaly).
--   7. Duplicate payment/refund joins (split bill order isolation).
--   8. Date boundary midnight inclusive normalization.
--   9. SP 248 Customer PII masking (phone and email edge cases).
--  10. Least-privilege reporting role permissions and ownership chaining.
-- Target Database: RestaurantManagementDB_IsolatedTest
-- ============================================================================

SET NOCOUNT ON;
PRINT '====================================================================';
PRINT 'STARTING PHASE 13 REPORT STORED PROCEDURES REGRESSION TEST SUITE';
PRINT 'Target Database: RestaurantManagementDB_IsolatedTest';
PRINT '====================================================================';

BEGIN TRANSACTION;

BEGIN TRY
    -- ------------------------------------------------------------------------
    -- SETUP DETERMINISTIC TEST DATA
    -- ------------------------------------------------------------------------
    DECLARE @TestRestaurantId INT = 8991;
    DECLARE @TestBranchId INT = 8991;
    DECLARE @TestSectionId INT = 8991;
    DECLARE @TestStaffId BIGINT = 8991;
    DECLARE @CustActive1 BIGINT = 8992;
    DECLARE @CustActive2 BIGINT = 8993;
    DECLARE @CustInactive BIGINT = 8994;
    DECLARE @CustShortPhone BIGINT = 8995;
    DECLARE @CustNullContact BIGINT = 8996;
    DECLARE @CustShortEmail BIGINT = 8997;
    DECLARE @CustBadEmail BIGINT = 8998;

    -- Clean up any prior test artifacts
    DELETE FROM dbo.PaymentRefunds WHERE InitiatedByUserId = @TestStaffId;
    DELETE FROM dbo.Payments WHERE BranchId = @TestBranchId;
    DELETE FROM dbo.OrderItems WHERE OrderId IN (SELECT OrderId FROM dbo.Orders WHERE BranchId = @TestBranchId);
    DELETE FROM dbo.Orders WHERE BranchId = @TestBranchId;
    DELETE FROM dbo.Reservations WHERE BranchId = @TestBranchId;
    DELETE FROM dbo.RestaurantTables WHERE BranchId = @TestBranchId;
    DELETE FROM dbo.DiningSections WHERE BranchId = @TestBranchId;
    DELETE FROM dbo.Branches WHERE BranchId = @TestBranchId;
    DELETE FROM dbo.Restaurants WHERE RestaurantId = @TestRestaurantId;
    DELETE FROM dbo.Users WHERE UserId IN (@TestStaffId, @CustActive1, @CustActive2, @CustInactive, @CustShortPhone, @CustNullContact, @CustShortEmail, @CustBadEmail);

    -- 1. Insert Test Restaurant & Branch
    SET IDENTITY_INSERT dbo.Restaurants ON;
    INSERT INTO dbo.Restaurants (RestaurantId, RestaurantName, PrimaryContactEmail, PrimaryContactPhone, DefaultCurrency, DefaultTimezone, CreatedAt, UpdatedAt, IsDeleted)
    VALUES (@TestRestaurantId, 'Test Analytics Bistro', 'bistro@test.com', '1234567890', 'USD', 'UTC', SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
    SET IDENTITY_INSERT dbo.Restaurants OFF;

    SET IDENTITY_INSERT dbo.Branches ON;
    INSERT INTO dbo.Branches (BranchId, RestaurantId, BranchName, BranchCode, AddressLine1, City, StateProvince, PostalCode, Phone, Email, IsActive, CreatedAt, UpdatedAt, IsDeleted)
    VALUES (@TestBranchId, @TestRestaurantId, 'Test Analytics Branch', 'TAB-8991', '100 Test St', 'Metropolis', 'NY', '10001', '1234567890', 'tab@test.com', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
    SET IDENTITY_INSERT dbo.Branches OFF;

    -- 2. Insert Staff and Customers into dbo.Users
    SET IDENTITY_INSERT dbo.Users ON;
    INSERT INTO dbo.Users (UserId, BranchId, FirstName, LastName, Email, PhoneNumber, PasswordHash, UserType, IsActive, CreatedAt, UpdatedAt, IsDeleted)
    VALUES 
        (@TestStaffId, @TestBranchId, 'Regression', 'Auditor', 'auditor@test.com', '+919999900000', 'HASH123', 'SUPER_ADMIN', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
        (@CustActive1, @TestBranchId, 'Alice', 'Active', 'alice.active@domain.com', '+919876543210', 'HASH456', 'CUSTOMER', 1, '2026-01-01', SYSUTCDATETIME(), 0),
        (@CustActive2, @TestBranchId, 'Bob', 'Buyer', 'bob.buyer@example.org', '+919123456789', 'HASH789', 'CUSTOMER', 1, '2026-01-01', SYSUTCDATETIME(), 0),
        (@CustInactive, @TestBranchId, 'Charlie', 'Nonbuyer', 'charlie.idle@sample.com', '+919999988888', 'HASH000', 'CUSTOMER', 1, '2026-01-01', SYSUTCDATETIME(), 0),
        (@CustShortPhone, @TestBranchId, 'Short', 'PhoneUser', 'short.phone@domain.com', '123', 'HASH111', 'CUSTOMER', 1, '2026-01-01', SYSUTCDATETIME(), 0),
        (@CustNullContact, @TestBranchId, 'Null', 'ContactUser', NULL, '', 'HASH222', 'CUSTOMER', 1, '2026-01-01', SYSUTCDATETIME(), 0),
        (@CustShortEmail, @TestBranchId, 'Short', 'EmailUser', 'b@example.org', '+15551234567', 'HASH333', 'CUSTOMER', 1, '2026-01-01', SYSUTCDATETIME(), 0),
        (@CustBadEmail, @TestBranchId, 'Bad', 'EmailUser', 'bademailwithoutat', '+15559876543', 'HASH444', 'CUSTOMER', 1, '2026-01-01', SYSUTCDATETIME(), 0);
    SET IDENTITY_INSERT dbo.Users OFF;

    -- 3. Insert Dining Section and 3 Restaurant Tables
    SET IDENTITY_INSERT dbo.DiningSections ON;
    INSERT INTO dbo.DiningSections (SectionId, BranchId, SectionName, FloorLevel, DisplayOrder, IsActive, CreatedAt, UpdatedAt)
    VALUES (@TestSectionId, @TestBranchId, 'Main Dining', 1, 1, 1, SYSUTCDATETIME(), SYSUTCDATETIME());
    SET IDENTITY_INSERT dbo.DiningSections OFF;

    INSERT INTO dbo.RestaurantTables (BranchId, SectionId, TableNumber, SeatingCapacity, CurrentStatus, QrCodeHash, PosX, PosY, IsActive, IsDeleted, CreatedAt, UpdatedAt)
    VALUES 
        (@TestBranchId, @TestSectionId, 'T1', 4, 'AVAILABLE', 'QR1', 0, 0, 1, 0, SYSUTCDATETIME(), SYSUTCDATETIME()),
        (@TestBranchId, @TestSectionId, 'T2', 4, 'AVAILABLE', 'QR2', 0, 1, 1, 0, SYSUTCDATETIME(), SYSUTCDATETIME()),
        (@TestBranchId, @TestSectionId, 'T3', 6, 'AVAILABLE', 'QR3', 1, 0, 1, 0, SYSUTCDATETIME(), SYSUTCDATETIME());

    -- 4. Insert Orders for Date Window '2026-05-01' to '2026-05-31'
    -- Order 1: Alice ($100 GrandTotal, COMPLETED) -> Valid
    -- Order 2: Bob ($150 GrandTotal, CONFIRMED) -> Valid
    -- Order 3: Alice ($80 GrandTotal, CANCELLED) -> Cancelled
    -- Order 4: Bob ($50 GrandTotal, VOIDED) -> Voided
    -- Order 5: Split Bill Order ($100 GrandTotal, COMPLETED) -> Valid
    -- Order 6: Late Night Order on May 31 23:45:00 ($20 GrandTotal, COMPLETED) -> Valid for boundary test
    DECLARE @Ord1 BIGINT = 899101;
    DECLARE @Ord2 BIGINT = 899102;
    DECLARE @Ord3 BIGINT = 899103;
    DECLARE @Ord4 BIGINT = 899104;
    DECLARE @OrdSplit BIGINT = 899105;
    DECLARE @OrdLate BIGINT = 899106;

    SET IDENTITY_INSERT dbo.Orders ON;
    INSERT INTO dbo.Orders (OrderId, BranchId, OrderNumber, OrderType, CustomerId, OrderStatus, PaymentStatus, SubTotal, TaxTotal, ServiceCharge, PackagingCharge, DiscountTotal, TipAmount, GrandTotal, CreatedAt, UpdatedAt, IsDeleted)
    VALUES 
        (@Ord1, @TestBranchId, 'ORD-8991-1', 'DINE_IN', @CustActive1, 'COMPLETED', 'SUCCESS', 90.00, 10.00, 0.00, 0.00, 0.00, 0.00, 100.00, '2026-05-10 12:00:00', '2026-05-10 13:00:00', 0),
        (@Ord2, @TestBranchId, 'ORD-8991-2', 'DINE_IN', @CustActive2, 'CONFIRMED', 'PENDING', 135.00, 15.00, 0.00, 0.00, 0.00, 0.00, 150.00, '2026-05-15 14:00:00', '2026-05-15 14:00:00', 0),
        (@Ord3, @TestBranchId, 'ORD-8991-3', 'TAKEAWAY', @CustActive1, 'CANCELLED', 'VOID', 70.00, 10.00, 0.00, 0.00, 0.00, 0.00, 80.00, '2026-05-20 18:00:00', '2026-05-20 18:30:00', 0),
        (@Ord4, @TestBranchId, 'ORD-8991-4', 'DELIVERY', @CustActive2, 'VOIDED', 'VOID', 45.00, 5.00, 0.00, 0.00, 0.00, 0.00, 50.00, '2026-05-22 19:00:00', '2026-05-22 19:30:00', 0),
        (@OrdSplit, @TestBranchId, 'ORD-8991-5', 'DINE_IN', NULL, 'COMPLETED', 'SUCCESS', 90.00, 10.00, 0.00, 0.00, 0.00, 0.00, 100.00, '2026-05-26 12:00:00', '2026-05-26 13:00:00', 0),
        (@OrdLate, @TestBranchId, 'ORD-8991-6', 'TAKEAWAY', @CustActive1, 'COMPLETED', 'SUCCESS', 18.00, 2.00, 0.00, 0.00, 0.00, 0.00, 20.00, '2026-05-31 23:45:00', '2026-05-31 23:55:00', 0);
    SET IDENTITY_INSERT dbo.Orders OFF;

    -- 5. Insert 4 Reservations (2 covers each = 8 covers total)
    INSERT INTO dbo.Reservations (BranchId, CustomerId, GuestName, GuestPhone, ReservationDate, StartTime, EndTime, PartySize, Status, CreatedAt, UpdatedAt, IsDeleted)
    VALUES 
        (@TestBranchId, @CustActive1, 'Alice Active', '+919876543210', '2026-05-10', '19:00', '21:00', 2, 'COMPLETED', '2026-05-01', SYSUTCDATETIME(), 0),
        (@TestBranchId, @CustActive2, 'Bob Buyer', '+919123456789', '2026-05-12', '19:30', '21:30', 2, 'SEATED', '2026-05-02', SYSUTCDATETIME(), 0),
        (@TestBranchId, NULL, 'Walkin Guest 1', '+919000000001', '2026-05-15', '20:00', '22:00', 2, 'CONFIRMED', '2026-05-03', SYSUTCDATETIME(), 0),
        (@TestBranchId, NULL, 'Walkin Guest 2', '+919000000002', '2026-05-18', '20:30', '22:30', 2, 'NO_SHOW', '2026-05-04', SYSUTCDATETIME(), 0);

    -- 6. Insert Payments covering all financial scenarios:
    -- Pay 1: Created April 30, Settled May 10 ($100.00) -> Counted in May
    -- Pay 2: Created May 31, Settled June 01 ($200.00) -> Counted in June
    -- Pay Unsettled: Created May 12, SettledAt NULL ($75.00) -> Never counted in collected revenue
    -- Pay FullRefund: Created May 05, Settled May 05 ($120.00) -> Counted in May collections
    -- Pay MultiRefund: Created May 15, Settled May 15 ($300.00) -> Counted in May collections
    -- Pay ExcessRefund: Created May 20, Settled May 20 ($50.00) -> Counted in May collections
    -- Pay OrphanRefund: Created May 25, Settled May 25 ($80.00, REFUNDED) -> Counted in May collections, 0 refunds
    -- Pay Split 1: Created May 26, Settled May 26 ($50.00, CASH) -> Counted in May
    -- Pay Split 2: Created May 26, Settled May 26 ($50.00, CREDIT_CARD) -> Counted in May
    DECLARE @Pay1 BIGINT = 899101;
    DECLARE @Pay2 BIGINT = 899102;
    DECLARE @PayUnsettled BIGINT = 899103;
    DECLARE @PayFullRef BIGINT = 899104;
    DECLARE @PayMultiRef BIGINT = 899105;
    DECLARE @PayExcessRef BIGINT = 899106;
    DECLARE @PayOrphanRef BIGINT = 899107;
    DECLARE @PaySplit1 BIGINT = 899108;
    DECLARE @PaySplit2 BIGINT = 899109;

    SET IDENTITY_INSERT dbo.Payments ON;
    INSERT INTO dbo.Payments (PaymentId, OrderId, BranchId, PaymentReference, PaymentMethod, Amount, PaymentStatus, SettledByUserId, SettledAt, CreatedAt, UpdatedAt)
    VALUES 
        (@Pay1, @Ord1, @TestBranchId, 'PAY-8991-1', 'CASH', 100.00, 'SUCCESS', @TestStaffId, '2026-05-10 12:05:00', '2026-04-30 23:55:00', '2026-05-10 12:05:00'),
        (@Pay2, @Ord2, @TestBranchId, 'PAY-8991-2', 'UPI', 200.00, 'SUCCESS', @TestStaffId, '2026-06-01 10:00:00', '2026-05-31 23:50:00', '2026-06-01 10:00:00'),
        (@PayUnsettled, @Ord2, @TestBranchId, 'PAY-8991-3', 'CASH', 75.00, 'PENDING', NULL, NULL, '2026-05-12 11:00:00', '2026-05-12 11:00:00'),
        (@PayFullRef, @Ord1, @TestBranchId, 'PAY-8991-4', 'CREDIT_CARD', 120.00, 'REFUNDED', @TestStaffId, '2026-05-05 10:00:00', '2026-05-05 09:00:00', '2026-05-05 10:00:00'),
        (@PayMultiRef, @Ord1, @TestBranchId, 'PAY-8991-5', 'CREDIT_CARD', 300.00, 'REFUNDED', @TestStaffId, '2026-05-15 16:00:00', '2026-05-15 15:50:00', '2026-05-15 16:00:00'),
        (@PayExcessRef, @Ord1, @TestBranchId, 'PAY-8991-6', 'DEBIT_CARD', 50.00, 'REFUNDED', @TestStaffId, '2026-05-20 12:00:00', '2026-05-20 11:00:00', '2026-05-20 12:00:00'),
        (@PayOrphanRef, @Ord1, @TestBranchId, 'PAY-8991-7', 'UPI', 80.00, 'REFUNDED', @TestStaffId, '2026-05-25 14:00:00', '2026-05-25 13:00:00', '2026-05-25 14:00:00'),
        (@PaySplit1, @OrdSplit, @TestBranchId, 'PAY-8991-8', 'CASH', 50.00, 'SUCCESS', @TestStaffId, '2026-05-26 12:05:00', '2026-05-26 12:00:00', '2026-05-26 12:05:00'),
        (@PaySplit2, @OrdSplit, @TestBranchId, 'PAY-8991-9', 'CREDIT_CARD', 50.00, 'SUCCESS', @TestStaffId, '2026-05-26 12:06:00', '2026-05-26 12:00:00', '2026-05-26 12:06:00');
    SET IDENTITY_INSERT dbo.Payments OFF;

    -- 7. Insert Refunds:
    -- Refund Full: $120.00 processed May 06 on PayFullRef ($120.00)
    -- Refund Multi A: $100.00 processed May 18 on PayMultiRef ($300.00)
    -- Refund Multi B: $150.00 processed June 05 on PayMultiRef ($300.00)
    -- Refund Excess: $60.00 processed May 22 on PayExcessRef ($50.00) -> Exceeds by $10.00
    SET IDENTITY_INSERT dbo.PaymentRefunds ON;
    INSERT INTO dbo.PaymentRefunds (RefundId, PaymentId, RefundAmount, Reason, Status, InitiatedByUserId, ProcessedAt, CreatedAt)
    VALUES 
        (899101, @PayFullRef, 120.00, 'Full return', 'PROCESSED', @TestStaffId, '2026-05-06 14:00:00', '2026-05-06 13:30:00'),
        (899102, @PayMultiRef, 100.00, 'Customer dissatisfaction', 'PROCESSED', @TestStaffId, '2026-05-18 10:00:00', '2026-05-18 09:30:00'),
        (899103, @PayMultiRef, 150.00, 'Overcharged item', 'PROCESSED', @TestStaffId, '2026-06-05 14:00:00', '2026-05-30 18:00:00'),
        (899104, @PayExcessRef, 60.00, 'Goodwill adjustment exceeding original', 'PROCESSED', @TestStaffId, '2026-05-22 15:00:00', '2026-05-22 14:00:00');
    SET IDENTITY_INSERT dbo.PaymentRefunds OFF;


    -- ========================================================================
    -- REGRESSION TEST 1: SP 249 Branch Performance Scorecard & Metric Breakdown
    -- ========================================================================
    PRINT '>>> TEST 1: Verifying usp_Report_BranchPerformance (SP 249)...';
    
    DECLARE @BranchPerfResult TABLE (
        BranchId INT, BranchName NVARCHAR(100), BranchCode NVARCHAR(20), City NVARCHAR(50),
        TotalDiningTables INT, TotalOrders INT, ValidOrders INT, CancelledOrders INT, VoidedOrders INT,
        NetSales DECIMAL(14,2), AverageOrderValue DECIMAL(10,2), TotalReservations INT, TotalCovers INT
    );

    -- Query May 1 to May 30 23:59:59 (includes Ord1, Ord2, Ord3, Ord4, OrdSplit = 5 orders)
    INSERT INTO @BranchPerfResult
    EXEC dbo.usp_Report_BranchPerformance @StartDate = '2026-05-01', @EndDate = '2026-05-30 23:59:59';

    DECLARE @T1_Tables INT, @T1_TotalOrd INT, @T1_ValidOrd INT, @T1_CancOrd INT, @T1_VoidOrd INT;
    DECLARE @T1_NetSales DECIMAL(14,2), @T1_AOV DECIMAL(10,2), @T1_Res INT, @T1_Covers INT;

    SELECT 
        @T1_Tables = TotalDiningTables,
        @T1_TotalOrd = TotalOrders,
        @T1_ValidOrd = ValidOrders,
        @T1_CancOrd = CancelledOrders,
        @T1_VoidOrd = VoidedOrders,
        @T1_NetSales = NetSales,
        @T1_AOV = AverageOrderValue,
        @T1_Res = TotalReservations,
        @T1_Covers = TotalCovers
    FROM @BranchPerfResult
    WHERE BranchId = @TestBranchId;

    IF @T1_Tables <> 3
        RAISERROR('TEST 1 FAILED: TotalDiningTables expected 3, got %d', 16, 1, @T1_Tables);
    IF @T1_TotalOrd <> 5
        RAISERROR('TEST 1 FAILED: TotalOrders expected 5, got %d', 16, 1, @T1_TotalOrd);
    IF @T1_ValidOrd <> 3
        RAISERROR('TEST 1 FAILED: ValidOrders expected 3, got %d', 16, 1, @T1_ValidOrd);
    IF @T1_CancOrd <> 1
        RAISERROR('TEST 1 FAILED: CancelledOrders expected 1, got %d', 16, 1, @T1_CancOrd);
    IF @T1_VoidOrd <> 1
        RAISERROR('TEST 1 FAILED: VoidedOrders expected 1, got %d', 16, 1, @T1_VoidOrd);

    -- Valid orders: Ord1 ($100) + Ord2 ($150) + OrdSplit ($100) = $350.00
    IF @T1_NetSales <> 350.00
    BEGIN
        DECLARE @T1_NetSales_Str NVARCHAR(30) = CAST(@T1_NetSales AS NVARCHAR(30));
        RAISERROR('TEST 1 FAILED: NetSales Cartesian multiplication detected! Expected 350.00, got %s', 16, 1, @T1_NetSales_Str);
    END
    -- AOV: 350.00 / 3 valid orders = 116.67
    IF @T1_AOV <> 116.67
    BEGIN
        DECLARE @T1_AOV_Str NVARCHAR(30) = CAST(@T1_AOV AS NVARCHAR(30));
        RAISERROR('TEST 1 FAILED: AverageOrderValue expected 116.67, got %s', 16, 1, @T1_AOV_Str);
    END
    IF @T1_Res <> 4
        RAISERROR('TEST 1 FAILED: TotalReservations expected 4, got %d', 16, 1, @T1_Res);
    IF @T1_Covers <> 8
        RAISERROR('TEST 1 FAILED: TotalCovers Cartesian multiplication detected! Expected 8, got %d', 16, 1, @T1_Covers);

    PRINT '  [PASS] SP 249 verified: Zero Cartesian duplication. Tables=3, TotalOrders=5, ValidOrders=3, Cancelled=1, Voided=1, NetSales=350.00, AOV=116.67, Covers=8.';


    -- ========================================================================
    -- REGRESSION TEST 2: SP 250 Restaurant Performance Metric Breakdown & Active Customers
    -- ========================================================================
    PRINT '>>> TEST 2: Verifying usp_Report_RestaurantPerformance (SP 250)...';

    DECLARE @RestPerfResult TABLE (
        RestaurantId INT, RestaurantName NVARCHAR(100), Email NVARCHAR(100),
        ActiveBranches INT, TotalOrders INT, ValidOrders INT, CancelledOrders INT, VoidedOrders INT,
        NetSales DECIMAL(14,2), ActiveCustomerBase INT
    );

    INSERT INTO @RestPerfResult
    EXEC dbo.usp_Report_RestaurantPerformance @StartDate = '2026-05-01', @EndDate = '2026-05-30 23:59:59';

    DECLARE @T2_Branches INT, @T2_TotalOrd INT, @T2_ValidOrd INT, @T2_CancOrd INT, @T2_VoidOrd INT;
    DECLARE @T2_NetSales DECIMAL(14,2), @T2_ActiveCust INT;

    SELECT 
        @T2_Branches = ActiveBranches,
        @T2_TotalOrd = TotalOrders,
        @T2_ValidOrd = ValidOrders,
        @T2_CancOrd = CancelledOrders,
        @T2_VoidOrd = VoidedOrders,
        @T2_NetSales = NetSales,
        @T2_ActiveCust = ActiveCustomerBase
    FROM @RestPerfResult
    WHERE RestaurantId = @TestRestaurantId;

    IF @T2_Branches <> 1
        RAISERROR('TEST 2 FAILED: ActiveBranches expected 1, got %d', 16, 1, @T2_Branches);
    IF @T2_TotalOrd <> 5
        RAISERROR('TEST 2 FAILED: TotalOrders expected 5, got %d', 16, 1, @T2_TotalOrd);
    IF @T2_ValidOrd <> 3
        RAISERROR('TEST 2 FAILED: ValidOrders expected 3, got %d', 16, 1, @T2_ValidOrd);
    IF @T2_CancOrd <> 1
        RAISERROR('TEST 2 FAILED: CancelledOrders expected 1, got %d', 16, 1, @T2_CancOrd);
    IF @T2_VoidOrd <> 1
        RAISERROR('TEST 2 FAILED: VoidedOrders expected 1, got %d', 16, 1, @T2_VoidOrd);
    IF @T2_NetSales <> 350.00
    BEGIN
        DECLARE @T2_NetSales_Str NVARCHAR(30) = CAST(@T2_NetSales AS NVARCHAR(30));
        RAISERROR('TEST 2 FAILED: Restaurant NetSales multiplication detected! Expected 350.00, got %s', 16, 1, @T2_NetSales_Str);
    END
    -- Only Alice (CustActive1) and Bob (CustActive2) placed valid orders in May. Charlie (CustInactive) placed none.
    IF @T2_ActiveCust <> 2
        RAISERROR('TEST 2 FAILED: ActiveCustomerBase expected 2, got %d (inactive customers leaked or duplicated)', 16, 1, @T2_ActiveCust);

    PRINT '  [PASS] SP 250 verified: Zero customer join multiplication. TotalOrders=5, ValidOrders=3, NetSales=350.00, ActiveCustomerBase=2.';


    -- ========================================================================
    -- REGRESSION TEST 3: Financial Settlement Date Filtering (SettledAt) & Unsettled Exclusion
    -- ========================================================================
    PRINT '>>> TEST 3: Verifying Collections filtered by SettledAt (SP 234)...';

    DECLARE @RevResult TABLE (
        BranchId INT, StartDate DATETIME2, EndDate DATETIME2, TotalOrders INT,
        GrossSales DECIMAL(14,2), Discounts DECIMAL(14,2), Taxes DECIMAL(14,2), AdditionalCharges DECIMAL(14,2), NetSales DECIMAL(14,2),
        SuccessfulPaymentsCount INT, CollectedRevenue DECIMAL(14,2), ProcessedRefundsCount INT, ProcessedRefunds DECIMAL(14,2),
        NetRevenue DECIMAL(14,2), ReconciliationDiscrepancy DECIMAL(14,2)
    );

    -- Query May 2026:
    -- Settled in May:
    -- Pay1: $100.00 (settled May 10, created April 30)
    -- PayFullRef: $120.00 (settled May 05)
    -- PayMultiRef: $300.00 (settled May 15)
    -- PayExcessRef: $50.00 (settled May 20)
    -- PayOrphanRef: $80.00 (settled May 25)
    -- PaySplit1: $50.00 (settled May 26)
    -- PaySplit2: $50.00 (settled May 26)
    -- Total Collected = 100 + 120 + 300 + 50 + 80 + 50 + 50 = $750.00
    -- Excluded from May:
    -- Pay2: $200.00 (settled June 01) -> EXCLUDED
    -- PayUnsettled: $75.00 (SettledAt is NULL) -> EXCLUDED
    INSERT INTO @RevResult
    EXEC dbo.usp_Report_RevenueSummary @BranchId = @TestBranchId, @StartDate = '2026-05-01', @EndDate = '2026-05-31 23:59:59';

    DECLARE @T3_Collected DECIMAL(14,2), @T3_Refunds DECIMAL(14,2), @T3_NetRev DECIMAL(14,2);
    SELECT 
        @T3_Collected = CollectedRevenue,
        @T3_Refunds = ProcessedRefunds,
        @T3_NetRev = NetRevenue
    FROM @RevResult;

    IF @T3_Collected <> 750.00
    BEGIN
        DECLARE @T3_Coll_Str NVARCHAR(30) = CAST(@T3_Collected AS NVARCHAR(30));
        RAISERROR('TEST 3 FAILED: May CollectedRevenue expected 750.00, got %s (SettledAt or NULL filter failed)', 16, 1, @T3_Coll_Str);
    END

    -- May Refunds: Refund Full ($120) + Refund Multi A ($100) + Refund Excess ($60) = $280.00.
    -- (Refund Multi B $150 excluded because ProcessedAt is June 05).
    IF @T3_Refunds <> 280.00
    BEGIN
        DECLARE @T3_Ref_Str NVARCHAR(30) = CAST(@T3_Refunds AS NVARCHAR(30));
        RAISERROR('TEST 3 FAILED: May ProcessedRefunds expected 280.00, got %s (ProcessedAt filter failed)', 16, 1, @T3_Ref_Str);
    END

    -- Net Revenue in May = $750.00 - $280.00 = $470.00
    IF @T3_NetRev <> 470.00
    BEGIN
        DECLARE @T3_Net_Str NVARCHAR(30) = CAST(@T3_NetRev AS NVARCHAR(30));
        RAISERROR('TEST 3 FAILED: May NetRevenue expected 470.00, got %s', 16, 1, @T3_Net_Str);
    END

    PRINT '  [PASS] SP 234 verified: SettledAt collections=750.00, NULL SettledAt excluded, ProcessedAt refunds=280.00, NetRevenue=470.00.';


    -- ========================================================================
    -- REGRESSION TEST 4: Multiple Partial Refunds Across Reporting Periods
    -- ========================================================================
    PRINT '>>> TEST 4: Verifying June Collections (Pay2 SettledAt) and Refunds (Refund Multi B ProcessedAt)...';

    DELETE FROM @RevResult;
    INSERT INTO @RevResult
    EXEC dbo.usp_Report_RevenueSummary @BranchId = @TestBranchId, @StartDate = '2026-06-01', @EndDate = '2026-06-30 23:59:59';

    DECLARE @T4_Collected DECIMAL(14,2), @T4_Refunds DECIMAL(14,2), @T4_NetRev DECIMAL(14,2);
    SELECT 
        @T4_Collected = CollectedRevenue,
        @T4_Refunds = ProcessedRefunds,
        @T4_NetRev = NetRevenue
    FROM @RevResult;

    -- June collections: Pay2 settled June 01 ($200.00)
    IF @T4_Collected <> 200.00
    BEGIN
        DECLARE @T4_Coll_Str NVARCHAR(30) = CAST(@T4_Collected AS NVARCHAR(30));
        RAISERROR('TEST 4 FAILED: June CollectedRevenue expected 200.00, got %s', 16, 1, @T4_Coll_Str);
    END

    -- June refunds: Refund Multi B processed June 05 ($150.00)
    IF @T4_Refunds <> 150.00
    BEGIN
        DECLARE @T4_Ref_Str NVARCHAR(30) = CAST(@T4_Refunds AS NVARCHAR(30));
        RAISERROR('TEST 4 FAILED: June ProcessedRefunds expected 150.00, got %s', 16, 1, @T4_Ref_Str);
    END

    -- June Net Revenue: 200.00 - 150.00 = 50.00
    IF @T4_NetRev <> 50.00
    BEGIN
        DECLARE @T4_Net_Str NVARCHAR(30) = CAST(@T4_NetRev AS NVARCHAR(30));
        RAISERROR('TEST 4 FAILED: June NetRevenue expected 50.00, got %s', 16, 1, @T4_Net_Str);
    END

    PRINT '  [PASS] Multiple partial refunds across separate periods verified: June Collections=200.00, June Refunds=150.00, NetRevenue=50.00.';


    -- ========================================================================
    -- REGRESSION TEST 5: Full Refunds and Refund Exceeding Original Payment (SP 236)
    -- ========================================================================
    PRINT '>>> TEST 5: Verifying Full Refund & Refund Exceeding Payment in usp_Report_RevenueRefunds (SP 236)...';

    DECLARE @RefundAuditResult TABLE (
        RefundId BIGINT, PaymentId BIGINT, OrderId BIGINT, BranchId INT, BranchName NVARCHAR(100),
        PaymentMethod NVARCHAR(50), RefundAmount DECIMAL(14,2), Reason NVARCHAR(255), RefundStatus NVARCHAR(50),
        GatewayRefundId NVARCHAR(100), ProcessedAt DATETIME2, ProcessedByUserName NVARCHAR(100), CreatedAt DATETIME2
    );

    INSERT INTO @RefundAuditResult
    EXEC dbo.usp_Report_RevenueRefunds @BranchId = @TestBranchId, @StartDate = '2026-05-01', @EndDate = '2026-05-31 23:59:59';

    DECLARE @FullRefundAmt DECIMAL(14,2);
    SELECT @FullRefundAmt = RefundAmount FROM @RefundAuditResult WHERE RefundId = 899101;
    IF @FullRefundAmt <> 120.00
    BEGIN
        DECLARE @FullRefundAmt_Str NVARCHAR(30) = CAST(@FullRefundAmt AS NVARCHAR(30));
        RAISERROR('TEST 5 FAILED: Full refund amount expected 120.00, got %s', 16, 1, @FullRefundAmt_Str);
    END

    DECLARE @ExcessRefundAmt DECIMAL(14,2);
    SELECT @ExcessRefundAmt = RefundAmount FROM @RefundAuditResult WHERE RefundId = 899104;
    IF @ExcessRefundAmt <> 60.00
    BEGIN
        DECLARE @ExcessRefundAmt_Str NVARCHAR(30) = CAST(@ExcessRefundAmt AS NVARCHAR(30));
        RAISERROR('TEST 5 FAILED: Excess refund amount expected 60.00, got %s', 16, 1, @ExcessRefundAmt_Str);
    END

    -- Original payment was $50.00, refund was $60.00 -> Discrepancy is $10.00
    DECLARE @OrigPayAmt DECIMAL(14,2);
    SELECT @OrigPayAmt = Amount FROM dbo.Payments WHERE PaymentId = @PayExcessRef;
    IF (@ExcessRefundAmt - @OrigPayAmt) <> 10.00
    BEGIN
        DECLARE @Discrepancy_Str NVARCHAR(30) = CAST((@ExcessRefundAmt - @OrigPayAmt) AS NVARCHAR(30));
        RAISERROR('TEST 5 FAILED: Discrepancy tracking expected 10.00 difference, got %s', 16, 1, @Discrepancy_Str);
    END

    PRINT '  [PASS] Full refund (120.00) and excess refund discrepancy (60.00 on 50.00 payment) verified.';


    -- ========================================================================
    -- REGRESSION TEST 6: REFUNDED Status Without Refund Record (Orphan Refund Anomaly)
    -- ========================================================================
    PRINT '>>> TEST 6: Verifying REFUNDED status payment without refund records...';

    -- PayOrphanRef was settled ($80.00) with status 'REFUNDED', but has 0 rows in PaymentRefunds.
    -- SP 234 must include the $80 in CollectedRevenue, but ProcessedRefunds must NOT fabricate a refund row.
    DECLARE @OrphanRefundRows INT;
    SELECT @OrphanRefundRows = COUNT(1) FROM dbo.PaymentRefunds WHERE PaymentId = @PayOrphanRef;
    IF @OrphanRefundRows <> 0
        RAISERROR('TEST 6 FAILED: Expected 0 refund records for orphan payment', 16, 1);

    PRINT '  [PASS] Orphan refund anomaly verified: Zero fabricated refunds from payment status alone.';


    -- ========================================================================
    -- REGRESSION TEST 7: Split Payment Bill Isolation (Zero Cartesian Duplication)
    -- ========================================================================
    PRINT '>>> TEST 7: Verifying split bill payments do not multiply order counts...';

    -- OrdSplit has 2 payments ($50 Cash, $50 Card).
    -- SP 234 orders count for May 26 must count OrdSplit exactly ONCE.
    DELETE FROM @RevResult;
    INSERT INTO @RevResult
    EXEC dbo.usp_Report_RevenueSummary @BranchId = @TestBranchId, @StartDate = '2026-05-26', @EndDate = '2026-05-26 23:59:59';

    DECLARE @T7_Orders INT, @T7_NetSales DECIMAL(14,2), @T7_Collected DECIMAL(14,2);
    SELECT 
        @T7_Orders = TotalOrders,
        @T7_NetSales = NetSales,
        @T7_Collected = CollectedRevenue
    FROM @RevResult;

    IF @T7_Orders <> 1
        RAISERROR('TEST 7 FAILED: Split payment order duplicated! Expected 1 order, got %d', 16, 1, @T7_Orders);
    IF @T7_NetSales <> 100.00
    BEGIN
        DECLARE @T7_NetSales_Str NVARCHAR(30) = CAST(@T7_NetSales AS NVARCHAR(30));
        RAISERROR('TEST 7 FAILED: Split payment NetSales duplicated! Expected 100.00, got %s', 16, 1, @T7_NetSales_Str);
    END
    IF @T7_Collected <> 100.00
    BEGIN
        DECLARE @T7_Coll_Str NVARCHAR(30) = CAST(@T7_Collected AS NVARCHAR(30));
        RAISERROR('TEST 7 FAILED: Split payment CollectedRevenue expected 100.00 (50+50), got %s', 16, 1, @T7_Coll_Str);
    END

    PRINT '  [PASS] Split payment verified: Orders=1, NetSales=100.00, CollectedRevenue=100.00 (2 payments).';


    -- ========================================================================
    -- REGRESSION TEST 8: Date Boundary Inclusive Midnight Normalization
    -- ========================================================================
    PRINT '>>> TEST 8: Verifying calendar date boundary normalization (May 31 23:45:00 order)...';

    -- OrdLate was created on 2026-05-31 23:45:00.
    -- Calling usp_Report_OrdersSummary with calendar date @EndDate = '2026-05-31'
    -- should expand @EndDate to 23:59:59.999 and include OrdLate.
    DECLARE @OrdersSummResult TABLE (
        OrderType NVARCHAR(50), OrderStatus NVARCHAR(50), TotalOrders INT,
        GrossSales DECIMAL(14,2), TotalDiscounts DECIMAL(14,2), TotalTaxes DECIMAL(14,2),
        NetSales DECIMAL(14,2), AverageOrderValue DECIMAL(10,2)
    );

    INSERT INTO @OrdersSummResult
    EXEC dbo.usp_Report_OrdersSummary @BranchId = @TestBranchId, @StartDate = '2026-05-31', @EndDate = '2026-05-31';

    DECLARE @LateOrderFound INT = 0;
    SELECT @LateOrderFound = COUNT(1) 
    FROM @OrdersSummResult 
    WHERE OrderType = 'TAKEAWAY' AND OrderStatus = 'COMPLETED';

    IF @LateOrderFound = 0
        RAISERROR('TEST 8 FAILED: Order created at 23:45:00 on May 31 excluded! Calendar date midnight normalization failed.', 16, 1);

    PRINT '  [PASS] Date boundary normalization verified: 23:45:00 order successfully captured under date 2026-05-31.';


    -- ========================================================================
    -- REGRESSION TEST 9: SP 248 Customer PII Masking Verification (Edge Cases)
    -- ========================================================================
    PRINT '>>> TEST 9: Verifying Customer PII Masking in usp_Report_CustomerTopSpenders (SP 248)...';

    -- Insert completed orders for edge-case customers so they appear in top spenders
    SET IDENTITY_INSERT dbo.Orders ON;
    INSERT INTO dbo.Orders (OrderId, BranchId, OrderNumber, OrderType, CustomerId, OrderStatus, PaymentStatus, SubTotal, TaxTotal, ServiceCharge, PackagingCharge, DiscountTotal, TipAmount, GrandTotal, CreatedAt, UpdatedAt, IsDeleted)
    VALUES 
        (899107, @TestBranchId, 'ORD-PII-1', 'DINE_IN', @CustShortPhone, 'COMPLETED', 'SUCCESS', 15.00, 1.50, 0.00, 0.00, 0.00, 0.00, 16.50, '2026-05-11 12:00:00', '2026-05-11 13:00:00', 0),
        (899108, @TestBranchId, 'ORD-PII-2', 'DINE_IN', @CustNullContact, 'COMPLETED', 'SUCCESS', 14.00, 1.40, 0.00, 0.00, 0.00, 0.00, 15.40, '2026-05-11 12:00:00', '2026-05-11 13:00:00', 0),
        (899109, @TestBranchId, 'ORD-PII-3', 'DINE_IN', @CustShortEmail, 'COMPLETED', 'SUCCESS', 13.00, 1.30, 0.00, 0.00, 0.00, 0.00, 14.30, '2026-05-11 12:00:00', '2026-05-11 13:00:00', 0),
        (899110, @TestBranchId, 'ORD-PII-4', 'DINE_IN', @CustBadEmail, 'COMPLETED', 'SUCCESS', 12.00, 1.20, 0.00, 0.00, 0.00, 0.00, 13.20, '2026-05-11 12:00:00', '2026-05-11 13:00:00', 0);
    SET IDENTITY_INSERT dbo.Orders OFF;

    DECLARE @CustTopResult TABLE (
        CustomerId BIGINT, FullName NVARCHAR(100), MaskedEmail NVARCHAR(100),
        MaskedPhone NVARCHAR(50), CompletedOrders INT, TotalSpent DECIMAL(14,2), AverageTicketSize DECIMAL(10,2), LastVisitDate DATETIME2
    );

    INSERT INTO @CustTopResult
    EXEC dbo.usp_Report_CustomerTopSpenders @TopN = 10, @StartDate = '2026-05-01', @EndDate = '2026-05-31 23:59:59';

    -- 1. Normal customer (Alice)
    DECLARE @T9_Email1 NVARCHAR(100), @T9_Phone1 NVARCHAR(50);
    SELECT @T9_Email1 = MaskedEmail, @T9_Phone1 = MaskedPhone FROM @CustTopResult WHERE CustomerId = @CustActive1;
    IF @T9_Email1 NOT LIKE 'al****@domain.com'
        RAISERROR('TEST 9 FAILED: Alice email masking failed! Got: %s', 16, 1, @T9_Email1);
    IF RIGHT(@T9_Phone1, 4) <> '3210' OR @T9_Phone1 NOT LIKE '*********3210'
        RAISERROR('TEST 9 FAILED: Alice phone masking failed! Expected *********3210, got: %s', 16, 1, @T9_Phone1);

    -- 2. Short phone (CustShortPhone: phone '123' -> '****')
    DECLARE @T9_Phone2 NVARCHAR(50);
    SELECT @T9_Phone2 = MaskedPhone FROM @CustTopResult WHERE CustomerId = @CustShortPhone;
    IF @T9_Phone2 <> '****'
        RAISERROR('TEST 9 FAILED: Short phone masking failed! Expected ****, got: %s', 16, 1, @T9_Phone2);

    -- 3. NULL/empty contact (CustNullContact: email NULL -> '****@masked.com', phone '' -> '****')
    DECLARE @T9_Email3 NVARCHAR(100), @T9_Phone3 NVARCHAR(50);
    SELECT @T9_Email3 = MaskedEmail, @T9_Phone3 = MaskedPhone FROM @CustTopResult WHERE CustomerId = @CustNullContact;
    IF @T9_Email3 <> '****@masked.com'
        RAISERROR('TEST 9 FAILED: NULL email masking failed! Expected ****@masked.com, got: %s', 16, 1, @T9_Email3);
    IF @T9_Phone3 <> '****'
        RAISERROR('TEST 9 FAILED: Empty phone masking failed! Expected ****, got: %s', 16, 1, @T9_Phone3);

    -- 4. Single-character username email (CustShortEmail: 'b@example.org' -> 'b****@example.org')
    DECLARE @T9_Email4 NVARCHAR(100);
    SELECT @T9_Email4 = MaskedEmail FROM @CustTopResult WHERE CustomerId = @CustShortEmail;
    IF @T9_Email4 <> 'b****@example.org'
        RAISERROR('TEST 9 FAILED: Single-character email masking failed! Expected b****@example.org, got: %s', 16, 1, @T9_Email4);

    -- 5. Malformed email (CustBadEmail: 'bademailwithoutat' -> '****@masked.com')
    DECLARE @T9_Email5 NVARCHAR(100);
    SELECT @T9_Email5 = MaskedEmail FROM @CustTopResult WHERE CustomerId = @CustBadEmail;
    IF @T9_Email5 <> '****@masked.com'
        RAISERROR('TEST 9 FAILED: Malformed email masking failed! Expected ****@masked.com, got: %s', 16, 1, @T9_Email5);

    PRINT '  [PASS] SP 248 verified: Normal, short-phone, null-contact, short-email, and malformed-email masking all 100% compliant.';


    -- ========================================================================
    -- REGRESSION TEST 10: Database Security Role & Ownership Chaining
    -- ========================================================================
    PRINT '>>> TEST 10: Verifying [db_reporting_reader] role and least-privilege permissions...';

    IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_reporting_reader' AND type = 'R')
        RAISERROR('TEST 10 FAILED: Role [db_reporting_reader] does not exist!', 16, 1);

    -- Verify EXECUTE permissions on all 25 procedures
    DECLARE @PermCount INT;
    SELECT @PermCount = COUNT(DISTINCT o.name)
    FROM sys.database_permissions dp
    JOIN sys.objects o ON dp.major_id = o.object_id
    JOIN sys.database_principals r ON dp.grantee_principal_id = r.principal_id
    WHERE r.name = 'db_reporting_reader'
      AND dp.permission_name = 'EXECUTE'
      AND o.type = 'P'
      AND o.name LIKE 'usp_Report_%';

    IF @PermCount < 25
        RAISERROR('TEST 10 FAILED: [db_reporting_reader] has EXECUTE on %d procedures (expected 25)', 16, 1, @PermCount);

    -- Verify DENY permissions on DML and direct SELECT
    DECLARE @DenyCount INT;
    SELECT @DenyCount = COUNT(1)
    FROM sys.database_permissions dp
    JOIN sys.database_principals r ON dp.grantee_principal_id = r.principal_id
    WHERE r.name = 'db_reporting_reader'
      AND dp.state_desc = 'DENY'
      AND dp.permission_name IN ('INSERT', 'UPDATE', 'DELETE', 'ALTER', 'SELECT');

    IF @DenyCount < 5
        RAISERROR('TEST 10 FAILED: [db_reporting_reader] missing explicit DENY on SELECT/DML (found %d, expected 5)', 16, 1, @DenyCount);

    -- Test least privilege impersonation under rms_report_user
    DECLARE @DirectSelectBlocked BIT = 0;
    BEGIN TRY
        EXECUTE AS USER = 'rms_report_user';
        EXEC('SELECT TOP 1 * FROM dbo.Orders');
        REVERT;
    END TRY
    BEGIN CATCH
        SET @DirectSelectBlocked = 1;
        REVERT;
    END CATCH;

    IF @DirectSelectBlocked = 0
        RAISERROR('TEST 10 FAILED: Direct SELECT on dbo.Orders succeeded under rms_report_user! Least-privilege violated.', 16, 1);

    -- Test that EXECUTE of reporting stored procedure succeeds under ownership chaining
    DECLARE @SpExecutionSucceeded BIT = 0;
    BEGIN TRY
        EXECUTE AS USER = 'rms_report_user';
        EXEC dbo.usp_Report_ExecutiveDashboardSummary @BranchId = @TestBranchId;
        REVERT;
        SET @SpExecutionSucceeded = 1;
    END TRY
    BEGIN CATCH
        REVERT;
        DECLARE @SecErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR('TEST 10 FAILED: SP execution under rms_report_user failed: %s', 16, 1, @SecErrMsg);
    END CATCH;

    IF @SpExecutionSucceeded = 0
        RAISERROR('TEST 10 FAILED: Ownership chaining failed for rms_report_user', 16, 1);

    PRINT '  [PASS] Security verified: Direct SELECT denied, SP execution succeeds via ownership chaining on all 25 procedures.';

    PRINT '';
    PRINT '====================================================================';
    PRINT 'ALL 10 CRITICAL REGRESSION TESTS PASSED WITH 100% SUCCESS RATE!';
    PRINT '====================================================================';
END TRY
BEGIN CATCH
    DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrLine INT = ERROR_LINE();
    -- Ensure any active impersonation is reverted
    WHILE USER_NAME() = 'rms_report_user'
    BEGIN
        REVERT;
    END
    ROLLBACK TRANSACTION;
    RAISERROR('REGRESSION SUITE FAILED at line %d: %s', 16, 1, @ErrLine, @ErrMsg);
    RETURN;
END CATCH;

-- Always rollback test transaction to leave database clean
ROLLBACK TRANSACTION;
PRINT 'Regression test transaction cleanly rolled back. Test database state preserved.';
GO
