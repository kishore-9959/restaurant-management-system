const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../database/17_ReportStoredProcedures.sql');

const sql = `-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT & ANALYTICS STORED PROCEDURES
-- Script: database/17_ReportStoredProcedures.sql
-- Description: Master analytical and executive intelligence stored procedures (SPs 226–250).
--              Read-only operations using READ COMMITTED snapshot-consistent semantics.
--              Guarantees zero dirty reads and zero Cartesian join inflation.
-- Database Target: RestaurantManagementDB / RestaurantManagementDB_IsolatedTest
-- Deployment: Safe CREATE OR ALTER PROCEDURE syntax (Zero downtime, preserves permissions).
-- Procedures (SPs 226–250):
--   226. dbo.usp_Report_ExecutiveDashboardSummary
--   227. dbo.usp_Report_SalesDaily
--   228. dbo.usp_Report_SalesMonthly
--   229. dbo.usp_Report_SalesTrends
--   230. dbo.usp_Report_SalesByBranch
--   231. dbo.usp_Report_SalesByRestaurant
--   232. dbo.usp_Report_SalesByItem
--   233. dbo.usp_Report_SalesByCategory
--   234. dbo.usp_Report_RevenueSummary
--   235. dbo.usp_Report_RevenueByPaymentMethod
--   236. dbo.usp_Report_RevenueRefunds
--   237. dbo.usp_Report_OrdersSummary
--   238. dbo.usp_Report_OrdersPeakHours
--   239. dbo.usp_Report_TopSellingItems
--   240. dbo.usp_Report_InventoryCurrentStock
--   241. dbo.usp_Report_InventoryLowStock
--   242. dbo.usp_Report_InventoryTransactions
--   243. dbo.usp_Report_InventoryValuation
--   244. dbo.usp_Report_InventoryConsumption
--   245. dbo.usp_Report_ReservationSummary
--   246. dbo.usp_Report_ReservationTrends
--   247. dbo.usp_Report_CustomerAnalytics
--   248. dbo.usp_Report_CustomerTopSpenders
--   249. dbo.usp_Report_BranchPerformance
--   250. dbo.usp_Report_RestaurantPerformance
-- ============================================================================

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 226: dbo.usp_Report_ExecutiveDashboardSummary
-- Description: High-level KPI cockpit aggregating sales, collections, covers,
--              orders, and low-stock alerts without Cartesian multiplication.
-- Financial Settlement: Uses Payments.SettledAt for collections and
--                       PaymentRefunds.ProcessedAt for refunds.
-- AOV Consistency: Uses valid non-cancelled orders for both numerator & denominator.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_ExecutiveDashboardSummary
    @BranchId INT = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    -- Default to last 30 days if date range omitted
    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    -- 1. Order KPIs (Orders Domain)
    DECLARE @TotalOrders INT = 0;
    DECLARE @CompletedOrders INT = 0;
    DECLARE @CancelledOrders INT = 0;
    DECLARE @ValidOrders INT = 0;
    DECLARE @GrossSales DECIMAL(14,2) = 0.00;
    DECLARE @TotalDiscounts DECIMAL(14,2) = 0.00;
    DECLARE @TotalTaxes DECIMAL(14,2) = 0.00;
    DECLARE @TotalAdditionalCharges DECIMAL(14,2) = 0.00;
    DECLARE @NetSales DECIMAL(14,2) = 0.00;
    DECLARE @AverageOrderValue DECIMAL(10,2) = 0.00;

    SELECT
        @TotalOrders = COUNT(1),
        @CompletedOrders = ISNULL(SUM(CASE WHEN o.OrderStatus = 'COMPLETED' THEN 1 ELSE 0 END), 0),
        @CancelledOrders = ISNULL(SUM(CASE WHEN o.OrderStatus IN ('CANCELLED', 'VOIDED') THEN 1 ELSE 0 END), 0),
        @ValidOrders = ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN 1 ELSE 0 END), 0),
        @GrossSales = ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.SubTotal ELSE 0.00 END), 0.00),
        @TotalDiscounts = ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.DiscountTotal ELSE 0.00 END), 0.00),
        @TotalTaxes = ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.TaxTotal ELSE 0.00 END), 0.00),
        @TotalAdditionalCharges = ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN (o.ServiceCharge + o.PackagingCharge + o.TipAmount) ELSE 0.00 END), 0.00),
        @NetSales = ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00)
    FROM dbo.Orders o
    WHERE o.IsDeleted = 0
      AND (@BranchId IS NULL OR o.BranchId = @BranchId)
      AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate;

    -- Mathematically aligned AOV: NetSales of valid orders / Count of valid orders
    IF @ValidOrders > 0
        SET @AverageOrderValue = ROUND(@NetSales / @ValidOrders, 2);

    -- 2. Payment Collections & Refunds (Payments Domain)
    -- Collections filtered strictly by SettledAt (actual settlement timestamp)
    DECLARE @CollectedRevenue DECIMAL(14,2) = 0.00;
    SELECT @CollectedRevenue = ISNULL(SUM(p.Amount), 0.00)
    FROM dbo.Payments p
    WHERE p.PaymentStatus IN ('SUCCESS', 'REFUNDED')
      AND (@BranchId IS NULL OR p.BranchId = @BranchId)
      AND p.SettledAt >= @StartDate AND p.SettledAt <= @EndDate;

    -- Refunds filtered strictly by ProcessedAt (actual refund execution timestamp)
    DECLARE @TotalRefunds DECIMAL(14,2) = 0.00;
    SELECT @TotalRefunds = ISNULL(SUM(pr.RefundAmount), 0.00)
    FROM dbo.PaymentRefunds pr
    JOIN dbo.Payments p ON pr.PaymentId = p.PaymentId
    WHERE pr.Status = 'PROCESSED'
      AND (@BranchId IS NULL OR p.BranchId = @BranchId)
      AND pr.ProcessedAt >= @StartDate AND pr.ProcessedAt <= @EndDate;

    DECLARE @NetRevenue DECIMAL(14,2) = @CollectedRevenue - @TotalRefunds;

    -- 3. Reservations & Covers (Reservation Domain)
    DECLARE @TotalReservations INT = 0;
    DECLARE @ExpectedCovers INT = 0;
    DECLARE @SeatedCovers INT = 0;

    SELECT
        @TotalReservations = COUNT(1),
        @ExpectedCovers = ISNULL(SUM(r.PartySize), 0),
        @SeatedCovers = ISNULL(SUM(CASE WHEN r.Status IN ('SEATED', 'COMPLETED') THEN r.PartySize ELSE 0 END), 0)
    FROM dbo.Reservations r
    WHERE r.IsDeleted = 0
      AND (@BranchId IS NULL OR r.BranchId = @BranchId)
      AND r.ReservationDate >= CAST(@StartDate AS DATE) 
      AND r.ReservationDate <= CAST(@EndDate AS DATE);

    -- 4. Inventory Alerts (Inventory Domain)
    DECLARE @LowStockAlertCount INT = 0;
    SELECT @LowStockAlertCount = COUNT(1)
    FROM dbo.InventoryIngredients i
    WHERE i.IsDeleted = 0 AND i.IsActive = 1
      AND (@BranchId IS NULL OR i.BranchId = @BranchId)
      AND i.CurrentStock <= i.MinimumStockLevel;

    -- Recordset 1: Executive KPI Summary
    SELECT
        @BranchId AS BranchId,
        @StartDate AS StartDate,
        @EndDate AS EndDate,
        @TotalOrders AS TotalOrders,
        @CompletedOrders AS CompletedOrders,
        @CancelledOrders AS CancelledOrders,
        @ValidOrders AS ValidOrders,
        CASE WHEN @TotalOrders > 0 
             THEN ROUND((CAST(@CompletedOrders AS DECIMAL(7,2)) * 100.0) / @TotalOrders, 2)
             ELSE 0.00 END AS CompletionRatePercent,
        @GrossSales AS GrossSales,
        @TotalDiscounts AS TotalDiscounts,
        @TotalTaxes AS TotalTaxes,
        @TotalAdditionalCharges AS TotalAdditionalCharges,
        @NetSales AS NetSales,
        @AverageOrderValue AS AverageOrderValue,
        @CollectedRevenue AS CollectedRevenue,
        @TotalRefunds AS TotalRefunds,
        @NetRevenue AS NetRevenue,
        @TotalReservations AS TotalReservations,
        @ExpectedCovers AS ExpectedCovers,
        @SeatedCovers AS SeatedCovers,
        @LowStockAlertCount AS LowStockAlertCount;

    -- Recordset 2: 7-Day Trend Preview
    SELECT TOP 7
        CAST(o.CreatedAt AS DATE) AS TrendDate,
        COUNT(1) AS DailyOrders,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) AS DailyNetSales
    FROM dbo.Orders o
    WHERE o.IsDeleted = 0
      AND (@BranchId IS NULL OR o.BranchId = @BranchId)
      AND o.CreatedAt >= DATEADD(DAY, -7, @EndDate) AND o.CreatedAt <= @EndDate
    GROUP BY CAST(o.CreatedAt AS DATE)
    ORDER BY TrendDate ASC;

    -- Recordset 3: Top 5 Recent Orders
    SELECT TOP 5
        o.OrderId,
        o.OrderNumber,
        o.BranchId,
        b.BranchName,
        o.OrderType,
        o.OrderStatus,
        o.PaymentStatus,
        o.GrandTotal,
        o.CreatedAt
    FROM dbo.Orders o
    LEFT JOIN dbo.Branches b ON o.BranchId = b.BranchId
    WHERE o.IsDeleted = 0
      AND (@BranchId IS NULL OR o.BranchId = @BranchId)
    ORDER BY o.CreatedAt DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 227: dbo.usp_Report_SalesDaily
-- Description: Daily time-series breakdown of order volumes, discounts, taxes,
--              gross and net sales, and AOV using consistent order population.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_SalesDaily
    @BranchId INT = NULL,
    @StartDate DATE = NULL,
    @EndDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = CAST(SYSUTCDATETIME() AS DATE);
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    SELECT
        CAST(o.CreatedAt AS DATE) AS SaleDate,
        COUNT(1) AS TotalOrders,
        ISNULL(SUM(CASE WHEN o.OrderStatus = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS CompletedOrders,
        ISNULL(SUM(CASE WHEN o.OrderStatus IN ('CANCELLED', 'VOIDED') THEN 1 ELSE 0 END), 0) AS CancelledOrders,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN 1 ELSE 0 END), 0) AS ValidOrders,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.SubTotal ELSE 0.00 END), 0.00) AS GrossSales,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.DiscountTotal ELSE 0.00 END), 0.00) AS Discounts,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.TaxTotal ELSE 0.00 END), 0.00) AS Taxes,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN (o.ServiceCharge + o.PackagingCharge + o.TipAmount) ELSE 0.00 END), 0.00) AS AdditionalCharges,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) AS NetSales,
        -- AOV: NetSales of valid orders / Count of valid orders (identical population)
        CASE WHEN ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN 1 ELSE 0 END), 0) > 0
             THEN ROUND(ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) / 
                        SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN 1 ELSE 0 END), 2)
             ELSE 0.00 END AS AverageOrderValue
    FROM dbo.Orders o
    WHERE o.IsDeleted = 0
      AND (@BranchId IS NULL OR o.BranchId = @BranchId)
      AND CAST(o.CreatedAt AS DATE) >= @StartDate 
      AND CAST(o.CreatedAt AS DATE) <= @EndDate
    GROUP BY CAST(o.CreatedAt AS DATE)
    ORDER BY SaleDate ASC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 228: dbo.usp_Report_SalesMonthly
-- Description: Calendar monthly aggregation of sales, taxes, discounts, and orders.
-- AOV Consistency: Same valid-order population for numerator and denominator.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_SalesMonthly
    @BranchId INT = NULL,
    @Year INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @Year IS NULL
        SET @Year = YEAR(SYSUTCDATETIME());

    SELECT
        YEAR(o.CreatedAt) AS SalesYear,
        MONTH(o.CreatedAt) AS SalesMonth,
        DATENAME(MONTH, o.CreatedAt) AS MonthName,
        COUNT(1) AS TotalOrders,
        ISNULL(SUM(CASE WHEN o.OrderStatus = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS CompletedOrders,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN 1 ELSE 0 END), 0) AS ValidOrders,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.SubTotal ELSE 0.00 END), 0.00) AS GrossSales,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.DiscountTotal ELSE 0.00 END), 0.00) AS Discounts,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.TaxTotal ELSE 0.00 END), 0.00) AS Taxes,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) AS NetSales,
        CASE WHEN ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN 1 ELSE 0 END), 0) > 0
             THEN ROUND(ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) / 
                        SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN 1 ELSE 0 END), 2)
             ELSE 0.00 END AS AverageOrderValue
    FROM dbo.Orders o
    WHERE o.IsDeleted = 0
      AND (@BranchId IS NULL OR o.BranchId = @BranchId)
      AND YEAR(o.CreatedAt) = @Year
    GROUP BY YEAR(o.CreatedAt), MONTH(o.CreatedAt), DATENAME(MONTH, o.CreatedAt)
    ORDER BY SalesYear ASC, SalesMonth ASC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 229: dbo.usp_Report_SalesTrends
-- Description: Dynamic time-series trends by interval (HOUR, DAY, WEEK, MONTH).
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_SalesTrends
    @BranchId INT = NULL,
    @Interval VARCHAR(10) = 'DAY', -- 'HOUR', 'DAY', 'WEEK', 'MONTH'
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    SET @Interval = UPPER(ISNULL(@Interval, 'DAY'));

    IF @Interval = 'HOUR'
    BEGIN
        SELECT
            DATEFROMPARTS(YEAR(o.CreatedAt), MONTH(o.CreatedAt), DAY(o.CreatedAt)) AS TrendDate,
            DATEPART(HOUR, o.CreatedAt) AS TrendHour,
            CONCAT(FORMAT(DATEPART(HOUR, o.CreatedAt), '00'), ':00') AS TimeLabel,
            COUNT(1) AS TotalOrders,
            ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) AS NetSales
        FROM dbo.Orders o
        WHERE o.IsDeleted = 0
          AND (@BranchId IS NULL OR o.BranchId = @BranchId)
          AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
        GROUP BY DATEFROMPARTS(YEAR(o.CreatedAt), MONTH(o.CreatedAt), DAY(o.CreatedAt)), DATEPART(HOUR, o.CreatedAt)
        ORDER BY TrendDate ASC, TrendHour ASC;
    END
    ELSE IF @Interval = 'WEEK'
    BEGIN
        SELECT
            DATEPART(YEAR, o.CreatedAt) AS TrendYear,
            DATEPART(ISO_WEEK, o.CreatedAt) AS TrendWeek,
            CONCAT('W', FORMAT(DATEPART(ISO_WEEK, o.CreatedAt), '00'), '-', DATEPART(YEAR, o.CreatedAt)) AS TimeLabel,
            COUNT(1) AS TotalOrders,
            ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) AS NetSales
        FROM dbo.Orders o
        WHERE o.IsDeleted = 0
          AND (@BranchId IS NULL OR o.BranchId = @BranchId)
          AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
        GROUP BY DATEPART(YEAR, o.CreatedAt), DATEPART(ISO_WEEK, o.CreatedAt)
        ORDER BY TrendYear ASC, TrendWeek ASC;
    END
    ELSE IF @Interval = 'MONTH'
    BEGIN
        SELECT
            DATEPART(YEAR, o.CreatedAt) AS TrendYear,
            DATEPART(MONTH, o.CreatedAt) AS TrendMonth,
            CONCAT(DATENAME(MONTH, o.CreatedAt), ' ', DATEPART(YEAR, o.CreatedAt)) AS TimeLabel,
            COUNT(1) AS TotalOrders,
            ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) AS NetSales
        FROM dbo.Orders o
        WHERE o.IsDeleted = 0
          AND (@BranchId IS NULL OR o.BranchId = @BranchId)
          AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
        GROUP BY DATEPART(YEAR, o.CreatedAt), DATEPART(MONTH, o.CreatedAt), DATENAME(MONTH, o.CreatedAt)
        ORDER BY TrendYear ASC, TrendMonth ASC;
    END
    ELSE -- Default to 'DAY'
    BEGIN
        SELECT
            CAST(o.CreatedAt AS DATE) AS TrendDate,
            DATENAME(WEEKDAY, o.CreatedAt) AS DayOfWeek,
            CONVERT(VARCHAR(10), CAST(o.CreatedAt AS DATE), 120) AS TimeLabel,
            COUNT(1) AS TotalOrders,
            ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) AS NetSales
        FROM dbo.Orders o
        WHERE o.IsDeleted = 0
          AND (@BranchId IS NULL OR o.BranchId = @BranchId)
          AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
        GROUP BY CAST(o.CreatedAt AS DATE), DATENAME(WEEKDAY, o.CreatedAt)
        ORDER BY TrendDate ASC;
    END
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 230: dbo.usp_Report_SalesByBranch
-- Description: Comparative branch performance scorecard for multi-unit analytics.
-- Financial Settlement: Uses SettledAt for collections and ProcessedAt for refunds.
-- AOV Consistency: Same valid-order population for numerator and denominator.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_SalesByBranch
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    WITH BranchSales AS (
        SELECT
            o.BranchId,
            COUNT(1) AS TotalOrders,
            ISNULL(SUM(CASE WHEN o.OrderStatus = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS CompletedOrders,
            ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN 1 ELSE 0 END), 0) AS ValidOrders,
            ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.SubTotal ELSE 0.00 END), 0.00) AS GrossSales,
            ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.DiscountTotal ELSE 0.00 END), 0.00) AS Discounts,
            ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.TaxTotal ELSE 0.00 END), 0.00) AS Taxes,
            ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) AS NetSales
        FROM dbo.Orders o
        WHERE o.IsDeleted = 0
          AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
        GROUP BY o.BranchId
    ),
    BranchPayments AS (
        SELECT
            p.BranchId,
            ISNULL(SUM(p.Amount), 0.00) AS CollectedRevenue
        FROM dbo.Payments p
        WHERE p.PaymentStatus IN ('SUCCESS', 'REFUNDED')
          AND p.SettledAt >= @StartDate AND p.SettledAt <= @EndDate
        GROUP BY p.BranchId
    ),
    BranchRefunds AS (
        SELECT
            p.BranchId,
            ISNULL(SUM(pr.RefundAmount), 0.00) AS TotalRefunds
        FROM dbo.PaymentRefunds pr
        JOIN dbo.Payments p ON pr.PaymentId = p.PaymentId
        WHERE pr.Status = 'PROCESSED'
          AND pr.ProcessedAt >= @StartDate AND pr.ProcessedAt <= @EndDate
        GROUP BY p.BranchId
    )
    SELECT
        b.BranchId,
        b.BranchName,
        b.BranchCode,
        b.City,
        ISNULL(bs.TotalOrders, 0) AS TotalOrders,
        ISNULL(bs.CompletedOrders, 0) AS CompletedOrders,
        ISNULL(bs.ValidOrders, 0) AS ValidOrders,
        ISNULL(bs.GrossSales, 0.00) AS GrossSales,
        ISNULL(bs.Discounts, 0.00) AS Discounts,
        ISNULL(bs.Taxes, 0.00) AS Taxes,
        ISNULL(bs.NetSales, 0.00) AS NetSales,
        ISNULL(bp.CollectedRevenue, 0.00) AS CollectedRevenue,
        ISNULL(br.TotalRefunds, 0.00) AS TotalRefunds,
        (ISNULL(bp.CollectedRevenue, 0.00) - ISNULL(br.TotalRefunds, 0.00)) AS NetRevenue,
        CASE WHEN ISNULL(bs.ValidOrders, 0) > 0
             THEN ROUND(ISNULL(bs.NetSales, 0.00) / bs.ValidOrders, 2)
             ELSE 0.00 END AS AverageOrderValue
    FROM dbo.Branches b
    LEFT JOIN BranchSales bs ON b.BranchId = bs.BranchId
    LEFT JOIN BranchPayments bp ON b.BranchId = bp.BranchId
    LEFT JOIN BranchRefunds br ON b.BranchId = br.BranchId
    WHERE b.IsDeleted = 0 AND b.IsActive = 1
    ORDER BY NetSales DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 231: dbo.usp_Report_SalesByRestaurant
-- Description: Top-level enterprise sales rollup by restaurant brand.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_SalesByRestaurant
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    SELECT
        r.RestaurantId,
        r.RestaurantName,
        COUNT(DISTINCT b.BranchId) AS ActiveBranches,
        COUNT(o.OrderId) AS TotalOrders,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.SubTotal ELSE 0.00 END), 0.00) AS GrossSales,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.DiscountTotal ELSE 0.00 END), 0.00) AS Discounts,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.TaxTotal ELSE 0.00 END), 0.00) AS Taxes,
        ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) AS NetSales
    FROM dbo.Restaurants r
    JOIN dbo.Branches b ON r.RestaurantId = b.RestaurantId AND b.IsDeleted = 0
    LEFT JOIN dbo.Orders o ON b.BranchId = o.BranchId 
                          AND o.IsDeleted = 0 
                          AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
    WHERE r.IsDeleted = 0
    GROUP BY r.RestaurantId, r.RestaurantName
    ORDER BY NetSales DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 232: dbo.usp_Report_SalesByItem
-- Description: Detailed item sales performance, units sold, and net contribution.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_SalesByItem
    @BranchId INT = NULL,
    @CategoryId INT = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    SELECT
        oi.MenuItemId,
        oi.ItemNameSnapshot,
        mc.CategoryName,
        SUM(oi.Quantity) AS UnitsSold,
        AVG(oi.UnitPrice) AS AverageUnitPrice,
        SUM(oi.TotalPrice) AS GrossItemRevenue,
        SUM(oi.TaxAmount) AS ItemTaxTotal,
        SUM(oi.FinalPrice) AS NetItemContribution
    FROM dbo.OrderItems oi
    JOIN dbo.Orders o ON oi.OrderId = o.OrderId
    LEFT JOIN dbo.MenuItems mi ON oi.MenuItemId = mi.MenuItemId
    LEFT JOIN dbo.Categories mc ON mi.CategoryId = mc.CategoryId
    WHERE o.IsDeleted = 0
      AND o.OrderStatus NOT IN ('CANCELLED', 'VOIDED')
      AND (@BranchId IS NULL OR o.BranchId = @BranchId)
      AND (@CategoryId IS NULL OR mi.CategoryId = @CategoryId)
      AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
    GROUP BY oi.MenuItemId, oi.ItemNameSnapshot, mc.CategoryName
    ORDER BY UnitsSold DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 233: dbo.usp_Report_SalesByCategory
-- Description: Menu category revenue contribution and volume distribution.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_SalesByCategory
    @BranchId INT = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    WITH CategoryAggregation AS (
        SELECT
            ISNULL(mc.CategoryId, 0) AS CategoryId,
            ISNULL(mc.CategoryName, 'Uncategorized') AS CategoryName,
            SUM(oi.Quantity) AS UnitsSold,
            SUM(oi.TotalPrice) AS GrossRevenue,
            SUM(oi.FinalPrice) AS NetContribution
        FROM dbo.OrderItems oi
        JOIN dbo.Orders o ON oi.OrderId = o.OrderId
        LEFT JOIN dbo.MenuItems mi ON oi.MenuItemId = mi.MenuItemId
        LEFT JOIN dbo.Categories mc ON mi.CategoryId = mc.CategoryId
        WHERE o.IsDeleted = 0
          AND o.OrderStatus NOT IN ('CANCELLED', 'VOIDED')
          AND (@BranchId IS NULL OR o.BranchId = @BranchId)
          AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
        GROUP BY mc.CategoryId, mc.CategoryName
    ),
    TotalSum AS (
        SELECT SUM(NetContribution) AS OverallNet FROM CategoryAggregation
    )
    SELECT
        ca.CategoryId,
        ca.CategoryName,
        ca.UnitsSold,
        ca.GrossRevenue,
        ca.NetContribution,
        CASE WHEN ts.OverallNet > 0 
             THEN ROUND((ca.NetContribution * 100.0) / ts.OverallNet, 2)
             ELSE 0.00 END AS PercentageOfTotalSales
    FROM CategoryAggregation ca
    CROSS JOIN TotalSum ts
    ORDER BY ca.NetContribution DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 234: dbo.usp_Report_RevenueSummary
-- Description: Financial reconciliation between Orders, Payments, and Refunds.
-- Financial Settlement: Uses Payments.SettledAt for collections and
--                       PaymentRefunds.ProcessedAt for refunds.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_RevenueSummary
    @BranchId INT = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    -- 1. Sales Ledger Metrics (Orders Domain)
    DECLARE @GrossSales DECIMAL(14,2) = 0.00;
    DECLARE @Discounts DECIMAL(14,2) = 0.00;
    DECLARE @Taxes DECIMAL(14,2) = 0.00;
    DECLARE @AdditionalCharges DECIMAL(14,2) = 0.00;
    DECLARE @NetSales DECIMAL(14,2) = 0.00;
    DECLARE @TotalOrders INT = 0;

    SELECT
        @TotalOrders = COUNT(1),
        @GrossSales = ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.SubTotal ELSE 0.00 END), 0.00),
        @Discounts = ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.DiscountTotal ELSE 0.00 END), 0.00),
        @Taxes = ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.TaxTotal ELSE 0.00 END), 0.00),
        @AdditionalCharges = ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN (o.ServiceCharge + o.PackagingCharge + o.TipAmount) ELSE 0.00 END), 0.00),
        @NetSales = ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00)
    FROM dbo.Orders o
    WHERE o.IsDeleted = 0
      AND (@BranchId IS NULL OR o.BranchId = @BranchId)
      AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate;

    -- 2. Cashflow & Settlement Metrics (Payments Domain)
    -- Filtered strictly by SettledAt
    DECLARE @CollectedRevenue DECIMAL(14,2) = 0.00;
    DECLARE @SuccessfulPaymentsCount INT = 0;

    SELECT
        @SuccessfulPaymentsCount = COUNT(1),
        @CollectedRevenue = ISNULL(SUM(p.Amount), 0.00)
    FROM dbo.Payments p
    WHERE p.PaymentStatus IN ('SUCCESS', 'REFUNDED')
      AND (@BranchId IS NULL OR p.BranchId = @BranchId)
      AND p.SettledAt >= @StartDate AND p.SettledAt <= @EndDate;

    -- 3. Refunds Processed (Refunds Domain)
    -- Filtered strictly by ProcessedAt
    DECLARE @ProcessedRefunds DECIMAL(14,2) = 0.00;
    DECLARE @ProcessedRefundsCount INT = 0;

    SELECT
        @ProcessedRefundsCount = COUNT(1),
        @ProcessedRefunds = ISNULL(SUM(pr.RefundAmount), 0.00)
    FROM dbo.PaymentRefunds pr
    JOIN dbo.Payments p ON pr.PaymentId = p.PaymentId
    WHERE pr.Status = 'PROCESSED'
      AND (@BranchId IS NULL OR p.BranchId = @BranchId)
      AND pr.ProcessedAt >= @StartDate AND pr.ProcessedAt <= @EndDate;

    -- 4. Net Revenue Calculation
    DECLARE @NetRevenue DECIMAL(14,2) = @CollectedRevenue - @ProcessedRefunds;
    DECLARE @ReconciliationDiscrepancy DECIMAL(14,2) = @NetSales - @NetRevenue;

    SELECT
        @BranchId AS BranchId,
        @StartDate AS StartDate,
        @EndDate AS EndDate,
        @TotalOrders AS TotalOrders,
        @GrossSales AS GrossSales,
        @Discounts AS Discounts,
        @Taxes AS Taxes,
        @AdditionalCharges AS AdditionalCharges,
        @NetSales AS NetSales,
        @SuccessfulPaymentsCount AS SuccessfulPaymentsCount,
        @CollectedRevenue AS CollectedRevenue,
        @ProcessedRefundsCount AS ProcessedRefundsCount,
        @ProcessedRefunds AS ProcessedRefunds,
        @NetRevenue AS NetRevenue,
        @ReconciliationDiscrepancy AS ReconciliationDiscrepancy;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 235: dbo.usp_Report_RevenueByPaymentMethod
-- Description: Split of collections by payment method (CASH, UPI, CARD, etc.).
-- Financial Settlement: Uses SettledAt for collections and ProcessedAt for refunds.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_RevenueByPaymentMethod
    @BranchId INT = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    WITH MethodCollections AS (
        SELECT
            p.PaymentMethod,
            COUNT(1) AS TransactionCount,
            ISNULL(SUM(p.Amount), 0.00) AS GrossCollected
        FROM dbo.Payments p
        WHERE p.PaymentStatus IN ('SUCCESS', 'REFUNDED')
          AND (@BranchId IS NULL OR p.BranchId = @BranchId)
          AND p.SettledAt >= @StartDate AND p.SettledAt <= @EndDate
        GROUP BY p.PaymentMethod
    ),
    MethodRefunds AS (
        SELECT
            p.PaymentMethod,
            ISNULL(SUM(pr.RefundAmount), 0.00) AS TotalRefunded
        FROM dbo.PaymentRefunds pr
        JOIN dbo.Payments p ON pr.PaymentId = p.PaymentId
        WHERE pr.Status = 'PROCESSED'
          AND (@BranchId IS NULL OR p.BranchId = @BranchId)
          AND pr.ProcessedAt >= @StartDate AND pr.ProcessedAt <= @EndDate
        GROUP BY p.PaymentMethod
    ),
    TotalCollectedSum AS (
        SELECT SUM(GrossCollected) AS OverallCollected FROM MethodCollections
    )
    SELECT
        mc.PaymentMethod,
        mc.TransactionCount,
        mc.GrossCollected,
        ISNULL(mr.TotalRefunded, 0.00) AS TotalRefunded,
        (mc.GrossCollected - ISNULL(mr.TotalRefunded, 0.00)) AS NetCollected,
        CASE WHEN tcs.OverallCollected > 0 
             THEN ROUND((mc.GrossCollected * 100.0) / tcs.OverallCollected, 2)
             ELSE 0.00 END AS PercentageShare
    FROM MethodCollections mc
    LEFT JOIN MethodRefunds mr ON mc.PaymentMethod = mr.PaymentMethod
    CROSS JOIN TotalCollectedSum tcs
    ORDER BY mc.GrossCollected DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 236: dbo.usp_Report_RevenueRefunds
-- Description: Detailed refund audit ledger with reason, initiator, and amount.
-- Date Filtering: Filtered by ProcessedAt timestamp.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_RevenueRefunds
    @BranchId INT = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    SELECT
        pr.RefundId,
        pr.PaymentId,
        p.OrderId,
        p.BranchId,
        b.BranchName,
        p.PaymentMethod,
        pr.RefundAmount,
        pr.Reason,
        pr.Status AS RefundStatus,
        pr.GatewayRefundId,
        pr.ProcessedAt,
        CONCAT(u.FirstName, ' ', ISNULL(u.LastName, '')) AS ProcessedByUserName,
        pr.CreatedAt
    FROM dbo.PaymentRefunds pr
    JOIN dbo.Payments p ON pr.PaymentId = p.PaymentId
    LEFT JOIN dbo.Branches b ON p.BranchId = b.BranchId
    LEFT JOIN dbo.Users u ON pr.InitiatedByUserId = u.UserId
    WHERE (@BranchId IS NULL OR p.BranchId = @BranchId)
      AND pr.ProcessedAt >= @StartDate AND pr.ProcessedAt <= @EndDate
    ORDER BY pr.ProcessedAt DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 237: dbo.usp_Report_OrdersSummary
-- Description: Breakdown of order counts and sales by dining type and status.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_OrdersSummary
    @BranchId INT = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    SELECT
        o.OrderType,
        o.OrderStatus,
        COUNT(1) AS TotalOrders,
        ISNULL(SUM(o.SubTotal), 0.00) AS GrossSales,
        ISNULL(SUM(o.DiscountTotal), 0.00) AS TotalDiscounts,
        ISNULL(SUM(o.TaxTotal), 0.00) AS TotalTaxes,
        ISNULL(SUM(o.GrandTotal), 0.00) AS NetSales,
        CASE WHEN COUNT(1) > 0 
             THEN ROUND(ISNULL(SUM(o.GrandTotal), 0.00) / COUNT(1), 2)
             ELSE 0.00 END AS AverageOrderValue
    FROM dbo.Orders o
    WHERE o.IsDeleted = 0
      AND (@BranchId IS NULL OR o.BranchId = @BranchId)
      AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
    GROUP BY o.OrderType, o.OrderStatus
    ORDER BY o.OrderType, o.OrderStatus;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 238: dbo.usp_Report_OrdersPeakHours
-- Description: Hourly distribution of order volume to analyze rush periods.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_OrdersPeakHours
    @BranchId INT = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    WITH HoursCTE AS (
        SELECT 0 AS HourOfDay UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
        UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
        UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
        UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
        UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
        UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23
    ),
    OrderHours AS (
        SELECT
            DATEPART(HOUR, o.CreatedAt) AS OrderHour,
            COUNT(1) AS OrderCount,
            ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) AS TotalSales
        FROM dbo.Orders o
        WHERE o.IsDeleted = 0
          AND (@BranchId IS NULL OR o.BranchId = @BranchId)
          AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
        GROUP BY DATEPART(HOUR, o.CreatedAt)
    )
    SELECT
        h.HourOfDay,
        CONCAT(FORMAT(h.HourOfDay, '00'), ':00 - ', FORMAT(h.HourOfDay, '00'), ':59') AS TimeSlotLabel,
        ISNULL(oh.OrderCount, 0) AS OrderCount,
        ISNULL(oh.TotalSales, 0.00) AS TotalSales
    FROM HoursCTE h
    LEFT JOIN OrderHours oh ON h.HourOfDay = oh.OrderHour
    ORDER BY h.HourOfDay ASC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 239: dbo.usp_Report_TopSellingItems
-- Description: Top N menu items ranked by quantity sold or revenue generated.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_TopSellingItems
    @BranchId INT = NULL,
    @TopN INT = 10,
    @SortBy VARCHAR(10) = 'QUANTITY', -- 'QUANTITY' or 'REVENUE'
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);
    IF @TopN IS NULL OR @TopN <= 0
        SET @TopN = 10;

    SET @SortBy = UPPER(ISNULL(@SortBy, 'QUANTITY'));

    WITH ItemAgg AS (
        SELECT
            oi.MenuItemId,
            oi.ItemNameSnapshot,
            mc.CategoryName,
            SUM(oi.Quantity) AS UnitsSold,
            SUM(oi.FinalPrice) AS TotalRevenue
        FROM dbo.OrderItems oi
        JOIN dbo.Orders o ON oi.OrderId = o.OrderId
        LEFT JOIN dbo.MenuItems mi ON oi.MenuItemId = mi.MenuItemId
        LEFT JOIN dbo.Categories mc ON mi.CategoryId = mc.CategoryId
        WHERE o.IsDeleted = 0
          AND o.OrderStatus NOT IN ('CANCELLED', 'VOIDED')
          AND (@BranchId IS NULL OR o.BranchId = @BranchId)
          AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
        GROUP BY oi.MenuItemId, oi.ItemNameSnapshot, mc.CategoryName
    )
    SELECT TOP (@TopN)
        ROW_NUMBER() OVER (
            ORDER BY 
                CASE WHEN @SortBy = 'REVENUE' THEN TotalRevenue END DESC,
                CASE WHEN @SortBy <> 'REVENUE' THEN UnitsSold END DESC
        ) AS RankPosition,
        MenuItemId,
        ItemNameSnapshot,
        CategoryName,
        UnitsSold,
        TotalRevenue
    FROM ItemAgg
    ORDER BY RankPosition ASC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 240: dbo.usp_Report_InventoryCurrentStock
-- Description: Current stock levels with unit conversions and reorder alerts.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_InventoryCurrentStock
    @BranchId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT
        i.IngredientId,
        i.BranchId,
        b.BranchName,
        i.IngredientName,
        i.IngredientCode,
        i.UnitOfMeasure,
        i.CurrentStock,
        i.MinimumStockLevel,
        i.CostPerUnit,
        (i.CurrentStock * i.CostPerUnit) AS StockValuation,
        CASE WHEN i.CurrentStock <= i.MinimumStockLevel THEN 1 ELSE 0 END AS IsLowStock,
        i.LastStockCheckDate
    FROM dbo.InventoryIngredients i
    LEFT JOIN dbo.Branches b ON i.BranchId = b.BranchId
    WHERE i.IsDeleted = 0 AND i.IsActive = 1
      AND (@BranchId IS NULL OR i.BranchId = @BranchId)
    ORDER BY IsLowStock DESC, i.IngredientName ASC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 241: dbo.usp_Report_InventoryLowStock
-- Description: Filtered critical alert list of ingredients below safety stock.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_InventoryLowStock
    @BranchId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT
        i.IngredientId,
        i.BranchId,
        b.BranchName,
        i.IngredientName,
        i.IngredientCode,
        i.UnitOfMeasure,
        i.CurrentStock,
        i.MinimumStockLevel,
        (i.MinimumStockLevel - i.CurrentStock) AS DeficitQuantity,
        i.CostPerUnit,
        ROUND((i.MinimumStockLevel - i.CurrentStock) * i.CostPerUnit, 2) AS EstimatedRestockCost,
        i.LastStockCheckDate
    FROM dbo.InventoryIngredients i
    LEFT JOIN dbo.Branches b ON i.BranchId = b.BranchId
    WHERE i.IsDeleted = 0 AND i.IsActive = 1
      AND i.CurrentStock <= i.MinimumStockLevel
      AND (@BranchId IS NULL OR i.BranchId = @BranchId)
    ORDER BY (i.MinimumStockLevel - i.CurrentStock) DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 242: dbo.usp_Report_InventoryTransactions
-- Description: Audit trail of stock movements (purchases, depletion, wastage).
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_InventoryTransactions
    @BranchId INT = NULL,
    @IngredientId INT = NULL,
    @TransactionType VARCHAR(30) = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    SELECT
        t.TransactionId,
        t.BranchId,
        b.BranchName,
        t.IngredientId,
        i.IngredientName,
        i.UnitOfMeasure,
        t.TransactionType,
        t.Quantity,
        t.UnitPrice,
        (t.Quantity * t.UnitPrice) AS TotalValue,
        t.ReferenceType,
        t.ReferenceId,
        t.Reason,
        CONCAT(u.FirstName, ' ', ISNULL(u.LastName, '')) AS PerformedByUserName,
        t.CreatedAt
    FROM dbo.InventoryTransactions t
    JOIN dbo.InventoryIngredients i ON t.IngredientId = i.IngredientId
    LEFT JOIN dbo.Branches b ON t.BranchId = b.BranchId
    LEFT JOIN dbo.Users u ON t.CreatedBy = u.UserId
    WHERE (@BranchId IS NULL OR t.BranchId = @BranchId)
      AND (@IngredientId IS NULL OR t.IngredientId = @IngredientId)
      AND (@TransactionType IS NULL OR t.TransactionType = @TransactionType)
      AND t.CreatedAt >= @StartDate AND t.CreatedAt <= @EndDate
    ORDER BY t.CreatedAt DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 243: dbo.usp_Report_InventoryValuation
-- Description: Total capital tied up in inventory stock, grouped by category.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_InventoryValuation
    @BranchId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    -- Recordset 1: Overall Totals
    SELECT
        @BranchId AS BranchId,
        COUNT(1) AS TotalIngredientsCount,
        ISNULL(SUM(i.CurrentStock * i.CostPerUnit), 0.00) AS TotalStockValuation,
        ISNULL(SUM(CASE WHEN i.CurrentStock <= i.MinimumStockLevel THEN 1 ELSE 0 END), 0) AS LowStockCount
    FROM dbo.InventoryIngredients i
    WHERE i.IsDeleted = 0 AND i.IsActive = 1
      AND (@BranchId IS NULL OR i.BranchId = @BranchId);

    -- Recordset 2: Detailed Ingredient Breakdown
    SELECT
        i.IngredientId,
        i.BranchId,
        b.BranchName,
        i.IngredientName,
        i.UnitOfMeasure,
        i.CurrentStock,
        i.CostPerUnit,
        (i.CurrentStock * i.CostPerUnit) AS Valuation
    FROM dbo.InventoryIngredients i
    LEFT JOIN dbo.Branches b ON i.BranchId = b.BranchId
    WHERE i.IsDeleted = 0 AND i.IsActive = 1
      AND (@BranchId IS NULL OR i.BranchId = @BranchId)
    ORDER BY Valuation DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 244: dbo.usp_Report_InventoryConsumption
-- Description: Theoretical ingredient consumption based on recipe BOMs.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_InventoryConsumption
    @BranchId INT = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    -- Compute theoretical recipe consumption from completed orders
    WITH OrderConsumption AS (
        SELECT
            r.IngredientId,
            SUM(oi.Quantity * r.QuantityRequired) AS TheoreticalUsage
        FROM dbo.OrderItems oi
        JOIN dbo.Orders o ON oi.OrderId = o.OrderId
        JOIN dbo.Recipes r ON oi.MenuItemId = r.MenuItemId
        WHERE o.IsDeleted = 0
          AND o.OrderStatus NOT IN ('CANCELLED', 'VOIDED')
          AND (@BranchId IS NULL OR o.BranchId = @BranchId)
          AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
        GROUP BY r.IngredientId
    ),
    ActualUsage AS (
        SELECT
            t.IngredientId,
            SUM(t.Quantity) AS ActualDepleted
        FROM dbo.InventoryTransactions t
        WHERE t.TransactionType = 'ORDER_CONSUMPTION'
          AND (@BranchId IS NULL OR t.BranchId = @BranchId)
          AND t.CreatedAt >= @StartDate AND t.CreatedAt <= @EndDate
        GROUP BY t.IngredientId
    )
    SELECT
        i.IngredientId,
        i.IngredientName,
        i.UnitOfMeasure,
        ISNULL(oc.TheoreticalUsage, 0.00) AS TheoreticalUsage,
        ISNULL(au.ActualDepleted, 0.00) AS ActualUsage,
        (ISNULL(au.ActualDepleted, 0.00) - ISNULL(oc.TheoreticalUsage, 0.00)) AS Variance,
        i.CostPerUnit,
        ROUND((ISNULL(au.ActualDepleted, 0.00) - ISNULL(oc.TheoreticalUsage, 0.00)) * i.CostPerUnit, 2) AS VarianceCost
    FROM dbo.InventoryIngredients i
    LEFT JOIN OrderConsumption oc ON i.IngredientId = oc.IngredientId
    LEFT JOIN ActualUsage au ON i.IngredientId = au.IngredientId
    WHERE (oc.TheoreticalUsage IS NOT NULL OR au.ActualDepleted IS NOT NULL)
      AND (@BranchId IS NULL OR i.BranchId = @BranchId)
    ORDER BY VarianceCost DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 245: dbo.usp_Report_ReservationSummary
-- Description: Aggregation of bookings, seated covers, cancellations, and no-shows.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_ReservationSummary
    @BranchId INT = NULL,
    @StartDate DATE = NULL,
    @EndDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = CAST(SYSUTCDATETIME() AS DATE);
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    SELECT
        @BranchId AS BranchId,
        @StartDate AS StartDate,
        @EndDate AS EndDate,
        COUNT(1) AS TotalBookings,
        ISNULL(SUM(r.PartySize), 0) AS TotalExpectedCovers,
        ISNULL(SUM(CASE WHEN r.Status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS CompletedBookings,
        ISNULL(SUM(CASE WHEN r.Status = 'COMPLETED' THEN r.PartySize ELSE 0 END), 0) AS CompletedCovers,
        ISNULL(SUM(CASE WHEN r.Status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS CancelledBookings,
        ISNULL(SUM(CASE WHEN r.Status = 'NO_SHOW' THEN 1 ELSE 0 END), 0) AS NoShowBookings,
        CASE WHEN COUNT(1) > 0 
             THEN ROUND((CAST(ISNULL(SUM(CASE WHEN r.Status = 'NO_SHOW' THEN 1 ELSE 0 END), 0) AS DECIMAL(7,2)) * 100.0) / COUNT(1), 2)
             ELSE 0.00 END AS NoShowRatePercent,
        CASE WHEN COUNT(1) > 0 
             THEN ROUND((CAST(ISNULL(SUM(CASE WHEN r.Status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS DECIMAL(7,2)) * 100.0) / COUNT(1), 2)
             ELSE 0.00 END AS CancellationRatePercent
    FROM dbo.Reservations r
    WHERE r.IsDeleted = 0
      AND (@BranchId IS NULL OR r.BranchId = @BranchId)
      AND r.ReservationDate >= @StartDate AND r.ReservationDate <= @EndDate;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 246: dbo.usp_Report_ReservationTrends
-- Description: Time-series curve of booking volumes and covers by date.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_ReservationTrends
    @BranchId INT = NULL,
    @StartDate DATE = NULL,
    @EndDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = CAST(SYSUTCDATETIME() AS DATE);
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    SELECT
        r.ReservationDate,
        DATENAME(WEEKDAY, r.ReservationDate) AS DayOfWeek,
        COUNT(1) AS TotalBookings,
        ISNULL(SUM(r.PartySize), 0) AS TotalCovers,
        ISNULL(SUM(CASE WHEN r.Status IN ('SEATED', 'COMPLETED') THEN r.PartySize ELSE 0 END), 0) AS SeatedCovers,
        ISNULL(SUM(CASE WHEN r.Status = 'NO_SHOW' THEN 1 ELSE 0 END), 0) AS NoShows
    FROM dbo.Reservations r
    WHERE r.IsDeleted = 0
      AND (@BranchId IS NULL OR r.BranchId = @BranchId)
      AND r.ReservationDate >= @StartDate AND r.ReservationDate <= @EndDate
    GROUP BY r.ReservationDate, DATENAME(WEEKDAY, r.ReservationDate)
    ORDER BY r.ReservationDate ASC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 247: dbo.usp_Report_CustomerAnalytics
-- Description: Customer retention, repeat visit velocity, and acquisition metrics.
-- Schema: Evaluated against dbo.Users (UserType = 'CUSTOMER').
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_CustomerAnalytics
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    -- 1. Acquisition Metrics
    DECLARE @TotalRegisteredCustomers INT = 0;
    DECLARE @NewCustomersInPeriod INT = 0;

    SELECT
        @TotalRegisteredCustomers = COUNT(1),
        @NewCustomersInPeriod = ISNULL(SUM(CASE WHEN u.CreatedAt >= @StartDate AND u.CreatedAt <= @EndDate THEN 1 ELSE 0 END), 0)
    FROM dbo.Users u
    WHERE u.UserType = 'CUSTOMER' AND u.IsDeleted = 0;

    -- 2. Engagement & Ordering Habits
    WITH CustomerOrderFreq AS (
        SELECT
            o.CustomerId,
            COUNT(1) AS OrderCount,
            SUM(o.GrandTotal) AS LifetimeSpend
        FROM dbo.Orders o
        WHERE o.IsDeleted = 0 
          AND o.CustomerId IS NOT NULL
          AND o.OrderStatus NOT IN ('CANCELLED', 'VOIDED')
        GROUP BY o.CustomerId
    )
    SELECT
        @TotalRegisteredCustomers AS TotalRegisteredCustomers,
        @NewCustomersInPeriod AS NewCustomersInPeriod,
        (SELECT COUNT(1) FROM CustomerOrderFreq WHERE OrderCount = 1) AS OneTimeDiners,
        (SELECT COUNT(1) FROM CustomerOrderFreq WHERE OrderCount > 1) AS RepeatDiners,
        CASE WHEN (SELECT COUNT(1) FROM CustomerOrderFreq) > 0
             THEN ROUND((CAST((SELECT COUNT(1) FROM CustomerOrderFreq WHERE OrderCount > 1) AS DECIMAL(7,2)) * 100.0) / 
                        (SELECT COUNT(1) FROM CustomerOrderFreq), 2)
             ELSE 0.00 END AS RepeatDinerRatePercent,
        (SELECT ISNULL(AVG(LifetimeSpend), 0.00) FROM CustomerOrderFreq) AS AverageCustomerLifetimeValue;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 248: dbo.usp_Report_CustomerTopSpenders
-- Description: VIP guest leaderboard with masked phone numbers and masked email.
-- PII Protection: Masks email and phone numbers; excludes password hashes & PINs.
-- Schema: Evaluated against dbo.Users (UserType = 'CUSTOMER').
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_CustomerTopSpenders
    @TopN INT = 20,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -365, @EndDate);
    IF @TopN IS NULL OR @TopN <= 0
        SET @TopN = 20;

    SELECT TOP (@TopN)
        u.UserId AS CustomerId,
        CONCAT(u.FirstName, ' ', ISNULL(u.LastName, '')) AS FullName,
        -- PII Masking: Mask email user prefix while preserving domain
        CASE 
            WHEN CHARINDEX('@', u.Email) > 2
            THEN CONCAT(
                SUBSTRING(u.Email, 1, 2),
                '****@',
                SUBSTRING(u.Email, CHARINDEX('@', u.Email) + 1, LEN(u.Email))
            )
            WHEN CHARINDEX('@', u.Email) > 0
            THEN CONCAT(
                SUBSTRING(u.Email, 1, 1),
                '****@',
                SUBSTRING(u.Email, CHARINDEX('@', u.Email) + 1, LEN(u.Email))
            )
            ELSE '****@masked.com'
        END AS MaskedEmail,
        -- PII Masking: Expose prefix + masked suffix
        CASE 
            WHEN LEN(u.PhoneNumber) > 4 
            THEN CONCAT(SUBSTRING(u.PhoneNumber, 1, LEN(u.PhoneNumber) - 4), '****')
            ELSE '****'
        END AS MaskedPhone,
        COUNT(o.OrderId) AS CompletedOrders,
        ISNULL(SUM(o.GrandTotal), 0.00) AS TotalSpent,
        MAX(o.CreatedAt) AS LastVisitDate
    FROM dbo.Users u
    JOIN dbo.Orders o ON u.UserId = o.CustomerId
    WHERE u.UserType = 'CUSTOMER' AND u.IsDeleted = 0 AND o.IsDeleted = 0
      AND o.OrderStatus = 'COMPLETED'
      AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
    GROUP BY u.UserId, u.FirstName, u.LastName, u.Email, u.PhoneNumber
    ORDER BY TotalSpent DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 249: dbo.usp_Report_BranchPerformance
-- Description: Multi-metric branch scorecard combining tables, sales, throughput,
--              AOV, and reservations without Cartesian multiplication.
-- Architecture: 3 separate CTEs (TableAgg, OrderAgg, ReservationAgg) joined to Branches.
-- Schema: Table counts from dbo.RestaurantTables.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_BranchPerformance
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    -- 1. Dining Tables aggregated independently by Branch
    WITH TableAgg AS (
        SELECT 
            dt.BranchId,
            COUNT(1) AS TotalDiningTables
        FROM dbo.RestaurantTables dt
        WHERE dt.IsDeleted = 0
        GROUP BY dt.BranchId
    ),
    -- 2. Orders & Sales aggregated independently by Branch
    OrderAgg AS (
        SELECT
            o.BranchId,
            COUNT(1) AS TotalOrders,
            ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN 1 ELSE 0 END), 0) AS ValidOrders,
            ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) AS NetSales
        FROM dbo.Orders o
        WHERE o.IsDeleted = 0
          AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
        GROUP BY o.BranchId
    ),
    -- 3. Reservations & Covers aggregated independently by Branch
    ReservationAgg AS (
        SELECT
            r.BranchId,
            COUNT(1) AS TotalReservations,
            ISNULL(SUM(r.PartySize), 0) AS TotalCovers
        FROM dbo.Reservations r
        WHERE r.IsDeleted = 0
          AND r.ReservationDate >= CAST(@StartDate AS DATE) 
          AND r.ReservationDate <= CAST(@EndDate AS DATE)
        GROUP BY r.BranchId
    )
    SELECT
        b.BranchId,
        b.BranchName,
        b.BranchCode,
        b.City,
        ISNULL(ta.TotalDiningTables, 0) AS TotalDiningTables,
        ISNULL(oa.TotalOrders, 0) AS TotalOrders,
        ISNULL(oa.NetSales, 0.00) AS NetSales,
        CASE WHEN ISNULL(oa.ValidOrders, 0) > 0
             THEN ROUND(ISNULL(oa.NetSales, 0.00) / oa.ValidOrders, 2)
             ELSE 0.00 END AS AverageOrderValue,
        ISNULL(ra.TotalReservations, 0) AS TotalReservations,
        ISNULL(ra.TotalCovers, 0) AS TotalCovers
    FROM dbo.Branches b
    LEFT JOIN TableAgg ta ON b.BranchId = ta.BranchId
    LEFT JOIN OrderAgg oa ON b.BranchId = oa.BranchId
    LEFT JOIN ReservationAgg ra ON b.BranchId = ra.BranchId
    WHERE b.IsDeleted = 0 AND b.IsActive = 1
    ORDER BY NetSales DESC;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 250: dbo.usp_Report_RestaurantPerformance
-- Description: Top-level executive enterprise comparison summarizing
--              multi-unit restaurant portfolio performance.
-- Architecture: Independent BranchAgg and RestaurantOrderAgg joined to Restaurants.
-- ActiveCustomerBase: Unique customers who placed valid orders during the period.
-------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_Report_RestaurantPerformance
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @EndDate IS NULL
        SET @EndDate = SYSUTCDATETIME();
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, @EndDate);

    -- 1. Active branches per restaurant
    WITH BranchAgg AS (
        SELECT 
            b.RestaurantId,
            COUNT(1) AS ActiveBranches
        FROM dbo.Branches b
        WHERE b.IsDeleted = 0 AND b.IsActive = 1
        GROUP BY b.RestaurantId
    ),
    -- 2. Orders, NetSales, and Active Ordering Customers aggregated independently
    RestaurantOrderAgg AS (
        SELECT
            b.RestaurantId,
            COUNT(1) AS TotalOrders,
            ISNULL(SUM(CASE WHEN o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.GrandTotal ELSE 0.00 END), 0.00) AS NetSales,
            -- Active customers: Customers who actually placed valid non-cancelled orders at this restaurant during the period
            COUNT(DISTINCT CASE WHEN o.CustomerId IS NOT NULL AND o.OrderStatus NOT IN ('CANCELLED', 'VOIDED') THEN o.CustomerId END) AS ActiveCustomerBase
        FROM dbo.Orders o
        JOIN dbo.Branches b ON o.BranchId = b.BranchId AND b.IsDeleted = 0
        WHERE o.IsDeleted = 0
          AND o.CreatedAt >= @StartDate AND o.CreatedAt <= @EndDate
        GROUP BY b.RestaurantId
    )
    SELECT
        r.RestaurantId,
        r.RestaurantName,
        r.PrimaryContactEmail AS Email,
        ISNULL(ba.ActiveBranches, 0) AS ActiveBranches,
        ISNULL(roa.TotalOrders, 0) AS TotalOrders,
        ISNULL(roa.NetSales, 0.00) AS NetSales,
        ISNULL(roa.ActiveCustomerBase, 0) AS ActiveCustomerBase
    FROM dbo.Restaurants r
    LEFT JOIN BranchAgg ba ON r.RestaurantId = ba.RestaurantId
    LEFT JOIN RestaurantOrderAgg roa ON r.RestaurantId = roa.RestaurantId
    WHERE r.IsDeleted = 0
    ORDER BY NetSales DESC;
END;
GO
`;

fs.writeFileSync(filePath, sql, 'utf8');
console.log('Successfully wrote updated 17_ReportStoredProcedures.sql with complete schema fixes.');
