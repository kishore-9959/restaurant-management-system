# PHASE 12: RESERVATION SERVICE & FLOOR SCHEDULING
## Production Deployment & Operational Rollout Guide

---

## 1. Prerequisites & Environment Setup

Verify the following system requirements prior to rollout:

- **Node.js:** v20.x or v22.x LTS
- **SQL Server:** Microsoft SQL Server 2022 (Port 1435)
- **Redis:** Redis 7+ (Port 6379)
- **Shared Configuration:** `backend/shared/config/env.js` loading root `.env`
- **Dependencies:** Run `npm install` across workspace root.

---

## 2. Database Migration Procedure

Strict protocol mandate: Always execute pre-validation against the isolated test database before updating the primary database.

### Step 2.1: Pre-Validation in Isolated Database
Deploy and run automated unit tests on `RestaurantManagementDB_IsolatedTest`:
```powershell
node scripts/test_phase12_database.js
```
The script will:
1. Connect to `RestaurantManagementDB_IsolatedTest`.
2. Execute `database/16_ReservationStoredProcedures.sql` in batches.
3. Verify that all 16 stored procedures exist in `INFORMATION_SCHEMA.ROUTINES`.
4. Execute `database/tests/16_ReservationStoredProcedures_Test.sql` and verify that all 19 unit test assertions pass.
5. Upon 100% success, automatically deploy `16_ReservationStoredProcedures.sql` to `RestaurantManagementDB`.

### Step 2.2: Manual Procedure Verification in Production (Optional)
Connect via SQL Server Management Studio (SSMS) or `sqlcmd`:
```sql
USE RestaurantManagementDB;
GO

SELECT ROUTINE_NAME 
FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'usp_Reservation_%'
ORDER BY ROUTINE_NAME;
GO
```
Ensure exactly 16 stored procedures are returned (SPs 210 through 225).

---

## 3. Microservice Configuration & Launch

### Step 3.1: Environment Variables
Confirm the following variables in root `.env`:
```env
PORT_RESERVATION_SERVICE=8011
URL_RESERVATION_SERVICE=http://localhost:8011
URL_RESTAURANT_SERVICE=http://localhost:8003
URL_NOTIFICATION_SERVICE=http://localhost:8012
URL_API_GATEWAY=http://localhost:8000
INTERNAL_SERVICE_KEY=rms_internal_microservice_mesh_secret_token_54321
```

### Step 3.2: Launch Reservation Service
Standalone service startup:
```powershell
cd backend/reservation-service
npm start
```
Or via root npm script:
```powershell
npm run dev:reservation
```

### Step 3.3: Verify Health Probes
```powershell
curl http://localhost:8011/health/live
curl http://localhost:8011/health/ready
```
Expected response:
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "reservation-service"
  }
}
```

---

## 4. API Gateway Ingress Verification

The API Gateway configuration in `backend/api-gateway/src/config/gatewayConfig.js` proxies `/api/v1/reservations` to `http://localhost:8011`.

Verify ingress routing through port 8000:
```powershell
curl http://localhost:8000/api/v1/reservations/public/branches/1/slots?reservationDate=2026-11-20&partySize=2
```
Expected: HTTP 200 OK with time slots JSON.

---

## 5. Customer Web Frontend Deployment

### Step 5.1: Build Customer Web
```powershell
cd frontend/customer-web
npm run build
```
Verify the production build artifacts in `frontend/customer-web/dist/`.

### Step 5.2: Verification Checklist
- Access `/reservations` in browser.
- Verify 4-step booking wizard loads branch list, dates, party sizes, and dynamic slots.
- Test self-service lookup under "Find / Cancel Booking" tab.

---

## 6. Rollback Plan

If unexpected failures occur during production rollout:
1. **Database Rollback:**
   ```sql
   USE RestaurantManagementDB;
   GO
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_Create;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_GetById;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_List;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_Update;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_Cancel;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_UpdateStatus;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_AssignTable;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_ReleaseTable;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_CheckAvailability;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_GetTimeSlots;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_ListByCustomer;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_GetDashboardSummary;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_CreateWalkIn;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_GetFloorTimeline;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_GetStatusHistory;
   DROP PROCEDURE IF EXISTS dbo.usp_Reservation_AutoMarkNoShows;
   GO
   ```
2. **Gateway Rollback:**
   Revert public whitelist and RBAC patterns in `backend/api-gateway/src/config/gatewayConfig.js`.
3. **Frontend Rollback:**
   Revert `/reservations` route in `AppRoutes.jsx`.

