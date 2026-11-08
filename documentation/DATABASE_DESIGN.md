# Restaurant Management System (RMS)
## Master Database Architecture & Data Dictionary

---

### 1. Database Overview & Architectural Principles

- **Database Engine**: Microsoft SQL Server 2019 / 2022 / Azure SQL Database
- **Database Name**: `RestaurantManagementDB`
- **Default Collation**: `Latin1_General_100_CI_AS_SC_UTF8` (Full multilingual and Unicode support)
- **Concurrency & Isolation**: `READ_COMMITTED_SNAPSHOT ON` (RCSI) and `ALLOW_SNAPSHOT_ISOLATION ON`
- **ORM Integration**: Sequelize v6 (Node.js) via native `tedious` TDS driver

#### Core Architectural Tenets
1. **Multi-Branch Isolation**: Every transactional and operational table includes a foreign key `BranchId` to ensure strict tenant data segregation across multi-unit restaurant operations.
2. **Historical Price Preservation**: Dish names, variant descriptions, and prices are snapshotted on order entry (`ItemNameSnapshot`, `VariantNameSnapshot`, `UnitPrice`, `AddonNameSnapshot`). Future menu price adjustments never mutate past historical order reports.
3. **Financial Precision**: All monetary values use `DECIMAL(10,2)`. Recipe ingredient weights and inventory measurements use `DECIMAL(12,4)` for millimeter-grade portion accuracy (e.g., 0.0050 KG of saffron or 0.1250 L of cream).
4. **Soft Deletion Pattern**: Customer accounts, menu items, categories, ingredients, and tables implement `IsDeleted BIT NOT NULL DEFAULT 0` and `DeletedAt DATETIME2(3) NULL` with filtered non-clustered indexes to preserve referential integrity while hiding deleted entities from client applications.
5. **ACID Transaction Boundaries**: Real-time order placement with Recipe Bill of Materials (BOM) stock depletion and payment settlement execute inside dedicated stored procedures (`sp_PlaceOrderWithBOMDepletion`, `sp_SettlePaymentAndCompleteOrder`) with `XACT_ABORT ON` and rollback semantics.

---

### 2. Complete Database Table Catalog (44 Normalized Tables)

```
+---------------------------------------------------------------------------------------------------+
|                                  DATABASE ENTITY INVENTORY                                        |
+----+----------------------------+-----------------------+-----------------------------------------+
| #  | Table Name                 | Module Classification | Primary Business Responsibility         |
+----+----------------------------+-----------------------+-----------------------------------------+
| 1  | Restaurants                | Restaurant Management | Master restaurant enterprise profile    |
| 2  | Branches                   | Restaurant Branches   | Branch locations, hours, geo-coords     |
| 3  | Roles                      | Roles & Permissions   | System and custom security roles        |
| 4  | Permissions                | Roles & Permissions   | Granular action privileges              |
| 5  | RolePermissions            | Roles & Permissions   | Many-to-many role-permission mapping    |
| 6  | Users                      | User Management       | Customers, staff, and admin accounts    |
| 7  | UserRoles                  | Roles & Permissions   | User-to-role assignment matrix          |
| 8  | Employees                  | Employees / Staff     | Staff HR details, salary, designations  |
| 9  | CustomerAddresses          | Customer Addresses    | Delivery addresses with geo coordinates |
| 10 | DiningSections             | Restaurant Tables     | Floor areas (Dining Room, Terrace, Bar) |
| 11 | RestaurantTables           | Restaurant Tables     | Physical tables, QR hashes, floor coords|
| 12 | Reservations               | Reservations          | Table booking slots and guest capacity  |
| 13 | Categories                 | Food Categories       | Hierarchical food & beverage taxonomy   |
| 14 | MenuItems                  | Food Items            | Dishes, pricing, tax rates, dietary tags|
| 15 | MenuItemImages             | Food Images           | Gallery photos per menu item            |
| 16 | MenuItemVariants           | Food Variants         | Size portions (Small/Large) & SKU adjustments|
| 17 | AddonGroups                | Food Addons           | Modifier groups (Cheeses, Dressings)    |
| 18 | AddonItems                 | Food Addons           | Specific add-on choices with pricing    |
| 19 | MenuItemAddonGroups        | Food Addons           | Junction linking dishes to addon groups |
| 20 | Coupons                    | Coupons & Discounts   | Promo codes, percentage/fixed discounts |
| 21 | CouponUsage                | Coupon Usage          | Redemption audit log per customer/order |
| 22 | ShoppingCarts              | Shopping Cart         | Active web/mobile/table cart sessions   |
| 23 | CartItems                  | Cart Items            | Dishes selected in active cart          |
| 24 | CartItemAddons             | Cart Items            | Add-ons chosen for cart line items      |
| 25 | Orders                     | Orders                | Header table for dine-in/takeaway orders|
| 26 | OrderItems                 | Order Items           | Snapshotted line items with prep status |
| 27 | OrderItemAddons            | Order Items           | Snapshotted addons with line totals     |
| 28 | OrderStatusHistory         | Order Status History  | Audit log of all order state transitions|
| 29 | KitchenOrderTickets (KOT)  | Kitchen Operations    | KDS tickets routed by kitchen station   |
| 30 | KOTItems                   | Kitchen Operations    | Line items assigned to specific KOTs    |
| 31 | Payments                   | Payments              | Payment header (Razorpay, Cash, Card)   |
| 32 | PaymentTransactions        | Payment Transactions  | Gateway payload logs & webhook traces   |
| 33 | PaymentRefunds             | Payment Refunds       | Partial/full refund transactions        |
| 34 | RegisterShifts             | POS Shift Management  | Cash drawer floats & Z-report balancing |
| 35 | Suppliers                  | Suppliers             | Raw material vendors & payment terms    |
| 36 | InventoryIngredients       | Inventory             | Raw materials, UOM, stock, reorder levels|
| 37 | Recipes                    | Recipe (BOM)          | Header linking dishes to recipes        |
| 38 | RecipeIngredients          | Recipe (BOM)          | Bill of materials ingredient quantities |
| 39 | InventoryTransactions      | Inventory Transactions| Stock ledger (Consumption, Restitution) |
| 40 | PurchaseOrders             | Purchase Orders       | Supplier restock orders                 |
| 41 | PurchaseOrderItems         | Purchase Orders       | Raw ingredients received from suppliers |
| 42 | CustomerReviews            | Customer Reviews      | Ratings (Food, Service, Ambience)       |
| 43 | Notifications              | Notifications         | User & staff real-time system alerts    |
| 44 | AuditLogs                  | Audit Logs            | Immutable administrative change logs     |
| 45 | WebsiteSettings            | Dynamic Website CMS   | Global site branding, logos & colors    |
| 46 | SEOSettings                | Dynamic Website CMS   | Search engine metadata & Open Graph     |
| 47 | WebsitePages               | Dynamic Website CMS   | Dynamic pages (Home, About, Services)   |
| 48 | WebsitePageSections        | Dynamic Website CMS   | Modular page blocks with flexible JSON  |
| 49 | WebsiteBanners             | Dynamic Website CMS   | Hero sliders & promotional banners      |
| 50 | NavigationMenus            | Dynamic Website CMS   | Header & mobile navigation tree         |
| 51 | FooterSections             | Dynamic Website CMS   | Multi-column footer layout              |
| 52 | FAQs                       | Dynamic Website CMS   | Categorized guest questions & answers   |
| 53 | Testimonials               | Dynamic Website CMS   | Curated guest & critic testimonials     |
| 54 | SocialMediaLinks           | Dynamic Website CMS   | Social media channels & links           |
| 55 | ContactMessages            | Dynamic Website CMS   | Inbound contact form inquiries          |
+----+----------------------------+-----------------------+-----------------------------------------+
```

---

### 3. Detailed Data Dictionary

#### 3.1 Organization & Multi-Branch
- `Restaurants`: Stores master tenant profile, tax credentials (GSTIN), default currency (`INR`), and logo.
- `Branches`: Physical restaurant outlets. Contains operating hours (`OpeningTime`, `ClosingTime`), latitude/longitude for delivery geofencing, and unique `BranchCode`.

#### 3.2 Security, Identity & Staff
- `Roles`: System-defined roles (`SUPER_ADMIN`, `RESTAURANT_MANAGER`, `CASHIER_POS`, `WAITSTAFF`, `KITCHEN_CHEF`, `CUSTOMER`).
- `Permissions`: Fine-grained privilege codes (e.g., `ORDERS.VOID`, `MENU.86_TOGGLE`).
- `RolePermissions`: Junction granting permissions to roles.
- `Users`: Unified account table. Passwords encrypted with `bcrypt` (work factor 12); POS staff authenticated via hashed 4-digit `PasscodePin`.
- `UserRoles`: Grants roles to users with branch-level scoping.
- `Employees`: HR details, designation, salary, emergency contacts, and active status.

#### 3.3 Dining Floor & Reservations
- `DiningSections`: Layout segments (`Main Dining`, `Terrace`, `Bar Lounge`).
- `RestaurantTables`: Physical tables with seating capacity, floor canvas coordinates (`PosX`, `PosY`), and a cryptographically generated `QrCodeHash` for customer self-ordering.
- `Reservations`: Date, start/end time slots, party size, deposit amount, and conflict checks.

#### 3.4 Menu Engineering & Add-ons
- `Categories`: Recursive self-referential table (`ParentCategoryId`) supporting nested menus.
- `MenuItems`: Dishes with base prices, food taxes (`TaxPercentage`), dietary classifications (`VEG`, `NON_VEG`, `VEGAN`, `EGG`), prep times, and the `IsAvailable` toggle.
- `MenuItemVariants`: Size/portion variations with price adjustments and SKUs.
- `AddonGroups`: Configurable modifier groups with min/max selection bounds.
- `AddonItems`: Individual modifier options with standalone pricing.
- `MenuItemAddonGroups`: Junction associating add-on groups with specific dishes.

#### 3.5 Shopping Cart & Active Sessions
- `ShoppingCarts`: Persistent carts for unauthenticated QR diners and authenticated mobile guests.
- `CartItems` & `CartItemAddons`: Line items with quantities and special customer instructions.

#### 3.6 Order Lifecycle & Kitchen Operations
- `Orders`: Omnichannel order header. Supports `DINE_IN`, `TAKEAWAY`, and `DELIVERY`. Captures subtotals, packaging charges, service charges, taxes, discounts, tips, and grand totals.
- `OrderItems`: Historical snapshot columns (`ItemNameSnapshot`, `UnitPrice`) ensure past orders remain immutable even if the menu changes.
- `OrderItemAddons`: Snapshots selected add-on names and quantities.
- `OrderStatusHistory`: Audit ledger of state transitions (`PLACED` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED` -> `COMPLETED`).
- `KitchenOrderTickets (KOT)`: Station-based kitchen routing (`MAIN_KITCHEN`, `GRILL`, `BAR`).
- `KOTItems`: Item-level cooking checklist.

#### 3.7 Payments, Refunds & Cash Management
- `Payments`: Multi-tender payment records (`RAZORPAY`, `CASH`, `CREDIT_CARD`, `UPI_OFFLINE`).
- `PaymentTransactions`: Raw webhook and gateway response payloads for audit.
- `PaymentRefunds`: Partial or full refunds with reason tracking.
- `RegisterShifts`: Cash register session management. Records opening float, total sales per tender, actual counted cash, and automatically calculates discrepancies (`Over/Short`) for daily Z-Reports.

#### 3.8 Inventory, Recipe BOM & Restocking
- `Suppliers`: Vendor directory with payment terms and tax numbers.
- `InventoryIngredients`: Raw ingredients tracked in metric UOM (`KG`, `LITER`, `PIECE`). Includes reorder warning thresholds.
- `Recipes` & `RecipeIngredients`: Multi-level Bill of Materials (BOM) linking dishes (and dish variants) to raw ingredient consumption.
- `InventoryTransactions`: Double-entry stock ledger recording `CONSUMPTION`, `PURCHASE`, `WASTAGE`, and `RESTITUTION`.
- `PurchaseOrders` & `PurchaseOrderItems`: Procurement tracking for vendor deliveries.

#### 3.9 Intelligence, Engagement & Auditing
- `CustomerReviews`: Star ratings (Overall, Food, Service, Ambience) and management replies.
- `Notifications`: Real-time system notifications pushed to users and staff.
- `AuditLogs`: Security and financial audit trail capturing IP addresses, actors, and JSON diffs (`OldValuesJson`, `NewValuesJson`).

#### 3.10 Dynamic Website CMS & Digital Storefront
- `WebsiteSettings`: Global site branding, logos (header, footer, favicon), color palettes, contact info, and Google Maps embed.
- `SEOSettings`: Page-level and global meta titles, descriptions, keywords, Open Graph, Twitter cards, and Schema.org structured data.
- `WebsitePages`: Content pages (`Home`, `About Us`, `Private Dining`, `Contact`) with Draft/Published workflow.
- `WebsitePageSections`: Modular page sections (`HERO_SLIDER`, `ABOUT_STORY`, `FEATURED_MENU`, `CHEF_FEATURE`, `SERVICES_LIST`, `STATS_COUNTER`, `TESTIMONIALS_GRID`, `FAQ_ACCORDION`, `RESERVATION_CTA`) rendered dynamically via frontend registry.
- `WebsiteBanners`: Hero sliders and promotional banners with scheduling dates and Cloudinary image assets.
- `NavigationMenus`: Multi-tier header, mobile drawer, and footer navigation links.
- `FooterSections`: Multi-column footer management (Hours, Quick Links, Newsletter, Custom HTML).
- `FAQs`: Categorized guest questions and answers.
- `Testimonials`: Curated press quotes and diner endorsements with ratings and author roles.
- `SocialMediaLinks`: Configurable social media platform icons and links.
- `ContactMessages`: Inbound customer messages and private dining inquiries with status tracking.

---

### 4. Referential Integrity & Cascade Architecture

To ensure zero cascade errors in Microsoft SQL Server, cascade paths have been designed with strict referential safety:
- **Child Order Items**: `ON DELETE CASCADE` from `Orders` -> `OrderItems` -> `OrderItemAddons`.
- **KOT Tickets**: `ON DELETE CASCADE` from `Orders` -> `KitchenOrderTickets` -> `KOTItems`.
- **Catalog Cascade**: `ON DELETE CASCADE` from `MenuItems` -> `MenuItemVariants`, `MenuItemImages`, `MenuItemAddonGroups`.
- **Protected Master References**: `Orders.BranchId`, `Orders.TableId`, `Orders.CustomerId` use `ON DELETE NO ACTION` to guarantee that transaction records cannot be orphaned or accidentally purged.
- **Soft Deletion Filtering**: Master entities are never hard deleted; `IsDeleted = 1` preserves history.

