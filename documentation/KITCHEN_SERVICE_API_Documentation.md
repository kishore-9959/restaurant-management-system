# Restaurant Management System (RMS)
## Phase 10: Kitchen Service (KDS) REST API Specification

---

### 1. Service Specification

- **Microservice**: `kitchen-service`
- **Internal Port**: `8010`
- **API Gateway Ingress Prefix**: `/api/v1/kds`
- **Authentication**: JWT Bearer Token (`Authorization: Bearer <token>`) / Internal Service Key (`X-Internal-Service-Key: <secret>`)
- **Tracing Header**: `X-Correlation-ID` (UUID v4)
- **Database**: Microsoft SQL Server 2022 (`RestaurantManagementDB`, 100% Stored Procedures)
- **Cache & Real-time Layer**: Redis (`localhost:6379`)
- **Real-Time Integration**: Dispatches events to `notification-service` (:8012) via internal REST API for Socket.IO fanout.

---

### 2. RBAC & Security Matrix

| Endpoint | Method | Allowed Roles / Auth Level | Description |
| :--- | :---: | :--- | :--- |
| `/health/live` | `GET` | Public | Liveness probe |
| `/health/ready` | `GET` | Public | Readiness probe (SQL & Redis validation) |
| `/` | `POST` | `INTERNAL`, `BRANCH_MANAGER`, `SUPER_ADMIN` | Create KOT ticket (Atomic, station-split, idempotent) |
| `/` | `GET` | `CHEF`, `KITCHEN_STAFF`, `BRANCH_MANAGER`, `SUPER_ADMIN` | List KOT tickets with pagination & filters |
| `/active` | `GET` | `CHEF`, `KITCHEN_STAFF`, `BRANCH_MANAGER`, `SUPER_ADMIN` | Real-time active KDS tickets board |
| `/order/:orderId` | `GET` | Staff, Waitstaff, Branch Manager, Super Admin | Retrieve all KOTs for a given Order ID |
| `/metrics` | `GET` | `CHEF`, `BRANCH_MANAGER`, `SUPER_ADMIN` | KDS operational & preparation metrics |
| `/:id` | `GET` | `CHEF`, `KITCHEN_STAFF`, `BRANCH_MANAGER`, `SUPER_ADMIN` | Get comprehensive KOT ticket details with items |
| `/:id/status` | `PUT` | `CHEF`, `KITCHEN_STAFF`, `BRANCH_MANAGER`, `SUPER_ADMIN` | Transition ticket status (`PREPARING`, `READY`, `BUMPED`) |
| `/:id/items/:itemId/status` | `PUT` | `CHEF`, `KITCHEN_STAFF`, `BRANCH_MANAGER`, `SUPER_ADMIN` | Update individual item preparation status |
| `/:id/bump` | `POST` | `CHEF`, `KITCHEN_STAFF`, `BRANCH_MANAGER`, `SUPER_ADMIN` | Bump ticket off screen (`BUMPED`) |
| `/:id/assign-chef` | `POST` | `CHEF`, `BRANCH_MANAGER`, `SUPER_ADMIN` | Assign chef with audit log and Redis tracking |
| `/cancel-by-order` | `POST` | `INTERNAL`, `BRANCH_MANAGER`, `SUPER_ADMIN` | Cancel & bump all active KOTs for an order |

---

### 3. API Endpoints

#### 3.1 Health & Readiness Probes

##### `GET /health/live` & `GET /api/v1/kds/health/live`
- **Description**: Lightweight Kubernetes/Container liveness probe.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "kitchen-service",
    "uptimeSeconds": 142.5,
    "timestamp": "2026-11-15T18:00:00.000Z"
  },
  "message": "Kitchen Service is live",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-11-15T18:00:00.000Z"
}
```

##### `GET /health/ready` & `GET /api/v1/kds/health/ready`
- **Description**: Readiness probe testing SQL Server database and Redis connectivity.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "kitchen-service",
    "dependencies": {
      "database": { "healthy": true, "message": "Connected to SQL Server" },
      "redis": { "healthy": true, "message": "Connected to Redis" }
    }
  },
  "message": "Kitchen Service is ready to serve traffic",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-11-15T18:00:00.000Z"
}
```

---

#### 3.2 KOT Management

##### `POST /api/v1/kds`
- **Description**: Creates a new Kitchen Order Ticket atomically using stored procedure `dbo.usp_KOT_Create`. Protects against concurrent duplicates via `UPDLOCK, HOLDLOCK`. If an active ticket exists for `(OrderId, KitchenStation)`, it returns the existing ticket with `isIdempotent: true`.
- **Headers**: `Authorization: Bearer <JWT>` or `X-Internal-Service-Key: <Secret>`
- **Request Body**:
```json
{
  "branchId": 1,
  "orderId": 10001,
  "kitchenStation": "MAIN_KITCHEN",
  "specialKitchenNotes": "No onions, extra spicy",
  "itemIds": [501, 502]
}
```
- **Response (201 Created / 200 OK if Idempotent)**:
```json
{
  "success": true,
  "data": {
    "kotId": 12,
    "kotNumber": "KOT-20261115-0012",
    "branchId": 1,
    "orderId": 10001,
    "kitchenStation": "MAIN_KITCHEN",
    "ticketStatus": "NEW",
    "specialKitchenNotes": "No onions, extra spicy",
    "createdAt": "2026-11-15T18:05:00.000Z",
    "itemCount": 2,
    "isIdempotent": false
  },
  "message": "Kitchen Order Ticket created successfully"
}
```

---

##### `GET /api/v1/kds/active?branchId=1&station=MAIN_KITCHEN`
- **Description**: Retrieves active tickets (`NEW`, `PREPARING`, `READY`) with multi-recordset item details, portion variants, addons, and elapsed minutes.
- **Query Parameters**:
  - `branchId` (required, integer)
  - `station` (optional, string: `MAIN_KITCHEN`, `GRILL`, `BAR`, etc.)
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "kotId": 12,
      "kotNumber": "KOT-20261115-0012",
      "orderId": 10001,
      "orderNumber": "ORD-20261115-0001",
      "kitchenStation": "MAIN_KITCHEN",
      "ticketStatus": "PREPARING",
      "elapsedMinutes": 7,
      "items": [
        {
          "kotItemId": 25,
          "orderItemId": 501,
          "menuItemId": 42,
          "itemName": "Paneer Butter Masala",
          "portionVariant": "Full",
          "quantity": 2,
          "preparationStatus": "COOKING",
          "specialInstructions": "Extra gravy",
          "addons": [
            {
              "addonName": "Extra Butter",
              "price": 30.00
            }
          ]
        }
      ]
    }
  ]
}
```

---

##### `GET /api/v1/kds/:id`
- **Description**: Retrieves detailed ticket by `kotId` using multi-recordset procedure `dbo.usp_KOT_GetById`.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "kotId": 12,
    "kotNumber": "KOT-20261115-0012",
    "branchId": 1,
    "orderId": 10001,
    "orderNumber": "ORD-20261115-0001",
    "orderType": "DINE_IN",
    "tableName": "Table 4",
    "kitchenStation": "MAIN_KITCHEN",
    "ticketStatus": "PREPARING",
    "specialKitchenNotes": "[CHEF: Chef Marco (ID: 5)] No onions",
    "assignedChef": {
      "chefUserId": 5,
      "chefName": "Chef Marco"
    },
    "createdAt": "2026-11-15T18:05:00.000Z",
    "items": [
      {
        "kotItemId": 25,
        "orderItemId": 501,
        "itemName": "Paneer Butter Masala",
        "quantity": 2,
        "preparationStatus": "COOKING",
        "addons": []
      }
    ]
  }
}
```

---

##### `PUT /api/v1/kds/:id/status`
- **Description**: Transitions ticket status (`PREPARING`, `READY`, `BUMPED`) enforcing valid lifecycle transitions.
- **Request Body**:
```json
{
  "ticketStatus": "PREPARING"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "kotId": 12,
    "ticketStatus": "PREPARING",
    "bumpedAt": null
  },
  "message": "KOT ticket status updated successfully"
}
```

---

##### `PUT /api/v1/kds/:id/items/:itemId/status`
- **Description**: Updates preparation status of a specific item (`PENDING` $\rightarrow$ `COOKING` $\rightarrow$ `READY`). Automatically rolls up to advance parent KOT ticket status when all items reach `READY`. Automatically calls Order Service REST API when all KOTs for the order are completed.
- **Request Body**:
```json
{
  "preparationStatus": "READY"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "kotItemId": 25,
    "preparationStatus": "READY",
    "allCompleted": true,
    "parentTicketStatus": "READY"
  },
  "message": "KOT item status updated successfully"
}
```

---

##### `POST /api/v1/kds/:id/bump`
- **Description**: Bumps ticket off the active KDS display, setting `TicketStatus = 'BUMPED'` and recording `BumpedAt = SYSUTCDATETIME()`.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "kotId": 12,
    "ticketStatus": "BUMPED",
    "bumpedAt": "2026-11-15T18:22:15.000Z"
  },
  "message": "KOT ticket bumped successfully"
}
```

---

##### `POST /api/v1/kds/:id/assign-chef`
- **Description**: Assigns a chef to the KOT ticket. Persists an audit log to `dbo.AuditLogs`, prepends `[CHEF: Name (ID)]` to `SpecialKitchenNotes`, and caches the assignment in Redis for fast station lookups.
- **Request Body**:
```json
{
  "chefUserId": 5,
  "chefName": "Chef Marco"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "kotId": 12,
    "chefUserId": 5,
    "chefName": "Chef Marco"
  },
  "message": "Chef assigned successfully"
}
```

---

##### `POST /api/v1/kds/cancel-by-order`
- **Description**: Cancels and bumps all active KOT tickets associated with an order ID. Used by Order Service during order void/cancellation sagas.
- **Request Body**:
```json
{
  "orderId": 10001
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "orderId": 10001,
    "cancelledCount": 2
  },
  "message": "All active KOT tickets for order cancelled successfully"
}
```

---

##### `GET /api/v1/kds/metrics?branchId=1`
- **Description**: Retrieves real-time kitchen efficiency metrics including average preparation minutes, active ticket counts by station, and overdue ticket counts.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "activeTickets": 8,
      "preparingTickets": 5,
      "readyTickets": 3,
      "overdueTickets": 1,
      "avgPrepTimeMinutes": 14.2
    },
    "byStation": [
      { "kitchenStation": "MAIN_KITCHEN", "activeCount": 5 },
      { "kitchenStation": "GRILL", "activeCount": 3 }
    ]
  }
}
```

