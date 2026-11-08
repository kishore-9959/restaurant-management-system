# Restaurant Management System (RMS)
## Master Global Environment Architecture & Secret Specification

---

### 1. Single Global Environment Policy

In strict adherence to project architectural constraints:
- **Location**: Exactly **one global environment file** exists at the project root: `restaurant-management-system/.env`.
- **Template**: A corresponding clean template [**`.env.example`**](file:///c:/Projects/restaurant-management-system/restaurant-management-system/.env.example) contains all required variable names with dummy placeholders.
- **No Service-Level `.env` Files**: Individual microservices (`backend/auth-service`, `backend/order-service`, etc.) **must never** create or maintain local `.env` files.
- **Security & Version Control**: The live `.env` file is permanently ignored in `.gitignore` and never committed to version control.

---

### 2. Loading Strategy (Local Development vs Docker)

#### 2.1 Local Development (Node.js Direct Run)
When running a microservice locally during development, each service initializes `dotenv` pointing directly to the root `.env` file using a robust path resolver utility:

```javascript
// backend/shared/config/envLoader.js or in each service's index.js
const path = require('path');
const dotenv = require('dotenv');

// Resolves to restaurant-management-system/.env regardless of service directory depth
const rootEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: rootEnvPath });
```

#### 2.2 Containerized Deployment (Docker Compose)
In Docker Compose, Docker automatically parses the single root `.env` file and injects the declared environment variables directly into each container's process environment:

```yaml
services:
  order-service:
    build: ./backend/order-service
    env_file:
      - .env
    environment:
      - PORT=${PORT_ORDER_SERVICE}
      - DB_HOST=mssql
      - REDIS_HOST=redis
```

---

### 3. Master Configuration Variable Catalog

The global environment configuration is grouped into 11 distinct operational categories:

| Category | Variable Name | Default / Example Value | Description |
| :--- | :--- | :--- | :--- |
| **System** | `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| **System** | `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003` | Whitelisted frontend client domains |
| **Database** | `DB_HOST` | `localhost` (local) / `mssql` (docker) | Microsoft SQL Server host |
| **Database** | `DB_PORT` | `1433` | Microsoft SQL Server port |
| **Database** | `DB_NAME` | `RestaurantManagementDB` | Shared enterprise database name |
| **Database** | `DB_USER` | `sa` | SQL Server database user |
| **Database** | `DB_PASSWORD` | `YourStrong!Passw0rd` | SQL Server database password |
| **Database** | `DB_DIALECT` | `mssql` | Sequelize dialect (TDS via `tedious`) |
| **Database** | `DB_POOL_MAX` | `20` | Max connections per microservice pool |
| **Database** | `DB_POOL_MIN` | `2` | Min idle connections per service pool |
| **Redis** | `REDIS_HOST` | `localhost` / `redis` | Redis in-memory cache host |
| **Redis** | `REDIS_PORT` | `6379` | Redis port |
| **Redis** | `REDIS_PASSWORD` | `redis_secret_pass` | Redis auth password |
| **Security** | `JWT_ACCESS_SECRET` | `super_secret_jwt_access_key_min_32_chars` | Signing key for short-lived access tokens (15m) |
| **Security** | `JWT_REFRESH_SECRET` | `super_secret_jwt_refresh_key_min_32_chars` | Signing key for refresh tokens (7d) |
| **Security** | `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token lifespan |
| **Security** | `JWT_REFRESH_EXPIRES_IN`| `7d` | Refresh token lifespan |
| **Security** | `INTERNAL_SERVICE_KEY` | `shared_microservice_internal_secret_token` | Pre-shared key for service-to-service REST auth |
| **Ports** | `PORT_API_GATEWAY` | `5000` | Ingress API Gateway port |
| **Ports** | `PORT_AUTH_SERVICE` | `5001` | Auth Service port |
| **Ports** | `PORT_USER_SERVICE` | `5002` | User & Staff Service port |
| **Ports** | `PORT_RESTAURANT_SERVICE`| `5003`| Branches & Tables Service port |
| **Ports** | `PORT_CMS_SERVICE` | `5004` | Dynamic Website CMS Service port |
| **Ports** | `PORT_MENU_SERVICE` | `5005` | Menu & Catalog Service port |
| **Ports** | `PORT_CART_SERVICE` | `5006` | Shopping Cart Service port |
| **Ports** | `PORT_ORDER_SERVICE` | `5007` | Order Orchestration Service port |
| **Ports** | `PORT_PAYMENT_SERVICE`| `5008` | Payments & Razorpay Service port |
| **Ports** | `PORT_INVENTORY_SERVICE`| `5009`| Stock & Recipe BOM Service port |
| **Ports** | `PORT_KITCHEN_SERVICE` | `5010` | Kitchen Display KDS Service port |
| **Ports** | `PORT_RESERVATION_SERVICE`| `5011`| Table Reservations Service port |
| **Ports** | `PORT_NOTIFICATION_SERVICE`| `5012`| WebSocket Socket.IO Service port |
| **Ports** | `PORT_REPORT_SERVICE` | `5013` | Reporting & Analytics Service port |
| **Internal URLs**| `URL_AUTH_SERVICE` | `http://localhost:5001` / `http://auth-service:5001` | REST endpoint for inter-service auth calls |
| **Internal URLs**| `URL_USER_SERVICE` | `http://localhost:5002` / `http://user-service:5002` | REST endpoint for user profile lookups |
| **Internal URLs**| `URL_RESTAURANT_SERVICE`| `http://localhost:5003` / `http://restaurant-service:5003` | REST endpoint for table lookups |
| **Internal URLs**| `URL_CMS_SERVICE` | `http://localhost:5004` / `http://cms-service:5004` | REST endpoint for CMS content |
| **Internal URLs**| `URL_MENU_SERVICE` | `http://localhost:5005` / `http://menu-service:5005` | REST endpoint for dish pricing verification |
| **Internal URLs**| `URL_CART_SERVICE` | `http://localhost:5006` / `http://cart-service:5006` | REST endpoint for cart sessions |
| **Internal URLs**| `URL_ORDER_SERVICE`| `http://localhost:5007` / `http://order-service:5007` | REST endpoint for order status checks |
| **Internal URLs**| `URL_PAYMENT_SERVICE`| `http://localhost:5008` / `http://payment-service:5008` | REST endpoint for payment settlement |
| **Internal URLs**| `URL_INVENTORY_SERVICE`| `http://localhost:5009` / `http://inventory-service:5009` | REST endpoint for BOM stock depletion |
| **Internal URLs**| `URL_KITCHEN_SERVICE`| `http://localhost:5010` / `http://kitchen-service:5010` | REST endpoint for KOT ticket creation |
| **Internal URLs**| `URL_RESERVATION_SERVICE`| `http://localhost:5011` / `http://reservation-service:5011`| REST endpoint for reservation validation |
| **Internal URLs**| `URL_NOTIFICATION_SERVICE`| `http://localhost:5012` / `http://notification-service:5012`| REST endpoint for socket broadcasts |
| **Internal URLs**| `URL_REPORT_SERVICE`| `http://localhost:5013` / `http://report-service:5013` | REST endpoint for report queries |
| **Cloudinary** | `CLOUDINARY_CLOUD_NAME` | `demo-cloud` | Cloudinary tenant account name |
| **Cloudinary** | `CLOUDINARY_API_KEY` | `123456789012345` | Cloudinary API Key |
| **Cloudinary** | `CLOUDINARY_API_SECRET` | `abcdefghijklmnopqrstuvw` | Cloudinary API Secret for signed uploads |
| **Razorpay** | `RAZORPAY_KEY_ID` | `rzp_test_1234567890abcdef` | Razorpay public key ID |
| **Razorpay** | `RAZORPAY_KEY_SECRET` | `secret_abcdef1234567890` | Razorpay private secret key |
| **Razorpay** | `RAZORPAY_WEBHOOK_SECRET` | `whsec_abcdef1234567890` | Webhook HMAC SHA256 validation secret |
| **Email/SMTP** | `SMTP_HOST` | `smtp.mailtrap.io` | SMTP server host |
| **Email/SMTP** | `SMTP_PORT` | `587` | SMTP server port |
| **Email/SMTP** | `SMTP_USER` | `mailtrap_user` | SMTP username |
| **Email/SMTP** | `SMTP_PASS` | `mailtrap_password` | SMTP password |
| **Email/SMTP** | `EMAIL_FROM` | `no-reply@antigravitybistro.com` | Outgoing system sender address |

