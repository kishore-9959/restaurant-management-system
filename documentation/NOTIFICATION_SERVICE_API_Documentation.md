# Restaurant Management System (RMS)
## Phase 10: Notification Service REST API Specification

---

### 1. Service Specification

- **Microservice**: `notification-service`
- **Internal Port**: `8012`
- **API Gateway Ingress Prefix**: `/api/v1/notifications`
- **Authentication**: JWT Bearer Token (`Authorization: Bearer <token>`) / Internal Service Key (`X-Internal-Service-Key: <secret>`)
- **Tracing Header**: `X-Correlation-ID` (UUID v4)
- **Database**: Microsoft SQL Server 2022 (`RestaurantManagementDB`, 100% Stored Procedures)
- **Cache & Socket Hub**: Redis (`localhost:6379`) + Socket.IO v4
- **Deduplication Window**: 60 seconds (prevents duplicate spam on identical parameters)

---

### 2. RBAC & Security Matrix

| Endpoint | Method | Allowed Roles / Auth Level | Description |
| :--- | :---: | :--- | :--- |
| `/health/live` | `GET` | Public | Liveness probe |
| `/health/ready` | `GET` | Public | Readiness probe (SQL & Redis validation) |
| `/` | `GET` | Authenticated Users | List user notifications with pagination & unread filter |
| `/unread-count` | `GET` | Authenticated Users | Fast unread badge counter |
| `/:id/read` | `PUT` | Authenticated Users | Mark single notification as read |
| `/mark-all-read` | `PUT` | Authenticated Users | Mark all notifications as read |
| `/internal/broadcast` | `POST` | `INTERNAL`, `SUPER_ADMIN` | Persist and broadcast event to user or branch room |
| `/internal/order-status` | `POST` | `INTERNAL` | Send order state change notification |
| `/internal/kot-event` | `POST` | `INTERNAL` | Send KOT lifecycle alert (new ticket, item ready) |
| `/internal/low-stock` | `POST` | `INTERNAL` | Send inventory threshold alert to managers |
| `/internal/maintenance/cleanup` | `POST` | `SUPER_ADMIN`, `INTERNAL` | Purge notification records older than N days |

---

### 3. API Endpoints

#### 3.1 Health & Readiness Probes

##### `GET /health/live` & `GET /api/v1/notifications/health/live`
- **Description**: Lightweight Kubernetes/Container liveness probe.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "notification-service",
    "uptimeSeconds": 150.2,
    "timestamp": "2026-11-15T18:00:00.000Z"
  },
  "message": "Notification Service is live",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-11-15T18:00:00.000Z"
}
```

##### `GET /health/ready` & `GET /api/v1/notifications/health/ready`
- **Description**: Readiness probe testing SQL Server database and Redis connectivity.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "notification-service",
    "dependencies": {
      "database": { "healthy": true, "message": "Connected to SQL Server" },
      "redis": { "healthy": true, "message": "Connected to Redis" }
    }
  },
  "message": "Notification Service is ready to serve traffic",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-11-15T18:00:00.000Z"
}
```

---

#### 3.2 User Notification Endpoints

##### `GET /api/v1/notifications?page=1&limit=20&unreadOnly=false`
- **Description**: Retrieves paginated list of notifications for the authenticated user and their active branch using `dbo.usp_Notification_GetByUser`.
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
  - `unreadOnly` (boolean, default: false)
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "notificationId": 105,
      "branchId": 1,
      "userId": 14,
      "title": "Order Ready for Pickup",
      "message": "Order #ORD-20261115-0001 (Table 4) is ready in Main Kitchen.",
      "notificationType": "ORDER_READY",
      "targetUrl": "/orders/10001",
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-11-15T18:15:30.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalCount": 1
  }
}
```

---

##### `GET /api/v1/notifications/unread-count`
- **Description**: Lightweight counter for app header bell badge using `dbo.usp_Notification_GetUnreadCount`.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "unreadCount": 3
  }
}
```

---

##### `PUT /api/v1/notifications/:id/read`
- **Description**: Marks a specific notification as read using `dbo.usp_Notification_MarkAsRead`.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "notificationId": 105,
    "isRead": true,
    "readAt": "2026-11-15T18:20:00.000Z"
  },
  "message": "Notification marked as read"
}
```

---

##### `PUT /api/v1/notifications/mark-all-read`
- **Description**: Marks all unread notifications for the authenticated user as read using `dbo.usp_Notification_MarkAllAsRead`.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "affectedRows": 3
  },
  "message": "All notifications marked as read"
}
```

---

#### 3.3 Internal Microservice Broadcast Endpoints

##### `POST /api/v1/notifications/internal/broadcast`
- **Description**: Universal internal notification dispatch endpoint. Persists the alert to SQL Server (applying 60s duplicate suppression), and dispatches to the specified Socket.IO room or user channel.
- **Headers**: `X-Internal-Service-Key: <secret>` or Super Admin Bearer JWT
- **Request Body**:
```json
{
  "branchId": 1,
  "userId": null,
  "targetRoom": "branch:1:waitstaff",
  "eventName": "order:ready",
  "title": "Order Ready for Service",
  "message": "Order #ORD-20261115-0001 (Table 4) is ready for pickup.",
  "notificationType": "ORDER_READY",
  "targetUrl": "/orders/10001",
  "payload": {
    "orderId": 10001,
    "orderNumber": "ORD-20261115-0001",
    "tableName": "Table 4"
  }
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "notificationId": 105,
    "persisted": true,
    "broadcasted": true,
    "targetRoom": "branch:1:waitstaff",
    "eventName": "order:ready"
  },
  "message": "Notification persisted and broadcast successfully"
}
```

---

##### `POST /api/v1/notifications/internal/order-status`
- **Description**: Convenience endpoint invoked by `order-service` to broadcast order status updates to customers and staff.
- **Request Body**:
```json
{
  "branchId": 1,
  "orderId": 10001,
  "orderNumber": "ORD-20261115-0001",
  "customerId": 14,
  "status": "CONFIRMED",
  "tableName": "Table 4"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Order status notification dispatched"
}
```

---

##### `POST /api/v1/notifications/internal/kot-event`
- **Description**: Convenience endpoint invoked by `kitchen-service` for KOT creation, item preparation updates, and ticket completion.
- **Request Body**:
```json
{
  "branchId": 1,
  "kotId": 12,
  "orderId": 10001,
  "station": "MAIN_KITCHEN",
  "eventType": "KOT_NEW",
  "itemSummary": "2 items"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Kitchen KOT notification dispatched"
}
```

---

##### `POST /api/v1/notifications/internal/low-stock`
- **Description**: Convenience endpoint invoked by `inventory-service` when stock falls below reorder or minimum levels.
- **Request Body**:
```json
{
  "branchId": 1,
  "ingredientId": 12,
  "ingredientName": "Caputo Flour",
  "currentStock": 3.5,
  "unit": "kg",
  "reorderLevel": 10.0
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Low stock notification dispatched to managers"
}
```

---

##### `POST /api/v1/notifications/internal/maintenance/cleanup`
- **Description**: Purges notifications older than `@DaysOld` days using `dbo.usp_Notification_DeleteOlderThan`.
- **Request Body**:
```json
{
  "daysOld": 30
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "deletedCount": 45
  },
  "message": "Expired notifications purged successfully"
}
```

