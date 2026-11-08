# Restaurant Management System (RMS)
## Microservices Shared Database Table Ownership Mapping

---

### 1. Database Architecture & Ownership Governance

In accordance with the project architectural decisions:
- **One Shared Database**: All 14 microservices connect to the single Microsoft SQL Server database: `RestaurantManagementDB`.
- **Strict Table Ownership Principle**: Each of the 55 tables is assigned to **exactly one owning microservice**.
- **No Direct Cross-Table Queries**: A microservice may only execute SQL queries (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) against the tables it explicitly owns.
- **REST-Mediated Data Access**: If Service A requires data from a table owned by Service B, Service A **must** make an HTTP REST call to Service B. Direct SQL joins or queries across unowned tables are strictly prohibited at the code level.
- **Sequelize Model Isolation**: Each microservice defines Sequelize models **only** for its owned tables. Models are not shared across service boundaries.

---

### 2. Complete 55-Table Ownership Matrix

```
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
| #  | Table Name                     | Owning Microservice        | Business Domain & Ownership Responsibilities                |
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
| 1  | Restaurants                    | restaurant-service         | Master enterprise profile, legal entity & default settings  |
| 2  | Branches                       | restaurant-service         | Physical branch locations, geofencing & operating hours     |
| 3  | DiningSections                 | restaurant-service         | Dining floor sections (Main Hall, Terrace, Bar Lounge)      |
| 4  | RestaurantTables               | restaurant-service         | Tables, seating capacity, canvas coordinates, QR hash       |
| 5  | RegisterShifts                 | restaurant-service         | POS cash drawer opening floats & shift reconciliation       |
| 6  | CustomerReviews                | restaurant-service         | Verified diner dining reviews and management replies        |
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
| 7  | Roles                          | auth-service               | System & custom security roles                              |
| 8  | Permissions                    | auth-service               | Granular action privileges                                  |
| 9  | RolePermissions                | auth-service               | Role-to-permission mapping junction                         |
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
| 10 | Users                          | user-service               | Customer, staff & admin accounts (Authentication source)    |
| 11 | UserRoles                      | user-service               | User-to-role assignment junction                            |
| 12 | Employees                      | user-service               | Staff HR records, salary, designation & emergency contacts  |
| 13 | CustomerAddresses              | user-service               | Customer delivery addresses with geo coordinates            |
| 14 | AuditLogs                      | user-service               | Administrative and security audit log repository            |
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
| 15 | Categories                     | menu-service               | Hierarchical food categories & subcategories                |
| 16 | MenuItems                      | menu-service               | Dishes, base pricing, tax %, dietary tags, prep times       |
| 17 | MenuItemImages                 | menu-service               | Photo gallery associated with dishes                        |
| 18 | MenuItemVariants               | menu-service               | Dish portion sizes (Small/Large) & SKU price adjustments    |
| 19 | AddonGroups                    | menu-service               | Modifier groups (Cheeses, Dressings, Crusts)                |
| 20 | AddonItems                     | menu-service               | Specific addon modifier choices & prices                    |
| 21 | MenuItemAddonGroups            | menu-service               | Junction linking dishes to addon modifier groups            |
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
| 22 | ShoppingCarts                  | cart-service               | Guest table & customer shopping cart sessions               |
| 23 | CartItems                      | cart-service               | Line items added to active cart                             |
| 24 | CartItemAddons                 | cart-service               | Addons selected for cart items                              |
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
| 25 | Orders                         | order-service              | Master order header (Dine-in, Takeaway, Delivery)           |
| 26 | OrderItems                     | order-service              | Snapshotted dish line items with historical pricing         |
| 27 | OrderItemAddons                | order-service              | Snapshotted addon line items with historical pricing        |
| 28 | OrderStatusHistory             | order-service              | Audit log of order status transitions                       |
| 29 | Coupons                        | order-service              | Promotional discount coupons & rules                        |
| 30 | CouponUsage                    | order-service              | Customer coupon redemption records                          |
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
| 31 | Payments                       | payment-service            | Payment transactions (Razorpay, Cash, Card, UPI)            |
| 32 | PaymentTransactions            | payment-service            | Raw gateway response payloads & webhook logs                |
| 33 | PaymentRefunds                 | payment-service            | Partial & full payment refund records                       |
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
| 34 | Suppliers                      | inventory-service          | Raw material vendor profiles & terms                        |
| 35 | InventoryIngredients           | inventory-service          | Ingredients catalog, stock levels & reorder alerts          |
| 36 | Recipes                        | inventory-service          | Bill of Materials (BOM) recipe header per dish/variant      |
| 37 | RecipeIngredients              | inventory-service          | Raw ingredient quantities required per dish                 |
| 38 | InventoryTransactions          | inventory-service          | Double-entry stock ledger (Consumption, Restitution, Waste) |
| 39 | PurchaseOrders                 | inventory-service          | Restock procurement orders                                  |
| 40 | PurchaseOrderItems             | inventory-service          | Line items on vendor purchase orders                        |
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
| 41 | KitchenOrderTickets (KOT)      | kitchen-service            | Station-routed kitchen order tickets                        |
| 42 | KOTItems                       | kitchen-service            | Cooking checklist items per KOT                             |
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
| 43 | Reservations                   | reservation-service        | Table booking slots, capacity check & guest details         |
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
| 44 | Notifications                  | notification-service       | Real-time alerts & in-app system notifications              |
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
| 45 | WebsiteSettings                | cms-service                | Global site branding, logos, color palette, typography      |
| 46 | SEOSettings                    | cms-service                | Search engine metadata, Open Graph & Schema.org JSON-LD     |
| 47 | WebsitePages                   | cms-service                | Content pages (Home, About Us, Private Dining, Contact)     |
| 48 | WebsitePageSections            | cms-service                | Dynamic modular section blocks with flexible JSON data      |
| 49 | WebsiteBanners                 | cms-service                | Hero carousel banners & promotional announcements           |
| 50 | NavigationMenus                | cms-service                | Header, mobile drawer & footer navigation link trees        |
| 51 | FooterSections                 | cms-service                | Multi-column footer layout content                          |
| 52 | FAQs                           | cms-service                | Categorized guest questions & answers                       |
| 53 | Testimonials                   | cms-service                | Curated guest & critic testimonials                         |
| 54 | SocialMediaLinks               | cms-service                | Social media profiles & icon keys                           |
| 55 | ContactMessages                | cms-service                | Inbound guest contact messages & event inquiries            |
+----+--------------------------------+----------------------------+-------------------------------------------------------------+
```

---

### 3. Service-by-Service Ownership & API Boundary Details

#### 3.1 `restaurant-service` (Port 5003)
- **Owned Tables**: `Restaurants`, `Branches`, `DiningSections`, `RestaurantTables`, `RegisterShifts`, `CustomerReviews` (6 tables).
- **Data Responsibility**: Manages physical locations, dining layout, table state transitions, cash registers, and dining feedback.
- **Exposed REST Endpoints**:
  - `GET /api/v1/restaurants/profile`
  - `GET /api/v1/branches`, `POST /api/v1/branches`
  - `GET /api/v1/tables`, `PATCH /api/v1/tables/:id/status`
  - `GET /api/v1/tables/qr/:hash` (Used by Cart/Order service to resolve table metadata)
  - `POST /api/v1/shifts/open`, `POST /api/v1/shifts/close`
  - `GET /api/v1/reviews/branch/:branchId`

#### 3.2 `auth-service` (Port 5001)
- **Owned Tables**: `Roles`, `Permissions`, `RolePermissions` (3 tables).
- **Data Responsibility**: Security roles, permission hierarchies, token generation, credential verification.
- **Exposed REST Endpoints**:
  - `POST /api/v1/auth/register` (Calls `user-service` to create user profile)
  - `POST /api/v1/auth/login` (Calls `user-service` to lookup credentials)
  - `POST /api/v1/auth/pos-pin-login`
  - `POST /api/v1/auth/refresh-token`
  - `POST /api/v1/auth/verify-token` (Used by API Gateway)

#### 3.3 `user-service` (Port 5002)
- **Owned Tables**: `Users`, `UserRoles`, `Employees`, `CustomerAddresses`, `AuditLogs` (5 tables).
- **Data Responsibility**: User master records, staff profiles, customer delivery addresses, system audit logging.
- **Exposed REST Endpoints**:
  - `GET /api/v1/users/:id`, `POST /api/v1/users`, `PUT /api/v1/users/:id`
  - `GET /api/v1/users/lookup/by-email-or-phone` (Internal API for Auth Service)
  - `GET /api/v1/employees/branch/:branchId`
  - `POST /api/v1/audit-logs` (Internal API for logging domain actions)

#### 3.4 `cms-service` (Port 5004)
- **Owned Tables**: `WebsiteSettings`, `SEOSettings`, `WebsitePages`, `WebsitePageSections`, `WebsiteBanners`, `NavigationMenus`, `FooterSections`, `FAQs`, `Testimonials`, `SocialMediaLinks`, `ContactMessages` (11 tables).
- **Data Responsibility**: All dynamic customer-facing website content, branding, SEO tags, Cloudinary image upload signatures.
- **Exposed REST Endpoints**:
  - Public: `GET /api/v1/cms/public/settings`, `GET /api/v1/cms/public/pages/:slug`, `GET /api/v1/cms/public/banners`, `POST /api/v1/cms/public/contact`
  - Admin: Full CRUD on `/api/v1/cms/admin/*`

#### 3.5 `menu-service` (Port 5005)
- **Owned Tables**: `Categories`, `MenuItems`, `MenuItemImages`, `MenuItemVariants`, `AddonGroups`, `AddonItems`, `MenuItemAddonGroups` (7 tables).
- **Data Responsibility**: Food menu taxonomy, pricing, taxes, availability ("86") toggle, dish variants, and addon groups.
- **Exposed REST Endpoints**:
  - `GET /api/v1/menu/public/catalog` (Cached in Redis)
  - `GET /api/v1/menu/items/:id/details` (Internal API for Cart/Order Service pricing validation)
  - `PATCH /api/v1/menu/items/:id/availability`

#### 3.6 `cart-service` (Port 5006)
- **Owned Tables**: `ShoppingCarts`, `CartItems`, `CartItemAddons` (3 tables).
- **Data Responsibility**: Live shopping carts for table QR code diners and authenticated customers.
- **Exposed REST Endpoints**:
  - `GET /api/v1/cart/:sessionToken`, `POST /api/v1/cart/items`, `DELETE /api/v1/cart/items/:id`
  - `POST /api/v1/cart/checkout-summary`

#### 3.7 `order-service` (Port 5007)
- **Owned Tables**: `Orders`, `OrderItems`, `OrderItemAddons`, `OrderStatusHistory`, `Coupons`, `CouponUsage` (6 tables).
- **Data Responsibility**: Order ingestion, pricing calculations, status finite-state machine (FSM), coupon redemption, Saga orchestrator.
- **Exposed REST Endpoints**:
  - `POST /api/v1/orders` (Initiates Saga flow: Stock Check -> Order Create -> Payment -> KOT)
  - `GET /api/v1/orders/:id`, `GET /api/v1/orders/active`
  - `PATCH /api/v1/orders/:id/status`
  - `POST /api/v1/orders/:id/apply-coupon`

#### 3.8 `payment-service` (Port 5008)
- **Owned Tables**: `Payments`, `PaymentTransactions`, `PaymentRefunds` (3 tables).
- **Data Responsibility**: Razorpay payment order generation, webhook signature verification, split billing, offline cash/card settlement.
- **Exposed REST Endpoints**:
  - `POST /api/v1/payments/razorpay/create-order`
  - `POST /api/v1/payments/razorpay/verify`
  - `POST /api/v1/payments/razorpay/webhook`
  - `POST /api/v1/payments/offline-settle`
  - `POST /api/v1/payments/refund`

#### 3.9 `inventory-service` (Port 5009)
- **Owned Tables**: `Suppliers`, `InventoryIngredients`, `Recipes`, `RecipeIngredients`, `InventoryTransactions`, `PurchaseOrders`, `PurchaseOrderItems` (7 tables).
- **Data Responsibility**: Ingredient catalog, Recipe Bill of Materials (BOM), automated stock deduction on order preparation, stock restitution on voided orders, vendor restocking.
- **Exposed REST Endpoints**:
  - `POST /api/v1/inventory/bom/check-and-deplete` (Called by Order Service Saga)
  - `POST /api/v1/inventory/bom/restitute` (Compensating transaction called by Order Service Saga)
  - `GET /api/v1/inventory/ingredients`, `POST /api/v1/inventory/spoilage`
  - `GET /api/v1/inventory/purchase-orders`

#### 3.10 `kitchen-service` (Port 5010)
- **Owned Tables**: `KitchenOrderTickets` (KOT), `KOTItems` (2 tables).
- **Data Responsibility**: Kitchen Display System (KDS), routing tickets to stations (`GRILL`, `BAR`, `MAIN`), ticket aging, line-item cooking progress, bump events.
- **Exposed REST Endpoints**:
  - `POST /api/v1/kds/tickets/create` (Called by Order Service when order is placed/paid)
  - `GET /api/v1/kds/tickets/active`
  - `POST /api/v1/kds/tickets/:id/bump`

#### 3.11 `reservation-service` (Port 5011)
- **Owned Tables**: `Reservations` (1 table).
- **Data Responsibility**: Advance table booking, date/time conflict checks, party capacity validation.
- **Exposed REST Endpoints**:
  - `POST /api/v1/reservations` (Queries `restaurant-service` for available tables)
  - `GET /api/v1/reservations`
  - `PATCH /api/v1/reservations/:id/check-in`

#### 3.12 `notification-service` (Port 5012)
- **Owned Tables**: `Notifications` (1 table).
- **Data Responsibility**: Real-time Socket.IO WebSocket broadcasting and persistent user notifications.
- **Exposed REST Endpoints**:
  - `POST /api/v1/notifications/internal/broadcast` (Internal endpoint called by microservices to push Socket.IO events)
  - `GET /api/v1/notifications/user/:userId`

#### 3.13 `report-service` (Port 5013)
- **Owned Tables**: None (Pure aggregator microservice).
- **Data Responsibility**: Calls REST endpoints across `order-service`, `payment-service`, and `inventory-service` to build daily sales reports, P&L summaries, and export Excel/PDF files.
- **Exposed REST Endpoints**:
  - `GET /api/v1/reports/sales-summary`
  - `GET /api/v1/reports/menu-velocity`
  - `GET /api/v1/reports/z-report`

---

### 4. Integrity of Database Constraints in a Shared Architecture

Because all 55 tables reside in `RestaurantManagementDB`:
1. **Foreign Key Integrity**: The foreign key constraints created in Phase 2 remain active and enforced by SQL Server.
2. **Cross-Service Foreign Keys**: For example, `Orders.CustomerId` references `Users.UserId`. When `order-service` inserts an order, SQL Server validates that `UserId` exists. This prevents data corruption while keeping application logic isolated.
3. **No Direct Cross-Service Joins**: Even though SQL Server would technically allow a query joining `Orders` and `Users`, developers and Sequelize models **must not execute cross-service joins**. Each service accesses only its own domain tables.

