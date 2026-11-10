# Restaurant Management System (RMS) – Phase 4 API Documentation

## Auth Service & User Service API Specification

**Version:** 1.0.0  
**Base Ingress URL (API Gateway):** `http://localhost:8000`  
**Direct Auth Service URL:** `http://localhost:8001`  
**Direct User Service URL:** `http://localhost:8002`  
**Authentication Standard:** JWT (JSON Web Tokens) with HMAC SHA-256 + Redis Token Blacklisting & Refresh Rotation  

---

## 1. Table Ownership & Architecture Overview

In strict accordance with the Pure Microservices architecture:

| Microservice | Port | Owned Database Tables | Inter-Service Protocol |
| :--- | :---: | :--- | :--- |
| **`auth-service`** | **8001** | `dbo.Roles`, `dbo.Permissions`, `dbo.RolePermissions`, `dbo.UserRoles` | HTTP REST with `X-Internal-Service-Key` |
| **`user-service`** | **8002** | `dbo.Users`, `dbo.Employees`, `dbo.CustomerAddresses`, `dbo.AuditLogs` | HTTP REST with `X-Internal-Service-Key` |
| **`api-gateway`** | **8000** | Reverse Proxy / JWT Verification / Ingress RBAC Guard | Reverse Proxy to downstream ports |

---

## 2. Authentication Service API Endpoints

### 2.1 Customer Registration
- **Endpoint:** `POST /api/v1/auth/register`
- **Access:** Public (Rate limited: 20 req/min)
- **Description:** Registers a new customer account, creates user profile via internal User Service call, assigns `CUSTOMER` role, and returns access/refresh token pair.

**Request Body:**
```json
{
  "firstName": "Rohan",
  "lastName": "Gupta",
  "email": "rohan.gupta@example.com",
  "phoneNumber": "+919876500001",
  "password": "Password@123"
}
```

**Response (HTTP 201 Created):**
```json
{
  "success": true,
  "message": "Customer registered successfully.",
  "data": {
    "user": {
      "userId": "14",
      "firstName": "Rohan",
      "lastName": "Gupta",
      "email": "rohan.gupta@example.com",
      "phoneNumber": "+919876500001",
      "userType": "CUSTOMER",
      "roles": ["CUSTOMER"],
      "permissions": []
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900,
      "tokenType": "Bearer"
    }
  },
  "correlationId": "df404560-abe3-4ce8-a461-a9812d15e440",
  "timestamp": "2026-11-10T11:25:00.497Z"
}
```

---

### 2.2 Customer Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Access:** Public (Rate limited: 20 req/min)
- **Description:** Authenticates customer credentials (email or phone + password), verifies active account status, fetches roles/permissions, issues token pair.

**Request Body:**
```json
{
  "emailOrPhone": "rohan.gupta@example.com",
  "password": "Password@123"
}
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Logged in successfully.",
  "data": {
    "user": {
      "userId": "14",
      "firstName": "Rohan",
      "lastName": "Gupta",
      "email": "rohan.gupta@example.com",
      "phoneNumber": "+919876500001",
      "userType": "CUSTOMER",
      "roles": ["CUSTOMER"],
      "permissions": []
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900,
      "tokenType": "Bearer"
    }
  }
}
```

---

### 2.3 Staff / Administrator Login
- **Endpoint:** `POST /api/v1/auth/staff-login`
- **Access:** Public (Rate limited: 20 req/min)
- **Description:** Verifies credentials and strictly enforces that `userType` is `STAFF` or `ADMIN`. Rejects customer credentials with HTTP 403 `STAFF_ACCESS_REQUIRED`.

**Request Body:**
```json
{
  "emailOrPhone": "admin@antigravitybistro.com",
  "password": "Password@123"
}
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Staff authenticated successfully.",
  "data": {
    "user": {
      "userId": "1",
      "firstName": "Vikram",
      "lastName": "Aditya",
      "email": "admin@antigravitybistro.com",
      "userType": "ADMIN",
      "branchId": 1,
      "roles": ["SUPER_ADMIN"],
      "permissions": [
        "MENU.READ", "MENU.CREATE", "MENU.UPDATE", "MENU.86_TOGGLE",
        "ORDERS.CREATE", "ORDERS.UPDATE", "ORDERS.VOID",
        "BILLING.SETTLE", "BILLING.SPLIT", "BILLING.REFUND",
        "KDS.BUMP", "TABLES.MANAGE", "INVENTORY.CONSUMPTION",
        "INVENTORY.PO_MANAGE", "REPORTS.FINANCIAL", "STAFF.MANAGE"
      ]
    },
    "tokens": { ... }
  }
}
```

---

### 2.4 POS Quick PIN Login
- **Endpoint:** `POST /api/v1/auth/pos-pin-login`
- **Access:** Public (Rate limited)
- **Description:** High-speed 4-digit PIN authentication for POS terminals. Verifies employee code, active employment status, branch assignment, and compares bcrypt hashed PIN.
- **Lockout Defense:** 5 consecutive failures lock the account for 2 minutes (HTTP 423 `PIN_LOCKED`, `retryAfter: 120`).

**Request Body:**
```json
{
  "employeeCode": "EMP-BLR-002",
  "pin": "1234",
  "branchId": 1
}
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "POS PIN authenticated successfully.",
  "data": {
    "employee": {
      "employeeId": "2",
      "employeeCode": "EMP-BLR-002",
      "designation": "Senior Cashier",
      "branchId": 1,
      "user": {
        "userId": "3",
        "firstName": "Rahul",
        "lastName": "Verma",
        "email": "cashier.blr@antigravitybistro.com",
        "userType": "STAFF"
      },
      "roles": ["CASHIER_POS"],
      "permissions": ["ORDERS.CREATE", "ORDERS.UPDATE", "BILLING.SETTLE", "BILLING.SPLIT"]
    },
    "tokens": { ... }
  }
}
```

**Lockout Response (HTTP 423 Locked):**
```json
{
  "success": false,
  "error": {
    "code": "PIN_LOCKED",
    "message": "Too many consecutive failed PIN attempts. Account locked for 2 minutes.",
    "details": { "retryAfterSeconds": 120 }
  }
}
```

---

### 2.5 Refresh Token Rotation
- **Endpoint:** `POST /api/v1/auth/refresh-token`
- **Access:** Public
- **Description:** Exchanges a valid refresh token for a fresh token pair. Employs **Strict Rotation** (old token is revoked) and **Reuse Detection** (re-submitting an already used refresh token immediately revokes all sessions for that user).

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Tokens refreshed successfully.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "refreshToken": "eyJhbGciOiJIUzI1Ni...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

---

### 2.6 Logout & Token Revocation
- **Endpoint:** `POST /api/v1/auth/logout`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Description:** Blacklists the access token JTI in Redis for its remaining lifetime, and removes the active refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully.",
  "data": null
}
```

---

## 3. User Service API Endpoints

### 3.1 Customer Profile
- `GET /api/v1/users/profile` (Protected by Bearer token)
  - Returns authenticated customer profile and active delivery addresses.
  - Excludes sensitive fields (`passwordHash`, `passcodePin`).
- `PUT /api/v1/users/profile` (Protected by Bearer token)
  - Updates profile fields: `firstName`, `lastName`, `phoneNumber`, `avatarUrl`.
  - Automatically records audit log entry in `dbo.AuditLogs`.

---

### 3.2 Customer Address CRUD
- `GET /api/v1/users/addresses`
  - Lists non-deleted delivery addresses for authenticated customer. Ordered by `IsDefault DESC, CreatedAt DESC`.
- `POST /api/v1/users/addresses`
  - Creates delivery address.
  - **Single Default Guarantee:** If `isDefault: true`, all other addresses for this user are atomically updated to `isDefault: false` inside a Sequelize transaction.
- `PUT /api/v1/users/addresses/:id`
  - Updates recipient details, address lines, coordinates.
- `PATCH /api/v1/users/addresses/:id/default`
  - Atomically marks target address as default and unsets all other defaults.
- `DELETE /api/v1/users/addresses/:id`
  - Soft-deletes address record (`isDeleted = true, deletedAt = NOW()`).

---

### 3.3 Staff Management CRUD
- `POST /api/v1/users/staff` (Requires `SUPER_ADMIN` or `RESTAURANT_MANAGER`)
  - Auto-generates sequential EmployeeCode (e.g. `EMP-BLR-005`).
  - Creates user + employee record with bcrypt hashed credentials.
  - Calls Auth Service internal endpoint `POST /api/v1/auth/internal/assign-role` to assign the role.
- `GET /api/v1/users/staff` (Requires `SUPER_ADMIN` or `RESTAURANT_MANAGER`)
  - Paginated list (`page`, `limit`), filtering by `branchId`, `designation`, `status`, and text search.
- `GET /api/v1/users/staff/:id`
  - Returns staff profile joining user details.
- `PUT /api/v1/users/staff/:id`
  - Updates designation, salary, emergency contact, date of leaving.
- `PATCH /api/v1/users/staff/:id/status`
  - Updates employment status (`ACTIVE`, `TERMINATED`, `ON_LEAVE`, `RESIGNED`).
  - Automatically syncs `User.isActive = false` upon termination.

---

## 4. Internal Service-to-Service Contracts

All internal endpoints are strictly isolated from the public network and require the mutual authentication header:
`X-Internal-Service-Key: <INTERNAL_SERVICE_KEY>`

### 4.1 User Service Internal Routes (`URL_USER_SERVICE`)
- `POST /api/v1/users/internal/create`
  - Payload: `{ firstName, lastName, email, phoneNumber, passwordHash, userType, branchId }`
  - Checks for duplicate email and phone. Returns `201 Created` or `409 Conflict`.
- `POST /api/v1/users/internal/lookup`
  - Payload: `{ credential: "<emailOrPhone>" }` or `{ userId: "<id>" }`
  - Returns raw credentials needed by Auth Service (`passwordHash`, `passcodePin`, `isActive`, `userType`, `branchId`).
- `POST /api/v1/users/internal/employee-lookup`
  - Payload: `{ employeeCode: "EMP-BLR-002" }`
  - Returns employee record with joined user credential.
- `PATCH /api/v1/users/internal/:id/last-login`
  - Updates `LastLoginAt` timestamp.

### 4.2 Auth Service Internal Routes (`URL_AUTH_SERVICE`)
- `GET /api/v1/auth/internal/user-roles/:userId`
  - Returns `{ roles: [...], permissions: [...], branchId: ... }`
- `POST /api/v1/auth/internal/assign-role`
  - Payload: `{ userId: 5, roleCode: "WAITSTAFF", branchId: 1 }`
  - Creates or updates `UserRoles` record.
- `GET /api/v1/auth/internal/roles`
  - Returns list of system roles and their permission mappings.

