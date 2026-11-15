# Restaurant Management System (RMS)
## Phase 10: Notification Service Comprehensive Inspection Report

---

### 1. Executive Summary

- **Service Name**: `notification-service` (`rms-notification-service`)
- **Assigned Runtime Port**: **`8012`**
- **API Gateway Ingress Prefix**: **`/api/v1/notifications`**
- **Status Prior to Phase 10**: Scaffolded service with an active Socket.IO server mounted on the HTTP server and an internal REST broadcast endpoint (`/api/v1/notifications/internal/broadcast`). Lacks persistent notification management, user-facing REST APIs, and client-side WebSocket authentication.
- **Target Functional Scope**: Central real-time communication hub across RMS. Manages WebSocket connections for kitchen screens, waitstaff handhelds, POS terminals, and customer web/mobile apps. Persists notification logs in `dbo.Notifications` for audit and in-app bell notification feeds.

---

### 2. Codebase & Directory Structure Audit

The existing `backend/notification-service` directory was inspected:

```
backend/notification-service/
├── Dockerfile                        # Standard Alpine Node.js container
├── package.json                      # Service metadata and dependencies
└── src/
    ├── app.js                        # Express app initialization, Helmet, CORS, loggers, health routes
    ├── index.js                      # Bootloader mounting Socket.IO on HTTP server (Port 8012)
    ├── controllers/                  # [EMPTY] No user-facing notification controllers
    ├── middleware/
    │   └── index.js                  # Placeholder exports
    ├── repositories/
    │   └── index.js                  # Placeholder exports
    ├── routes/
    │   ├── health.js                 # Liveness probe & Readiness probe (DB + Socket.IO connection count)
    │   └── internal.js               # POST /broadcast (protected by serviceAuthMiddleware)
    ├── services/                     # [EMPTY] No domain services implemented
    ├── socket/
    │   └── index.js                  # Socket.IO instance initialization, room join/leave listeners
    ├── utils/
    │   └── index.js                  # Placeholder exports
    └── validators/
        └── index.js                  # Placeholder exports
```

#### 2.1 Package & Dependency Evaluation (`package.json`)
- **Dependencies Present**:
  - `socket.io: ^4.8.1` (Active real-time WebSocket engine)
  - `jsonwebtoken: ^9.0.2` (Required for WebSocket handshake JWT token validation)
  - `express: ^4.21.2`
  - `cors: ^2.8.5`
  - `helmet: ^8.0.0`
  - `dotenv: ^16.4.7`
  - `tedious: ^18.6.1`
  - `uuid: ^11.0.5`
  - `winston: ^3.17.0`
- **Missing Direct Dependency**: `@socket.io/redis-adapter` / `ioredis` (if multi-node clustering is required; single-instance Redis pub/sub can also be coordinated via shared Redis client in `@rms/shared`).

#### 2.2 Health Probes Evaluation (`src/routes/health.js`)
- Probes implemented:
  - `GET /health/live`: Process uptime, RSS, heap memory.
  - `GET /health/ready`: Database connectivity test AND `socketConnections` active count.
  - `GET /health`: Readiness alias.
- **Gateway Forwarding Support**: Probes need gateway aliases (`/api/v1/notifications/health/*`) to ensure standard monitoring through API Gateway.

---

### 3. Socket.IO Implementation Analysis (`src/socket/index.js`)

Current implementation:
```javascript
function initSocketServer(httpServer, logger) {
  io = new Server(httpServer, {
    cors: { origin: config.corsOrigins, credentials: true },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);
    socket.on('join', ({ room }) => { if (room) socket.join(room); });
    socket.on('leave', ({ room }) => { if (room) socket.leave(room); });
  });

  return io;
}
```

#### Key Deficiencies Identified:
1. **Unauthenticated Connections**: Sockets currently connect without validating JWT tokens. Any external client can join sensitive rooms (e.g. `role:kitchen`, `branch:1:kds`) and eavesdrop on order tickets.
2. **Missing Token Extraction**: Handshake middleware must be attached (`io.use(...)`) to decode JWT from `socket.handshake.auth.token` or `socket.handshake.headers.authorization`, populating `socket.user = { userId, roles, branchId }`.
3. **Room Authorization Guard**: Clients attempting to join specialized rooms (`branch:X:kitchen`, `branch:X:admin`) must be verified against their token roles.
4. **No Delivery Acknowledgement**: Critical kitchen and ready-for-pickup alerts lack delivery ACK callbacks.

---

### 4. Database Ownership & Schema State

- **Primary Relational Table Owned**:
  - `dbo.Notifications`: Master persistence table storing notifications, user targets, branch context, type, and read statuses.
- **Current Database Row Count**:
  - `Notifications`: **0 rows** (Clean state).
- **Index & Constraints Audit**:
  - Primary Key: `PK_Notifications` (`NotificationId`).
  - Foreign Key: `FK_Notifications_Branches` (`BranchId`), `FK_Notifications_Users` (`UserId` ON DELETE CASCADE).
  - Filtered Index: `IX_Notifications_User_Unread` on `(UserId, IsRead, CreatedAt DESC)` where `IsRead = 0`.
- **Stored Procedures Audit**:
  - **Zero** stored procedures exist currently for notification creation, user retrieval, badge counts, or marking as read.
  - All operations must be implemented via dedicated stored procedures in `database/14_KitchenNotificationStoredProcedures.sql`.

---

### 5. Architectural Deficiencies & Implementation Action Plan

| Component | Current State | Required Phase 10 Implementation |
| :--- | :--- | :--- |
| **WebSocket Authentication** | Open / Unchecked | Implement `socketAuth.middleware.js` using `jsonwebtoken` to verify tokens on connection. |
| **Room Hierarchy** | Arbitrary strings | Enforce structured rooms (`branch:{id}:kitchen`, `branch:{id}:kitchen:{station}`, `branch:{id}:waitstaff`, `user:{id}`, `order:{id}`). |
| **Notification Persistence** | In-memory broadcast only | Author `notification.repository.js` and `notification.service.js` to persist in-app records in `dbo.Notifications`. |
| **User REST Endpoints** | Only `/internal/broadcast` | Add `GET /api/v1/notifications`, `GET /unread-count`, `PATCH /:id/read`, `PATCH /read-all`. |
| **Duplicate Prevention** | None | Add Redis-backed deduplication key (`notif:dedup:{fingerprint}`) to prevent broadcast floods. |
| **Delivery ACKs** | Fire-and-forget `emit` | Support ACK callbacks (`emit(event, data, (ack) => { ... })`) for critical KDS tickets. |
| **Gateway Routing & RBAC** | Routed to 8012 | Configure RBAC in API Gateway so user notification APIs are accessible to all authenticated users. |

