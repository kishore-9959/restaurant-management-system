-- ============================================================================
-- Script: 03_CreateRelationships.sql
-- Description: Establishes all Foreign Key relationships, referential integrity
--              constraints, and cascade rules across all 44 tables.
--              Carefully tuned for SQL Server to prevent multiple cascade paths.
-- Database: RestaurantManagementDB
-- Engine: Microsoft SQL Server 2019 / 2022
-- Author: Senior SQL Server Database Architect
-- Date: 2026-11-08
-- ============================================================================

USE RestaurantManagementDB;
GO

-- ============================================================================
-- 1. RESTAURANTS & BRANCHES
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Branches_Restaurants')
    ALTER TABLE dbo.Branches ADD CONSTRAINT FK_Branches_Restaurants
        FOREIGN KEY (RestaurantId) REFERENCES dbo.Restaurants(RestaurantId) ON DELETE CASCADE;
GO

-- ============================================================================
-- 2. ROLES, USERS, EMPLOYEES & PERMISSIONS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Users_Branches')
    ALTER TABLE dbo.Users ADD CONSTRAINT FK_Users_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE SET NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_RolePermissions_Roles')
    ALTER TABLE dbo.RolePermissions ADD CONSTRAINT FK_RolePermissions_Roles
        FOREIGN KEY (RoleId) REFERENCES dbo.Roles(RoleId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_RolePermissions_Permissions')
    ALTER TABLE dbo.RolePermissions ADD CONSTRAINT FK_RolePermissions_Permissions
        FOREIGN KEY (PermissionId) REFERENCES dbo.Permissions(PermissionId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserRoles_Users')
    ALTER TABLE dbo.UserRoles ADD CONSTRAINT FK_UserRoles_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserRoles_Roles')
    ALTER TABLE dbo.UserRoles ADD CONSTRAINT FK_UserRoles_Roles
        FOREIGN KEY (RoleId) REFERENCES dbo.Roles(RoleId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserRoles_Branches')
    ALTER TABLE dbo.UserRoles ADD CONSTRAINT FK_UserRoles_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Employees_Users')
    ALTER TABLE dbo.Employees ADD CONSTRAINT FK_Employees_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Employees_Branches')
    ALTER TABLE dbo.Employees ADD CONSTRAINT FK_Employees_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_CustomerAddresses_Users')
    ALTER TABLE dbo.CustomerAddresses ADD CONSTRAINT FK_CustomerAddresses_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE;
GO

-- ============================================================================
-- 3. DINING SECTIONS, TABLES & RESERVATIONS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_DiningSections_Branches')
    ALTER TABLE dbo.DiningSections ADD CONSTRAINT FK_DiningSections_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_RestaurantTables_Branches')
    ALTER TABLE dbo.RestaurantTables ADD CONSTRAINT FK_RestaurantTables_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_RestaurantTables_DiningSections')
    ALTER TABLE dbo.RestaurantTables ADD CONSTRAINT FK_RestaurantTables_DiningSections
        FOREIGN KEY (SectionId) REFERENCES dbo.DiningSections(SectionId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Reservations_Branches')
    ALTER TABLE dbo.Reservations ADD CONSTRAINT FK_Reservations_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Reservations_RestaurantTables')
    ALTER TABLE dbo.Reservations ADD CONSTRAINT FK_Reservations_RestaurantTables
        FOREIGN KEY (TableId) REFERENCES dbo.RestaurantTables(TableId) ON DELETE SET NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Reservations_Users_Customer')
    ALTER TABLE dbo.Reservations ADD CONSTRAINT FK_Reservations_Users_Customer
        FOREIGN KEY (CustomerId) REFERENCES dbo.Users(UserId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Reservations_Users_CreatedBy')
    ALTER TABLE dbo.Reservations ADD CONSTRAINT FK_Reservations_Users_CreatedBy
        FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(UserId) ON DELETE NO ACTION;
GO

-- ============================================================================
-- 4. MENU, CATEGORIES, VARIANTS & ADDONS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Categories_Branches')
    ALTER TABLE dbo.Categories ADD CONSTRAINT FK_Categories_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Categories_Parent')
    ALTER TABLE dbo.Categories ADD CONSTRAINT FK_Categories_Parent
        FOREIGN KEY (ParentCategoryId) REFERENCES dbo.Categories(CategoryId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_MenuItems_Branches')
    ALTER TABLE dbo.MenuItems ADD CONSTRAINT FK_MenuItems_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_MenuItems_Categories')
    ALTER TABLE dbo.MenuItems ADD CONSTRAINT FK_MenuItems_Categories
        FOREIGN KEY (CategoryId) REFERENCES dbo.Categories(CategoryId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_MenuItemImages_MenuItems')
    ALTER TABLE dbo.MenuItemImages ADD CONSTRAINT FK_MenuItemImages_MenuItems
        FOREIGN KEY (MenuItemId) REFERENCES dbo.MenuItems(MenuItemId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_MenuItemVariants_MenuItems')
    ALTER TABLE dbo.MenuItemVariants ADD CONSTRAINT FK_MenuItemVariants_MenuItems
        FOREIGN KEY (MenuItemId) REFERENCES dbo.MenuItems(MenuItemId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AddonGroups_Branches')
    ALTER TABLE dbo.AddonGroups ADD CONSTRAINT FK_AddonGroups_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AddonItems_AddonGroups')
    ALTER TABLE dbo.AddonItems ADD CONSTRAINT FK_AddonItems_AddonGroups
        FOREIGN KEY (AddonGroupId) REFERENCES dbo.AddonGroups(AddonGroupId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_MenuItemAddonGroups_MenuItems')
    ALTER TABLE dbo.MenuItemAddonGroups ADD CONSTRAINT FK_MenuItemAddonGroups_MenuItems
        FOREIGN KEY (MenuItemId) REFERENCES dbo.MenuItems(MenuItemId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_MenuItemAddonGroups_AddonGroups')
    ALTER TABLE dbo.MenuItemAddonGroups ADD CONSTRAINT FK_MenuItemAddonGroups_AddonGroups
        FOREIGN KEY (AddonGroupId) REFERENCES dbo.AddonGroups(AddonGroupId) ON DELETE CASCADE;
GO

-- ============================================================================
-- 5. COUPONS & COUPON USAGE
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Coupons_Branches')
    ALTER TABLE dbo.Coupons ADD CONSTRAINT FK_Coupons_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_CouponUsage_Coupons')
    ALTER TABLE dbo.CouponUsage ADD CONSTRAINT FK_CouponUsage_Coupons
        FOREIGN KEY (CouponId) REFERENCES dbo.Coupons(CouponId) ON DELETE NO ACTION;
GO

-- ============================================================================
-- 6. SHOPPING CARTS & ITEMS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ShoppingCarts_Branches')
    ALTER TABLE dbo.ShoppingCarts ADD CONSTRAINT FK_ShoppingCarts_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ShoppingCarts_RestaurantTables')
    ALTER TABLE dbo.ShoppingCarts ADD CONSTRAINT FK_ShoppingCarts_RestaurantTables
        FOREIGN KEY (TableId) REFERENCES dbo.RestaurantTables(TableId) ON DELETE SET NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ShoppingCarts_Users')
    ALTER TABLE dbo.ShoppingCarts ADD CONSTRAINT FK_ShoppingCarts_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE SET NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_CartItems_ShoppingCarts')
    ALTER TABLE dbo.CartItems ADD CONSTRAINT FK_CartItems_ShoppingCarts
        FOREIGN KEY (CartId) REFERENCES dbo.ShoppingCarts(CartId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_CartItems_MenuItems')
    ALTER TABLE dbo.CartItems ADD CONSTRAINT FK_CartItems_MenuItems
        FOREIGN KEY (MenuItemId) REFERENCES dbo.MenuItems(MenuItemId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_CartItems_MenuItemVariants')
    ALTER TABLE dbo.CartItems ADD CONSTRAINT FK_CartItems_MenuItemVariants
        FOREIGN KEY (VariantId) REFERENCES dbo.MenuItemVariants(VariantId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_CartItemAddons_CartItems')
    ALTER TABLE dbo.CartItemAddons ADD CONSTRAINT FK_CartItemAddons_CartItems
        FOREIGN KEY (CartItemId) REFERENCES dbo.CartItems(CartItemId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_CartItemAddons_AddonItems')
    ALTER TABLE dbo.CartItemAddons ADD CONSTRAINT FK_CartItemAddons_AddonItems
        FOREIGN KEY (AddonItemId) REFERENCES dbo.AddonItems(AddonItemId) ON DELETE NO ACTION;
GO

-- ============================================================================
-- 7. ORDERS, ORDER ITEMS, KOT & STATUS HISTORY
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Orders_Branches')
    ALTER TABLE dbo.Orders ADD CONSTRAINT FK_Orders_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Orders_RestaurantTables')
    ALTER TABLE dbo.Orders ADD CONSTRAINT FK_Orders_RestaurantTables
        FOREIGN KEY (TableId) REFERENCES dbo.RestaurantTables(TableId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Orders_Users_Customer')
    ALTER TABLE dbo.Orders ADD CONSTRAINT FK_Orders_Users_Customer
        FOREIGN KEY (CustomerId) REFERENCES dbo.Users(UserId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Orders_CustomerAddresses')
    ALTER TABLE dbo.Orders ADD CONSTRAINT FK_Orders_CustomerAddresses
        FOREIGN KEY (DeliveryAddressId) REFERENCES dbo.CustomerAddresses(AddressId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Orders_Users_Waitstaff')
    ALTER TABLE dbo.Orders ADD CONSTRAINT FK_Orders_Users_Waitstaff
        FOREIGN KEY (WaitstaffUserId) REFERENCES dbo.Users(UserId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Orders_Users_VoidedBy')
    ALTER TABLE dbo.Orders ADD CONSTRAINT FK_Orders_Users_VoidedBy
        FOREIGN KEY (VoidedByUserId) REFERENCES dbo.Users(UserId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_CouponUsage_Orders')
    ALTER TABLE dbo.CouponUsage ADD CONSTRAINT FK_CouponUsage_Orders
        FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_OrderItems_Orders')
    ALTER TABLE dbo.OrderItems ADD CONSTRAINT FK_OrderItems_Orders
        FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_OrderItems_MenuItems')
    ALTER TABLE dbo.OrderItems ADD CONSTRAINT FK_OrderItems_MenuItems
        FOREIGN KEY (MenuItemId) REFERENCES dbo.MenuItems(MenuItemId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_OrderItems_MenuItemVariants')
    ALTER TABLE dbo.OrderItems ADD CONSTRAINT FK_OrderItems_MenuItemVariants
        FOREIGN KEY (VariantId) REFERENCES dbo.MenuItemVariants(VariantId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_OrderItemAddons_OrderItems')
    ALTER TABLE dbo.OrderItemAddons ADD CONSTRAINT FK_OrderItemAddons_OrderItems
        FOREIGN KEY (OrderItemId) REFERENCES dbo.OrderItems(OrderItemId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_OrderItemAddons_AddonItems')
    ALTER TABLE dbo.OrderItemAddons ADD CONSTRAINT FK_OrderItemAddons_AddonItems
        FOREIGN KEY (AddonItemId) REFERENCES dbo.AddonItems(AddonItemId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_OrderStatusHistory_Orders')
    ALTER TABLE dbo.OrderStatusHistory ADD CONSTRAINT FK_OrderStatusHistory_Orders
        FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_OrderStatusHistory_Users')
    ALTER TABLE dbo.OrderStatusHistory ADD CONSTRAINT FK_OrderStatusHistory_Users
        FOREIGN KEY (ChangedByUserId) REFERENCES dbo.Users(UserId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_KitchenOrderTickets_Branches')
    ALTER TABLE dbo.KitchenOrderTickets ADD CONSTRAINT FK_KitchenOrderTickets_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_KitchenOrderTickets_Orders')
    ALTER TABLE dbo.KitchenOrderTickets ADD CONSTRAINT FK_KitchenOrderTickets_Orders
        FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_KOTItems_KitchenOrderTickets')
    ALTER TABLE dbo.KOTItems ADD CONSTRAINT FK_KOTItems_KitchenOrderTickets
        FOREIGN KEY (KOTId) REFERENCES dbo.KitchenOrderTickets(KOTId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_KOTItems_OrderItems')
    ALTER TABLE dbo.KOTItems ADD CONSTRAINT FK_KOTItems_OrderItems
        FOREIGN KEY (OrderItemId) REFERENCES dbo.OrderItems(OrderItemId) ON DELETE NO ACTION;
GO

-- ============================================================================
-- 8. PAYMENTS, TRANSACTIONS & REFUNDS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Payments_Orders')
    ALTER TABLE dbo.Payments ADD CONSTRAINT FK_Payments_Orders
        FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Payments_Branches')
    ALTER TABLE dbo.Payments ADD CONSTRAINT FK_Payments_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Payments_Users_SettledBy')
    ALTER TABLE dbo.Payments ADD CONSTRAINT FK_Payments_Users_SettledBy
        FOREIGN KEY (SettledByUserId) REFERENCES dbo.Users(UserId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PaymentTransactions_Payments')
    ALTER TABLE dbo.PaymentTransactions ADD CONSTRAINT FK_PaymentTransactions_Payments
        FOREIGN KEY (PaymentId) REFERENCES dbo.Payments(PaymentId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PaymentRefunds_Payments')
    ALTER TABLE dbo.PaymentRefunds ADD CONSTRAINT FK_PaymentRefunds_Payments
        FOREIGN KEY (PaymentId) REFERENCES dbo.Payments(PaymentId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PaymentRefunds_Users')
    ALTER TABLE dbo.PaymentRefunds ADD CONSTRAINT FK_PaymentRefunds_Users
        FOREIGN KEY (InitiatedByUserId) REFERENCES dbo.Users(UserId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_RegisterShifts_Branches')
    ALTER TABLE dbo.RegisterShifts ADD CONSTRAINT FK_RegisterShifts_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_RegisterShifts_Users')
    ALTER TABLE dbo.RegisterShifts ADD CONSTRAINT FK_RegisterShifts_Users
        FOREIGN KEY (CashierUserId) REFERENCES dbo.Users(UserId) ON DELETE NO ACTION;
GO

-- ============================================================================
-- 9. SUPPLIERS, INVENTORY, RECIPES & PURCHASE ORDERS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Suppliers_Branches')
    ALTER TABLE dbo.Suppliers ADD CONSTRAINT FK_Suppliers_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InventoryIngredients_Branches')
    ALTER TABLE dbo.InventoryIngredients ADD CONSTRAINT FK_InventoryIngredients_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InventoryIngredients_Suppliers')
    ALTER TABLE dbo.InventoryIngredients ADD CONSTRAINT FK_InventoryIngredients_Suppliers
        FOREIGN KEY (PrimarySupplierId) REFERENCES dbo.Suppliers(SupplierId) ON DELETE SET NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Recipes_MenuItems')
    ALTER TABLE dbo.Recipes ADD CONSTRAINT FK_Recipes_MenuItems
        FOREIGN KEY (MenuItemId) REFERENCES dbo.MenuItems(MenuItemId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Recipes_MenuItemVariants')
    ALTER TABLE dbo.Recipes ADD CONSTRAINT FK_Recipes_MenuItemVariants
        FOREIGN KEY (VariantId) REFERENCES dbo.MenuItemVariants(VariantId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_RecipeIngredients_Recipes')
    ALTER TABLE dbo.RecipeIngredients ADD CONSTRAINT FK_RecipeIngredients_Recipes
        FOREIGN KEY (RecipeId) REFERENCES dbo.Recipes(RecipeId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_RecipeIngredients_Inventory')
    ALTER TABLE dbo.RecipeIngredients ADD CONSTRAINT FK_RecipeIngredients_Inventory
        FOREIGN KEY (IngredientId) REFERENCES dbo.InventoryIngredients(IngredientId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InventoryTransactions_Branches')
    ALTER TABLE dbo.InventoryTransactions ADD CONSTRAINT FK_InventoryTransactions_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InventoryTransactions_Inventory')
    ALTER TABLE dbo.InventoryTransactions ADD CONSTRAINT FK_InventoryTransactions_Inventory
        FOREIGN KEY (IngredientId) REFERENCES dbo.InventoryIngredients(IngredientId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InventoryTransactions_Orders')
    ALTER TABLE dbo.InventoryTransactions ADD CONSTRAINT FK_InventoryTransactions_Orders
        FOREIGN KEY (ReferenceOrderId) REFERENCES dbo.Orders(OrderId) ON DELETE SET NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InventoryTransactions_Users')
    ALTER TABLE dbo.InventoryTransactions ADD CONSTRAINT FK_InventoryTransactions_Users
        FOREIGN KEY (RecordedByUserId) REFERENCES dbo.Users(UserId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PurchaseOrders_Branches')
    ALTER TABLE dbo.PurchaseOrders ADD CONSTRAINT FK_PurchaseOrders_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PurchaseOrders_Suppliers')
    ALTER TABLE dbo.PurchaseOrders ADD CONSTRAINT FK_PurchaseOrders_Suppliers
        FOREIGN KEY (SupplierId) REFERENCES dbo.Suppliers(SupplierId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PurchaseOrders_Users')
    ALTER TABLE dbo.PurchaseOrders ADD CONSTRAINT FK_PurchaseOrders_Users
        FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(UserId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PurchaseOrderItems_PurchaseOrders')
    ALTER TABLE dbo.PurchaseOrderItems ADD CONSTRAINT FK_PurchaseOrderItems_PurchaseOrders
        FOREIGN KEY (POId) REFERENCES dbo.PurchaseOrders(POId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PurchaseOrderItems_Inventory')
    ALTER TABLE dbo.PurchaseOrderItems ADD CONSTRAINT FK_PurchaseOrderItems_Inventory
        FOREIGN KEY (IngredientId) REFERENCES dbo.InventoryIngredients(IngredientId) ON DELETE NO ACTION;
GO

-- ============================================================================
-- 10. REVIEWS, NOTIFICATIONS & AUDIT LOGS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_CustomerReviews_Branches')
    ALTER TABLE dbo.CustomerReviews ADD CONSTRAINT FK_CustomerReviews_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_CustomerReviews_Orders')
    ALTER TABLE dbo.CustomerReviews ADD CONSTRAINT FK_CustomerReviews_Orders
        FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_CustomerReviews_Users')
    ALTER TABLE dbo.CustomerReviews ADD CONSTRAINT FK_CustomerReviews_Users
        FOREIGN KEY (CustomerId) REFERENCES dbo.Users(UserId) ON DELETE SET NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Notifications_Branches')
    ALTER TABLE dbo.Notifications ADD CONSTRAINT FK_Notifications_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Notifications_Users')
    ALTER TABLE dbo.Notifications ADD CONSTRAINT FK_Notifications_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AuditLogs_Branches')
    ALTER TABLE dbo.AuditLogs ADD CONSTRAINT FK_AuditLogs_Branches
        FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AuditLogs_Users')
    ALTER TABLE dbo.AuditLogs ADD CONSTRAINT FK_AuditLogs_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE SET NULL;
GO

PRINT 'All Foreign Key constraints and referential integrity rules established successfully.';
GO

