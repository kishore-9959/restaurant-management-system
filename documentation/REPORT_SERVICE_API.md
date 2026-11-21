# Restaurant Management System (RMS)
# Report Service & Analytics REST API Specification

**Document Version:** 1.0.0  
**Phase:** 13 (Report Service & Analytics Dashboard)  
**Base Path:** `/api/v1/reports`  
**Service Port:** 8013  
**Gateway Ingress:** Port 8000  
**Authentication:** Bearer JWT required  
**Authorized Roles:** `SUPER_ADMIN`, `RESTAURANT_MANAGER`  

---

## 1. Universal Request & Response Protocol

### 1.1 Headers
All requests must include standard RMS headers:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
X-Correlation-ID: <UUID_V4>
Content-Type: application/json
```

### 1.2 Tenancy Rules
- `SUPER_ADMIN`: Can supply any `?branchId=` or omit it to query aggregated enterprise metrics across all branches.
- `RESTAURANT_MANAGER`: Constrained to their assigned branch. Any `?branchId=` provided in query parameters will be overridden with the manager's authenticated `branchId`.

### 1.3 Caching & Bypass
- Responses are cached in Redis with dynamic TTLs (15–60s for real-time dashboards; 24h for historical dates).
- Supplying `?refresh=true` bypasses Redis cache and triggers an immediate database re-read.

### 1.4 Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "Report generated successfully",
  "meta": {
    "cached": false,
    "timestamp": "2026-11-18T12:00:00.000Z"
  },
  "correlationId": "dfb2dcd1-98f4-42b1-9c2c-c62427411fe1"
}
```

### 1.5 Date Range Contract & Inclusive Boundary Normalization
To prevent accidental exclusion of transactions occurring later on a requested calendar day, the reporting API and stored procedures implement strict date normalization:
- **Calendar Date Expansion**: When a client provides a date string without a time component (e.g. `2026-05-31` or `2026-05-31T00:00:00.000Z`), the stored procedures evaluate `IF CAST(@EndDate AS TIME) = '00:00:00.000'` and automatically expand `@EndDate` to the final millisecond of that calendar day (`2026-05-31 23:59:59.999`) via `DATEADD(MILLISECOND, -1, DATEADD(DAY, 1, CAST(CAST(@EndDate AS DATE) AS DATETIME2(3))))`.
- **Exact Timestamp Semantics**: When a client passes an explicit non-midnight time (e.g. `2026-05-31T14:30:00.000Z`), the exact timestamp boundary is strictly respected without expansion.
- **Date-Only Endpoints**: Stored procedures filtering on `DATE` columns (e.g. `usp_Report_SalesDaily`, `usp_Report_ReservationSummary`) evaluate `CAST(CreatedAt AS DATE) <= @EndDate`, which natively covers the full 24-hour window.

### 1.6 Data Privacy & PII Masking Standards
- **Phone Numbers**: Strictly masks all prefix digits and exposes only the final 4 digits (e.g. `+919876543210` -> `*********3210`). For short phone numbers `<= 4` digits, nulls, or blanks, returns `****`.
- **Email Addresses**: Masks the username while preserving the domain (e.g. `alice@example.com` -> `al****@example.com`, `b@example.org` -> `b****@example.org`). Malformed or null emails return `****@masked.com`.
- **Zero Credential Leakage**: Password hashes, salt keys, and employee passcodes are completely excluded from all reporting queries.

---

## 2. API Endpoints Catalog

### 2.1 Executive & Operational Dashboard
- **`GET /api/v1/reports/dashboard/summary`**
  - **Query Params**: `branchId` (INT, optional), `refresh` (BOOLEAN, optional)
  - **Stored Procedure**: `dbo.usp_Report_ExecutiveDashboardSummary`
  - **Description**: Returns real-time KPI card metrics: today's gross sales, net sales, order counts, active tables, confirmed reservations, and low stock count.

### 2.2 Sales Reports
- **`GET /api/v1/reports/sales/daily`**
  - **Query Params**: `startDate`, `endDate`, `branchId`
  - **Stored Procedure**: `dbo.usp_Report_SalesDaily`
  - **Description**: Daily breakdown of gross revenue, discounts, taxes, net sales, refund totals, and Average Order Value (AOV).
- **`GET /api/v1/reports/sales/monthly`**
  - **Query Params**: `year`, `branchId`
  - **Stored Procedure**: `dbo.usp_Report_SalesMonthly`
  - **Description**: Monthly calendar sales trends.
- **`GET /api/v1/reports/sales/trends`**
  - **Query Params**: `interval` (`HOUR` | `DAY` | `WEEK` | `MONTH`), `startDate`, `endDate`, `branchId`
  - **Stored Procedure**: `dbo.usp_Report_SalesTrends`
  - **Description**: Granular time-series trend analysis.
- **`GET /api/v1/reports/sales/by-branch`** (Role: `SUPER_ADMIN`)
  - **Query Params**: `startDate`, `endDate`
  - **Stored Procedure**: `dbo.usp_Report_SalesByBranch`
  - **Description**: Comparative sales scorecard across physical branches.
- **`GET /api/v1/reports/sales/by-restaurant`** (Role: `SUPER_ADMIN`)
  - **Query Params**: `startDate`, `endDate`
  - **Stored Procedure**: `dbo.usp_Report_SalesByRestaurant`
  - **Description**: Enterprise portfolio sales rollup.
- **`GET /api/v1/reports/sales/by-item`**
  - **Query Params**: `startDate`, `endDate`, `branchId`, `categoryId`
  - **Stored Procedure**: `dbo.usp_Report_SalesByItem`
  - **Description**: Item sales volume, unit pricing, gross item revenue, and net contribution.
- **`GET /api/v1/reports/sales/by-category`**
  - **Query Params**: `startDate`, `endDate`, `branchId`
  - **Stored Procedure**: `dbo.usp_Report_SalesByCategory`
  - **Description**: Category-level sales distribution and percentage shares.

### 2.3 Revenue & Financial Reconciliation
- **`GET /api/v1/reports/revenue/summary`**
  - **Query Params**: `startDate`, `endDate`, `branchId`
  - **Stored Procedure**: `dbo.usp_Report_RevenueSummary`
  - **Description**: Reconciles Gross Sales, Net Sales, Collected Revenue, Refunds, and Net Revenue ($Collected - Refunds$).
- **`GET /api/v1/reports/revenue/by-payment-method`**
  - **Query Params**: `startDate`, `endDate`, `branchId`
  - **Stored Procedure**: `dbo.usp_Report_RevenueByPaymentMethod`
  - **Description**: Breakdown of collections across payment channels (`CASH`, `UPI`, `CREDIT_CARD`, `DEBIT_CARD`, `ONLINE_RAZORPAY`, `WALLET`).
- **`GET /api/v1/reports/revenue/refunds`**
  - **Query Params**: `startDate`, `endDate`, `branchId`
  - **Stored Procedure**: `dbo.usp_Report_RevenueRefunds`
  - **Description**: Audit ledger of all processed customer refunds.

### 2.4 Order & Dining Velocity
- **`GET /api/v1/reports/orders/summary`**
  - **Query Params**: `startDate`, `endDate`, `branchId`
  - **Stored Procedure**: `dbo.usp_Report_OrdersSummary`
  - **Description**: Order counts categorized by dining type (`DINE_IN`, `TAKEAWAY`, `DELIVERY`) and completion status.
- **`GET /api/v1/reports/orders/peak-hours`**
  - **Query Params**: `startDate`, `endDate`, `branchId`
  - **Stored Procedure**: `dbo.usp_Report_OrdersPeakHours`
  - **Description**: Hourly 0–23 kitchen load and ordering volume.
- **`GET /api/v1/reports/orders/top-items`**
  - **Query Params**: `startDate`, `endDate`, `branchId`, `topN` (default: 10), `sortBy` (`QUANTITY` | `REVENUE`)
  - **Stored Procedure**: `dbo.usp_Report_TopSellingItems`
  - **Description**: Pareto ranking of best-performing menu dishes.

### 2.5 Inventory & Operations
- **`GET /api/v1/reports/inventory/summary`**
  - **Query Params**: `branchId`
  - **Stored Procedure**: `dbo.usp_Report_InventoryCurrentStock`
  - **Description**: Real-time stock levels, units of measure, and reorder levels.
- **`GET /api/v1/reports/inventory/low-stock`**
  - **Query Params**: `branchId`
  - **Stored Procedure**: `dbo.usp_Report_InventoryLowStock`
  - **Description**: Urgent alert list of ingredients below safety thresholds.
- **`GET /api/v1/reports/inventory/transactions`**
  - **Query Params**: `startDate`, `endDate`, `branchId`, `ingredientId`, `transactionType`
  - **Stored Procedure**: `dbo.usp_Report_InventoryTransactions`
  - **Description**: Ingredient movement audit ledger.
- **`GET /api/v1/reports/inventory/valuation`**
  - **Query Params**: `branchId`
  - **Stored Procedure**: `dbo.usp_Report_InventoryValuation`
  - **Description**: Inventory asset valuation and category capital tie-up.
- **`GET /api/v1/reports/inventory/consumption`**
  - **Query Params**: `startDate`, `endDate`, `branchId`
  - **Stored Procedure**: `dbo.usp_Report_InventoryConsumption`
  - **Description**: Theoretical BOM ingredient usage vs. recorded inventory transactions.

### 2.6 Reservations & Guest Analytics
- **`GET /api/v1/reports/reservations/summary`**
  - **Query Params**: `startDate`, `endDate`, `branchId`
  - **Stored Procedure**: `dbo.usp_Report_ReservationSummary`
  - **Description**: Booking counts, total covers, completed seatings, and no-show rates.
- **`GET /api/v1/reports/reservations/trends`**
  - **Query Params**: `startDate`, `endDate`, `branchId`
  - **Stored Procedure**: `dbo.usp_Report_ReservationTrends`
  - **Description**: Booking velocity across days of week and time slots.
- **`GET /api/v1/reports/customers/summary`**
  - **Query Params**: `startDate`, `endDate`
  - **Stored Procedure**: `dbo.usp_Report_CustomerAnalytics`
  - **Description**: Customer acquisition, repeat guest ratios, and retention patterns.
- **`GET /api/v1/reports/customers/top-customers`** (Role: `SUPER_ADMIN`)
  - **Query Params**: `startDate`, `endDate`, `topN` (default: 20)
  - **Stored Procedure**: `dbo.usp_Report_CustomerTopSpenders`
  - **Description**: VIP guest ranking with phone numbers strictly masked to final 4 digits, email masked username prefix, completed orders count, total spent, and zero security hash leakage.

### 2.7 Multi-Branch & Multi-Unit Scorecards
- **`GET /api/v1/reports/branches/performance`** (Role: `SUPER_ADMIN`)
  - **Query Params**: `startDate`, `endDate`
  - **Stored Procedure**: `dbo.usp_Report_BranchPerformance`
  - **Description**: Multi-branch operational and financial performance scorecard built with independent CTEs (`TableAgg`, `OrderAgg`, `ReservationAgg`). Exposes separate counts for `TotalOrders`, `ValidOrders`, `CancelledOrders`, and `VoidedOrders`. Enforces consistent AOV calculation (`NetSales / ValidOrders`) and zero Cartesian multiplication across tables, orders, and reservations.
- **`GET /api/v1/reports/restaurants/performance`** (Role: `SUPER_ADMIN`)
  - **Query Params**: `startDate`, `endDate`
  - **Stored Procedure**: `dbo.usp_Report_RestaurantPerformance`
  - **Description**: High-level restaurant brand enterprise comparison. Exposes `ActiveBranches`, `TotalOrders`, `ValidOrders`, `CancelledOrders`, `VoidedOrders`, `NetSales`, and `ActiveCustomerBase` (distinct count of customers with valid orders in the period). Enforces identical active branch filtering (`b.IsDeleted = 0 AND b.IsActive = 1`) across all CTEs.

### 2.8 Streaming File Exports
- **`GET /api/v1/reports/export/:reportType`**
  - **Query Params**: `format` (`excel` | `csv` | `pdf`), `startDate`, `endDate`, `branchId`
  - **Supported Report Types**:
    - `sales-daily`: Daily sales log
    - `sales-monthly`: Monthly sales summary
    - `revenue-methods`: Collections by payment method
    - `revenue-refunds`: Processed refunds log
    - `orders-peak`: Peak dining hours
    - `top-items`: Best-selling items ranking
    - `inventory-stock`: Current inventory stock levels
    - `inventory-low`: Low stock alerts
    - `inventory-transactions`: Inventory transactions ledger
    - `inventory-valuation`: Inventory valuation report
    - `reservations-summary`: Reservation performance
    - `branch-performance`: Branch comparison scorecard
  - **Content-Types**:
    - `excel`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    - `csv`: `text/csv; charset=utf-8`
    - `pdf`: `application/pdf`

