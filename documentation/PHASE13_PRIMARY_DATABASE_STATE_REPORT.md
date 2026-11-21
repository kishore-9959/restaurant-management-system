# RESTAURANT MANAGEMENT SYSTEM (RMS)
# Phase 13 – Primary Database (`RestaurantManagementDB`) Current State & Forensic Audit Report

**Document File:** `documentation/PHASE13_PRIMARY_DATABASE_STATE_REPORT.md`  
**Date of Audit:** November 21, 2026  
**Auditor:** Senior Database Architect & SQL Server Security Auditor  
**Instance Target:** Microsoft SQL Server 2022 (`localhost:1435`), Database: `RestaurantManagementDB`  

---

## 1. Executive Summary: Primary Database is NOT Untouched

In strict adherence to truth-in-auditing standards, **the primary database `RestaurantManagementDB` must NOT be labeled as untouched**. 

Direct empirical inspection of `RestaurantManagementDB` catalogs reveals that:
1. **25 reporting stored procedures** (`dbo.usp_Report_*`, SPs 226–250) are currently present.
2. The custom database security role **`[db_reporting_reader]`** is present.
3. The database user **`[rms_report_user]`** is present and assigned to `[db_reporting_reader]`.
4. **30 permission entries** exist in `sys.database_permissions` (25 `GRANT EXECUTE` and 5 `DENY` permissions).

---

## 2. Forensic Origin of Reporting Objects

A forensic examination of the SQL Server Default Trace (`log_85.trc`) established the exact origin of these objects:

- **Source Application:** `Microsoft SQL Server Management Studio - Query` (SSMS interactive query window)
- **Workstation / Host:** `KISHORE`
- **Authenticated Login:** `sa` (System Administrator)
- **Session IDs (SPIDs):** SPID 78 (Stored procedures script execution) & SPID 80 (Security role script execution)
- **Creation Timestamps:**
  - Stored Procedures: `2026-11-21 15:02:47.363 UTC` to `15:02:47.510 UTC`
  - Role & User: `2026-11-21 15:02:58.250 UTC` to `15:02:58.300 UTC`

### Automated Agent Verification:
All connection logs from the automated Node.js agent use `ApplicationName: node-mssql`. The default trace proves that the agent's `node-mssql` sessions executed DDL **strictly and exclusively** against `RestaurantManagementDB_IsolatedTest`. Trace events for `node-mssql` on `RestaurantManagementDB` consist exclusively of read-only metadata queries (`SELECT` queries on `sys.objects`, `sys.sql_modules`, and `INFORMATION_SCHEMA`).

---

## 3. Inventory of Reporting Objects in `RestaurantManagementDB`

### 3.1 Stored Procedures (25 Objects)

| Object ID | Procedure Name | Type | Create Date (UTC) | Modify Date (UTC) | Read-Only? | NOLOCK? |
|---|---|---|---|---|:---:|:---:|
| 262291994 | `usp_Report_ExecutiveDashboardSummary` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.363 | 2026-11-21 15:02:47.363 | YES | None |
| 278292051 | `usp_Report_SalesDaily` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.370 | 2026-11-21 15:02:47.370 | YES | None |
| 294292108 | `usp_Report_SalesMonthly` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.373 | 2026-11-21 15:02:47.373 | YES | None |
| 310292165 | `usp_Report_SalesTrends` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.380 | 2026-11-21 15:02:47.380 | YES | None |
| 326292222 | `usp_Report_SalesByBranch` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.390 | 2026-11-21 15:02:47.390 | YES | None |
| 342292279 | `usp_Report_SalesByRestaurant` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.400 | 2026-11-21 15:02:47.400 | YES | None |
| 358292336 | `usp_Report_SalesByItem` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.410 | 2026-11-21 15:02:47.410 | YES | None |
| 374292393 | `usp_Report_SalesByCategory` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.413 | 2026-11-21 15:02:47.413 | YES | None |
| 390292450 | `usp_Report_RevenueSummary` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.423 | 2026-11-21 15:02:47.423 | YES | None |
| 406292507 | `usp_Report_RevenueByPaymentMethod` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.430 | 2026-11-21 15:02:47.430 | YES | None |
| 422292564 | `usp_Report_RevenueRefunds` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.437 | 2026-11-21 15:02:47.437 | YES | None |
| 438292621 | `usp_Report_OrdersSummary` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.440 | 2026-11-21 15:02:47.440 | YES | None |
| 454292678 | `usp_Report_OrdersPeakHours` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.447 | 2026-11-21 15:02:47.447 | YES | None |
| 470292735 | `usp_Report_TopSellingItems` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.450 | 2026-11-21 15:02:47.450 | YES | None |
| 486292792 | `usp_Report_InventoryCurrentStock` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.453 | 2026-11-21 15:02:47.453 | YES | None |
| 502292849 | `usp_Report_InventoryLowStock` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.460 | 2026-11-21 15:02:47.460 | YES | None |
| 518292906 | `usp_Report_InventoryTransactions` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.463 | 2026-11-21 15:02:47.463 | YES | None |
| 534292963 | `usp_Report_InventoryValuation` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.467 | 2026-11-21 15:02:47.467 | YES | None |
| 550293020 | `usp_Report_InventoryConsumption` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.477 | 2026-11-21 15:02:47.477 | YES | None |
| 566293077 | `usp_Report_ReservationSummary` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.483 | 2026-11-21 15:02:47.483 | YES | None |
| 582293134 | `usp_Report_ReservationTrends` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.487 | 2026-11-21 15:02:47.487 | YES | None |
| 598293191 | `usp_Report_CustomerAnalytics` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.490 | 2026-11-21 15:02:47.490 | YES | None |
| 614293248 | `usp_Report_CustomerTopSpenders` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.497 | 2026-11-21 15:02:47.497 | YES | None |
| 630293305 | `usp_Report_BranchPerformance` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.500 | 2026-11-21 15:02:47.500 | YES | None |
| 646293362 | `usp_Report_RestaurantPerformance` | SQL_STORED_PROCEDURE | 2026-11-21 15:02:47.510 | 2026-11-21 15:02:47.510 | YES | None |

### 3.2 Security Principals & Permissions

- **Role `[db_reporting_reader]`:** `principal_id: 5`, created `2026-11-21 15:02:58.250 UTC`.
- **User `[rms_report_user]`:** `principal_id: 6`, created `2026-11-21 15:02:58.300 UTC`. `WITHOUT LOGIN`.
- **Role Membership:** `rms_report_user` is a member of `db_reporting_reader`.
- **Permissions:** Exactly 25 `GRANT EXECUTE` permissions on individual procedures, and 5 explicit schema `DENY` permissions (`INSERT`, `UPDATE`, `DELETE`, `ALTER`, `SELECT` on `SCHEMA::dbo`).

---

## 4. Assessment: Functional Equivalence & Replacement Need

The 25 stored procedures currently present in `RestaurantManagementDB` are **NOT** functionally equivalent to the final verified code in `RestaurantManagementDB_IsolatedTest`:

1. **Safety:** They are completely safe (read-only, no mutating DML, no lock escalation risks).
2. **Deficiencies:** They represent the pre-correction draft:
   - SP 227 has non-SARGable date predicate (`CAST(CreatedAt AS DATE)`).
   - SP 234 lacks the separate `ReconciliationDifference` / `ReconciliationDiscrepancy` columns.
   - SP 248 has variable-length PII masking.
   - SP 249 joins tables before aggregating, risking join inflation on multi-entity branches.
   - SP 250 has active branch filter inconsistency.
3. **Action Required Upon Production Approval:**  
   The primary database procedures **must be updated** upon explicit human approval by executing the final [17_ReportStoredProcedures.sql](file:///c:/Projects/restaurant-management-system/restaurant-management-system/database/17_ReportStoredProcedures.sql). Because the file uses `CREATE OR ALTER PROCEDURE`, running it will cleanly overwrite the 5 deficient procedures without dropping objects or disrupting object IDs.

---

## 5. Verification of Preceding Microservices Phases

The primary database state for preceding phases was audited and confirmed intact:
- **Phase 10 (Kitchen KDS & Notifications):** 7 procedures active, 0 missing, 0 altered.
- **Phase 11 (Dynamic CMS):** 47 procedures active, 0 missing, 0 altered.
- **Phase 12 (Reservations):** 16 procedures active, 0 missing, 0 altered.
- **Core Tables & Constraints:** All transactional tables (`Orders`, `OrderItems`, `Payments`, `Reservations`, `RestaurantTables`) are intact with zero schema mutations.

