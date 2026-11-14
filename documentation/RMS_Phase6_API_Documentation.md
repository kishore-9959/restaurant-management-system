# Restaurant Management System (RMS)
## Phase 6 API Specification: Menu Service & Redis Catalog Caching

- **Microservice**: `menu-service`
- **Internal Port**: `8005`
- **Gateway Ingress**: `http://localhost:8000/api/v1/menu`
- **Database Engine**: Microsoft SQL Server (`RestaurantManagementDB`)
- **Database Access**: 100% Stored Procedures (`database/09_MenuStoredProcedures.sql`)
- **Caching**: Shared Redis (`backend/shared/config/redis.js`) on port 6379 with 15-minute TTL and automatic invalidation on mutations.
- **Authentication**: JWT Bearer Token (`Authorization: Bearer <token>`) & `X-Internal-Service-Key` (Public catalog endpoints are unauthenticated).

---

## 1. Category Management APIs

### 1.1 List Categories (Staff & Admin)
- **Method**: `GET`
- **Endpoint**: `/api/v1/menu/categories`
- **Query Parameters**:
  - `branchId` (optional int): Filters categories for a branch or global menu.
  - `includeInactive` (optional bool): When true, includes deactivated categories.
- **Authorized Roles**: All authenticated staff (`SUPER_ADMIN`, `RESTAURANT_MANAGER`, `WAITSTAFF`, `CASHIER_POS`, `KITCHEN_CHEF`).
- **Stored Procedure**: `dbo.usp_Category_ListByBranch`

### 1.2 Get Category by ID
- **Method**: `GET`
- **Endpoint**: `/api/v1/menu/categories/:categoryId`
- **Authorized Roles**: All authenticated staff.
- **Stored Procedure**: `dbo.usp_Category_GetById`

### 1.3 Create Category
- **Method**: `POST`
- **Endpoint**: `/api/v1/menu/categories`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Category_Create`
- **Cache Invalidation**: Automatically flushes Redis catalog cache for the branch.
- **Request Body**:
```json
{
  "branchId": 1,
  "parentCategoryId": null,
  "categoryName": "Wood-Fired Neapolitan Pizzas",
  "categorySlug": "wood-fired-pizzas",
  "description": "48-hour fermented sourdough crust baked at 450 degrees C",
  "displayOrder": 1,
  "imageUrl": "/images/categories/pizzas.jpg",
  "isActive": true
}
```

### 1.4 Update Category
- **Method**: `PUT`
- **Endpoint**: `/api/v1/menu/categories/:categoryId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Category_Update`
- **Cache Invalidation**: Automatically flushes Redis catalog cache.

### 1.5 Toggle Category Active Status
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/menu/categories/:categoryId/status`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Category_SetStatus`
- **Request Body**:
```json
{
  "isActive": false
}
```

### 1.6 Delete Category (Soft Delete)
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/menu/categories/:categoryId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_Category_Delete`
- **Integrity Rule**: Prevents deletion if active child categories or active menu items exist.

---

## 2. Menu Item Management APIs

### 2.1 List Menu Items (Paginated & Filtered)
- **Method**: `GET`
- **Endpoint**: `/api/v1/menu/items`
- **Query Parameters**:
  - `branchId` (required int)
  - `categoryId` (optional int)
  - `dietaryType` (optional string: `VEG`, `NON_VEG`, `VEGAN`, `EGG`, `HALAL`)
  - `isFeatured` (optional bool)
  - `isAvailable` (optional bool)
  - `search` (optional string: matches ItemName or ItemCode)
  - `page` (optional int, default 1)
  - `limit` (optional int, default 50)
- **Stored Procedure**: `dbo.usp_MenuItem_ListByBranch`

### 2.2 Get Menu Item by ID (Multi-Recordset)
- **Method**: `GET`
- **Endpoint**: `/api/v1/menu/items/:menuItemId`
- **Stored Procedure**: `dbo.usp_MenuItem_GetById`
- **Returns**: Menu item details, linked variants, linked addon groups with active addon items, and photo gallery.

### 2.3 Create Menu Item
- **Method**: `POST`
- **Endpoint**: `/api/v1/menu/items`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_MenuItem_Create`
- **Request Body**:
```json
{
  "branchId": 1,
  "categoryId": 2,
  "itemCode": "PIZ-001",
  "itemName": "Margherita Classica",
  "description": "San Marzano tomatoes, Fior di Latte mozzarella, fresh basil, and extra virgin olive oil",
  "basePrice": 490.00,
  "costPrice": 120.00,
  "taxPercentage": 5.00,
  "dietaryType": "VEG",
  "spicyLevel": 0,
  "preparationTimeMinutes": 15,
  "isAvailable": true,
  "isFeatured": true,
  "displayOrder": 1
}
```

### 2.4 Update Menu Item
- **Method**: `PUT`
- **Endpoint**: `/api/v1/menu/items/:menuItemId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_MenuItem_Update`

### 2.5 Menu Item Availability "86" Toggle (Out of Stock)
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/menu/items/:menuItemId/availability`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `KITCHEN_CHEF`, `CASHIER_POS`
- **Stored Procedure**: `dbo.usp_MenuItem_SetAvailability`
- **Cache Invalidation**: Automatically flushes Redis catalog cache so customer menus reflect out-of-stock instantly.
- **Request Body**:
```json
{
  "isAvailable": false
}
```

### 2.6 Single Item Pricing Update
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/menu/items/:menuItemId/pricing`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_MenuItem_UpdatePricing`
- **Request Body**:
```json
{
  "basePrice": 520.00,
  "costPrice": 130.00,
  "taxPercentage": 5.00
}
```

### 2.7 Bulk Pricing Update
- **Method**: `POST`
- **Endpoint**: `/api/v1/menu/items/pricing/bulk`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Request Body**:
```json
{
  "updates": [
    { "menuItemId": 1, "basePrice": 400.00, "costPrice": 115.00 },
    { "menuItemId": 2, "basePrice": 460.00, "costPrice": 135.00 }
  ]
}
```

### 2.8 Delete Menu Item (Soft Delete)
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/menu/items/:menuItemId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_MenuItem_Delete`

---

## 3. Menu Item Variants APIs

### 3.1 List Variants for Item
- **Method**: `GET`
- **Endpoint**: `/api/v1/menu/items/:menuItemId/variants`
- **Stored Procedure**: `dbo.usp_MenuItemVariant_ListByItem`

### 3.2 Create Variant
- **Method**: `POST`
- **Endpoint**: `/api/v1/menu/items/:menuItemId/variants`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_MenuItemVariant_Create`
- **Request Body**:
```json
{
  "variantName": "12-Inch Large",
  "sku": "PIZ-001-12",
  "priceAdjustment": 140.00,
  "isDefault": false,
  "isAvailable": true
}
```

### 3.3 Update Variant
- **Method**: `PUT`
- **Endpoint**: `/api/v1/menu/items/variants/:variantId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_MenuItemVariant_Update`

### 3.4 Toggle Variant Availability ("86")
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/menu/items/variants/:variantId/availability`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `KITCHEN_CHEF`, `CASHIER_POS`
- **Stored Procedure**: `dbo.usp_MenuItemVariant_SetAvailability`

### 3.5 Delete Variant (Soft Delete)
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/menu/items/variants/:variantId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_MenuItemVariant_Delete`

---

## 4. Menu Item Images APIs

### 4.1 List Images for Item
- **Method**: `GET`
- **Endpoint**: `/api/v1/menu/items/:menuItemId/images`
- **Stored Procedure**: `dbo.usp_MenuItemImage_ListByItem`

### 4.2 Add Image to Item
- **Method**: `POST`
- **Endpoint**: `/api/v1/menu/items/:menuItemId/images`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_MenuItemImage_Add`
- **Request Body**:
```json
{
  "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1/pizza-margherita.jpg",
  "isPrimary": true,
  "displayOrder": 1
}
```

### 4.3 Set Image as Primary
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/menu/items/images/:imageId/primary`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_MenuItemImage_SetPrimary`

### 4.4 Delete Image
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/menu/items/images/:imageId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_MenuItemImage_Delete`

---

## 5. Addon Groups & Addon Items APIs

### 5.1 List Addon Groups
- **Method**: `GET`
- **Endpoint**: `/api/v1/menu/addons/groups`
- **Query Parameters**: `branchId` (optional int)
- **Stored Procedure**: `dbo.usp_AddonGroup_ListByBranch`

### 5.2 Get Addon Group by ID
- **Method**: `GET`
- **Endpoint**: `/api/v1/menu/addons/groups/:addonGroupId`
- **Stored Procedure**: `dbo.usp_AddonGroup_GetById`

### 5.3 Create Addon Group
- **Method**: `POST`
- **Endpoint**: `/api/v1/menu/addons/groups`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_AddonGroup_Create`
- **Request Body**:
```json
{
  "branchId": 1,
  "groupName": "Extra Gourmet Cheeses",
  "minSelections": 0,
  "maxSelections": 3,
  "isActive": true
}
```

### 5.4 Update Addon Group
- **Method**: `PUT`
- **Endpoint**: `/api/v1/menu/addons/groups/:addonGroupId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_AddonGroup_Update`

### 5.5 Link Addon Group to Menu Item
- **Method**: `POST`
- **Endpoint**: `/api/v1/menu/items/:menuItemId/addons/:addonGroupId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_AddonGroup_LinkToMenuItem`
- **Request Body**:
```json
{
  "displayOrder": 1
}
```

### 5.6 Unlink Addon Group from Menu Item
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/menu/items/:menuItemId/addons/:addonGroupId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_AddonGroup_UnlinkFromMenuItem`

### 5.7 Create Addon Item in Group
- **Method**: `POST`
- **Endpoint**: `/api/v1/menu/addons/groups/:addonGroupId/items`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_AddonItem_Create`
- **Request Body**:
```json
{
  "itemName": "Extra Buffalo Mozzarella",
  "price": 80.00,
  "isAvailable": true
}
```

### 5.8 Update Addon Item
- **Method**: `PUT`
- **Endpoint**: `/api/v1/menu/addons/items/:addonItemId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_AddonItem_Update`

### 5.9 Toggle Addon Item Availability ("86")
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/menu/addons/items/:addonItemId/availability`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `KITCHEN_CHEF`, `CASHIER_POS`
- **Stored Procedure**: `dbo.usp_AddonItem_SetAvailability`

### 5.10 Delete Addon Item (Soft Delete)
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/menu/addons/items/:addonItemId`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Stored Procedure**: `dbo.usp_AddonItem_Delete`

---

## 6. Public Customer Catalog & Redis Caching APIs

### 6.1 Public Branch Menu Catalog
- **Method**: `GET`
- **Endpoint**: `/api/v1/menu/public/catalog/:branchId`
- **Authentication**: None (Whitelisted public endpoint).
- **Caching**:
  - Redis Key: `menu:catalog:branch:{branchId}:all`
  - TTL: 900 seconds (15 minutes).
  - Response Header: `X-Cache-Status: HIT` or `X-Cache-Status: MISS`.
  - Body Metadata: `_cache: "HIT" | "MISS"`.
- **Query Parameters**:
  - `categoryId` (optional int): Filters catalog by specific category.
- **Stored Procedure (on cache miss)**: `dbo.usp_Menu_GetCatalogByBranch`

### 6.2 Public Active Categories
- **Method**: `GET`
- **Endpoint**: `/api/v1/menu/public/categories/:branchId?`
- **Authentication**: None.
- **Stored Procedure**: `dbo.usp_Category_ListByBranch`

### 6.3 Public Item Details
- **Method**: `GET`
- **Endpoint**: `/api/v1/menu/public/items/:menuItemId`
- **Authentication**: None.
- **Stored Procedure**: `dbo.usp_MenuItem_GetById`
- **Behavior**: Returns item details only if `IsAvailable = 1`. If out of stock, returns `404 ITEM_NOT_AVAILABLE`.

### 6.4 Administrative Purge of Menu Catalog Cache
- **Method**: `POST`
- **Endpoint**: `/api/v1/menu/admin/cache/purge`
- **Authorized Roles**: `SUPER_ADMIN`, `RESTAURANT_MANAGER`
- **Request Body**:
```json
{
  "branchId": 1
}
```

