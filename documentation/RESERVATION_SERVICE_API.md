# RESERVATION SERVICE REST API SPECIFICATION
## Comprehensive Endpoint Documentation

**Service Name:** Reservation Service (`rms-reservation-service`)  
**Base Port:** `8011`  
**Gateway Ingress Prefix:** `/api/v1/reservations`  
**Authentication:** JWT Bearer Token (Authorization: `Bearer <token>`) & `X-Internal-Service-Key`  

---

## 1. Authentication & Role-Based Access Control (RBAC)

| Route Path | Method | Access Level | Allowed Roles |
|---|:---:|---|---|
| `/public/branches/:branchId/availability` | `GET` | Public | Unauthenticated / Anyone |
| `/public/branches/:branchId/slots` | `GET` | Public | Unauthenticated / Anyone |
| `/public/book` | `POST` | Public | Unauthenticated / Anyone |
| `/public/lookup` | `GET` | Public | Unauthenticated / Anyone |
| `/public/:id/cancel` | `POST` | Public | Unauthenticated (Phone/Email verified) |
| `/my-bookings` | `GET` | Customer | `CUSTOMER`, `RESTAURANT_MANAGER`, `SUPER_ADMIN` |
| `/my-bookings` | `POST` | Customer | `CUSTOMER`, `RESTAURANT_MANAGER`, `SUPER_ADMIN` |
| `/my-bookings/:id/cancel` | `PATCH` | Customer | `CUSTOMER`, `RESTAURANT_MANAGER`, `SUPER_ADMIN` |
| `/` | `GET` | Staff | `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `WAITSTAFF`, `HOSTESS` |
| `/summary` | `GET` | Staff | `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `WAITSTAFF`, `HOSTESS` |
| `/timeline` | `GET` | Staff | `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `WAITSTAFF`, `HOSTESS` |
| `/:id` | `GET` | Staff | `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `WAITSTAFF`, `HOSTESS` |
| `/` | `POST` | Staff | `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `WAITSTAFF`, `HOSTESS` |
| `/:id` | `PUT` | Staff | `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `HOSTESS` |
| `/:id/status` | `PATCH` | Staff | `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `WAITSTAFF`, `HOSTESS` |
| `/:id/assign-table` | `PATCH` | Staff | `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `HOSTESS` |
| `/:id/release-table` | `PATCH` | Staff | `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `HOSTESS` |
| `/walk-in` | `POST` | Staff | `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `WAITSTAFF`, `HOSTESS` |
| `/:id/history` | `GET` | Staff | `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `HOSTESS` |
| `/sweep-no-shows` | `POST` | Admin | `SUPER_ADMIN`, `RESTAURANT_MANAGER` |

---

## 2. Public Guest Endpoints

### 2.1 Get Dynamic Time Slots
```http
GET /api/v1/reservations/public/branches/:branchId/slots?reservationDate=YYYY-MM-DD&partySize=2&interval=30
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "SlotTime": "12:00:00",
      "SlotEndTime": "13:30:00",
      "AvailableTableCount": 4,
      "IsAvailable": true
    },
    {
      "SlotTime": "12:30:00",
      "SlotEndTime": "14:00:00",
      "AvailableTableCount": 2,
      "IsAvailable": true
    }
  ]
}
```

### 2.2 Check Table Availability
```http
GET /api/v1/reservations/public/branches/:branchId/availability?reservationDate=YYYY-MM-DD&startTime=19:00:00&partySize=4
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "TableId": 2,
      "TableNumber": "T-02",
      "SeatingCapacity": 4,
      "CurrentStatus": "AVAILABLE",
      "SectionName": "Main Dining",
      "FloorLevel": 1
    }
  ]
}
```

### 2.3 Book a Reservation
```http
POST /api/v1/reservations/public/book
Content-Type: application/json
```
**Request Body:**
```json
{
  "branchId": 1,
  "guestName": "Ananya Sharma",
  "guestPhone": "+919876543210",
  "guestEmail": "ananya@example.com",
  "partySize": 4,
  "reservationDate": "2026-11-25",
  "startTime": "19:30:00",
  "specialRequests": "Anniversary celebration; window table preferred"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "Reservation booked successfully.",
  "data": {
    "ReservationId": 15,
    "BranchId": 1,
    "GuestName": "Ananya Sharma",
    "PartySize": 4,
    "ReservationDate": "2026-11-25",
    "StartTime": "19:30:00",
    "EndTime": "21:00:00",
    "Status": "CONFIRMED"
  }
}
```

### 2.4 Lookup Booking
```http
GET /api/v1/reservations/public/lookup?reservationId=15&guestPhone=%2B919876543210
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "ReservationId": 15,
    "GuestName": "Ananya Sharma",
    "GuestPhone": "+919876543210",
    "PartySize": 4,
    "ReservationDate": "2026-11-25",
    "StartTime": "19:30:00",
    "Status": "CONFIRMED"
  }
}
```

### 2.5 Cancel Booking (Self-Service)
```http
POST /api/v1/reservations/public/15/cancel
Content-Type: application/json
```
**Request Body:**
```json
{
  "cancellationReason": "Guest schedule conflict",
  "guestPhone": "+919876543210"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Reservation cancelled successfully.",
  "data": {
    "ReservationId": 15,
    "Status": "CANCELLED"
  }
}
```

---

## 3. Staff & Floor Management Endpoints

### 3.1 List Reservations
```http
GET /api/v1/reservations?branchId=1&reservationDate=2026-11-25&status=CONFIRMED&page=1&limit=20
Authorization: Bearer <staff_token>
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### 3.2 Assign Physical Table
```http
PATCH /api/v1/reservations/15/assign-table
Authorization: Bearer <staff_token>
Content-Type: application/json
```
**Request Body:**
```json
{
  "tableId": 2
}
```
**Response (200 OK):** Returns updated reservation with `TableId: 2`.

### 3.3 Transition Status
```http
PATCH /api/v1/reservations/15/status
Authorization: Bearer <staff_token>
Content-Type: application/json
```
**Request Body:**
```json
{
  "status": "SEATED",
  "notes": "Guest arrived on time"
}
```
**Response (200 OK):** Table status synchronized to `OCCUPIED` in Restaurant Service.

### 3.4 Create Walk-In Seating
```http
POST /api/v1/reservations/walk-in
Authorization: Bearer <staff_token>
Content-Type: application/json
```
**Request Body:**
```json
{
  "branchId": 1,
  "tableId": 4,
  "guestName": "Vikram Walk-In",
  "guestPhone": "+919811122233",
  "partySize": 2
}
```
**Response (201 Created):** Creates reservation with `Status: SEATED` and marks Table 4 `OCCUPIED`.

### 3.5 Dashboard Summary KPIs
```http
GET /api/v1/reservations/summary?branchId=1&date=2026-11-25
Authorization: Bearer <staff_token>
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "BranchId": 1,
    "TargetDate": "2026-11-25",
    "TotalBookings": 28,
    "ConfirmedCount": 16,
    "SeatedCount": 6,
    "CompletedCount": 4,
    "CancelledCount": 1,
    "NoShowCount": 1,
    "TotalExpectedCovers": 84,
    "TotalSeatedCovers": 18,
    "TotalCompletedCovers": 12
  }
}
```

