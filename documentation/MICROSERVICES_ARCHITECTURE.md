# Restaurant Management System (RMS)
## Master Microservices Architecture Specification

---

### 1. Executive Architectural Blueprint

The **Restaurant Management System (RMS)** backend is engineered exclusively as a **Microservices Architecture**. The system decomposes complex restaurant operations into **14 loosely coupled, independently deployable, single-responsibility services** orchestrated through an **API Gateway** and an **HTTP REST communication fabric**, backed by a single shared Microsoft SQL Server database with strict logical table ownership boundaries and a shared Redis caching/state tier.

```mermaid
flowchart TB
    subgraph ClientLayer["Frontend Client Applications (React.js + Ant Design)"]
        direction LR
        CUST["Customer Web App\n(:3000)"]
        ADMIN["Admin Dashboard\n(:3001)"]
        KDS["Kitchen Display (KDS)\n(:3002)"]
        POS["Staff / POS App\n(:3003)"]
    end

    subgraph Ingress["Edge & Gateway Tier"]
        NGINX["Nginx Reverse Proxy\n(:80 / :443)"]
        GATEWAY["API Gateway Service\n(Node.js / Express :8000)\n• JWT Verification & RBAC\n• Rate Limiting & Helmet\n• Request Correlation IDs\n• Reverse Proxy Routing"]
    end

    subgraph ServiceMesh["Microservices Domain Mesh (HTTP REST Inter-Service Fabric)"]
        AUTH_SVC["Auth Service\n(:8001)"]
        USER_SVC["User Service\n(:8002)"]
        REST_SVC["Restaurant Service\n(:8003)"]
        CMS_SVC["CMS Service\n(:8004)"]
        MENU_SVC["Menu Service\n(:8005)"]
        CART_SVC["Cart Service\n(:8006)"]
        ORDER_SVC["Order Service\n(:8007)"]
        PAY_SVC["Payment Service\n(:8008)"]
        INV_SVC["Inventory Service\n(:8009)"]
        KITCHEN_SVC["Kitchen Service\n(:8010)"]
        RES_SVC["Reservation Service\n(:8011)"]
        NOTIF_SVC["Notification Service\n(:8012 / Socket.IO)"]
        REP_SVC["Report Service\n(:8013)"]
    end

    subgraph InfraTier["Shared Infrastructure & Data Tier"]
        REDIS[("Redis Cache & Store\n(:6379)\n• CMS Cache & Menu Cache\n• Rate Limiting Buckets\n• Session / Cart Cache")]
        MSSQL[("Microsoft SQL Server 2022\n'RestaurantManagementDB'\n(:1433)\n(55 Normalized Tables with\nStrict Service Table Ownership)")]
        CLOUDINARY["Cloudinary Media CDN\n(Image Transformations)"]
        RAZORPAY["Razorpay Payment Gateway\n(Webhooks & Settlement)"]
    end

    ClientLayer --> NGINX
    NGINX --> GATEWAY
    ClientLayer <-->|WebSockets WSS| NOTIF_SVC

    GATEWAY --> AUTH_SVC & USER_SVC & REST_SVC & CMS_SVC & MENU_SVC & CART_SVC & ORDER_SVC & PAY_SVC & INV_SVC & KITCHEN_SVC & RES_SVC & NOTIF_SVC & REP_SVC

    ORDER_SVC <-->|HTTP REST| MENU_SVC & INV_SVC & KITCHEN_SVC & PAY_SVC & NOTIF_SVC
    CART_SVC <-->|HTTP REST| MENU_SVC
    PAY_SVC <-->|HTTP REST| ORDER_SVC & NOTIF_SVC
    RES_SVC <-->|HTTP REST| REST_SVC & NOTIF_SVC
    REP_SVC <-->|HTTP REST| ORDER_SVC & PAY_SVC & INV_SVC

    CMS_SVC <--> CLOUDINARY
    PAY_SVC <--> RAZORPAY

    CMS_SVC & MENU_SVC & CART_SVC & GATEWAY <--> REDIS
    ServiceMesh -->|Stored Procedures Only\n(Shared Global DB Pool)| MSSQL
```

---

### 2. Microservice Inventory, Port Allocation & Responsibilities

Each microservice runs in its own Node.js runtime process, maintains its own isolated `package.json`, source tree, repositories, services, controllers, routes, and validation schemas, and listens on a dedicated port:

| # | Microservice Name | Container Name | Port | Primary Domain Responsibilities |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **API Gateway** | `rms-api-gateway` | `8000` | Ingress traffic routing, centralized JWT authentication verification, RBAC role guard enforcement, IP rate limiting, CORS headers, correlation ID injection (`X-Correlation-ID`), downstream error translation, and service health aggregation. |
| **2** | **Auth Service** | `rms-auth-service` | `8001` | Customer registration, credential verification, JWT access & refresh token issuance and rotation, password hashing (`bcrypt`), POS 4-digit PIN verification, password reset tokens, and service-to-service internal auth tokens. |
| **3** | **User Service** | `rms-user-service` | `8002` | User profiles, employee records, roles & permission mapping, staff designations, customer addresses, emergency contacts, and administrative user management. |
| **4** | **Restaurant Service** | `rms-restaurant-service`| `8003` | Multi-branch management, branch operating hours, dining sections, table layout coordinates (`PosX`, `PosY`), QR code hash generation, table status transitions (`Available`, `Occupied`, `Cleaning`), and POS cash register shift balancing (`OpeningFloat`, `ExpectedCash`, `ActualCash`, Z-reports). |
| **5** | **CMS Service** | `rms-cms-service` | `8004` | 100% dynamic website content management: website settings, branding, logos, hero banners, dynamic page sections (`HERO_SLIDER`, `ABOUT_STORY`, `STATS_COUNTER`), navigation menus, multi-column footers, FAQs, testimonials, social links, SEO tags, Cloudinary image asset upload signing, and guest contact inquiries. |
| **6** | **Menu Service** | `rms-menu-service` | `8005` | Food category taxonomy, menu items, dish pricing, tax rates, dietary tags (`VEG`, `NON_VEG`, `VEGAN`), gallery images, size variants (`Regular`, `Large`), addon groups & items, and real-time "86" out-of-stock toggling with Redis cache invalidation. |
| **7** | **Cart Service** | `rms-cart-service` | `8006` | Persistent shopping carts for guest table sessions (QR code diners) and authenticated users, cart item quantities, addon choices, live subtotal computation, and cart expiration lifecycle. |
| **8** | **Order Service** | `rms-order-service` | `8007` | Omnichannel order lifecycle orchestration (`DINE_IN`, `TAKEAWAY`, `DELIVERY`), order placement, tax & service charge calculation, historical price snapshotting, order status transitions (`PLACED` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED` -> `COMPLETED`), promotional coupons & discount validations, and distributed Saga coordination. |
| **9** | **Payment Service** | `rms-payment-service` | `8008` | Razorpay order creation, payment checkout verification via HMAC SHA256 cryptographic signatures, asynchronous payment webhook ingestion, offline tender settlement (`CASH`, `CARD`, `UPI`), split billing calculations, and refund processing. |
| **10**| **Inventory Service** | `rms-inventory-service`| `8009` | Raw material ingredients catalog, metric units of measure (`KG`, `LITER`, `PIECE`), stock balances, reorder level warnings, multi-level Recipe Bill of Materials (BOM) linking dishes/variants to ingredient consumption, automated stock depletion, stock restitution on voided orders, spoilage logging, and supplier purchase orders. |
| **11**| **Kitchen Service** | `rms-kitchen-service` | `8010` | Kitchen Display System (KDS) operations, Kitchen Order Ticket (KOT) generation, station routing (`MAIN_KITCHEN`, `GRILL`, `BAR`, `DESSERT`), line-item cooking checklist status (`COOKING`, `READY`), cooking urgency timers, and ticket bump events. |
| **12**| **Reservation Service** | `rms-reservation-service`| `8011` | Table reservation scheduling, timeslot capacity and party size conflict prevention, deposit tracking, guest check-in, and auto-release policies. |
| **13**| **Notification Service** | `rms-notification-service`| `8012` | Centralized real-time WebSocket hub using Socket.IO: room segmentation (`role:kitchen`, `role:pos`, `role:admin`, `table:{id}`, `order:{id}`), live KOT dispatch, order status tracking progress, waiter pickup calls, and in-app administrative alerts. |
| **14**| **Report Service** | `rms-report-service` | `8013` | Aggregated executive intelligence, daily sales summary, payment method breakdowns, menu velocity analysis (BCG matrix), inventory valuation, wastage cost analysis, and export pipelines for Excel and PDF. |

---

### 3. Core Architectural Constraints & Standards

1. **Shared Database with Stored Procedures ONLY (Zero ORM Policy)**:
   - All microservices connect to the single enterprise database: `RestaurantManagementDB` using the shared singleton connection pool in `backend/shared/config/database.js` (`mssql` driver).
   - **Crucial Rule**: No Sequelize models, associations, ORM CRUD, or dynamic SQL queries are permitted. All database reads, writes, and business transactions execute strictly via dedicated SQL Server stored procedures (`executeProcedure(procedureName, inputs, outputs)`).
   - No service may directly read or write tables owned by another service. All cross-domain data access proceeds via documented HTTP REST API calls.
2. **Zero Message Broker (HTTP REST Communication Only)**:
   - RabbitMQ, Kafka, and gRPC are explicitly excluded.
   - All inter-service calls use Axios over HTTP with structured JSON request/response envelopes.
   - Inter-service calls use a shared internal Service-to-Service JWT secret (`INTERNAL_SERVICE_KEY`) to prevent unauthorized cross-service calls.
3. **Single Global Environment Configuration**:
   - Exactly one `.env` file at the repository root (`restaurant-management-system/.env`).
   - Microservices do not maintain isolated `.env` files; local development loads configuration via `dotenv` pointing to `../../.env` or root path, and production injects variables via Docker Compose.
4. **Resilience & Distributed Transactions (REST-based Saga)**:
   - Critical distributed flows (Order Checkout -> Stock Check & Deplete -> Payment Settlement -> KOT Generation) use an **Orchestrated Saga pattern** driven by the `Order Service`.
   - Every state-changing REST call requires an `X-Idempotency-Key` header to protect against network retries.
   - If a downstream service fails, compensating REST endpoints are invoked in reverse order (e.g., `POST /api/v1/inventory/restitute` restores depleted ingredients if payment authorization fails).
5. **Real-Time Synchronous Push via Socket.IO**:
   - `Notification Service` is the sole WebSocket host.
   - When any microservice completes an operational event (e.g., `Order Service` accepts an order, or `Kitchen Service` bumps a ticket), it sends an internal HTTP POST to `notification-service/internal/broadcast`, which immediately broadcasts the event to connected client sockets across kitchen monitors, POS screens, and mobile customer trackers.

---

### 4. Shared Caching & Redis Integration

Redis runs as an in-memory cache and state store accessible by the services:
1. **CMS Service**: Caches public homepage layout, settings, and navigation trees with a 15-minute TTL. Invalidated instantly upon admin content publish.
2. **Menu Service**: Caches active menu category hierarchies and featured items. Invalidated instantly on item update or availability ("86") toggle.
3. **Cart Service**: Stores unauthenticated ephemeral table carts and temporary guest sessions.
4. **API Gateway**: Stores sliding-window rate limiting counters per IP address to throttle abusive traffic.

---

### 5. Standard Layered Microservice Structure

Every microservice strictly follows the 4-tier clean architecture pattern:
`HTTP Request -> Routes -> Controller -> Service -> Repository -> executeProcedure() -> SQL Server Stored Procedure`

```
backend/<service-name>/
├── src/
│   ├── controllers/      # HTTP request handling, DTO mapping, HTTP status codes
│   ├── services/         # Domain business logic, hashing, token issuance, calculations
│   ├── repositories/     # Data access layer invoking executeProcedure() from @rms/shared
│   ├── routes/           # Express router definitions and route-level middleware mounting
│   ├── middleware/       # Service-specific middlewares (e.g. upload, custom guards)
│   ├── validators/       # Input validation schemas and sanitization
│   ├── utils/            # Service-specific helper utilities
│   ├── app.js            # Express application setup, routes registration, error handlers
│   └── index.js          # HTTP server bootstrap, graceful shutdown handlers
└── package.json          # Independent dependencies and npm scripts
```

### 6. Global Shared Configuration Architecture (`backend/shared/`)

A single centralized library (`@rms/shared`) provides infrastructure and cross-cutting concerns:
- **`backend/shared/config/database.js`**: Central singleton MSSQL connection pool using `mssql` package. Exposes `executeProcedure(procedureName, inputs, outputs)`, `query(sqlText, params)`, `getPool()`, and `closePool()`.
- **`backend/shared/config/env.js`**: Traverses up directory tree to locate and load the single root `.env` configuration.
- **`backend/shared/config/redis.js`**: Central `ioredis` singleton connection pool with automatic timeout handling.
- **`backend/shared/middleware/`**: Standard `correlation.middleware.js`, `authentication.middleware.js`, `authorization.middleware.js`, and `error.middleware.js`.
- **`backend/shared/utils/`**: Standard response envelopes (`successResponse`, `errorResponse`), Winston structured logger, and `asyncHandler`.


