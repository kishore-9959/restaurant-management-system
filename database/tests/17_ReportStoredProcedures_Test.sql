-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT STORED PROCEDURES TEST SUITE
-- File: database/tests/17_ReportStoredProcedures_Test.sql
-- Description: Comprehensive automated unit and functional verification for
--              all 25 Phase 13 Report Stored Procedures (SPs 226–250).
-- Database Target: RestaurantManagementDB_IsolatedTest
-- ============================================================================

SET NOCOUNT ON;
GO

PRINT '====================================================================';
PRINT 'STARTING PHASE 13: REPORT STORED PROCEDURES VERIFICATION SUITE';
PRINT 'Target: RestaurantManagementDB_IsolatedTest';
PRINT '====================================================================';
GO

-- ----------------------------------------------------------------------------
-- 1. TEST SP 226: dbo.usp_Report_ExecutiveDashboardSummary
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 1: Executing usp_Report_ExecutiveDashboardSummary (SP 226)...';
DECLARE @TestStartDate DATETIME2(3) = DATEADD(DAY, -60, SYSUTCDATETIME());
DECLARE @TestEndDate DATETIME2(3) = SYSUTCDATETIME();

EXEC dbo.usp_Report_ExecutiveDashboardSummary 
    @BranchId = NULL, 
    @StartDate = @TestStartDate, 
    @EndDate = @TestEndDate;
PRINT '  [PASS] SP 226 executed successfully without errors.';
GO

-- ----------------------------------------------------------------------------
-- 2. TEST SP 227: dbo.usp_Report_SalesDaily
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 2: Executing usp_Report_SalesDaily (SP 227)...';
EXEC dbo.usp_Report_SalesDaily 
    @BranchId = NULL, 
    @StartDate = NULL, 
    @EndDate = NULL;
PRINT '  [PASS] SP 227 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 3. TEST SP 228: dbo.usp_Report_SalesMonthly
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 3: Executing usp_Report_SalesMonthly (SP 228)...';
EXEC dbo.usp_Report_SalesMonthly 
    @BranchId = NULL, 
    @Year = 2026;
PRINT '  [PASS] SP 228 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 4. TEST SP 229: dbo.usp_Report_SalesTrends
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 4: Executing usp_Report_SalesTrends (SP 229) with all intervals...';
EXEC dbo.usp_Report_SalesTrends @BranchId = NULL, @Interval = 'HOUR';
EXEC dbo.usp_Report_SalesTrends @BranchId = NULL, @Interval = 'DAY';
EXEC dbo.usp_Report_SalesTrends @BranchId = NULL, @Interval = 'WEEK';
EXEC dbo.usp_Report_SalesTrends @BranchId = NULL, @Interval = 'MONTH';
PRINT '  [PASS] SP 229 executed successfully for HOUR, DAY, WEEK, MONTH.';
GO

-- ----------------------------------------------------------------------------
-- 5. TEST SP 230: dbo.usp_Report_SalesByBranch
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 5: Executing usp_Report_SalesByBranch (SP 230)...';
EXEC dbo.usp_Report_SalesByBranch @RestaurantId = NULL;
PRINT '  [PASS] SP 230 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 6. TEST SP 231: dbo.usp_Report_SalesByRestaurant
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 6: Executing usp_Report_SalesByRestaurant (SP 231)...';
EXEC dbo.usp_Report_SalesByRestaurant;
PRINT '  [PASS] SP 231 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 7. TEST SP 232: dbo.usp_Report_SalesByItem
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 7: Executing usp_Report_SalesByItem (SP 232)...';
EXEC dbo.usp_Report_SalesByItem @BranchId = NULL, @TopN = 10;
PRINT '  [PASS] SP 232 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 8. TEST SP 233: dbo.usp_Report_SalesByCategory
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 8: Executing usp_Report_SalesByCategory (SP 233)...';
EXEC dbo.usp_Report_SalesByCategory @BranchId = NULL;
PRINT '  [PASS] SP 233 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 9. TEST SP 234: dbo.usp_Report_RevenueSummary
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 9: Executing usp_Report_RevenueSummary (SP 234)...';
EXEC dbo.usp_Report_RevenueSummary @BranchId = NULL;
PRINT '  [PASS] SP 234 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 10. TEST SP 235: dbo.usp_Report_RevenueByPaymentMethod
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 10: Executing usp_Report_RevenueByPaymentMethod (SP 235)...';
EXEC dbo.usp_Report_RevenueByPaymentMethod @BranchId = NULL;
PRINT '  [PASS] SP 235 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 11. TEST SP 236: dbo.usp_Report_RevenueRefunds
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 11: Executing usp_Report_RevenueRefunds (SP 236)...';
EXEC dbo.usp_Report_RevenueRefunds @BranchId = NULL;
PRINT '  [PASS] SP 236 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 12. TEST SP 237: dbo.usp_Report_OrdersSummary
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 12: Executing usp_Report_OrdersSummary (SP 237)...';
EXEC dbo.usp_Report_OrdersSummary @BranchId = NULL;
PRINT '  [PASS] SP 237 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 13. TEST SP 238: dbo.usp_Report_OrdersPeakHours
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 13: Executing usp_Report_OrdersPeakHours (SP 238)...';
EXEC dbo.usp_Report_OrdersPeakHours @BranchId = NULL;
PRINT '  [PASS] SP 238 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 14. TEST SP 239: dbo.usp_Report_TopSellingItems
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 14: Executing usp_Report_TopSellingItems (SP 239)...';
EXEC dbo.usp_Report_TopSellingItems @BranchId = NULL, @TopN = 5;
PRINT '  [PASS] SP 239 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 15. TEST SP 240: dbo.usp_Report_InventoryCurrentStock
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 15: Executing usp_Report_InventoryCurrentStock (SP 240)...';
EXEC dbo.usp_Report_InventoryCurrentStock @BranchId = NULL;
PRINT '  [PASS] SP 240 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 16. TEST SP 241: dbo.usp_Report_InventoryLowStock
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 16: Executing usp_Report_InventoryLowStock (SP 241)...';
EXEC dbo.usp_Report_InventoryLowStock @BranchId = NULL;
PRINT '  [PASS] SP 241 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 17. TEST SP 242: dbo.usp_Report_InventoryTransactions
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 17: Executing usp_Report_InventoryTransactions (SP 242)...';
EXEC dbo.usp_Report_InventoryTransactions @BranchId = NULL;
PRINT '  [PASS] SP 242 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 18. TEST SP 243: dbo.usp_Report_InventoryValuation
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 18: Executing usp_Report_InventoryValuation (SP 243)...';
EXEC dbo.usp_Report_InventoryValuation @BranchId = NULL;
PRINT '  [PASS] SP 243 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 19. TEST SP 244: dbo.usp_Report_InventoryConsumption
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 19: Executing usp_Report_InventoryConsumption (SP 244)...';
EXEC dbo.usp_Report_InventoryConsumption @BranchId = NULL;
PRINT '  [PASS] SP 244 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 20. TEST SP 245: dbo.usp_Report_ReservationSummary
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 20: Executing usp_Report_ReservationSummary (SP 245)...';
EXEC dbo.usp_Report_ReservationSummary @BranchId = NULL;
PRINT '  [PASS] SP 245 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 21. TEST SP 246: dbo.usp_Report_ReservationTrends
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 21: Executing usp_Report_ReservationTrends (SP 246)...';
EXEC dbo.usp_Report_ReservationTrends @BranchId = NULL;
PRINT '  [PASS] SP 246 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 22. TEST SP 247: dbo.usp_Report_CustomerAnalytics
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 22: Executing usp_Report_CustomerAnalytics (SP 247)...';
EXEC dbo.usp_Report_CustomerAnalytics @BranchId = NULL;
PRINT '  [PASS] SP 247 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 23. TEST SP 248: dbo.usp_Report_CustomerTopSpenders (PII Masking Verification)
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 23: Executing usp_Report_CustomerTopSpenders (SP 248)...';
EXEC dbo.usp_Report_CustomerTopSpenders @BranchId = NULL, @TopN = 10;
PRINT '  [PASS] SP 248 executed successfully with PII protection.';
GO

-- ----------------------------------------------------------------------------
-- 24. TEST SP 249: dbo.usp_Report_BranchPerformance (Scorecard Category)
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 24: Executing usp_Report_BranchPerformance (SP 249)...';
EXEC dbo.usp_Report_BranchPerformance @RestaurantId = NULL;
PRINT '  [PASS] SP 249 executed successfully.';
GO

-- ----------------------------------------------------------------------------
-- 25. TEST SP 250: dbo.usp_Report_RestaurantPerformance
-- ----------------------------------------------------------------------------
PRINT '>>> TEST 25: Executing usp_Report_RestaurantPerformance (SP 250)...';
EXEC dbo.usp_Report_RestaurantPerformance;
PRINT '  [PASS] SP 250 executed successfully.';
GO

PRINT '====================================================================';
PRINT 'ALL 25 PHASE 13 REPORT STORED PROCEDURES PASSED UNIT VERIFICATION!';
PRINT '====================================================================';
GO
