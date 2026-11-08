-- ============================================================================
-- Script: 04_CreateIndexes.sql
-- Description: Creates performance-optimized non-clustered and filtered indexes
--              across all 44 tables for sub-millisecond query execution.
--              Includes FK coverage, status lookups, and soft-delete filters.
-- Database: RestaurantManagementDB
-- Engine: Microsoft SQL Server 2019 / 2022
-- Author: Senior SQL Server Database Architect
-- Date: 2026-11-08
-- ============================================================================

USE RestaurantManagementDB;
GO

-- ============================================================================
-- 1. USERS, EMPLOYEES & ADDRESSES
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_Email_Active')
    CREATE NONCLUSTERED INDEX IX_Users_Email_Active
    ON dbo.Users(Email)
    WHERE IsDeleted = 0 AND Email IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_Phone_Active')
    CREATE NONCLUSTERED INDEX IX_Users_Phone_Active
    ON dbo.Users(PhoneNumber)
    WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_BranchId')
    CREATE NONCLUSTERED INDEX IX_Users_BranchId
    ON dbo.Users(BranchId)
    INCLUDE (FirstName, LastName, UserType, IsActive);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_Branch_Status')
    CREATE NONCLUSTERED INDEX IX_Employees_Branch_Status
    ON dbo.Employees(BranchId, EmploymentStatus)
    INCLUDE (Designation, Salary);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CustomerAddresses_UserId')
    CREATE NONCLUSTERED INDEX IX_CustomerAddresses_UserId
    ON dbo.CustomerAddresses(UserId, IsDefault)
    WHERE IsDeleted = 0;
GO

-- ============================================================================
-- 2. DINING SECTIONS, TABLES & RESERVATIONS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RestaurantTables_Branch_Status')
    CREATE NONCLUSTERED INDEX IX_RestaurantTables_Branch_Status
    ON dbo.RestaurantTables(BranchId, CurrentStatus)
    INCLUDE (TableNumber, SeatingCapacity, ActiveOrderId, SectionId)
    WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RestaurantTables_QrHash')
    CREATE NONCLUSTERED INDEX IX_RestaurantTables_QrHash
    ON dbo.RestaurantTables(QrCodeHash)
    INCLUDE (TableId, BranchId, TableNumber, CurrentStatus);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reservations_Date_Slot')
    CREATE NONCLUSTERED INDEX IX_Reservations_Date_Slot
    ON dbo.Reservations(BranchId, ReservationDate, StartTime, Status)
    INCLUDE (TableId, PartySize, GuestName, GuestPhone)
    WHERE IsDeleted = 0;
GO

-- ============================================================================
-- 3. MENU, CATEGORIES, VARIANTS & ADDONS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Categories_Branch_Display')
    CREATE NONCLUSTERED INDEX IX_Categories_Branch_Display
    ON dbo.Categories(BranchId, DisplayOrder)
    INCLUDE (CategoryName, CategorySlug, ImageUrl, IsActive)
    WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MenuItems_Category_Available')
    CREATE NONCLUSTERED INDEX IX_MenuItems_Category_Available
    ON dbo.MenuItems(CategoryId, IsAvailable, DisplayOrder)
    INCLUDE (MenuItemId, BranchId, ItemCode, ItemName, BasePrice, DietaryType)
    WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MenuItems_Branch_Featured')
    CREATE NONCLUSTERED INDEX IX_MenuItems_Branch_Featured
    ON dbo.MenuItems(BranchId, IsFeatured, IsAvailable)
    INCLUDE (ItemName, BasePrice)
    WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MenuItemVariants_MenuItemId')
    CREATE NONCLUSTERED INDEX IX_MenuItemVariants_MenuItemId
    ON dbo.MenuItemVariants(MenuItemId, IsAvailable)
    INCLUDE (VariantName, PriceAdjustment, IsDefault)
    WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AddonItems_GroupId')
    CREATE NONCLUSTERED INDEX IX_AddonItems_GroupId
    ON dbo.AddonItems(AddonGroupId, IsAvailable)
    INCLUDE (ItemName, Price)
    WHERE IsDeleted = 0;
GO

-- ============================================================================
-- 4. SHOPPING CARTS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ShoppingCarts_SessionToken')
    CREATE NONCLUSTERED INDEX IX_ShoppingCarts_SessionToken
    ON dbo.ShoppingCarts(SessionToken, ExpiresAt)
    INCLUDE (CartId, BranchId, TableId, GrandTotal);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CartItems_CartId')
    CREATE NONCLUSTERED INDEX IX_CartItems_CartId
    ON dbo.CartItems(CartId)
    INCLUDE (MenuItemId, VariantId, Quantity, UnitPrice, TotalPrice);
GO

-- ============================================================================
-- 5. ORDERS, ITEMS, KOT & AUDIT STATUS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Orders_Branch_Status_Date')
    CREATE NONCLUSTERED INDEX IX_Orders_Branch_Status_Date
    ON dbo.Orders(BranchId, OrderStatus, CreatedAt DESC)
    INCLUDE (OrderId, OrderNumber, OrderType, TableId, CustomerId, GrandTotal, PaymentStatus)
    WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Orders_Table_Active')
    CREATE NONCLUSTERED INDEX IX_Orders_Table_Active
    ON dbo.Orders(TableId, OrderStatus)
    INCLUDE (OrderId, OrderNumber, GrandTotal, PaymentStatus)
    WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Orders_Customer_History')
    CREATE NONCLUSTERED INDEX IX_Orders_Customer_History
    ON dbo.Orders(CustomerId, CreatedAt DESC)
    INCLUDE (OrderId, OrderNumber, GrandTotal, OrderStatus)
    WHERE CustomerId IS NOT NULL AND IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrderItems_OrderId')
    CREATE NONCLUSTERED INDEX IX_OrderItems_OrderId
    ON dbo.OrderItems(OrderId)
    INCLUDE (OrderItemId, MenuItemId, VariantId, ItemNameSnapshot, Quantity, ItemTotal, ItemStatus);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrderItemAddons_OrderItemId')
    CREATE NONCLUSTERED INDEX IX_OrderItemAddons_OrderItemId
    ON dbo.OrderItemAddons(OrderItemId)
    INCLUDE (AddonItemId, AddonNameSnapshot, UnitPrice, Quantity, TotalPrice);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrderStatusHistory_OrderId')
    CREATE NONCLUSTERED INDEX IX_OrderStatusHistory_OrderId
    ON dbo.OrderStatusHistory(OrderId, ChangedAt);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_KitchenOrderTickets_Active')
    CREATE NONCLUSTERED INDEX IX_KitchenOrderTickets_Active
    ON dbo.KitchenOrderTickets(BranchId, TicketStatus, CreatedAt)
    INCLUDE (KOTId, KOTNumber, OrderId, KitchenStation);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_KOTItems_KOTId')
    CREATE NONCLUSTERED INDEX IX_KOTItems_KOTId
    ON dbo.KOTItems(KOTId, PreparationStatus)
    INCLUDE (OrderItemId);
GO

-- ============================================================================
-- 6. PAYMENTS & TRANSACTIONS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Payments_OrderId')
    CREATE NONCLUSTERED INDEX IX_Payments_OrderId
    ON dbo.Payments(OrderId, PaymentStatus)
    INCLUDE (PaymentReference, Amount, PaymentMethod);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Payments_GatewayOrderId')
    CREATE NONCLUSTERED INDEX IX_Payments_GatewayOrderId
    ON dbo.Payments(GatewayOrderId)
    WHERE GatewayOrderId IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Payments_GatewayPaymentId')
    CREATE NONCLUSTERED INDEX IX_Payments_GatewayPaymentId
    ON dbo.Payments(GatewayPaymentId)
    WHERE GatewayPaymentId IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RegisterShifts_Branch_Open')
    CREATE NONCLUSTERED INDEX IX_RegisterShifts_Branch_Open
    ON dbo.RegisterShifts(BranchId, Status)
    INCLUDE (ShiftId, CashierUserId, OpenedAt, OpeningFloat)
    WHERE Status = 'OPEN';
GO

-- ============================================================================
-- 7. INVENTORY, BOM & TRANSACTIONS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InventoryIngredients_StockCheck')
    CREATE NONCLUSTERED INDEX IX_InventoryIngredients_StockCheck
    ON dbo.InventoryIngredients(BranchId, CurrentStock, ReorderLevel)
    INCLUDE (IngredientId, IngredientCode, IngredientName, UnitOfMeasure)
    WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Recipes_MenuItem_Variant')
    CREATE NONCLUSTERED INDEX IX_Recipes_MenuItem_Variant
    ON dbo.Recipes(MenuItemId, VariantId)
    INCLUDE (RecipeId, YieldPortions)
    WHERE IsActive = 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RecipeIngredients_RecipeId')
    CREATE NONCLUSTERED INDEX IX_RecipeIngredients_RecipeId
    ON dbo.RecipeIngredients(RecipeId)
    INCLUDE (IngredientId, RequiredQuantity, UnitOfMeasure);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InventoryTransactions_Ingredient_Date')
    CREATE NONCLUSTERED INDEX IX_InventoryTransactions_Ingredient_Date
    ON dbo.InventoryTransactions(IngredientId, CreatedAt DESC)
    INCLUDE (TransactionType, QuantityChanged, BalanceAfter, ReferenceOrderId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PurchaseOrders_Branch_Status')
    CREATE NONCLUSTERED INDEX IX_PurchaseOrders_Branch_Status
    ON dbo.PurchaseOrders(BranchId, Status, CreatedAt DESC)
    INCLUDE (POId, PONumber, SupplierId, GrandTotal);
GO

-- ============================================================================
-- 8. REVIEWS, NOTIFICATIONS & AUDIT LOGS
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CustomerReviews_Branch_Published')
    CREATE NONCLUSTERED INDEX IX_CustomerReviews_Branch_Published
    ON dbo.CustomerReviews(BranchId, IsPublished, CreatedAt DESC)
    INCLUDE (Rating, CustomerName, ReviewText);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Notifications_User_Unread')
    CREATE NONCLUSTERED INDEX IX_Notifications_User_Unread
    ON dbo.Notifications(UserId, IsRead, CreatedAt DESC)
    INCLUDE (Title, Message, NotificationType, TargetUrl)
    WHERE IsRead = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_Entity_Date')
    CREATE NONCLUSTERED INDEX IX_AuditLogs_Entity_Date
    ON dbo.AuditLogs(EntityName, EntityId, CreatedAt DESC)
    INCLUDE (UserId, ActionType, ActionDescription);
GO

-- ============================================================================
-- 9. WEBSITE CMS & DIGITAL PRESENCE INDEXES
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WebsiteSettings_Restaurant_Branch')
    CREATE NONCLUSTERED INDEX IX_WebsiteSettings_Restaurant_Branch
    ON dbo.WebsiteSettings(RestaurantId, BranchId)
    INCLUDE (SiteTitle, HeaderLogoUrl, PrimaryColor, ContactPhone);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WebsitePages_Slug')
    CREATE NONCLUSTERED INDEX IX_WebsitePages_Slug
    ON dbo.WebsitePages(PageSlug)
    INCLUDE (PageId, PageTitle, PageType, Status, HeroBannerTitle, HeroImageUrl)
    WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WebsitePages_Status_Display')
    CREATE NONCLUSTERED INDEX IX_WebsitePages_Status_Display
    ON dbo.WebsitePages(Status, DisplayOrder)
    INCLUDE (PageId, PageTitle, PageSlug, PageType)
    WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WebsitePageSections_Page_Display')
    CREATE NONCLUSTERED INDEX IX_WebsitePageSections_Page_Display
    ON dbo.WebsitePageSections(PageId, DisplayOrder)
    INCLUDE (SectionId, SectionKey, SectionTitle, ComponentType, BackgroundType, BackgroundImageUrl)
    WHERE IsActive = 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WebsiteBanners_Location_Display')
    CREATE NONCLUSTERED INDEX IX_WebsiteBanners_Location_Display
    ON dbo.WebsiteBanners(BannerLocation, DisplayOrder)
    INCLUDE (BannerId, BannerTitle, Subtitle, ButtonText, ButtonLink, ImageUrl, MobileImageUrl)
    WHERE IsDeleted = 0 AND IsActive = 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_NavigationMenus_Location_Display')
    CREATE NONCLUSTERED INDEX IX_NavigationMenus_Location_Display
    ON dbo.NavigationMenus(MenuLocation, DisplayOrder)
    INCLUDE (MenuId, ParentMenuId, Title, TargetUrl, OpenInNewTab, IconName)
    WHERE IsActive = 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FooterSections_Display')
    CREATE NONCLUSTERED INDEX IX_FooterSections_Display
    ON dbo.FooterSections(RestaurantId, DisplayOrder)
    INCLUDE (FooterSectionId, SectionTitle, ContentType)
    WHERE IsActive = 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FAQs_Category_Display')
    CREATE NONCLUSTERED INDEX IX_FAQs_Category_Display
    ON dbo.FAQs(Category, DisplayOrder)
    INCLUDE (FAQId, Question, Answer)
    WHERE IsDeleted = 0 AND IsActive = 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Testimonials_Featured_Display')
    CREATE NONCLUSTERED INDEX IX_Testimonials_Featured_Display
    ON dbo.Testimonials(IsFeatured, DisplayOrder)
    INCLUDE (TestimonialId, AuthorName, AuthorRole, Rating, ReviewContent, AuthorAvatarUrl)
    WHERE IsDeleted = 0 AND IsActive = 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SocialMediaLinks_Display')
    CREATE NONCLUSTERED INDEX IX_SocialMediaLinks_Display
    ON dbo.SocialMediaLinks(RestaurantId, DisplayOrder)
    INCLUDE (SocialLinkId, PlatformName, PlatformUrl, IconKey)
    WHERE IsActive = 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ContactMessages_Status_Date')
    CREATE NONCLUSTERED INDEX IX_ContactMessages_Status_Date
    ON dbo.ContactMessages(Status, CreatedAt DESC)
    INCLUDE (MessageId, SenderName, SenderEmail, SenderPhone, Subject, InquiryType)
    WHERE IsDeleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SEOSettings_PageId')
    CREATE NONCLUSTERED INDEX IX_SEOSettings_PageId
    ON dbo.SEOSettings(PageId)
    INCLUDE (SEOId, MetaTitle, MetaDescription, OgImageUrl);
GO

PRINT 'All performance indexes and filtered indexes generated successfully across Core and CMS modules.';
GO
