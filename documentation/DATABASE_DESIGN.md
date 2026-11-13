# Restaurant Management System (RMS)
## Master Database Architecture & Data Dictionary

---

### 1. Database Overview & Architectural Principles

- **Database Engine**: Microsoft SQL Server 2019 / 2022 / Azure SQL Database
- **Database Name**: `RestaurantManagementDB`
- **Default Collation**: `Latin1_General_100_CI_AS_SC_UTF8` (Full multilingual and Unicode support)
- **Concurrency & Isolation**: `READ_COMMITTED_SNAPSHOT ON` (RCSI) and `ALLOW_SNAPSHOT_ISOLATION ON`
- **Database Access Pattern**: Stored Procedures ONLY via Node.js native `mssql` (TDS) connection pool (`backend/shared/config/database.js`). Zero ORM / No Sequelize models.

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

---

### 5. Stored Procedures Catalog (58 Procedures Total)

All database mutations and queries execute through dedicated, compiled SQL Server stored procedures:

#### 5.1 Auth & User Management (`database/07_AuthUserStoredProcedures.sql`)
1. `dbo.usp_User_GetByEmailOrPhone`: Retrieve user with roles and permissions by email or phone.
2. `dbo.usp_User_GetById`: Retrieve full user profile by `UserId` with roles.
3. `dbo.usp_User_Create`: Insert new user with hashed password and initial role assignment.
4. `dbo.usp_User_CheckExists`: Verify uniqueness of email or phone.
5. `dbo.usp_User_UpdateProfile`: Update user personal info (`FirstName`, `LastName`, `AvatarUrl`).
6. `dbo.usp_User_UpdateLastLogin`: Update `LastLoginAt` timestamp.
7. `dbo.usp_User_SetStatus`: Activate/deactivate user accounts.
8. `dbo.usp_User_GetPinAuth`: Fetch staff credentials and PIN hash for POS login.
9. `dbo.usp_Auth_AssignRole`: Assign security role to user for a branch.
10. `dbo.usp_Auth_GetUserRolesAndPermissions`: Retrieve active roles and distinct permissions for a user.
11. `dbo.usp_Auth_GetAllRoles`: List all available system and custom roles.
12. `dbo.usp_CustomerAddress_Create`: Atomic single-default address creation.
13. `dbo.usp_CustomerAddress_GetByUserId`: List addresses for customer.
14. `dbo.usp_CustomerAddress_GetById`: Fetch single address details.
15. `dbo.usp_CustomerAddress_Update`: Update delivery address and manage default address flag.
16. `dbo.usp_CustomerAddress_Delete`: Soft delete customer address.
17. `dbo.usp_Employee_Create`: Register employee HR record and designation.
18. `dbo.usp_Employee_GetById`: Fetch employee record by `EmployeeId`.
19. `dbo.usp_Employee_GetByUserId`: Fetch employee record by `UserId`.
20. `dbo.usp_Employee_List`: List staff with branch, designation, and status filters.
21. `dbo.usp_Employee_Update`: Update employee HR details, salary, and emergency contacts.
22. `dbo.usp_Employee_UpdateStatus`: Synchronize employee employment status with user account status.
23. `dbo.usp_AuditLog_Create`: Append immutable security audit log entry.

#### 5.2 Operations & Transactions (`database/06_StoredProcedures.sql`)
24. `dbo.sp_PlaceOrderWithBOMDepletion`: Atomic order placement + KOT generation + recipe inventory stock depletion.
25. `dbo.sp_SettlePaymentAndCompleteOrder`: Atomic payment settlement, table status change, order completion.
26. `dbo.sp_OpenCashRegisterShift`: Shift opening float initialization.
27. `dbo.sp_CloseCashRegisterShift`: Shift closing float balancing and Z-report discrepancy calculation.
28. `dbo.sp_CheckTableAvailability`: Reservation timeslot overlap conflict prevention.
29. `dbo.sp_GetPublicPageWithSections`: Fast single-roundtrip retrieval for dynamic website pages.
30. `dbo.sp_ReorderPageSections`: Drag-and-drop page section order update.
31. `dbo.sp_SubmitContactMessage`: Inbound website contact message handling.

#### 5.3 Restaurant & Floor Management (`database/08_RestaurantFloorStoredProcedures.sql`)
32. `dbo.usp_Restaurant_Create`: Insert master restaurant profile with currency, timezone, and tax identifiers.
33. `dbo.usp_Restaurant_Update`: Update restaurant profile, branding, contacts, and locale settings.
34. `dbo.usp_Restaurant_GetById`: Fetch restaurant profile and associated active branches.
35. `dbo.usp_Restaurant_List`: Paginated retrieval of restaurant enterprises with active branch counts.
36. `dbo.usp_Restaurant_SetStatus`: Activate/deactivate restaurant entity.
37. `dbo.usp_Branch_Create`: Register new branch outlet with operating hours, coordinates, and main branch logic.
38. `dbo.usp_Branch_Update`: Update branch contact info, location coordinates, hours, and addresses.
39. `dbo.usp_Branch_GetById`: Fetch branch details with restaurant parent metadata, sections, and table counts.
40. `dbo.usp_Branch_List`: Filtered and paginated list of branches with operational metrics.
41. `dbo.usp_Branch_SetStatus`: Activate/deactivate branch outlet.
42. `dbo.usp_DiningSection_Create`: Create dining section (Main Dining, Terrace, Bar Lounge) for a branch.
43. `dbo.usp_DiningSection_Update`: Update dining section name, floor level, and display sort order.
44. `dbo.usp_DiningSection_GetById`: Fetch dining section details and table capacity metrics.
45. `dbo.usp_DiningSection_ListByBranch`: Retrieve sections ordered by floor and display sequence with table counts.
46. `dbo.usp_DiningSection_SetStatus`: Activate/deactivate dining section.
47. `dbo.usp_DiningTable_Create`: Insert table with auto-generated unique QR Code hash and 2D canvas coordinates.
48. `dbo.usp_DiningTable_Update`: Update table number, section assignment, seating capacity, and coordinates.
49. `dbo.usp_DiningTable_GetById`: Fetch single table details with branch and section details.
50. `dbo.usp_DiningTable_GetByQrHash`: High-speed unauthenticated table lookup for customer QR code ordering.
51. `dbo.usp_DiningTable_ListByBranch`: Filter tables by section, status, and active state.
52. `dbo.usp_DiningTable_ListBySection`: List all tables configured within a specific dining section.
53. `dbo.usp_DiningTable_UpdateCapacity`: Adjust physical chair/seating capacity for a table.
54. `dbo.usp_DiningTable_UpdateStatus`: Atomic status lifecycle update (AVAILABLE, OCCUPIED, RESERVED, BILLED, CLEANING) with ActiveOrderId tracking.
55. `dbo.usp_DiningTable_GetAvailable`: High-speed lookup for vacant tables with optional minimum capacity filter.
56. `dbo.usp_DiningTable_GetOccupied`: Retrieve occupied tables with linked active order references.
57. `dbo.usp_DiningTable_Delete`: Safe soft deletion of dining tables (protects occupied/billed tables).
58. `dbo.usp_Floor_GetLayout`: Multi-recordset 2D visual floor plan engine returning branch KPIs, sections, and tables with layout coordinates.



