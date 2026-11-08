-- ============================================================================
-- Script: 02_CreateTables.sql
-- Description: Creates all 44 normalized tables across all 28 modules.
--              Includes Primary Keys, Constraints, Defaults, Historical Snapshots,
--              and Soft Deletion columns.
-- Database: RestaurantManagementDB
-- Engine: Microsoft SQL Server 2019 / 2022
-- Author: Senior SQL Server Database Architect
-- Date: 2026-11-08
-- ============================================================================

USE RestaurantManagementDB;
GO

-- ============================================================================
-- MODULE 1 & 2: RESTAURANT & BRANCH MANAGEMENT (Multi-Branch Isolation)
-- ============================================================================

IF OBJECT_ID('dbo.Restaurants', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Restaurants (
        RestaurantId INT IDENTITY(1,1) NOT NULL,
        RestaurantName NVARCHAR(120) NOT NULL,
        LegalEntityName NVARCHAR(150) NULL,
        TaxIdentificationNumber NVARCHAR(50) NULL, -- GSTIN / VAT / EIN
        PrimaryContactEmail NVARCHAR(120) NOT NULL,
        PrimaryContactPhone NVARCHAR(25) NOT NULL,
        WebsiteUrl NVARCHAR(255) NULL,
        LogoUrl NVARCHAR(500) NULL,
        DefaultCurrency NVARCHAR(10) NOT NULL DEFAULT 'INR',
        DefaultTimezone NVARCHAR(50) NOT NULL DEFAULT 'India Standard Time',
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Restaurants PRIMARY KEY CLUSTERED (RestaurantId)
    );
END;
GO

IF OBJECT_ID('dbo.Branches', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Branches (
        BranchId INT IDENTITY(1,1) NOT NULL,
        RestaurantId INT NOT NULL,
        BranchCode NVARCHAR(30) NOT NULL, -- e.g. 'BR-BLR-01'
        BranchName NVARCHAR(120) NOT NULL,
        AddressLine1 NVARCHAR(200) NOT NULL,
        AddressLine2 NVARCHAR(200) NULL,
        City NVARCHAR(80) NOT NULL,
        StateProvince NVARCHAR(80) NOT NULL,
        PostalCode NVARCHAR(20) NOT NULL,
        Country NVARCHAR(80) NOT NULL DEFAULT 'India',
        Latitude DECIMAL(9,6) NULL,
        Longitude DECIMAL(9,6) NULL,
        Phone NVARCHAR(25) NOT NULL,
        Email NVARCHAR(120) NULL,
        OpeningTime TIME(0) NOT NULL DEFAULT '09:00:00',
        ClosingTime TIME(0) NOT NULL DEFAULT '23:00:00',
        IsMainBranch BIT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Branches PRIMARY KEY CLUSTERED (BranchId),
        CONSTRAINT UQ_Branches_BranchCode UNIQUE (BranchCode)
    );
END;
GO

-- ============================================================================
-- MODULE 3 & 4: ROLES, PERMISSIONS & USER MANAGEMENT
-- ============================================================================

IF OBJECT_ID('dbo.Roles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles (
        RoleId INT IDENTITY(1,1) NOT NULL,
        RoleCode NVARCHAR(40) NOT NULL, -- 'SUPER_ADMIN', 'RESTAURANT_MANAGER', 'CASHIER_POS', 'WAITSTAFF', 'KITCHEN_CHEF', 'CUSTOMER'
        RoleName NVARCHAR(80) NOT NULL,
        Description NVARCHAR(255) NULL,
        IsSystemRole BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Roles PRIMARY KEY CLUSTERED (RoleId),
        CONSTRAINT UQ_Roles_RoleCode UNIQUE (RoleCode)
    );
END;
GO

IF OBJECT_ID('dbo.Permissions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Permissions (
        PermissionId INT IDENTITY(1,1) NOT NULL,
        Module NVARCHAR(50) NOT NULL, -- 'MENU', 'ORDERS', 'INVENTORY', 'REPORTS', 'TABLES', 'BILLING'
        Action NVARCHAR(50) NOT NULL, -- 'READ', 'CREATE', 'UPDATE', 'DELETE', 'VOID', 'APPROVE'
        PermissionCode NVARCHAR(100) NOT NULL, -- 'ORDERS.VOID', 'MENU.UPDATE_AVAILABILITY'
        Description NVARCHAR(255) NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Permissions PRIMARY KEY CLUSTERED (PermissionId),
        CONSTRAINT UQ_Permissions_PermissionCode UNIQUE (PermissionCode)
    );
END;
GO

IF OBJECT_ID('dbo.RolePermissions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RolePermissions (
        RolePermissionId INT IDENTITY(1,1) NOT NULL,
        RoleId INT NOT NULL,
        PermissionId INT NOT NULL,
        GrantedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_RolePermissions PRIMARY KEY CLUSTERED (RolePermissionId),
        CONSTRAINT UQ_RolePermissions_Role_Perm UNIQUE (RoleId, PermissionId)
    );
END;
GO

IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        UserId BIGINT IDENTITY(1,1) NOT NULL,
        BranchId INT NULL, -- NULL for system-wide SuperAdmin; specific BranchId for local staff
        FirstName NVARCHAR(60) NOT NULL,
        LastName NVARCHAR(60) NULL,
        Email NVARCHAR(120) NULL,
        PhoneNumber NVARCHAR(25) NOT NULL,
        PasswordHash NVARCHAR(255) NULL, -- Nullable for quick walk-in guests or QR diners
        PasscodePin NVARCHAR(255) NULL,   -- Hashed 4-to-6 digit PIN for quick POS / KDS login
        UserType NVARCHAR(30) NOT NULL DEFAULT 'CUSTOMER', -- 'CUSTOMER', 'STAFF', 'ADMIN'
        AvatarUrl NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        IsEmailVerified BIT NOT NULL DEFAULT 0,
        IsPhoneVerified BIT NOT NULL DEFAULT 0,
        LastLoginAt DATETIME2(3) NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (UserId)
    );
END;
GO

IF OBJECT_ID('dbo.UserRoles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserRoles (
        UserRoleId BIGINT IDENTITY(1,1) NOT NULL,
        UserId BIGINT NOT NULL,
        RoleId INT NOT NULL,
        BranchId INT NULL, -- Context-specific branch authority
        AssignedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_UserRoles PRIMARY KEY CLUSTERED (UserRoleId),
        CONSTRAINT UQ_UserRoles_User_Role UNIQUE (UserId, RoleId)
    );
END;
GO

IF OBJECT_ID('dbo.Employees', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Employees (
        EmployeeId BIGINT IDENTITY(1,1) NOT NULL,
        UserId BIGINT NOT NULL,
        BranchId INT NOT NULL,
        EmployeeCode NVARCHAR(30) NOT NULL, -- e.g. 'EMP-2026-004'
        Designation NVARCHAR(80) NOT NULL,  -- 'Head Chef', 'Floor Captain', 'Bartender', 'Senior Cashier'
        DateOfJoining DATE NOT NULL,
        DateOfLeaving DATE NULL,
        Salary DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        EmergencyContactPerson NVARCHAR(100) NULL,
        EmergencyContactPhone NVARCHAR(25) NULL,
        EmploymentStatus NVARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED'
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Employees PRIMARY KEY CLUSTERED (EmployeeId),
        CONSTRAINT UQ_Employees_UserId UNIQUE (UserId),
        CONSTRAINT UQ_Employees_EmployeeCode UNIQUE (EmployeeCode)
    );
END;
GO

-- ============================================================================
-- MODULE 5: CUSTOMER ADDRESSES
-- ============================================================================

IF OBJECT_ID('dbo.CustomerAddresses', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CustomerAddresses (
        AddressId BIGINT IDENTITY(1,1) NOT NULL,
        UserId BIGINT NOT NULL,
        AddressTitle NVARCHAR(50) NOT NULL DEFAULT 'Home', -- 'Home', 'Work', 'Other'
        RecipientName NVARCHAR(100) NOT NULL,
        RecipientPhone NVARCHAR(25) NOT NULL,
        AddressLine1 NVARCHAR(200) NOT NULL,
        AddressLine2 NVARCHAR(200) NULL,
        Landmark NVARCHAR(120) NULL,
        City NVARCHAR(80) NOT NULL,
        StateProvince NVARCHAR(80) NOT NULL,
        PostalCode NVARCHAR(20) NOT NULL,
        Latitude DECIMAL(9,6) NULL,
        Longitude DECIMAL(9,6) NULL,
        IsDefault BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_CustomerAddresses PRIMARY KEY CLUSTERED (AddressId)
    );
END;
GO

-- ============================================================================
-- MODULE 6 & 7: DINING SECTIONS, TABLES & RESERVATIONS
-- ============================================================================

IF OBJECT_ID('dbo.DiningSections', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.DiningSections (
        SectionId INT IDENTITY(1,1) NOT NULL,
        BranchId INT NOT NULL,
        SectionName NVARCHAR(60) NOT NULL, -- 'Main Dining', 'Terrace / Balcony', 'AC Lounge', 'Bar Area'
        FloorLevel INT NOT NULL DEFAULT 1,
        DisplayOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_DiningSections PRIMARY KEY CLUSTERED (SectionId)
    );
END;
GO

IF OBJECT_ID('dbo.RestaurantTables', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RestaurantTables (
        TableId INT IDENTITY(1,1) NOT NULL,
        BranchId INT NOT NULL,
        SectionId INT NOT NULL,
        TableNumber NVARCHAR(20) NOT NULL, -- 'T-01', 'B-04'
        SeatingCapacity INT NOT NULL DEFAULT 4,
        CurrentStatus NVARCHAR(30) NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'BILLED', 'CLEANING'
        ActiveOrderId BIGINT NULL, -- Soft pointer to current active order (avoid circular cascade FK)
        QrCodeHash NVARCHAR(120) NOT NULL, -- Secret unique token used in QR URL
        PosX INT NOT NULL DEFAULT 0, -- Coordinates for visual floor plan editor
        PosY INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_RestaurantTables PRIMARY KEY CLUSTERED (TableId),
        CONSTRAINT UQ_RestaurantTables_Branch_Number UNIQUE (BranchId, TableNumber),
        CONSTRAINT UQ_RestaurantTables_QrHash UNIQUE (QrCodeHash)
    );
END;
GO

IF OBJECT_ID('dbo.Reservations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Reservations (
        ReservationId BIGINT IDENTITY(1,1) NOT NULL,
        BranchId INT NOT NULL,
        TableId INT NULL, -- NULL until assigned by hostess
        CustomerId BIGINT NULL, -- Optional if guest is registered user
        GuestName NVARCHAR(100) NOT NULL,
        GuestPhone NVARCHAR(25) NOT NULL,
        GuestEmail NVARCHAR(120) NULL,
        PartySize INT NOT NULL,
        ReservationDate DATE NOT NULL,
        StartTime TIME(0) NOT NULL,
        EndTime TIME(0) NOT NULL,
        Status NVARCHAR(30) NOT NULL DEFAULT 'CONFIRMED', -- 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'
        SpecialRequests NVARCHAR(500) NULL,
        DepositAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        DepositPaymentId BIGINT NULL,
        CreatedByUserId BIGINT NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Reservations PRIMARY KEY CLUSTERED (ReservationId)
    );
END;
GO

-- ============================================================================
-- MODULE 8, 9, 10: FOOD CATEGORIES, ITEMS, IMAGES, VARIANTS & ADDONS
-- ============================================================================

IF OBJECT_ID('dbo.Categories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categories (
        CategoryId INT IDENTITY(1,1) NOT NULL,
        BranchId INT NULL, -- NULL indicates global menu category available across branches
        ParentCategoryId INT NULL, -- Recursive self-reference for subcategories
        CategoryName NVARCHAR(80) NOT NULL,
        CategorySlug NVARCHAR(100) NOT NULL,
        Description NVARCHAR(255) NULL,
        DisplayOrder INT NOT NULL DEFAULT 0,
        ImageUrl NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Categories PRIMARY KEY CLUSTERED (CategoryId)
    );
END;
GO

IF OBJECT_ID('dbo.MenuItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MenuItems (
        MenuItemId BIGINT IDENTITY(1,1) NOT NULL,
        BranchId INT NOT NULL,
        CategoryId INT NOT NULL,
        ItemCode NVARCHAR(30) NOT NULL, -- e.g. 'PIZ-001'
        ItemName NVARCHAR(120) NOT NULL,
        Description NVARCHAR(1000) NULL,
        BasePrice DECIMAL(10,2) NOT NULL,
        CostPrice DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        TaxPercentage DECIMAL(5,2) NOT NULL DEFAULT 5.00, -- GST/VAT %
        DietaryType NVARCHAR(30) NOT NULL DEFAULT 'VEG', -- 'VEG', 'NON_VEG', 'VEGAN', 'EGG', 'HALAL'
        SpicyLevel INT NOT NULL DEFAULT 0, -- 0 (None) to 3 (Extra Hot)
        PreparationTimeMinutes INT NOT NULL DEFAULT 15,
        IsAvailable BIT NOT NULL DEFAULT 1, -- The '86' out-of-stock toggle
        IsFeatured BIT NOT NULL DEFAULT 0,
        DisplayOrder INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_MenuItems PRIMARY KEY CLUSTERED (MenuItemId),
        CONSTRAINT UQ_MenuItems_Branch_Code UNIQUE (BranchId, ItemCode)
    );
END;
GO

IF OBJECT_ID('dbo.MenuItemImages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MenuItemImages (
        ImageId BIGINT IDENTITY(1,1) NOT NULL,
        MenuItemId BIGINT NOT NULL,
        ImageUrl NVARCHAR(500) NOT NULL,
        IsPrimary BIT NOT NULL DEFAULT 0,
        DisplayOrder INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_MenuItemImages PRIMARY KEY CLUSTERED (ImageId)
    );
END;
GO

IF OBJECT_ID('dbo.MenuItemVariants', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MenuItemVariants (
        VariantId BIGINT IDENTITY(1,1) NOT NULL,
        MenuItemId BIGINT NOT NULL,
        VariantName NVARCHAR(60) NOT NULL, -- 'Small', 'Medium', 'Large', 'Full Portion'
        SKU NVARCHAR(50) NULL,
        PriceAdjustment DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Additional or differential price
        IsDefault BIT NOT NULL DEFAULT 0,
        IsAvailable BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_MenuItemVariants PRIMARY KEY CLUSTERED (VariantId)
    );
END;
GO

IF OBJECT_ID('dbo.AddonGroups', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AddonGroups (
        AddonGroupId INT IDENTITY(1,1) NOT NULL,
        BranchId INT NULL, -- NULL = shared across all branches
        GroupName NVARCHAR(80) NOT NULL, -- 'Choice of Crust', 'Add-on Toppings', 'Beverage Flavour'
        MinSelections INT NOT NULL DEFAULT 0,
        MaxSelections INT NOT NULL DEFAULT 10,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_AddonGroups PRIMARY KEY CLUSTERED (AddonGroupId)
    );
END;
GO

IF OBJECT_ID('dbo.AddonItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AddonItems (
        AddonItemId BIGINT IDENTITY(1,1) NOT NULL,
        AddonGroupId INT NOT NULL,
        ItemName NVARCHAR(80) NOT NULL, -- 'Extra Mozzarella', 'Jalapenos', 'Oat Milk'
        Price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        IsAvailable BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_AddonItems PRIMARY KEY CLUSTERED (AddonItemId)
    );
END;
GO

IF OBJECT_ID('dbo.MenuItemAddonGroups', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MenuItemAddonGroups (
        MenuItemId BIGINT NOT NULL,
        AddonGroupId INT NOT NULL,
        DisplayOrder INT NOT NULL DEFAULT 0,
        CONSTRAINT PK_MenuItemAddonGroups PRIMARY KEY CLUSTERED (MenuItemId, AddonGroupId)
    );
END;
GO

-- ============================================================================
-- MODULE 11: COUPONS & DISCOUNTS
-- ============================================================================

IF OBJECT_ID('dbo.Coupons', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Coupons (
        CouponId INT IDENTITY(1,1) NOT NULL,
        BranchId INT NULL, -- NULL for all branches
        CouponCode NVARCHAR(30) NOT NULL, -- 'WELCOME50', 'FESTIVE20'
        Title NVARCHAR(100) NOT NULL,
        Description NVARCHAR(255) NULL,
        DiscountType NVARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE', -- 'PERCENTAGE', 'FIXED_AMOUNT'
        DiscountValue DECIMAL(10,2) NOT NULL,
        MinOrderAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        MaxDiscountAmount DECIMAL(10,2) NULL, -- Cap for percentage discounts
        StartDate DATETIME2(3) NOT NULL,
        EndDate DATETIME2(3) NOT NULL,
        UsageLimitTotal INT NOT NULL DEFAULT 1000,
        UsageLimitPerUser INT NOT NULL DEFAULT 1,
        TimesUsed INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Coupons PRIMARY KEY CLUSTERED (CouponId),
        CONSTRAINT UQ_Coupons_CouponCode UNIQUE (CouponCode)
    );
END;
GO

IF OBJECT_ID('dbo.CouponUsage', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CouponUsage (
        UsageId BIGINT IDENTITY(1,1) NOT NULL,
        CouponId INT NOT NULL,
        OrderId BIGINT NOT NULL,
        UserId BIGINT NULL,
        DiscountAmount DECIMAL(10,2) NOT NULL,
        UsedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_CouponUsage PRIMARY KEY CLUSTERED (UsageId)
    );
END;
GO

-- ============================================================================
-- MODULE 12: SHOPPING CART & PERSISTENT GUEST / TABLE SESSIONS
-- ============================================================================

IF OBJECT_ID('dbo.ShoppingCarts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShoppingCarts (
        CartId BIGINT IDENTITY(1,1) NOT NULL,
        BranchId INT NOT NULL,
        TableId INT NULL, -- Set for dine-in QR orders
        UserId BIGINT NULL, -- Set for authenticated customers
        SessionToken NVARCHAR(120) NOT NULL, -- Token stored in client browser
        SubTotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        TaxTotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        GrandTotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        ExpiresAt DATETIME2(3) NOT NULL,
        CONSTRAINT PK_ShoppingCarts PRIMARY KEY CLUSTERED (CartId),
        CONSTRAINT UQ_ShoppingCarts_Session UNIQUE (SessionToken)
    );
END;
GO

IF OBJECT_ID('dbo.CartItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CartItems (
        CartItemId BIGINT IDENTITY(1,1) NOT NULL,
        CartId BIGINT NOT NULL,
        MenuItemId BIGINT NOT NULL,
        VariantId BIGINT NULL,
        Quantity INT NOT NULL DEFAULT 1,
        UnitPrice DECIMAL(10,2) NOT NULL,
        TotalPrice DECIMAL(10,2) NOT NULL,
        SpecialInstructions NVARCHAR(255) NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_CartItems PRIMARY KEY CLUSTERED (CartItemId)
    );
END;
GO

IF OBJECT_ID('dbo.CartItemAddons', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CartItemAddons (
        CartItemAddonId BIGINT IDENTITY(1,1) NOT NULL,
        CartItemId BIGINT NOT NULL,
        AddonItemId BIGINT NOT NULL,
        UnitPrice DECIMAL(10,2) NOT NULL,
        Quantity INT NOT NULL DEFAULT 1,
        TotalPrice DECIMAL(10,2) NOT NULL,
        CONSTRAINT PK_CartItemAddons PRIMARY KEY CLUSTERED (CartItemAddonId)
    );
END;
GO

-- ============================================================================
-- MODULE 13 & 14: ORDERS, ORDER ITEMS, ADDONS & AUDIT TRAIL
-- ============================================================================

IF OBJECT_ID('dbo.Orders', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders (
        OrderId BIGINT IDENTITY(100001,1) NOT NULL,
        BranchId INT NOT NULL,
        OrderNumber NVARCHAR(35) NOT NULL, -- 'ORD-BLR1-20261108-0001'
        OrderType NVARCHAR(30) NOT NULL DEFAULT 'DINE_IN', -- 'DINE_IN', 'TAKEAWAY', 'DELIVERY'
        TableId INT NULL,
        CustomerId BIGINT NULL, -- Nullable for anonymous walk-ins
        GuestName NVARCHAR(100) NULL, -- For walk-in takeaway / dine-in guest
        GuestPhone NVARCHAR(25) NULL,
        DeliveryAddressId BIGINT NULL, -- Used when OrderType = 'DELIVERY'
        WaitstaffUserId BIGINT NULL, -- POS staff who created/served the order
        OrderStatus NVARCHAR(30) NOT NULL DEFAULT 'PLACED', -- 'PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED', 'VOIDED'
        PaymentStatus NVARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PARTIALLY_PAID', 'PAID', 'REFUNDED'
        SubTotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        TaxTotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        ServiceCharge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        PackagingCharge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        DiscountTotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        TipAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        GrandTotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        CustomerNotes NVARCHAR(500) NULL,
        VoidReason NVARCHAR(255) NULL,
        VoidedByUserId BIGINT NULL,
        EstimatedDeliveryMinutes INT NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Orders PRIMARY KEY CLUSTERED (OrderId),
        CONSTRAINT UQ_Orders_OrderNumber UNIQUE (OrderNumber)
    );
END;
GO

IF OBJECT_ID('dbo.OrderItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderItems (
        OrderItemId BIGINT IDENTITY(1,1) NOT NULL,
        OrderId BIGINT NOT NULL,
        MenuItemId BIGINT NOT NULL,
        VariantId BIGINT NULL,
        -- Historical price preservation snapshots (resilient to future menu edits)
        ItemNameSnapshot NVARCHAR(120) NOT NULL,
        VariantNameSnapshot NVARCHAR(60) NULL,
        UnitPrice DECIMAL(10,2) NOT NULL,
        Quantity INT NOT NULL DEFAULT 1,
        ItemTotal DECIMAL(10,2) NOT NULL,
        SpecialInstructions NVARCHAR(255) NULL,
        ItemStatus NVARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'COOKING', 'READY', 'SERVED', 'VOIDED'
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_OrderItems PRIMARY KEY CLUSTERED (OrderItemId)
    );
END;
GO

IF OBJECT_ID('dbo.OrderItemAddons', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderItemAddons (
        OrderItemAddonId BIGINT IDENTITY(1,1) NOT NULL,
        OrderItemId BIGINT NOT NULL,
        AddonItemId BIGINT NOT NULL,
        -- Historical snapshot
        AddonNameSnapshot NVARCHAR(80) NOT NULL,
        UnitPrice DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        Quantity INT NOT NULL DEFAULT 1,
        TotalPrice DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        CONSTRAINT PK_OrderItemAddons PRIMARY KEY CLUSTERED (OrderItemAddonId)
    );
END;
GO

IF OBJECT_ID('dbo.OrderStatusHistory', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderStatusHistory (
        HistoryId BIGINT IDENTITY(1,1) NOT NULL,
        OrderId BIGINT NOT NULL,
        PreviousStatus NVARCHAR(30) NOT NULL,
        NewStatus NVARCHAR(30) NOT NULL,
        ChangedByUserId BIGINT NULL,
        Notes NVARCHAR(500) NULL,
        ChangedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_OrderStatusHistory PRIMARY KEY CLUSTERED (HistoryId)
    );
END;
GO

-- ============================================================================
-- MODULE 15: KITCHEN DISPLAY SYSTEM & TICKETS (KOT)
-- ============================================================================

IF OBJECT_ID('dbo.KitchenOrderTickets', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.KitchenOrderTickets (
        KOTId BIGINT IDENTITY(50001,1) NOT NULL,
        BranchId INT NOT NULL,
        KOTNumber NVARCHAR(35) NOT NULL, -- 'KOT-BLR1-20261108-001'
        OrderId BIGINT NOT NULL,
        KitchenStation NVARCHAR(40) NOT NULL DEFAULT 'MAIN_KITCHEN', -- 'GRILL', 'FRYER', 'BAR', 'DESSERT'
        TicketStatus NVARCHAR(30) NOT NULL DEFAULT 'NEW', -- 'NEW', 'PREPARING', 'READY', 'BUMPED'
        SpecialKitchenNotes NVARCHAR(500) NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        BumpedAt DATETIME2(3) NULL,
        CONSTRAINT PK_KitchenOrderTickets PRIMARY KEY CLUSTERED (KOTId),
        CONSTRAINT UQ_KOT_Number UNIQUE (KOTNumber)
    );
END;
GO

IF OBJECT_ID('dbo.KOTItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.KOTItems (
        KOTItemId BIGINT IDENTITY(1,1) NOT NULL,
        KOTId BIGINT NOT NULL,
        OrderItemId BIGINT NOT NULL,
        PreparationStatus NVARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'COOKING', 'READY'
        CompletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_KOTItems PRIMARY KEY CLUSTERED (KOTItemId)
    );
END;
GO

-- ============================================================================
-- MODULE 16 & 17: PAYMENTS, TRANSACTIONS, REFUNDS & SPLIT BILLING
-- ============================================================================

IF OBJECT_ID('dbo.Payments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Payments (
        PaymentId BIGINT IDENTITY(1,1) NOT NULL,
        OrderId BIGINT NOT NULL,
        BranchId INT NOT NULL,
        PaymentReference NVARCHAR(60) NOT NULL, -- Internal receipt ref 'PAY-20261108-0012'
        PaymentMethod NVARCHAR(30) NOT NULL, -- 'RAZORPAY', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI_OFFLINE', 'SPLIT'
        Amount DECIMAL(10,2) NOT NULL,
        GatewayOrderId NVARCHAR(100) NULL, -- Razorpay order_id
        GatewayPaymentId NVARCHAR(100) NULL, -- Razorpay payment_id
        GatewaySignature NVARCHAR(255) NULL,
        PaymentStatus NVARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'
        SettledByUserId BIGINT NULL,
        SettledAt DATETIME2(3) NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Payments PRIMARY KEY CLUSTERED (PaymentId),
        CONSTRAINT UQ_Payments_Reference UNIQUE (PaymentReference)
    );
END;
GO

IF OBJECT_ID('dbo.PaymentTransactions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PaymentTransactions (
        TransactionId BIGINT IDENTITY(1,1) NOT NULL,
        PaymentId BIGINT NOT NULL,
        TransactionType NVARCHAR(30) NOT NULL, -- 'CHARGE', 'WEBHOOK_CAPTURE', 'REFUND'
        Amount DECIMAL(10,2) NOT NULL,
        GatewayTransactionId NVARCHAR(120) NULL,
        GatewayResponseCode NVARCHAR(50) NULL,
        GatewayPayloadJson NVARCHAR(MAX) NULL,
        Status NVARCHAR(30) NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILED'
        TransactionDate DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_PaymentTransactions PRIMARY KEY CLUSTERED (TransactionId)
    );
END;
GO

IF OBJECT_ID('dbo.PaymentRefunds', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PaymentRefunds (
        RefundId BIGINT IDENTITY(1,1) NOT NULL,
        PaymentId BIGINT NOT NULL,
        GatewayRefundId NVARCHAR(100) NULL, -- Razorpay refund_id
        RefundAmount DECIMAL(10,2) NOT NULL,
        Reason NVARCHAR(255) NOT NULL,
        Status NVARCHAR(30) NOT NULL DEFAULT 'PROCESSED', -- 'INITIATED', 'PROCESSED', 'FAILED'
        InitiatedByUserId BIGINT NOT NULL,
        ProcessedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_PaymentRefunds PRIMARY KEY CLUSTERED (RefundId)
    );
END;
GO

-- ============================================================================
-- MODULE 18: POS CASH DRAWER & REGISTER SHIFT SESSIONS
-- ============================================================================

IF OBJECT_ID('dbo.RegisterShifts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RegisterShifts (
        ShiftId BIGINT IDENTITY(1,1) NOT NULL,
        BranchId INT NOT NULL,
        CashierUserId BIGINT NOT NULL,
        OpenedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        ClosedAt DATETIME2(3) NULL,
        OpeningFloat DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        TotalCashSales DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        TotalCardSales DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        TotalUpiSales DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        TotalRefunds DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        ExpectedCash DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        ActualCashCounted DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        CashDifference DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Over / Short
        ShiftNotes NVARCHAR(500) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
        CONSTRAINT PK_RegisterShifts PRIMARY KEY CLUSTERED (ShiftId)
    );
END;
GO

-- ============================================================================
-- MODULE 19, 20, 21: SUPPLIERS, INVENTORY, RECIPES (BOM) & PURCHASE ORDERS
-- ============================================================================

IF OBJECT_ID('dbo.Suppliers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Suppliers (
        SupplierId INT IDENTITY(1,1) NOT NULL,
        BranchId INT NULL, -- NULL = centralized supplier for all branches
        SupplierCode NVARCHAR(30) NOT NULL,
        SupplierName NVARCHAR(120) NOT NULL,
        ContactPerson NVARCHAR(80) NULL,
        Phone NVARCHAR(25) NOT NULL,
        Email NVARCHAR(120) NULL,
        Address NVARCHAR(255) NULL,
        GSTIN NVARCHAR(50) NULL,
        PaymentTerms NVARCHAR(100) NULL, -- 'Net 30', 'Cash on Delivery'
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Suppliers PRIMARY KEY CLUSTERED (SupplierId),
        CONSTRAINT UQ_Suppliers_Code UNIQUE (SupplierCode)
    );
END;
GO

IF OBJECT_ID('dbo.InventoryIngredients', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.InventoryIngredients (
        IngredientId BIGINT IDENTITY(1,1) NOT NULL,
        BranchId INT NOT NULL,
        IngredientCode NVARCHAR(30) NOT NULL,
        IngredientName NVARCHAR(100) NOT NULL,
        Category NVARCHAR(50) NOT NULL DEFAULT 'GENERAL', -- 'DAIRY', 'MEAT', 'PRODUCE', 'DRY_GOODS', 'BEVERAGE'
        UnitOfMeasure NVARCHAR(20) NOT NULL, -- 'KG', 'GRAM', 'LITER', 'ML', 'PIECE', 'CAN'
        CurrentStock DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
        MinimumStockLevel DECIMAL(12,4) NOT NULL DEFAULT 5.0000,
        ReorderLevel DECIMAL(12,4) NOT NULL DEFAULT 10.0000,
        CostPerUnit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        PrimarySupplierId INT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2(3) NULL,
        CONSTRAINT PK_InventoryIngredients PRIMARY KEY CLUSTERED (IngredientId),
        CONSTRAINT UQ_Inventory_Branch_Code UNIQUE (BranchId, IngredientCode)
    );
END;
GO

IF OBJECT_ID('dbo.Recipes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Recipes (
        RecipeId BIGINT IDENTITY(1,1) NOT NULL,
        MenuItemId BIGINT NOT NULL,
        VariantId BIGINT NULL, -- Nullable: allows variant-specific BOM (e.g. Large Pizza uses more cheese)
        YieldPortions INT NOT NULL DEFAULT 1,
        PreparationNotes NVARCHAR(MAX) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Recipes PRIMARY KEY CLUSTERED (RecipeId)
    );
END;
GO

IF OBJECT_ID('dbo.RecipeIngredients', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecipeIngredients (
        RecipeIngredientId BIGINT IDENTITY(1,1) NOT NULL,
        RecipeId BIGINT NOT NULL,
        IngredientId BIGINT NOT NULL,
        RequiredQuantity DECIMAL(12,4) NOT NULL,
        UnitOfMeasure NVARCHAR(20) NOT NULL,
        WastagePercentage DECIMAL(5,2) NOT NULL DEFAULT 0.00, -- e.g. 5% trimming loss
        CONSTRAINT PK_RecipeIngredients PRIMARY KEY CLUSTERED (RecipeIngredientId),
        CONSTRAINT UQ_Recipe_Ingredient UNIQUE (RecipeId, IngredientId)
    );
END;
GO

IF OBJECT_ID('dbo.InventoryTransactions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.InventoryTransactions (
        TransactionId BIGINT IDENTITY(1,1) NOT NULL,
        BranchId INT NOT NULL,
        IngredientId BIGINT NOT NULL,
        TransactionType NVARCHAR(30) NOT NULL, -- 'CONSUMPTION', 'PURCHASE', 'WASTAGE', 'ADJUSTMENT', 'RESTITUTION'
        QuantityChanged DECIMAL(12,4) NOT NULL, -- Negative for consumption/spoilage, positive for receipt
        UnitCost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        BalanceAfter DECIMAL(12,4) NOT NULL,
        ReferenceOrderId BIGINT NULL,
        ReferencePOId BIGINT NULL,
        Notes NVARCHAR(500) NULL,
        RecordedByUserId BIGINT NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_InventoryTransactions PRIMARY KEY CLUSTERED (TransactionId)
    );
END;
GO

IF OBJECT_ID('dbo.PurchaseOrders', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PurchaseOrders (
        POId BIGINT IDENTITY(1,1) NOT NULL,
        BranchId INT NOT NULL,
        PONumber NVARCHAR(35) NOT NULL, -- 'PO-BLR1-20261108-01'
        SupplierId INT NOT NULL,
        TotalAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        TaxAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        GrandTotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        Status NVARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED'
        ExpectedDeliveryDate DATE NULL,
        ActualDeliveryDate DATE NULL,
        Notes NVARCHAR(500) NULL,
        CreatedByUserId BIGINT NOT NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_PurchaseOrders PRIMARY KEY CLUSTERED (POId),
        CONSTRAINT UQ_PurchaseOrders_PONumber UNIQUE (PONumber)
    );
END;
GO

IF OBJECT_ID('dbo.PurchaseOrderItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PurchaseOrderItems (
        POItemId BIGINT IDENTITY(1,1) NOT NULL,
        POId BIGINT NOT NULL,
        IngredientId BIGINT NOT NULL,
        OrderedQuantity DECIMAL(12,4) NOT NULL,
        ReceivedQuantity DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
        UnitPrice DECIMAL(10,2) NOT NULL,
        LineTotal DECIMAL(10,2) NOT NULL,
        CONSTRAINT PK_PurchaseOrderItems PRIMARY KEY CLUSTERED (POItemId)
    );
END;
GO

-- ============================================================================
-- MODULE 22, 23, 24: CUSTOMER REVIEWS, NOTIFICATIONS & AUDIT LOGS
-- ============================================================================

IF OBJECT_ID('dbo.CustomerReviews', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CustomerReviews (
        ReviewId BIGINT IDENTITY(1,1) NOT NULL,
        BranchId INT NOT NULL,
        OrderId BIGINT NOT NULL,
        CustomerId BIGINT NULL,
        CustomerName NVARCHAR(100) NOT NULL,
        Rating INT NOT NULL, -- Overall 1 to 5
        FoodRating INT NULL,
        ServiceRating INT NULL,
        AmbienceRating INT NULL,
        ReviewText NVARCHAR(1000) NULL,
        OwnerReply NVARCHAR(1000) NULL,
        OwnerRepliedAt DATETIME2(3) NULL,
        IsPublished BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_CustomerReviews PRIMARY KEY CLUSTERED (ReviewId),
        CONSTRAINT CK_CustomerReviews_Rating CHECK (Rating BETWEEN 1 AND 5)
    );
END;
GO

IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications (
        NotificationId BIGINT IDENTITY(1,1) NOT NULL,
        BranchId INT NULL,
        UserId BIGINT NULL, -- Recipient user (or NULL for broadcast)
        Title NVARCHAR(150) NOT NULL,
        Message NVARCHAR(1000) NOT NULL,
        NotificationType NVARCHAR(40) NOT NULL, -- 'NEW_ORDER', 'KDS_ALERT', 'LOW_STOCK', 'RESERVATION_NEW'
        TargetUrl NVARCHAR(255) NULL,
        IsRead BIT NOT NULL DEFAULT 0,
        ReadAt DATETIME2(3) NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Notifications PRIMARY KEY CLUSTERED (NotificationId)
    );
END;
GO

IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs (
        AuditId BIGINT IDENTITY(1,1) NOT NULL,
        BranchId INT NULL,
        UserId BIGINT NULL,
        EntityName NVARCHAR(60) NOT NULL, -- 'Orders', 'Payments', 'MenuItems', 'InventoryIngredients'
        EntityId NVARCHAR(60) NOT NULL,
        ActionType NVARCHAR(30) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'VOID', 'DISCOUNT', 'REFUND'
        ActionDescription NVARCHAR(500) NOT NULL,
        IpAddress NVARCHAR(50) NULL,
        UserAgent NVARCHAR(255) NULL,
        OldValuesJson NVARCHAR(MAX) NULL,
        NewValuesJson NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_AuditLogs PRIMARY KEY CLUSTERED (AuditId)
    );
END;
GO

PRINT 'All 44 database tables created successfully with strict data types, primary keys, and defaults.';
GO

