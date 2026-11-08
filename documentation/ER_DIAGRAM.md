# Restaurant Management System (RMS)
## Master Entity-Relationship Diagrams (ERD)

---

### 1. Global Core Domain Architecture

```mermaid
erDiagram
    Restaurants ||--o{ Branches : "owns"
    Branches ||--o{ Users : "employs / serves"
    Branches ||--o{ DiningSections : "contains"
    DiningSections ||--o{ RestaurantTables : "arranges"
    Branches ||--o{ MenuItems : "offers"
    Categories ||--o{ MenuItems : "classifies"
    MenuItems ||--o{ MenuItemVariants : "provides"
    MenuItems ||--o{ Recipes : "defines BOM"
    Recipes ||--o{ RecipeIngredients : "requires"
    InventoryIngredients ||--o{ RecipeIngredients : "supplies"
    Branches ||--o{ Orders : "processes"
    RestaurantTables ||--o{ Orders : "hosts"
    Users ||--o{ Orders : "places / serves"
    Orders ||--o{ OrderItems : "contains"
    MenuItems ||--o{ OrderItems : "instantiates"
    Orders ||--o{ KitchenOrderTickets : "generates"
    Orders ||--o{ Payments : "settled by"
    Payments ||--o{ PaymentTransactions : "audits"
    Branches ||--o{ InventoryIngredients : "tracks stock"
    Branches ||--o{ RegisterShifts : "balances"
```

---

### 2. Module 1: Identity, Roles, Employees & Branches

```mermaid
erDiagram
    Restaurants ||--o{ Branches : "operates"
    Branches ||--o{ Users : "assigns"
    Branches ||--o{ Employees : "employs"
    Users ||--|| Employees : "profile"
    Users ||--o{ UserRoles : "assigned"
    Roles ||--o{ UserRoles : "defines"
    Roles ||--o{ RolePermissions : "grants"
    Permissions ||--o{ RolePermissions : "authorizes"
    Users ||--o{ CustomerAddresses : "saves"

    Restaurants {
        int RestaurantId PK
        nvarchar RestaurantName
        nvarchar LegalEntityName
        nvarchar TaxIdentificationNumber
        nvarchar PrimaryContactEmail
        nvarchar DefaultCurrency
    }

    Branches {
        int BranchId PK
        int RestaurantId FK
        nvarchar BranchCode
        nvarchar BranchName
        nvarchar City
        time OpeningTime
        time ClosingTime
    }

    Users {
        bigint UserId PK
        int BranchId FK
        nvarchar FirstName
        nvarchar LastName
        nvarchar Email
        nvarchar PhoneNumber
        nvarchar PasswordHash
        nvarchar PasscodePin
        nvarchar UserType
        bit IsActive
    }

    Roles {
        int RoleId PK
        nvarchar RoleCode
        nvarchar RoleName
        bit IsSystemRole
    }

    Permissions {
        int PermissionId PK
        nvarchar Module
        nvarchar Action
        nvarchar PermissionCode
    }

    Employees {
        bigint EmployeeId PK
        bigint UserId FK
        int BranchId FK
        nvarchar EmployeeCode
        nvarchar Designation
        decimal Salary
    }

    CustomerAddresses {
        bigint AddressId PK
        bigint UserId FK
        nvarchar AddressTitle
        nvarchar AddressLine1
        nvarchar City
        decimal Latitude
        decimal Longitude
    }
```

---

### 3. Module 2: Dining Floor, Tables & Reservations

```mermaid
erDiagram
    Branches ||--o{ DiningSections : "contains"
    DiningSections ||--o{ RestaurantTables : "divides"
    Branches ||--o{ Reservations : "books"
    RestaurantTables ||--o{ Reservations : "allocated"
    Users ||--o{ Reservations : "reserves"

    DiningSections {
        int SectionId PK
        int BranchId FK
        nvarchar SectionName
        int FloorLevel
    }

    RestaurantTables {
        int TableId PK
        int BranchId FK
        int SectionId FK
        nvarchar TableNumber
        int SeatingCapacity
        nvarchar CurrentStatus
        bigint ActiveOrderId
        nvarchar QrCodeHash
        int PosX
        int PosY
    }

    Reservations {
        bigint ReservationId PK
        int BranchId FK
        int TableId FK
        bigint CustomerId FK
        nvarchar GuestName
        nvarchar GuestPhone
        date ReservationDate
        time StartTime
        time EndTime
        nvarchar Status
        decimal DepositAmount
    }
```

---

### 4. Module 3: Menu Catalog, Variants, Addons & Coupons

```mermaid
erDiagram
    Branches ||--o{ Categories : "customizes"
    Categories ||--o{ Categories : "sub-categorizes"
    Categories ||--o{ MenuItems : "groups"
    MenuItems ||--o{ MenuItemImages : "displays"
    MenuItems ||--o{ MenuItemVariants : "sizes"
    AddonGroups ||--o{ AddonItems : "lists"
    MenuItems ||--o{ MenuItemAddonGroups : "attaches"
    AddonGroups ||--o{ MenuItemAddonGroups : "configured for"
    Branches ||--o{ Coupons : "issues"
    Coupons ||--o{ CouponUsage : "redeemed"

    Categories {
        int CategoryId PK
        int BranchId FK
        int ParentCategoryId FK
        nvarchar CategoryName
        nvarchar CategorySlug
        int DisplayOrder
    }

    MenuItems {
        bigint MenuItemId PK
        int BranchId FK
        int CategoryId FK
        nvarchar ItemCode
        nvarchar ItemName
        decimal BasePrice
        decimal CostPrice
        decimal TaxPercentage
        nvarchar DietaryType
        bit IsAvailable
    }

    MenuItemVariants {
        bigint VariantId PK
        bigint MenuItemId FK
        nvarchar VariantName
        decimal PriceAdjustment
        bit IsDefault
    }

    AddonGroups {
        int AddonGroupId PK
        nvarchar GroupName
        int MinSelections
        int MaxSelections
    }

    AddonItems {
        bigint AddonItemId PK
        int AddonGroupId FK
        nvarchar ItemName
        decimal Price
    }

    Coupons {
        int CouponId PK
        nvarchar CouponCode
        nvarchar DiscountType
        decimal DiscountValue
        decimal MinOrderAmount
        decimal MaxDiscountAmount
    }
```

---

### 5. Module 4: Order Lifecycle, KOT & Billing

```mermaid
erDiagram
    Branches ||--o{ Orders : "records"
    RestaurantTables ||--o{ Orders : "seats"
    Users ||--o{ Orders : "initiates"
    Orders ||--o{ OrderItems : "itemizes"
    MenuItems ||--o{ OrderItems : "dishes"
    MenuItemVariants ||--o{ OrderItems : "variant choice"
    OrderItems ||--o{ OrderItemAddons : "customizes"
    AddonItems ||--o{ OrderItemAddons : "addon choice"
    Orders ||--o{ OrderStatusHistory : "transitions"
    Orders ||--o{ KitchenOrderTickets : "sends KOT"
    KitchenOrderTickets ||--o{ KOTItems : "cooks"
    OrderItems ||--o{ KOTItems : "routes"
    Orders ||--o{ Payments : "settles"
    Payments ||--o{ PaymentTransactions : "logs"
    Payments ||--o{ PaymentRefunds : "refunds"
    Branches ||--o{ RegisterShifts : "balances"

    Orders {
        bigint OrderId PK
        int BranchId FK
        nvarchar OrderNumber
        nvarchar OrderType
        int TableId FK
        bigint CustomerId FK
        nvarchar OrderStatus
        nvarchar PaymentStatus
        decimal SubTotal
        decimal TaxTotal
        decimal ServiceCharge
        decimal DiscountTotal
        decimal GrandTotal
    }

    OrderItems {
        bigint OrderItemId PK
        bigint OrderId FK
        bigint MenuItemId FK
        bigint VariantId FK
        nvarchar ItemNameSnapshot
        decimal UnitPrice
        int Quantity
        decimal ItemTotal
        nvarchar ItemStatus
    }

    OrderItemAddons {
        bigint OrderItemAddonId PK
        bigint OrderItemId FK
        bigint AddonItemId FK
        nvarchar AddonNameSnapshot
        decimal UnitPrice
        int Quantity
        decimal TotalPrice
    }

    KitchenOrderTickets {
        bigint KOTId PK
        nvarchar KOTNumber
        bigint OrderId FK
        nvarchar KitchenStation
        nvarchar TicketStatus
    }

    Payments {
        bigint PaymentId PK
        bigint OrderId FK
        nvarchar PaymentReference
        nvarchar PaymentMethod
        decimal Amount
        nvarchar GatewayOrderId
        nvarchar GatewayPaymentId
        nvarchar PaymentStatus
    }

    RegisterShifts {
        bigint ShiftId PK
        int BranchId FK
        bigint CashierUserId FK
        datetime2 OpenedAt
        datetime2 ClosedAt
        decimal OpeningFloat
        decimal ExpectedCash
        decimal ActualCashCounted
        decimal CashDifference
        nvarchar Status
    }
```

---

### 6. Module 5: Inventory, Recipe (BOM) & Purchasing

```mermaid
erDiagram
    Branches ||--o{ InventoryIngredients : "stocks"
    Suppliers ||--o{ InventoryIngredients : "supplies"
    MenuItems ||--o{ Recipes : "recipe for"
    MenuItemVariants ||--o{ Recipes : "variant recipe"
    Recipes ||--o{ RecipeIngredients : "lists"
    InventoryIngredients ||--o{ RecipeIngredients : "quantified as"
    InventoryIngredients ||--o{ InventoryTransactions : "depletes/restocks"
    Branches ||--o{ PurchaseOrders : "procures"
    Suppliers ||--o{ PurchaseOrders : "fulfills"
    PurchaseOrders ||--o{ PurchaseOrderItems : "details"
    InventoryIngredients ||--o{ PurchaseOrderItems : "orders"

    Suppliers {
        int SupplierId PK
        nvarchar SupplierCode
        nvarchar SupplierName
        nvarchar Phone
        nvarchar Email
    }

    InventoryIngredients {
        bigint IngredientId PK
        int BranchId FK
        nvarchar IngredientCode
        nvarchar IngredientName
        nvarchar UnitOfMeasure
        decimal CurrentStock
        decimal ReorderLevel
        decimal CostPerUnit
    }

    Recipes {
        bigint RecipeId PK
        bigint MenuItemId FK
        bigint VariantId FK
        int YieldPortions
    }

    RecipeIngredients {
        bigint RecipeIngredientId PK
        bigint RecipeId FK
        bigint IngredientId FK
        decimal RequiredQuantity
        nvarchar UnitOfMeasure
        decimal WastagePercentage
    }

    InventoryTransactions {
        bigint TransactionId PK
        bigint IngredientId FK
        nvarchar TransactionType
        decimal QuantityChanged
        decimal BalanceAfter
        bigint ReferenceOrderId FK
    }

    PurchaseOrders {
        bigint POId PK
        int BranchId FK
        nvarchar PONumber
        int SupplierId FK
        decimal GrandTotal
        nvarchar Status
    }
```

---

### 7. Module 6: Dynamic Website CMS & Digital Storefront

```mermaid
erDiagram
    Restaurants ||--o{ WebsiteSettings : "configures branding"
    Restaurants ||--o{ SEOSettings : "configures SEO"
    Restaurants ||--o{ WebsitePages : "manages pages"
    WebsitePages ||--o{ WebsitePageSections : "structures"
    WebsitePages ||--o{ SEOSettings : "page metadata"
    Restaurants ||--o{ WebsiteBanners : "displays"
    Restaurants ||--o{ NavigationMenus : "navigates"
    NavigationMenus ||--o{ NavigationMenus : "dropdown sub-menus"
    Restaurants ||--o{ FooterSections : "footers"
    Restaurants ||--o{ FAQs : "answers"
    Restaurants ||--o{ Testimonials : "features"
    Restaurants ||--o{ SocialMediaLinks : "links"
    Branches ||--o{ ContactMessages : "receives"
    Users ||--o{ ContactMessages : "replies to"

    WebsiteSettings {
        int SettingId PK
        int RestaurantId FK
        int BranchId FK
        nvarchar SiteTitle
        nvarchar HeaderLogoUrl
        nvarchar PrimaryColor
        nvarchar ContactEmail
        nvarchar ContactPhone
    }

    SEOSettings {
        int SEOId PK
        int RestaurantId FK
        bigint PageId FK
        nvarchar MetaTitle
        nvarchar MetaDescription
        nvarchar OgImageUrl
        nvarchar StructuredDataJson
    }

    WebsitePages {
        bigint PageId PK
        int RestaurantId FK
        nvarchar PageTitle
        nvarchar PageSlug
        nvarchar PageType
        nvarchar Status
        int DisplayOrder
    }

    WebsitePageSections {
        bigint SectionId PK
        bigint PageId FK
        nvarchar SectionKey
        nvarchar ComponentType
        nvarchar ContentDataJson
        int DisplayOrder
        bit IsActive
    }

    WebsiteBanners {
        bigint BannerId PK
        int RestaurantId FK
        nvarchar BannerTitle
        nvarchar ButtonText
        nvarchar ButtonLink
        nvarchar ImageUrl
        nvarchar BannerLocation
        int DisplayOrder
    }

    NavigationMenus {
        int MenuId PK
        int RestaurantId FK
        int ParentMenuId FK
        nvarchar MenuLocation
        nvarchar Title
        nvarchar TargetUrl
        int DisplayOrder
    }

    FooterSections {
        int FooterSectionId PK
        int RestaurantId FK
        nvarchar SectionTitle
        nvarchar ContentType
        nvarchar ContentHtml
        int DisplayOrder
    }

    FAQs {
        int FAQId PK
        int RestaurantId FK
        nvarchar Category
        nvarchar Question
        nvarchar Answer
        int DisplayOrder
    }

    Testimonials {
        bigint TestimonialId PK
        int RestaurantId FK
        nvarchar AuthorName
        nvarchar AuthorRole
        int Rating
        nvarchar ReviewContent
        bit IsFeatured
    }

    SocialMediaLinks {
        int SocialLinkId PK
        int RestaurantId FK
        nvarchar PlatformName
        nvarchar PlatformUrl
        nvarchar IconKey
        int DisplayOrder
    }

    ContactMessages {
        bigint MessageId PK
        int BranchId FK
        nvarchar SenderName
        nvarchar SenderEmail
        nvarchar Subject
        nvarchar InquiryType
        nvarchar Status
        bigint RepliedByUserId FK
    }
```

