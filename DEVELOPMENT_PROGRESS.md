# Restaurant Management System (RMS)
## Master Development Progress & Milestone Tracker

---

### Project Status Overview

- **Architecture Model**: **Microservices Architecture Only (14 Microservices, API Gateway, Redis, Socket.IO, Shared MSSQL Database, 100% Stored Procedures, Zero ORM)**
- **Current Milestone**: Phase 5 Restaurant Service & Floor Management Complete
- **Status**: **Phase 5 Complete (Ready for User Review before Phase 6 Menu Service)**
- **Next Milestone**: Phase 6 — Menu Service & Redis Catalog Caching ("86" Toggle)
- **Lead Architect**: Senior Microservices Architect & Full-Stack Lead

---

### Phase Execution Tracker (Microservices Roadmap)

| Phase # | Phase Title | Status | Completion Date | Sign-off Gate |
| :---: | :--- | :---: | :---: | :---: |
| **Phase 1** | Requirements & Domain Modeling | **COMPLETED** | **2026-11-08** | **Approved by User** |
| **Phase 2** | Database Architecture, 55 Tables, Indexes & Stored Procedures | **COMPLETED** | **2026-11-08** | **Executed by User** |
| **Phase 3** | Project Scaffold, Global .env, Docker Compose & API Gateway | **COMPLETED** | **2026-11-08** | **Approved by User** |
| **Phase 4** | Auth Service & User Service (JWT, RBAC, Profiles, PIN Login) | **COMPLETED** | **2026-11-10** | **Passed 20/20 Tests** |
| **Refactor**| Architecture Refactoring (Stored Procedures ONLY, Global DB Config) | **COMPLETED** | **2026-11-12** | **Approved by User** |
| **Phase 5** | Restaurant Service & Floor Management (Branches, Tables, Shifts) | **COMPLETED** | **2026-11-12** | **Passed 24/24 Tests** |
| **Phase 6** | Menu Service & Redis Catalog Caching ("86" Toggle) | *Planned* | - | Pending |
| **Phase 7** | Dynamic Website CMS Service & Public Customer Frontend | *Planned* | - | Pending |
| **Phase 8** | Cart Service & Order Service (Orchestrated Saga Engine) | *Planned* | - | Pending |
| **Phase 9** | Payment Service (Razorpay Gateway & Split Billing) | *Planned* | - | Pending |
| **Phase 10** | Kitchen Service & Notification Service (Real-time Socket.IO KDS) | *Planned* | - | Pending |
| **Phase 11** | Inventory Service & Recipe BOM Depletion | *Planned* | - | Pending |
| **Phase 12** | Reservation Service & Floor Scheduling | *Planned* | - | Pending |
| **Phase 13** | Report Service & Analytics Aggregator | *Planned* | - | Pending |
| **Phase 14** | Client Applications Integration (Customer, Admin, Kitchen, POS) | *Planned* | - | Pending |
| **Phase 15** | End-to-End Testing, Hardening, Nginx & Production Launch | *Planned* | - | Pending |

---

### Detailed Microservices Architecture Deliverables Checklist (Completed)

- [x] **Master Microservices Architecture Blueprint**:
  - `documentation/MICROSERVICES_ARCHITECTURE.md`: Complete topology, container names, ports (8000-8013), and single-responsibility domains.
  - `documentation/SYSTEM_ARCHITECTURE.md`: Updated to reflect microservices architecture, reverse proxy, and clean layered structure.
- [x] **Shared Database 55-Table Ownership Mapping**:
  - `documentation/MICROSERVICES_DATABASE_MAPPING.md`: Strict 1:1 table-to-service mapping across all 55 tables. Zero ambiguous ownership, zero cross-service SQL joins.
- [x] **HTTP REST Inter-Service Communication Specification**:
  - `documentation/SERVICE_COMMUNICATION.md`: Zero message brokers, Axios client standards, correlation IDs (`X-Correlation-ID`), internal auth keys (`X-Internal-Service-Key`), strict timeouts, retries, and circuit breakers.
- [x] **Single Global Environment Configuration**:
  - `documentation/GLOBAL_ENV_CONFIGURATION.md`: Centralized `.env` architecture; no service-level `.env` files.
  - `.env.example`: Master root template with all database, JWT, Redis, Razorpay, Cloudinary, port, and internal URL variables.
- [x] **API Gateway Architecture & Routing Design**:
  - `documentation/API_GATEWAY_DESIGN.md`: Complete ingress routing table, JWT/RBAC pre-checks, Redis rate limiting, and header decoration.
- [x] **Distributed Transaction Management (Saga Pattern)**:
  - `documentation/DISTRIBUTED_TRANSACTION_DESIGN.md`: Orchestrated Saga flow for order placement, stock deduction, payment, KOT generation, and compensating rollback endpoints.
- [x] **Microservices Engineering Roadmap**:
  - `documentation/MICROSERVICES_DEVELOPMENT_ROADMAP.md`: 15-phase delivery plan, acceptance criteria, and risk mitigation strategies.
- [x] **Dynamic Website CMS Specification**:
  - `documentation/DYNAMIC_CMS_DESIGN.md`: 100% database-driven customer website, reusable Section Component Registry, and Cloudinary media pipeline.
- [x] **Database Schema & Data Dictionary**:
  - `documentation/DATABASE_DESIGN.md`: Full 55-table catalog and data dictionary.
  - `documentation/ER_DIAGRAM.md`: Comprehensive Mermaid ER diagrams.

---

### Important Architectural Rules Observed
- No application backend or frontend code has been generated.
- No database scripts were modified or executed.
- No new database tables were created; all 55 existing tables were preserved and mapped to owning services.
- The shared database (`RestaurantManagementDB`) and single root `.env` are strictly preserved as primary project standards.

---

### Detailed Phase 3 Deliverables Checklist (Scaffolding & Infrastructure - Completed)

- [x] **Backend Folder Structure (14 Microservices + Shared Library)**:
  - `backend/shared`: Centralized shared library for global config loader, database pooling, Redis singleton, Winston logger, and inter-service HTTP client.
  - 14 microservice root folders created: `api-gateway`, `auth-service`, `user-service`, `restaurant-service`, `cms-service`, `menu-service`, `cart-service`, `order-service`, `payment-service`, `inventory-service`, `kitchen-service`, `reservation-service`, `notification-service`, `report-service`.
  - Every microservice contains isolated `controllers/`, `services/`, `models/`, and `routes/` scaffolding directories.
- [x] **Independent `package.json` for Every Microservice**:
  - Exactly 14 independent `package.json` configurations + `@rms/shared` + root workspace `package.json`.
  - Zero cross-service dependencies; each service defines only what it requires.
- [x] **Single Global Environment Policy (`.env`)**:
  - Root `.env` instantiated from template `.env.example`.
  - Zero service-level `.env` files introduced; `backend/shared/config/env.js` traverses directory tree to discover root environment.
- [x] **Shared Sequelize MSSQL Connection Tier**:
  - `backend/shared/config/database.js`: Configured for shared `RestaurantManagementDB` with connection pooling (`max: 20`, `min: 2`), `tedious` dialect, and `testDbConnection()` health probe.
- [x] **Shared Redis Client**:
  - `backend/shared/config/redis.js`: `ioredis` singleton with lazy connection, reconnection strategy, and `testRedisConnection()` health probe.
- [x] **Distributed Tracing & Structured Logging**:
  - `backend/shared/middlewares/correlationId.js`: Extracts or generates `X-Correlation-ID` (UUID v4) and forwards downstream.
  - `backend/shared/utils/logger.js`: Winston structured logger formatting logs with timestamp, service name, and correlation ID.
  - `backend/shared/middlewares/requestLogger.js`: Request duration and status logging.
- [x] **Mutual Service Authentication & Security Mesh**:
  - `backend/shared/middlewares/serviceAuth.js`: Validates `X-Internal-Service-Key` pre-shared token on inter-service REST calls.
  - `backend/shared/utils/httpClient.js`: Pre-configured Axios instance with automatic correlation ID injection and internal service key headers.
- [x] **Universal JSON Response Envelopes**:
  - `backend/shared/utils/response.js`: `successResponse` and `errorResponse` adhering to `SERVICE_COMMUNICATION.md`.
  - `backend/shared/middlewares/errorHandler.js`: Global error handling middleware.
- [x] **API Gateway Ingress Architecture (Port 8000)**:
  - `backend/api-gateway/src/app.js`: Express app mounting Helmet, CORS, and rate limiting.
  - `backend/api-gateway/src/middlewares/authGuard.js`: Centralized JWT verification and public route whitelist bypass (`/health(/*)?` unauthenticated).
  - `backend/api-gateway/src/middlewares/rbacGuard.js`: Role-based access control pre-checks.
  - `backend/api-gateway/src/proxy/serviceProxy.js`: Reverse proxy forwarding to 13 domain microservices with header decoration (`X-Correlation-ID`, `X-Internal-Service-Key`, `X-User-ID`, `X-User-Role`, `X-Branch-ID`).
  - `backend/api-gateway/src/routes/health.js`: Dedicated `/health/live` (process liveness), `/health/ready` (Redis readiness probe & downstream aggregator), and `/health` endpoints.
- [x] **Separate Liveness & Readiness Probes (All 14 Microservices)**:
  - `GET /health/live`: Process liveness probe verifying Node.js event loop, uptime, and memory consumption (RSS, Heap). Returns HTTP 200 with status `UP`.
  - `GET /health/ready`: Dependency readiness probe verifying mandatory connections (MSSQL on port 1435, Redis on port 6379). Strict enforcement: never masks failure with HTTP 200 in development; returns HTTP 503 `DOWN` when any required dependency is unavailable.
  - `GET /health`: General health check delegating to readiness check for backward compatibility with standard load balancers.
  - Standardized JSON envelope across all 14 services adhering to `SERVICE_COMMUNICATION.md`.
- [x] **Real-Time WebSocket Hub (`notification-service` Port 8012)**:
  - `backend/notification-service/src/socket/index.js`: Socket.IO server with room segmentation (`role:kitchen`, `role:pos`, `role:admin`, `table:{id}`, `order:{id}`).
  - `backend/notification-service/src/routes/internal.js`: HTTP REST endpoint `POST /api/v1/notifications/internal/broadcast` allowing domain services to dispatch live WebSocket pushes without message brokers.
- [x] **Containerization & Master Docker Compose**:
  - `docker-compose.yml`: Master composition orchestrating 14 microservice containers, Microsoft SQL Server 2022, Redis 7 Alpine, and Nginx.
  - 14 production-ready `Dockerfile` configurations (Node.js 20 LTS Alpine with EXPOSE 8000–8013).
  - `infrastructure/nginx/nginx.conf`: Nginx ingress reverse proxy forwarding HTTP REST to API Gateway (:8000) and WebSockets to Notification Service (:8012).
  - `infrastructure/redis/redis.conf`: Redis production memory limits and LRU eviction policy.
- [x] **Quality & Codebase Verification**:
  - 100% of generated JavaScript files (60 of 60) verified with zero syntax errors via `node.exe --check` / `vm.Script`.
  - Zero business logic, zero models, zero database modifications implemented, adhering strictly to Phase 3 boundaries.
- [x] **Live Database & Infrastructure Audit (Verified on Port 8000 Series)**:
  - **SQL Server (`RestaurantManagementDB`)**: Authenticated successfully via Sequelize `tedious` driver on `localhost:1435` (`Kishore\SQLDEV`).
  - **Read-Only Verification Query**: Executed `SELECT 1 AS TestValue, DB_NAME() AS CurrentDB, @@SERVERNAME AS ServerName, (SELECT count(*) FROM sys.tables) AS TableCount` -> Verified `CurrentDB: RestaurantManagementDB`, confirmed **55 database tables** present on named instance `Kishore\SQLDEV`.
  - **Redis Cache**: Verified connected on `localhost:6379`, `PING` returned `PONG`.
  - **All 14 Microservices Dual Probe Verification**: 100% healthy and responding HTTP 200 via `scripts/verify-health.js`:
    - `api-gateway` (:8000): **Live: UP (200)** | **Ready: UP (200)** (Redis CONNECTED)
    - `auth-service` (:8001): **Live: UP (200)** | **Ready: UP (200)** (DB CONNECTED)
    - `user-service` (:8002): **Live: UP (200)** | **Ready: UP (200)** (DB CONNECTED)
    - `restaurant-service` (:8003): **Live: UP (200)** | **Ready: UP (200)** (DB CONNECTED)
    - `cms-service` (:8004): **Live: UP (200)** | **Ready: UP (200)** (DB CONNECTED, Redis CONNECTED)
    - `menu-service` (:8005): **Live: UP (200)** | **Ready: UP (200)** (DB CONNECTED, Redis CONNECTED)
    - `cart-service` (:8006): **Live: UP (200)** | **Ready: UP (200)** (DB CONNECTED, Redis CONNECTED)
    - `order-service` (:8007): **Live: UP (200)** | **Ready: UP (200)** (DB CONNECTED)
    - `payment-service` (:8008): **Live: UP (200)** | **Ready: UP (200)** (DB CONNECTED)
    - `inventory-service` (:8009): **Live: UP (200)** | **Ready: UP (200)** (DB CONNECTED)
    - `kitchen-service` (:8010): **Live: UP (200)** | **Ready: UP (200)** (DB CONNECTED)
    - `reservation-service` (:8011): **Live: UP (200)** | **Ready: UP (200)** (DB CONNECTED)
    - `notification-service` (:8012): **Live: UP (200)** | **Ready: UP (200)** (DB CONNECTED)
    - `report-service` (:8013): **Live: UP (200)** | **Ready: UP (200)** (Stateless Aggregator)

---

### Detailed Phase 2 Deliverables Checklist (Completed)

- [x] **Database Requirement Synthesis**: Synthesized requirements across all 28 requested modules plus operations (KOT, Shift Sessions, BOM recipes).
- [x] **Database Engine & Settings Configuration**:
  - `database/01_CreateDatabase.sql`: Database creation, UTF-8 collation, RCSI (`READ_COMMITTED_SNAPSHOT ON`), Snapshot Isolation, and async statistics.
- [x] **44 Normalized Tables Created**:
  - `database/02_CreateTables.sql`: Full DDL with Primary Keys, NOT NULL constraints, historical price snapshots, soft deletion columns, and strict SQL Server data types.
- [x] **Referential Integrity & Constraints Configured**:
  - `database/03_CreateRelationships.sql`: All Foreign Keys isolated with explicit cascade and `NO ACTION` rules to prevent multiple cascade paths in MSSQL.
- [x] **Performance Indexing Strategy**:
  - `database/04_CreateIndexes.sql`: Non-clustered and filtered indexes (`WHERE IsDeleted = 0`) on all foreign keys, status fields, search slugs, and date ranges.
- [x] **Realistic Development Seed Data**:
  - `database/05_SeedData.sql`: Realistic seed data covering restaurants, branches, 6 roles, granular permissions, staff, table layout, menu taxonomy, variants, addons, suppliers, raw ingredients, and recipe BOM.
- [x] **Mission-Critical Stored Procedures**:
  - `database/06_StoredProcedures.sql`:
    1. `sp_PlaceOrderWithBOMDepletion` (Atomic transaction: order + KOT + recipe inventory deduction)
    2. `sp_SettlePaymentAndCompleteOrder` (Atomic payment verification, table status transition, order completion)
    3. `sp_OpenCashRegisterShift` (Float tracking)
    4. `sp_CloseCashRegisterShift` (Float balancing & Z-report over/short calculation)
    5. `sp_CheckTableAvailability` (Reservation slot conflict prevention)
    6. `sp_GetPublicPageWithSections` (High-speed single-roundtrip query for public website pages & banners)
    7. `sp_ReorderPageSections` (Atomic drag-and-drop section reordering)
    8. `sp_SubmitContactMessage` (Inbound guest contact inquiry + staff notification trigger)
- [x] **Master Architectural Documentation**:
  - `documentation/DATABASE_DESIGN.md`: Complete Data Dictionary, 55-table inventory, and referential rules.
  - `documentation/ER_DIAGRAM.md`: Comprehensive domain ER diagrams rendered in Mermaid syntax.
  - `documentation/DYNAMIC_CMS_DESIGN.md`: Full architectural specification for dynamic website content management, Cloudinary asset pipeline, and section component registry.
- [x] **Dynamic Website CMS Module (55 Tables Total)**:
  - 11 Dynamic CMS tables added to `database/02_CreateTables.sql` (`WebsiteSettings`, `SEOSettings`, `WebsitePages`, `WebsitePageSections`, `WebsiteBanners`, `NavigationMenus`, `FooterSections`, `FAQs`, `Testimonials`, `SocialMediaLinks`, `ContactMessages`).
  - Referential foreign keys appended to `database/03_CreateRelationships.sql`.
  - Filtered and non-clustered performance indexes appended to `database/04_CreateIndexes.sql`.
  - Cloudinary asset metadata attributes (`Url` + `PublicId`) supported across all CMS media entities.
  - Development seed data appended to `database/05_SeedData.sql` for homepage banners, navigation, sections, FAQs, testimonials, and footer.

---

### Phase 2 Database Validation Report

- **Circular Foreign Key Checks**: Verified. The bi-directional relationship between `RestaurantTables` and `Orders` was decoupled: `RestaurantTables.ActiveOrderId` is maintained as a soft indexed reference without an enforced cascading constraint, while `Orders.TableId` enforces strict referential integrity.
- **Multiple Cascade Paths**: Verified. SQL Server throws error 1785 if multiple cascade paths exist. All parent-child chains (`Orders` -> `OrderItems` -> `OrderItemAddons`, `MenuItems` -> `MenuItemVariants`) have unique cascade paths, while cross-cutting lookups (`BranchId`, `UserId`) utilize `ON DELETE NO ACTION` or `SET NULL`.
- **Historical Price Preservation**: Verified. `OrderItems` and `OrderItemAddons` store `ItemNameSnapshot`, `VariantNameSnapshot`, `UnitPrice`, and `AddonNameSnapshot` alongside original entity IDs.
- **Monetary Precision**: Verified. All prices, taxes, discounts, and payments use `DECIMAL(10,2)`. All recipe ingredient quantities and stock balances use `DECIMAL(12,4)`.
- **Soft Delete Support**: Verified. All master tables incorporate `IsDeleted BIT NOT NULL DEFAULT 0` and `DeletedAt DATETIME2(3) NULL`. Filtered indexes are applied where appropriate.

---

## Phase 4 & Architecture Refactoring – Stored Procedures & Global DB Configuration (Completed)

**Status:** **PHASE 4 & REFACTORING COMPLETE – 100% STORED PROCEDURES, ALL 20 TESTS PASSED**  
**Verification Date:** November 12, 2026  
**Active Test Runner:** `scripts/test_phase4.js`  
**Microservices Dual-Probe Audit:** `scripts/verify_all_services_startup.js` (14/14 Services Healthy)  
**Database Stored Procedures:** `database/07_AuthUserStoredProcedures.sql` (23 Stored Procedures Deployed)  
**API Documentation:** [`RMS_Phase4_API_Documentation.md`](file:///c:/Projects/restaurant-management-system/restaurant-management-system/documentation/RMS_Phase4_API_Documentation.md)  
**Security Implementation Report:** [`RMS_Phase4_Security_Report.md`](file:///c:/Projects/restaurant-management-system/restaurant-management-system/documentation/RMS_Phase4_Security_Report.md)  
**Postman Collection:** [`RMS_Phase4_Auth_User_Collection.json`](file:///c:/Projects/restaurant-management-system/restaurant-management-system/documentation/postman/RMS_Phase4_Auth_User_Collection.json)  

### 1. Database Table Ownership & Stored Procedures Mapping (Zero ORM)

| Microservice | Port | Owned Database Tables | Database Access Implementation | Stored Procedures Mapped |
| :--- | :---: | :--- | :--- | :--- |
| **`auth-service`** | **8001** | `dbo.Roles`<br>`dbo.Permissions`<br>`dbo.RolePermissions`<br>`dbo.UserRoles` | `auth.repository.js` -> `executeProcedure()` via `@rms/shared` | `usp_Auth_GetUserRolesAndPermissions`<br>`usp_Auth_AssignRole`<br>`usp_Auth_GetAllRoles` |
| **`user-service`** | **8002** | `dbo.Users`<br>`dbo.Employees`<br>`dbo.CustomerAddresses`<br>`dbo.AuditLogs` | `user.repository.js`<br>`customerAddress.repository.js`<br>`employee.repository.js`<br>`audit.repository.js` | `usp_User_GetByEmailOrPhone`<br>`usp_User_GetById`<br>`usp_User_Create`<br>`usp_User_CheckExists`<br>`usp_User_UpdateProfile`<br>`usp_User_UpdateLastLogin`<br>`usp_User_SetStatus`<br>`usp_User_GetPinAuth`<br>`usp_CustomerAddress_Create`<br>`usp_CustomerAddress_GetByUserId`<br>`usp_CustomerAddress_GetById`<br>`usp_CustomerAddress_Update`<br>`usp_CustomerAddress_Delete`<br>`usp_Employee_Create`<br>`usp_Employee_GetById`<br>`usp_Employee_GetByUserId`<br>`usp_Employee_List`<br>`usp_Employee_Update`<br>`usp_Employee_UpdateStatus`<br>`usp_AuditLog_Create` |
| **`api-gateway`** | **8000** | Reverse Proxy Ingress Router | N/A | Centralized JWT validation, Redis token blacklist checks, caller header decoration (`X-User-ID`, `X-User-Role`, `X-Branch-ID`). |

### 2. Microservice Layered Architecture Standard (All 14 Services)

Every microservice strictly follows the standard 4-tier clean architecture:
`HTTP Request -> Routes -> Controller -> Service -> Repository -> executeProcedure() -> SQL Server Stored Procedure`

Standardized directory structure enforced across all 14 services:
`src/controllers/`, `src/services/`, `src/repositories/`, `src/routes/`, `src/middleware/`, `src/validators/`, `src/utils/`, `src/app.js`, `src/index.js`, `package.json`.

All Sequelize models and ORM dependencies (`sequelize`, `tedious` inside service packages) have been removed. Database connectivity is managed exclusively by the singleton connection pool in `backend/shared/config/database.js` (`mssql` package).

### 3. Comprehensive Automated Verification Test Results (20/20 Passed via Stored Procedures)

```
================================================================
  RMS PHASE 4: AUTH & USER MICROSERVICES VERIFICATION SUITE
================================================================
[✅ PASS] Test 01: Successful customer registration
         ↳ Registered userId: 13, status: 201
[✅ PASS] Test 02: Duplicate email registration rejection
         ↳ Expected 409 Conflict, received: 409 (EMAIL_ALREADY_EXISTS)
[✅ PASS] Test 03: Successful customer login
         ↳ Logged in successfully, received fresh tokens
[✅ PASS] Test 04: Incorrect password rejection
         ↳ Expected 401 INVALID_CREDENTIALS, received: 401 (INVALID_CREDENTIALS)
[✅ PASS] Test 05: Invalid access token rejection
         ↳ Expected 401, received: 401 (INVALID_TOKEN)
[✅ PASS] Test 06: Expired access token rejection
         ↳ Expected 401 TOKEN_EXPIRED, received: 401 (TOKEN_EXPIRED)
[✅ PASS] Test 07: Successful refresh token rotation
         ↳ Old token rotated, new accessToken & refreshToken issued
[✅ PASS] Test 08: Reused refresh token rejection (Reuse Detection)
         ↳ Expected 403 TOKEN_REUSE_DETECTED, received: 403 (TOKEN_REUSE_DETECTED)
[✅ PASS] Test 09: Logout and token revocation (Blacklist)
         ↳ Token blacklisted in Redis; subsequent probe returned 401 TOKEN_REVOKED
[✅ PASS] Test 10: Staff login (Authorization & Verification)
         ↳ Customer denied (403), Admin authenticated successfully with SUPER_ADMIN role
[✅ PASS] Test 11: Successful POS PIN login
         ↳ Employee EMP-BLR-002 authenticated via 4-digit PIN for Branch 1
[✅ PASS] Test 12: Five incorrect PIN attempts tracking
         ↳ Recorded 4 consecutive failed attempts with decrementing retry counter
[✅ PASS] Test 13: Two-minute PIN lockout enforcement
         ↳ 5th failure locked account (HTTP 423 PIN_LOCKED, retryAfter: 120s)
[✅ PASS] Test 14: Role-based access control (RBAC)
         ↳ Customer denied access to /staff (403), Admin granted access (200)
[✅ PASS] Test 15: Permission-based authorization validation
         ↳ Verified 16 granular permissions bound to session (STAFF.MANAGE)
[✅ PASS] Test 16: Branch-level access restrictions
         ↳ Disallowed POS PIN login to branch 99 for employee assigned to branch 1
[✅ PASS] Test 17: Customer profile retrieval
         ↳ Profile fetched cleanly with zero sensitive credential exposure
[✅ PASS] Test 18: Customer profile update
         ↳ Updated firstName to 'Aarav-Updated', verified in response
[✅ PASS] Test 19: Customer address CRUD (Single Default Enforcement)
         ↳ Created 2 addresses, verified single default toggle, updated, soft deleted
[✅ PASS] Test 20: Staff management CRUD (Create, Filter, Update, Terminate)
         ↳ Created EMP-BLR-008, filtered, updated salary, terminated with user sync

================================================================
  TEST SUMMARY
================================================================
  Total Tests Run: 20
  Passed:          20 / 20
  Failed:          0
================================================================
🎉 ALL 20 TEST REQUIREMENTS PASSED WITH 100% SUCCESS!
```

### 4. Microservices Dual-Probe Health Audit (14/14 UP)

Verified via `scripts/verify_all_services_startup.js`:
- `api-gateway` (:8000): **Live: UP (200)** | **Ready: UP (200)** (Redis Healthy)
- `auth-service` (:8001): **Live: UP (200)** | **Ready: UP (200)** (DB Healthy)
- `user-service` (:8002): **Live: UP (200)** | **Ready: UP (200)** (DB Healthy)
- `restaurant-service` (:8003): **Live: UP (200)** | **Ready: UP (200)** (DB Healthy)
- `cms-service` (:8004): **Live: UP (200)** | **Ready: UP (200)** (DB Healthy, Redis Healthy)
- `menu-service` (:8005): **Live: UP (200)** | **Ready: UP (200)** (DB Healthy, Redis Healthy)
- `cart-service` (:8006): **Live: UP (200)** | **Ready: UP (200)** (DB Healthy, Redis Healthy)
- `order-service` (:8007): **Live: UP (200)** | **Ready: UP (200)** (DB Healthy)
- `payment-service` (:8008): **Live: UP (200)** | **Ready: UP (200)** (DB Healthy)
- `inventory-service` (:8009): **Live: UP (200)** | **Ready: UP (200)** (DB Healthy)
- `kitchen-service` (:8010): **Live: UP (200)** | **Ready: UP (200)** (DB Healthy)
- `reservation-service` (:8011): **Live: UP (200)** | **Ready: UP (200)** (DB Healthy)
- `notification-service` (:8012): **Live: UP (200)** | **Ready: UP (200)** (DB Healthy)
- `report-service` (:8013): **Live: UP (200)** | **Ready: UP (200)** (Stateless Aggregator)

---

### Architectural Boundaries Observed
- Zero modifications made to `database/01` through `06` SQL scripts or pre-existing seed data.
- Completely removed all Sequelize ORM dependencies, models, and files.
- Pure Stored Procedures execution for all SQL Server database operations.
- Single global database pool in `backend/shared/config/database.js` and single root `.env`.
- Standardized directory structure across all 14 microservices.
- No cross-service direct table queries; mutual REST integration with `X-Internal-Service-Key` used exclusively.

---

## Phase 5 – Restaurant Service & Floor Management (Completed)

**Status:** **PHASE 5 COMPLETE – ALL 24 TEST REQUIREMENTS PASSED (100% SUCCESS)**  
**Verification Date:** November 12, 2026  
**Active Test Runner:** `scripts/test_phase5.js`  
**Microservices Dual-Probe Audit:** `scripts/verify_all_services_startup.js` (14/14 Services Healthy)  
**Database Stored Procedures:** `database/08_RestaurantFloorStoredProcedures.sql` (27 Stored Procedures Deployed)  
**API Documentation:** [`RMS_Phase5_API_Documentation.md`](file:///c:/Projects/restaurant-management-system/restaurant-management-system/documentation/RMS_Phase5_API_Documentation.md)  

### 1. Database Table Ownership & Stored Procedures Mapping (Zero ORM)

| Microservice | Port | Owned Database Tables | Database Access Implementation | Stored Procedures Mapped |
| :--- | :---: | :--- | :--- | :--- |
| **`restaurant-service`** | **8003** | `dbo.Restaurants`<br>`dbo.Branches`<br>`dbo.DiningSections`<br>`dbo.RestaurantTables` | `restaurant.repository.js`<br>`branch.repository.js`<br>`diningSection.repository.js`<br>`diningTable.repository.js` | `usp_Restaurant_Create`<br>`usp_Restaurant_Update`<br>`usp_Restaurant_GetById`<br>`usp_Restaurant_List`<br>`usp_Restaurant_SetStatus`<br>`usp_Branch_Create`<br>`usp_Branch_Update`<br>`usp_Branch_GetById`<br>`usp_Branch_List`<br>`usp_Branch_SetStatus`<br>`usp_DiningSection_Create`<br>`usp_DiningSection_Update`<br>`usp_DiningSection_GetById`<br>`usp_DiningSection_ListByBranch`<br>`usp_DiningSection_SetStatus`<br>`usp_DiningTable_Create`<br>`usp_DiningTable_Update`<br>`usp_DiningTable_GetById`<br>`usp_DiningTable_GetByQrHash`<br>`usp_DiningTable_ListByBranch`<br>`usp_DiningTable_ListBySection`<br>`usp_DiningTable_UpdateCapacity`<br>`usp_DiningTable_UpdateStatus`<br>`usp_DiningTable_GetAvailable`<br>`usp_DiningTable_GetOccupied`<br>`usp_DiningTable_Delete`<br>`usp_Floor_GetLayout`<br>`sp_CheckTableAvailability` |
| **`api-gateway`** | **8000** | Reverse Proxy Ingress Router | N/A | Ingress routes mounted: `/api/v1/restaurants`, `/api/v1/branches`, `/api/v1/sections`, `/api/v1/tables`, `/api/v1/shifts`. Public whitelist: `/api/v1/tables/qr/:hash`. |

### 2. Comprehensive Automated Verification Test Results (24/24 Passed via Stored Procedures)

```
================================================================
  RMS PHASE 5: RESTAURANT SERVICE & FLOOR MANAGEMENT SUITE
================================================================
[✅ PASS] Test 01: Service Health Liveness probe
[✅ PASS] Test 02: Service Readiness probe & DB connectivity
[✅ PASS] Test 03: Unauthorized access rejection (Missing Token -> 401)
[✅ PASS] Test 04: Role-based access rejection (Customer Token -> 403)
[✅ PASS] Test 05: Invalid restaurant input handling (Validation Error -> 400)
[✅ PASS] Test 06: Invalid branch input handling (Validation Error -> 400)
[✅ PASS] Test 07: Invalid table status rejection (Validation Error -> 400)
[✅ PASS] Test 08: Existing seed restaurant verification (Antigravity Gourmet Bistro)
[✅ PASS] Test 09: Existing seed branch & sections verification (Indiranagar Flagship, 3 sections)
[✅ PASS] Test 10: Existing seed tables verification (8 tables T-01 to BAR-02)
[✅ PASS] Test 11: Restaurant CRUD - Create restaurant (201 Created)
[✅ PASS] Test 12: Restaurant CRUD - Update & status toggle (200 OK)
[✅ PASS] Test 13: Restaurant CRUD - List with pagination (200 OK)
[✅ PASS] Test 14: Branch CRUD - Create branch (201 Created)
[✅ PASS] Test 15: Branch CRUD - Update & status toggle (200 OK)
[✅ PASS] Test 16: Dining Section CRUD (Create, Update, List) (201 & 200 OK)
[✅ PASS] Test 17: Dining Table CRUD - Create table with QR Code (201 Created)
[✅ PASS] Test 18: Dining Table CRUD - Update details & capacity (200 OK)
[✅ PASS] Test 19: Table availability & capacity filtering (200 OK)
[✅ PASS] Test 20: Table status lifecycle transitions (AVAILABLE -> OCCUPIED -> BILLED -> CLEANING -> AVAILABLE)
[✅ PASS] Test 21: Customer public QR table scan (Unauthenticated 200 OK)
[✅ PASS] Test 22: Floor Management & 2D visual floor plan (KPIs + Sections + Coordinates)
[✅ PASS] Test 23: Dining table soft deletion (200 OK, soft-deleted)
[✅ PASS] Test 24: Direct microservice port 8003 execution (200 OK)
================================================================
  TEST SUMMARY: 24 Passed / 0 Failed (100% Success Rate)
================================================================
🎉 ALL 24 PHASE 5 TEST REQUIREMENTS PASSED WITH 100% SUCCESS!
```

---

### Phase 5 Scope Boundaries Observed
- Zero modifications made to `database/01` through `07` SQL scripts or pre-existing seed data.
- Pure Stored Procedures execution for all SQL Server database operations.
- Single global database pool in `backend/shared/config/database.js` and single root `.env`.
- No Sequelize ORM or models used.
- Real-time notification integration via internal HTTP broadcast to `notification-service`.
- Phase 6 (Menu Service & Redis Catalog Caching) has been completed and verified. Awaiting user review and sign-off before Phase 7.

---

## Phase 6 – Menu Service & Redis Catalog Caching (Completed)

**Status:** **PHASE 6 COMPLETE – ALL 36 TEST REQUIREMENTS PASSED (100% SUCCESS)**  
**Verification Date:** November 14, 2026  
**Active Test Runner:** `scripts/test_phase6.js` (36/36 Passed)  
**Regression Test Runners:** `scripts/test_phase5.js` (24/24 Passed), `scripts/test_phase4.js` (20/20 Passed)  
**Microservices Dual-Probe Audit:** `scripts/verify_all_services_startup.js` (14/14 Services Healthy)  
**Database Stored Procedures:** `database/09_MenuStoredProcedures.sql` (33 Stored Procedures Deployed)  
**API Documentation:** [`RMS_Phase6_API_Documentation.md`](file:///c:/Projects/restaurant-management-system/restaurant-management-system/documentation/RMS_Phase6_API_Documentation.md)  

### 1. Database Table Ownership & Stored Procedures Mapping (Zero ORM)

| Microservice | Port | Owned Database Tables | Database Access Implementation | Stored Procedures Mapped |
| :--- | :---: | :--- | :--- | :--- |
| **`menu-service`** | **8005** | `dbo.Categories`<br>`dbo.MenuItems`<br>`dbo.MenuItemVariants`<br>`dbo.MenuItemImages`<br>`dbo.AddonGroups`<br>`dbo.AddonItems`<br>`dbo.MenuItemAddonGroups` | `category.repository.js`<br>`menuItem.repository.js`<br>`addon.repository.js` | `usp_Category_Create`<br>`usp_Category_Update`<br>`usp_Category_GetById`<br>`usp_Category_ListByBranch`<br>`usp_Category_SetStatus`<br>`usp_Category_Delete`<br>`usp_MenuItem_Create`<br>`usp_MenuItem_Update`<br>`usp_MenuItem_GetById`<br>`usp_MenuItem_ListByBranch`<br>`usp_MenuItem_SetAvailability`<br>`usp_MenuItem_UpdatePricing`<br>`usp_MenuItem_Delete`<br>`usp_MenuItemVariant_Create`<br>`usp_MenuItemVariant_Update`<br>`usp_MenuItemVariant_SetAvailability`<br>`usp_MenuItemVariant_Delete`<br>`usp_MenuItemVariant_ListByItem`<br>`usp_MenuItemImage_Add`<br>`usp_MenuItemImage_Delete`<br>`usp_MenuItemImage_SetPrimary`<br>`usp_MenuItemImage_ListByItem`<br>`usp_AddonGroup_Create`<br>`usp_AddonGroup_Update`<br>`usp_AddonGroup_GetById`<br>`usp_AddonGroup_ListByBranch`<br>`usp_AddonGroup_LinkToMenuItem`<br>`usp_AddonGroup_UnlinkFromMenuItem`<br>`usp_AddonItem_Create`<br>`usp_AddonItem_Update`<br>`usp_AddonItem_SetAvailability`<br>`usp_AddonItem_Delete`<br>`usp_Menu_GetCatalogByBranch` |
| **`api-gateway`** | **8000** | Reverse Proxy Ingress Router | N/A | Ingress routes mounted: `/api/v1/menu`. Public whitelist: `/api/v1/menu/public(...)`. RBAC enforcement: `/api/v1/menu/admin(...)` restricted to `SUPER_ADMIN` and `RESTAURANT_MANAGER`. |

### 2. Redis Catalog Caching & Invalidation Architecture

- **Catalog Cache Key Pattern**: `menu:catalog:branch:{branchId}:all` and `menu:catalog:branch:{branchId}:cat:{categoryId}`.
- **Cache Strategy**: Look-aside with 15-minute (900 seconds) TTL.
- **Cache Header**: Ingress returns `X-Cache-Status: HIT` or `X-Cache-Status: MISS`.
- **Automatic Cache Invalidation**: Every mutation (creating/updating/deleting categories, menu items, portion variants, addon groups, addon items, pricing adjustments, or "86" availability toggles) automatically purges corresponding branch cache keys via `invalidateBranchMenuCache(branchId)`.
- **Administrative Flush**: Dedicated endpoint `POST /api/v1/menu/admin/cache/purge` allows instant manual cache eviction.

### 3. Comprehensive Automated Verification Test Results (36/36 Passed)

```
================================================================
  RMS PHASE 6: MENU SERVICE & REDIS CATALOG CACHING SUITE
================================================================
--- GROUP 1: HEALTH & READINESS PROBES ---
[✅ PASS] Test 01: Menu Service Liveness Probe (/health/live)
[✅ PASS] Test 02: Menu Service Readiness Probe (/health/ready: DB & Redis)

--- GROUP 2: CATEGORY MANAGEMENT ---
[✅ PASS] Test 03: Create Category (POST /api/v1/menu/categories)
[✅ PASS] Test 04: Get Category by ID (GET /api/v1/menu/categories/:id)
[✅ PASS] Test 05: Update Category (PUT /api/v1/menu/categories/:id)
[✅ PASS] Test 06: List Categories by Branch (GET /api/v1/menu/categories?branchId=1)
[✅ PASS] Test 07: Toggle Category Active Status (PATCH /api/v1/menu/categories/:id/status)

--- GROUP 3: MENU ITEM MANAGEMENT ---
[✅ PASS] Test 08: Create Menu Item (POST /api/v1/menu/items)
[✅ PASS] Test 09: Get Menu Item by ID with Multi-Recordset (GET /api/v1/menu/items/:id)
[✅ PASS] Test 10: Update Menu Item (PUT /api/v1/menu/items/:id)
[✅ PASS] Test 11: List Menu Items with Filters (GET /api/v1/menu/items?branchId=1&dietaryType=VEG)
[✅ PASS] Test 12: Menu Item Availability "86" Toggle by Chef (PATCH /api/v1/menu/items/:id/availability)
[✅ PASS] Test 13: Single Item Pricing Update (PATCH /api/v1/menu/items/:id/pricing)
[✅ PASS] Test 14: Bulk Pricing Update (POST /api/v1/menu/items/pricing/bulk)

--- GROUP 4: MENU VARIANTS MANAGEMENT ---
[✅ PASS] Test 15: Create Menu Variant (POST /api/v1/menu/items/:id/variants)
[✅ PASS] Test 16: Update Menu Variant (PUT /api/v1/menu/items/variants/:variantId)
[✅ PASS] Test 17: Toggle Variant Availability (PATCH /api/v1/menu/items/variants/:variantId/availability)

--- GROUP 5: MENU IMAGES MANAGEMENT ---
[✅ PASS] Test 18: Add Image to Menu Item (POST /api/v1/menu/items/:id/images)
[✅ PASS] Test 19: List Images for Menu Item (GET /api/v1/menu/items/:id/images)

--- GROUP 6: ADDON GROUPS & ADDON ITEMS ---
[✅ PASS] Test 20: Create Addon Group (POST /api/v1/menu/addons/groups)
[✅ PASS] Test 21: Create Addon Item (POST /api/v1/menu/addons/groups/:id/items)
[✅ PASS] Test 22: Link Addon Group to Menu Item (POST /api/v1/menu/items/:id/addons/:groupId)
[✅ PASS] Test 23: Toggle Addon Item Availability (PATCH /api/v1/menu/addons/items/:id/availability)

--- GROUP 7: REDIS CATALOG CACHING & PUBLIC ACCESS ---
[✅ PASS] Test 24: Public Catalog Access - Cache MISS (GET /api/v1/menu/public/catalog/1)
[✅ PASS] Test 25: Public Catalog Access - Cache HIT (GET /api/v1/menu/public/catalog/1)
[✅ PASS] Test 26: Automatic Redis Cache Invalidation on Mutation (Cache MISS after 86 toggle)
[✅ PASS] Test 27: Public Categories Lookup (GET /api/v1/menu/public/categories/1)
[✅ PASS] Test 28: Public Item Details Lookup (GET /api/v1/menu/public/items/:id)

--- GROUP 8: SECURITY & RBAC ENFORCEMENT ---
[✅ PASS] Test 29: Unauthenticated Mutate Rejected (401 Unauthorized)
[✅ PASS] Test 30: Waitstaff Role Forbidden from Creating Menu Items (403 Forbidden)
[✅ PASS] Test 31: Chef Forbidden from Updating Prices (403 Forbidden)

--- GROUP 9: VALIDATION & ERROR HANDLING ---
[✅ PASS] Test 32: Invalid Dietary Type Rejected (400 Bad Request)
[✅ PASS] Test 33: Negative Base Price Rejected (400 Bad Request)
[✅ PASS] Test 34: Non-existent Item Lookup Returns 404

--- CLEANUP & SOFT DELETE ---
[✅ PASS] Test 35: Soft Delete Menu Item (DELETE /api/v1/menu/items/:id)
[✅ PASS] Test 36: Soft Deleted Item Inaccessible via API (404 Not Found)

================================================================
  TEST SUMMARY: 36 Passed / 0 Failed (100% Success Rate)
================================================================
🎉 ALL 36 PHASE 6 TEST REQUIREMENTS PASSED WITH 100% SUCCESS!
```

---

### Phase 6 Scope Boundaries Observed
- Zero modifications made to `database/01` through `08` SQL scripts or pre-existing seed data.
- Pure Stored Procedures execution for all SQL Server database operations (`database/09_MenuStoredProcedures.sql`).
- All stored procedures deployed with `SET ANSI_NULLS ON` and `SET QUOTED_IDENTIFIER ON` to support filtered indexes (`WHERE IsDeleted = 0`).
- Single global database pool in `backend/shared/config/database.js` and single root `.env`.
- No Sequelize ORM or models used.
- Complete 4-tier architecture in `backend/menu-service/`.
- Redis caching for customer menu catalog with automatic cache eviction on mutations.
- Phase 7 has **not** been started. Awaiting user review and sign-off.




