# RESTAURANT MANAGEMENT SYSTEM (RMS)
# Phase 13 – Report Service & Analytics Dashboard: Production Risk & Mitigation Analysis

**Author:** Senior Solution Architect, Senior Database Architect & Systems Reliability Engineer (SRE)  
**Date:** November 21, 2026  
**Document Version:** 1.0.0  
**Phase:** 13 (Report Service & Analytics Dashboard)  

---

## 1. Executive Summary

This document provides a thorough architectural risk assessment of the Phase 13 reporting subsystem prior to production rollout. The reporting subsystem introduces read-intensive aggregations spanning multiple core operational tables (`Orders`, `OrderItems`, `Payments`, `PaymentTransactions`, `PaymentRefunds`, `InventoryTransactions`, `Reservations`). 

While all 25 reporting stored procedures have been verified as read-only and free of mutating operations or dirty `NOLOCK` reads, deploying to an enterprise production environment introduces specific operational, concurrency, and scalability considerations that must be actively managed.

---

## 2. Concurrency & Locking Risks

### 2.1 Schema Modification Locks During Deployment (`CREATE OR ALTER`)
- **Risk Description:** Executing `CREATE OR ALTER PROCEDURE` requires a Schema Modification (`Sch-M`) lock on the procedure metadata. If active transactions are executing the procedure during deployment, SQL Server queues the `Sch-M` lock behind active Schema Stability (`Sch-S`) locks, causing subsequent executions to queue.
- **Impact:** Brief transaction queuing and latency spikes if deployed during peak dining/ordering hours.
- **Mitigation:**
  - Schedule deployment during the designated low-volume off-peak maintenance window (e.g. 02:00–04:00 AM local time).
  - Pre-deployment check: Ensure no long-running reporting queries are in progress via `sys.dm_exec_requests`.
  - Set `LOCK_TIMEOUT` to 5000ms during deployment script execution to prevent indefinite queue blocking.

### 2.2 Concurrency Under RCSI vs Non-RCSI
- **Observation:** `RestaurantManagementDB` has Read Committed Snapshot Isolation (RCSI) enabled (`is_read_committed_snapshot_on = true`). In contrast, `RestaurantManagementDB_IsolatedTest` had RCSI disabled.
- **Risk / Opportunity:**
  - In `RestaurantManagementDB_IsolatedTest` (RCSI OFF), readers acquire shared locks (`S`), which can block writers (`X`) and vice versa unless queries are short.
  - In `RestaurantManagementDB` (RCSI ON), readers use row versioning in `tempdb`, reading the last committed snapshot without acquiring shared locks. This prevents readers from blocking OLTP writers (order creation, POS checkout, payment capture).
  - **Risk:** Increased `tempdb` version store utilization during heavy reporting periods.
- **Mitigation:**
  - Monitor `tempdb` space utilization using `sys.dm_db_file_space_usage`.
  - Ensure `tempdb` data files are pre-sized with multiple equally sized data files matching the CPU core count (up to 8 files).

---

## 3. Performance & Large Dataset Scaling Risks

### 3.1 Aggregation Memory Grants & Tempdb Spills
- **Risk Description:** Queries performing multi-dimensional grouping, sorting, or distinct counts (e.g., `usp_Report_SalesTrends`, `usp_Report_TopSellingItems`, `usp_Report_CustomerTopSpenders`) request query memory grants for Hash Match and Sort operators. If data volumes exceed memory grant estimations, SQL Server spills sort runs to `tempdb`.
- **Impact:** Elevated disk I/O, increased query latency, and higher latency for concurrent reporting users.
- **Mitigation:**
  - Maintain up-to-date column statistics on `Orders`, `OrderItems`, and `PaymentTransactions` (`UPDATE STATISTICS ... WITH FULLSCAN`).
  - The Redis caching layer in `report-service` caches aggregated query results for 15s to 24 hours (depending on date range), absorbing repeated dashboard requests without hitting SQL Server.
  - Recommended scaling limit: For datasets exceeding 10,000,000 order records, implement daily summary rollup tables (`Fact_DailySalesSummary`, `Fact_DailyItemSales`) populated via a nightly batch aggregation job.

### 3.2 Index Seek Preservation & Range Filtering
- **Status:** Resolved in SP 227 (`SalesDaily`) by converting `CAST(CreatedAt AS DATE)` to direct timestamp range `@StartDT` / `@EndDT`, preserving index seeks on `IX_Orders_CreatedAt`.
- **Ongoing Practice:** Ensure date filters on `PaymentTransactions.TransactionDate`, `PaymentRefunds.ProcessedAt`, and `Reservations.ReservationDate` remain SARGable and utilize indexed date columns.

---

## 4. Connection Pool & Service Exhaustion Risks

### 4.1 Connection Pool Saturation Under Export Loads
- **Risk Description:** Generating long-range historical Excel or PDF exports involves high data throughput. If multiple administrative users simultaneously trigger un-cached exports, backend database connection pools may become exhausted.
- **Mitigation:**
  - `backend/shared/config/database.js` defines a connection pool with `max: 20` and `idleTimeoutMillis: 30000`.
  - Export endpoints enforce HTTP streaming (Node.js readable stream via chunked transfer encoding), ensuring rows are piped directly to client sockets without buffering entire multi-megabyte payloads in process RAM.
  - Rate limiting on `/api/v1/reports/export/*` is configured via API Gateway (max 10 export requests per minute per IP).

---

## 5. Security & Access Control Considerations

### 5.1 Production Database Credentials
- **Risk Description:** In isolated test environments, `report-service` connects using `sa` credentials. If deployed to production with `sa`, the principle of least privilege is violated.
- **Mitigation (Prerequisite Condition 1):**
  - DBA must provision a dedicated SQL Server login (e.g. `rms_report_svc_user`) with a strong randomized password.
  - Map `rms_report_svc_user` to database user `[rms_report_user]` within `RestaurantManagementDB`.
  - Add `rms_report_user` to the `[db_reporting_reader]` role:
    ```sql
    ALTER ROLE [db_reporting_reader] ADD MEMBER [rms_report_user];
    ```
  - Store the credentials securely in production secret management (e.g., Azure Key Vault / HashiCorp Vault / environment variables) and set in `.env`:
    ```env
    DB_USER=rms_report_svc_user
    DB_PASSWORD=<SecureVaultSecret>
    ```

### 5.2 Customer PII Protection
- **Status:** SP 248 strictly masks phone numbers to the final 4 digits (`****3210`) and masks email username prefixes (`al****@example.com`). All password hashes and security tokens are excluded from all 25 reporting procedures.
- **Monitoring:** Periodic automated tests inspect API responses to ensure no unmasked PII is returned.

---

## 6. Rollback Complexity & Recovery Time Objective (RTO)

- **Rollback Complexity:** **LOW (Deterministic).**
  - The reporting service does not modify existing table schemas, foreign keys, or OLTP business logic.
  - Rollback involves running a single transactional T-SQL script (`Stage 7.1` in Deployment Guide) that drops `usp_Report_%` procedures and the `db_reporting_reader` role.
- **Recovery Time Objective (RTO):**
  - Database rollback: `< 15 seconds`.
  - Service decoupling (stopping `report-service` and API Gateway 404 fallback): `< 30 seconds`.
  - Total System RTO: `< 1 minute`.
- **Zero Impact on Active Operations:** If `report-service` or the reporting stored procedures are rolled back or disabled, ordering (POS), kitchen (KDS), reservations, and payments continue operating uninterrupted.

---

## 7. Production Monitoring & Alerting Recommendations

1. **SQL Server Metrics:**
   - Alert on `tempdb` free space `< 20%`.
   - Alert on SQL Server Query Compilation / Recompilation rate `> 200/sec`.
   - Monitor long-running queries `> 5000ms` on reporting procedures via Extended Events.
2. **Report Service Microservice Metrics:**
   - Alert on HTTP 500 error rate `> 1%` over 5-minute rolling window.
   - Monitor Redis cache hit ratio (target `> 80%` during business hours).
   - Alert on event loop lag `> 200ms`.
3. **API Gateway Metrics:**
   - Monitor `/api/v1/reports/*` response latency (p95 `< 1500ms`, p99 `< 3000ms`).

