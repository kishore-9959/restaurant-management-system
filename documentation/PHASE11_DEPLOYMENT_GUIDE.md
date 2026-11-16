# Restaurant Management System (RMS)
## Phase 11: CMS Service & Customer Frontend Deployment Guide

---

### 1. Service Overview

Phase 11 encompasses the dynamic website content management microservice (`cms-service`) and the public-facing guest web application (`frontend/customer-web`).

| Component | Directory | Port | Protocol / Ingress |
| :--- | :--- | :---: | :--- |
| **CMS Microservice** | `backend/cms-service/` | `8004` | HTTP REST (`/api/v1/cms`) |
| **API Gateway Ingress** | `backend/api-gateway/` | `8000` | Reverse Proxy (`http://localhost:8000/api/v1/cms`) |
| **Customer Web Frontend** | `frontend/customer-web/` | `5173` | Vite Dev / HTTP Web Server |
| **Database Server** | MS SQL Server 2022 | `1435` | `RestaurantManagementDB` |
| **Cache Server** | Redis 7.x | `6379` | Cache-Aside & Namespace Versioning |

---

### 2. Database Deployment

The CMS service relies exclusively on 47 stored procedures (SPs 163–209) and 11 core tables created during initial database initialization.

#### Step 2.1: Verify Connection & Prerequisites
Ensure SQL Server is running on port 1435 and that the root `.env` defines:
```env
DB_SERVER=localhost
DB_PORT=1435
DB_DATABASE=RestaurantManagementDB
DB_USER=sa
DB_PASSWORD=<your_db_password>
```

#### Step 2.2: Apply Stored Procedures
Deploy `database/15_CMSStoredProcedures.sql` to `RestaurantManagementDB`:
```powershell
# Using the automated deployment script:
node scripts/test_phase11_database.js
```
Or execute via `sqlcmd`:
```bash
sqlcmd -S localhost,1435 -U sa -P "<your_password>" -d RestaurantManagementDB -i database/15_CMSStoredProcedures.sql
```

---

### 3. Environment Variables

All microservices read configuration from the single root `.env` via `@rms/shared/config/env.js`. Verify the following parameters exist in root `.env`:

```env
# System Ports
PORT_CMS_SERVICE=8004
PORT_API_GATEWAY=8000
PORT_NOTIFICATION_SERVICE=8012

# Microservice URLs
URL_CMS_SERVICE=http://localhost:8004
URL_NOTIFICATION_SERVICE=http://localhost:8012
URL_MENU_SERVICE=http://localhost:8005
URL_RESTAURANT_SERVICE=http://localhost:8003

# Internal Service Inter-Communication Key
INTERNAL_SERVICE_KEY=rms_super_secret_internal_microservice_mesh_key_2026

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Security
JWT_ACCESS_SECRET=rms_super_secret_jwt_access_key_min_32_characters_long_12345
JWT_ACCESS_EXPIRES_IN=1h

# Cloudinary CDN Configuration
CLOUDINARY_CLOUD_NAME=rms-dining
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

### 4. Backend Service Startup (`backend/cms-service`)

#### Step 4.1: Install Dependencies
```powershell
cd backend/cms-service
npm install
```

#### Step 4.2: Start CMS Service in Development
```powershell
npm run dev
```

#### Step 4.3: Start CMS Service in Production
```powershell
npm start
```
The service logs its startup confirmation:
```
[INFO] [cms-service]: CMS Service listening on port 8004 in production mode.
[INFO] [cms-service]: Connected to SQL Server RestaurantManagementDB on localhost:1435.
[Redis] Connected to localhost:6379
```

---

### 5. Public Customer Frontend Startup (`frontend/customer-web`)

#### Step 5.1: Install Dependencies
```powershell
cd frontend/customer-web
npm install
```

#### Step 5.2: Launch Local Development Server
```powershell
npm run dev
```
Vite will boot the customer frontend on `http://localhost:5173`.

#### Step 5.3: Production Build
```powershell
npm run build
```
Generates optimized static assets in `frontend/customer-web/dist/` suitable for deployment on Nginx, Cloudflare Pages, AWS S3, or CloudFront.

---

### 6. Health & Verification Endpoints

#### CMS Service Direct Probes:
- **Liveness**: `curl -s http://localhost:8004/health/live`
  - Response: `{"statusCode":200,"data":{"status":"UP"},"message":"CMS service is healthy"}`
- **Readiness**: `curl -s http://localhost:8004/health/ready`
  - Response: `{"statusCode":200,"data":{"status":"UP","database":"CONNECTED","redis":"CONNECTED"}}`

#### API Gateway Ingress Routes:
- **Public Website Settings**: `curl -s http://localhost:8000/api/v1/cms/public/settings`
- **Public Navigation**: `curl -s http://localhost:8000/api/v1/cms/public/navigation`
- **Public Banners**: `curl -s http://localhost:8000/api/v1/cms/public/banners`
- **Public FAQs**: `curl -s http://localhost:8000/api/v1/cms/public/faqs`

---

### 7. Operational Troubleshooting

1. **Stale Content Displayed After CMS Edits**:
   - CMS Service uses atomic cache versioning. If Redis connection dropped during an update, manually invalidate the cache namespace:
     ```bash
     redis-cli INCR cms:version
     ```
2. **Contact Inquiry Fails with 500**:
   - Ensure `dbo.ContactMessages` table exists in `RestaurantManagementDB`.
   - Verify that `notification-service` is listening on port 8012; note that even if `notification-service` is down, CMS gracefully saves the message and logs a warning without aborting the guest submission.
3. **Draft Page Preview Returns 401/403**:
   - Previews require `?preview=true` and a valid Bearer token for a user with `SUPER_ADMIN` or `RESTAURANT_MANAGER` roles. Standard `CUSTOMER` or anonymous tokens are intentionally denied.

