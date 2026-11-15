# Restaurant Management System (RMS)
## Phase 9: Payment Service REST API Specification

---

### 1. Service Specification

- **Microservice**: `payment-service`
- **Internal Port**: `8008`
- **API Gateway URL**: `http://localhost:8000/api/v1/payments`
- **Authentication**: JWT Bearer Token / Internal Mesh Key (`X-Internal-Service-Key`)
- **Tracing Header**: `X-Correlation-ID` (UUID v4)
- **Database**: Microsoft SQL Server 2022 (`RestaurantManagementDB`, 100% Stored Procedures)
- **Idempotency Store**: Redis (`localhost:6379`)

---

### 2. RBAC & Security Matrix

| Endpoint | Method | Allowed Roles / Auth Level | Required Permission |
| :--- | :---: | :--- | :--- |
| `/health/live` | `GET` | Public (Unauthenticated) | None |
| `/health/ready` | `GET` | Public (Unauthenticated) | None |
| `/razorpay/create-order` | `POST` | `CUSTOMER`, `WAITSTAFF`, `CASHIER_POS`, `RESTAURANT_MANAGER`, `SUPER_ADMIN` | `payments:create` |
| `/razorpay/verify` | `POST` | `CUSTOMER`, `WAITSTAFF`, `CASHIER_POS`, `RESTAURANT_MANAGER`, `SUPER_ADMIN` | `payments:create` |
| `/razorpay/webhook` | `POST` | Public (Verified by `X-Razorpay-Signature`) | None |
| `/offline-settle` | `POST` | `CASHIER_POS`, `RESTAURANT_MANAGER`, `SUPER_ADMIN` | `payments:settle` |
| `/refund` | `POST` | `RESTAURANT_MANAGER`, `SUPER_ADMIN` | `payments:refund` |
| `/refunds/:refundId` | `GET` | `RESTAURANT_MANAGER`, `SUPER_ADMIN` | `payments:view` |
| `/:id` | `GET` | Staff (`CASHIER_POS`, `RESTAURANT_MANAGER`, `SUPER_ADMIN`) or Owner Customer | `payments:view` |
| `/status/:id` | `GET` | Staff or Owner Customer | `payments:view` |
| `/order/:orderId` | `GET` | Staff or Owner Customer | `payments:view` |
| `/` (List) | `GET` | Staff (`CASHIER_POS`, `RESTAURANT_MANAGER`, `SUPER_ADMIN`) | `payments:view` |
| `/reports/reconciliation` | `GET` | `RESTAURANT_MANAGER`, `SUPER_ADMIN` | `payments:manage` |

---

### 3. API Endpoints

#### 3.1 Health & Readiness Probes

##### `GET /health/live` & `GET /api/v1/payments/health/live`
- **Description**: Lightweight Kubernetes/Container liveness probe.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "payment-service",
    "uptimeSeconds": 125.4,
    "timestamp": "2026-11-15T17:20:02.783Z"
  },
  "message": "Payment Service is live",
  "correlationId": "90b8127d-cf70-4587-98b1-93d68bdf54de",
  "timestamp": "2026-11-15T17:20:02.783Z"
}
```

##### `GET /health/ready` & `GET /api/v1/payments/health/ready`
- **Description**: Readiness probe testing SQL Server database and Redis connectivity.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "payment-service",
    "dependencies": {
      "database": { "healthy": true, "message": "Connected to SQL Server" },
      "redis": { "healthy": true, "message": "Connected to Redis" }
    }
  },
  "message": "Payment Service is ready to serve traffic",
  "correlationId": "3b55159a-d682-4b05-9f9b-33a2332e3c04",
  "timestamp": "2026-11-15T17:20:02.801Z"
}
```

---

#### 3.2 Online Razorpay Payments

##### `POST /api/v1/payments/razorpay/create-order`
- **Description**: Initializes an online payment intent, generates a Razorpay order, and records a `PENDING` payment.
- **Request Body**:
```json
{
  "orderId": 100012,
  "branchId": 1,
  "paymentMethod": "RAZORPAY",
  "amount": 472.50
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "paymentId": 15,
    "paymentReference": "PAY-20261115-100012-A1B2C3",
    "orderId": 100012,
    "amount": 472.50,
    "currency": "INR",
    "gatewayOrderId": "order_74e72ce118414ac6",
    "razorpayKeyId": "rzp_test_placeholder_key_id",
    "status": "PENDING"
  },
  "message": "Razorpay payment order initialized successfully",
  "correlationId": "6de8461b-2c96-436e-bc75-79b13c096604",
  "timestamp": "2026-11-15T17:20:02.944Z"
}
```

##### `POST /api/v1/payments/razorpay/verify`
- **Description**: Cryptographically verifies the checkout HMAC-SHA256 signature and captures the payment to `SUCCESS`.
- **Request Body**:
```json
{
  "paymentId": 15,
  "gatewayOrderId": "order_74e72ce118414ac6",
  "gatewayPaymentId": "pay_test_capture_999",
  "gatewaySignature": "sig_test_hmac_valid_hash"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "paymentId": 15,
    "paymentReference": "PAY-20261115-100012-A1B2C3",
    "orderId": 100012,
    "amount": 472.50,
    "paymentStatus": "SUCCESS",
    "gatewayPaymentId": "pay_test_capture_999",
    "settledAt": "2026-11-15T17:20:03.100Z",
    "isIdempotent": false
  },
  "message": "Payment verified and captured successfully",
  "correlationId": "3602abb9-690a-412e-90f2-11321a3646ba",
  "timestamp": "2026-11-15T17:20:03.112Z"
}
```

##### `POST /api/v1/payments/razorpay/webhook`
- **Description**: Public webhook ingestion endpoint for Razorpay asynchronous events. Validates `X-Razorpay-Signature` against raw request buffer.
- **Headers Required**: `X-Razorpay-Signature: <hmac_hex>`
- **Request Body (Example: payment.captured)**:
```json
{
  "id": "evt_test_1794743200",
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_test_capture_999",
        "order_id": "order_74e72ce118414ac6",
        "amount": 47250,
        "status": "captured"
      }
    }
  }
}
```
- **Response (200 OK)**:
```json
{
  "status": "ok",
  "received": true,
  "event": "payment.captured",
  "result": {
    "paymentId": 15,
    "paymentStatus": "SUCCESS"
  }
}
```

---

#### 3.3 Offline POS Settlement

##### `POST /api/v1/payments/offline-settle`
- **Description**: Instantly settles counter payments tendered via Cash, Credit Card, Debit Card, or UPI Offline.
- **Request Body**:
```json
{
  "orderId": 100013,
  "branchId": 1,
  "paymentMethod": "CASH",
  "amount": 210.00,
  "notes": "Exact cash tendered at counter 1"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "paymentId": 16,
    "orderId": 100013,
    "branchId": 1,
    "paymentReference": "PAY-20261115-100013-C4D5E6",
    "paymentMethod": "CASH",
    "amount": 210.00,
    "paymentStatus": "SUCCESS",
    "settledByUserId": 3,
    "settledAt": "2026-11-15T17:20:03.450Z"
  },
  "message": "Payment settled successfully via CASH",
  "correlationId": "5ee074e9-e782-45c9-8421-a1b0825c3297",
  "timestamp": "2026-11-15T17:20:03.460Z"
}
```

---

#### 3.4 Refund Management

##### `POST /api/v1/payments/refund`
- **Description**: Processes a full or partial refund against a `SUCCESS` payment. Invokes gateway refund if payment method is `RAZORPAY`.
- **Request Body**:
```json
{
  "paymentId": 15,
  "refundAmount": 150.00,
  "reason": "Customer returned cold appetizer"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "refundId": 4,
    "paymentId": 15,
    "gatewayRefundId": "rfnd_a1b2c3d4e5f6g7h8",
    "refundAmount": 150.00,
    "reason": "Customer returned cold appetizer",
    "status": "PROCESSED",
    "originalAmount": 472.50,
    "totalRefunded": 150.00,
    "remainingBalance": 322.50,
    "paymentStatus": "PARTIALLY_REFUNDED"
  },
  "message": "Refund processed successfully",
  "correlationId": "7c88b22a-4421-4f11-9a1d-289bceef4431",
  "timestamp": "2026-11-15T17:20:03.550Z"
}
```

##### `GET /api/v1/payments/refunds/:refundId`
- **Description**: Retrieves full refund details including parent payment reference and issuing manager user details.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "RefundId": 4,
    "PaymentId": 15,
    "GatewayRefundId": "rfnd_a1b2c3d4e5f6g7h8",
    "RefundAmount": 150.00,
    "Reason": "Customer returned cold appetizer",
    "Status": "PROCESSED",
    "InitiatedByUserId": 2,
    "InitiatedByUserName": "Manager Bangalore",
    "ProcessedAt": "2026-11-15T17:20:03.550Z",
    "PaymentReference": "PAY-20261115-100012-A1B2C3",
    "PaymentMethod": "RAZORPAY",
    "OriginalPaymentAmount": 472.50
  },
  "message": "Refund record retrieved successfully",
  "timestamp": "2026-11-15T17:20:03.580Z"
}
```

---

#### 3.5 Lookups & Query APIs

##### `GET /api/v1/payments/:id`
- **Description**: Multi-recordset fetch returning payment header, audit ledger transactions, refunds, and financial summary.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "PaymentId": 15,
    "OrderId": 100012,
    "BranchId": 1,
    "BranchName": "Antigravity Bistro Indiranagar",
    "PaymentReference": "PAY-20261115-100012-A1B2C3",
    "PaymentMethod": "RAZORPAY",
    "Amount": 472.50,
    "PaymentStatus": "REFUNDED",
    "transactions": [
      {
        "TransactionId": 45,
        "TransactionType": "REFUND",
        "Amount": 322.50,
        "Status": "SUCCESS",
        "TransactionDate": "2026-11-15T17:20:03.590Z"
      },
      {
        "TransactionId": 44,
        "TransactionType": "REFUND",
        "Amount": 150.00,
        "Status": "SUCCESS",
        "TransactionDate": "2026-11-15T17:20:03.550Z"
      },
      {
        "TransactionId": 42,
        "TransactionType": "CHARGE",
        "Amount": 472.50,
        "Status": "SUCCESS",
        "TransactionDate": "2026-11-15T17:20:03.100Z"
      }
    ],
    "refunds": [
      {
        "RefundId": 5,
        "RefundAmount": 322.50,
        "Reason": "Full order refund approved by manager",
        "Status": "PROCESSED"
      },
      {
        "RefundId": 4,
        "RefundAmount": 150.00,
        "Reason": "Customer returned cold appetizer",
        "Status": "PROCESSED"
      }
    ],
    "summary": {
      "originalAmount": 472.50,
      "totalRefunded": 472.50,
      "netSettledAmount": 0.00
    }
  },
  "message": "Payment details retrieved successfully"
}
```

##### `GET /api/v1/payments/status/:id`
- **Description**: High-performance lightweight status check by `PaymentId` or `PaymentReference`.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "PaymentId": 15,
    "PaymentReference": "PAY-20261115-100012-A1B2C3",
    "PaymentStatus": "REFUNDED",
    "Amount": 472.50,
    "SettledAt": "2026-11-15T17:20:03.100Z"
  },
  "message": "Payment status retrieved successfully"
}
```

##### `GET /api/v1/payments/order/:orderId`
- **Description**: Returns all payments, settlements, and refund aggregates for an order (supports split billing).
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "orderId": 100012,
    "payments": [
      {
        "PaymentId": 15,
        "PaymentReference": "PAY-20261115-100012-A1B2C3",
        "PaymentMethod": "RAZORPAY",
        "Amount": 472.50,
        "PaymentStatus": "REFUNDED"
      }
    ],
    "refunds": [
      { "RefundId": 4, "RefundAmount": 150.00 },
      { "RefundId": 5, "RefundAmount": 322.50 }
    ],
    "summary": {
      "totalPaid": 472.50,
      "totalRefunded": 472.50,
      "netSettled": 0.00
    }
  },
  "message": "Order payments retrieved successfully"
}
```

##### `GET /api/v1/payments?branchId=1&page=1&limit=20`
- **Description**: Filtered, paginated listing of payments.
- **Query Parameters**:
  - `branchId` (int, optional): Filter by branch.
  - `paymentStatus` (string, optional): `PENDING`, `SUCCESS`, `FAILED`, `PARTIALLY_REFUNDED`, `REFUNDED`.
  - `paymentMethod` (string, optional): `RAZORPAY`, `CASH`, `CREDIT_CARD`, `DEBIT_CARD`, `UPI_OFFLINE`.
  - `page` (int, default: 1): Page index.
  - `limit` (int, default: 20, max: 100): Page size.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "PaymentId": 15,
      "PaymentReference": "PAY-20261115-100012-A1B2C3",
      "PaymentMethod": "RAZORPAY",
      "Amount": 472.50,
      "PaymentStatus": "REFUNDED"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalRecords": 3,
    "totalPages": 1
  },
  "message": "Payments list retrieved successfully"
}
```

---

#### 3.6 Financial Reconciliation Reports

##### `GET /api/v1/payments/reports/reconciliation?branchId=1`
- **Description**: Executive financial collections and method breakdown summary.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalTransactions": 2,
      "grossCollections": 682.50,
      "totalRefunds": 472.50,
      "netCollections": 210.00
    },
    "breakdownByMethod": [
      {
        "PaymentMethod": "RAZORPAY",
        "TransactionCount": 1,
        "TotalAmount": 472.50
      },
      {
        "PaymentMethod": "CASH",
        "TransactionCount": 1,
        "TotalAmount": 210.00
      }
    ]
  },
  "message": "Reconciliation summary report generated successfully"
}
```

---

### 4. Inter-Service Communication Contract

#### `PATCH /api/v1/orders/:orderId/payment-status` (Order Service :8007)
- **Origin**: `payment-service` (:8008)
- **Target**: `order-service` (:8007)
- **Authentication**: `X-Internal-Service-Key` or Admin JWT
- **Request Body**:
```json
{
  "paymentStatus": "PAID",
  "amount": 472.50,
  "paymentMethod": "RAZORPAY",
  "paymentReference": "PAY-20261115-100012-A1B2C3"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "orderId": 100012,
    "orderStatus": "COMPLETED",
    "paymentStatus": "PAID"
  },
  "message": "Order payment status updated successfully"
}
```

