# RESTAURANT MANAGEMENT SYSTEM (RMS)
# Phase 13 – Forensic Reconciliation of Primary Database History & Trace Evidence

**Document File:** `documentation/PHASE13_FINAL_FORENSIC_RECONCILIATION.md`  
**Date of Audit:** November 21, 2026  
**Auditor Roles:** Senior SQL Server DBA, Forensic Database Architect, Security Auditor & QA Auditor  
**Scope:** Investigation of Primary Database (`RestaurantManagementDB`) History, Verification of Trace Logs, and Reconciliation of Previous Reporting Contradictions.

---

## 1. Executive Summary & Root Cause Reconciliation

Earlier Phase 13 inspection and audit reports contained conflicting claims regarding the status of the primary database `RestaurantManagementDB`:
- **Claim A (Earlier Reports):** Claimed that `RestaurantManagementDB` was completely untouched, containing 0 reporting stored procedures, 0 reporting roles, and 0 reporting users.
- **Claim B (Subsequent Audit):** Stated that 25 `dbo.usp_Report_%` stored procedures, the `[db_reporting_reader]` role, and the `[rms_report_user]` user were present in `RestaurantManagementDB` with creation timestamps at `2026-11-21 15:02 UTC`.

To eliminate speculation, an empirical forensic investigation was conducted directly against SQL Server system views, database principal catalogs, and the **SQL Server Default Trace** (`log_85.trc`).

### Definitive Forensic Findings:
1. **The Reporting Objects Exist in the Primary Database:**  
   `RestaurantManagementDB` does indeed contain 25 stored procedures matching `dbo.usp_Report_%`, the database role `[db_reporting_reader]`, and the database user `[rms_report_user]`.
2. **Empirical Evidence from SQL Server Default Trace:**  
   Querying `sys.fn_trace_gettable` on the active default trace file `C:\Program Files\Microsoft SQL Server\MSSQL17.SQLDEV\MSSQL\Log\log_85.trc` revealed exact historical trace events for the creation of these objects:
   - **Stored Procedures Creation:** Recorded at `2026-11-21 15:02:47.363Z` to `15:02:47.510Z`.
     - `EventClass`: 46 (`Object:Created`)
     - `ApplicationName`: **`Microsoft SQL Server Management Studio - Query`**
     - `HostName`: **`KISHORE`**
     - `LoginName`: **`sa`**
     - `SPID`: **`78`**
   - **Security Role and User Creation:** Recorded at `2026-11-21 15:02:58.250Z` to `15:02:58.300Z`, with a re-grant at `15:36:39.290Z`.
     - `EventClass`: 175 (`Audit Add Member to DB Role Event`) & 170 (`Audit Schema Object GDR Event`)
     - `ApplicationName`: **`Microsoft SQL Server Management Studio - Query`**
     - `HostName`: **`KISHORE`**
     - `LoginName`: **`sa`**
     - `SPID`: **`80`**
3. **Automated Agent Process Trace:**  
   All automated test runs executed by the Node.js agent connect with `ApplicationName: node-mssql`. The default trace proves that the agent's `node-mssql` connections executed DDL statements **exclusively** against `RestaurantManagementDB_IsolatedTest`. Trace queries against `RestaurantManagementDB` originating from `node-mssql` were **strictly read-only** audit queries (e.g. `SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES`, `SELECT name FROM sys.objects`, etc.).
4. **Resolution of Earlier Inaccuracy:**  
   The earlier report's assertion that the primary database contained "0 report procedures" was an outdated assumption inherited from the initial Phase 13 pre-deployment plan before the manual SSMS session at 15:02 UTC occurred. It is now factually established that report objects exist in `RestaurantManagementDB`, having been deployed via SSMS from client workstation `KISHORE` under `sa`.

---

## 2. Forensic Timeline of Database Events (November 21, 2026)

| Timestamp (UTC) | Target Database | Actor / Client App | Host / Login / SPID | Action / Event Description | Trace Verified? |
|---|---|---|---|---|:---:|
| `15:02:47.363` | `RestaurantManagementDB` | SSMS Query | `KISHORE` / `sa` / SPID 78 | Executed `database/17_ReportStoredProcedures.sql` (Initial draft SPs 226–250 created). | **YES** (`log_85.trc`) |
| `15:02:58.250` | `RestaurantManagementDB` | SSMS Query | `KISHORE` / `sa` / SPID 80 | Executed `database/18_ReportSecurityRole.sql` (Role `db_reporting_reader` and user `rms_report_user` created). | **YES** (`log_85.trc`) |
| `15:36:39.290` | `RestaurantManagementDB` | SSMS Query | `KISHORE` / `sa` / SPID 80 | Re-execution of role permission script. | **YES** (`log_85.trc`) |
| `16:16:33.430` | `RestaurantManagementDB_IsolatedTest` | `node-mssql` | `Kishore` / `sa` / SPID 94 | Automated deployment of updated `17_ReportStoredProcedures.sql` and `18_ReportSecurityRole.sql` to Isolated DB. | **YES** (`log_85.trc`) |
| `16:16:35 – 16:22:55` | Both Databases | `node-mssql` | `Kishore` / `sa` / Multiple | Automated test suite execution & read-only audit verification (`verify_report_db.js`). | **YES** (`log_85.trc`) |

---

## 3. Comparison: Primary DB Draft vs Isolated DB Deployed Code

Because the primary database objects were created from an earlier script revision, they do not match the final, corrected implementation currently deployed in `RestaurantManagementDB_IsolatedTest`:

| Stored Procedure | State in `RestaurantManagementDB` (Primary) | State in `RestaurantManagementDB_IsolatedTest` (Isolated) | Functional Discrepancy |
|---|---|---|---|
| **SP 227 (`usp_Report_SalesDaily`)** | `WHERE CAST(o.CreatedAt AS DATE) >= @StartDate` | `WHERE o.CreatedAt >= @StartDT AND o.CreatedAt <= @EndDT` | Primary DB version has non-SARGable date predicate causing index scan on `IX_Orders_CreatedAt`. Fixed in Isolated DB. |
| **SP 234 (`usp_Report_RevenueSummary`)** | Returns single discrepancy column | Returns both `ReconciliationDifference` (signed) and `ReconciliationDiscrepancy` (unsigned $|NetSales - NetRevenue|$) | Primary DB version lacks explicit signed/unsigned metric separation. Fixed in Isolated DB. |
| **SP 248 (`usp_Report_CustomerTopSpenders`)** | Legacy variable-length phone and email mask | Strict 4-digit phone mask (`****3210`) and prefix email mask (`al****@domain.com`) | Primary DB version may expose extra digits on short numbers. Fixed in Isolated DB. |
| **SP 249 (`usp_Report_BranchPerformance`)** | Multiple table joins before aggregation | Independent `TableAgg`, `OrderAgg`, and `ReservationAgg` CTEs; separate `TotalOrders`, `ValidOrders`, `CancelledOrders`, `VoidedOrders`; $\text{AOV} = \frac{\text{NetSales}}{\text{ValidOrders}}$ | Primary DB version risks join multiplication on multi-entity branches. Fixed in Isolated DB. |
| **SP 250 (`usp_Report_RestaurantPerformance`)** | Branch filter variance | Uniform `b.IsDeleted = 0 AND b.IsActive = 1` across all CTEs; distinct valid active customer base | Primary DB version has active branch filter inconsistency. Fixed in Isolated DB. |
| **Remaining 20 SPs** | Valid, read-only | Valid, read-only | Structurally identical; both verified read-only. |

---

## 4. Integrity Assessment of Preceding Phases (Phases 10, 11, 12)

Forensic checks verified that the manual execution in `RestaurantManagementDB` at 15:02 UTC did not alter or corrupt any database objects from Phases 10, 11, or 12:

1. **Phase 10 (Kitchen KDS & Notifications):**
   - Active Stored Procedures: Exactly 7 procedures (`usp_Kitchen_*`, `usp_Notification_*`). Intact.
   - Underlying Tables: `KitchenOrderTickets`, `KitchenOrderItems`, `Notifications`, `NotificationPreferences` intact.
2. **Phase 11 (Dynamic CMS Service & Frontend):**
   - Active Stored Procedures: Exactly 47 procedures (`usp_CMS_*`). Intact.
   - Underlying Tables: `Banners`, `FooterSections`, `NavigationMenus`, `Pages`, `PageSections`, `SocialMediaLinks`, `Testimonials`, `WebsiteSettings`, `ContactMessages` intact.
3. **Phase 12 (Reservation Service & Floor Scheduling):**
   - Active Stored Procedures: Exactly 16 procedures (`usp_Reservation_*`). Intact.
   - Underlying Tables: `Reservations`, `ReservationAuditLogs`, `ReservationTimeSlots` intact.

---

## 5. Reconciliation Conclusion & Recommendations

1. **Factual Clarity:** The primary database is **not** untouched; it contains the initial 25 report procedures and security role deployed via SSMS on 2026-11-21 at 15:02 UTC.
2. **Safety Status:** These objects are completely read-only, contain zero `NOLOCK` hints, zero DML statements, and do not mutate transactional data.
3. **Production Alignment:** To bring `RestaurantManagementDB` into 100% parity with the verified isolated test build, the updated [17_ReportStoredProcedures.sql](file:///c:/Projects/restaurant-management-system/restaurant-management-system/database/17_ReportStoredProcedures.sql) must be executed in production using `CREATE OR ALTER PROCEDURE` once the human operator authorizes production deployment.

