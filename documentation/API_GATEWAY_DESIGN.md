# Restaurant Management System (RMS)
## Master API Gateway Architecture & Routing Design

-------

### 1. Gateway Purpose & Position in Architecture



The **API Gateway** (`rms-api-gateway`, Port `8000`) serves as the single ingress entry point for all external traffic originating from the 4 client frontend applications (Customer Web App, Admin Dashboard, Kitchen KDS, and Staff POS). 

Client applications **never** call internal microservices directly. Instead, all requests terminate at the API Gateway, which handles cross-cutting concerns:
- **Reverse Proxy Routing** to 13 downstream domain services.
- **Centralized Authentication & JWT Verification**.
- **Role-Based Access Control (RBAC) Pre-Routing Checks**.
- **Rate Limiting** backed by Redis.
- **Request Tracing via Correlation IDs (`X-Correlation-ID`)**.
- **CORS Whitelisting & Helmet Security Headers**.
- **Gateway Error Handling & Circuit Breaking**.

```
[ Customer App (:3000) ]  [ Admin Console (:3001) ]  [ KDS Screen (:3002) ]  [ POS (:3003) ]
           │                         │                        │                    │
           └─────────────────────────┼────────────────────────┴────────────────────┘
                                     │ HTTPS REST / WSS
                                     ▼
                     ┌───────────────────────────────┐
                     │   API Gateway (Port 8000)     │
                     │  • Helmet & CORS Protection   │
                     │  • Correlation ID Generator   │
                     │  • Rate Limiting (Redis Store)│
                     │  • JWT Auth & RBAC Guard      │
                     │  • Reverse Proxy Router       │
                     └───────────────┬───────────────┘
                                     │
      ┌──────────────┬───────────────┼───────────────┬──────────────┐
      ▼              ▼               ▼               ▼              ▼
[auth-service] [user-service] [restaurant-svc]  [cms-service]   [menu-service] ...
    (:8001)        (:8002)         (:8003)         (:8004)         (:8005)
```

---

### 2. Complete Gateway Route Mapping Table

| Public Ingress Path | Target Microservice | Target Internal URL | Access Control | Description |
| :--- | :--- | :--- | :---: | :--- |
| `/api/v1/auth/*` | `auth-service` | `http://localhost:8001` | Public / Self | Login, register, token refresh, PIN login |
| `/api/v1/users/*` | `user-service` | `http://localhost:8002` | Authenticated | Profiles, addresses, staff management |
| `/api/v1/restaurants/*` | `restaurant-service` | `http://localhost:8003` | Public / Admin | Master tenant restaurant details |
| `/api/v1/branches/*` | `restaurant-service` | `http://localhost:8003` | Public / Staff | Branch locations, hours & geofencing |
| `/api/v1/tables/*` | `restaurant-service` | `http://localhost:8003` | Public QR / Staff | Table layout, status & QR validation |
| `/api/v1/shifts/*` | `restaurant-service` | `http://localhost:8003` | Staff / Manager | Cash drawer shift open, close & Z-report |
| `/api/v1/cms/public/*` | `cms-service` | `http://localhost:8004` | Public (Cached) | Dynamic branding, banners, pages, FAQs |
| `/api/v1/cms/admin/*` | `cms-service` | `http://localhost:8004` | Admin / Manager | Content authoring, page sections & SEO |
| `/api/v1/menu/public/*` | `menu-service` | `http://localhost:8005` | Public (Cached) | Food menu catalog, categories, pricing |
| `/api/v1/menu/admin/*` | `menu-service` | `http://localhost:8005` | Admin / Manager | Dishes CRUD, variants, 86 availability |
| `/api/v1/cart/*` | `cart-service` | `http://localhost:8006` | Public Session | Shopping cart items, live subtotal |
| `/api/v1/orders/*` | `order-service` | `http://localhost:8007` | Customer / Staff | Order creation, active order tracking |
| `/api/v1/payments/*` | `payment-service` | `http://localhost:8008` | Customer / Staff | Razorpay checkout, webhooks & refunds |
| `/api/v1/inventory/*` | `inventory-service` | `http://localhost:8009` | Manager / Chef | Ingredients, recipe BOM, stock alerts |
| `/api/v1/kds/*` | `kitchen-service` | `http://localhost:8010` | Kitchen / Manager| Kitchen order tickets (KOT) & bump actions |
| `/api/v1/reservations/*`| `reservation-service`| `http://localhost:8011` | Customer / Staff | Table bookings & slot conflict checks |
| `/api/v1/notifications/*`| `notification-service`| `http://localhost:8012`| Authenticated | In-app notification alerts |
| `/socket.io/*` | `notification-service`| `http://localhost:8012`| WebSocket WSS | Live real-time bidirectional push |
| `/api/v1/reports/*` | `report-service` | `http://localhost:8013` | Admin / Manager | Sales summaries, menu velocity & exports |
| `/health` | API Gateway Local | Self | Public | Gateway & downstream service health status |

---

### 3. Gateway Security & Ingress Pipeline

Each incoming HTTP request passes through a 6-stage middleware pipeline:

```
[ Incoming HTTP Request ]
            │
            ▼
┌───────────────────────────────────────┐
│ 1. Correlation ID Generator           │ --> Injects X-Correlation-ID (UUID v4)
└───────────────────┬───────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│ 2. Helmet & CORS Guard                │ --> Whitelists frontend client domains
└───────────────────┬───────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│ 3. Redis-Backed Rate Limiting         │ --> 100 req/min (Public), 500 req/min (Staff)
└───────────────────┬───────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│ 4. Route Whitelist & JWT Auth Check   │ --> If protected: verifies JWT token, extracts User
└───────────────────┬───────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│ 5. Role-Based Access Control (RBAC)   │ --> Matches UserRole against required role permissions
└───────────────────┬───────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│ 6. Downstream Reverse Proxy (Axios/   │ --> Injects X-User-ID, X-User-Role, X-Branch-ID,
│    http-proxy-middleware)             │     and X-Internal-Service-Key to target microservice
└───────────────────────────────────────┘
```

#### 3.1 Public Routes Whitelist
The following route patterns bypass JWT authentication:
- `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/pos-pin-login`
- `/api/v1/cms/public/*`
- `/api/v1/menu/public/*`
- `/api/v1/tables/qr/:hash`
- `/api/v1/cart/*` (Uses anonymous `SessionToken`)
- `/api/v1/payments/razorpay/webhook` (Verified via Razorpay HMAC SHA256)
- `/health`

#### 3.2 Role-Based Access Control (RBAC) Pre-Checks
The Gateway validates minimum role claims before forwarding to protected microservices:
- `/api/v1/cms/admin/*` -> Requires `SUPER_ADMIN` or `RESTAURANT_MANAGER`
- `/api/v1/menu/admin/*` -> Requires `SUPER_ADMIN` or `RESTAURANT_MANAGER`
- `/api/v1/inventory/*` -> Requires `SUPER_ADMIN`, `RESTAURANT_MANAGER`, or `KITCHEN_CHEF`
- `/api/v1/kds/*` -> Requires `KITCHEN_CHEF`, `RESTAURANT_MANAGER`, or `SUPER_ADMIN`
- `/api/v1/shifts/*` -> Requires `CASHIER_POS`, `RESTAURANT_MANAGER`, or `SUPER_ADMIN`
- `/api/v1/reports/*` -> Requires `SUPER_ADMIN` or `RESTAURANT_MANAGER`

---

### 4. Downstream Header Decoration

When the Gateway successfully authenticates a request, it decorates the outgoing HTTP request headers before forwarding it to the target microservice:

```http
GET /api/v1/orders/100001 HTTP/1.1
Host: localhost:8007
X-Correlation-ID: c8a41df2-421b-4f91-8841-39d2c25345a9
X-Internal-Service-Key: rms_internal_microservice_mesh_secret_token_54321
X-User-ID: 4
X-User-Role: WAITSTAFF
X-Branch-ID: 1
```

This design allows downstream microservices to know exactly who initiated the request without needing to decode the JWT token again, while the `X-Internal-Service-Key` guarantees that no malicious actor can bypass the API Gateway to talk to internal services directly.

