-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS)
-- Script 15: Dynamic Website CMS Service Stored Procedures
-- File: database/15_CMSStoredProcedures.sql
-- Description: 100% Parameterized T-SQL Stored Procedures for CMS Service.
--              Branding, SEO, Pages, Sections, Banners, Navigation, Footer,
--              FAQs, Testimonials, Social Media, and Contact Messages.
-- Procedures: 163 through 209 (Total: 47 Procedures)
-- ============================================================================

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- SECTION 1: WEBSITE BRANDING & SEO STORED PROCEDURES (SPs 163–166)
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 163: dbo.usp_CMS_GetWebsiteSettings
-- Description: Retrieves active global or branch-scoped website branding,
--              colors, typography, contact coordinates, and map URLs.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_GetWebsiteSettings', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_GetWebsiteSettings;
GO

CREATE PROCEDURE dbo.usp_CMS_GetWebsiteSettings
    @RestaurantId INT = 1,
    @BranchId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Try branch-specific settings first if BranchId provided
    IF @BranchId IS NOT NULL
    BEGIN
        SELECT TOP 1
            SettingId,
            RestaurantId,
            BranchId,
            SiteTitle,
            Tagline,
            HeaderLogoUrl,
            HeaderLogoPublicId,
            FooterLogoUrl,
            FooterLogoPublicId,
            FaviconUrl,
            PrimaryColor,
            SecondaryColor,
            AccentColor,
            FontFamily,
            ContactEmail,
            ContactPhone,
            WhatsappNumber,
            AddressLine,
            GoogleMapsEmbedUrl,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM dbo.WebsiteSettings
        WHERE RestaurantId = @RestaurantId
          AND BranchId = @BranchId
          AND IsActive = 1;

        IF @@ROWCOUNT > 0
            RETURN 0;
    END

    -- Fallback to global restaurant settings (BranchId IS NULL)
    SELECT TOP 1
        SettingId,
        RestaurantId,
        BranchId,
        SiteTitle,
        Tagline,
        HeaderLogoUrl,
        HeaderLogoPublicId,
        FooterLogoUrl,
        FooterLogoPublicId,
        FaviconUrl,
        PrimaryColor,
        SecondaryColor,
        AccentColor,
        FontFamily,
        ContactEmail,
        ContactPhone,
        WhatsappNumber,
        AddressLine,
        GoogleMapsEmbedUrl,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.WebsiteSettings
    WHERE RestaurantId = @RestaurantId
      AND BranchId IS NULL
      AND IsActive = 1;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 164: dbo.usp_CMS_UpdateWebsiteSettings
-- Description: Admin atomic UPSERT for website branding, colors, contact info.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_UpdateWebsiteSettings', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_UpdateWebsiteSettings;
GO

CREATE PROCEDURE dbo.usp_CMS_UpdateWebsiteSettings
    @RestaurantId INT,
    @BranchId INT = NULL,
    @SiteTitle NVARCHAR(150),
    @Tagline NVARCHAR(255) = NULL,
    @HeaderLogoUrl NVARCHAR(500) = NULL,
    @HeaderLogoPublicId NVARCHAR(150) = NULL,
    @FooterLogoUrl NVARCHAR(500) = NULL,
    @FooterLogoPublicId NVARCHAR(150) = NULL,
    @FaviconUrl NVARCHAR(500) = NULL,
    @PrimaryColor NVARCHAR(20) = '#E63946',
    @SecondaryColor NVARCHAR(20) = '#1D3557',
    @AccentColor NVARCHAR(20) = '#F1FAEE',
    @FontFamily NVARCHAR(80) = 'Inter, sans-serif',
    @ContactEmail NVARCHAR(120),
    @ContactPhone NVARCHAR(25),
    @WhatsappNumber NVARCHAR(25) = NULL,
    @AddressLine NVARCHAR(255),
    @GoogleMapsEmbedUrl NVARCHAR(1000) = NULL,
    @IsActive BIT = 1,
    @SettingId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @RestaurantId IS NULL OR @RestaurantId <= 0
            THROW 50164, 'RestaurantId is required.', 1;

        IF @SiteTitle IS NULL OR LTRIM(RTRIM(@SiteTitle)) = ''
            THROW 50164, 'SiteTitle cannot be empty.', 1;

        IF @ContactEmail IS NULL OR LTRIM(RTRIM(@ContactEmail)) = ''
            THROW 50164, 'ContactEmail cannot be empty.', 1;

        IF @ContactPhone IS NULL OR LTRIM(RTRIM(@ContactPhone)) = ''
            THROW 50164, 'ContactPhone cannot be empty.', 1;

        IF @AddressLine IS NULL OR LTRIM(RTRIM(@AddressLine)) = ''
            THROW 50164, 'AddressLine cannot be empty.', 1;

        BEGIN TRANSACTION;

        DECLARE @ExistingId INT = NULL;

        IF @BranchId IS NULL
        BEGIN
            SELECT @ExistingId = SettingId
            FROM dbo.WebsiteSettings
            WHERE RestaurantId = @RestaurantId AND BranchId IS NULL;
        END
        ELSE
        BEGIN
            SELECT @ExistingId = SettingId
            FROM dbo.WebsiteSettings
            WHERE RestaurantId = @RestaurantId AND BranchId = @BranchId;
        END

        IF @ExistingId IS NOT NULL
        BEGIN
            UPDATE dbo.WebsiteSettings
            SET SiteTitle = @SiteTitle,
                Tagline = @Tagline,
                HeaderLogoUrl = COALESCE(@HeaderLogoUrl, HeaderLogoUrl),
                HeaderLogoPublicId = COALESCE(@HeaderLogoPublicId, HeaderLogoPublicId),
                FooterLogoUrl = COALESCE(@FooterLogoUrl, FooterLogoUrl),
                FooterLogoPublicId = COALESCE(@FooterLogoPublicId, FooterLogoPublicId),
                FaviconUrl = COALESCE(@FaviconUrl, FaviconUrl),
                PrimaryColor = COALESCE(@PrimaryColor, PrimaryColor),
                SecondaryColor = COALESCE(@SecondaryColor, SecondaryColor),
                AccentColor = COALESCE(@AccentColor, AccentColor),
                FontFamily = COALESCE(@FontFamily, FontFamily),
                ContactEmail = @ContactEmail,
                ContactPhone = @ContactPhone,
                WhatsappNumber = @WhatsappNumber,
                AddressLine = @AddressLine,
                GoogleMapsEmbedUrl = @GoogleMapsEmbedUrl,
                IsActive = @IsActive,
                UpdatedAt = SYSUTCDATETIME()
            WHERE SettingId = @ExistingId;

            SET @SettingId = @ExistingId;
        END
        ELSE
        BEGIN
            INSERT INTO dbo.WebsiteSettings (
                RestaurantId,
                BranchId,
                SiteTitle,
                Tagline,
                HeaderLogoUrl,
                HeaderLogoPublicId,
                FooterLogoUrl,
                FooterLogoPublicId,
                FaviconUrl,
                PrimaryColor,
                SecondaryColor,
                AccentColor,
                FontFamily,
                ContactEmail,
                ContactPhone,
                WhatsappNumber,
                AddressLine,
                GoogleMapsEmbedUrl,
                IsActive,
                CreatedAt,
                UpdatedAt
            )
            VALUES (
                @RestaurantId,
                @BranchId,
                @SiteTitle,
                @Tagline,
                @HeaderLogoUrl,
                @HeaderLogoPublicId,
                @FooterLogoUrl,
                @FooterLogoPublicId,
                @FaviconUrl,
                COALESCE(@PrimaryColor, '#E63946'),
                COALESCE(@SecondaryColor, '#1D3557'),
                COALESCE(@AccentColor, '#F1FAEE'),
                COALESCE(@FontFamily, 'Inter, sans-serif'),
                @ContactEmail,
                @ContactPhone,
                @WhatsappNumber,
                @AddressLine,
                @GoogleMapsEmbedUrl,
                @IsActive,
                SYSUTCDATETIME(),
                SYSUTCDATETIME()
            );

            SET @SettingId = SCOPE_IDENTITY();
        END

        COMMIT TRANSACTION;

        SELECT
            SettingId,
            RestaurantId,
            BranchId,
            SiteTitle,
            Tagline,
            HeaderLogoUrl,
            HeaderLogoPublicId,
            FooterLogoUrl,
            FooterLogoPublicId,
            FaviconUrl,
            PrimaryColor,
            SecondaryColor,
            AccentColor,
            FontFamily,
            ContactEmail,
            ContactPhone,
            WhatsappNumber,
            AddressLine,
            GoogleMapsEmbedUrl,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM dbo.WebsiteSettings
        WHERE SettingId = @SettingId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 165: dbo.usp_CMS_GetSEOSettings
-- Description: Retrieves global or page-specific SEO metadata. Resolves
--              PageSlug to PageId if PageSlug provided.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_GetSEOSettings', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_GetSEOSettings;
GO

CREATE PROCEDURE dbo.usp_CMS_GetSEOSettings
    @RestaurantId INT = 1,
    @PageId BIGINT = NULL,
    @PageSlug NVARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Resolve PageSlug to PageId if supplied
    IF @PageId IS NULL AND @PageSlug IS NOT NULL
    BEGIN
        SELECT @PageId = PageId
        FROM dbo.WebsitePages
        WHERE PageSlug = @PageSlug AND IsDeleted = 0;
    END

    -- If looking for page-specific SEO
    IF @PageId IS NOT NULL
    BEGIN
        SELECT TOP 1
            s.SEOId,
            s.RestaurantId,
            s.PageId,
            p.PageSlug,
            p.PageTitle,
            s.MetaTitle,
            s.MetaDescription,
            s.MetaKeywords,
            s.CanonicalUrl,
            s.OgTitle,
            s.OgDescription,
            s.OgImageUrl,
            s.OgImagePublicId,
            s.TwitterCardType,
            s.StructuredDataJson,
            s.GoogleAnalyticsId,
            s.GoogleTagManagerId,
            s.CreatedAt,
            s.UpdatedAt
        FROM dbo.SEOSettings s
        LEFT JOIN dbo.WebsitePages p ON s.PageId = p.PageId
        WHERE s.RestaurantId = @RestaurantId
          AND s.PageId = @PageId;

        IF @@ROWCOUNT > 0
            RETURN 0;
    END

    -- Fallback to Global SEO settings (PageId IS NULL)
    SELECT TOP 1
        s.SEOId,
        s.RestaurantId,
        s.PageId,
        NULL AS PageSlug,
        NULL AS PageTitle,
        s.MetaTitle,
        s.MetaDescription,
        s.MetaKeywords,
        s.CanonicalUrl,
        s.OgTitle,
        s.OgDescription,
        s.OgImageUrl,
        s.OgImagePublicId,
        s.TwitterCardType,
        s.StructuredDataJson,
        s.GoogleAnalyticsId,
        s.GoogleTagManagerId,
        s.CreatedAt,
        s.UpdatedAt
    FROM dbo.SEOSettings s
    WHERE s.RestaurantId = @RestaurantId
      AND s.PageId IS NULL;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 166: dbo.usp_CMS_UpdateSEOSettings
-- Description: Admin atomic UPSERT for global or page-specific SEO metadata.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_UpdateSEOSettings', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_UpdateSEOSettings;
GO

CREATE PROCEDURE dbo.usp_CMS_UpdateSEOSettings
    @RestaurantId INT,
    @PageId BIGINT = NULL,
    @MetaTitle NVARCHAR(150),
    @MetaDescription NVARCHAR(500),
    @MetaKeywords NVARCHAR(500) = NULL,
    @CanonicalUrl NVARCHAR(500) = NULL,
    @OgTitle NVARCHAR(150) = NULL,
    @OgDescription NVARCHAR(500) = NULL,
    @OgImageUrl NVARCHAR(500) = NULL,
    @OgImagePublicId NVARCHAR(150) = NULL,
    @TwitterCardType NVARCHAR(30) = 'summary_large_image',
    @StructuredDataJson NVARCHAR(MAX) = NULL,
    @GoogleAnalyticsId NVARCHAR(50) = NULL,
    @GoogleTagManagerId NVARCHAR(50) = NULL,
    @SEOId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @RestaurantId IS NULL OR @RestaurantId <= 0
            THROW 50166, 'RestaurantId is required.', 1;

        IF @MetaTitle IS NULL OR LTRIM(RTRIM(@MetaTitle)) = ''
            THROW 50166, 'MetaTitle cannot be empty.', 1;

        IF @MetaDescription IS NULL OR LTRIM(RTRIM(@MetaDescription)) = ''
            THROW 50166, 'MetaDescription cannot be empty.', 1;

        IF @PageId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.WebsitePages WHERE PageId = @PageId AND IsDeleted = 0)
            THROW 50166, 'Specified PageId does not exist.', 1;

        BEGIN TRANSACTION;

        DECLARE @ExistingId INT = NULL;

        IF @PageId IS NULL
        BEGIN
            SELECT @ExistingId = SEOId
            FROM dbo.SEOSettings
            WHERE RestaurantId = @RestaurantId AND PageId IS NULL;
        END
        ELSE
        BEGIN
            SELECT @ExistingId = SEOId
            FROM dbo.SEOSettings
            WHERE RestaurantId = @RestaurantId AND PageId = @PageId;
        END

        IF @ExistingId IS NOT NULL
        BEGIN
            UPDATE dbo.SEOSettings
            SET MetaTitle = @MetaTitle,
                MetaDescription = @MetaDescription,
                MetaKeywords = @MetaKeywords,
                CanonicalUrl = @CanonicalUrl,
                OgTitle = @OgTitle,
                OgDescription = @OgDescription,
                OgImageUrl = COALESCE(@OgImageUrl, OgImageUrl),
                OgImagePublicId = COALESCE(@OgImagePublicId, OgImagePublicId),
                TwitterCardType = COALESCE(@TwitterCardType, TwitterCardType),
                StructuredDataJson = @StructuredDataJson,
                GoogleAnalyticsId = @GoogleAnalyticsId,
                GoogleTagManagerId = @GoogleTagManagerId,
                UpdatedAt = SYSUTCDATETIME()
            WHERE SEOId = @ExistingId;

            SET @SEOId = @ExistingId;
        END
        ELSE
        BEGIN
            INSERT INTO dbo.SEOSettings (
                RestaurantId,
                PageId,
                MetaTitle,
                MetaDescription,
                MetaKeywords,
                CanonicalUrl,
                OgTitle,
                OgDescription,
                OgImageUrl,
                OgImagePublicId,
                TwitterCardType,
                StructuredDataJson,
                GoogleAnalyticsId,
                GoogleTagManagerId,
                CreatedAt,
                UpdatedAt
            )
            VALUES (
                @RestaurantId,
                @PageId,
                @MetaTitle,
                @MetaDescription,
                @MetaKeywords,
                @CanonicalUrl,
                @OgTitle,
                @OgDescription,
                @OgImageUrl,
                @OgImagePublicId,
                COALESCE(@TwitterCardType, 'summary_large_image'),
                @StructuredDataJson,
                @GoogleAnalyticsId,
                @GoogleTagManagerId,
                SYSUTCDATETIME(),
                SYSUTCDATETIME()
            );

            SET @SEOId = SCOPE_IDENTITY();
        END

        COMMIT TRANSACTION;

        SELECT
            SEOId,
            RestaurantId,
            PageId,
            MetaTitle,
            MetaDescription,
            MetaKeywords,
            CanonicalUrl,
            OgTitle,
            OgDescription,
            OgImageUrl,
            OgImagePublicId,
            TwitterCardType,
            StructuredDataJson,
            GoogleAnalyticsId,
            GoogleTagManagerId,
            CreatedAt,
            UpdatedAt
        FROM dbo.SEOSettings
        WHERE SEOId = @SEOId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- SECTION 2: DYNAMIC PAGES & SECTION COMPONENT REGISTRY (SPs 167–177)
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 167: dbo.usp_CMS_GetPublicPageWithSections
-- Description: Multi-recordset customer query returning:
--              Recordset 1: Page details & SEO tags.
--              Recordset 2: Active page sections ordered by DisplayOrder.
--              Recordset 3: Active hero banners if @PageSlug = 'home'.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_GetPublicPageWithSections', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_GetPublicPageWithSections;
GO

CREATE PROCEDURE dbo.usp_CMS_GetPublicPageWithSections
    @PageSlug NVARCHAR(150),
    @PreviewMode BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TargetPageId BIGINT = NULL;

    -- Recordset 1: Page & SEO Info
    SELECT TOP 1
        p.PageId,
        p.RestaurantId,
        p.BranchId,
        p.PageTitle,
        p.PageSlug,
        p.PageType,
        p.HeroBannerTitle,
        p.HeroBannerSubtitle,
        p.HeroImageUrl,
        p.HeroImagePublicId,
        p.ContentHtml,
        p.Status,
        p.PublishedAt,
        p.DisplayOrder,
        p.IsSystemPage,
        s.MetaTitle,
        s.MetaDescription,
        s.MetaKeywords,
        s.CanonicalUrl,
        s.OgTitle,
        s.OgDescription,
        s.OgImageUrl,
        s.TwitterCardType,
        s.StructuredDataJson
    FROM dbo.WebsitePages p
    LEFT JOIN dbo.SEOSettings s ON p.PageId = s.PageId
    WHERE p.PageSlug = @PageSlug
      AND p.IsDeleted = 0
      AND (@PreviewMode = 1 OR p.Status = 'PUBLISHED');

    -- Resolve TargetPageId for subsequent recordsets
    SELECT @TargetPageId = PageId
    FROM dbo.WebsitePages
    WHERE PageSlug = @PageSlug
      AND IsDeleted = 0
      AND (@PreviewMode = 1 OR Status = 'PUBLISHED');

    -- Recordset 2: Sections
    IF @TargetPageId IS NOT NULL
    BEGIN
        SELECT
            SectionId,
            PageId,
            SectionKey,
            SectionTitle,
            SectionSubtitle,
            ComponentType,
            ContentDataJson,
            BackgroundType,
            BackgroundColor,
            BackgroundImageUrl,
            BackgroundImagePublicId,
            DisplayOrder,
            IsActive
        FROM dbo.WebsitePageSections
        WHERE PageId = @TargetPageId
          AND (@PreviewMode = 1 OR IsActive = 1)
        ORDER BY DisplayOrder ASC, SectionId ASC;
    END
    ELSE
    BEGIN
        SELECT TOP 0 * FROM dbo.WebsitePageSections;
    END

    -- Recordset 3: Active Hero Banners if home page
    IF LOWER(@PageSlug) = 'home'
    BEGIN
        SELECT
            BannerId,
            RestaurantId,
            BranchId,
            BannerTitle,
            Subtitle,
            BadgeText,
            ButtonText,
            ButtonLink,
            SecondaryButtonText,
            SecondaryButtonLink,
            ImageUrl,
            MobileImageUrl,
            BannerLocation,
            DisplayOrder,
            StartDate,
            EndDate
        FROM dbo.WebsiteBanners
        WHERE IsDeleted = 0
          AND IsActive = 1
          AND BannerLocation = 'HOME_HERO'
          AND (StartDate IS NULL OR StartDate <= SYSUTCDATETIME())
          AND (EndDate IS NULL OR EndDate >= SYSUTCDATETIME())
        ORDER BY DisplayOrder ASC, BannerId DESC;
    END
    ELSE
    BEGIN
        SELECT TOP 0 * FROM dbo.WebsiteBanners;
    END

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 168: dbo.usp_CMS_ListPages
-- Description: Admin paginated query listing website pages with section counts.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_ListPages', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_ListPages;
GO

CREATE PROCEDURE dbo.usp_CMS_ListPages
    @RestaurantId INT = 1,
    @Status NVARCHAR(20) = NULL,
    @Search NVARCHAR(100) = NULL,
    @Page INT = 1,
    @Limit INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF @Page < 1 SET @Page = 1;
    IF @Limit < 1 SET @Limit = 20;
    IF @Limit > 100 SET @Limit = 100;

    DECLARE @Offset INT = (@Page - 1) * @Limit;

    -- Recordset 1: Total Count
    SELECT COUNT(1) AS TotalCount
    FROM dbo.WebsitePages p
    WHERE p.RestaurantId = @RestaurantId
      AND p.IsDeleted = 0
      AND (@Status IS NULL OR p.Status = @Status)
      AND (@Search IS NULL OR p.PageTitle LIKE '%' + @Search + '%' OR p.PageSlug LIKE '%' + @Search + '%');

    -- Recordset 2: Paginated Data
    SELECT
        p.PageId,
        p.RestaurantId,
        p.BranchId,
        p.PageTitle,
        p.PageSlug,
        p.PageType,
        p.HeroBannerTitle,
        p.HeroImageUrl,
        p.Status,
        p.PublishedAt,
        p.DisplayOrder,
        p.IsSystemPage,
        p.CreatedAt,
        p.UpdatedAt,
        (SELECT COUNT(1) FROM dbo.WebsitePageSections s WHERE s.PageId = p.PageId) AS SectionCount
    FROM dbo.WebsitePages p
    WHERE p.RestaurantId = @RestaurantId
      AND p.IsDeleted = 0
      AND (@Status IS NULL OR p.Status = @Status)
      AND (@Search IS NULL OR p.PageTitle LIKE '%' + @Search + '%' OR p.PageSlug LIKE '%' + @Search + '%')
    ORDER BY p.DisplayOrder ASC, p.PageId DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 169: dbo.usp_CMS_GetPageById
-- Description: Multi-recordset admin query returning:
--              Recordset 1: Page header metadata.
--              Recordset 2: Attached SEO settings.
--              Recordset 3: All page sections ordered by DisplayOrder.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_GetPageById', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_GetPageById;
GO

CREATE PROCEDURE dbo.usp_CMS_GetPageById
    @PageId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 1: Page Details
    SELECT
        PageId,
        RestaurantId,
        BranchId,
        PageTitle,
        PageSlug,
        PageType,
        HeroBannerTitle,
        HeroBannerSubtitle,
        HeroImageUrl,
        HeroImagePublicId,
        ContentHtml,
        Status,
        PublishedAt,
        DisplayOrder,
        IsSystemPage,
        CreatedAt,
        UpdatedAt
    FROM dbo.WebsitePages
    WHERE PageId = @PageId AND IsDeleted = 0;

    -- Recordset 2: Attached SEO
    SELECT
        SEOId,
        RestaurantId,
        PageId,
        MetaTitle,
        MetaDescription,
        MetaKeywords,
        CanonicalUrl,
        OgTitle,
        OgDescription,
        OgImageUrl,
        OgImagePublicId,
        TwitterCardType,
        StructuredDataJson,
        GoogleAnalyticsId,
        GoogleTagManagerId
    FROM dbo.SEOSettings
    WHERE PageId = @PageId;

    -- Recordset 3: All Sections (Active & Inactive)
    SELECT
        SectionId,
        PageId,
        SectionKey,
        SectionTitle,
        SectionSubtitle,
        ComponentType,
        ContentDataJson,
        BackgroundType,
        BackgroundColor,
        BackgroundImageUrl,
        BackgroundImagePublicId,
        DisplayOrder,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.WebsitePageSections
    WHERE PageId = @PageId
    ORDER BY DisplayOrder ASC, SectionId ASC;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 170: dbo.usp_CMS_CreatePage
-- Description: Creates a new CMS page with unique slug validation.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_CreatePage', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_CreatePage;
GO

CREATE PROCEDURE dbo.usp_CMS_CreatePage
    @RestaurantId INT,
    @BranchId INT = NULL,
    @PageTitle NVARCHAR(150),
    @PageSlug NVARCHAR(150),
    @PageType NVARCHAR(50) = 'CUSTOM',
    @HeroBannerTitle NVARCHAR(200) = NULL,
    @HeroBannerSubtitle NVARCHAR(500) = NULL,
    @HeroImageUrl NVARCHAR(500) = NULL,
    @HeroImagePublicId NVARCHAR(150) = NULL,
    @ContentHtml NVARCHAR(MAX) = NULL,
    @Status NVARCHAR(20) = 'DRAFT',
    @DisplayOrder INT = 0,
    @IsSystemPage BIT = 0,
    @NewPageId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @RestaurantId IS NULL OR @RestaurantId <= 0
            THROW 50170, 'RestaurantId is required.', 1;

        IF @PageTitle IS NULL OR LTRIM(RTRIM(@PageTitle)) = ''
            THROW 50170, 'PageTitle cannot be empty.', 1;

        IF @PageSlug IS NULL OR LTRIM(RTRIM(@PageSlug)) = ''
            THROW 50170, 'PageSlug cannot be empty.', 1;

        -- Clean slug formatting
        SET @PageSlug = LOWER(LTRIM(RTRIM(@PageSlug)));

        -- Duplicate slug check against non-deleted pages
        IF EXISTS (SELECT 1 FROM dbo.WebsitePages WHERE PageSlug = @PageSlug AND IsDeleted = 0)
            THROW 50170, 'A page with this slug already exists.', 1;

        DECLARE @PublishedAt DATETIME2 = NULL;
        IF @Status = 'PUBLISHED'
            SET @PublishedAt = SYSUTCDATETIME();

        BEGIN TRANSACTION;

        INSERT INTO dbo.WebsitePages (
            RestaurantId,
            BranchId,
            PageTitle,
            PageSlug,
            PageType,
            HeroBannerTitle,
            HeroBannerSubtitle,
            HeroImageUrl,
            HeroImagePublicId,
            ContentHtml,
            Status,
            PublishedAt,
            DisplayOrder,
            IsSystemPage,
            CreatedAt,
            UpdatedAt,
            IsDeleted,
            DeletedAt
        )
        VALUES (
            @RestaurantId,
            @BranchId,
            @PageTitle,
            @PageSlug,
            COALESCE(@PageType, 'CUSTOM'),
            @HeroBannerTitle,
            @HeroBannerSubtitle,
            @HeroImageUrl,
            @HeroImagePublicId,
            @ContentHtml,
            COALESCE(@Status, 'DRAFT'),
            @PublishedAt,
            COALESCE(@DisplayOrder, 0),
            COALESCE(@IsSystemPage, 0),
            SYSUTCDATETIME(),
            SYSUTCDATETIME(),
            0,
            NULL
        );

        SET @NewPageId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT
            PageId,
            RestaurantId,
            BranchId,
            PageTitle,
            PageSlug,
            PageType,
            HeroBannerTitle,
            HeroBannerSubtitle,
            HeroImageUrl,
            HeroImagePublicId,
            ContentHtml,
            Status,
            PublishedAt,
            DisplayOrder,
            IsSystemPage,
            CreatedAt,
            UpdatedAt
        FROM dbo.WebsitePages
        WHERE PageId = @NewPageId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 171: dbo.usp_CMS_UpdatePage
-- Description: Updates page details, banner, content HTML, and display order.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_UpdatePage', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_UpdatePage;
GO

CREATE PROCEDURE dbo.usp_CMS_UpdatePage
    @PageId BIGINT,
    @PageTitle NVARCHAR(150),
    @HeroBannerTitle NVARCHAR(200) = NULL,
    @HeroBannerSubtitle NVARCHAR(500) = NULL,
    @HeroImageUrl NVARCHAR(500) = NULL,
    @HeroImagePublicId NVARCHAR(150) = NULL,
    @ContentHtml NVARCHAR(MAX) = NULL,
    @DisplayOrder INT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.WebsitePages WHERE PageId = @PageId AND IsDeleted = 0)
            THROW 50171, 'Specified PageId does not exist.', 1;

        IF @PageTitle IS NULL OR LTRIM(RTRIM(@PageTitle)) = ''
            THROW 50171, 'PageTitle cannot be empty.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.WebsitePages
        SET PageTitle = @PageTitle,
            HeroBannerTitle = @HeroBannerTitle,
            HeroBannerSubtitle = @HeroBannerSubtitle,
            HeroImageUrl = COALESCE(@HeroImageUrl, HeroImageUrl),
            HeroImagePublicId = COALESCE(@HeroImagePublicId, HeroImagePublicId),
            ContentHtml = @ContentHtml,
            DisplayOrder = COALESCE(@DisplayOrder, DisplayOrder),
            UpdatedAt = SYSUTCDATETIME()
        WHERE PageId = @PageId;

        COMMIT TRANSACTION;

        SELECT
            PageId,
            RestaurantId,
            BranchId,
            PageTitle,
            PageSlug,
            PageType,
            HeroBannerTitle,
            HeroBannerSubtitle,
            HeroImageUrl,
            HeroImagePublicId,
            ContentHtml,
            Status,
            PublishedAt,
            DisplayOrder,
            IsSystemPage,
            CreatedAt,
            UpdatedAt
        FROM dbo.WebsitePages
        WHERE PageId = @PageId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 172: dbo.usp_CMS_SetPageStatus
-- Description: Transitions page status (DRAFT, PUBLISHED, ARCHIVED).
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_SetPageStatus', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_SetPageStatus;
GO

CREATE PROCEDURE dbo.usp_CMS_SetPageStatus
    @PageId BIGINT,
    @NewStatus NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.WebsitePages WHERE PageId = @PageId AND IsDeleted = 0)
            THROW 50172, 'Specified PageId does not exist.', 1;

        IF @NewStatus NOT IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')
            THROW 50172, 'Invalid page status. Must be DRAFT, PUBLISHED, or ARCHIVED.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.WebsitePages
        SET Status = @NewStatus,
            PublishedAt = CASE 
                WHEN @NewStatus = 'PUBLISHED' THEN SYSUTCDATETIME()
                ELSE PublishedAt 
            END,
            UpdatedAt = SYSUTCDATETIME()
        WHERE PageId = @PageId;

        COMMIT TRANSACTION;

        SELECT PageId, PageSlug, PageTitle, Status, PublishedAt, UpdatedAt
        FROM dbo.WebsitePages
        WHERE PageId = @PageId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 173: dbo.usp_CMS_DeletePage
-- Description: Soft deletes a page. Guards against deleting system pages.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_DeletePage', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_DeletePage;
GO

CREATE PROCEDURE dbo.usp_CMS_DeletePage
    @PageId BIGINT,
    @DeletedByUserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        DECLARE @IsSystemPage BIT;

        SELECT @IsSystemPage = IsSystemPage
        FROM dbo.WebsitePages
        WHERE PageId = @PageId AND IsDeleted = 0;

        IF @IsSystemPage IS NULL
            THROW 50173, 'Specified PageId does not exist or has already been deleted.', 1;

        IF @IsSystemPage = 1
            THROW 50173, 'Protected system pages cannot be deleted.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.WebsitePages
        SET IsDeleted = 1,
            DeletedAt = SYSUTCDATETIME(),
            UpdatedAt = SYSUTCDATETIME()
        WHERE PageId = @PageId;

        COMMIT TRANSACTION;

        SELECT @PageId AS DeletedPageId, 'DELETED' AS Status;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 174: dbo.usp_CMS_CreatePageSection
-- Description: Creates a new modular section block for a page.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_CreatePageSection', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_CreatePageSection;
GO

CREATE PROCEDURE dbo.usp_CMS_CreatePageSection
    @PageId BIGINT,
    @SectionKey NVARCHAR(80),
    @SectionTitle NVARCHAR(150) = NULL,
    @SectionSubtitle NVARCHAR(255) = NULL,
    @ComponentType NVARCHAR(50),
    @ContentDataJson NVARCHAR(MAX) = NULL,
    @BackgroundType NVARCHAR(30) = 'COLOR',
    @BackgroundColor NVARCHAR(30) = NULL,
    @BackgroundImageUrl NVARCHAR(500) = NULL,
    @BackgroundImagePublicId NVARCHAR(150) = NULL,
    @DisplayOrder INT = NULL,
    @IsActive BIT = 1,
    @NewSectionId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.WebsitePages WHERE PageId = @PageId AND IsDeleted = 0)
            THROW 50174, 'Specified PageId does not exist.', 1;

        IF @SectionKey IS NULL OR LTRIM(RTRIM(@SectionKey)) = ''
            THROW 50174, 'SectionKey cannot be empty.', 1;

        IF @ComponentType IS NULL OR LTRIM(RTRIM(@ComponentType)) = ''
            THROW 50174, 'ComponentType cannot be empty.', 1;

        IF EXISTS (SELECT 1 FROM dbo.WebsitePageSections WHERE PageId = @PageId AND SectionKey = @SectionKey)
            THROW 50174, 'A section with this key already exists on this page.', 1;

        -- Auto calculate DisplayOrder if omitted
        IF @DisplayOrder IS NULL
        BEGIN
            SELECT @DisplayOrder = COALESCE(MAX(DisplayOrder), 0) + 1
            FROM dbo.WebsitePageSections
            WHERE PageId = @PageId;
        END

        BEGIN TRANSACTION;

        INSERT INTO dbo.WebsitePageSections (
            PageId,
            SectionKey,
            SectionTitle,
            SectionSubtitle,
            ComponentType,
            ContentDataJson,
            BackgroundType,
            BackgroundColor,
            BackgroundImageUrl,
            BackgroundImagePublicId,
            DisplayOrder,
            IsActive,
            CreatedAt,
            UpdatedAt
        )
        VALUES (
            @PageId,
            @SectionKey,
            @SectionTitle,
            @SectionSubtitle,
            @ComponentType,
            @ContentDataJson,
            COALESCE(@BackgroundType, 'COLOR'),
            @BackgroundColor,
            @BackgroundImageUrl,
            @BackgroundImagePublicId,
            @DisplayOrder,
            COALESCE(@IsActive, 1),
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        );

        SET @NewSectionId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT
            SectionId,
            PageId,
            SectionKey,
            SectionTitle,
            SectionSubtitle,
            ComponentType,
            ContentDataJson,
            BackgroundType,
            BackgroundColor,
            BackgroundImageUrl,
            BackgroundImagePublicId,
            DisplayOrder,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM dbo.WebsitePageSections
        WHERE SectionId = @NewSectionId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 175: dbo.usp_CMS_UpdatePageSection
-- Description: Updates section content, styling, and active state.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_UpdatePageSection', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_UpdatePageSection;
GO

CREATE PROCEDURE dbo.usp_CMS_UpdatePageSection
    @SectionId BIGINT,
    @SectionTitle NVARCHAR(150) = NULL,
    @SectionSubtitle NVARCHAR(255) = NULL,
    @ComponentType NVARCHAR(50),
    @ContentDataJson NVARCHAR(MAX) = NULL,
    @BackgroundType NVARCHAR(30) = 'COLOR',
    @BackgroundColor NVARCHAR(30) = NULL,
    @BackgroundImageUrl NVARCHAR(500) = NULL,
    @BackgroundImagePublicId NVARCHAR(150) = NULL,
    @DisplayOrder INT = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.WebsitePageSections WHERE SectionId = @SectionId)
            THROW 50175, 'Specified SectionId does not exist.', 1;

        IF @ComponentType IS NULL OR LTRIM(RTRIM(@ComponentType)) = ''
            THROW 50175, 'ComponentType cannot be empty.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.WebsitePageSections
        SET SectionTitle = @SectionTitle,
            SectionSubtitle = @SectionSubtitle,
            ComponentType = @ComponentType,
            ContentDataJson = @ContentDataJson,
            BackgroundType = COALESCE(@BackgroundType, BackgroundType),
            BackgroundColor = @BackgroundColor,
            BackgroundImageUrl = COALESCE(@BackgroundImageUrl, BackgroundImageUrl),
            BackgroundImagePublicId = COALESCE(@BackgroundImagePublicId, BackgroundImagePublicId),
            DisplayOrder = COALESCE(@DisplayOrder, DisplayOrder),
            IsActive = COALESCE(@IsActive, IsActive),
            UpdatedAt = SYSUTCDATETIME()
        WHERE SectionId = @SectionId;

        COMMIT TRANSACTION;

        SELECT
            SectionId,
            PageId,
            SectionKey,
            SectionTitle,
            SectionSubtitle,
            ComponentType,
            ContentDataJson,
            BackgroundType,
            BackgroundColor,
            BackgroundImageUrl,
            BackgroundImagePublicId,
            DisplayOrder,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM dbo.WebsitePageSections
        WHERE SectionId = @SectionId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 176: dbo.usp_CMS_ReorderPageSections
-- Description: Batch atomic reordering of sections parsed from JSON array:
--              [{"sectionId": 1, "displayOrder": 1}, ...]
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_ReorderPageSections', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_ReorderPageSections;
GO

CREATE PROCEDURE dbo.usp_CMS_ReorderPageSections
    @PageId BIGINT,
    @SectionsOrderJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.WebsitePages WHERE PageId = @PageId AND IsDeleted = 0)
            THROW 50176, 'Specified PageId does not exist.', 1;

        IF @SectionsOrderJson IS NULL OR ISJSON(@SectionsOrderJson) <> 1
            THROW 50176, 'Valid JSON array required for sections order.', 1;

        BEGIN TRANSACTION;

        UPDATE s
        SET s.DisplayOrder = j.DisplayOrder,
            s.UpdatedAt = SYSUTCDATETIME()
        FROM dbo.WebsitePageSections s
        JOIN OPENJSON(@SectionsOrderJson)
        WITH (
            sectionId BIGINT '$.sectionId',
            displayOrder INT '$.displayOrder'
        ) j ON s.SectionId = j.sectionId
        WHERE s.PageId = @PageId;

        COMMIT TRANSACTION;

        SELECT
            SectionId,
            PageId,
            SectionKey,
            SectionTitle,
            ComponentType,
            DisplayOrder,
            IsActive
        FROM dbo.WebsitePageSections
        WHERE PageId = @PageId
        ORDER BY DisplayOrder ASC;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 177: dbo.usp_CMS_DeletePageSection
-- Description: Hard deletes a section block.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_DeletePageSection', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_DeletePageSection;
GO

CREATE PROCEDURE dbo.usp_CMS_DeletePageSection
    @SectionId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.WebsitePageSections WHERE SectionId = @SectionId)
            THROW 50177, 'Specified SectionId does not exist.', 1;

        BEGIN TRANSACTION;

        DELETE FROM dbo.WebsitePageSections
        WHERE SectionId = @SectionId;

        COMMIT TRANSACTION;

        SELECT @SectionId AS DeletedSectionId, 'DELETED' AS Status;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- SECTION 3: BANNERS & PROMO SLIDERS (SPs 178–182)
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 178: dbo.usp_CMS_GetActiveBanners
-- Description: High-speed customer query returning active scheduled banners.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_GetActiveBanners', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_GetActiveBanners;
GO

CREATE PROCEDURE dbo.usp_CMS_GetActiveBanners
    @RestaurantId INT = 1,
    @BranchId INT = NULL,
    @BannerLocation NVARCHAR(50) = 'HOME_HERO'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        BannerId,
        RestaurantId,
        BranchId,
        BannerTitle,
        Subtitle,
        BadgeText,
        ButtonText,
        ButtonLink,
        SecondaryButtonText,
        SecondaryButtonLink,
        ImageUrl,
        ImagePublicId,
        MobileImageUrl,
        MobileImagePublicId,
        BannerLocation,
        DisplayOrder,
        StartDate,
        EndDate,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.WebsiteBanners
    WHERE RestaurantId = @RestaurantId
      AND (@BranchId IS NULL OR BranchId IS NULL OR BranchId = @BranchId)
      AND (@BannerLocation IS NULL OR BannerLocation = @BannerLocation)
      AND IsDeleted = 0
      AND IsActive = 1
      AND (StartDate IS NULL OR StartDate <= SYSUTCDATETIME())
      AND (EndDate IS NULL OR EndDate >= SYSUTCDATETIME())
    ORDER BY DisplayOrder ASC, BannerId DESC;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 179: dbo.usp_CMS_ListBanners
-- Description: Admin paginated query listing all banners with filters.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_ListBanners', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_ListBanners;
GO

CREATE PROCEDURE dbo.usp_CMS_ListBanners
    @RestaurantId INT = 1,
    @BannerLocation NVARCHAR(50) = NULL,
    @Page INT = 1,
    @Limit INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF @Page < 1 SET @Page = 1;
    IF @Limit < 1 SET @Limit = 20;
    IF @Limit > 100 SET @Limit = 100;

    DECLARE @Offset INT = (@Page - 1) * @Limit;

    -- Recordset 1: Total Count
    SELECT COUNT(1) AS TotalCount
    FROM dbo.WebsiteBanners
    WHERE RestaurantId = @RestaurantId
      AND IsDeleted = 0
      AND (@BannerLocation IS NULL OR BannerLocation = @BannerLocation);

    -- Recordset 2: Paginated Data
    SELECT
        BannerId,
        RestaurantId,
        BranchId,
        BannerTitle,
        Subtitle,
        BadgeText,
        ButtonText,
        ButtonLink,
        SecondaryButtonText,
        SecondaryButtonLink,
        ImageUrl,
        ImagePublicId,
        MobileImageUrl,
        MobileImagePublicId,
        BannerLocation,
        DisplayOrder,
        StartDate,
        EndDate,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.WebsiteBanners
    WHERE RestaurantId = @RestaurantId
      AND IsDeleted = 0
      AND (@BannerLocation IS NULL OR BannerLocation = @BannerLocation)
    ORDER BY DisplayOrder ASC, BannerId DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 180: dbo.usp_CMS_CreateBanner
-- Description: Creates a new hero carousel or promotional banner.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_CreateBanner', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_CreateBanner;
GO

CREATE PROCEDURE dbo.usp_CMS_CreateBanner
    @RestaurantId INT,
    @BranchId INT = NULL,
    @BannerTitle NVARCHAR(150),
    @Subtitle NVARCHAR(300) = NULL,
    @BadgeText NVARCHAR(60) = NULL,
    @ButtonText NVARCHAR(60) = NULL,
    @ButtonLink NVARCHAR(255) = NULL,
    @SecondaryButtonText NVARCHAR(60) = NULL,
    @SecondaryButtonLink NVARCHAR(255) = NULL,
    @ImageUrl NVARCHAR(500),
    @ImagePublicId NVARCHAR(150) = NULL,
    @MobileImageUrl NVARCHAR(500) = NULL,
    @MobileImagePublicId NVARCHAR(150) = NULL,
    @BannerLocation NVARCHAR(50) = 'HOME_HERO',
    @DisplayOrder INT = 0,
    @StartDate DATETIME2 = NULL,
    @EndDate DATETIME2 = NULL,
    @IsActive BIT = 1,
    @NewBannerId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @RestaurantId IS NULL OR @RestaurantId <= 0
            THROW 50180, 'RestaurantId is required.', 1;

        IF @BannerTitle IS NULL OR LTRIM(RTRIM(@BannerTitle)) = ''
            THROW 50180, 'BannerTitle cannot be empty.', 1;

        IF @ImageUrl IS NULL OR LTRIM(RTRIM(@ImageUrl)) = ''
            THROW 50180, 'ImageUrl cannot be empty.', 1;

        BEGIN TRANSACTION;

        INSERT INTO dbo.WebsiteBanners (
            RestaurantId,
            BranchId,
            BannerTitle,
            Subtitle,
            BadgeText,
            ButtonText,
            ButtonLink,
            SecondaryButtonText,
            SecondaryButtonLink,
            ImageUrl,
            ImagePublicId,
            MobileImageUrl,
            MobileImagePublicId,
            BannerLocation,
            DisplayOrder,
            StartDate,
            EndDate,
            IsActive,
            CreatedAt,
            UpdatedAt,
            IsDeleted,
            DeletedAt
        )
        VALUES (
            @RestaurantId,
            @BranchId,
            @BannerTitle,
            @Subtitle,
            @BadgeText,
            @ButtonText,
            @ButtonLink,
            @SecondaryButtonText,
            @SecondaryButtonLink,
            @ImageUrl,
            @ImagePublicId,
            @MobileImageUrl,
            @MobileImagePublicId,
            COALESCE(@BannerLocation, 'HOME_HERO'),
            COALESCE(@DisplayOrder, 0),
            @StartDate,
            @EndDate,
            COALESCE(@IsActive, 1),
            SYSUTCDATETIME(),
            SYSUTCDATETIME(),
            0,
            NULL
        );

        SET @NewBannerId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT
            BannerId,
            RestaurantId,
            BranchId,
            BannerTitle,
            Subtitle,
            BadgeText,
            ButtonText,
            ButtonLink,
            SecondaryButtonText,
            SecondaryButtonLink,
            ImageUrl,
            ImagePublicId,
            MobileImageUrl,
            MobileImagePublicId,
            BannerLocation,
            DisplayOrder,
            StartDate,
            EndDate,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM dbo.WebsiteBanners
        WHERE BannerId = @NewBannerId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 181: dbo.usp_CMS_UpdateBanner
-- Description: Updates an existing promotional or hero banner.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_UpdateBanner', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_UpdateBanner;
GO

CREATE PROCEDURE dbo.usp_CMS_UpdateBanner
    @BannerId BIGINT,
    @BannerTitle NVARCHAR(150),
    @Subtitle NVARCHAR(300) = NULL,
    @BadgeText NVARCHAR(60) = NULL,
    @ButtonText NVARCHAR(60) = NULL,
    @ButtonLink NVARCHAR(255) = NULL,
    @SecondaryButtonText NVARCHAR(60) = NULL,
    @SecondaryButtonLink NVARCHAR(255) = NULL,
    @ImageUrl NVARCHAR(500),
    @ImagePublicId NVARCHAR(150) = NULL,
    @MobileImageUrl NVARCHAR(500) = NULL,
    @MobileImagePublicId NVARCHAR(150) = NULL,
    @BannerLocation NVARCHAR(50) = 'HOME_HERO',
    @DisplayOrder INT = 0,
    @StartDate DATETIME2 = NULL,
    @EndDate DATETIME2 = NULL,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.WebsiteBanners WHERE BannerId = @BannerId AND IsDeleted = 0)
            THROW 50181, 'Specified BannerId does not exist.', 1;

        IF @BannerTitle IS NULL OR LTRIM(RTRIM(@BannerTitle)) = ''
            THROW 50181, 'BannerTitle cannot be empty.', 1;

        IF @ImageUrl IS NULL OR LTRIM(RTRIM(@ImageUrl)) = ''
            THROW 50181, 'ImageUrl cannot be empty.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.WebsiteBanners
        SET BannerTitle = @BannerTitle,
            Subtitle = @Subtitle,
            BadgeText = @BadgeText,
            ButtonText = @ButtonText,
            ButtonLink = @ButtonLink,
            SecondaryButtonText = @SecondaryButtonText,
            SecondaryButtonLink = @SecondaryButtonLink,
            ImageUrl = @ImageUrl,
            ImagePublicId = COALESCE(@ImagePublicId, ImagePublicId),
            MobileImageUrl = COALESCE(@MobileImageUrl, MobileImageUrl),
            MobileImagePublicId = COALESCE(@MobileImagePublicId, MobileImagePublicId),
            BannerLocation = COALESCE(@BannerLocation, BannerLocation),
            DisplayOrder = COALESCE(@DisplayOrder, DisplayOrder),
            StartDate = @StartDate,
            EndDate = @EndDate,
            IsActive = COALESCE(@IsActive, IsActive),
            UpdatedAt = SYSUTCDATETIME()
        WHERE BannerId = @BannerId;

        COMMIT TRANSACTION;

        SELECT
            BannerId,
            RestaurantId,
            BranchId,
            BannerTitle,
            Subtitle,
            BadgeText,
            ButtonText,
            ButtonLink,
            SecondaryButtonText,
            SecondaryButtonLink,
            ImageUrl,
            ImagePublicId,
            MobileImageUrl,
            MobileImagePublicId,
            BannerLocation,
            DisplayOrder,
            StartDate,
            EndDate,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM dbo.WebsiteBanners
        WHERE BannerId = @BannerId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 182: dbo.usp_CMS_DeleteBanner
-- Description: Soft deletes a banner record.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_DeleteBanner', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_DeleteBanner;
GO

CREATE PROCEDURE dbo.usp_CMS_DeleteBanner
    @BannerId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.WebsiteBanners WHERE BannerId = @BannerId AND IsDeleted = 0)
            THROW 50182, 'Specified BannerId does not exist or has already been deleted.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.WebsiteBanners
        SET IsDeleted = 1,
            DeletedAt = SYSUTCDATETIME(),
            UpdatedAt = SYSUTCDATETIME()
        WHERE BannerId = @BannerId;

        COMMIT TRANSACTION;

        SELECT @BannerId AS DeletedBannerId, 'DELETED' AS Status;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- SECTION 4: NAVIGATION MENUS (SPs 183–187)
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 183: dbo.usp_CMS_GetPublicNavigation
-- Description: Returns active hierarchical navigation items.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_GetPublicNavigation', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_GetPublicNavigation;
GO

CREATE PROCEDURE dbo.usp_CMS_GetPublicNavigation
    @RestaurantId INT = 1
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        MenuId,
        RestaurantId,
        ParentMenuId,
        MenuLocation,
        Title,
        TargetUrl,
        OpenInNewTab,
        DisplayOrder,
        IsActive,
        IconName
    FROM dbo.NavigationMenus
    WHERE RestaurantId = @RestaurantId
      AND IsActive = 1
    ORDER BY MenuLocation, ParentMenuId, DisplayOrder ASC, MenuId ASC;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 184: dbo.usp_CMS_ListNavigationMenus
-- Description: Admin query returning all navigation items with parent info.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_ListNavigationMenus', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_ListNavigationMenus;
GO

CREATE PROCEDURE dbo.usp_CMS_ListNavigationMenus
    @RestaurantId INT = 1,
    @MenuLocation NVARCHAR(40) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        m.MenuId,
        m.RestaurantId,
        m.ParentMenuId,
        p.Title AS ParentTitle,
        m.MenuLocation,
        m.Title,
        m.TargetUrl,
        m.OpenInNewTab,
        m.DisplayOrder,
        m.IsActive,
        m.IconName,
        m.CreatedAt,
        m.UpdatedAt
    FROM dbo.NavigationMenus m
    LEFT JOIN dbo.NavigationMenus p ON m.ParentMenuId = p.MenuId
    WHERE m.RestaurantId = @RestaurantId
      AND (@MenuLocation IS NULL OR m.MenuLocation = @MenuLocation)
    ORDER BY m.MenuLocation, m.DisplayOrder ASC, m.MenuId ASC;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 185: dbo.usp_CMS_CreateNavigationMenu
-- Description: Adds a new navigation item with optional parent menu link.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_CreateNavigationMenu', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_CreateNavigationMenu;
GO

CREATE PROCEDURE dbo.usp_CMS_CreateNavigationMenu
    @RestaurantId INT,
    @ParentMenuId INT = NULL,
    @MenuLocation NVARCHAR(40) = 'HEADER',
    @Title NVARCHAR(80),
    @TargetUrl NVARCHAR(255),
    @OpenInNewTab BIT = 0,
    @DisplayOrder INT = 0,
    @IconName NVARCHAR(50) = NULL,
    @IsActive BIT = 1,
    @NewMenuId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @RestaurantId IS NULL OR @RestaurantId <= 0
            THROW 50185, 'RestaurantId is required.', 1;

        IF @Title IS NULL OR LTRIM(RTRIM(@Title)) = ''
            THROW 50185, 'Title cannot be empty.', 1;

        IF @TargetUrl IS NULL OR LTRIM(RTRIM(@TargetUrl)) = ''
            THROW 50185, 'TargetUrl cannot be empty.', 1;

        IF @ParentMenuId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.NavigationMenus WHERE MenuId = @ParentMenuId)
            THROW 50185, 'Specified ParentMenuId does not exist.', 1;

        BEGIN TRANSACTION;

        INSERT INTO dbo.NavigationMenus (
            RestaurantId,
            ParentMenuId,
            MenuLocation,
            Title,
            TargetUrl,
            OpenInNewTab,
            DisplayOrder,
            IsActive,
            IconName,
            CreatedAt,
            UpdatedAt
        )
        VALUES (
            @RestaurantId,
            @ParentMenuId,
            COALESCE(@MenuLocation, 'HEADER'),
            @Title,
            @TargetUrl,
            COALESCE(@OpenInNewTab, 0),
            COALESCE(@DisplayOrder, 0),
            COALESCE(@IsActive, 1),
            @IconName,
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        );

        SET @NewMenuId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT
            MenuId,
            RestaurantId,
            ParentMenuId,
            MenuLocation,
            Title,
            TargetUrl,
            OpenInNewTab,
            DisplayOrder,
            IsActive,
            IconName,
            CreatedAt,
            UpdatedAt
        FROM dbo.NavigationMenus
        WHERE MenuId = @NewMenuId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 186: dbo.usp_CMS_UpdateNavigationMenu
-- Description: Updates an existing navigation item.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_UpdateNavigationMenu', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_UpdateNavigationMenu;
GO

CREATE PROCEDURE dbo.usp_CMS_UpdateNavigationMenu
    @MenuId INT,
    @ParentMenuId INT = NULL,
    @MenuLocation NVARCHAR(40) = 'HEADER',
    @Title NVARCHAR(80),
    @TargetUrl NVARCHAR(255),
    @OpenInNewTab BIT = 0,
    @DisplayOrder INT = 0,
    @IsActive BIT = 1,
    @IconName NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.NavigationMenus WHERE MenuId = @MenuId)
            THROW 50186, 'Specified MenuId does not exist.', 1;

        IF @Title IS NULL OR LTRIM(RTRIM(@Title)) = ''
            THROW 50186, 'Title cannot be empty.', 1;

        IF @TargetUrl IS NULL OR LTRIM(RTRIM(@TargetUrl)) = ''
            THROW 50186, 'TargetUrl cannot be empty.', 1;

        -- Prevent self-parent loop
        IF @ParentMenuId = @MenuId
            THROW 50186, 'A menu item cannot be its own parent.', 1;

        IF @ParentMenuId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.NavigationMenus WHERE MenuId = @ParentMenuId)
            THROW 50186, 'Specified ParentMenuId does not exist.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.NavigationMenus
        SET ParentMenuId = @ParentMenuId,
            MenuLocation = COALESCE(@MenuLocation, MenuLocation),
            Title = @Title,
            TargetUrl = @TargetUrl,
            OpenInNewTab = COALESCE(@OpenInNewTab, OpenInNewTab),
            DisplayOrder = COALESCE(@DisplayOrder, DisplayOrder),
            IsActive = COALESCE(@IsActive, IsActive),
            IconName = @IconName,
            UpdatedAt = SYSUTCDATETIME()
        WHERE MenuId = @MenuId;

        COMMIT TRANSACTION;

        SELECT
            MenuId,
            RestaurantId,
            ParentMenuId,
            MenuLocation,
            Title,
            TargetUrl,
            OpenInNewTab,
            DisplayOrder,
            IsActive,
            IconName,
            CreatedAt,
            UpdatedAt
        FROM dbo.NavigationMenus
        WHERE MenuId = @MenuId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 187: dbo.usp_CMS_DeleteNavigationMenu
-- Description: Deletes a navigation item and sets ParentMenuId = NULL on children.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_DeleteNavigationMenu', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_DeleteNavigationMenu;
GO

CREATE PROCEDURE dbo.usp_CMS_DeleteNavigationMenu
    @MenuId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.NavigationMenus WHERE MenuId = @MenuId)
            THROW 50187, 'Specified MenuId does not exist.', 1;

        BEGIN TRANSACTION;

        -- Clear parent references on child items
        UPDATE dbo.NavigationMenus
        SET ParentMenuId = NULL,
            UpdatedAt = SYSUTCDATETIME()
        WHERE ParentMenuId = @MenuId;

        DELETE FROM dbo.NavigationMenus
        WHERE MenuId = @MenuId;

        COMMIT TRANSACTION;

        SELECT @MenuId AS DeletedMenuId, 'DELETED' AS Status;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- SECTION 5: FOOTER SECTIONS (SPs 188–192)
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 188: dbo.usp_CMS_GetPublicFooter
-- Description: Multi-recordset customer query returning:
--              Recordset 1: Active footer columns.
--              Recordset 2: Active social media profile links.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_GetPublicFooter', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_GetPublicFooter;
GO

CREATE PROCEDURE dbo.usp_CMS_GetPublicFooter
    @RestaurantId INT = 1
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 1: Footer Columns
    SELECT
        FooterSectionId,
        RestaurantId,
        SectionTitle,
        ContentType,
        ContentHtml,
        DisplayOrder,
        IsActive
    FROM dbo.FooterSections
    WHERE RestaurantId = @RestaurantId
      AND IsActive = 1
    ORDER BY DisplayOrder ASC, FooterSectionId ASC;

    -- Recordset 2: Social Media Links
    SELECT
        SocialLinkId,
        RestaurantId,
        PlatformName,
        PlatformUrl,
        IconKey,
        DisplayOrder,
        IsActive
    FROM dbo.SocialMediaLinks
    WHERE RestaurantId = @RestaurantId
      AND IsActive = 1
    ORDER BY DisplayOrder ASC, SocialLinkId ASC;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 189: dbo.usp_CMS_ListFooterSections
-- Description: Admin query returning all footer sections.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_ListFooterSections', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_ListFooterSections;
GO

CREATE PROCEDURE dbo.usp_CMS_ListFooterSections
    @RestaurantId INT = 1
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        FooterSectionId,
        RestaurantId,
        SectionTitle,
        ContentType,
        ContentHtml,
        DisplayOrder,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.FooterSections
    WHERE RestaurantId = @RestaurantId
    ORDER BY DisplayOrder ASC, FooterSectionId ASC;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 190: dbo.usp_CMS_CreateFooterSection
-- Description: Creates a new footer column.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_CreateFooterSection', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_CreateFooterSection;
GO

CREATE PROCEDURE dbo.usp_CMS_CreateFooterSection
    @RestaurantId INT,
    @SectionTitle NVARCHAR(80),
    @ContentType NVARCHAR(40) = 'LINKS',
    @ContentHtml NVARCHAR(MAX) = NULL,
    @DisplayOrder INT = 0,
    @IsActive BIT = 1,
    @NewFooterSectionId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @RestaurantId IS NULL OR @RestaurantId <= 0
            THROW 50190, 'RestaurantId is required.', 1;

        IF @SectionTitle IS NULL OR LTRIM(RTRIM(@SectionTitle)) = ''
            THROW 50190, 'SectionTitle cannot be empty.', 1;

        BEGIN TRANSACTION;

        INSERT INTO dbo.FooterSections (
            RestaurantId,
            SectionTitle,
            ContentType,
            ContentHtml,
            DisplayOrder,
            IsActive,
            CreatedAt,
            UpdatedAt
        )
        VALUES (
            @RestaurantId,
            @SectionTitle,
            COALESCE(@ContentType, 'LINKS'),
            @ContentHtml,
            COALESCE(@DisplayOrder, 0),
            COALESCE(@IsActive, 1),
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        );

        SET @NewFooterSectionId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT
            FooterSectionId,
            RestaurantId,
            SectionTitle,
            ContentType,
            ContentHtml,
            DisplayOrder,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM dbo.FooterSections
        WHERE FooterSectionId = @NewFooterSectionId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 191: dbo.usp_CMS_UpdateFooterSection
-- Description: Updates an existing footer column.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_UpdateFooterSection', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_UpdateFooterSection;
GO

CREATE PROCEDURE dbo.usp_CMS_UpdateFooterSection
    @FooterSectionId INT,
    @SectionTitle NVARCHAR(80),
    @ContentType NVARCHAR(40),
    @ContentHtml NVARCHAR(MAX) = NULL,
    @DisplayOrder INT = 0,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.FooterSections WHERE FooterSectionId = @FooterSectionId)
            THROW 50191, 'Specified FooterSectionId does not exist.', 1;

        IF @SectionTitle IS NULL OR LTRIM(RTRIM(@SectionTitle)) = ''
            THROW 50191, 'SectionTitle cannot be empty.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.FooterSections
        SET SectionTitle = @SectionTitle,
            ContentType = COALESCE(@ContentType, ContentType),
            ContentHtml = @ContentHtml,
            DisplayOrder = COALESCE(@DisplayOrder, DisplayOrder),
            IsActive = COALESCE(@IsActive, IsActive),
            UpdatedAt = SYSUTCDATETIME()
        WHERE FooterSectionId = @FooterSectionId;

        COMMIT TRANSACTION;

        SELECT
            FooterSectionId,
            RestaurantId,
            SectionTitle,
            ContentType,
            ContentHtml,
            DisplayOrder,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM dbo.FooterSections
        WHERE FooterSectionId = @FooterSectionId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 192: dbo.usp_CMS_DeleteFooterSection
-- Description: Deletes a footer column.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_DeleteFooterSection', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_DeleteFooterSection;
GO

CREATE PROCEDURE dbo.usp_CMS_DeleteFooterSection
    @FooterSectionId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.FooterSections WHERE FooterSectionId = @FooterSectionId)
            THROW 50192, 'Specified FooterSectionId does not exist.', 1;

        BEGIN TRANSACTION;

        DELETE FROM dbo.FooterSections
        WHERE FooterSectionId = @FooterSectionId;

        COMMIT TRANSACTION;

        SELECT @FooterSectionId AS DeletedFooterSectionId, 'DELETED' AS Status;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- SECTION 6: FAQS & TESTIMONIALS (SPs 193–202)
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 193: dbo.usp_CMS_GetPublicFAQs
-- Description: Customer query returning active non-deleted FAQs grouped by category.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_GetPublicFAQs', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_GetPublicFAQs;
GO

CREATE PROCEDURE dbo.usp_CMS_GetPublicFAQs
    @RestaurantId INT = 1,
    @Category NVARCHAR(60) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        FAQId,
        RestaurantId,
        Category,
        Question,
        Answer,
        DisplayOrder,
        IsActive
    FROM dbo.FAQs
    WHERE RestaurantId = @RestaurantId
      AND IsDeleted = 0
      AND IsActive = 1
      AND (@Category IS NULL OR Category = @Category)
    ORDER BY Category, DisplayOrder ASC, FAQId ASC;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 194: dbo.usp_CMS_ListFAQs
-- Description: Admin query returning non-deleted FAQs with category & search.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_ListFAQs', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_ListFAQs;
GO

CREATE PROCEDURE dbo.usp_CMS_ListFAQs
    @RestaurantId INT = 1,
    @Category NVARCHAR(60) = NULL,
    @Search NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        FAQId,
        RestaurantId,
        Category,
        Question,
        Answer,
        DisplayOrder,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.FAQs
    WHERE RestaurantId = @RestaurantId
      AND IsDeleted = 0
      AND (@Category IS NULL OR Category = @Category)
      AND (@Search IS NULL OR Question LIKE '%' + @Search + '%' OR Answer LIKE '%' + @Search + '%')
    ORDER BY Category, DisplayOrder ASC, FAQId ASC;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 195: dbo.usp_CMS_CreateFAQ
-- Description: Creates a new FAQ entry.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_CreateFAQ', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_CreateFAQ;
GO

CREATE PROCEDURE dbo.usp_CMS_CreateFAQ
    @RestaurantId INT,
    @Category NVARCHAR(60) = 'GENERAL',
    @Question NVARCHAR(300),
    @Answer NVARCHAR(MAX),
    @DisplayOrder INT = 0,
    @IsActive BIT = 1,
    @NewFAQId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @RestaurantId IS NULL OR @RestaurantId <= 0
            THROW 50195, 'RestaurantId is required.', 1;

        IF @Question IS NULL OR LTRIM(RTRIM(@Question)) = ''
            THROW 50195, 'Question cannot be empty.', 1;

        IF @Answer IS NULL OR LTRIM(RTRIM(@Answer)) = ''
            THROW 50195, 'Answer cannot be empty.', 1;

        BEGIN TRANSACTION;

        INSERT INTO dbo.FAQs (
            RestaurantId,
            Category,
            Question,
            Answer,
            DisplayOrder,
            IsActive,
            CreatedAt,
            UpdatedAt,
            IsDeleted,
            DeletedAt
        )
        VALUES (
            @RestaurantId,
            COALESCE(@Category, 'GENERAL'),
            @Question,
            @Answer,
            COALESCE(@DisplayOrder, 0),
            COALESCE(@IsActive, 1),
            SYSUTCDATETIME(),
            SYSUTCDATETIME(),
            0,
            NULL
        );

        SET @NewFAQId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT
            FAQId,
            RestaurantId,
            Category,
            Question,
            Answer,
            DisplayOrder,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM dbo.FAQs
        WHERE FAQId = @NewFAQId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 196: dbo.usp_CMS_UpdateFAQ
-- Description: Updates an existing FAQ.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_UpdateFAQ', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_UpdateFAQ;
GO

CREATE PROCEDURE dbo.usp_CMS_UpdateFAQ
    @FAQId INT,
    @Category NVARCHAR(60),
    @Question NVARCHAR(300),
    @Answer NVARCHAR(MAX),
    @DisplayOrder INT = 0,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.FAQs WHERE FAQId = @FAQId AND IsDeleted = 0)
            THROW 50196, 'Specified FAQId does not exist.', 1;

        IF @Question IS NULL OR LTRIM(RTRIM(@Question)) = ''
            THROW 50196, 'Question cannot be empty.', 1;

        IF @Answer IS NULL OR LTRIM(RTRIM(@Answer)) = ''
            THROW 50196, 'Answer cannot be empty.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.FAQs
        SET Category = COALESCE(@Category, Category),
            Question = @Question,
            Answer = @Answer,
            DisplayOrder = COALESCE(@DisplayOrder, DisplayOrder),
            IsActive = COALESCE(@IsActive, IsActive),
            UpdatedAt = SYSUTCDATETIME()
        WHERE FAQId = @FAQId;

        COMMIT TRANSACTION;

        SELECT
            FAQId,
            RestaurantId,
            Category,
            Question,
            Answer,
            DisplayOrder,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM dbo.FAQs
        WHERE FAQId = @FAQId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 197: dbo.usp_CMS_DeleteFAQ
-- Description: Soft deletes an FAQ.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_DeleteFAQ', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_DeleteFAQ;
GO

CREATE PROCEDURE dbo.usp_CMS_DeleteFAQ
    @FAQId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.FAQs WHERE FAQId = @FAQId AND IsDeleted = 0)
            THROW 50197, 'Specified FAQId does not exist or has already been deleted.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.FAQs
        SET IsDeleted = 1,
            DeletedAt = SYSUTCDATETIME(),
            UpdatedAt = SYSUTCDATETIME()
        WHERE FAQId = @FAQId;

        COMMIT TRANSACTION;

        SELECT @FAQId AS DeletedFAQId, 'DELETED' AS Status;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 198: dbo.usp_CMS_GetPublicTestimonials
-- Description: Customer query returning active non-deleted testimonials.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_GetPublicTestimonials', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_GetPublicTestimonials;
GO

CREATE PROCEDURE dbo.usp_CMS_GetPublicTestimonials
    @RestaurantId INT = 1,
    @FeaturedOnly BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        TestimonialId,
        RestaurantId,
        AuthorName,
        AuthorRole,
        AuthorAvatarUrl,
        Rating,
        ReviewContent,
        SourcePlatform,
        IsFeatured,
        DisplayOrder,
        IsActive
    FROM dbo.Testimonials
    WHERE RestaurantId = @RestaurantId
      AND IsDeleted = 0
      AND IsActive = 1
      AND (@FeaturedOnly = 0 OR IsFeatured = 1)
    ORDER BY DisplayOrder ASC, Rating DESC, TestimonialId DESC;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 199: dbo.usp_CMS_ListTestimonials
-- Description: Admin paginated query listing all non-deleted testimonials.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_ListTestimonials', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_ListTestimonials;
GO

CREATE PROCEDURE dbo.usp_CMS_ListTestimonials
    @RestaurantId INT = 1,
    @Page INT = 1,
    @Limit INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF @Page < 1 SET @Page = 1;
    IF @Limit < 1 SET @Limit = 20;
    IF @Limit > 100 SET @Limit = 100;

    DECLARE @Offset INT = (@Page - 1) * @Limit;

    -- Recordset 1: Total Count
    SELECT COUNT(1) AS TotalCount
    FROM dbo.Testimonials
    WHERE RestaurantId = @RestaurantId
      AND IsDeleted = 0;

    -- Recordset 2: Paginated Data
    SELECT
        TestimonialId,
        RestaurantId,
        AuthorName,
        AuthorRole,
        AuthorAvatarUrl,
        AuthorAvatarPublicId,
        Rating,
        ReviewContent,
        SourcePlatform,
        IsFeatured,
        DisplayOrder,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.Testimonials
    WHERE RestaurantId = @RestaurantId
      AND IsDeleted = 0
    ORDER BY DisplayOrder ASC, TestimonialId DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 200: dbo.usp_CMS_CreateTestimonial
-- Description: Adds a new review with 1–5 star rating validation.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_CreateTestimonial', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_CreateTestimonial;
GO

CREATE PROCEDURE dbo.usp_CMS_CreateTestimonial
    @RestaurantId INT,
    @AuthorName NVARCHAR(100),
    @AuthorRole NVARCHAR(80) = NULL,
    @AuthorAvatarUrl NVARCHAR(500) = NULL,
    @AuthorAvatarPublicId NVARCHAR(150) = NULL,
    @Rating INT = 5,
    @ReviewContent NVARCHAR(1000),
    @SourcePlatform NVARCHAR(50) = 'GOOGLE',
    @IsFeatured BIT = 1,
    @DisplayOrder INT = 0,
    @IsActive BIT = 1,
    @NewTestimonialId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @RestaurantId IS NULL OR @RestaurantId <= 0
            THROW 50200, 'RestaurantId is required.', 1;

        IF @AuthorName IS NULL OR LTRIM(RTRIM(@AuthorName)) = ''
            THROW 50200, 'AuthorName cannot be empty.', 1;

        IF @ReviewContent IS NULL OR LTRIM(RTRIM(@ReviewContent)) = ''
            THROW 50200, 'ReviewContent cannot be empty.', 1;

        -- Validate rating constraint (CK_Testimonials_Rating)
        IF @Rating < 1 OR @Rating > 5
            THROW 50201, 'Testimonial rating must be an integer between 1 and 5.', 1;

        BEGIN TRANSACTION;

        INSERT INTO dbo.Testimonials (
            RestaurantId,
            AuthorName,
            AuthorRole,
            AuthorAvatarUrl,
            AuthorAvatarPublicId,
            Rating,
            ReviewContent,
            SourcePlatform,
            IsFeatured,
            DisplayOrder,
            IsActive,
            CreatedAt,
            UpdatedAt,
            IsDeleted,
            DeletedAt
        )
        VALUES (
            @RestaurantId,
            @AuthorName,
            @AuthorRole,
            @AuthorAvatarUrl,
            @AuthorAvatarPublicId,
            @Rating,
            @ReviewContent,
            COALESCE(@SourcePlatform, 'GOOGLE'),
            COALESCE(@IsFeatured, 1),
            COALESCE(@DisplayOrder, 0),
            COALESCE(@IsActive, 1),
            SYSUTCDATETIME(),
            SYSUTCDATETIME(),
            0,
            NULL
        );

        SET @NewTestimonialId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT
            TestimonialId,
            RestaurantId,
            AuthorName,
            AuthorRole,
            AuthorAvatarUrl,
            AuthorAvatarPublicId,
            Rating,
            ReviewContent,
            SourcePlatform,
            IsFeatured,
            DisplayOrder,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM dbo.Testimonials
        WHERE TestimonialId = @NewTestimonialId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 201: dbo.usp_CMS_UpdateTestimonial
-- Description: Updates an existing review with 1–5 rating validation.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_UpdateTestimonial', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_UpdateTestimonial;
GO

CREATE PROCEDURE dbo.usp_CMS_UpdateTestimonial
    @TestimonialId BIGINT,
    @AuthorName NVARCHAR(100),
    @AuthorRole NVARCHAR(80) = NULL,
    @AuthorAvatarUrl NVARCHAR(500) = NULL,
    @AuthorAvatarPublicId NVARCHAR(150) = NULL,
    @Rating INT = 5,
    @ReviewContent NVARCHAR(1000),
    @SourcePlatform NVARCHAR(50) = NULL,
    @IsFeatured BIT = 1,
    @DisplayOrder INT = 0,
    @IsActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Testimonials WHERE TestimonialId = @TestimonialId AND IsDeleted = 0)
            THROW 50201, 'Specified TestimonialId does not exist.', 1;

        IF @AuthorName IS NULL OR LTRIM(RTRIM(@AuthorName)) = ''
            THROW 50201, 'AuthorName cannot be empty.', 1;

        IF @ReviewContent IS NULL OR LTRIM(RTRIM(@ReviewContent)) = ''
            THROW 50201, 'ReviewContent cannot be empty.', 1;

        -- Validate rating constraint
        IF @Rating < 1 OR @Rating > 5
            THROW 50201, 'Testimonial rating must be an integer between 1 and 5.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.Testimonials
        SET AuthorName = @AuthorName,
            AuthorRole = @AuthorRole,
            AuthorAvatarUrl = COALESCE(@AuthorAvatarUrl, AuthorAvatarUrl),
            AuthorAvatarPublicId = COALESCE(@AuthorAvatarPublicId, AuthorAvatarPublicId),
            Rating = @Rating,
            ReviewContent = @ReviewContent,
            SourcePlatform = COALESCE(@SourcePlatform, SourcePlatform),
            IsFeatured = COALESCE(@IsFeatured, IsFeatured),
            DisplayOrder = COALESCE(@DisplayOrder, DisplayOrder),
            IsActive = COALESCE(@IsActive, IsActive),
            UpdatedAt = SYSUTCDATETIME()
        WHERE TestimonialId = @TestimonialId;

        COMMIT TRANSACTION;

        SELECT
            TestimonialId,
            RestaurantId,
            AuthorName,
            AuthorRole,
            AuthorAvatarUrl,
            AuthorAvatarPublicId,
            Rating,
            ReviewContent,
            SourcePlatform,
            IsFeatured,
            DisplayOrder,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM dbo.Testimonials
        WHERE TestimonialId = @TestimonialId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 202: dbo.usp_CMS_DeleteTestimonial
-- Description: Soft deletes a testimonial.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_DeleteTestimonial', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_DeleteTestimonial;
GO

CREATE PROCEDURE dbo.usp_CMS_DeleteTestimonial
    @TestimonialId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Testimonials WHERE TestimonialId = @TestimonialId AND IsDeleted = 0)
            THROW 50202, 'Specified TestimonialId does not exist or has already been deleted.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.Testimonials
        SET IsDeleted = 1,
            DeletedAt = SYSUTCDATETIME(),
            UpdatedAt = SYSUTCDATETIME()
        WHERE TestimonialId = @TestimonialId;

        COMMIT TRANSACTION;

        SELECT @TestimonialId AS DeletedTestimonialId, 'DELETED' AS Status;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- SECTION 7: SOCIAL MEDIA LINKS (SPs 203–205)
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 203: dbo.usp_CMS_ListSocialLinks
-- Description: Lists all configured social media platform links.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_ListSocialLinks', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_ListSocialLinks;
GO

CREATE PROCEDURE dbo.usp_CMS_ListSocialLinks
    @RestaurantId INT = 1,
    @ActiveOnly BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        SocialLinkId,
        RestaurantId,
        PlatformName,
        PlatformUrl,
        IconKey,
        DisplayOrder,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.SocialMediaLinks
    WHERE RestaurantId = @RestaurantId
      AND (@ActiveOnly = 0 OR IsActive = 1)
    ORDER BY DisplayOrder ASC, SocialLinkId ASC;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 204: dbo.usp_CMS_SaveSocialMediaLink
-- Description: Atomic UPSERT for social media channels.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_SaveSocialMediaLink', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_SaveSocialMediaLink;
GO

CREATE PROCEDURE dbo.usp_CMS_SaveSocialMediaLink
    @RestaurantId INT,
    @SocialLinkId INT = NULL,
    @PlatformName NVARCHAR(50),
    @PlatformUrl NVARCHAR(500),
    @IconKey NVARCHAR(50),
    @DisplayOrder INT = 0,
    @IsActive BIT = 1,
    @ResultSocialLinkId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @RestaurantId IS NULL OR @RestaurantId <= 0
            THROW 50204, 'RestaurantId is required.', 1;

        IF @PlatformName IS NULL OR LTRIM(RTRIM(@PlatformName)) = ''
            THROW 50204, 'PlatformName cannot be empty.', 1;

        IF @PlatformUrl IS NULL OR LTRIM(RTRIM(@PlatformUrl)) = ''
            THROW 50204, 'PlatformUrl cannot be empty.', 1;

        IF @IconKey IS NULL OR LTRIM(RTRIM(@IconKey)) = ''
            THROW 50204, 'IconKey cannot be empty.', 1;

        BEGIN TRANSACTION;

        IF @SocialLinkId IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.SocialMediaLinks WHERE SocialLinkId = @SocialLinkId)
        BEGIN
            UPDATE dbo.SocialMediaLinks
            SET PlatformName = @PlatformName,
                PlatformUrl = @PlatformUrl,
                IconKey = @IconKey,
                DisplayOrder = COALESCE(@DisplayOrder, DisplayOrder),
                IsActive = COALESCE(@IsActive, IsActive),
                UpdatedAt = SYSUTCDATETIME()
            WHERE SocialLinkId = @SocialLinkId;

            SET @ResultSocialLinkId = @SocialLinkId;
        END
        ELSE
        BEGIN
            INSERT INTO dbo.SocialMediaLinks (
                RestaurantId,
                PlatformName,
                PlatformUrl,
                IconKey,
                DisplayOrder,
                IsActive,
                CreatedAt,
                UpdatedAt
            )
            VALUES (
                @RestaurantId,
                @PlatformName,
                @PlatformUrl,
                @IconKey,
                COALESCE(@DisplayOrder, 0),
                COALESCE(@IsActive, 1),
                SYSUTCDATETIME(),
                SYSUTCDATETIME()
            );

            SET @ResultSocialLinkId = SCOPE_IDENTITY();
        END

        COMMIT TRANSACTION;

        SELECT
            SocialLinkId,
            RestaurantId,
            PlatformName,
            PlatformUrl,
            IconKey,
            DisplayOrder,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM dbo.SocialMediaLinks
        WHERE SocialLinkId = @ResultSocialLinkId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 205: dbo.usp_CMS_DeleteSocialMediaLink
-- Description: Deletes a social media channel link.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_DeleteSocialMediaLink', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_DeleteSocialMediaLink;
GO

CREATE PROCEDURE dbo.usp_CMS_DeleteSocialMediaLink
    @SocialLinkId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.SocialMediaLinks WHERE SocialLinkId = @SocialLinkId)
            THROW 50205, 'Specified SocialLinkId does not exist.', 1;

        BEGIN TRANSACTION;

        DELETE FROM dbo.SocialMediaLinks
        WHERE SocialLinkId = @SocialLinkId;

        COMMIT TRANSACTION;

        SELECT @SocialLinkId AS DeletedSocialLinkId, 'DELETED' AS Status;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================================
-- SECTION 8: CONTACT MESSAGES & INQUIRIES (SPs 206–209)
-- ============================================================================

-------------------------------------------------------------------------------
-- PROCEDURE 206: dbo.usp_CMS_SubmitContactMessage
-- Description: Inserts guest inquiry into dbo.ContactMessages.
--
-- STRICT BOUNDARY RULE:
-- This procedure writes EXCLUSIVELY to dbo.ContactMessages.
-- It NEVER inserts into dbo.Notifications.
-- Real-time notification dispatch is handled by Node.js service via REST.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_SubmitContactMessage', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_SubmitContactMessage;
GO

CREATE PROCEDURE dbo.usp_CMS_SubmitContactMessage
    @BranchId INT = NULL,
    @SenderName NVARCHAR(100),
    @SenderEmail NVARCHAR(120),
    @SenderPhone NVARCHAR(25) = NULL,
    @Subject NVARCHAR(150),
    @InquiryType NVARCHAR(50) = 'GENERAL',
    @MessageBody NVARCHAR(2000),
    @NewMessageId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @SenderName IS NULL OR LTRIM(RTRIM(@SenderName)) = ''
            THROW 50206, 'SenderName cannot be empty.', 1;

        IF @SenderEmail IS NULL OR LTRIM(RTRIM(@SenderEmail)) = ''
            THROW 50206, 'SenderEmail cannot be empty.', 1;

        IF @Subject IS NULL OR LTRIM(RTRIM(@Subject)) = ''
            THROW 50206, 'Subject cannot be empty.', 1;

        IF @MessageBody IS NULL OR LTRIM(RTRIM(@MessageBody)) = ''
            THROW 50206, 'MessageBody cannot be empty.', 1;

        IF @BranchId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchId = @BranchId)
            THROW 50206, 'Specified BranchId does not exist.', 1;

        BEGIN TRANSACTION;

        -- Strictly write ONLY to dbo.ContactMessages
        INSERT INTO dbo.ContactMessages (
            BranchId,
            SenderName,
            SenderEmail,
            SenderPhone,
            Subject,
            InquiryType,
            MessageBody,
            Status,
            AdminReplyNotes,
            RepliedByUserId,
            RepliedAt,
            CreatedAt,
            IsDeleted,
            DeletedAt
        )
        VALUES (
            @BranchId,
            @SenderName,
            @SenderEmail,
            @SenderPhone,
            @Subject,
            COALESCE(@InquiryType, 'GENERAL'),
            @MessageBody,
            'UNREAD',
            NULL,
            NULL,
            NULL,
            SYSUTCDATETIME(),
            0,
            NULL
        );

        SET @NewMessageId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT
            MessageId,
            BranchId,
            SenderName,
            SenderEmail,
            SenderPhone,
            Subject,
            InquiryType,
            MessageBody,
            Status,
            CreatedAt
        FROM dbo.ContactMessages
        WHERE MessageId = @NewMessageId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 207: dbo.usp_CMS_ListContactMessages
-- Description: Admin paginated query listing contact inquiries with filters.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_ListContactMessages', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_ListContactMessages;
GO

CREATE PROCEDURE dbo.usp_CMS_ListContactMessages
    @BranchId INT = NULL,
    @Status NVARCHAR(30) = NULL,
    @InquiryType NVARCHAR(50) = NULL,
    @Page INT = 1,
    @Limit INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF @Page < 1 SET @Page = 1;
    IF @Limit < 1 SET @Limit = 20;
    IF @Limit > 100 SET @Limit = 100;

    DECLARE @Offset INT = (@Page - 1) * @Limit;

    -- Recordset 1: Total Count
    SELECT COUNT(1) AS TotalCount
    FROM dbo.ContactMessages
    WHERE IsDeleted = 0
      AND (@BranchId IS NULL OR BranchId = @BranchId)
      AND (@Status IS NULL OR Status = @Status)
      AND (@InquiryType IS NULL OR InquiryType = @InquiryType);

    -- Recordset 2: Paginated Data
    SELECT
        m.MessageId,
        m.BranchId,
        b.BranchName,
        m.SenderName,
        m.SenderEmail,
        m.SenderPhone,
        m.Subject,
        m.InquiryType,
        m.MessageBody,
        m.Status,
        m.AdminReplyNotes,
        m.RepliedByUserId,
        LTRIM(RTRIM(CONCAT(u.FirstName, ' ', u.LastName))) AS RepliedByUserName,
        m.RepliedAt,
        m.CreatedAt
    FROM dbo.ContactMessages m
    LEFT JOIN dbo.Branches b ON m.BranchId = b.BranchId
    LEFT JOIN dbo.Users u ON m.RepliedByUserId = u.UserId
    WHERE m.IsDeleted = 0
      AND (@BranchId IS NULL OR m.BranchId = @BranchId)
      AND (@Status IS NULL OR m.Status = @Status)
      AND (@InquiryType IS NULL OR m.InquiryType = @InquiryType)
    ORDER BY m.CreatedAt DESC, m.MessageId DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

    RETURN 0;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 208: dbo.usp_CMS_GetContactMessageById
-- Description: Retrieves single inquiry detail and transitions UNREAD -> READ.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_GetContactMessageById', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_GetContactMessageById;
GO

CREATE PROCEDURE dbo.usp_CMS_GetContactMessageById
    @MessageId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.ContactMessages WHERE MessageId = @MessageId AND IsDeleted = 0)
            THROW 50208, 'Specified MessageId does not exist.', 1;

        -- Automatically mark UNREAD message as READ upon inspection
        IF EXISTS (SELECT 1 FROM dbo.ContactMessages WHERE MessageId = @MessageId AND Status = 'UNREAD')
        BEGIN
            UPDATE dbo.ContactMessages
            SET Status = 'READ'
            WHERE MessageId = @MessageId;
        END

        SELECT
            m.MessageId,
            m.BranchId,
            b.BranchName,
            m.SenderName,
            m.SenderEmail,
            m.SenderPhone,
            m.Subject,
            m.InquiryType,
            m.MessageBody,
            m.Status,
            m.AdminReplyNotes,
            m.RepliedByUserId,
            LTRIM(RTRIM(CONCAT(u.FirstName, ' ', u.LastName))) AS RepliedByUserName,
            m.RepliedAt,
            m.CreatedAt
        FROM dbo.ContactMessages m
        LEFT JOIN dbo.Branches b ON m.BranchId = b.BranchId
        LEFT JOIN dbo.Users u ON m.RepliedByUserId = u.UserId
        WHERE m.MessageId = @MessageId AND m.IsDeleted = 0;

        RETURN 0;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH;
END;
GO

-------------------------------------------------------------------------------
-- PROCEDURE 209: dbo.usp_CMS_ReplyContactMessage
-- Description: Records staff resolution notes and sets Status = 'REPLIED'.
-------------------------------------------------------------------------------
IF OBJECT_ID('dbo.usp_CMS_ReplyContactMessage', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CMS_ReplyContactMessage;
GO

CREATE PROCEDURE dbo.usp_CMS_ReplyContactMessage
    @MessageId BIGINT,
    @AdminReplyNotes NVARCHAR(1000),
    @RepliedByUserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.ContactMessages WHERE MessageId = @MessageId AND IsDeleted = 0)
            THROW 50209, 'Specified MessageId does not exist.', 1;

        IF @AdminReplyNotes IS NULL OR LTRIM(RTRIM(@AdminReplyNotes)) = ''
            THROW 50209, 'AdminReplyNotes cannot be empty.', 1;

        IF @RepliedByUserId IS NULL OR NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserId = @RepliedByUserId)
            THROW 50209, 'Valid RepliedByUserId is required.', 1;

        BEGIN TRANSACTION;

        UPDATE dbo.ContactMessages
        SET AdminReplyNotes = @AdminReplyNotes,
            Status = 'REPLIED',
            RepliedByUserId = @RepliedByUserId,
            RepliedAt = SYSUTCDATETIME()
        WHERE MessageId = @MessageId;

        COMMIT TRANSACTION;

        SELECT
            m.MessageId,
            m.Status,
            m.AdminReplyNotes,
            m.RepliedByUserId,
            LTRIM(RTRIM(CONCAT(u.FirstName, ' ', u.LastName))) AS RepliedByUserName,
            m.RepliedAt
        FROM dbo.ContactMessages m
        LEFT JOIN dbo.Users u ON m.RepliedByUserId = u.UserId
        WHERE m.MessageId = @MessageId;

        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO
