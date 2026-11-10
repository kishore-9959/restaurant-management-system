# Restaurant Management System (RMS) – Phase 4 Security Implementation Report

**Document Version:** 1.0.0  
**Phase:** Phase 4 (Authentication Service & User Service Implementation)  
**Security Standard Adherence:** OWASP Top 10, NIST Special Publication 800-63B, RFC 7519 (JWT), RFC 6749 / RFC 6819 (OAuth 2.0 Threat Model & Token Rotation)

---

## 1. Executive Summary

Phase 4 establishes enterprise-grade security controls across the Restaurant Management System microservices architecture. Authentication, session tracking, authorization, rate limiting, and brute-force mitigations have been implemented without altering existing database structures or introducing external message broker dependencies.

All security controls were tested and verified via an automated test suite with **100% test pass rate (20 out of 20 requirements passed)**.

---

## 2. Cryptographic Security & Password Hashing

### 2.1 Password Hashing with bcrypt
- **Algorithm:** `bcryptjs` with configurable work factor (`BCRYPT_SALT_ROUNDS=12` in root `.env`).
- **Computational Cost:** Work factor 12 provides \~300ms hashing cost per verification, resisting GPU/ASIC parallel dictionary attacks.
- **Salt Generation:** Unique, cryptographically secure 16-byte random salt generated per hash.
- **Timing Attack Resistance:** Constant-time hash comparison utilized via `bcrypt.compare`.

### 2.2 POS 4-Digit PIN Security
- **Format Enforcement:** Strictly validated to `^\d{4}$`.
- **Storage:** Stored exclusively as bcrypt hashes in `dbo.Users.PasscodePin`.
- **Data Protection:** Plain-text PINs are never persisted in logs, database tables, or returned in API responses.

---

## 3. Session & Token Architecture (JWT + Redis)

### 3.1 Token Specifications
| Token Type | Lifespan | Signing Algorithm | Claims Embedded | Storage Mechanism |
| :--- | :---: | :---: | :--- | :--- |
| **Access Token** | **15 minutes** | HMAC SHA-256 | `sub` (userId), `email`, `userType`, `branchId`, `roles[]`, `permissions[]`, `jti` | Stateless client bearer |
| **Refresh Token** | **7 days** | HMAC SHA-256 | `sub` (userId), `jti`, `type: 'refresh'` | Redis (`auth:refresh:<jti>`) |

### 3.2 Token Validation Controls
- **Issuer Validation:** Validated to `rms-auth-service`.
- **Audience Validation:** Validated to `rms-client`.
- **Signature Integrity:** Verified using separate 32+ character secrets (`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`).

### 3.3 Refresh Token Rotation & Reuse Detection (RFC 6819)
- **Rotation:** Upon refresh (`POST /api/v1/auth/refresh-token`), the incoming refresh token is immediately invalidated in Redis and a fresh token pair is generated.
- **Reuse Detection:** The rotated token's JTI is flagged in Redis (`auth:refresh:used:<jti>`) for 24 hours.
- **Compromise Mitigation:** If an attacker attempts to replay a previously rotated refresh token, the system detects token theft, immediately revokes **all** active refresh tokens belonging to that user ID, and returns HTTP 403 `TOKEN_REUSE_DETECTED`.

### 3.4 Immediate Token Revocation (Blacklist)
- Upon logout (`POST /api/v1/auth/logout`), the access token's `jti` is stored in Redis under `auth:revoked:<jti>` with a TTL equal to the token's remaining validity.
- The API Gateway and downstream Auth guards query Redis to reject blacklisted tokens with HTTP 401 `TOKEN_REVOKED`.

---

## 4. Brute-Force & Denial-of-Service Mitigations

### 4.1 POS PIN Brute-Force Lockout
- **Threshold:** 5 consecutive incorrect PIN attempts.
- **Mechanism:** Redis atomic increment (`auth:pin:attempts:<userId>`) with 120-second sliding expiration.
- **Lockout Action:** On the 5th failure, a lockout key (`auth:pin:locked:<userId>`) is set with a 120-second TTL.
- **Response:** Subsequent attempts (even with the correct PIN) are rejected with HTTP 423 Locked (`PIN_LOCKED`, `retryAfterSeconds: 120`).
- **Recovery:** Lock automatically lifts upon Redis key expiration or successful admin unlock.

### 4.2 Ingress Rate Limiting
- **Gateway Rate Limiter:** Applied across all public ingress routes (100 requests per minute per IP).
- **Auth Endpoint Rate Limiter:** Applied to `/register`, `/login`, `/staff-login`, `/pos-pin-login` (20 requests per minute per IP).
- **Backend Storage:** Redis-backed with automatic in-memory fallback.

---

## 5. Authorization & Multi-Tenancy Boundaries

### 5.1 Role-Based Access Control (RBAC)
Supported system roles from `dbo.Roles`:
1. `SUPER_ADMIN` (Master override access across all branches and modules)
2. `RESTAURANT_MANAGER` (Full store operations, staff management, reports)
3. `CASHIER_POS` (Point-of-sale orders, cash register shifts, bill settlement)
4. `WAITSTAFF` (Dine-in tables, order placement, KOT status tracking)
5. `KITCHEN_CHEF` (Kitchen display system, recipe consumption, 86 toggling)
6. `CUSTOMER` (Menu browsing, ordering, profile & address management)

### 5.2 Granular Permissions
Granular permission codes verified against `dbo.Permissions` and `dbo.RolePermissions`:
- `MENU.*`, `ORDERS.*`, `BILLING.*`, `KDS.*`, `TABLES.*`, `INVENTORY.*`, `REPORTS.*`, `STAFF.MANAGE`.

### 5.3 Multi-Tenant Branch Isolation
- Users and employees are explicitly bound to a `branchId`.
- Downstream endpoints enforce branch-level boundaries via `requireBranch` middleware. Employees cannot authenticate on or mutate resources belonging to unassigned branches.

---

## 6. Microservices Isolation & Trust Boundaries

### 6.1 Strict Table Ownership
- **Auth Service** owns identity credentials, roles, permissions, and session tracking.
- **User Service** owns personal data, addresses, staff metadata, and audit logs.
- Cross-service data requests are executed strictly over HTTP REST using authenticated internal interfaces.

### 6.2 Mutual Internal Authentication
- All internal microservice-to-microservice endpoints (`/api/v1/*/internal/*`) require the `X-Internal-Service-Key` header.
- Client requests routed through the API Gateway cannot access internal routes (enforced by the Gateway reverse proxy whitelist).

### 6.3 Header Tampering Prevention
- Client-supplied `X-User-ID`, `X-User-Role`, or `X-Branch-ID` headers are stripped at the API Gateway ingress.
- Gateway injects verified caller context headers downstream only after successful cryptographic signature and revocation checks.

### 6.4 SQL Injection Defense
- 100% of database interactions utilize Sequelize parameterized statements with typed parameters via tedious. Zero dynamic string concatenation is permitted in SQL queries.

### 6.5 Data Exposure Prevention
- Public user endpoints strip `passwordHash`, `passcodePin`, and soft-deleted records.
- Generic error messages are returned on login failures ("Invalid email, phone number, or password") to prevent user enumeration attacks.

