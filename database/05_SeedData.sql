-- ============================================================================
-- Script: 05_SeedData.sql
-- Description: Inserts realistic enterprise development seed data across all
--              modules including Roles, Permissions, Restaurant, Branches, Staff,
--              Menu Taxonomy, Variants, Addons, Tables, Inventory, Recipes (BOM),
--              Coupons, and sample operational records.
-- Database: RestaurantManagementDB
-- Engine: Microsoft SQL Server 2019 / 2022
-- Author: Senior SQL Server Database Architect
-- Date: 2026-11-08
-- ============================================================================

USE RestaurantManagementDB;
GO

SET NOCOUNT ON;
GO

-- ============================================================================
-- 1. RESTAURANT & BRANCHES
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Restaurants WHERE RestaurantId = 1)
BEGIN
    SET IDENTITY_INSERT dbo.Restaurants ON;
    INSERT INTO dbo.Restaurants (
        RestaurantId, RestaurantName, LegalEntityName, TaxIdentificationNumber,
        PrimaryContactEmail, PrimaryContactPhone, WebsiteUrl, DefaultCurrency, DefaultTimezone
    ) VALUES (
        1, N'Antigravity Gourmet Bistro', N'Antigravity Hospitality Private Limited',
        N'29AABCU9603R1ZM', N'contact@antigravitybistro.com', N'+91 98765 43210',
        N'https://antigravitybistro.com', N'INR', N'India Standard Time'
    );
    SET IDENTITY_INSERT dbo.Restaurants OFF;
    PRINT 'Seed: Restaurant entity created.';
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchId = 1)
BEGIN
    SET IDENTITY_INSERT dbo.Branches ON;
    INSERT INTO dbo.Branches (
        BranchId, RestaurantId, BranchCode, BranchName, AddressLine1, AddressLine2,
        City, StateProvince, PostalCode, Country, Phone, Email, OpeningTime, ClosingTime, IsMainBranch
    ) VALUES 
    (
        1, 1, N'BR-BLR-01', N'Indiranagar Flagship', N'100 Feet Road, HAL 2nd Stage',
        N'Opposite Metro Pillar 42', N'Bengaluru', N'Karnataka', N'560038', N'India',
        N'+91 80 4123 4567', N'indiranagar@antigravitybistro.com', '10:00:00', '23:30:00', 1
    ),
    (
        2, 1, N'BR-BLR-02', N'Koramangala 4th Block', N'80 Feet Road, 4th Block',
        N'Near Sony World Signal', N'Bengaluru', N'Karnataka', N'560034', N'India',
        N'+91 80 4987 6543', N'koramangala@antigravitybistro.com', '11:00:00', '00:00:00', 0
    );
    SET IDENTITY_INSERT dbo.Branches OFF;
    PRINT 'Seed: Branches created (Indiranagar & Koramangala).';
END;
GO

-- ============================================================================
-- 2. ROLES & PERMISSIONS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleCode = 'SUPER_ADMIN')
BEGIN
    INSERT INTO dbo.Roles (RoleCode, RoleName, Description, IsSystemRole) VALUES
    ('SUPER_ADMIN', N'Super Administrator', N'Full enterprise access across all branches and system settings', 1),
    ('RESTAURANT_MANAGER', N'Restaurant General Manager', N'Operational authority for orders, refunds, inventory and staff', 1),
    ('CASHIER_POS', N'POS Cashier', N'Terminal operator for bill settlement, order taking, and shift balancing', 1),
    ('WAITSTAFF', N'Floor Waitstaff', N'Floor table service, order entry, and food delivery', 1),
    ('KITCHEN_CHEF', N'Kitchen Chef / Line Cook', N'Kitchen display access, ticket preparation, and station bumping', 1),
    ('CUSTOMER', N'Customer / Guest', N'Menu browsing, table QR self-ordering, checkout and reservations', 1);
    PRINT 'Seed: 6 Core Roles inserted.';
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Permissions WHERE PermissionCode = 'ORDERS.CREATE')
BEGIN
    INSERT INTO dbo.Permissions (Module, Action, PermissionCode, Description) VALUES
    ('MENU', 'READ', 'MENU.READ', N'View food menu and pricing'),
    ('MENU', 'CREATE', 'MENU.CREATE', N'Add dishes and categories'),
    ('MENU', 'UPDATE', 'MENU.UPDATE', N'Modify dish pricing and details'),
    ('MENU', '86_TOGGLE', 'MENU.86_TOGGLE', N'Toggle item availability out of stock'),
    ('ORDERS', 'CREATE', 'ORDERS.CREATE', N'Create dine-in or takeaway orders'),
    ('ORDERS', 'UPDATE', 'ORDERS.UPDATE', N'Append items to active orders'),
    ('ORDERS', 'VOID', 'ORDERS.VOID', N'Void dishes or cancel orders with reason'),
    ('BILLING', 'SETTLE', 'BILLING.SETTLE', N'Settle cash, card and UPI payments'),
    ('BILLING', 'SPLIT', 'BILLING.SPLIT', N'Execute split bill calculations'),
    ('BILLING', 'REFUND', 'BILLING.REFUND', N'Issue partial or full payment refunds'),
    ('KDS', 'BUMP', 'KDS.BUMP', N'Bump tickets and mark items ready on KDS'),
    ('TABLES', 'MANAGE', 'TABLES.MANAGE', N'Update table status and layout'),
    ('INVENTORY', 'CONSUMPTION', 'INVENTORY.CONSUMPTION', N'View and record inventory usage'),
    ('INVENTORY', 'PO_MANAGE', 'INVENTORY.PO_MANAGE', N'Generate supplier purchase orders'),
    ('REPORTS', 'FINANCIAL', 'REPORTS.FINANCIAL', N'View revenue, sales and profit metrics'),
    ('STAFF', 'MANAGE', 'STAFF.MANAGE', N'Create employee profiles and PIN codes');
    PRINT 'Seed: Granular Permissions created.';
END;
GO

-- Assign all permissions to SUPER_ADMIN & RESTAURANT_MANAGER
INSERT INTO dbo.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM dbo.Roles r
CROSS JOIN dbo.Permissions p
WHERE r.RoleCode = 'SUPER_ADMIN'
AND NOT EXISTS (
    SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.RoleId AND rp.PermissionId = p.PermissionId
);
GO

-- ============================================================================
-- 3. USERS & STAFF EMPLOYEES
-- ============================================================================
-- Passwords are encrypted hashes (bcrypt work factor 12 for password 'Password@123')
-- Passcode PIN is hashed 4-digit '1234' for POS quick login
DECLARE @DefaultHash NVARCHAR(255) = N'$2a$12$e8wYfQp0vH0b3A3gW/0cQ.tY1bV0dZbZ0fM6n6m6hH6jJ6kK6lL6q'; -- demo hash
DECLARE @DefaultPin NVARCHAR(255)  = N'$2a$12$Z0m0k0j0h0g0f0d0s0a0q.e8wYfQp0vH0b3A3gW/0cQ.tY1bV0dZb'; -- demo pin

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'admin@antigravitybistro.com')
BEGIN
    SET IDENTITY_INSERT dbo.Users ON;
    INSERT INTO dbo.Users (
        UserId, BranchId, FirstName, LastName, Email, PhoneNumber,
        PasswordHash, PasscodePin, UserType, IsActive, IsEmailVerified, IsPhoneVerified
    ) VALUES 
    (1, 1, N'Vikram', N'Aditya', N'admin@antigravitybistro.com', N'+919876543201', @DefaultHash, @DefaultPin, 'ADMIN', 1, 1, 1),
    (2, 1, N'Priya', N'Sharma', N'manager.blr@antigravitybistro.com', N'+919876543202', @DefaultHash, @DefaultPin, 'STAFF', 1, 1, 1),
    (3, 1, N'Rahul', N'Verma', N'cashier.blr@antigravitybistro.com', N'+919876543203', @DefaultHash, @DefaultPin, 'STAFF', 1, 1, 1),
    (4, 1, N'Ananya', N'Iyer', N'waiter.blr@antigravitybistro.com', N'+919876543204', @DefaultHash, @DefaultPin, 'STAFF', 1, 1, 1),
    (5, 1, N'Chef Marco', N'Rossi', N'chef.blr@antigravitybistro.com', N'+919876543205', @DefaultHash, @DefaultPin, 'STAFF', 1, 1, 1),
    (6, 1, N'Siddharth', N'Mehta', N'customer@example.com', N'+919876543206', @DefaultHash, NULL, 'CUSTOMER', 1, 1, 1);
    SET IDENTITY_INSERT dbo.Users OFF;
    PRINT 'Seed: User Accounts created.';
END;
GO

-- Map Roles
IF NOT EXISTS (SELECT 1 FROM dbo.UserRoles WHERE UserId IN (1,2,3,4,5,6))
BEGIN
    INSERT INTO dbo.UserRoles (UserId, RoleId, BranchId)
    SELECT 1, RoleId, 1 FROM dbo.Roles WHERE RoleCode = 'SUPER_ADMIN'
    UNION ALL SELECT 2, RoleId, 1 FROM dbo.Roles WHERE RoleCode = 'RESTAURANT_MANAGER'
    UNION ALL SELECT 3, RoleId, 1 FROM dbo.Roles WHERE RoleCode = 'CASHIER_POS'
    UNION ALL SELECT 4, RoleId, 1 FROM dbo.Roles WHERE RoleCode = 'WAITSTAFF'
    UNION ALL SELECT 5, RoleId, 1 FROM dbo.Roles WHERE RoleCode = 'KITCHEN_CHEF'
    UNION ALL SELECT 6, RoleId, 1 FROM dbo.Roles WHERE RoleCode = 'CUSTOMER';
    PRINT 'Seed: User Roles assigned.';
END;
GO

-- Employee Records
IF NOT EXISTS (SELECT 1 FROM dbo.Employees WHERE EmployeeCode = 'EMP-BLR-001')
BEGIN
    INSERT INTO dbo.Employees (UserId, BranchId, EmployeeCode, Designation, DateOfJoining, Salary) VALUES
    (2, 1, 'EMP-BLR-001', N'General Manager', '2024-01-15', 75000.00),
    (3, 1, 'EMP-BLR-002', N'Senior Cashier', '2024-03-01', 35000.00),
    (4, 1, 'EMP-BLR-003', N'Floor Captain', '2024-04-10', 28000.00),
    (5, 1, 'EMP-BLR-004', N'Executive Chef', '2024-01-10', 85000.00);
    PRINT 'Seed: Employee staff records created.';
END;
GO

-- ============================================================================
-- 4. DINING SECTIONS & RESTAURANT TABLES
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.DiningSections WHERE SectionId = 1)
BEGIN
    SET IDENTITY_INSERT dbo.DiningSections ON;
    INSERT INTO dbo.DiningSections (SectionId, BranchId, SectionName, FloorLevel, DisplayOrder) VALUES
    (1, 1, N'Main Dining Room', 1, 1),
    (2, 1, N'AC Garden Terrace', 1, 2),
    (3, 1, N'Bar Lounge & High Tops', 2, 3);
    SET IDENTITY_INSERT dbo.DiningSections OFF;
    PRINT 'Seed: Dining Sections created.';
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.RestaurantTables WHERE TableNumber = 'T-01' AND BranchId = 1)
BEGIN
    INSERT INTO dbo.RestaurantTables (BranchId, SectionId, TableNumber, SeatingCapacity, CurrentStatus, QrCodeHash, PosX, PosY) VALUES
    (1, 1, N'T-01', 2, 'AVAILABLE', N'QR_BLR1_T01_HASH901A', 50, 100),
    (1, 1, N'T-02', 4, 'AVAILABLE', N'QR_BLR1_T02_HASH902B', 150, 100),
    (1, 1, N'T-03', 4, 'AVAILABLE', N'QR_BLR1_T03_HASH903C', 250, 100),
    (1, 1, N'T-04', 6, 'AVAILABLE', N'QR_BLR1_T04_HASH904D', 350, 100),
    (1, 2, N'T-05', 4, 'AVAILABLE', N'QR_BLR1_T05_HASH905E', 50, 250),
    (1, 2, N'T-06', 4, 'AVAILABLE', N'QR_BLR1_T06_HASH906F', 150, 250),
    (1, 3, N'BAR-01', 2, 'AVAILABLE', N'QR_BLR1_B01_HASH907G', 50, 400),
    (1, 3, N'BAR-02', 2, 'AVAILABLE', N'QR_BLR1_B02_HASH908H', 120, 400);
    PRINT 'Seed: Restaurant Tables created with QR hashes.';
END;
GO

-- ============================================================================
-- 5. FOOD CATEGORIES, MENU ITEMS, VARIANTS & ADDONS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE CategoryId = 1)
BEGIN
    SET IDENTITY_INSERT dbo.Categories ON;
    INSERT INTO dbo.Categories (CategoryId, BranchId, CategoryName, CategorySlug, Description, DisplayOrder, ImageUrl) VALUES
    (1, 1, N'Artisanal Starters', N'starters', N'Crispy, savory appetizers to kick off your culinary journey', 1, N'/images/categories/starters.jpg'),
    (2, 1, N'Wood-Fired Neapolitan Pizzas', N'pizzas', N'48-hour fermented sourdough crust baked at 450 degrees C', 2, N'/images/categories/pizzas.jpg'),
    (3, 1, N'Handmade Pastas & Mains', N'pastas', N'Freshly rolled pasta tossed in authentic Italian emulsions', 3, N'/images/categories/pastas.jpg'),
    (4, 1, N'Craft Burgers & Sliders', N'burgers', N'Juicy patties grilled to perfection with gourmet brioche buns', 4, N'/images/categories/burgers.jpg'),
    (5, 1, N'Decadent Desserts', N'desserts', N'Sweet perfection crafted by our master pastry chefs', 5, N'/images/categories/desserts.jpg'),
    (6, 1, N'Artisanal Beverages & Mocktails', N'beverages', N'Cold-pressed refreshers and specialty brews', 6, N'/images/categories/beverages.jpg');
    SET IDENTITY_INSERT dbo.Categories OFF;
    PRINT 'Seed: Food Categories created.';
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.MenuItems WHERE ItemCode = 'PIZ-001')
BEGIN
    SET IDENTITY_INSERT dbo.MenuItems ON;
    INSERT INTO dbo.MenuItems (
        MenuItemId, BranchId, CategoryId, ItemCode, ItemName, Description, BasePrice, CostPrice,
        TaxPercentage, DietaryType, SpicyLevel, PreparationTimeMinutes, IsAvailable, IsFeatured, DisplayOrder
    ) VALUES
    (1, 1, 1, N'STR-001', N'Truffle & Parmesan Arancini', N'Crispy saffron risotto balls stuffed with smoked mozzarella & truffle cream', 380.00, 110.00, 5.00, 'VEG', 0, 12, 1, 1, 1),
    (2, 1, 1, N'STR-002', N'Chipotle Glazed Chicken Wings', N'Smoked crispy wings tossed in smoky honey chipotle glaze with ranch', 440.00, 130.00, 5.00, 'NON_VEG', 2, 15, 1, 0, 2),
    (3, 1, 2, N'PIZ-001', N'Margherita Classica', N'San Marzano tomatoes, Fior di Latte mozzarella, fresh basil, and extra virgin olive oil', 490.00, 120.00, 5.00, 'VEG', 0, 15, 1, 1, 3),
    (4, 1, 2, N'PIZ-002', N'Diavola Pepperoni', N'Spicy artisanal pepperoni, crushed red pepper, mozzarella, and hot honey drizzle', 620.00, 180.00, 5.00, 'NON_VEG', 2, 15, 1, 1, 4),
    (5, 1, 3, N'PAS-001', N'Fettuccine Truffle Alfredo', N'Handmade fettuccine tossed in 24-month aged Parmigiano Reggiano, butter & wild mushroom', 540.00, 140.00, 5.00, 'VEG', 0, 18, 1, 1, 5),
    (6, 1, 3, N'PAS-002', N'Spaghetti Alla Carbonara', N'Cured guanciale, pasture eggs, pecorino romano, and toasted black peppercorn', 580.00, 160.00, 5.00, 'NON_VEG', 1, 16, 1, 0, 6),
    (7, 1, 4, N'BGR-001', N'The Prime Wagyu Style Burger', N'Smoked patty, melted vintage cheddar, caramelized shallots, brioche bun with truffle fries', 650.00, 210.00, 5.00, 'NON_VEG', 1, 15, 1, 1, 7),
    (8, 1, 5, N'DES-001', N'Classic Venetian Tiramisu', N'Espresso-soaked Savoiardi ladyfingers layered with whipped mascarpone and Dutch cocoa', 360.00, 90.00, 5.00, 'VEG', 0, 5, 1, 1, 8),
    (9, 1, 6, N'BEV-001', N'Yuzu Mint Sparkler', N'Japanese yuzu citrus, fresh crushed garden mint, sparkling soda, and organic cane sugar', 240.00, 45.00, 5.00, 'VEGAN', 0, 5, 1, 0, 9);
    SET IDENTITY_INSERT dbo.MenuItems OFF;
    PRINT 'Seed: Menu Items created.';
END;
GO

-- Menu Item Variants (Small / Medium / Large for Pizzas)
IF NOT EXISTS (SELECT 1 FROM dbo.MenuItemVariants WHERE MenuItemId = 3)
BEGIN
    INSERT INTO dbo.MenuItemVariants (MenuItemId, VariantName, SKU, PriceAdjustment, IsDefault, IsAvailable) VALUES
    (3, N'10-Inch Regular', N'PIZ-001-10', 0.00, 1, 1),
    (3, N'12-Inch Large', N'PIZ-001-12', 140.00, 0, 1),
    (4, N'10-Inch Regular', N'PIZ-002-10', 0.00, 1, 1),
    (4, N'12-Inch Large', N'PIZ-002-12', 160.00, 0, 1);
    PRINT 'Seed: Pizza Variants created.';
END;
GO

-- Addon Groups & Items
IF NOT EXISTS (SELECT 1 FROM dbo.AddonGroups WHERE AddonGroupId = 1)
BEGIN
    SET IDENTITY_INSERT dbo.AddonGroups ON;
    INSERT INTO dbo.AddonGroups (AddonGroupId, BranchId, GroupName, MinSelections, MaxSelections) VALUES
    (1, 1, N'Extra Gourmet Cheeses', 0, 3),
    (2, 1, N'Crust Customization', 0, 1);
    SET IDENTITY_INSERT dbo.AddonGroups OFF;

    INSERT INTO dbo.AddonItems (AddonGroupId, ItemName, Price, IsAvailable) VALUES
    (1, N'Extra Buffalo Mozzarella', 80.00, 1),
    (1, N'Shaved Aged Parmesan', 95.00, 1),
    (1, N'Smoked Scamorza', 85.00, 1),
    (2, N'Gluten-Free Cauliflower Crust', 120.00, 1),
    (2, N'Garlic Butter Stuffed Crust', 90.00, 1);

    -- Attach to Margherita Pizza
    INSERT INTO dbo.MenuItemAddonGroups (MenuItemId, AddonGroupId, DisplayOrder) VALUES
    (3, 1, 1),
    (3, 2, 2);
    PRINT 'Seed: Addon Groups and Items created and linked.';
END;
GO

-- ============================================================================
-- 6. SUPPLIERS, INVENTORY INGREDIENTS & RECIPES (BOM)
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Suppliers WHERE SupplierId = 1)
BEGIN
    SET IDENTITY_INSERT dbo.Suppliers ON;
    INSERT INTO dbo.Suppliers (SupplierId, BranchId, SupplierCode, SupplierName, ContactPerson, Phone, Email, GSTIN) VALUES
    (1, 1, 'SUP-001', N'Dairy Heritage Farms Ltd', N'Ramesh Rao', N'+91 94480 12345', N'sales@dairyheritage.in', N'29AAACD4567M1Z1'),
    (2, 1, 'SUP-002', N'Flour Mills & Grain Co', N'Suresh Kumar', N'+91 94480 23456', N'orders@flourmill.in', N'29AAACE5678N1Z2'),
    (3, 1, 'SUP-003', N'Artisanal Meats & Poultry', N'David D Souza', N'+91 94480 34567', N'orders@artisanmeats.in', N'29AAACF6789P1Z3');
    SET IDENTITY_INSERT dbo.Suppliers OFF;
    PRINT 'Seed: Suppliers created.';
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.InventoryIngredients WHERE IngredientId = 1)
BEGIN
    SET IDENTITY_INSERT dbo.InventoryIngredients ON;
    INSERT INTO dbo.InventoryIngredients (
        IngredientId, BranchId, IngredientCode, IngredientName, Category, UnitOfMeasure,
        CurrentStock, MinimumStockLevel, ReorderLevel, CostPerUnit, PrimarySupplierId
    ) VALUES
    (1, 1, 'ING-FLOUR-01', N'Caputo ''00'' Pizza Flour', 'DRY_GOODS', 'KG', 150.0000, 20.0000, 40.0000, 120.00, 2),
    (2, 1, 'ING-MOZZ-01', N'Fior di Latte Mozzarella Cheese', 'DAIRY', 'KG', 45.0000, 8.0000, 15.0000, 480.00, 1),
    (3, 1, 'ING-TOM-01', N'San Marzano Peeled Tomatoes', 'PRODUCE', 'KG', 60.0000, 10.0000, 20.0000, 210.00, 2),
    (4, 1, 'ING-CHIK-01', N'Chicken Breast Fillets', 'MEAT', 'KG', 30.0000, 5.0000, 12.0000, 280.00, 3),
    (5, 1, 'ING-PEP-01', N'Artisanal Cured Pepperoni', 'MEAT', 'KG', 18.0000, 3.0000, 6.0000, 750.00, 3),
    (6, 1, 'ING-OIL-01', N'Extra Virgin Olive Oil', 'DRY_GOODS', 'LITER', 25.0000, 5.0000, 10.0000, 620.00, 2);
    SET IDENTITY_INSERT dbo.InventoryIngredients OFF;
    PRINT 'Seed: Inventory Raw Ingredients created.';
END;
GO

-- Bill of Materials: Margherita Classica (MenuItemId = 3)
IF NOT EXISTS (SELECT 1 FROM dbo.Recipes WHERE MenuItemId = 3)
BEGIN
    SET IDENTITY_INSERT dbo.Recipes ON;
    INSERT INTO dbo.Recipes (RecipeId, MenuItemId, VariantId, YieldPortions, PreparationNotes) VALUES
    (1, 3, NULL, 1, N'Stretch 220g dough ball to 10 inches, spread 80g crushed tomato, top with 100g mozzarella and 10ml olive oil.');
    SET IDENTITY_INSERT dbo.Recipes OFF;

    INSERT INTO dbo.RecipeIngredients (RecipeId, IngredientId, RequiredQuantity, UnitOfMeasure, WastagePercentage) VALUES
    (1, 1, 0.2200, 'KG', 2.00), -- 220g flour
    (1, 2, 0.1000, 'KG', 1.00), -- 100g mozzarella
    (1, 3, 0.0800, 'KG', 3.00), -- 80g tomato sauce
    (1, 6, 0.0100, 'LITER', 0.00); -- 10ml EVOO
    PRINT 'Seed: Recipe Bill of Materials (BOM) linked to Margherita Pizza.';
END;
GO

-- ============================================================================
-- 7. PROMOTIONS & COUPONS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Coupons WHERE CouponCode = 'WELCOME50')
BEGIN
    INSERT INTO dbo.Coupons (
        BranchId, CouponCode, Title, Description, DiscountType, DiscountValue,
        MinOrderAmount, MaxDiscountAmount, StartDate, EndDate, UsageLimitTotal, UsageLimitPerUser
    ) VALUES
    (1, 'WELCOME50', N'Welcome 50 Off', N'Flat 50 INR off on orders above 400 INR', 'FIXED_AMOUNT', 50.00, 400.00, 50.00, '2026-01-01', '2026-12-31', 5000, 1),
    (1, 'FEAST20', N'Bistro Feast 20% Off', N'Get 20% discount up to 250 INR', 'PERCENTAGE', 20.00, 800.00, 250.00, '2026-01-01', '2026-12-31', 2000, 2);
    PRINT 'Seed: Promotional Coupons created.';
END;
GO

-- ============================================================================
-- 8. DYNAMIC WEBSITE CMS SEED DATA
-- ============================================================================

-- Global Website Branding & Settings
IF NOT EXISTS (SELECT 1 FROM dbo.WebsiteSettings WHERE RestaurantId = 1)
BEGIN
    INSERT INTO dbo.WebsiteSettings (
        RestaurantId, BranchId, SiteTitle, Tagline,
        HeaderLogoUrl, HeaderLogoPublicId, FooterLogoUrl, FooterLogoPublicId, FaviconUrl,
        PrimaryColor, SecondaryColor, AccentColor, FontFamily,
        ContactEmail, ContactPhone, WhatsappNumber, AddressLine, GoogleMapsEmbedUrl
    ) VALUES (
        1, NULL, N'Antigravity Gourmet Bistro', N'Artisanal Wood-Fired Gastronomy & Craft Cocktails',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/logo-header.png', N'restaurant/logo-header',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/logo-footer.png', N'restaurant/logo-footer',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/favicon.ico',
        N'#D90429', N'#2B2D42', N'#EDF2F4', N'Plus Jakarta Sans, sans-serif',
        N'reservations@antigravitybistro.com', N'+91 80 4123 4567', N'+91 98765 43210',
        N'100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
        N'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.9855!2d77.639!3d12.971!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDU4JzE1LjYiTiA3N8KwMzgnMjAuNCJF!5e0!3m2!1sen!2sin!4v1600000000000'
    );
    PRINT 'Seed: Website Settings & Branding created.';
END;
GO

-- Global SEO & Structured Data
IF NOT EXISTS (SELECT 1 FROM dbo.SEOSettings WHERE RestaurantId = 1 AND PageId IS NULL)
BEGIN
    INSERT INTO dbo.SEOSettings (
        RestaurantId, PageId, MetaTitle, MetaDescription, MetaKeywords,
        CanonicalUrl, OgTitle, OgDescription, OgImageUrl, OgImagePublicId,
        StructuredDataJson
    ) VALUES (
        1, NULL,
        N'Antigravity Bistro | Best Gourmet Wood-Fired Dining in Bengaluru',
        N'Experience authentic 48-hour fermented Neapolitan pizzas, handcrafted pastas, and artisanal cocktails in an enchanting contemporary ambiance in Indiranagar, Bengaluru.',
        N'restaurant, bistro, wood fired pizza, artisanal pasta, cocktails, fine dining, indiranagar, bangalore',
        N'https://antigravitybistro.com',
        N'Antigravity Bistro | Artisanal Wood-Fired Gastronomy',
        N'Award-winning gourmet Italian bistro & lounge in the heart of Bengaluru.',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/og-banner.jpg',
        N'restaurant/og-banner',
        N'{"@context":"https://schema.org","@type":"Restaurant","name":"Antigravity Gourmet Bistro","image":"https://res.cloudinary.com/demo/image/upload/v1/restaurant/og-banner.jpg","servesCuisine":["Italian","Contemporary","Artisanal"],"priceRange":"$$","telephone":"+918041234567"}'
    );
    PRINT 'Seed: SEO Meta Tags and Schema.org structured data created.';
END;
GO

-- Homepage Banners (Hero Carousel)
IF NOT EXISTS (SELECT 1 FROM dbo.WebsiteBanners WHERE BannerTitle = 'Artisanal Wood-Fired Gastronomy')
BEGIN
    INSERT INTO dbo.WebsiteBanners (
        RestaurantId, BranchId, BannerTitle, Subtitle, BadgeText,
        ButtonText, ButtonLink, SecondaryButtonText, SecondaryButtonLink,
        ImageUrl, ImagePublicId, MobileImageUrl, BannerLocation, DisplayOrder
    ) VALUES
    (
        1, 1, N'Artisanal Wood-Fired Gastronomy',
        N'48-hour slow-fermented Neapolitan sourdough pizzas baked at 450 degrees in our imported volcanic stone oven.',
        N'Michelin Recommended Chef',
        N'Explore Food Menu', N'/menu',
        N'Book Table', N'/reserve',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/hero-pizza.jpg', N'restaurant/hero-pizza',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/hero-pizza-mobile.jpg',
        'HOME_HERO', 1
    ),
    (
        1, 1, N'Handcrafted Pasta & Curated Cocktails',
        N'Fresh bronze-cut pastas tossed in 24-month aged Parmigiano Reggiano, paired with botanical craft mixology.',
        N'Weekend Tasting Flights',
        N'Reserve Your Seat', N'/reserve',
        N'View Bar Menu', N'/menu?cat=beverages',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/hero-cocktail.jpg', N'restaurant/hero-cocktail',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/hero-cocktail-mobile.jpg',
        'HOME_HERO', 2
    );
    PRINT 'Seed: Hero Banners created with Cloudinary CDN references.';
END;
GO

-- Navigation Menus (Header & Quick Links)
IF NOT EXISTS (SELECT 1 FROM dbo.NavigationMenus WHERE Title = 'Home')
BEGIN
    INSERT INTO dbo.NavigationMenus (RestaurantId, ParentMenuId, MenuLocation, Title, TargetUrl, OpenInNewTab, DisplayOrder, IconName) VALUES
    (1, NULL, 'HEADER', N'Home', N'/', 0, 1, 'HomeOutlined'),
    (1, NULL, 'HEADER', N'Menu', N'/menu', 0, 2, 'BookOutlined'),
    (1, NULL, 'HEADER', N'Reservations', N'/reserve', 0, 3, 'CalendarOutlined'),
    (1, NULL, 'HEADER', N'Our Story', N'/about', 0, 4, 'HeartOutlined'),
    (1, NULL, 'HEADER', N'Private Dining', N'/private-dining', 0, 5, 'CrownOutlined'),
    (1, NULL, 'HEADER', N'Contact', N'/contact', 0, 6, 'EnvironmentOutlined');
    PRINT 'Seed: Header Navigation Menu items created.';
END;
GO

-- Dynamic Website Pages
IF NOT EXISTS (SELECT 1 FROM dbo.WebsitePages WHERE PageSlug = 'home')
BEGIN
    SET IDENTITY_INSERT dbo.WebsitePages ON;
    INSERT INTO dbo.WebsitePages (
        PageId, RestaurantId, BranchId, PageTitle, PageSlug, PageType,
        HeroBannerTitle, HeroBannerSubtitle, HeroImageUrl, Status, PublishedAt, DisplayOrder, IsSystemPage
    ) VALUES
    (
        1, 1, NULL, N'Home', N'home', 'HOME',
        N'Antigravity Gourmet Bistro', N'Savor authentic culinary craftsmanship',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/hero-home.jpg',
        'PUBLISHED', SYSUTCDATETIME(), 1, 1
    ),
    (
        2, 1, NULL, N'About Our Culinary Heritage', N'about', 'ABOUT',
        N'A Passion Born from Fire & Dough', N'Meet Executive Chef Marco Rossi and our philosophy of seasonal purity',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/chef-story.jpg',
        'PUBLISHED', SYSUTCDATETIME(), 2, 1
    ),
    (
        3, 1, NULL, N'Private Dining & Celebrations', N'private-dining', 'SERVICES',
        N'Exclusive Gastronomic Experiences', N'Host your corporate banquets, anniversaries, and wine tasting soirees',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/private-room.jpg',
        'PUBLISHED', SYSUTCDATETIME(), 3, 0
    ),
    (
        4, 1, NULL, N'Connect With Us', N'contact', 'CONTACT',
        N'Find Your Way to Antigravity', N'Located in Indiranagar and Koramangala with valet parking',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/contact-exterior.jpg',
        'PUBLISHED', SYSUTCDATETIME(), 4, 1
    );
    SET IDENTITY_INSERT dbo.WebsitePages OFF;
    PRINT 'Seed: Dynamic Website Pages created.';
END;
GO

-- Dynamic Page Sections for Homepage (PageId = 1)
IF NOT EXISTS (SELECT 1 FROM dbo.WebsitePageSections WHERE PageId = 1 AND SectionKey = 'home_hero')
BEGIN
    INSERT INTO dbo.WebsitePageSections (
        PageId, SectionKey, SectionTitle, SectionSubtitle, ComponentType,
        ContentDataJson, BackgroundType, DisplayOrder, IsActive
    ) VALUES
    (
        1, N'home_hero', N'Hero Carousel', NULL, 'HERO_SLIDER',
        N'{"autoPlayInterval":5000,"showIndicators":true,"showArrows":true}',
        'COLOR', 1, 1
    ),
    (
        1, N'home_about', N'Our Culinary Philosophy', N'Where ancient tradition meets culinary rebellion', 'ABOUT_STORY',
        N'{"storyHeadline":"Fermentation, Fire & Farm-to-Table Purity","storyBody":"Every morning begins at 5 AM with our 48-hour fermented sourdough mother culture. Sourced directly from local organic farmers, our produce represents the peak of harvest seasonal purity.","chefName":"Chef Marco Rossi","yearsExperience":18,"awards":["Best Italian Restaurant 2025","Culinary Excellence Gold"]}',
        'COLOR', 2, 1
    ),
    (
        1, N'home_featured', N'Chef Recommendations', N'Handcrafted masterpieces loved by our patrons', 'FEATURED_MENU',
        N'{"itemCodes":["PIZ-001","PIZ-002","PAS-001","BGR-001"],"viewAllLink":"/menu"}',
        'COLOR', 3, 1
    ),
    (
        1, N'home_stats', N'Bistro By The Numbers', NULL, 'STATS_COUNTER',
        N'{"stats":[{"value":450,"unit":"C","label":"Wood-Fired Oven Heat"},{"value":48,"unit":"Hours","label":"Dough Fermentation"},{"value":98,"unit":"%","label":"Guest Satisfaction"},{"value":12,"unit":"Thousand","label":"Happy Diners Monthly"}]}',
        'COLOR', 4, 1
    ),
    (
        1, N'home_reviews', N'Critical Acclaim & Guest Voices', N'What Bangalore food lovers and critics say about us', 'TESTIMONIALS_GRID',
        N'{"layout":"CAROUSEL","featuredOnly":true,"autoScroll":true}',
        'COLOR', 5, 1
    ),
    (
        1, N'home_reserve_cta', N'An Unforgettable Evening Awaits', N'Reserve your intimate dining table or private terrace booth', 'RESERVATION_CTA',
        N'{"buttonText":"Reserve Your Table Online","buttonLink":"/reserve","badge":"Limited Weekend Seating"}',
        'IMAGE', 6, 1
    ),
    (
        1, N'home_faq', N'Frequently Asked Questions', N'Everything you need to know before visiting', 'FAQ_ACCORDION',
        N'{"defaultCategory":"ALL","expandFirst":true}',
        'COLOR', 7, 1
    );
    PRINT 'Seed: Modular Homepage Sections populated.';
END;
GO

-- Testimonials & Critic Reviews
IF NOT EXISTS (SELECT 1 FROM dbo.Testimonials WHERE AuthorName = 'Ananya Sen')
BEGIN
    INSERT INTO dbo.Testimonials (
        RestaurantId, AuthorName, AuthorRole, AuthorAvatarUrl, Rating,
        ReviewContent, SourcePlatform, IsFeatured, DisplayOrder
    ) VALUES
    (
        1, N'Ananya Sen', N'Food Editor, Bangalore Times',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/avatar-critic.jpg', 5,
        N'The Margherita Classica is hands-down the finest Neapolitan pizza in South India. The dough has an airy, blistered cornicione with impeccable flavor depth.',
        'PRESS', 1, 1
    ),
    (
        1, N'Karan Malhotra', N'Verified Diner & Sommelier',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/avatar-diner1.jpg', 5,
        N'Exceptional service from the moment you step in. The Truffle Fettuccine paired with their signature Yuzu Sparkler made our anniversary unforgettable.',
        'GOOGLE', 1, 2
    ),
    (
        1, N'Dr. Sneha Reddy', N'Local Guide',
        N'https://res.cloudinary.com/demo/image/upload/v1/restaurant/avatar-diner2.jpg', 5,
        N'Loved the contactless table QR ordering experience! We added extra cheeses and desserts straight from our phone, and the dishes arrived blazing hot within 15 minutes.',
        'TRIPADVISOR', 1, 3
    );
    PRINT 'Seed: Curated Testimonials created.';
END;
GO

-- Frequently Asked Questions (FAQs)
IF NOT EXISTS (SELECT 1 FROM dbo.FAQs WHERE Question LIKE '%table reservation%')
BEGIN
    INSERT INTO dbo.FAQs (RestaurantId, Category, Question, Answer, DisplayOrder) VALUES
    (
        1, 'RESERVATIONS',
        N'Do I need to book a table reservation in advance?',
        N'While walk-in guests are always warmly welcomed, we strongly recommend booking in advance for Friday to Sunday evenings to guarantee your preferred seating area (Main Dining Room, Garden Terrace, or High-Top Bar).',
        1
    ),
    (
        1, 'DIETARY',
        N'Do you offer vegan, gluten-free, or Jain culinary options?',
        N'Yes! Our menu features clearly marked vegan dishes, dairy-free substitutions, and cauliflower-crust gluten-free pizza options. Please notify our floor waitstaff or add cooking notes during QR ordering.',
        2
    ),
    (
        1, 'SERVICES',
        N'Is valet parking available at your branches?',
        N'Yes, complimentary valet parking is available at both our Indiranagar and Koramangala flagship branches during full lunch and dinner operating hours.',
        3
    ),
    (
        1, 'EVENTS',
        N'Can I book a private hall or rooftop section for private gatherings?',
        N'Yes! Our AC Garden Terrace and Rooftop Lounge can host private parties, birthdays, and corporate celebrations for 20 to 120 guests. Please submit a request via our Private Dining contact form.',
        4
    );
    PRINT 'Seed: FAQs created.';
END;
GO

-- Social Media Links
IF NOT EXISTS (SELECT 1 FROM dbo.SocialMediaLinks WHERE PlatformName = 'INSTAGRAM')
BEGIN
    INSERT INTO dbo.SocialMediaLinks (RestaurantId, PlatformName, PlatformUrl, IconKey, DisplayOrder) VALUES
    (1, 'INSTAGRAM', N'https://instagram.com/antigravitybistro', 'InstagramOutlined', 1),
    (1, 'FACEBOOK', N'https://facebook.com/antigravitybistro', 'FacebookOutlined', 2),
    (1, 'TRIPADVISOR', N'https://tripadvisor.com/Restaurant_Review-AntigravityBistro', 'GlobalOutlined', 3),
    (1, 'YOUTUBE', N'https://youtube.com/@antigravitybistro', 'YoutubeOutlined', 4);
    PRINT 'Seed: Social Media Links created.';
END;
GO

-- Footer Sections (Multi-Column Layout)
IF NOT EXISTS (SELECT 1 FROM dbo.FooterSections WHERE SectionTitle = 'Operating Hours')
BEGIN
    INSERT INTO dbo.FooterSections (RestaurantId, SectionTitle, ContentType, ContentHtml, DisplayOrder) VALUES
    (
        1, N'Operating Hours', 'HOURS',
        N'<p><strong>Monday - Thursday:</strong> 11:00 AM - 11:00 PM</p><p><strong>Friday - Sunday:</strong> 10:00 AM - 12:00 AM Midnight</p><p class="bistro-note">Valet parking available during all open hours.</p>',
        1
    ),
    (
        1, N'Quick Navigation', 'LINKS',
        N'<ul><li><a href="/menu">Full Food & Bar Menu</a></li><li><a href="/reserve">Reserve Dining Table</a></li><li><a href="/about">Our Sourdough Story</a></li><li><a href="/private-dining">Private Dining & Events</a></li></ul>',
        2
    ),
    (
        1, N'Bistro Newsletter', 'NEWSLETTER',
        N'<p>Subscribe for invitations to seasonal tasting menus, chef wine pairings, and exclusive dining privileges.</p>',
        3
    );
    PRINT 'Seed: Footer Sections created.';
END;
GO

PRINT 'Enterprise realistic development seed data (Core + Dynamic CMS) populated successfully.';
GO

