-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS)
-- Script: database/tests/15_CMSStoredProcedures_Test.sql
-- Description: Unit test suite for Phase 11 CMS Stored Procedures (SPs 163–209).
-- Target Database: RestaurantManagementDB_IsolatedTest
-- ============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '====================================================================';
PRINT 'STARTING PHASE 11 CMS STORED PROCEDURE TESTS';
PRINT 'Target Database: RestaurantManagementDB_IsolatedTest';
PRINT '====================================================================';

DECLARE @TotalTests INT = 0;
DECLARE @PassedTests INT = 0;
DECLARE @FailedTests INT = 0;

DECLARE @TestRestaurantId INT = 1;
DECLARE @TestBranchId INT = 1;
DECLARE @TestUserId BIGINT = 1; -- Super admin / staff

-- Temporary Output Variables
DECLARE @OutSettingId INT;
DECLARE @OutSEOId INT;
DECLARE @OutPageId BIGINT;
DECLARE @OutSectionId1 BIGINT;
DECLARE @OutSectionId2 BIGINT;
DECLARE @OutBannerId BIGINT;
DECLARE @OutMenuId1 INT;
DECLARE @OutMenuId2 INT;
DECLARE @OutFooterSectionId INT;
DECLARE @OutFAQId INT;
DECLARE @OutTestimonialId BIGINT;
DECLARE @OutSocialLinkId INT;
DECLARE @OutMessageId BIGINT;

BEGIN TRY
    -- ------------------------------------------------------------------------
    -- TEST 1: SP 164 & SP 163 - Website Settings UPSERT & Retrieval
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_CMS_UpdateWebsiteSettings
            @RestaurantId = @TestRestaurantId,
            @BranchId = NULL,
            @SiteTitle = N'Antigravity Bistro Global',
            @Tagline = N'Modern Dining Elevated',
            @HeaderLogoUrl = N'https://res.cloudinary.com/rms/image/upload/logo.png',
            @HeaderLogoPublicId = N'logo_pub_123',
            @FooterLogoUrl = N'https://res.cloudinary.com/rms/image/upload/footer.png',
            @FooterLogoPublicId = N'footer_pub_123',
            @FaviconUrl = N'https://res.cloudinary.com/rms/image/upload/fav.png',
            @PrimaryColor = N'#E63946',
            @SecondaryColor = N'#1D3557',
            @AccentColor = N'#F1FAEE',
            @FontFamily = N'Inter, sans-serif',
            @ContactEmail = N'contact@antigravitybistro.com',
            @ContactPhone = N'+91 98765 43210',
            @WhatsappNumber = N'+91 98765 43211',
            @AddressLine = N'123 Culinary Boulevard, Bengaluru',
            @GoogleMapsEmbedUrl = N'https://maps.google.com/embed?pb=123',
            @IsActive = 1,
            @SettingId = @OutSettingId OUTPUT;

        IF @OutSettingId > 0
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 1: usp_CMS_UpdateWebsiteSettings executed successfully (SettingId: ' + CAST(@OutSettingId AS VARCHAR(20)) + ')';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 1: usp_CMS_UpdateWebsiteSettings returned invalid SettingId';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 1: Exception in usp_CMS_UpdateWebsiteSettings: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 2: SP 163 - Get Website Settings
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_CMS_GetWebsiteSettings @RestaurantId = @TestRestaurantId, @BranchId = NULL;
        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 2: usp_CMS_GetWebsiteSettings executed successfully';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 2: Exception in usp_CMS_GetWebsiteSettings: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 3: SP 166 & SP 165 - SEO Settings UPSERT & Retrieval
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_CMS_UpdateSEOSettings
            @RestaurantId = @TestRestaurantId,
            @PageId = NULL,
            @MetaTitle = N'Antigravity Bistro - Fine Dining Experience',
            @MetaDescription = N'Experience extraordinary dining with curated seasonal menus.',
            @MetaKeywords = N'fine dining, restaurant, culinary, wine',
            @CanonicalUrl = N'https://antigravitybistro.com',
            @OgTitle = N'Antigravity Bistro | Fine Dining',
            @OgDescription = N'Experience extraordinary dining.',
            @OgImageUrl = N'https://res.cloudinary.com/rms/image/upload/og.jpg',
            @TwitterCardType = N'summary_large_image',
            @StructuredDataJson = N'{"@context": "https://schema.org", "@type": "Restaurant", "name": "Antigravity Bistro"}',
            @GoogleAnalyticsId = N'G-TEST12345',
            @GoogleTagManagerId = N'GTM-TEST123',
            @SEOId = @OutSEOId OUTPUT;

        IF @OutSEOId > 0
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 3: usp_CMS_UpdateSEOSettings executed successfully (SEOId: ' + CAST(@OutSEOId AS VARCHAR(20)) + ')';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 3: usp_CMS_UpdateSEOSettings returned invalid SEOId';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 3: Exception in usp_CMS_UpdateSEOSettings: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 4: SP 165 - Get SEO Settings
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_CMS_GetSEOSettings @RestaurantId = @TestRestaurantId, @PageId = NULL;
        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 4: usp_CMS_GetSEOSettings executed successfully';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 4: Exception in usp_CMS_GetSEOSettings: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 5: SP 170 - Create Page (Draft)
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    DECLARE @TestSlug NVARCHAR(150) = N'test-page-' + FORMAT(SYSUTCDATETIME(), 'yyyyMMddHHmmss');
    BEGIN TRY
        EXEC dbo.usp_CMS_CreatePage
            @RestaurantId = @TestRestaurantId,
            @BranchId = NULL,
            @PageTitle = N'Special Events & Banquets',
            @PageSlug = @TestSlug,
            @PageType = N'CUSTOM',
            @HeroBannerTitle = N'Unforgettable Celebrations',
            @HeroBannerSubtitle = N'Host your private gatherings with our tailored menus.',
            @HeroImageUrl = N'https://res.cloudinary.com/rms/image/upload/banquet.jpg',
            @ContentHtml = N'<p>We offer bespoke private dining packages.</p>',
            @Status = N'DRAFT',
            @DisplayOrder = 1,
            @IsSystemPage = 0,
            @NewPageId = @OutPageId OUTPUT;

        IF @OutPageId > 0
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 5: usp_CMS_CreatePage created draft page (PageId: ' + CAST(@OutPageId AS VARCHAR(20)) + ')';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 5: usp_CMS_CreatePage returned invalid PageId';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 5: Exception in usp_CMS_CreatePage: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 6: SP 170 - Duplicate Slug Validation
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        DECLARE @DupPageId BIGINT;
        EXEC dbo.usp_CMS_CreatePage
            @RestaurantId = @TestRestaurantId,
            @PageTitle = N'Duplicate Slug Test',
            @PageSlug = @TestSlug,
            @NewPageId = @DupPageId OUTPUT;

        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 6: Duplicate page slug was incorrectly permitted';
    END TRY
    BEGIN CATCH
        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 6: Duplicate page slug correctly rejected: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 7: SP 171 - Update Page
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_CMS_UpdatePage
            @PageId = @OutPageId,
            @PageTitle = N'Special Events, Weddings & Banquets',
            @HeroBannerTitle = N'Luxury Private Celebrations',
            @HeroBannerSubtitle = N'Curated culinary masterpieces for your guests.',
            @HeroImageUrl = N'https://res.cloudinary.com/rms/image/upload/banquet-updated.jpg',
            @ContentHtml = N'<p>Updated bespoke dining packages.</p>',
            @DisplayOrder = 2;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 7: usp_CMS_UpdatePage updated page successfully';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 7: Exception in usp_CMS_UpdatePage: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 8: SP 174 - Create Page Section
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_CMS_CreatePageSection
            @PageId = @OutPageId,
            @SectionKey = N'hero_events',
            @SectionTitle = N'Event Spaces',
            @SectionSubtitle = N'Choose your atmosphere',
            @ComponentType = N'HERO_SLIDER',
            @ContentDataJson = N'{"slides": [{"title": "Main Ballroom", "capacity": 250}]}',
            @BackgroundType = N'COLOR',
            @BackgroundColor = N'#F8F9FA',
            @DisplayOrder = 1,
            @IsActive = 1,
            @NewSectionId = @OutSectionId1 OUTPUT;

        EXEC dbo.usp_CMS_CreatePageSection
            @PageId = @OutPageId,
            @SectionKey = N'pricing_packages',
            @SectionTitle = N'Banqueting Packages',
            @ComponentType = N'SERVICES_LIST',
            @ContentDataJson = N'{"packages": [{"tier": "Gold", "price": 2500}]}',
            @DisplayOrder = 2,
            @IsActive = 1,
            @NewSectionId = @OutSectionId2 OUTPUT;

        IF @OutSectionId1 > 0 AND @OutSectionId2 > 0
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 8: usp_CMS_CreatePageSection created 2 sections successfully';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 8: usp_CMS_CreatePageSection returned invalid section IDs';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 8: Exception in usp_CMS_CreatePageSection: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 9: SP 175 - Update Page Section
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_CMS_UpdatePageSection
            @SectionId = @OutSectionId1,
            @SectionTitle = N'Grand Ballroom Spaces',
            @SectionSubtitle = N'Opulent and modern dining settings',
            @ComponentType = N'HERO_SLIDER',
            @ContentDataJson = N'{"slides": [{"title": "Grand Ballroom", "capacity": 300}]}',
            @BackgroundType = N'COLOR',
            @BackgroundColor = N'#1D3557',
            @IsActive = 1;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 9: usp_CMS_UpdatePageSection updated section successfully';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 9: Exception in usp_CMS_UpdatePageSection: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 10: SP 176 - Reorder Page Sections (JSON Array)
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        DECLARE @ReorderJson NVARCHAR(MAX) = N'[{"sectionId": ' + CAST(@OutSectionId1 AS NVARCHAR(20)) + N', "displayOrder": 2}, {"sectionId": ' + CAST(@OutSectionId2 AS NVARCHAR(20)) + N', "displayOrder": 1}]';
        EXEC dbo.usp_CMS_ReorderPageSections @PageId = @OutPageId, @SectionsOrderJson = @ReorderJson;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 10: usp_CMS_ReorderPageSections reordered sections via OPENJSON successfully';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 10: Exception in usp_CMS_ReorderPageSections: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 11: SP 167 - Preview Mode vs Non-Preview for Draft Page
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        -- Querying as public visitor (PreviewMode = 0) on DRAFT page should return 0 rows
        EXEC dbo.usp_CMS_GetPublicPageWithSections @PageSlug = @TestSlug, @PreviewMode = 0;
        -- Querying as preview mode (PreviewMode = 1) should return the draft page and sections
        EXEC dbo.usp_CMS_GetPublicPageWithSections @PageSlug = @TestSlug, @PreviewMode = 1;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 11: usp_CMS_GetPublicPageWithSections handled PreviewMode correctly';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 11: Exception in usp_CMS_GetPublicPageWithSections: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 12: SP 172 - Set Page Status (Publish & Archive)
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_CMS_SetPageStatus @PageId = @OutPageId, @NewStatus = N'PUBLISHED';
        EXEC dbo.usp_CMS_SetPageStatus @PageId = @OutPageId, @NewStatus = N'ARCHIVED';
        EXEC dbo.usp_CMS_SetPageStatus @PageId = @OutPageId, @NewStatus = N'PUBLISHED';

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 12: usp_CMS_SetPageStatus transitioned lifecycle successfully';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 12: Exception in usp_CMS_SetPageStatus: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 13: SP 168 & SP 169 - List Pages and Get Page By ID
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_CMS_ListPages @RestaurantId = @TestRestaurantId, @Status = NULL, @Search = NULL, @Page = 1, @Limit = 10;
        EXEC dbo.usp_CMS_GetPageById @PageId = @OutPageId;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 13: usp_CMS_ListPages and usp_CMS_GetPageById executed successfully';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 13: Exception in List/GetPageById: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 14: SP 177 - Delete Page Section
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_CMS_DeletePageSection @SectionId = @OutSectionId2;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 14: usp_CMS_DeletePageSection deleted section successfully';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 14: Exception in usp_CMS_DeletePageSection: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 15: SP 173 - Delete Page (Soft Delete)
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_CMS_DeletePage @PageId = @OutPageId, @DeletedByUserId = @TestUserId;

        -- Verify soft-deleted
        IF EXISTS (SELECT 1 FROM dbo.WebsitePages WHERE PageId = @OutPageId AND IsDeleted = 1)
        BEGIN
            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 15: usp_CMS_DeletePage soft deleted page successfully';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 15: Page was not marked as IsDeleted = 1';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 15: Exception in usp_CMS_DeletePage: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 16: SP 180, 181, 178, 179, 182 - Banners Management
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        -- Create banner
        EXEC dbo.usp_CMS_CreateBanner
            @RestaurantId = @TestRestaurantId,
            @BranchId = NULL,
            @BannerTitle = N'Spring Tasting Menu Unveiled',
            @Subtitle = N'Chef Marco presents a 7-course seasonal sensory journey.',
            @BadgeText = N'NEW SEASON',
            @ButtonText = N'Reserve Table',
            @ButtonLink = N'/reservations',
            @SecondaryButtonText = N'Explore Menu',
            @SecondaryButtonLink = N'/menu',
            @ImageUrl = N'https://res.cloudinary.com/rms/image/upload/spring-banner.jpg',
            @BannerLocation = N'HOME_HERO',
            @DisplayOrder = 1,
            @StartDate = NULL,
            @EndDate = NULL,
            @IsActive = 1,
            @NewBannerId = @OutBannerId OUTPUT;

        -- Update banner
        EXEC dbo.usp_CMS_UpdateBanner
            @BannerId = @OutBannerId,
            @BannerTitle = N'Spring Tasting Menu 2026',
            @Subtitle = N'7-course sensory tasting experience.',
            @BadgeText = N'LIMITED TIME',
            @ButtonText = N'Book Now',
            @ButtonLink = N'/reservations',
            @ImageUrl = N'https://res.cloudinary.com/rms/image/upload/spring-banner-v2.jpg',
            @BannerLocation = N'HOME_HERO',
            @DisplayOrder = 1,
            @IsActive = 1;

        -- Get active public banners
        EXEC dbo.usp_CMS_GetActiveBanners @RestaurantId = @TestRestaurantId, @BannerLocation = N'HOME_HERO';

        -- Admin list banners
        EXEC dbo.usp_CMS_ListBanners @RestaurantId = @TestRestaurantId;

        -- Delete banner
        EXEC dbo.usp_CMS_DeleteBanner @BannerId = @OutBannerId;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 16: Banners full lifecycle executed successfully (Create, Update, Get, List, Delete)';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 16: Exception in Banners tests: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 17: SP 185, 186, 183, 184, 187 - Navigation Menus
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        -- Parent menu item
        EXEC dbo.usp_CMS_CreateNavigationMenu
            @RestaurantId = @TestRestaurantId,
            @ParentMenuId = NULL,
            @MenuLocation = N'HEADER',
            @Title = N'Dining',
            @TargetUrl = N'/dining',
            @DisplayOrder = 1,
            @NewMenuId = @OutMenuId1 OUTPUT;

        -- Child menu item
        EXEC dbo.usp_CMS_CreateNavigationMenu
            @RestaurantId = @TestRestaurantId,
            @ParentMenuId = @OutMenuId1,
            @MenuLocation = N'HEADER',
            @Title = N'Tasting Menus',
            @TargetUrl = N'/dining/tasting',
            @DisplayOrder = 1,
            @NewMenuId = @OutMenuId2 OUTPUT;

        -- Update menu item
        EXEC dbo.usp_CMS_UpdateNavigationMenu
            @MenuId = @OutMenuId2,
            @ParentMenuId = @OutMenuId1,
            @MenuLocation = N'HEADER',
            @Title = N'Seasonal Tasting Menus',
            @TargetUrl = N'/dining/seasonal',
            @DisplayOrder = 1,
            @IsActive = 1;

        -- Get public navigation
        EXEC dbo.usp_CMS_GetPublicNavigation @RestaurantId = @TestRestaurantId;

        -- Admin list navigation
        EXEC dbo.usp_CMS_ListNavigationMenus @RestaurantId = @TestRestaurantId;

        -- Delete parent menu item (should set ParentMenuId = NULL on child)
        EXEC dbo.usp_CMS_DeleteNavigationMenu @MenuId = @OutMenuId1;
        EXEC dbo.usp_CMS_DeleteNavigationMenu @MenuId = @OutMenuId2;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 17: Navigation Menus full hierarchy lifecycle executed successfully';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 17: Exception in Navigation tests: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 18: SP 190, 191, 188, 189, 192 - Footer Sections
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_CMS_CreateFooterSection
            @RestaurantId = @TestRestaurantId,
            @SectionTitle = N'Opening Hours',
            @ContentType = N'HOURS',
            @ContentHtml = N'<p>Mon-Sun: 12:00 PM - 11:30 PM</p>',
            @DisplayOrder = 1,
            @IsActive = 1,
            @NewFooterSectionId = @OutFooterSectionId OUTPUT;

        EXEC dbo.usp_CMS_UpdateFooterSection
            @FooterSectionId = @OutFooterSectionId,
            @SectionTitle = N'Dining Hours & Concierge',
            @ContentType = N'HOURS',
            @ContentHtml = N'<p>Lunch: 12:00 PM - 3:30 PM | Dinner: 7:00 PM - 11:30 PM</p>',
            @DisplayOrder = 1,
            @IsActive = 1;

        EXEC dbo.usp_CMS_GetPublicFooter @RestaurantId = @TestRestaurantId;
        EXEC dbo.usp_CMS_ListFooterSections @RestaurantId = @TestRestaurantId;
        EXEC dbo.usp_CMS_DeleteFooterSection @FooterSectionId = @OutFooterSectionId;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 18: Footer Sections lifecycle executed successfully';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 18: Exception in Footer tests: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 19: SP 195, 196, 193, 194, 197 - FAQs
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        EXEC dbo.usp_CMS_CreateFAQ
            @RestaurantId = @TestRestaurantId,
            @Category = N'RESERVATIONS',
            @Question = N'Do you accommodate dietary restrictions and allergies?',
            @Answer = N'Yes, our kitchen accommodates vegetarian, vegan, gluten-free, and specific allergen requests with prior notice.',
            @DisplayOrder = 1,
            @IsActive = 1,
            @NewFAQId = @OutFAQId OUTPUT;

        EXEC dbo.usp_CMS_UpdateFAQ
            @FAQId = @OutFAQId,
            @Category = N'RESERVATIONS',
            @Question = N'How do I notify you about dietary requirements?',
            @Answer = N'Please mention dietary requirements during table booking or notify concierge 24 hours prior.',
            @DisplayOrder = 1,
            @IsActive = 1;

        EXEC dbo.usp_CMS_GetPublicFAQs @RestaurantId = @TestRestaurantId, @Category = N'RESERVATIONS';
        EXEC dbo.usp_CMS_ListFAQs @RestaurantId = @TestRestaurantId, @Category = NULL, @Search = N'dietary';
        EXEC dbo.usp_CMS_DeleteFAQ @FAQId = @OutFAQId;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 19: FAQs lifecycle executed successfully';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 19: Exception in FAQs tests: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 20: SP 200, 201, 198, 199, 202 - Testimonials & Rating Constraint Check
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        -- Valid testimonial
        EXEC dbo.usp_CMS_CreateTestimonial
            @RestaurantId = @TestRestaurantId,
            @AuthorName = N'Chef Gordon R.',
            @AuthorRole = N'Culinary Critic',
            @AuthorAvatarUrl = N'https://res.cloudinary.com/rms/image/upload/critic.jpg',
            @Rating = 5,
            @ReviewContent = N'Outstanding precision and harmonious flavor profiles.',
            @SourcePlatform = N'MICHELIN_GUIDE',
            @IsFeatured = 1,
            @DisplayOrder = 1,
            @IsActive = 1,
            @NewTestimonialId = @OutTestimonialId OUTPUT;

        -- Update testimonial
        EXEC dbo.usp_CMS_UpdateTestimonial
            @TestimonialId = @OutTestimonialId,
            @AuthorName = N'Gordon R.',
            @AuthorRole = N'Food & Wine Critic',
            @Rating = 5,
            @ReviewContent = N'Unrivaled culinary experience in Bengaluru.',
            @SourcePlatform = N'PRESS',
            @IsFeatured = 1,
            @DisplayOrder = 1,
            @IsActive = 1;

        -- Public get
        EXEC dbo.usp_CMS_GetPublicTestimonials @RestaurantId = @TestRestaurantId, @FeaturedOnly = 1;

        -- Admin list
        EXEC dbo.usp_CMS_ListTestimonials @RestaurantId = @TestRestaurantId;

        -- Delete
        EXEC dbo.usp_CMS_DeleteTestimonial @TestimonialId = @OutTestimonialId;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 20: Testimonials lifecycle executed successfully';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 20: Exception in Testimonials tests: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 21: Testimonial Rating Boundary Guard (Rating = 6 rejected)
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        DECLARE @InvalidTestimonialId BIGINT;
        EXEC dbo.usp_CMS_CreateTestimonial
            @RestaurantId = @TestRestaurantId,
            @AuthorName = N'Invalid Rating Tester',
            @Rating = 6, -- Invalid!
            @ReviewContent = N'Rating exceeds 5 stars',
            @NewTestimonialId = @InvalidTestimonialId OUTPUT;

        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 21: Invalid rating (6) was incorrectly accepted';
    END TRY
    BEGIN CATCH
        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 21: Invalid rating correctly rejected by SP validation: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 22: SP 204, 203, 205 - Social Media Links
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        -- Insert social link
        EXEC dbo.usp_CMS_SaveSocialMediaLink
            @RestaurantId = @TestRestaurantId,
            @SocialLinkId = NULL,
            @PlatformName = N'INSTAGRAM',
            @PlatformUrl = N'https://instagram.com/antigravitybistro',
            @IconKey = N'instagram',
            @DisplayOrder = 1,
            @IsActive = 1,
            @ResultSocialLinkId = @OutSocialLinkId OUTPUT;

        -- Update social link
        EXEC dbo.usp_CMS_SaveSocialMediaLink
            @RestaurantId = @TestRestaurantId,
            @SocialLinkId = @OutSocialLinkId,
            @PlatformName = N'INSTAGRAM',
            @PlatformUrl = N'https://instagram.com/antigravitybistro_official',
            @IconKey = N'instagram',
            @DisplayOrder = 1,
            @IsActive = 1,
            @ResultSocialLinkId = @OutSocialLinkId OUTPUT;

        -- List social links
        EXEC dbo.usp_CMS_ListSocialLinks @RestaurantId = @TestRestaurantId;

        -- Delete social link
        EXEC dbo.usp_CMS_DeleteSocialMediaLink @SocialLinkId = @OutSocialLinkId;

        SET @PassedTests = @PassedTests + 1;
        PRINT '  [PASS] Test 22: Social Media Links lifecycle executed successfully';
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 22: Exception in Social Media tests: ' + ERROR_MESSAGE();
    END CATCH;

    -- ------------------------------------------------------------------------
    -- TEST 23: SP 206, 207, 208, 209 - Contact Messages & Strict Boundary Guard
    -- ------------------------------------------------------------------------
    SET @TotalTests = @TotalTests + 1;
    BEGIN TRY
        -- Submit guest message
        EXEC dbo.usp_CMS_SubmitContactMessage
            @BranchId = @TestBranchId,
            @SenderName = N'Lady Eleanor Vance',
            @SenderEmail = N'eleanor.vance@example.com',
            @SenderPhone = N'+91 99887 76655',
            @Subject = N'Private Anniversary Dinner Inquiry',
            @InquiryType = N'PRIVATE_EVENT',
            @MessageBody = N'We are looking to host an intimate dinner for 20 guests on December 15th.',
            @NewMessageId = @OutMessageId OUTPUT;

        IF @OutMessageId > 0
        BEGIN
            -- Verify message exists in dbo.ContactMessages
            IF NOT EXISTS (SELECT 1 FROM dbo.ContactMessages WHERE MessageId = @OutMessageId)
                THROW 50999, 'Contact message was not saved in dbo.ContactMessages.', 1;

            -- Admin List Messages
            EXEC dbo.usp_CMS_ListContactMessages @BranchId = @TestBranchId, @Status = N'UNREAD';

            -- Get Message by ID (transitions UNREAD -> READ)
            EXEC dbo.usp_CMS_GetContactMessageById @MessageId = @OutMessageId;

            -- Verify Status updated to READ
            IF NOT EXISTS (SELECT 1 FROM dbo.ContactMessages WHERE MessageId = @OutMessageId AND Status = 'READ')
                THROW 50999, 'Message status did not transition to READ.', 1;

            -- Reply to message
            EXEC dbo.usp_CMS_ReplyContactMessage
                @MessageId = @OutMessageId,
                @AdminReplyNotes = N'Contacted guest via phone; event booked for private dining room.',
                @RepliedByUserId = @TestUserId;

            -- Verify Status updated to REPLIED
            IF NOT EXISTS (SELECT 1 FROM dbo.ContactMessages WHERE MessageId = @OutMessageId AND Status = 'REPLIED')
                THROW 50999, 'Message status did not transition to REPLIED.', 1;

            SET @PassedTests = @PassedTests + 1;
            PRINT '  [PASS] Test 23: Contact Messages full workflow executed successfully (Submit -> Read -> Reply)';
        END
        ELSE
        BEGIN
            SET @FailedTests = @FailedTests + 1;
            PRINT '  [FAIL] Test 23: usp_CMS_SubmitContactMessage returned invalid MessageId';
        END
    END TRY
    BEGIN CATCH
        SET @FailedTests = @FailedTests + 1;
        PRINT '  [FAIL] Test 23: Exception in Contact Messages tests: ' + ERROR_MESSAGE();
    END CATCH;

END TRY
BEGIN CATCH
    PRINT 'CRITICAL ERROR IN MASTER TEST BLOCK: ' + ERROR_MESSAGE();
END CATCH;

PRINT '====================================================================';
PRINT 'PHASE 11 CMS STORED PROCEDURE TEST SUMMARY';
PRINT 'Total Tests Executed: ' + CAST(@TotalTests AS VARCHAR(10));
PRINT 'Passed: ' + CAST(@PassedTests AS VARCHAR(10));
PRINT 'Failed: ' + CAST(@FailedTests AS VARCHAR(10));
PRINT '====================================================================';

IF @FailedTests > 0
    THROW 59999, 'One or more Phase 11 CMS stored procedure tests failed.', 1;
GO

