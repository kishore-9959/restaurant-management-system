# Restaurant Management System (RMS)
## Phase 8 API Specification: Inventory Management & Recipe BOM Microservice

- **Microservice**: `inventory-service` (Internal Port: `8009`, Gateway Route: `/api/v1/inventory`)
- **Gateway Ingress**: `http://localhost:8000`
- **Database Engine**: Microsoft SQL Server (`RestaurantManagementDB` on port `1435`)
- **Database Access**: 100% Stored Procedures (`12_InventoryStoredProcedures.sql` - SPs 107–131) – Zero Sequelize ORM
- **Cache Engine**: Shared Redis (`localhost:6379`)
- **Security & Authorization**: JWT Bearer (`Authorization: Bearer <token>`), Inter-Service Key (`X-Internal-Service-Key`), Role-Based Access Control (RBAC)

---

## 1. Dual Health Probes

### 1.1 Liveness Probe
- **Method**: `GET`
- **Endpoints**: `/health/live`, `/api/v1/inventory/health/live`
- **Auth**: None (Public)
- **Response `200 OK`**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Inventory Service process is alive",
  "data": {
    "status": "UP",
    "service": "rms-inventory-service",
    "port": 8009,
    "uptimeSeconds": 124,
    "memoryUsage": { "rssMB": 42.15, "heapUsedMB": 22.4 },
    "timestamp": "2026-11-15T16:04:43.937Z"
  }
}
```

### 1.2 Readiness Probe
- **Method**: `GET`
- **Endpoints**: `/health/ready`, `/api/v1/inventory/health/ready`, `/health`
- **Auth**: None (Public)
- **Response `200 OK`**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Inventory Service is ready to accept traffic",
  "data": {
    "status": "UP",
    "service": "rms-inventory-service",
    "port": 8009,
    "uptimeSeconds": 124,
    "timestamp": "2026-11-15T16:04:43.963Z",
    "dependencies": {
      "database": { "healthy": true, "message": "SQL Server connection verified." },
      "redis": { "healthy": true, "message": "Redis connection verified." }
    }
  }
}
```

---

## 2. Supplier Management APIs

### 2.1 Create Supplier
- **Method**: `POST`
- **Endpoint**: `/api/v1/inventory/suppliers`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Supplier_Create`
- **Request Body**:
```json
{
  "supplierCode": "SUP-001",
  "supplierName": "Fresh Farms Dairy Ltd",
  "contactPerson": "Ramesh Patel",
  "email": "ramesh@freshfarms.in",
  "phone": "9876543210",
  "address": "Plot 45, APMC Market Yard, Bengaluru",
  "gstin": "29AAAAA0000A1Z5",
  "paymentTerms": "Net 30"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Supplier created successfully.",
  "data": {
    "SupplierId": 1,
    "SupplierCode": "SUP-001",
    "SupplierName": "Fresh Farms Dairy Ltd",
    "ContactPerson": "Ramesh Patel",
    "Phone": "9876543210",
    "Email": "ramesh@freshfarms.in",
    "Address": "Plot 45, APMC Market Yard, Bengaluru",
    "GSTIN": "29AAAAA0000A1Z5",
    "PaymentTerms": "Net 30",
    "IsActive": true
  }
}
```

### 2.2 Get Supplier by ID
- **Method**: `GET`
- **Endpoint**: `/api/v1/inventory/suppliers/:id`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `KITCHEN_CHEF`
- **Stored Procedure**: `dbo.usp_Supplier_GetById`

### 2.3 List Suppliers
- **Method**: `GET`
- **Endpoint**: `/api/v1/inventory/suppliers?branchId=1&search=Farms&page=1&limit=20`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `KITCHEN_CHEF`
- **Stored Procedure**: `dbo.usp_Supplier_List`

### 2.4 Update Supplier
- **Method**: `PUT`
- **Endpoint**: `/api/v1/inventory/suppliers/:id`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Supplier_Update`

### 2.5 Soft Delete Supplier
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/inventory/suppliers/:id`
- **Auth**: `SUPER_ADMIN`
- **Stored Procedure**: `dbo.usp_Supplier_Delete`

---

## 3. Ingredient Management APIs

### 3.1 Create Ingredient
- **Method**: `POST`
- **Endpoint**: `/api/v1/inventory/ingredients`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Inventory_Ingredient_Create`
- **Request Body**:
```json
{
  "branchId": 1,
  "ingredientCode": "ING-BUT-01",
  "ingredientName": "Amul Butter Salted",
  "category": "DAIRY",
  "unitOfMeasure": "KG",
  "initialStock": 50.00,
  "minimumStockLevel": 10.00,
  "reorderLevel": 15.00,
  "costPerUnit": 520.00,
  "primarySupplierId": 1
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Ingredient created successfully.",
  "data": {
    "IngredientId": 1,
    "BranchId": 1,
    "IngredientCode": "ING-BUT-01",
    "IngredientName": "Amul Butter Salted",
    "Category": "DAIRY",
    "UnitOfMeasure": "KG",
    "CurrentStock": 50.00,
    "MinimumStockLevel": 10.00,
    "ReorderLevel": 15.00,
    "CostPerUnit": 520.00,
    "PrimarySupplierId": 1,
    "IsActive": true
  }
}
```

### 3.2 Get Ingredient by ID
- **Method**: `GET`
- **Endpoint**: `/api/v1/inventory/ingredients/:id`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `KITCHEN_CHEF`, `WAITSTAFF`
- **Stored Procedure**: `dbo.usp_Inventory_Ingredient_GetById`

### 3.3 List Ingredients
- **Method**: `GET`
- **Endpoint**: `/api/v1/inventory/ingredients?branchId=1&category=DAIRY&lowStockOnly=false&page=1&limit=20`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `KITCHEN_CHEF`, `WAITSTAFF`
- **Stored Procedure**: `dbo.usp_Inventory_Ingredient_List`

### 3.4 Update Ingredient
- **Method**: `PUT`
- **Endpoint**: `/api/v1/inventory/ingredients/:id`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Inventory_Ingredient_Update`

### 3.5 Toggle Active Status
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/inventory/ingredients/:id/status`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Inventory_Ingredient_SetStatus`
- **Request Body**: `{ "isActive": false }`

### 3.6 Soft Delete Ingredient
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/inventory/ingredients/:id`
- **Auth**: `SUPER_ADMIN`
- **Stored Procedure**: `dbo.usp_Inventory_Ingredient_Delete`

---

## 4. Stock Movement Operations

### 4.1 Stock In (Purchase Receipt / Restock)
- **Method**: `POST`
- **Endpoint**: `/api/v1/inventory/stock/in`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Inventory_StockIn`
- **Request Body**:
```json
{
  "branchId": 1,
  "ingredientId": 1,
  "quantity": 20.0,
  "unitCost": 520.00,
  "referencePOId": 101,
  "notes": "PO #101 received batch 582"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Stock-in recorded successfully.",
  "data": {
    "TransactionId": "51",
    "IngredientId": "1",
    "PreviousStock": 50.00,
    "QuantityAdded": 20.00,
    "NewBalance": 70.00,
    "UnitCost": 520.00,
    "TransactionType": "PURCHASE"
  }
}
```

### 4.2 Stock Out (Wastage / Spoilage / Damage / Expiry)
- **Method**: `POST`
- **Endpoint**: `/api/v1/inventory/stock/out`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Inventory_StockOut`
- **Request Body**:
```json
{
  "branchId": 1,
  "ingredientId": 1,
  "quantity": 5.0,
  "reason": "WASTAGE",
  "notes": "Quality check failed batch 582"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Stock-out recorded successfully.",
  "data": {
    "TransactionId": "52",
    "IngredientId": "1",
    "PreviousStock": 70.00,
    "QuantityDeducted": 5.00,
    "NewBalance": 65.00,
    "Reason": "WASTAGE",
    "TransactionType": "WASTAGE"
  }
}
```

### 4.3 Stock Adjustment (Physical Audit Reconciliation)
- **Method**: `POST`
- **Endpoint**: `/api/v1/inventory/stock/adjust`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Inventory_StockAdjust`
- **Request Body**:
```json
{
  "branchId": 1,
  "ingredientId": 1,
  "actualCount": 60.0,
  "reason": "Physical Audit Reconciliation",
  "notes": "Monthly physical audit variance reconciled"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Stock adjustment recorded successfully.",
  "data": {
    "TransactionId": "53",
    "IngredientId": "1",
    "PreviousBalance": 65.00,
    "ActualCount": 60.00,
    "Variance": -5.00,
    "NewBalance": 60.00,
    "TransactionType": "ADJUSTMENT"
  }
}
```

### 4.4 Inter-Branch Stock Transfer
- **Method**: `POST`
- **Endpoint**: `/api/v1/inventory/stock/transfer`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Inventory_StockTransfer`
- **Request Body**:
```json
{
  "fromBranchId": 1,
  "toBranchId": 2,
  "ingredientCode": "ING-BUT-01",
  "quantity": 10.0,
  "notes": "Emergency transfer to Indiranagar branch"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Stock transfer recorded successfully.",
  "data": {
    "SourceTransactionId": "54",
    "DestTransactionId": "55",
    "IngredientCode": "ING-BUT-01",
    "QuantityTransferred": 10.00,
    "SourceBranchId": 1,
    "SourceNewBalance": 50.00,
    "DestinationBranchId": 2,
    "DestNewBalance": 10.00,
    "Message": "Inter-branch stock transfer completed successfully"
  }
}
```

---

## 5. Recipe Bill of Materials (BOM) APIs

### 5.1 Create or Update Recipe BOM
- **Method**: `POST`
- **Endpoint**: `/api/v1/inventory/recipes`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `KITCHEN_CHEF`
- **Stored Procedure**: `dbo.usp_Recipe_CreateOrUpdate`
- **Request Body**:
```json
{
  "menuItemId": 1,
  "yieldPortions": 1,
  "preparationNotes": "Melt butter on medium flame, incorporate flour paste",
  "ingredients": [
    { "ingredientId": 1, "requiredQuantity": 0.25, "unitOfMeasure": "KG" },
    { "ingredientId": 2, "requiredQuantity": 0.50, "unitOfMeasure": "KG" }
  ]
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Recipe created/updated successfully.",
  "data": {
    "recipeId": 4,
    "menuItemId": 1,
    "menuItemName": "Truffle & Parmesan Arancini",
    "yieldPortions": 1,
    "preparationNotes": "Melt butter on medium flame, incorporate flour paste",
    "isActive": true,
    "ingredients": [
      {
        "recipeIngredientId": 7,
        "ingredientId": 1,
        "ingredientCode": "ING-BUT-01",
        "ingredientName": "Amul Butter Salted",
        "requiredQuantity": 0.25,
        "unitOfMeasure": "KG",
        "currentStock": 50.00
      },
      {
        "recipeIngredientId": 8,
        "ingredientId": 2,
        "ingredientCode": "ING-BOM-01",
        "ingredientName": "Organic Flour",
        "requiredQuantity": 0.50,
        "unitOfMeasure": "KG",
        "currentStock": 100.00
      }
    ]
  }
}
```

### 5.2 Get Recipe BOM by MenuItemId
- **Method**: `GET`
- **Endpoints**: `/api/v1/inventory/recipes/:menuItemId`, `/api/v1/inventory/recipes/menu-item/:menuItemId`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `KITCHEN_CHEF`, `WAITSTAFF`
- **Stored Procedure**: `dbo.usp_Recipe_GetByMenuItem`

### 5.3 Delete Recipe BOM
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/inventory/recipes/:recipeId`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Recipe_Delete`

---

## 6. Order Saga BOM Integration APIs

### 6.1 Pre-Order Stock Availability Check
- **Method**: `POST`
- **Endpoint**: `/api/v1/inventory/bom/check`
- **Auth**: Authenticated token or Internal Service Key
- **Stored Procedure**: `dbo.usp_Inventory_BOM_CheckStock`
- **Request Body**:
```json
{
  "branchId": 1,
  "items": [
    { "menuItemId": 1, "quantity": 2 }
  ]
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "BOM ingredient availability check completed.",
  "data": {
    "hasSufficientStock": true,
    "totalChecked": 2,
    "deficitCount": 0,
    "ingredients": [
      {
        "ingredientId": 1,
        "ingredientCode": "ING-BUT-01",
        "requiredQuantity": 0.50,
        "availableStock": 50.00,
        "deficitQuantity": 0.00,
        "isSufficient": true
      }
    ]
  }
}
```

### 6.2 Atomic BOM Depletion (Idempotent)
- **Method**: `POST`
- **Endpoint**: `/api/v1/inventory/bom/deplete`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `SYSTEM` (via `X-Internal-Service-Key`)
- **Stored Procedure**: `dbo.usp_Inventory_BOM_Deplete`
- **Request Body**:
```json
{
  "branchId": 1,
  "orderId": 1001,
  "orderNumber": "ORD-20261115-0001",
  "items": [
    { "menuItemId": 1, "quantity": 4 }
  ]
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "BOM ingredients depleted successfully.",
  "data": {
    "orderId": 1001,
    "orderNumber": "ORD-20261115-0001",
    "depletedCount": 2,
    "lowStockTriggered": false,
    "isIdempotentDuplicate": false,
    "lowStockAlerts": []
  }
}
```

### 6.3 Compensating Restitution (Order Cancellation)
- **Method**: `POST`
- **Endpoint**: `/api/v1/inventory/bom/restitute`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `SYSTEM` (via `X-Internal-Service-Key`)
- **Stored Procedure**: `dbo.usp_Inventory_BOM_Restitute`
- **Request Body**:
```json
{
  "branchId": 1,
  "orderId": 1001,
  "orderNumber": "ORD-20261115-0001"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "BOM ingredients restituted successfully.",
  "data": {
    "RestoredCount": 2,
    "OrderId": 1001,
    "OrderNumber": "ORD-20261115-0001",
    "Message": "Stock restituted successfully"
  }
}
```

---

## 7. Alerts & Audit Reports

### 7.1 Low Stock Alerts
- **Method**: `GET`
- **Endpoint**: `/api/v1/inventory/alerts/low-stock?branchId=1&criticalOnly=false`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `KITCHEN_CHEF`
- **Stored Procedure**: `dbo.usp_Inventory_GetLowStockAlerts`

### 7.2 Transaction Audit Ledger
- **Method**: `GET`
- **Endpoint**: `/api/v1/inventory/transactions?branchId=1&ingredientId=1&page=1&limit=20`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `KITCHEN_CHEF`
- **Stored Procedure**: `dbo.usp_Inventory_GetTransactions`

### 7.3 Asset Valuation Report
- **Method**: `GET`
- **Endpoint**: `/api/v1/inventory/reports/valuation?branchId=1`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Inventory_GetValuationReport`

### 7.4 Consumption & Wastage Report
- **Method**: `GET`
- **Endpoints**: `/api/v1/inventory/reports/consumption?branchId=1&startDate=2026-01-01&endDate=2026-12-31`, `/api/v1/inventory/reports/consumption-summary`
- **Auth**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Inventory_GetConsumptionReport`

