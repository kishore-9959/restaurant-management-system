# Restaurant Management System (RMS)
## Phase 7 API Specification: Cart & Order Management Microservices

- **Microservices**: 
  - `cart-service` (Internal Port: `8006`, Gateway Route: `/api/v1/cart`)
  - `order-service` (Internal Port: `8007`, Gateway Route: `/api/v1/orders`)
- **Gateway Ingress**: `http://localhost:8000`
- **Database Engine**: Microsoft SQL Server (`RestaurantManagementDB` on port `1435`)
- **Database Access**: 100% Stored Procedures (`10_CartStoredProcedures.sql` and `11_OrderStoredProcedures.sql`) - Zero Sequelize ORM
- **Cache & Idempotency Engine**: Shared Redis (`localhost:6379`) with 24-hr Idempotency TTL (`idempotency:order:{key}`)
- **Security & Authorization**: JWT Bearer (`Authorization: Bearer <token>`), Guest Session Token (`X-Session-Token`), Mutual Microservice Key (`X-Internal-Service-Key`)

---

## 1. Cart Management APIs (`cart-service` - Port 8006)

Cart endpoints are public at the Gateway ingress to permit unauthenticated guest users (via `X-Session-Token`) as well as logged-in registered customers (via `Authorization: Bearer <token>`).

### 1.1 Get or Create Cart
- **Method**: `GET` or `POST`
- **Endpoint**: `/api/v1/cart`
- **Headers**:
  - `Authorization: Bearer <token>` (Optional - for logged in customer)
  - `X-Session-Token: <session-token>` (Required for guest users)
- **Parameters** (Query for GET, Body for POST):
  - `branchId` (int, required if cartId not provided): Target restaurant branch.
  - `tableId` (int, optional): Dining table for dine-in sessions.
  - `cartId` (bigint, optional): Direct cart lookup.
- **Stored Procedure**: `dbo.usp_Cart_GetOrCreate` / `dbo.usp_Cart_GetById`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Cart retrieved successfully.",
  "data": {
    "cartId": 3,
    "branchId": 1,
    "branchName": "Indiranagar Flagship",
    "tableId": 1,
    "tableNumber": "T-01",
    "userId": 8,
    "userName": "Aarav Kapoor",
    "userEmail": "customer.aarav@example.com",
    "sessionToken": "guest_sess_1794651917708_1a05a29b",
    "subTotal": 1570.00,
    "taxTotal": 78.50,
    "grandTotal": 1648.50,
    "totalItemsCount": 3,
    "items": [
      {
        "cartItemId": 11,
        "cartId": 3,
        "menuItemId": 1,
        "itemCode": "STR-001",
        "itemName": "Truffle & Parmesan Arancini",
        "dietaryType": "VEG",
        "spicyLevel": 0,
        "variantId": null,
        "variantName": null,
        "quantity": 2,
        "unitPrice": 380.00,
        "totalPrice": 760.00,
        "specialInstructions": "Extra crispy please",
        "addons": []
      }
    ]
  }
}
```

### 1.2 Add Item to Cart
- **Method**: `POST`
- **Endpoint**: `/api/v1/cart/items`
- **Validation**:
  - Authoritatively queries Menu Service (`GET http://localhost:8005/api/v1/menu/items/:id`).
  - Verifies item branch matches cart branch (`400 BRANCH_MISMATCH`).
  - Verifies "86" availability status (`400 ITEM_OUT_OF_STOCK`).
  - Verifies selected variant and addons belong to menu item and are available.
  - Strict 2-decimal arithmetic.
- **Request Body**:
```json
{
  "cartId": 3,
  "menuItemId": 3,
  "variantId": 2,
  "quantity": 1,
  "addons": [
    { "addonItemId": 1, "quantity": 1 },
    { "addonItemId": 2, "quantity": 1 }
  ],
  "specialInstructions": "Well done crust"
}
```
- **Stored Procedure**: `dbo.usp_Cart_AddItem`
- **Response `201 Created`**: Returns full updated cart state.

### 1.3 Update Item Quantity
- **Method**: `PUT`
- **Endpoint**: `/api/v1/cart/items/:cartItemId`
- **Ownership**: Enforces caller owns the cart. Customer B blocked from Customer A's cart (`403 CART_ACCESS_FORBIDDEN`).
- **Validation**: Quantity must be an integer >= 1 (`400 VALIDATION_ERROR`).
- **Request Body**:
```json
{
  "quantity": 3
}
```
- **Stored Procedure**: `dbo.usp_Cart_UpdateItemQuantity`
- **Response `200 OK`**: Returns full cart with recalculated subtotal, tax, and grand total.

### 1.4 Remove Item from Cart
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/cart/items/:cartItemId`
- **Stored Procedure**: `dbo.usp_Cart_RemoveItem`
- **Response `200 OK`**: Returns updated cart state.

### 1.5 Clear Entire Cart
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/cart`
- **Query or Body**: `cartId` (bigint, required)
- **Stored Procedure**: `dbo.usp_Cart_Clear`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Cart cleared successfully."
}
```

### 1.6 Cart Summary
- **Method**: `GET`
- **Endpoint**: `/api/v1/cart/summary?cartId=3`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "cartId": 3,
    "branchId": 1,
    "branchName": "Indiranagar Flagship",
    "totalItemsCount": 3,
    "subTotal": 1570.00,
    "taxTotal": 78.50,
    "grandTotal": 1648.50,
    "itemNames": ["Truffle & Parmesan Arancini", "Margherita Classica"]
  }
}
```

---

## 2. Order Management APIs (`order-service` - Port 8007)

Order creation and management coordinates cart validation, table validation, address validation, historical pricing snapshots, Redis idempotency, and status lifecycle state machines.

### 2.1 Place Order
- **Method**: `POST`
- **Endpoint**: `/api/v1/orders`
- **Headers**:
  - `Authorization: Bearer <token>` (Required by Gateway)
  - `X-Idempotency-Key: <unique-uuid-key>` (Optional but recommended - cached for 24 hours in Redis)
- **Order Types**: `DINE_IN`, `TAKEAWAY`, `DELIVERY`
- **Request Body (`DINE_IN`)**:
```json
{
  "cartId": 3,
  "orderType": "DINE_IN",
  "tableId": 1,
  "serviceCharge": 50.00,
  "customerNotes": "Serve appetizer first"
}
```
- **Request Body (`DELIVERY`)**:
```json
{
  "cartId": 3,
  "orderType": "DELIVERY",
  "deliveryAddressId": 1,
  "packagingCharge": 25.00
}
```
- **Request Body (`TAKEAWAY`)**:
```json
{
  "cartId": 3,
  "orderType": "TAKEAWAY",
  "guestName": "Kishore Express",
  "guestPhone": "+919876543210"
}
```
- **Stored Procedure**: `dbo.usp_Order_Create`
- **Generated Order Number**: Human readable sequential format: `ORD-YYYYMMDD-XXXX` (e.g., `ORD-20261114-0001`).
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Order placed successfully.",
  "data": {
    "orderId": 100001,
    "branchId": 1,
    "orderNumber": "ORD-20261114-0001",
    "orderType": "DINE_IN",
    "tableId": 1,
    "tableNumber": "T-01",
    "customerId": 8,
    "orderStatus": "PENDING",
    "paymentStatus": "UNPAID",
    "subTotal": 1950.00,
    "taxTotal": 97.50,
    "serviceCharge": 50.00,
    "packagingCharge": 0.00,
    "grandTotal": 2097.50,
    "items": [
      {
        "orderItemId": 200001,
        "menuItemId": 1,
        "itemNameSnapshot": "Truffle & Parmesan Arancini",
        "variantNameSnapshot": null,
        "unitPrice": 380.00,
        "quantity": 3,
        "itemTotal": 1140.00,
        "addons": []
      },
      {
        "orderItemId": 200002,
        "menuItemId": 3,
        "itemNameSnapshot": "Margherita Classica",
        "variantNameSnapshot": "12-Inch Large",
        "unitPrice": 635.00,
        "quantity": 1,
        "itemTotal": 635.00,
        "addons": [
          {
            "addonItemId": 1,
            "addonNameSnapshot": "Extra Buffalo Mozzarella",
            "unitPrice": 80.00,
            "quantity": 1,
            "totalPrice": 80.00
          },
          {
            "addonItemId": 2,
            "addonNameSnapshot": "Shaved Aged Parmesan",
            "unitPrice": 95.00,
            "quantity": 1,
            "totalPrice": 95.00
          }
        ]
      }
    ]
  }
}
```

### 2.2 Redis Idempotency Enforcement
When a duplicate `X-Idempotency-Key` is submitted within 24 hours:
- Skips order re-creation and duplicate database inserts.
- Returns cached order payload directly from Redis cache (`idempotency:order:{key}`).
- Status: `200 OK` or `201 Created`.

### 2.3 Order Lifecycle State Machine
- **Method**: `PUT`
- **Endpoint**: `/api/v1/orders/:orderId/status`
- **Authorized Roles**: Staff (`SUPER_ADMIN`, `RESTAURANT_MANAGER`, `WAITSTAFF`, `CASHIER_POS`, `KITCHEN_CHEF`)
- **Allowed Transitions**:
  - `PENDING` -> `CONFIRMED` or `CANCELLED`
  - `CONFIRMED` -> `PREPARING` or `CANCELLED`
  - `PREPARING` -> `READY` or `CANCELLED`
  - `READY` -> `SERVED` or `COMPLETED`
  - `SERVED` -> `COMPLETED`
  - `COMPLETED` -> Terminal state (no rollback allowed: `400 INVALID_STATUS_TRANSITION`)
  - `CANCELLED` -> Terminal state
- **Table Side-Effects**: Transitioning to `COMPLETED` automatically sets associated `RestaurantTables.CurrentStatus` to `'CLEANING'` and clears `ActiveOrderId`.
- **Request Body**:
```json
{
  "status": "CONFIRMED",
  "notes": "Kitchen accepted order for preparation"
}
```
- **Stored Procedure**: `dbo.usp_Order_UpdateStatus`
- **Response `200 OK`**: Returns updated order with recorded state.

### 2.4 Order Status History Audit Trail
- **Method**: `GET`
- **Endpoint**: `/api/v1/orders/:orderId/history`
- **Stored Procedure**: `dbo.usp_Order_GetStatusHistory`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "historyId": 1,
      "previousStatus": "NONE",
      "newStatus": "PENDING",
      "changedByUserId": 8,
      "notes": "Order created successfully via RMS Order Service",
      "changedAt": "2026-11-14T10:28:18.441Z"
    },
    {
      "historyId": 2,
      "previousStatus": "PENDING",
      "newStatus": "CONFIRMED",
      "changedByUserId": 2,
      "notes": "Kitchen accepted order",
      "changedAt": "2026-11-14T10:28:19.443Z"
    },
    {
      "historyId": 3,
      "previousStatus": "CONFIRMED",
      "newStatus": "PREPARING",
      "changedByUserId": 2,
      "notes": "Chef started preparation",
      "changedAt": "2026-11-14T10:28:19.467Z"
    },
    {
      "historyId": 4,
      "previousStatus": "PREPARING",
      "newStatus": "READY",
      "changedByUserId": 2,
      "notes": "Plated and ready at pickup counter",
      "changedAt": "2026-11-14T10:28:19.483Z"
    },
    {
      "historyId": 5,
      "previousStatus": "READY",
      "newStatus": "COMPLETED",
      "changedByUserId": 4,
      "notes": "Served and settled",
      "changedAt": "2026-11-14T10:28:19.497Z"
    }
  ]
}
```

### 2.5 Cancel Order
- **Method**: `POST`
- **Endpoint**: `/api/v1/orders/:orderId/cancel`
- **Policy**:
  - Customers may cancel while order is in `PENDING` or `CONFIRMED`.
  - Disallowed once food is `PREPARING`, `READY`, or `COMPLETED` (`400 CANNOT_CANCEL_ORDER`).
  - Automatically resets occupied dining table status to `'AVAILABLE'`.
- **Request Body**:
```json
{
  "reason": "Customer requested cancellation due to change of plans"
}
```
- **Stored Procedure**: `dbo.usp_Order_Cancel`
- **Response `200 OK`**: Returns cancelled order record.

### 2.6 Order Queries & Filtering
- **List Orders (Staff)**: `GET /api/v1/orders?branchId=1&status=COMPLETED&page=1&limit=10`
  - Stored Procedure: `dbo.usp_Order_List`
  - Supports filters: `branchId`, `customerId`, `orderStatus`, `paymentStatus`, `orderType`, `startDate`, `endDate`, `page`, `limit`.
- **Customer Order History**: `GET /api/v1/orders/customer/:customerId`
  - Enforces customer ownership: Customer B cannot view Customer A's order history (`403 ORDER_ACCESS_FORBIDDEN`).
- **Branch Orders**: `GET /api/v1/orders/branch/:branchId`
- **Get Order by ID**: `GET /api/v1/orders/:orderId`
- **Get Order by OrderNumber**: `GET /api/v1/orders/number/:orderNumber`

---

## 3. Health Check Probes

Both `cart-service` and `order-service` implement standard dual-probe health contracts:

| Endpoint | Method | Purpose | Response Checks |
|---|---|---|---|
| `/health/live` | `GET` | Node process liveness | Status 200, `{ status: "UP", service: "..." }` |
| `/health/ready` | `GET` | Database & Redis readiness | Status 200 (or 503), `{ dependencies: { database: { healthy: true }, redis: { healthy: true } } }` |

