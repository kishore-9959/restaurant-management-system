# RESTAURANT MANAGEMENT SYSTEM (RMS)
# Phase 13 – Database Security, Role-Based Access Control & Principal Audit Sign-Off

**Document File:** `documentation/PHASE13_SECURITY_SIGNOFF.md`  
**Date of Audit:** November 21, 2026  
**Auditor:** Senior Security Architect, SQL Server Security Auditor & Penetration Tester  
**Scope:** Verification of Least-Privilege Role `[db_reporting_reader]`, User Context `[rms_report_user]`, Direct SELECT Denial, and Service Identity Credentials.

---

## 1. Executive Summary & Security Determination

The database security architecture for Phase 13 was evaluated against institutional least-privilege standards:

1. **Principle of Least Privilege:** **ENFORCED.** The reporting user and role are explicitly barred from issuing ad-hoc queries, modifying data, altering schemas, or accessing credentials.
2. **Execution Vector:** Stored procedure execution operates strictly through SQL Server **Ownership Chaining** (`dbo` schema ownership).
3. **Connection Identity Finding (Production Prerequisite):** The microservice configuration currently connects using the `sa` login in development and test environments. A dedicated login `rms_report_svc_user` must be provisioned by the DBA prior to production launch.

---

## 2. Granular Permissions Audit: `[db_reporting_reader]`

Direct query of `sys.database_permissions` in `RestaurantManagementDB_IsolatedTest` confirms:

### 2.1 Explicit Schema-Level DENY Permissions (5 Permissions)
```sql
DENY ALTER ON SCHEMA::dbo TO [db_reporting_reader];
DENY DELETE ON SCHEMA::dbo TO [db_reporting_reader];
DENY INSERT ON SCHEMA::dbo TO [db_reporting_reader];
DENY SELECT ON SCHEMA::dbo TO [db_reporting_reader];
DENY UPDATE ON SCHEMA::dbo TO [db_reporting_reader];
```
- **Security Impact:** Prevents any caller authenticated as a member of `[db_reporting_reader]` from directly executing `SELECT`, `INSERT`, `UPDATE`, or `DELETE` against tables or views in the `dbo` schema.

### 2.2 Explicit Object-Level EXECUTE Grants (25 Permissions)
`GRANT EXECUTE` is strictly applied **only** to the 25 authorized reporting procedures:
1. `GRANT EXECUTE ON dbo.usp_Report_ExecutiveDashboardSummary TO [db_reporting_reader]`
2. `GRANT EXECUTE ON dbo.usp_Report_SalesDaily TO [db_reporting_reader]`
3. `GRANT EXECUTE ON dbo.usp_Report_SalesMonthly TO [db_reporting_reader]`
4. `GRANT EXECUTE ON dbo.usp_Report_SalesTrends TO [db_reporting_reader]`
5. `GRANT EXECUTE ON dbo.usp_Report_SalesByBranch TO [db_reporting_reader]`
6. `GRANT EXECUTE ON dbo.usp_Report_SalesByRestaurant TO [db_reporting_reader]`
7. `GRANT EXECUTE ON dbo.usp_Report_SalesByItem TO [db_reporting_reader]`
8. `GRANT EXECUTE ON dbo.usp_Report_SalesByCategory TO [db_reporting_reader]`
9. `GRANT EXECUTE ON dbo.usp_Report_RevenueSummary TO [db_reporting_reader]`
10. `GRANT EXECUTE ON dbo.usp_Report_RevenueByPaymentMethod TO [db_reporting_reader]`
11. `GRANT EXECUTE ON dbo.usp_Report_RevenueRefunds TO [db_reporting_reader]`
12. `GRANT EXECUTE ON dbo.usp_Report_OrdersSummary TO [db_reporting_reader]`
13. `GRANT EXECUTE ON dbo.usp_Report_OrdersPeakHours TO [db_reporting_reader]`
14. `GRANT EXECUTE ON dbo.usp_Report_TopSellingItems TO [db_reporting_reader]`
15. `GRANT EXECUTE ON dbo.usp_Report_InventoryCurrentStock TO [db_reporting_reader]`
16. `GRANT EXECUTE ON dbo.usp_Report_InventoryLowStock TO [db_reporting_reader]`
17. `GRANT EXECUTE ON dbo.usp_Report_InventoryTransactions TO [db_reporting_reader]`
18. `GRANT EXECUTE ON dbo.usp_Report_InventoryValuation TO [db_reporting_reader]`
19. `GRANT EXECUTE ON dbo.usp_Report_InventoryConsumption TO [db_reporting_reader]`
20. `GRANT EXECUTE ON dbo.usp_Report_ReservationSummary TO [db_reporting_reader]`
21. `GRANT EXECUTE ON dbo.usp_Report_ReservationTrends TO [db_reporting_reader]`
22. `GRANT EXECUTE ON dbo.usp_Report_CustomerAnalytics TO [db_reporting_reader]`
23. `GRANT EXECUTE ON dbo.usp_Report_CustomerTopSpenders TO [db_reporting_reader]`
24. `GRANT EXECUTE ON dbo.usp_Report_BranchPerformance TO [db_reporting_reader]`
25. `GRANT EXECUTE ON dbo.usp_Report_RestaurantPerformance TO [db_reporting_reader]`

- **Absence of Broad Grants:** Zero schema-level `GRANT EXECUTE ON SCHEMA::dbo` exists. Attempting to execute non-reporting procedures (e.g. `usp_Order_Create`, `usp_Payment_Process`) under this role fails immediately with permission denial.

---

## 3. Impersonation & Direct Query Denial Verification

The security boundaries were actively tested using SQL impersonation (`EXECUTE AS USER = 'rms_report_user'`):

```sql
EXECUTE AS USER = 'rms_report_user';
-- 1. Test Stored Procedure Execution
EXEC dbo.usp_Report_ExecutiveDashboardSummary;
-- Result: SUCCESS (3 recordsets returned via ownership chaining)

-- 2. Test Direct SELECT on Operational Tables
SELECT TOP 1 * FROM dbo.Orders;
-- Result: FAILED with Msg 229, Level 14, State 5:
-- "The SELECT permission was denied on the object 'Orders', database 'RestaurantManagementDB_IsolatedTest', schema 'dbo'."

-- 3. Test Mutating DML
DELETE FROM dbo.Orders WHERE OrderId = 1;
-- Result: FAILED with Msg 229:
-- "The DELETE permission was denied on the object 'Orders'..."
REVERT;
```

---

## 4. Connection Configuration Audit & DBA Provisioning Action

### 4.1 Current Configuration Inspection
- **File:** `backend/shared/config/env.js` and root `.env`
- **Observed Configuration:**
  ```env
  DB_USER=sa
  DB_PASSWORD=YourStrongPassword!
  ```
- **Finding:** The service currently runs using the `sa` account. While standard for local developer environments, running with `sa` in production introduces privilege escalation risks.

### 4.2 Exact DBA Action Required for Production Launch
The DBA must provision a dedicated SQL Server login and map it to `[rms_report_user]` in `RestaurantManagementDB`:

```sql
-- Step 1: Execute on SQL Server instance in [master]
USE [master];
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'rms_report_svc_user')
BEGIN
    CREATE LOGIN [rms_report_svc_user] 
    WITH PASSWORD = 'StrongRandomPassword!2026', 
         CHECK_POLICY = ON, 
         CHECK_EXPIRATION = ON;
    PRINT 'Created server login [rms_report_svc_user].';
END;
GO

-- Step 2: Map login to existing database user in [RestaurantManagementDB]
USE [RestaurantManagementDB];
ALTER USER [rms_report_user] WITH LOGIN = [rms_report_svc_user];
PRINT 'Mapped [rms_report_user] to login [rms_report_svc_user].';

-- Step 3: Verify role membership
IF NOT EXISTS (
    SELECT 1 FROM sys.database_role_members rm
    JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
    JOIN sys.database_principals m ON rm.member_principal_id = m.principal_id
    WHERE r.name = 'db_reporting_reader' AND m.name = 'rms_report_user'
)
BEGIN
    ALTER ROLE [db_reporting_reader] ADD MEMBER [rms_report_user];
    PRINT 'Added [rms_report_user] to role [db_reporting_reader].';
END;
GO
```

### 4.3 Production Environment Configuration Update
Update `.env` in the production environment:
```env
DB_USER=rms_report_svc_user
DB_PASSWORD=StrongRandomPassword!2026
```
This isolates the `report-service` to strictly execute the 25 approved reporting procedures and prevents any compromise of the service from affecting transactional data.

