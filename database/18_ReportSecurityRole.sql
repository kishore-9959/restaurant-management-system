-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT SERVICE DATABASE SECURITY ROLE
-- Script: database/18_ReportSecurityRole.sql
-- Description: Establishes a dedicated least-privilege database role [db_reporting_reader]
--              with EXECUTE permissions granted strictly and exclusively to the 25
--              approved reporting stored procedures (SPs 226–250).
--              Explicitly denies direct SELECT and mutating DML on dbo schema to ensure
--              zero direct table query or write capability outside stored procedures.
-- Database Target: RestaurantManagementDB / RestaurantManagementDB_IsolatedTest
-- ============================================================================

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- 0. Strict Safety Guard: Restrict execution strictly to RestaurantManagementDB_IsolatedTest
SELECT DB_NAME() AS CurrentDatabase;
IF DB_NAME() <> 'RestaurantManagementDB_IsolatedTest'
BEGIN
    SET NOEXEC ON;
    THROW 51000, 'SAFETY STOP: Phase 13 modifications are permitted only in RestaurantManagementDB_IsolatedTest.', 1;
END;
GO

-- 1. Create Dedicated Reporting Role if it does not already exist
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_reporting_reader' AND type = 'R')
BEGIN
    CREATE ROLE [db_reporting_reader];
    PRINT 'Created database role: [db_reporting_reader]';
END
ELSE
BEGIN
    PRINT 'Database role [db_reporting_reader] already exists.';
END
GO

-- 2. Explicitly DENY all mutating DML and direct SELECT permissions on the dbo schema
DENY INSERT ON SCHEMA::dbo TO [db_reporting_reader];
DENY UPDATE ON SCHEMA::dbo TO [db_reporting_reader];
DENY DELETE ON SCHEMA::dbo TO [db_reporting_reader];
DENY ALTER ON SCHEMA::dbo TO [db_reporting_reader];
DENY SELECT ON SCHEMA::dbo TO [db_reporting_reader];
GO

-- 3. Grant EXECUTE permissions strictly to the 25 approved reporting procedures
GRANT EXECUTE ON dbo.usp_Report_ExecutiveDashboardSummary TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_SalesDaily TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_SalesMonthly TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_SalesTrends TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_SalesByBranch TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_SalesByRestaurant TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_SalesByItem TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_SalesByCategory TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_RevenueSummary TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_RevenueByPaymentMethod TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_RevenueRefunds TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_OrdersSummary TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_OrdersPeakHours TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_TopSellingItems TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_InventoryCurrentStock TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_InventoryLowStock TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_InventoryTransactions TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_InventoryValuation TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_InventoryConsumption TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_ReservationSummary TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_ReservationTrends TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_CustomerAnalytics TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_CustomerTopSpenders TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_BranchPerformance TO [db_reporting_reader];
GRANT EXECUTE ON dbo.usp_Report_RestaurantPerformance TO [db_reporting_reader];
GO

-- 4. Create and map report service user [rms_report_user] if not present
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'rms_report_user' AND type = 'S')
BEGIN
    CREATE USER [rms_report_user] WITHOUT LOGIN;
    PRINT 'Created database user: [rms_report_user]';
END
GO

ALTER ROLE [db_reporting_reader] ADD MEMBER [rms_report_user];
PRINT 'Assigned [rms_report_user] to role [db_reporting_reader].';
GO

PRINT 'Successfully configured least-privilege security permissions for [db_reporting_reader].';
GO

-- Re-enable execution in case script was aborted
SET NOEXEC OFF;
GO
