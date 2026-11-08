# Restaurant Management System (RMS)
## Master Development Progress & Milestone Tracker

---

### Project Status Overview

- **Architecture Model**: **Microservices Architecture Only (14 Microservices, API Gateway, Redis, Socket.IO, Shared MSSQL Database)**
- **Current Milestone**: Phase 3 Infrastructure & Project Scaffolding Complete
- **Status**: **Phase 3 Complete (Ready for User Review before Phase 4 Auth Service)**
- **Next Milestone**: Phase 4 — Auth Service & User Service (JWT, RBAC, Profiles, PIN Login)
- **Lead Architect**: Senior Microservices Architect & Full-Stack Lead

---

### Phase Execution Tracker (Microservices Roadmap)

| Phase # | Phase Title | Status | Completion Date | Sign-off Gate |
| :---: | :--- | :---: | :---: | :---: |
| **Phase 1** | Requirements & Domain Modeling | **COMPLETED** | **2026-11-08** | **Approved by User** |
| **Phase 2** | Database Architecture, 55 Tables, Indexes & Stored Procedures | **COMPLETED** | **2026-11-08** | **Executed by User** |
| **Phase 3** | Project Scaffold, Global .env, Docker Compose & API Gateway | **COMPLETED** | **2026-11-08** | **Awaiting User Review** |
| **Phase 4** | Auth Service & User Service (JWT, RBAC, Profiles, PIN Login) | *Planned* | - | Pending |
| **Phase 5** | Restaurant Service & Floor Management (Branches, Tables, Shifts) | *Planned* | - | Pending |
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
  - `documentation/MICROSERVICES_ARCHITECTURE.md`: Complete topology, container names, ports (5000-5013), and single-responsibility domains.
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
- [x] **API Gateway Ingress Architecture (Port 5000)**:
  - `backend/api-gateway/src/app.js`: Express app mounting Helmet, CORS, and rate limiting.
  - `backend/api-gateway/src/middlewares/authGuard.js`: Centralized JWT verification and public route whitelist bypass.
  - `backend/api-gateway/src/middlewares/rbacGuard.js`: Role-based access control pre-checks.
  - `backend/api-gateway/src/proxy/serviceProxy.js`: Reverse proxy forwarding to 13 domain microservices with header decoration (`X-Correlation-ID`, `X-Internal-Service-Key`, `X-User-ID`, `X-User-Role`, `X-Branch-ID`).
  - `backend/api-gateway/src/routes/health.js`: Health check probe aggregating Redis and downstream service availability.
- [x] **Real-Time WebSocket Hub (`notification-service` Port 5012)**:
  - `backend/notification-service/src/socket/index.js`: Socket.IO server with room segmentation (`role:kitchen`, `role:pos`, `role:admin`, `table:{id}`, `order:{id}`).
  - `backend/notification-service/src/routes/internal.js`: HTTP REST endpoint `POST /api/v1/notifications/internal/broadcast` allowing domain services to dispatch live WebSocket pushes without message brokers.
- [x] **Containerization & Master Docker Compose**:
  - `docker-compose.yml`: Master composition orchestrating 14 microservice containers, Microsoft SQL Server 2022, Redis 7 Alpine, and Nginx.
  - 14 production-ready `Dockerfile` configurations (Node.js 20 LTS Alpine).
  - `infrastructure/nginx/nginx.conf`: Nginx ingress reverse proxy forwarding HTTP REST to API Gateway (:5000) and WebSockets to Notification Service (:5012).
  - `infrastructure/redis/redis.conf`: Redis production memory limits and LRU eviction policy.
- [x] **Quality & Codebase Verification**:
  - 100% of generated JavaScript files (60 of 60) verified with zero syntax errors via `node.exe --check` / `vm.Script`.
  - Zero business logic, zero models, zero database modifications implemented, adhering strictly to Phase 3 boundaries.

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

### Important Restrictions Observed
- No backend Express application code has been generated.
- No React frontend code has been created.
- Razorpay payment SDK has not been integrated yet.
- No destructive SQL commands were executed against the live server.
- Database scripts have been authored, validated, and placed in the `database/` directory ready for deployment.
