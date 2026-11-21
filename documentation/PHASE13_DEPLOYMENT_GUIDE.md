# Restaurant Management System (RMS)
# Phase 13 – Report Service & Analytics Dashboard: Deployment & Operations Guide

**Document Version:** 1.0.0  
**Phase:** 13 (Report Service & Analytics Dashboard)  
**Target:** Microsoft SQL Server 2022, Node.js Microservices, Redis, API Gateway, React Frontend  
**Date:** 2026-11-18  

---

## 1. Safety Notice & Deployment Status

> [!CAUTION]
> **STRICT SAFETY RESTRICTION**:
> All 25 Phase 13 reporting stored procedures (`dbo.usp_Report_*`, SP 226–250) have been deployed and tested **EXCLUSIVELY** against `RestaurantManagementDB_IsolatedTest`.
> The primary database `RestaurantManagementDB` remains completely untouched (verified with 0 report procedures).
> **Do NOT execute the primary deployment steps below until explicit user approval has been provided.**

---

## 2. Pre-Deployment Verification & Prerequisites Checklist

Before applying changes to the primary database `RestaurantManagementDB`, verify the following checklist:

- [ ] **1. SQL Server Instance Connectivity:** Ensure SQL Server is reachable on port 1435.
- [ ] **2. Read Committed Snapshot Isolation (RCSI):** Verify RCSI is active on `RestaurantManagementDB`:
  ```sql
  SELECT name, is_read_committed_snapshot_on 
  FROM sys.databases 
  WHERE name = 'RestaurantManagementDB';
  -- Expected: 1 (RCSI ON)
  ```
- [ ] **3. Isolated Test Verification:** Ensure the master Phase 13 test suite has passed 100%:
  ```powershell
  & "C:\Program Files\nodejs\node.exe" scripts/test_phase13.js
  ```
- [ ] **4. Dedicated Production Login Provisioning (DBA Task):**
  Provision a dedicated server-level login for `report-service` rather than using `sa`:
  ```sql
  USE [master];
  IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'rms_report_svc_user')
  BEGIN
      CREATE LOGIN [rms_report_svc_user] WITH PASSWORD = 'StrongRandomPassword123!', CHECK_POLICY = ON;
  END;
  GO
  ```
- [ ] **5. Safety Guard Target Update:**
  In `database/17_ReportStoredProcedures.sql` and `database/18_ReportSecurityRole.sql`, update line 18 from:
  `IF DB_NAME() <> 'RestaurantManagementDB_IsolatedTest'`
  to:
  `IF DB_NAME() <> 'RestaurantManagementDB'`
  *(This update must only be performed after explicit human approval).*
- [ ] **6. Maintenance Window:** Schedule execution during off-peak hours (e.g. 02:00–04:00 AM) to minimize concurrency impact during Schema Modification (`Sch-M`) lock acquisition.

---

## 3. Database Deployment Procedure (Upon Approval)

Once explicit user approval is granted for primary database deployment:

### Step 3.1: Execute Stored Procedures Script (`CREATE OR ALTER`)
Deploy `database/17_ReportStoredProcedures.sql` against `RestaurantManagementDB` using `sqlcmd` or SSMS:

```powershell
sqlcmd -S localhost,1435 -U sa -P "YourStrongPassword!" -d RestaurantManagementDB -i database/17_ReportStoredProcedures.sql
```

> [!IMPORTANT]
> **Deployment Mechanics & Nuances of `CREATE OR ALTER PROCEDURE`**:
> - **Permission Preservation**: All 25 procedures use `CREATE OR ALTER PROCEDURE`. Unlike legacy `DROP PROCEDURE` followed by `CREATE PROCEDURE`, `CREATE OR ALTER` preserves the object's `object_id` in `sys.objects` and retains all existing object-level permissions, preventing temporary permission dropouts.
> - **Concurrency & Locking Caveats**: `CREATE OR ALTER PROCEDURE` does **not** guarantee zero blocking or absolute zero downtime. During the execution of the alter statement, SQL Server must acquire a Schema Modification (`Sch-M`) lock on the procedure metadata. If the procedure is actively executing in concurrent long-running transactions, the `Sch-M` request will wait behind active `Sch-S` locks, queuing incoming callers behind it.
> - **Recompilation Overhead**: Modifying the procedure purges existing cached execution plans from `sys.dm_exec_cached_plans`. The next execution will trigger a compilation phase, which may introduce brief CPU spikes under high concurrency.
> - **Operational Best Practice**: Execute this deployment during a scheduled low-traffic maintenance window. Monitor concurrent transactions and locks via `sys.dm_tran_locks` and `sys.dm_os_waiting_tasks`.

### Step 3.2: Deploy Dedicated Reporting Security Role
Deploy `database/18_ReportSecurityRole.sql` to establish the least-privilege `[db_reporting_reader]` role:

```powershell
sqlcmd -S localhost,1435 -U sa -P "YourStrongPassword!" -d RestaurantManagementDB -i database/18_ReportSecurityRole.sql
```
This ensures:
- `GRANT EXECUTE` is strictly restricted to the 25 approved `usp_Report_%` procedures.
- Explicit `DENY INSERT, UPDATE, DELETE, ALTER, SELECT ON SCHEMA::dbo TO [db_reporting_reader]` guarantees zero direct table query or write capability.
- Stored procedure execution succeeds securely via SQL Server ownership chaining, preventing SQL injection or ad-hoc data harvesting.

### Step 3.3: Verify Stored Procedures and Role in Primary Database
Execute `database/tests/verify_phase13_production_readiness.sql` or run the verification query:

```sql
SELECT ROUTINE_NAME 
FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'usp_Report_%'
ORDER BY ROUTINE_NAME;
```

**Expected Count:** Exactly 25 procedures:
1. `usp_Report_BranchPerformance`
2. `usp_Report_CustomerAnalytics`
3. `usp_Report_CustomerTopSpenders`
4. `usp_Report_ExecutiveDashboardSummary`
5. `usp_Report_InventoryConsumption`
6. `usp_Report_InventoryCurrentStock`
7. `usp_Report_InventoryLowStock`
8. `usp_Report_InventoryTransactions`
9. `usp_Report_InventoryValuation`
10. `usp_Report_OrdersPeakHours`
11. `usp_Report_OrdersSummary`
12. `usp_Report_ReservationSummary`
13. `usp_Report_ReservationTrends`
14. `usp_Report_RestaurantPerformance`
15. `usp_Report_RevenueByPaymentMethod`
16. `usp_Report_RevenueRefunds`
17. `usp_Report_RevenueSummary`
18. `usp_Report_SalesByBranch`
19. `usp_Report_SalesByCategory`
20. `usp_Report_SalesByItem`
21. `usp_Report_SalesByRestaurant`
22. `usp_Report_SalesDaily`
23. `usp_Report_SalesMonthly`
24. `usp_Report_SalesTrends`
25. `usp_Report_TopSellingItems`

---

## 4. Backend Service Deployment (`report-service`)

### Step 4.1: Install Dependencies
Navigate to `backend/report-service/` and verify dependencies:

```powershell
cd backend/report-service
npm install
```

### Step 4.2: Environment Configuration
Ensure root `.env` contains the required configuration:

```env
# Database
DB_SERVER=localhost
DB_PORT=1435
DB_NAME=RestaurantManagementDB
DB_USER=sa
DB_PASSWORD=YourStrongPassword!

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Service Port
REPORT_SERVICE_PORT=8013

# JWT
JWT_ACCESS_SECRET=your_jwt_access_secret_key_here
```

### Step 4.3: Start Report Service
Start the microservice using Node or PM2:

```powershell
cd backend/report-service
node src/server.js
```

Verify service health probes:
- `http://localhost:8013/health/live` -> HTTP 200 `{"status":"UP"}`
- `http://localhost:8013/health/ready` -> HTTP 200 `{"status":"UP","database":"UP","redis":"UP"}`

---

## 5. API Gateway Verification

Ensure `backend/api-gateway/src/app.js` routes `/api/v1/reports` traffic to `http://localhost:8013`:

```javascript
createProxyRoute(app, '/api/v1/reports', 'http://localhost:8013', 'report-service');
```

Verify RBAC rules:
- `/api/v1/reports/*` -> `requireRoles(['SUPER_ADMIN', 'RESTAURANT_MANAGER'])`

---

## 6. Frontend Deployment (`frontend/customer-web/`)

### Step 6.1: Build Application
```powershell
cd frontend/customer-web
npm run build
```

### Step 6.2: Route Validation
Verify that `/admin/analytics` and `/admin/reports` render the executive dashboard when signed in as an administrator, and that public navigation headers remain completely clean of admin links.

---

## 7. Rollback Procedures

If any issue arises during or after primary database deployment, follow this deterministic 4-stage rollback procedure:

### Stage 7.1: Rollback Stored Procedures and Security Role
Execute the following script against `RestaurantManagementDB` to cleanly drop all 25 reporting procedures, drop the test user, and remove the reporting security role:

```sql
SET NOCOUNT ON;
BEGIN TRANSACTION;
BEGIN TRY
    -- 1. Drop all 25 Report stored procedures
    DECLARE @sql NVARCHAR(MAX) = N'';
    SELECT @sql += N'DROP PROCEDURE dbo.' + QUOTENAME(ROUTINE_NAME) + N';' + CHAR(13)
    FROM INFORMATION_SCHEMA.ROUTINES 
    WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'usp_Report_%';
    
    IF LEN(@sql) > 0
    BEGIN
        EXEC sp_executesql @sql;
        PRINT 'Dropped all usp_Report_% stored procedures.';
    END

    -- 2. Drop user and reporting role
    IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'rms_report_user' AND type = 'S')
    BEGIN
        DROP USER [rms_report_user];
        PRINT 'Dropped database user [rms_report_user].';
    END

    IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_reporting_reader' AND type = 'R')
    BEGIN
        DROP ROLE [db_reporting_reader];
        PRINT 'Dropped database role [db_reporting_reader].';
    END

    COMMIT TRANSACTION;
    PRINT 'Database rollback completed successfully.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR('DATABASE ROLLBACK FAILED: %s', 16, 1, @Err);
END CATCH;
GO
```

### Stage 7.2: Rollback Backend Microservice
Stop the `report-service` process (port 8013):
```powershell
# PM2 managed:
pm2 stop report-service && pm2 delete report-service

# Node process:
Stop-Process -Name node -ErrorAction SilentlyContinue
```

### Stage 7.3: Invalidate Cache Keys
Purge any cached reporting data from Redis:
```powershell
redis-cli --scan --pattern "rms:reports:*" | xargs redis-cli del
```

### Stage 7.4: API Gateway Ingress Decoupling
If reverting API Gateway routing, remove `/api/v1/reports` from `backend/api-gateway/src/app.js`. The API Gateway will cleanly return HTTP 404 for report requests while all remaining 13 microservices continue operating with zero disruption.
