-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS) - RESTAURANT & FLOOR STORED PROCEDURES
-- File: database/08_RestaurantFloorStoredProcedures.sql
-- Description: Stored procedures for pure stored-procedure-based Restaurant,
--              Branch, Dining Section, Table & Floor operations.
-- Database: RestaurantManagementDB
-- Engine: Microsoft SQL Server 2019 / 2022
-- ============================================================================

USE [RestaurantManagementDB];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- 1. RESTAURANT MANAGEMENT PROCEDURES
-- ============================================================================

-- 1.1 usp_Restaurant_Create
CREATE OR ALTER PROCEDURE dbo.usp_Restaurant_Create
    @RestaurantName NVARCHAR(120),
    @LegalEntityName NVARCHAR(150) = NULL,
    @TaxIdentificationNumber NVARCHAR(50) = NULL,
    @PrimaryContactEmail NVARCHAR(120),
    @PrimaryContactPhone NVARCHAR(25),
    @WebsiteUrl NVARCHAR(255) = NULL,
    @LogoUrl NVARCHAR(500) = NULL,
    @DefaultCurrency NVARCHAR(10) = 'INR',
    @DefaultTimezone NVARCHAR(50) = 'India Standard Time'
AS
BEGIN
    SET NOCOUNT ON;

    -- Check for duplicate non-deleted restaurant email
    IF EXISTS (
        SELECT 1 FROM dbo.Restaurants 
        WHERE PrimaryContactEmail = @PrimaryContactEmail 
          AND IsDeleted = 0
    )
    BEGIN
        RAISERROR('A restaurant with this contact email already exists.', 16, 1);
        RETURN;
    END;

    INSERT INTO dbo.Restaurants (
        RestaurantName,
        LegalEntityName,
        TaxIdentificationNumber,
        PrimaryContactEmail,
        PrimaryContactPhone,
        WebsiteUrl,
        LogoUrl,
        DefaultCurrency,
        DefaultTimezone,
        IsActive,
        CreatedAt,
        UpdatedAt,
        IsDeleted
    ) VALUES (
        @RestaurantName,
        @LegalEntityName,
        @TaxIdentificationNumber,
        @PrimaryContactEmail,
        @PrimaryContactPhone,
        @WebsiteUrl,
        @LogoUrl,
        ISNULL(@DefaultCurrency, 'INR'),
        ISNULL(@DefaultTimezone, 'India Standard Time'),
        1,
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        0
    );

    DECLARE @NewRestaurantId INT = SCOPE_IDENTITY();

    SELECT 
        RestaurantId,
        RestaurantName,
        LegalEntityName,
        TaxIdentificationNumber,
        PrimaryContactEmail,
        PrimaryContactPhone,
        WebsiteUrl,
        LogoUrl,
        DefaultCurrency,
        DefaultTimezone,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.Restaurants
    WHERE RestaurantId = @NewRestaurantId;
END;
GO

-- 1.2 usp_Restaurant_Update
CREATE OR ALTER PROCEDURE dbo.usp_Restaurant_Update
    @RestaurantId INT,
    @RestaurantName NVARCHAR(120),
    @LegalEntityName NVARCHAR(150) = NULL,
    @TaxIdentificationNumber NVARCHAR(50) = NULL,
    @PrimaryContactEmail NVARCHAR(120),
    @PrimaryContactPhone NVARCHAR(25),
    @WebsiteUrl NVARCHAR(255) = NULL,
    @LogoUrl NVARCHAR(500) = NULL,
    @DefaultCurrency NVARCHAR(10) = 'INR',
    @DefaultTimezone NVARCHAR(50) = 'India Standard Time'
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Restaurants WHERE RestaurantId = @RestaurantId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Restaurant not found.', 16, 1);
        RETURN;
    END;

    -- Ensure email uniqueness against other restaurants
    IF EXISTS (
        SELECT 1 FROM dbo.Restaurants 
        WHERE PrimaryContactEmail = @PrimaryContactEmail 
          AND RestaurantId <> @RestaurantId 
          AND IsDeleted = 0
    )
    BEGIN
        RAISERROR('Another restaurant with this contact email already exists.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.Restaurants
    SET RestaurantName = @RestaurantName,
        LegalEntityName = @LegalEntityName,
        TaxIdentificationNumber = @TaxIdentificationNumber,
        PrimaryContactEmail = @PrimaryContactEmail,
        PrimaryContactPhone = @PrimaryContactPhone,
        WebsiteUrl = @WebsiteUrl,
        LogoUrl = @LogoUrl,
        DefaultCurrency = ISNULL(@DefaultCurrency, DefaultCurrency),
        DefaultTimezone = ISNULL(@DefaultTimezone, DefaultTimezone),
        UpdatedAt = SYSUTCDATETIME()
    WHERE RestaurantId = @RestaurantId;

    SELECT 
        RestaurantId,
        RestaurantName,
        LegalEntityName,
        TaxIdentificationNumber,
        PrimaryContactEmail,
        PrimaryContactPhone,
        WebsiteUrl,
        LogoUrl,
        DefaultCurrency,
        DefaultTimezone,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.Restaurants
    WHERE RestaurantId = @RestaurantId;
END;
GO

-- 1.3 usp_Restaurant_GetById
CREATE OR ALTER PROCEDURE dbo.usp_Restaurant_GetById
    @RestaurantId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 0: Restaurant Core Record
    SELECT 
        RestaurantId,
        RestaurantName,
        LegalEntityName,
        TaxIdentificationNumber,
        PrimaryContactEmail,
        PrimaryContactPhone,
        WebsiteUrl,
        LogoUrl,
        DefaultCurrency,
        DefaultTimezone,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.Restaurants
    WHERE RestaurantId = @RestaurantId 
      AND IsDeleted = 0;

    -- Recordset 1: Associated Branches
    SELECT 
        BranchId,
        BranchCode,
        BranchName,
        City,
        StateProvince,
        Phone,
        Email,
        OpeningTime,
        ClosingTime,
        IsMainBranch,
        IsActive
    FROM dbo.Branches
    WHERE RestaurantId = @RestaurantId 
      AND IsDeleted = 0
    ORDER BY IsMainBranch DESC, BranchName ASC;
END;
GO

-- 1.4 usp_Restaurant_List
CREATE OR ALTER PROCEDURE dbo.usp_Restaurant_List
    @IsActive BIT = NULL,
    @Search NVARCHAR(100) = NULL,
    @Page INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    -- Total count query
    SELECT COUNT(1) AS TotalCount
    FROM dbo.Restaurants r
    WHERE r.IsDeleted = 0
      AND (@IsActive IS NULL OR r.IsActive = @IsActive)
      AND (@Search IS NULL OR r.RestaurantName LIKE '%' + @Search + '%' OR r.PrimaryContactEmail LIKE '%' + @Search + '%');

    -- Paginated recordset with branch counts
    SELECT 
        r.RestaurantId,
        r.RestaurantName,
        r.LegalEntityName,
        r.TaxIdentificationNumber,
        r.PrimaryContactEmail,
        r.PrimaryContactPhone,
        r.WebsiteUrl,
        r.LogoUrl,
        r.DefaultCurrency,
        r.DefaultTimezone,
        r.IsActive,
        r.CreatedAt,
        r.UpdatedAt,
        (SELECT COUNT(1) FROM dbo.Branches b WHERE b.RestaurantId = r.RestaurantId AND b.IsDeleted = 0) AS BranchCount
    FROM dbo.Restaurants r
    WHERE r.IsDeleted = 0
      AND (@IsActive IS NULL OR r.IsActive = @IsActive)
      AND (@Search IS NULL OR r.RestaurantName LIKE '%' + @Search + '%' OR r.PrimaryContactEmail LIKE '%' + @Search + '%')
    ORDER BY r.RestaurantId ASC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;
GO

-- 1.5 usp_Restaurant_SetStatus
CREATE OR ALTER PROCEDURE dbo.usp_Restaurant_SetStatus
    @RestaurantId INT,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Restaurants WHERE RestaurantId = @RestaurantId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Restaurant not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.Restaurants
    SET IsActive = @IsActive,
        UpdatedAt = SYSUTCDATETIME()
    WHERE RestaurantId = @RestaurantId;

    SELECT 
        RestaurantId,
        RestaurantName,
        IsActive,
        UpdatedAt
    FROM dbo.Restaurants
    WHERE RestaurantId = @RestaurantId;
END;
GO

-- ============================================================================
-- 2. BRANCH MANAGEMENT PROCEDURES
-- ============================================================================

-- 2.1 usp_Branch_Create
CREATE OR ALTER PROCEDURE dbo.usp_Branch_Create
    @RestaurantId INT,
    @BranchCode NVARCHAR(30),
    @BranchName NVARCHAR(120),
    @AddressLine1 NVARCHAR(200),
    @AddressLine2 NVARCHAR(200) = NULL,
    @City NVARCHAR(80),
    @StateProvince NVARCHAR(80),
    @PostalCode NVARCHAR(20),
    @Country NVARCHAR(80) = 'India',
    @Latitude DECIMAL(9,6) = NULL,
    @Longitude DECIMAL(9,6) = NULL,
    @Phone NVARCHAR(25),
    @Email NVARCHAR(120) = NULL,
    @OpeningTime TIME(0) = '09:00:00',
    @ClosingTime TIME(0) = '23:00:00',
    @IsMainBranch BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Restaurants WHERE RestaurantId = @RestaurantId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Restaurant not found.', 16, 1);
        RETURN;
    END;

    IF EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchCode = @BranchCode AND IsDeleted = 0)
    BEGIN
        RAISERROR('Branch code already in use.', 16, 1);
        RETURN;
    END;

    -- If this is marked main branch, reset existing main branches for this restaurant
    IF @IsMainBranch = 1
    BEGIN
        UPDATE dbo.Branches
        SET IsMainBranch = 0,
            UpdatedAt = SYSUTCDATETIME()
        WHERE RestaurantId = @RestaurantId AND IsMainBranch = 1;
    END;

    INSERT INTO dbo.Branches (
        RestaurantId,
        BranchCode,
        BranchName,
        AddressLine1,
        AddressLine2,
        City,
        StateProvince,
        PostalCode,
        Country,
        Latitude,
        Longitude,
        Phone,
        Email,
        OpeningTime,
        ClosingTime,
        IsMainBranch,
        IsActive,
        CreatedAt,
        UpdatedAt,
        IsDeleted
    ) VALUES (
        @RestaurantId,
        @BranchCode,
        @BranchName,
        @AddressLine1,
        @AddressLine2,
        @City,
        @StateProvince,
        @PostalCode,
        ISNULL(@Country, 'India'),
        @Latitude,
        @Longitude,
        @Phone,
        @Email,
        ISNULL(@OpeningTime, '09:00:00'),
        ISNULL(@ClosingTime, '23:00:00'),
        ISNULL(@IsMainBranch, 0),
        1,
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        0
    );

    DECLARE @NewBranchId INT = SCOPE_IDENTITY();

    SELECT 
        BranchId,
        RestaurantId,
        BranchCode,
        BranchName,
        AddressLine1,
        AddressLine2,
        City,
        StateProvince,
        PostalCode,
        Country,
        Latitude,
        Longitude,
        Phone,
        Email,
        OpeningTime,
        ClosingTime,
        IsMainBranch,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.Branches
    WHERE BranchId = @NewBranchId;
END;
GO

-- 2.2 usp_Branch_Update
CREATE OR ALTER PROCEDURE dbo.usp_Branch_Update
    @BranchId INT,
    @BranchName NVARCHAR(120),
    @AddressLine1 NVARCHAR(200),
    @AddressLine2 NVARCHAR(200) = NULL,
    @City NVARCHAR(80),
    @StateProvince NVARCHAR(80),
    @PostalCode NVARCHAR(20),
    @Country NVARCHAR(80) = 'India',
    @Latitude DECIMAL(9,6) = NULL,
    @Longitude DECIMAL(9,6) = NULL,
    @Phone NVARCHAR(25),
    @Email NVARCHAR(120) = NULL,
    @OpeningTime TIME(0) = '09:00:00',
    @ClosingTime TIME(0) = '23:00:00',
    @IsMainBranch BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @RestaurantId INT;
    SELECT @RestaurantId = RestaurantId 
    FROM dbo.Branches 
    WHERE BranchId = @BranchId AND IsDeleted = 0;

    IF @RestaurantId IS NULL
    BEGIN
        RAISERROR('Branch not found.', 16, 1);
        RETURN;
    END;

    -- If marked as main branch, demote any other main branch of same restaurant
    IF @IsMainBranch = 1
    BEGIN
        UPDATE dbo.Branches
        SET IsMainBranch = 0,
            UpdatedAt = SYSUTCDATETIME()
        WHERE RestaurantId = @RestaurantId 
          AND BranchId <> @BranchId 
          AND IsMainBranch = 1;
    END;

    UPDATE dbo.Branches
    SET BranchName = @BranchName,
        AddressLine1 = @AddressLine1,
        AddressLine2 = @AddressLine2,
        City = @City,
        StateProvince = @StateProvince,
        PostalCode = @PostalCode,
        Country = ISNULL(@Country, Country),
        Latitude = @Latitude,
        Longitude = @Longitude,
        Phone = @Phone,
        Email = @Email,
        OpeningTime = ISNULL(@OpeningTime, OpeningTime),
        ClosingTime = ISNULL(@ClosingTime, ClosingTime),
        IsMainBranch = ISNULL(@IsMainBranch, IsMainBranch),
        UpdatedAt = SYSUTCDATETIME()
    WHERE BranchId = @BranchId;

    SELECT 
        BranchId,
        RestaurantId,
        BranchCode,
        BranchName,
        AddressLine1,
        AddressLine2,
        City,
        StateProvince,
        PostalCode,
        Country,
        Latitude,
        Longitude,
        Phone,
        Email,
        OpeningTime,
        ClosingTime,
        IsMainBranch,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.Branches
    WHERE BranchId = @BranchId;
END;
GO

-- 2.3 usp_Branch_GetById
CREATE OR ALTER PROCEDURE dbo.usp_Branch_GetById
    @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 0: Branch Details with Restaurant Header
    SELECT 
        b.BranchId,
        b.RestaurantId,
        r.RestaurantName,
        r.DefaultCurrency,
        r.DefaultTimezone,
        b.BranchCode,
        b.BranchName,
        b.AddressLine1,
        b.AddressLine2,
        b.City,
        b.StateProvince,
        b.PostalCode,
        b.Country,
        b.Latitude,
        b.Longitude,
        b.Phone,
        b.Email,
        b.OpeningTime,
        b.ClosingTime,
        b.IsMainBranch,
        b.IsActive,
        b.CreatedAt,
        b.UpdatedAt,
        (SELECT COUNT(1) FROM dbo.DiningSections s WHERE s.BranchId = b.BranchId AND s.IsActive = 1) AS ActiveSectionCount,
        (SELECT COUNT(1) FROM dbo.RestaurantTables t WHERE t.BranchId = b.BranchId AND t.IsDeleted = 0 AND t.IsActive = 1) AS ActiveTableCount
    FROM dbo.Branches b
    JOIN dbo.Restaurants r ON b.RestaurantId = r.RestaurantId
    WHERE b.BranchId = @BranchId 
      AND b.IsDeleted = 0;

    -- Recordset 1: Dining Sections
    SELECT 
        s.SectionId,
        s.SectionName,
        s.FloorLevel,
        s.DisplayOrder,
        s.IsActive,
        (SELECT COUNT(1) FROM dbo.RestaurantTables t WHERE t.SectionId = s.SectionId AND t.IsDeleted = 0) AS TableCount
    FROM dbo.DiningSections s
    WHERE s.BranchId = @BranchId
    ORDER BY s.FloorLevel ASC, s.DisplayOrder ASC;
END;
GO

-- 2.4 usp_Branch_List
CREATE OR ALTER PROCEDURE dbo.usp_Branch_List
    @RestaurantId INT = NULL,
    @IsActive BIT = NULL,
    @Search NVARCHAR(100) = NULL,
    @Page INT = 1,
    @PageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    -- Total count
    SELECT COUNT(1) AS TotalCount
    FROM dbo.Branches b
    WHERE b.IsDeleted = 0
      AND (@RestaurantId IS NULL OR b.RestaurantId = @RestaurantId)
      AND (@IsActive IS NULL OR b.IsActive = @IsActive)
      AND (@Search IS NULL OR b.BranchName LIKE '%' + @Search + '%' OR b.BranchCode LIKE '%' + @Search + '%' OR b.City LIKE '%' + @Search + '%');

    -- Paginated list
    SELECT 
        b.BranchId,
        b.RestaurantId,
        r.RestaurantName,
        b.BranchCode,
        b.BranchName,
        b.AddressLine1,
        b.AddressLine2,
        b.City,
        b.StateProvince,
        b.PostalCode,
        b.Country,
        b.Latitude,
        b.Longitude,
        b.Phone,
        b.Email,
        b.OpeningTime,
        b.ClosingTime,
        b.IsMainBranch,
        b.IsActive,
        b.CreatedAt,
        b.UpdatedAt,
        (SELECT COUNT(1) FROM dbo.DiningSections s WHERE s.BranchId = b.BranchId AND s.IsActive = 1) AS ActiveSectionCount,
        (SELECT COUNT(1) FROM dbo.RestaurantTables t WHERE t.BranchId = b.BranchId AND t.IsDeleted = 0 AND t.IsActive = 1) AS ActiveTableCount
    FROM dbo.Branches b
    JOIN dbo.Restaurants r ON b.RestaurantId = r.RestaurantId
    WHERE b.IsDeleted = 0
      AND (@RestaurantId IS NULL OR b.RestaurantId = @RestaurantId)
      AND (@IsActive IS NULL OR b.IsActive = @IsActive)
      AND (@Search IS NULL OR b.BranchName LIKE '%' + @Search + '%' OR b.BranchCode LIKE '%' + @Search + '%' OR b.City LIKE '%' + @Search + '%')
    ORDER BY b.IsMainBranch DESC, b.BranchName ASC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;
GO

-- 2.5 usp_Branch_SetStatus
CREATE OR ALTER PROCEDURE dbo.usp_Branch_SetStatus
    @BranchId INT,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchId = @BranchId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Branch not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.Branches
    SET IsActive = @IsActive,
        UpdatedAt = SYSUTCDATETIME()
    WHERE BranchId = @BranchId;

    SELECT 
        BranchId,
        BranchName,
        BranchCode,
        IsActive,
        UpdatedAt
    FROM dbo.Branches
    WHERE BranchId = @BranchId;
END;
GO

-- ============================================================================
-- 3. DINING SECTION MANAGEMENT PROCEDURES
-- ============================================================================

-- 3.1 usp_DiningSection_Create
CREATE OR ALTER PROCEDURE dbo.usp_DiningSection_Create
    @BranchId INT,
    @SectionName NVARCHAR(60),
    @FloorLevel INT = 1,
    @DisplayOrder INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchId = @BranchId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Branch not found.', 16, 1);
        RETURN;
    END;

    INSERT INTO dbo.DiningSections (
        BranchId,
        SectionName,
        FloorLevel,
        DisplayOrder,
        IsActive,
        CreatedAt,
        UpdatedAt
    ) VALUES (
        @BranchId,
        @SectionName,
        ISNULL(@FloorLevel, 1),
        ISNULL(@DisplayOrder, 0),
        1,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );

    DECLARE @NewSectionId INT = SCOPE_IDENTITY();

    SELECT 
        SectionId,
        BranchId,
        SectionName,
        FloorLevel,
        DisplayOrder,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.DiningSections
    WHERE SectionId = @NewSectionId;
END;
GO

-- 3.2 usp_DiningSection_Update
CREATE OR ALTER PROCEDURE dbo.usp_DiningSection_Update
    @SectionId INT,
    @SectionName NVARCHAR(60),
    @FloorLevel INT = 1,
    @DisplayOrder INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.DiningSections WHERE SectionId = @SectionId)
    BEGIN
        RAISERROR('Dining section not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.DiningSections
    SET SectionName = @SectionName,
        FloorLevel = ISNULL(@FloorLevel, FloorLevel),
        DisplayOrder = ISNULL(@DisplayOrder, DisplayOrder),
        UpdatedAt = SYSUTCDATETIME()
    WHERE SectionId = @SectionId;

    SELECT 
        SectionId,
        BranchId,
        SectionName,
        FloorLevel,
        DisplayOrder,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM dbo.DiningSections
    WHERE SectionId = @SectionId;
END;
GO

-- 3.3 usp_DiningSection_GetById
CREATE OR ALTER PROCEDURE dbo.usp_DiningSection_GetById
    @SectionId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        s.SectionId,
        s.BranchId,
        b.BranchName,
        s.SectionName,
        s.FloorLevel,
        s.DisplayOrder,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt,
        (SELECT COUNT(1) FROM dbo.RestaurantTables t WHERE t.SectionId = s.SectionId AND t.IsDeleted = 0) AS TotalTableCount,
        (SELECT COUNT(1) FROM dbo.RestaurantTables t WHERE t.SectionId = s.SectionId AND t.IsDeleted = 0 AND t.CurrentStatus = 'AVAILABLE') AS AvailableTableCount
    FROM dbo.DiningSections s
    JOIN dbo.Branches b ON s.BranchId = b.BranchId
    WHERE s.SectionId = @SectionId;
END;
GO

-- 3.4 usp_DiningSection_ListByBranch
CREATE OR ALTER PROCEDURE dbo.usp_DiningSection_ListByBranch
    @BranchId INT,
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        s.SectionId,
        s.BranchId,
        s.SectionName,
        s.FloorLevel,
        s.DisplayOrder,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt,
        (SELECT COUNT(1) FROM dbo.RestaurantTables t WHERE t.SectionId = s.SectionId AND t.IsDeleted = 0) AS TotalTableCount,
        (SELECT COUNT(1) FROM dbo.RestaurantTables t WHERE t.SectionId = s.SectionId AND t.IsDeleted = 0 AND t.CurrentStatus = 'AVAILABLE') AS AvailableTableCount,
        (SELECT COUNT(1) FROM dbo.RestaurantTables t WHERE t.SectionId = s.SectionId AND t.IsDeleted = 0 AND t.CurrentStatus = 'OCCUPIED') AS OccupiedTableCount
    FROM dbo.DiningSections s
    WHERE s.BranchId = @BranchId
      AND (@IsActive IS NULL OR s.IsActive = @IsActive)
    ORDER BY s.FloorLevel ASC, s.DisplayOrder ASC, s.SectionName ASC;
END;
GO

-- 3.5 usp_DiningSection_SetStatus
CREATE OR ALTER PROCEDURE dbo.usp_DiningSection_SetStatus
    @SectionId INT,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.DiningSections WHERE SectionId = @SectionId)
    BEGIN
        RAISERROR('Dining section not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.DiningSections
    SET IsActive = @IsActive,
        UpdatedAt = SYSUTCDATETIME()
    WHERE SectionId = @SectionId;

    SELECT 
        SectionId,
        BranchId,
        SectionName,
        IsActive,
        UpdatedAt
    FROM dbo.DiningSections
    WHERE SectionId = @SectionId;
END;
GO

-- ============================================================================
-- 4. DINING TABLE MANAGEMENT PROCEDURES
-- ============================================================================

-- 4.1 usp_DiningTable_Create
CREATE OR ALTER PROCEDURE dbo.usp_DiningTable_Create
    @BranchId INT,
    @SectionId INT,
    @TableNumber NVARCHAR(20),
    @SeatingCapacity INT = 4,
    @QrCodeHash NVARCHAR(120) = NULL,
    @PosX INT = 0,
    @PosY INT = 0,
    @CurrentStatus NVARCHAR(30) = 'AVAILABLE'
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate Section belongs to Branch
    IF NOT EXISTS (
        SELECT 1 FROM dbo.DiningSections 
        WHERE SectionId = @SectionId AND BranchId = @BranchId
    )
    BEGIN
        RAISERROR('The specified dining section does not belong to this branch.', 16, 1);
        RETURN;
    END;

    -- Validate TableNumber uniqueness in branch among active/non-deleted tables
    IF EXISTS (
        SELECT 1 FROM dbo.RestaurantTables 
        WHERE BranchId = @BranchId 
          AND TableNumber = @TableNumber 
          AND IsDeleted = 0
    )
    BEGIN
        RAISERROR('A table with this number already exists in this branch.', 16, 1);
        RETURN;
    END;

    -- Generate unique QR Code hash if omitted
    DECLARE @FinalQrCodeHash NVARCHAR(120) = @QrCodeHash;
    IF @FinalQrCodeHash IS NULL OR LEN(LTRIM(RTRIM(@FinalQrCodeHash))) = 0
    BEGIN
        SET @FinalQrCodeHash = 'QR_B' + CAST(@BranchId AS NVARCHAR(10)) + '_' + @TableNumber + '_' + SUBSTRING(REPLACE(CAST(NEWID() AS NVARCHAR(36)), '-', ''), 1, 12);
    END;

    -- Ensure QR Code hash uniqueness
    IF EXISTS (SELECT 1 FROM dbo.RestaurantTables WHERE QrCodeHash = @FinalQrCodeHash)
    BEGIN
        SET @FinalQrCodeHash = @FinalQrCodeHash + '_' + SUBSTRING(REPLACE(CAST(NEWID() AS NVARCHAR(36)), '-', ''), 1, 6);
    END;

    DECLARE @ValidStatus NVARCHAR(30) = UPPER(ISNULL(@CurrentStatus, 'AVAILABLE'));
    IF @ValidStatus NOT IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'BILLED', 'CLEANING')
    BEGIN
        SET @ValidStatus = 'AVAILABLE';
    END;

    INSERT INTO dbo.RestaurantTables (
        BranchId,
        SectionId,
        TableNumber,
        SeatingCapacity,
        CurrentStatus,
        ActiveOrderId,
        QrCodeHash,
        PosX,
        PosY,
        IsActive,
        CreatedAt,
        UpdatedAt,
        IsDeleted
    ) VALUES (
        @BranchId,
        @SectionId,
        @TableNumber,
        ISNULL(@SeatingCapacity, 4),
        @ValidStatus,
        NULL,
        @FinalQrCodeHash,
        ISNULL(@PosX, 0),
        ISNULL(@PosY, 0),
        1,
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        0
    );

    DECLARE @NewTableId INT = SCOPE_IDENTITY();

    SELECT 
        t.TableId,
        t.BranchId,
        t.SectionId,
        s.SectionName,
        s.FloorLevel,
        t.TableNumber,
        t.SeatingCapacity,
        t.CurrentStatus,
        t.ActiveOrderId,
        t.QrCodeHash,
        t.PosX,
        t.PosY,
        t.IsActive,
        t.CreatedAt,
        t.UpdatedAt
    FROM dbo.RestaurantTables t
    JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE t.TableId = @NewTableId;
END;
GO

-- 4.2 usp_DiningTable_Update
CREATE OR ALTER PROCEDURE dbo.usp_DiningTable_Update
    @TableId INT,
    @SectionId INT = NULL,
    @TableNumber NVARCHAR(20) = NULL,
    @SeatingCapacity INT = NULL,
    @PosX INT = NULL,
    @PosY INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @BranchId INT, @CurrentSectionId INT;
    SELECT 
        @BranchId = BranchId, 
        @CurrentSectionId = SectionId
    FROM dbo.RestaurantTables 
    WHERE TableId = @TableId AND IsDeleted = 0;

    IF @BranchId IS NULL
    BEGIN
        RAISERROR('Table not found.', 16, 1);
        RETURN;
    END;

    -- If SectionId is being changed, verify it belongs to the same branch
    IF @SectionId IS NOT NULL AND @SectionId <> @CurrentSectionId
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM dbo.DiningSections 
            WHERE SectionId = @SectionId AND BranchId = @BranchId
        )
        BEGIN
            RAISERROR('Target dining section does not belong to the table branch.', 16, 1);
            RETURN;
        END;
    END;

    -- If TableNumber is changing, verify uniqueness in branch
    IF @TableNumber IS NOT NULL
    BEGIN
        IF EXISTS (
            SELECT 1 FROM dbo.RestaurantTables 
            WHERE BranchId = @BranchId 
              AND TableNumber = @TableNumber 
              AND TableId <> @TableId 
              AND IsDeleted = 0
        )
        BEGIN
            RAISERROR('Another table with this number already exists in this branch.', 16, 1);
            RETURN;
        END;
    END;

    UPDATE dbo.RestaurantTables
    SET SectionId = ISNULL(@SectionId, SectionId),
        TableNumber = ISNULL(@TableNumber, TableNumber),
        SeatingCapacity = ISNULL(@SeatingCapacity, SeatingCapacity),
        PosX = ISNULL(@PosX, PosX),
        PosY = ISNULL(@PosY, PosY),
        UpdatedAt = SYSUTCDATETIME()
    WHERE TableId = @TableId;

    SELECT 
        t.TableId,
        t.BranchId,
        t.SectionId,
        s.SectionName,
        s.FloorLevel,
        t.TableNumber,
        t.SeatingCapacity,
        t.CurrentStatus,
        t.ActiveOrderId,
        t.QrCodeHash,
        t.PosX,
        t.PosY,
        t.IsActive,
        t.CreatedAt,
        t.UpdatedAt
    FROM dbo.RestaurantTables t
    JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE t.TableId = @TableId;
END;
GO

-- 4.3 usp_DiningTable_GetById
CREATE OR ALTER PROCEDURE dbo.usp_DiningTable_GetById
    @TableId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        t.TableId,
        t.BranchId,
        b.BranchName,
        b.BranchCode,
        t.SectionId,
        s.SectionName,
        s.FloorLevel,
        t.TableNumber,
        t.SeatingCapacity,
        t.CurrentStatus,
        t.ActiveOrderId,
        t.QrCodeHash,
        t.PosX,
        t.PosY,
        t.IsActive,
        t.CreatedAt,
        t.UpdatedAt
    FROM dbo.RestaurantTables t
    JOIN dbo.Branches b ON t.BranchId = b.BranchId
    JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE t.TableId = @TableId 
      AND t.IsDeleted = 0;
END;
GO

-- 4.4 usp_DiningTable_GetByQrHash
CREATE OR ALTER PROCEDURE dbo.usp_DiningTable_GetByQrHash
    @QrCodeHash NVARCHAR(120)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        t.TableId,
        t.BranchId,
        b.BranchName,
        b.BranchCode,
        r.RestaurantId,
        r.RestaurantName,
        r.DefaultCurrency,
        t.SectionId,
        s.SectionName,
        s.FloorLevel,
        t.TableNumber,
        t.SeatingCapacity,
        t.CurrentStatus,
        t.ActiveOrderId,
        t.QrCodeHash,
        t.IsActive
    FROM dbo.RestaurantTables t
    JOIN dbo.Branches b ON t.BranchId = b.BranchId
    JOIN dbo.Restaurants r ON b.RestaurantId = r.RestaurantId
    JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE t.QrCodeHash = @QrCodeHash 
      AND t.IsDeleted = 0
      AND t.IsActive = 1
      AND b.IsActive = 1;
END;
GO

-- 4.5 usp_DiningTable_ListByBranch
CREATE OR ALTER PROCEDURE dbo.usp_DiningTable_ListByBranch
    @BranchId INT,
    @SectionId INT = NULL,
    @CurrentStatus NVARCHAR(30) = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        t.TableId,
        t.BranchId,
        t.SectionId,
        s.SectionName,
        s.FloorLevel,
        t.TableNumber,
        t.SeatingCapacity,
        t.CurrentStatus,
        t.ActiveOrderId,
        t.QrCodeHash,
        t.PosX,
        t.PosY,
        t.IsActive,
        t.CreatedAt,
        t.UpdatedAt
    FROM dbo.RestaurantTables t
    JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE t.BranchId = @BranchId
      AND t.IsDeleted = 0
      AND (@SectionId IS NULL OR t.SectionId = @SectionId)
      AND (@CurrentStatus IS NULL OR t.CurrentStatus = @CurrentStatus)
      AND (@IsActive IS NULL OR t.IsActive = @IsActive)
    ORDER BY s.FloorLevel ASC, s.DisplayOrder ASC, t.TableNumber ASC;
END;
GO

-- 4.6 usp_DiningTable_ListBySection
CREATE OR ALTER PROCEDURE dbo.usp_DiningTable_ListBySection
    @SectionId INT,
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        t.TableId,
        t.BranchId,
        t.SectionId,
        s.SectionName,
        s.FloorLevel,
        t.TableNumber,
        t.SeatingCapacity,
        t.CurrentStatus,
        t.ActiveOrderId,
        t.QrCodeHash,
        t.PosX,
        t.PosY,
        t.IsActive,
        t.CreatedAt,
        t.UpdatedAt
    FROM dbo.RestaurantTables t
    JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE t.SectionId = @SectionId
      AND t.IsDeleted = 0
      AND (@IsActive IS NULL OR t.IsActive = @IsActive)
    ORDER BY t.TableNumber ASC;
END;
GO

-- 4.7 usp_DiningTable_UpdateCapacity
CREATE OR ALTER PROCEDURE dbo.usp_DiningTable_UpdateCapacity
    @TableId INT,
    @SeatingCapacity INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @SeatingCapacity <= 0
    BEGIN
        RAISERROR('Seating capacity must be greater than zero.', 16, 1);
        RETURN;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.RestaurantTables WHERE TableId = @TableId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Table not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.RestaurantTables
    SET SeatingCapacity = @SeatingCapacity,
        UpdatedAt = SYSUTCDATETIME()
    WHERE TableId = @TableId;

    SELECT 
        TableId,
        BranchId,
        TableNumber,
        SeatingCapacity,
        CurrentStatus,
        UpdatedAt
    FROM dbo.RestaurantTables
    WHERE TableId = @TableId;
END;
GO

-- 4.8 usp_DiningTable_UpdateStatus
CREATE OR ALTER PROCEDURE dbo.usp_DiningTable_UpdateStatus
    @TableId INT,
    @CurrentStatus NVARCHAR(30),
    @ActiveOrderId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ValidStatus NVARCHAR(30) = UPPER(@CurrentStatus);
    IF @ValidStatus NOT IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'BILLED', 'CLEANING')
    BEGIN
        RAISERROR('Invalid table status. Must be AVAILABLE, OCCUPIED, RESERVED, BILLED, or CLEANING.', 16, 1);
        RETURN;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.RestaurantTables WHERE TableId = @TableId AND IsDeleted = 0)
    BEGIN
        RAISERROR('Table not found.', 16, 1);
        RETURN;
    END;

    -- If released to AVAILABLE or CLEANING, clear the ActiveOrderId unless specified
    DECLARE @NewOrderId BIGINT = @ActiveOrderId;
    IF @ValidStatus IN ('AVAILABLE', 'CLEANING') AND @ActiveOrderId IS NULL
    BEGIN
        SET @NewOrderId = NULL;
    END
    ELSE IF @ActiveOrderId IS NULL
    BEGIN
        -- Preserve existing ActiveOrderId if not explicitly provided
        SELECT @NewOrderId = ActiveOrderId FROM dbo.RestaurantTables WHERE TableId = @TableId;
    END;

    UPDATE dbo.RestaurantTables
    SET CurrentStatus = @ValidStatus,
        ActiveOrderId = @NewOrderId,
        UpdatedAt = SYSUTCDATETIME()
    WHERE TableId = @TableId;

    SELECT 
        t.TableId,
        t.BranchId,
        t.SectionId,
        s.SectionName,
        t.TableNumber,
        t.SeatingCapacity,
        t.CurrentStatus,
        t.ActiveOrderId,
        t.UpdatedAt
    FROM dbo.RestaurantTables t
    JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE t.TableId = @TableId;
END;
GO

-- 4.9 usp_DiningTable_GetAvailable
CREATE OR ALTER PROCEDURE dbo.usp_DiningTable_GetAvailable
    @BranchId INT,
    @MinCapacity INT = NULL,
    @SectionId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        t.TableId,
        t.BranchId,
        t.SectionId,
        s.SectionName,
        s.FloorLevel,
        t.TableNumber,
        t.SeatingCapacity,
        t.CurrentStatus,
        t.PosX,
        t.PosY
    FROM dbo.RestaurantTables t
    JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE t.BranchId = @BranchId
      AND t.CurrentStatus = 'AVAILABLE'
      AND t.IsActive = 1
      AND t.IsDeleted = 0
      AND (@MinCapacity IS NULL OR t.SeatingCapacity >= @MinCapacity)
      AND (@SectionId IS NULL OR t.SectionId = @SectionId)
    ORDER BY t.SeatingCapacity ASC, t.TableNumber ASC;
END;
GO

-- 4.10 usp_DiningTable_GetOccupied
CREATE OR ALTER PROCEDURE dbo.usp_DiningTable_GetOccupied
    @BranchId INT,
    @SectionId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        t.TableId,
        t.BranchId,
        t.SectionId,
        s.SectionName,
        s.FloorLevel,
        t.TableNumber,
        t.SeatingCapacity,
        t.CurrentStatus,
        t.ActiveOrderId,
        t.PosX,
        t.PosY
    FROM dbo.RestaurantTables t
    JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE t.BranchId = @BranchId
      AND t.CurrentStatus = 'OCCUPIED'
      AND t.IsActive = 1
      AND t.IsDeleted = 0
      AND (@SectionId IS NULL OR t.SectionId = @SectionId)
    ORDER BY t.TableNumber ASC;
END;
GO

-- 4.11 usp_DiningTable_Delete
CREATE OR ALTER PROCEDURE dbo.usp_DiningTable_Delete
    @TableId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CurrentStatus NVARCHAR(30);
    SELECT @CurrentStatus = CurrentStatus
    FROM dbo.RestaurantTables
    WHERE TableId = @TableId AND IsDeleted = 0;

    IF @CurrentStatus IS NULL
    BEGIN
        RAISERROR('Table not found.', 16, 1);
        RETURN;
    END;

    IF @CurrentStatus IN ('OCCUPIED', 'BILLED')
    BEGIN
        RAISERROR('Cannot delete a table while it is occupied or billed.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.RestaurantTables
    SET IsDeleted = 1,
        IsActive = 0,
        DeletedAt = SYSUTCDATETIME(),
        UpdatedAt = SYSUTCDATETIME()
    WHERE TableId = @TableId;

    SELECT @TableId AS DeletedTableId;
END;
GO

-- ============================================================================
-- 5. FLOOR MANAGEMENT & VISUAL FLOOR-PLAN PROCEDURES
-- ============================================================================

-- 5.1 usp_Floor_GetLayout
CREATE OR ALTER PROCEDURE dbo.usp_Floor_GetLayout
    @BranchId INT,
    @FloorLevel INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 0: Floor Summary KPI
    SELECT 
        b.BranchId,
        b.BranchCode,
        b.BranchName,
        COUNT(t.TableId) AS TotalTables,
        ISNULL(SUM(t.SeatingCapacity), 0) AS TotalSeatingCapacity,
        SUM(CASE WHEN t.CurrentStatus = 'AVAILABLE' THEN 1 ELSE 0 END) AS AvailableTables,
        SUM(CASE WHEN t.CurrentStatus = 'OCCUPIED' THEN 1 ELSE 0 END) AS OccupiedTables,
        SUM(CASE WHEN t.CurrentStatus = 'RESERVED' THEN 1 ELSE 0 END) AS ReservedTables,
        SUM(CASE WHEN t.CurrentStatus = 'BILLED' THEN 1 ELSE 0 END) AS BilledTables,
        SUM(CASE WHEN t.CurrentStatus = 'CLEANING' THEN 1 ELSE 0 END) AS CleaningTables
    FROM dbo.Branches b
    LEFT JOIN dbo.RestaurantTables t ON b.BranchId = t.BranchId AND t.IsDeleted = 0 AND t.IsActive = 1
    LEFT JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE b.BranchId = @BranchId 
      AND b.IsDeleted = 0
      AND (@FloorLevel IS NULL OR s.FloorLevel = @FloorLevel OR s.FloorLevel IS NULL)
    GROUP BY b.BranchId, b.BranchCode, b.BranchName;

    -- Recordset 1: Sections
    SELECT 
        s.SectionId,
        s.SectionName,
        s.FloorLevel,
        s.DisplayOrder,
        s.IsActive
    FROM dbo.DiningSections s
    WHERE s.BranchId = @BranchId
      AND s.IsActive = 1
      AND (@FloorLevel IS NULL OR s.FloorLevel = @FloorLevel)
    ORDER BY s.FloorLevel ASC, s.DisplayOrder ASC;

    -- Recordset 2: Tables with 2D Visual Coordinates
    SELECT 
        t.TableId,
        t.BranchId,
        t.SectionId,
        s.SectionName,
        s.FloorLevel,
        t.TableNumber,
        t.SeatingCapacity,
        t.CurrentStatus,
        t.ActiveOrderId,
        t.QrCodeHash,
        t.PosX,
        t.PosY,
        t.IsActive,
        t.UpdatedAt
    FROM dbo.RestaurantTables t
    JOIN dbo.DiningSections s ON t.SectionId = s.SectionId
    WHERE t.BranchId = @BranchId
      AND t.IsDeleted = 0
      AND t.IsActive = 1
      AND (@FloorLevel IS NULL OR s.FloorLevel = @FloorLevel)
    ORDER BY s.FloorLevel ASC, s.DisplayOrder ASC, t.TableNumber ASC;
END;
GO
