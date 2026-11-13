# Restaurant Management System (RMS)
## Phase 5 API Specification: Restaurant Service & Floor Management

- **Microservice**: `restaurant-service`
- **Internal Port**: `8003`
- **Gateway Ingress**: `http://localhost:8000/api/v1`
- **Database Engine**: Microsoft SQL Server (`RestaurantManagementDB`)
- **Database Access**: 100% Stored Procedures (`database/08_RestaurantFloorStoredProcedures.sql`)
- **Authentication**: JWT Bearer Token (`Authorization: Bearer <token>`) & `X-Internal-Service-Key`

---

## 1. Restaurant Management APIs

### 1.1 Create Restaurant
- **Method**: `POST`
- **Endpoint**: `/api/v1/restaurants`
- **Authorized Roles**: `SUPER_ADMIN`
- **Stored Procedure**: `dbo.usp_Restaurant_Create`
- **Request Body**:
```json
{
  "restaurantName": "Antigravity Gourmet Bistro",
  "legalEntityName": "Antigravity Hospitality Private Limited",
  "taxIdentificationNumber": "29AABCU9603R1ZM",
  "primaryContactEmail": "contact@antigravitybistro.com",
  "primaryContactPhone": "+91 98765 43210",
  "websiteUrl": "https://antigravitybistro.com",
  "logoUrl": "https://res.cloudinary.com/rms/image/upload/v1/logo.png",
  "defaultCurrency": "INR",
  "defaultTimezone": "India Standard Time"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "RestaurantId": 1,
    "RestaurantName": "Antigravity Gourmet Bistro",
    "LegalEntityName": "Antigravity Hospitality Private Limited",
    "TaxIdentificationNumber": "29AABCU9603R1ZM",
    "PrimaryContactEmail": "contact@antigravitybistro.com",
    "PrimaryContactPhone": "+91 98765 43210",
    "WebsiteUrl": "https://antigravitybistro.com",
    "LogoUrl": "https://res.cloudinary.com/rms/image/upload/v1/logo.png",
    "DefaultCurrency": "INR",
    "DefaultTimezone": "India Standard Time",
    "IsActive": true,
    "CreatedAt": "2026-11-12T13:16:27.128Z",
    "UpdatedAt": "2026-11-12T13:16:27.128Z"
  },
  "message": "Restaurant created successfully.",
  "correlationId": "8a011a0b-1175-4d22-b5e1-0a6230467c6e",
  "timestamp": "2026-11-12T13:16:27.130Z"
}
```

### 1.2 Get Restaurant by ID
- **Method**: `GET`
- **Endpoint**: `/api/v1/restaurants/:restaurantId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Restaurant_GetById`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "RestaurantId": 1,
    "RestaurantName": "Antigravity Gourmet Bistro",
    "DefaultCurrency": "INR",
    "branches": [
      {
        "BranchId": 1,
        "BranchCode": "BR-BLR-01",
        "BranchName": "Indiranagar Flagship",
        "IsMainBranch": true,
        "IsActive": true
      }
    ]
  }
}
```

### 1.3 Update Restaurant
- **Method**: `PUT`
- **Endpoint**: `/api/v1/restaurants/:restaurantId`
- **Authorized Roles**: `SUPER_ADMIN`
- **Stored Procedure**: `dbo.usp_Restaurant_Update`

### 1.4 List Restaurants
- **Method**: `GET`
- **Endpoint**: `/api/v1/restaurants?page=1&pageSize=20&search=bistro&isActive=true`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Restaurant_List`

### 1.5 Activate / Deactivate Restaurant
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/restaurants/:restaurantId/status`
- **Authorized Roles**: `SUPER_ADMIN`
- **Stored Procedure**: `dbo.usp_Restaurant_SetStatus`
- **Request Body**: `{ "isActive": false }`

---

## 2. Branch Management APIs

### 2.1 Create Branch
- **Method**: `POST`
- **Endpoint**: `/api/v1/branches` or `/api/v1/restaurants/:restaurantId/branches`
- **Authorized Roles**: `SUPER_ADMIN`
- **Stored Procedure**: `dbo.usp_Branch_Create`
- **Request Body**:
```json
{
  "restaurantId": 1,
  "branchCode": "BR-BLR-03",
  "branchName": "Whitefield ITPL Hub",
  "addressLine1": "ITPB Main Road, Whitefield",
  "city": "Bengaluru",
  "stateProvince": "Karnataka",
  "postalCode": "560066",
  "country": "India",
  "phone": "+91 80 4321 0000",
  "email": "whitefield@antigravitybistro.com",
  "openingTime": "09:00:00",
  "closingTime": "23:00:00",
  "isMainBranch": false
}
```

### 2.2 Get Branch Details
- **Method**: `GET`
- **Endpoint**: `/api/v1/branches/:branchId`
- **Authorized Roles**: Staff or above (`SUPER_ADMIN`, `RESTAURANT_MANAGER`, `CASHIER_POS`, `WAITSTAFF`, `KITCHEN_CHEF`)
- **Stored Procedure**: `dbo.usp_Branch_GetById`

### 2.3 Update Branch
- **Method**: `PUT`
- **Endpoint**: `/api/v1/branches/:branchId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Branch_Update`

### 2.4 List Branches
- **Method**: `GET`
- **Endpoint**: `/api/v1/branches?restaurantId=1&isActive=true`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Branch_List`

### 2.5 Activate / Deactivate Branch
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/branches/:branchId/status`
- **Authorized Roles**: `SUPER_ADMIN`
- **Stored Procedure**: `dbo.usp_Branch_SetStatus`

---

## 3. Dining Section Management APIs

### 3.1 Create Dining Section
- **Method**: `POST`
- **Endpoint**: `/api/v1/branches/:branchId/sections` or `/api/v1/sections`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_DiningSection_Create`
- **Request Body**:
```json
{
  "sectionName": "Rooftop Skylounge",
  "floorLevel": 3,
  "displayOrder": 1
}
```

### 3.2 List Sections by Branch
- **Method**: `GET`
- **Endpoint**: `/api/v1/branches/:branchId/sections`
- **Authorized Roles**: Staff or above
- **Stored Procedure**: `dbo.usp_DiningSection_ListByBranch`

### 3.3 Get Dining Section by ID
- **Method**: `GET`
- **Endpoint**: `/api/v1/sections/:sectionId`
- **Authorized Roles**: Staff or above
- **Stored Procedure**: `dbo.usp_DiningSection_GetById`

### 3.4 Update Dining Section
- **Method**: `PUT`
- **Endpoint**: `/api/v1/sections/:sectionId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_DiningSection_Update`

### 3.5 Set Section Status
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/sections/:sectionId/status`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_DiningSection_SetStatus`

---

## 4. Dining Table & Floor Management APIs

### 4.1 Create Table
- **Method**: `POST`
- **Endpoint**: `/api/v1/branches/:branchId/tables` or `/api/v1/tables`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_DiningTable_Create`
- **Features**: Generates a cryptographic QR Code token (`QrCodeHash`) and returns a base64 PNG data URL (`qrCodeDataUrl`) for sticker printing.
- **Request Body**:
```json
{
  "sectionId": 1,
  "tableNumber": "T-10",
  "seatingCapacity": 4,
  "posX": 100,
  "posY": 200
}
```

### 4.2 Get Table by ID
- **Method**: `GET`
- **Endpoint**: `/api/v1/tables/:tableId`
- **Authorized Roles**: Staff or above
- **Stored Procedure**: `dbo.usp_DiningTable_GetById`

### 4.3 Update Table Details
- **Method**: `PUT`
- **Endpoint**: `/api/v1/tables/:tableId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_DiningTable_Update`

### 4.4 Update Table Seating Capacity
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/tables/:tableId/capacity`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_DiningTable_UpdateCapacity`
- **Request Body**: `{ "seatingCapacity": 6 }`

### 4.5 Update Table Status (Real-time Broadcast)
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/tables/:tableId/status`
- **Authorized Roles**: Staff or above (`WAITSTAFF`, `CASHIER_POS`, `RESTAURANT_MANAGER`, `SUPER_ADMIN`)
- **Stored Procedure**: `dbo.usp_DiningTable_UpdateStatus`
- **Valid Status Values**: `'AVAILABLE'`, `'OCCUPIED'`, `'RESERVED'`, `'BILLED'`, `'CLEANING'`
- **Real-time Event**: Dispatches internal broadcast `POST /api/v1/notifications/internal/broadcast` with event `table:status-changed` to room `branch:{id}`.
- **Request Body**:
```json
{
  "currentStatus": "OCCUPIED",
  "activeOrderId": 1042
}
```

### 4.6 Get Available Tables
- **Method**: `GET`
- **Endpoint**: `/api/v1/branches/:branchId/tables/available?minCapacity=4`
- **Authorized Roles**: Staff or above
- **Stored Procedure**: `dbo.usp_DiningTable_GetAvailable`

### 4.7 Get Occupied Tables
- **Method**: `GET`
- **Endpoint**: `/api/v1/branches/:branchId/tables/occupied`
- **Authorized Roles**: Staff or above
- **Stored Procedure**: `dbo.usp_DiningTable_GetOccupied`

### 4.8 Customer Public QR Table Scan
- **Method**: `GET`
- **Endpoint**: `/api/v1/tables/qr/:qrCodeHash`
- **Authentication**: **PUBLIC** (No token required for guests scanning table sticker)
- **Stored Procedure**: `dbo.usp_DiningTable_GetByQrHash`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "TableId": 1,
    "BranchId": 1,
    "BranchName": "Indiranagar Flagship",
    "RestaurantName": "Antigravity Gourmet Bistro",
    "DefaultCurrency": "INR",
    "SectionName": "Main Dining Room",
    "FloorLevel": 1,
    "TableNumber": "T-01",
    "SeatingCapacity": 2,
    "CurrentStatus": "AVAILABLE",
    "QrCodeHash": "QR_BLR1_T01_HASH901A"
  }
}
```

### 4.9 2D Visual Floor Plan Layout & Overview
- **Method**: `GET`
- **Endpoint**: `/api/v1/branches/:branchId/floor-plan?floorLevel=1`
- **Authorized Roles**: Staff or above
- **Stored Procedure**: `dbo.usp_Floor_GetLayout`
- **Response Structure**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "BranchId": 1,
      "BranchName": "Indiranagar Flagship",
      "TotalTables": 8,
      "TotalSeatingCapacity": 30,
      "AvailableTables": 7,
      "OccupiedTables": 1,
      "ReservedTables": 0,
      "BilledTables": 0,
      "CleaningTables": 0,
      "utilizationRate": 13
    },
    "sections": [
      {
        "SectionId": 1,
        "SectionName": "Main Dining Room",
        "FloorLevel": 1,
        "tables": [
          {
            "TableId": 1,
            "TableNumber": "T-01",
            "SeatingCapacity": 2,
            "CurrentStatus": "AVAILABLE",
            "PosX": 50,
            "PosY": 100
          }
        ]
      }
    ],
    "allTables": [ ... ]
  }
}
```

### 4.10 Soft Delete Dining Table
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/tables/:tableId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_DiningTable_Delete`
- **Guard**: Rejects deletion with HTTP 400 if the table is currently `OCCUPIED` or `BILLED`.

