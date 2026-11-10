# Restaurant Management System (RMS)
## Master Microservices Engineering Roadmap & Delivery Plan

---

### 1. Phased Microservices Delivery Architecture

To manage cognitive load, minimize integration risk, and guarantee independent service verification, development is structured into **15 sequential, test-driven phases**:

```mermaid
gantt
    title Microservices Engineering Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1-2: Foundations
    Phase 1: Architecture, Requirements & Roadmap       :done, p1, 2026-11-08, 2026-11-08
    Phase 2: Database Architecture, 55 Tables & Stored Procs :done, p2, 2026-11-08, 2026-11-08
    section Phase 3-5: Core Services
    Phase 3: Scaffold, Global ENV, Gateway & Docker     :active, p3, 2026-11-09, 4d
    Phase 4: Auth Service & User Service (JWT/RBAC)      :p4, after p3, 4d
    Phase 5: Restaurant Service (Tables & Shifts)       :p5, after p4, 3d
    section Phase 6-7: Catalog & CMS
    Phase 6: Menu Service & Redis Catalog Cache          :p6, after p5, 4d
    Phase 7: CMS Service & Customer Web Storefront       :p7, after p6, 5d
    section Phase 8-10: Ordering & Finance
    Phase 8: Cart Service & Order Service (Saga Core)   :p8, after p7, 5d
    Phase 9: Payment Service (Razorpay & Split Bills)   :p9, after p8, 4d
    Phase 10: Kitchen Service & Notification Socket.IO  :p10, after p9, 4d
    section Phase 11-13: Ops & Analytics
    Phase 11: Inventory Service & Recipe BOM Depletion   :p11, after p10, 4d
    Phase 12: Reservation Service & Floor Scheduling    :p12, after p11, 3d
    Phase 13: Report Service & Executive Intelligence   :p13, after p12, 3d
    section Phase 14-15: Client Apps & Launch
    Phase 14: Client Portals Integration (POS, KDS, Admin) :p14, after p13, 6d
    Phase 15: E2E Testing, Nginx Hardening & Launch     :p15, after p14, 4d
```

---

### 2. Detailed Milestone Breakdown & Deliverables

#### Phase 1: Architecture, Requirements & Domain Modeling (COMPLETED)
- Comprehensive functional and non-functional requirements across all 28 modules.
- User personas and 6-tier RBAC permission matrix.
- Initial operational workflows and sequence diagrams.

#### Phase 2: Database Architecture, 55 Tables, Indexes, Seed Data & Stored Procedures (COMPLETED)
- 55 normalized tables created in `RestaurantManagementDB` across 25 business modules.
- Foreign keys, filtered indexes (`WHERE IsDeleted = 0`), and UTF-8 collation configured.
- Enterprise development seed data populated.
- 8 mission-critical stored procedures compiled (`sp_PlaceOrderWithBOMDepletion`, `sp_SettlePaymentAndCompleteOrder`, `sp_OpenCashRegisterShift`, `sp_CloseCashRegisterShift`, `sp_CheckTableAvailability`, `sp_GetPublicPageWithSections`, `sp_ReorderPageSections`, `sp_SubmitContactMessage`).

#### Phase 3: Project Scaffold, Global Environment, Docker Compose & API Gateway
- **Target Deliverables**:
  - Root directory folder scaffolding (`backend/*`, `frontend/*`, `infrastructure/*`).
  - Creation of live `.env` from [`.env.example`](file:///c:/Projects/restaurant-management-system/restaurant-management-system/.env.example).
  - `docker-compose.yml` defining all 14 microservices, Nginx, Redis, and MSSQL connectivity.
  - `api-gateway` scaffold (Port 8000): routing table, correlation ID middleware, Redis rate limiter, CORS, and health-check endpoint (`GET /health`).
- **Acceptance Criteria**: Running `docker compose up` starts Gateway, Redis, and returns 200 OK on `/health`.

#### Phase 4: Auth Service & User Service
- **Target Deliverables**:
  - `auth-service` (Port 8001): JWT access/refresh token generation, bcrypt password hashing, POS 4-digit PIN authentication.
  - `user-service` (Port 8002): Profile CRUD, staff HR records, delivery addresses, system audit logs.
  - Inter-service REST communication between Auth and User services with `X-Correlation-ID`.
- **Acceptance Criteria**: Admin and staff can register, log in, rotate tokens, and access protected routes.

#### Phase 5: Restaurant Service & Floor Management
- **Target Deliverables**:
  - `restaurant-service` (Port 8003): Multi-branch CRUD, dining sections, table layout with canvas coordinates, QR hash generation, table status transitions, and cash register shifts.
- **Acceptance Criteria**: Scanning a table QR hash returns branch and table metadata; register shifts record opening floats and closing balances.

#### Phase 6: Menu Service & Redis Catalog Caching
- **Target Deliverables**:
  - `menu-service` (Port 8005): Categories, menu items, gallery images, variants, addon groups & items, and real-time "86" availability toggling.
  - Redis cache layer (`menu:catalog`) with instant cache invalidation upon menu updates.
- **Acceptance Criteria**: Public catalog query responds in < 30ms from Redis; "86" toggling immediately invalidates cache.

#### Phase 7: Dynamic Website CMS Service & Customer Web Storefront
- **Target Deliverables**:
  - `cms-service` (Port 8004): 100% dynamic website content management (branding, hero banners, modular page sections, FAQs, testimonials, social links, SEO metadata, contact messages).
  - Cloudinary image asset upload signing.
  - Customer frontend (`frontend/customer-app`): Dynamic page renderer and reusable Section Component Registry.
- **Acceptance Criteria**: Modifying homepage banners in CMS updates the customer website without touching React code.

#### Phase 8: Cart Service & Order Service (Saga Orchestration Core)
- **Target Deliverables**:
  - `cart-service` (Port 8006): Shopping cart sessions for table QR diners and online customers.
  - `order-service` (Port 8007): Omnichannel order ingestion (`DINE_IN`, `TAKEAWAY`, `DELIVERY`), tax/discount calculation, and REST-based Saga orchestrator.
- **Acceptance Criteria**: Submitting an order reserves stock in Inventory and transitions order through the FSM state machine.

#### Phase 9: Payment Service (Razorpay & Split Billing)
- **Target Deliverables**:
  - `payment-service` (Port 8008): Razorpay order creation, HMAC SHA256 signature verification, webhook handler, offline settlement (`CASH`, `CARD`, `UPI`), and split billing calculations.
- **Acceptance Criteria**: Webhook successfully verifies payment signature and calls `order-service` to mark order `PAID`.

#### Phase 10: Kitchen Service & Notification Service (Real-Time Socket.IO KDS)
- **Target Deliverables**:
  - `kitchen-service` (Port 8010): KOT generation, station routing, line-item cooking progress, ticket bump actions.
  - `notification-service` (Port 8012): Socket.IO server broadcasting live events (`kot:new`, `order:status_update`, `waiter:pickup_call`).
  - Kitchen frontend (`frontend/kitchen-app`): Dark mode KDS interface with live urgency timers.
- **Acceptance Criteria**: Placing an order renders a new ticket on the KDS screen in < 200ms via WebSockets.

#### Phase 11: Inventory Service & Recipe BOM Depletion
- **Target Deliverables**:
  - `inventory-service` (Port 8009): Raw ingredient catalog, Bill of Materials (BOM) linkage to dishes/variants, automated stock depletion, stock restitution on order voids, spoilage tracking, and supplier purchase orders.
- **Acceptance Criteria**: Preparing an order automatically decrements ingredients; canceling an order restitute ingredients.

#### Phase 12: Reservation Service & Table Availability
- **Target Deliverables**:
  - `reservation-service` (Port 8011): Table booking, slot conflict check, guest party size capacity validation, and auto-release logic.
- **Acceptance Criteria**: Double-booking a table during an active reservation window is rejected with HTTP 409 Conflict.

#### Phase 13: Report Service & Executive Intelligence
- **Target Deliverables**:
  - `report-service` (Port 8013): Daily sales summaries, payment method breakdowns, menu velocity analysis, inventory valuation, and Excel/PDF export pipelines.
- **Acceptance Criteria**: Generated reports reconcile with settled payments in `payment-service`.

#### Phase 14: Frontend Client Applications Integration
- **Target Deliverables**:
  - `admin-app` (:3001): Ant Design executive console (Menu CRUD, CMS editor, Inventory, Staff, Reports).
  - `staff-pos-app` (:3003): Touchscreen POS terminal (Table floor map, Quick order pad, Split billing modal).
  - `kitchen-app` (:3002): KDS monitor interface.
  - `customer-app` (:3000): Mobile QR dine-in ordering, cart drawer, Razorpay checkout, live tracker.

#### Phase 15: End-to-End Testing, Hardening, Nginx & Production Launch
- **Target Deliverables**:
  - Automated integration test suite covering the full Order-to-Payment Saga.
  - Nginx configuration with reverse proxy routing, gzip compression, and SSL termination.
  - Docker Compose production profiles with restart policies and health checks.

---

### 3. Microservices Risk Management Matrix

| Risk Scenario | Probability | Impact | Architectural Mitigation |
| :--- | :---: | :---: | :--- |
| **1. Inter-Service HTTP Latency** | Medium | High | Strict 5s request timeouts, Redis caching for hot reads (Menu, CMS), and non-blocking asynchronous WebSocket broadcasts. |
| **2. Partial Saga Failure (Order Placed but Payment Fails)** | Medium | Critical | Orchestrated Saga with compensating REST transactions: `order-service` calls `inventory-service/bom/restitute` to replenish stock if payment fails. |
| **3. Shared DB Connection Pool Exhaustion** | Medium | High | Every microservice pool is configured with `min: 2, max: 20` connections. Total max connections across 14 services = 280, safely within SQL Server's capacity (32,767 connections). |
| **4. Network Partition / Downstream Service Outage** | Low | High | Circuit breaker pattern fails fast after 5 consecutive errors, preventing gateway thread starvation. |
| **5. Duplicate Requests from Client Retries** | High | Critical | `X-Idempotency-Key` header enforced and checked against Redis for all state-changing endpoints. |
| **6. Socket.IO Client Disconnection on Tablets** | High | Medium | Client-side auto-reconnection with exponential backoff and missed-ticket state resynchronization on reconnect. |

