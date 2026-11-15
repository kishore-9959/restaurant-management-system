# Restaurant Management System (RMS)
## Phase 10: Implementation Checklist & Execution Roadmap
### Kitchen Service & Notification Service (KDS & Real-Time Socket.IO Hub)

---

### Step 1: Database Stored Procedures Authoring (`database/14_KitchenNotificationStoredProcedures.sql`)
- [x] Create `database/14_KitchenNotificationStoredProcedures.sql` (Header & Documentation)
- [x] Implement SP 146: `dbo.usp_KOT_Create`
  - Atomic KOT header + items insertion
  - Unique number formatting (`KOT-YYYYMMDD-BRANCH-XXXXX`)
  - **Idempotency Guard**: Check existing active ticket for `(@OrderId, @KitchenStation)`; return existing if duplicate
- [x] Implement SP 147: `dbo.usp_KOT_GetById`
  - Multi-recordset fetch (KOT Header + Items)
  - **Snapshot Resolution**: Read-only joins with `dbo.OrderItems` & `dbo.OrderItemAddons` for dish name, portion variant, quantity, instructions, and aggregated addons
- [x] Implement SP 148: `dbo.usp_KOT_GetByOrderId` (all KOTs for a specific order across stations)
- [x] Implement SP 149: `dbo.usp_KOT_GetActiveBoard`
  - Active KDS screen query (`NEW`, `PREPARING`, `READY`)
  - Dynamic `elapsedMinutes` calculation
  - Station and branch filtering
- [x] Implement SP 150: `dbo.usp_KOT_UpdateStatus`
  - Enforces strict transition validation (`NEW` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `BUMPED`)
  - Sets `BumpedAt = SYSUTCDATETIME()` when status becomes `BUMPED`
  - Blocks illegal transition from `BUMPED`
- [x] Implement SP 151: `dbo.usp_KOT_UpdateItemStatus`
  - Individual item cooking status (`PENDING` $\rightarrow$ `COOKING` $\rightarrow$ `READY`)
  - Sets `CompletedAt` when ready
  - **Automatic Rollup**: If all items ready, advances KOT to `READY`; if cooking, advances to `PREPARING`
- [x] Implement SP 152: `dbo.usp_KOT_Bump` (bumps ticket off active KDS display)
- [x] Implement SP 153: `dbo.usp_KOT_CancelByOrderId`
  - Cancels all active KOT tickets for an order
  - Prepends `[ORDER CANCELLED]` to `SpecialKitchenNotes`
- [x] Implement SP 154: `dbo.usp_KOT_GetMetrics` (turnaround minutes, overdue alerts >20 min, station workload)
- [x] Implement SP 155: `dbo.usp_KOT_AssignChef`
  - **Audit Logging**: Inserts assignment record into `dbo.AuditLogs`
  - Updates `SpecialKitchenNotes` with chef name tag
- [x] Implement SP 156: `dbo.usp_Notification_Create`
  - Persists in-app notification in `dbo.Notifications`
  - **Idempotency Guard**: Prevents identical notifications within 60-second window
- [x] Implement SP 157: `dbo.usp_Notification_GetById` (single notification retrieval)
- [x] Implement SP 158: `dbo.usp_Notification_GetByUser`
  - Paginated feed selecting personal user alerts AND relevant role-based branch alerts
- [x] Implement SP 159: `dbo.usp_Notification_MarkAsRead` (`IsRead = 1, ReadAt = SYSUTCDATETIME()`)
- [x] Implement SP 160: `dbo.usp_Notification_MarkAllAsRead` (atomic mark-all-read update)
- [x] Implement SP 161: `dbo.usp_Notification_GetUnreadCount` (lightweight badge count query for bell icon)
- [x] Implement SP 162: `dbo.usp_Notification_DeleteOlderThan` (maintenance purge procedure)

---

### Step 2: Database Stored Procedure Verification (Isolated Test DB & Primary DB)
- [x] Deploy `database/14_KitchenNotificationStoredProcedures.sql` to `RestaurantManagementDB_IsolatedTest`
- [x] Deploy `database/14_KitchenNotificationStoredProcedures.sql` to primary `RestaurantManagementDB`
- [x] Author SQL unit test script: `database/tests/14_KitchenNotificationStoredProcedures_Test.sql`
- [x] Verify 100% test success rate on all 17 procedures (21/21 passed)
- [x] Confirm zero DDL modifications to existing database tables (`02_CreateTables.sql` preserved)

---

### Step 3: Kitchen Service Backend Implementation (`backend/kitchen-service` :8010)
- [x] Author `src/repositories/kot.repository.js` (executes SPs 146–155)
- [x] Author `src/services/kot.service.js`:
  - KOT generation with station grouping/splitting
  - Status advancement and validation
  - Cross-service boundary: HTTP REST call to `order-service` `PUT /api/v1/orders/:id/status` (ZERO direct SQL order updates)
  - Cross-service boundary: HTTP REST call to `notification-service` `POST /broadcast`
  - Active board, time tracking, metrics
- [x] Author `src/validators/kot.validator.js` (schemas for ticket generation, status update, chef assign)
- [x] Author `src/controllers/kot.controller.js`
- [x] Author `src/routes/kot.routes.js`
- [x] Mount routes in `src/app.js` under `/api/v1/kds`
- [x] Add health probes in `src/routes/health.js` (`/health/live`, `/health/ready`, `/api/v1/kds/health/*`)

---

### Step 4: Notification Service Backend Implementation (`backend/notification-service` :8012)
- [x] Author `src/repositories/notification.repository.js` (executes SPs 156–162)
- [x] Author `src/services/notification.service.js`:
  - **"Persist Before Broadcast" Sequence**: DB insert $\rightarrow$ commit $\rightarrow$ Socket.IO emit
  - Unread counts & batch mark-read logic
  - Redis deduplication guard with SQL fallback
- [x] Author `src/socket/socket.manager.js`:
  - Handshake JWT token validation (`auth.token`)
  - Decoding `userId`, `roles`, `branchId` onto `socket.user`
  - Attach `authorizeRoomSubscription` guard (branch isolation & role verification)
  - Support Socket.IO delivery ACK callbacks
  - Redis error handling & standalone memory fallback
- [x] Author `src/validators/notification.validator.js`
- [x] Author `src/controllers/notification.controller.js`
- [x] Author `src/routes/notification.routes.js`
- [x] Mount routes in `src/app.js` under `/api/v1/notifications`
- [x] Add health probes in `src/routes/health.js` (`/health/live`, `/health/ready`, `/api/v1/notifications/health/*`)

---

### Step 5: Inter-Service Mesh Integration & Boundary Enforcement
- [x] Update `order-service` to call `kitchen-service` `POST /api/v1/kds` upon order confirmation
- [x] Update `order-service` to call `kitchen-service` `POST /api/v1/kds/cancel-by-order` upon order cancellation
- [x] Update `order-service` state machine to permit direct transition `CONFIRMED` $\rightarrow$ `READY` on item completion
- [x] Ensure `kitchen-service` never updates `dbo.Orders` directly in SQL
- [x] Ensure all inter-service HTTP requests pass `X-Internal-Service-Key` and `X-Correlation-ID`

---

### Step 6: API Gateway Ingress & RBAC Updates (`backend/api-gateway` :8000)
- [x] Verify `/api/v1/kds` routing and RBAC rules in `gatewayConfig.js`
- [x] Verify `/api/v1/notifications` routing and RBAC rules in `gatewayConfig.js`
- [x] Verify `/socket.io` reverse proxy routing to `:8012`

---

### Step 7: Automated End-to-End Verification (`scripts/test_phase10.js`)
- [x] Author comprehensive automated runner `scripts/test_phase10.js`
- [x] Group 1: Health Probes & Gateway Forwarding (Kitchen & Notification)
- [x] Group 2: Idempotent KOT Ticket Generation & Station Splitting
- [x] Group 3: KDS Active Board & Station Filtering with Snapshot Resolution
- [x] Group 4: Item-Level Cooking Status & Automatic KOT Status Rollup
- [x] Group 5: Ticket Lifecycle Transitions, State Validation & Bump Mechanism
- [x] Group 6: Chef Assignment Schema & Audit Logging in `dbo.AuditLogs`
- [x] Group 7: Cancelled Order Handling & Automated KOT Bumping
- [x] Group 8: KDS Metrics & Turnaround Performance
- [x] Group 9: Socket.IO Authentication & Branch Isolation Room Guards
- [x] Group 10: "Persist Before Broadcast" In-App Notification Feed & Unread Counts
- [x] Group 11: Security & RBAC Guard Enforcement
- [x] Target: **100% Pass Rate (103 / 103 assertions passed)**

---

### Step 8: Full Regression Suite & Final Sign-Off
- [x] Run `scripts/verify_all_services_startup.js` (14/14 healthy)
- [x] Run `scripts/test_phase4.js` (Auth & User: 20/20 passed)
- [x] Run `scripts/test_phase5.js` (Restaurant & Floor: 24/24 passed)
- [x] Run `scripts/test_phase6.js` (Menu & Redis: 36/36 passed)
- [x] Run `scripts/test_phase7.js` (Cart & Order: 46/46 passed)
- [x] Run `scripts/test_phase8.js` (Inventory & BOM: 44/44 passed)
- [x] Run `scripts/test_phase9.js` (Payment & Razorpay: 38/38 passed)
- [x] Run `scripts/test_phase10.js` (Kitchen & Notification: 103/103 passed)
- [x] Cumulative Platform Total: **332 / 332 tests passed (100% pass rate)**
- [x] Update `DEVELOPMENT_PROGRESS.md`
