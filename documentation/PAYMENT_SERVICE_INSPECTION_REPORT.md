# Restaurant Management System (RMS)
## Phase 9: Payment Service — Codebase & Database Inspection Report

**Document Reference:** `documentation/PAYMENT_SERVICE_INSPECTION_REPORT.md`  
**Date:** November 15, 2026  
**Author:** Senior Microservices Architect, Node.js Backend Developer & SQL Server Database Architect  
**Status:** **INSPECTION COMPLETE — IMPLEMENTATION PLANNING STAGE**  

---

### 1. Executive Summary

In preparation for **Phase 9 – Payment Service**, a comprehensive architectural inspection of the existing codebase, microservice scaffolding, configuration files, and SQL Server database schema was conducted.

The Restaurant Management System (RMS) operates under a pure microservices architecture with a shared Microsoft SQL Server database (`RestaurantManagementDB` on `localhost:1435`), centralized API Gateway on port `8000`, single root `.env` configuration, and **zero ORM / 100% Stored Procedure** database access policy.

This inspection establishes the exact state of existing payment-related components, identifies architectural gaps, audits database tables and procedures, and forms the foundation for the Phase 9 implementation plan.

---

### 2. Codebase Inspection (`backend/payment-service/`)

#### 2.1 File Inventory
Inspection of `backend/payment-service/` revealed the foundational scaffolding created during Phase 3 infrastructure setup:

```
backend/payment-service/
├── Dockerfile
├── package.json
└── src/
    ├── app.js
    ├── index.js
    ├── middleware/
    │   └── index.js          (Stub: module.exports = {})
    ├── repositories/
    │   └── index.js          (Stub: module.exports = {})
    ├── routes/
    │   └── health.js         (Fully functional dual liveness/readiness probes)
    ├── utils/
    │   └── index.js          (Stub: module.exports = {})
    └── validators/
        └── index.js          (Stub: module.exports = {})
```

#### 2.2 Dependency Audit (`package.json`)
The `package.json` for Payment Service is pre-configured with necessary production dependencies:
- `razorpay` (`^2.9.5`): Official Razorpay Node.js SDK for order creation and refunds.
- `express` (`^4.21.2`): HTTP REST API server framework.
- `helmet` (`^8.0.0`): HTTP security header hardening.
- `cors` (`^2.8.5`): Cross-Origin Resource Sharing.
- `uuid` (`^11.0.5`): Unique reference generation.
- `winston` (`^3.17.0`): Structured logging.
- `axios` (`^1.7.9`): Inter-service HTTP requests.
- `tedious` (`^18.6.1`): Microsoft SQL Server TDS dialect driver.
- `dotenv` (`^16.4.7`): Environment configuration loader.

#### 2.3 Application & Lifecycle Inspection (`src/app.js` & `src/index.js`)
- **Port Allocation**: Configured to run on port `8008` via `@rms/shared` (`config.ports.paymentService`).
- **Middleware Pipeline**: Configured with Helmet, CORS, Correlation ID injection (`correlationIdMiddleware`), structured request logging (`createRequestLogger`), JSON payload parsing (`express.json()`), URL encoding (`express.urlencoded()`), and universal error handling (`errorHandler`).
- **Health Probes**: `src/routes/health.js` implements standardized health endpoints:
  - `/health/live`: Process liveness probe verifying uptime and memory consumption.
  - `/health/ready` & `/health`: Readiness probe verifying live database connectivity via `testDbConnection()`.
- **Process Management**: Graceful shutdown handling for `SIGTERM` and `SIGINT` with 10-second force-kill safeguard.

#### 2.4 Gaps & Missing Components in `backend/payment-service`
1. **Controllers**: No controller implementations exist (`payment.controller.js`, `refund.controller.js`, `webhook.controller.js`).
2. **Services**: No domain services exist (`payment.service.js`, `razorpay.service.js`, `refund.service.js`, `reconciliation.service.js`).
3. **Repositories**: `src/repositories/index.js` is an empty stub. No repositories exist to invoke stored procedures (`payment.repository.js`, `transaction.repository.js`, `refund.repository.js`).
4. **Routes**: No API routes exist (`payment.routes.js`, `refund.routes.js`, `webhook.routes.js`).
5. **Validators**: `src/validators/index.js` is empty. No request payload validation schemas exist for payment intent, signature verification, offline settlement, or refund requests.
6. **Webhook Signature Verification**: Missing HMAC SHA-256 signature verification middleware for raw Razorpay webhook bodies.
7. **Idempotency Safeguards**: Missing Redis-backed duplicate request prevention for webhook captures and offline settlement requests.

---

### 3. API Gateway Routing & Security Inspection

Inspection of `backend/api-gateway/src/config/gatewayConfig.js`:
- **Routing Ingress**:
  ```javascript
  {
    prefix: '/api/v1/payments',
    target: config.urls.paymentService, // http://localhost:8008
    name: 'payment-service',
  }
  ```
- **Public Route Whitelist**:
  ```javascript
  /^\/api\/v1\/payments\/razorpay\/webhook$/
  ```
  The Razorpay webhook endpoint is already registered in `publicRoutePatterns`, allowing Razorpay webhook servers to deliver asynchronous event payloads without a JWT bearer token.
- **RBAC Rules**:
  While the webhook is public, customer and staff routes under `/api/v1/payments` require role governance:
  - Customer operations (`/api/v1/payments/razorpay/create-order`, `/api/v1/payments/razorpay/verify`): Allowed for `CUSTOMER`, `WAITSTAFF`, `CASHIER_POS`, `RESTAURANT_MANAGER`, `SUPER_ADMIN`.
  - Staff settlement operations (`/api/v1/payments/offline-settle`): Restricted to `CASHIER_POS`, `RESTAURANT_MANAGER`, `SUPER_ADMIN`.
  - Refund operations (`/api/v1/payments/refund`): Restricted to `RESTAURANT_MANAGER`, `SUPER_ADMIN`.
  - Financial reports (`/api/v1/payments/reports/*`): Restricted to `RESTAURANT_MANAGER`, `SUPER_ADMIN`.

---

### 4. Configuration & Secrets Inspection

Inspection of root `.env`, `.env.example`, and `backend/shared/config/env.js`:
- **Port**: `PORT_PAYMENT_SERVICE=8008` (Configured in root `.env`).
- **Service URL**: `URL_PAYMENT_SERVICE=http://localhost:8008`.
- **Razorpay Configuration**:
  - Root `.env` contains:
    ```ini
    RAZORPAY_KEY_ID=rzp_test_your_key_id
    RAZORPAY_KEY_SECRET=your_razorpay_key_secret
    RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
    ```
  - `backend/shared/config/env.js` maps these directly into the exportable `config.razorpay` object:
    ```javascript
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    }
    ```
- **Security Requirement**: Secrets and signatures must never be logged or echoed in API responses.

---

### 5. Database Schema & Stored Procedure Audit

A direct query against `RestaurantManagementDB` metadata and inspection of `database/01` through `database/12` SQL scripts was performed.

#### 5.1 Owned Database Tables
Per `documentation/MICROSERVICES_DATABASE_MAPPING.md`, Phase 9 exclusively owns 3 database tables:

1. **`dbo.Payments` (Table 31)**:
   - Primary Key: `PaymentId BIGINT IDENTITY(1,1)`
   - Unique Key: `UQ_Payments_Reference (PaymentReference NVARCHAR(60))`
   - Foreign Keys:
     - `FK_Payments_Orders` -> `dbo.Orders(OrderId)` (`NO ACTION`)
     - `FK_Payments_Branches` -> `dbo.Branches(BranchId)` (`NO ACTION`)
     - `FK_Payments_Users_SettledBy` -> `dbo.Users(UserId)` (`NO ACTION`, nullable)
   - Columns: `PaymentId`, `OrderId`, `BranchId`, `PaymentReference`, `PaymentMethod`, `Amount`, `GatewayOrderId`, `GatewayPaymentId`, `GatewaySignature`, `PaymentStatus`, `SettledByUserId`, `SettledAt`, `CreatedAt`, `UpdatedAt`.
   - Existing Indexes:
     - `IX_Payments_OrderId` on `(OrderId, PaymentStatus)` INCLUDE `(PaymentReference, Amount, PaymentMethod)`
     - `IX_Payments_GatewayOrderId` on `(GatewayOrderId)` WHERE `GatewayOrderId IS NOT NULL`
     - `IX_Payments_GatewayPaymentId` on `(GatewayPaymentId)` WHERE `GatewayPaymentId IS NOT NULL`

2. **`dbo.PaymentTransactions` (Table 32)**:
   - Primary Key: `TransactionId BIGINT IDENTITY(1,1)`
   - Foreign Key: `FK_PaymentTransactions_Payments` -> `dbo.Payments(PaymentId)` (`CASCADE`)
   - Columns: `TransactionId`, `PaymentId`, `TransactionType` (`CHARGE`, `WEBHOOK_CAPTURE`, `REFUND`), `Amount`, `GatewayTransactionId`, `GatewayResponseCode`, `GatewayPayloadJson`, `Status` (`SUCCESS`, `FAILED`), `TransactionDate`.

3. **`dbo.PaymentRefunds` (Table 33)**:
   - Primary Key: `RefundId BIGINT IDENTITY(1,1)`
   - Foreign Keys:
     - `FK_PaymentRefunds_Payments` -> `dbo.Payments(PaymentId)` (`NO ACTION`)
     - `FK_PaymentRefunds_Users` -> `dbo.Users(InitiatedByUserId)` (`NO ACTION`)
   - Columns: `RefundId`, `PaymentId`, `GatewayRefundId`, `RefundAmount`, `Reason`, `Status` (`INITIATED`, `PROCESSED`, `FAILED`), `InitiatedByUserId`, `ProcessedAt`, `CreatedAt`.

#### 5.2 Audit of Existing Stored Procedures
Querying `INFORMATION_SCHEMA.ROUTINES` revealed exactly **one** existing stored procedure referencing payments:
- `dbo.sp_SettlePaymentAndCompleteOrder` (authored in `database/06_StoredProcedures.sql` line 226).

**Critical Architectural Finding Regarding `sp_SettlePaymentAndCompleteOrder`:**
- This procedure was created in Phase 2 as a monolithic prototype.
- **Architectural Violation**: It directly updates `dbo.Orders(PaymentStatus, OrderStatus)`, modifies `dbo.RestaurantTables(CurrentStatus, ActiveOrderId)`, inserts into `dbo.OrderStatusHistory`, and creates `dbo.Payments`.
- Under our microservices architecture, cross-service database writes violate domain boundaries:
  - `order-service` owns `dbo.Orders` and `dbo.OrderStatusHistory`.
  - `restaurant-service` owns `dbo.RestaurantTables`.
  - `payment-service` owns `dbo.Payments`.
- Furthermore, `sp_SettlePaymentAndCompleteOrder` does not handle:
  - Razorpay order creation (`PENDING` intent)
  - Signature verification and capture
  - Payment failure recording
  - Webhook payload logging in `dbo.PaymentTransactions`
  - Refund processing (full or partial) in `dbo.PaymentRefunds`
  - Multi-criteria payment lookups, pagination, or financial reconciliation reporting.

**Conclusion**: Phase 9 requires authoring a clean, dedicated, microservice-aligned Stored Procedure script:
`database/13_PaymentStoredProcedures.sql` (12 dedicated procedures).

---

### 6. Existing Order Service Integration Audit

Inspection of `backend/order-service/`:
- `dbo.Orders` maintains a `PaymentStatus NVARCHAR(30) NOT NULL DEFAULT 'PENDING'`.
- Status values supported: `'PENDING'`, `'PARTIALLY_PAID'`, `'PAID'`, `'REFUNDED'`.
- Currently, `order-service` does NOT expose a dedicated HTTP route to update `PaymentStatus` independently of `OrderStatus`.
- **Architectural Solution for Phase 9**:
  - `order-service` should expose: `PATCH /api/v1/orders/:orderId/payment-status` (secured via `X-Internal-Service-Key`).
  - When `payment-service` verifies an online payment, receives a webhook, or settles cash, it invokes this REST endpoint to synchronize `Orders.PaymentStatus`.
  - If an order is paid in full and is in state `SERVED` or `READY`, `order-service` can advance the order to `COMPLETED` and release the dining table.

---

### 7. Inspection Findings & Action Plan Summary

| Component | Current State | Required Phase 9 Action |
| :--- | :--- | :--- |
| **`backend/payment-service`** | Scaffolding only; health check operational | Implement repositories, services, controllers, validators, and routes |
| **Database Tables** | `Payments`, `PaymentTransactions`, `PaymentRefunds` exist with indexes and FKs | Tables verified 100%; no DDL changes needed |
| **Stored Procedures** | Only monolithic `sp_SettlePaymentAndCompleteOrder` exists | Author 12 specialized stored procedures in `database/13_PaymentStoredProcedures.sql` |
| **Razorpay SDK** | Installed in `package.json`; keys in `.env` | Integrate SDK in `razorpay.service.js` for order creation and refunds |
| **Webhook Processing** | Gateway whitelist exists; service logic missing | Implement signature verification, transaction logging, idempotency |
| **Order Service Mesh** | No dedicated payment status sync endpoint | Design REST contract for `order-service` payment status synchronization |
| **Security & RBAC** | Basic gateway routing in place | Implement strict role gates and credential masking in logs |

---

*End of Payment Service Inspection Report. Proceed to `PAYMENT_DATABASE_DESIGN.md`.*

