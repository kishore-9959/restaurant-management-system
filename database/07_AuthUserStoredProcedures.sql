-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS) - AUTH & USER STORED PROCEDURES
-- File: database/07_AuthUserStoredProcedures.sql
-- Description: Stored procedures for pure stored-procedure-based Auth & User operations.
-- Database: RestaurantManagementDB
-- ============================================================================

USE [RestaurantManagementDB];
GO

-- 1. usp_User_GetByEmailOrPhone
-- Returns user record with associated roles and permissions by Email or PhoneNumber
CREATE OR ALTER PROCEDURE dbo.usp_User_GetByEmailOrPhone
    @EmailOrPhone NVARCHAR(120)
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 0: User core record
    SELECT TOP 1
        u.UserId,
        u.BranchId,
        u.FirstName,
        u.LastName,
        u.Email,
        u.PhoneNumber,
        u.PasswordHash,
        u.PasscodePin,
        u.UserType,
        u.AvatarUrl,
        u.IsActive,
        u.IsEmailVerified,
        u.IsPhoneVerified,
        u.LastLoginAt,
        u.CreatedAt,
        u.UpdatedAt,
        u.IsDeleted
    FROM dbo.Users u
    WHERE (u.Email = @EmailOrPhone OR u.PhoneNumber = @EmailOrPhone)
      AND u.IsDeleted = 0;

    -- Recordset 1: User Roles
    SELECT 
        r.RoleId,
        r.RoleCode,
        r.RoleName,
        ur.BranchId
    FROM dbo.Users u
    JOIN dbo.UserRoles ur ON u.UserId = ur.UserId
    JOIN dbo.Roles r ON ur.RoleId = r.RoleId
    WHERE (u.Email = @EmailOrPhone OR u.PhoneNumber = @EmailOrPhone)
      AND u.IsDeleted = 0;

    -- Recordset 2: User Permissions
    SELECT DISTINCT
        p.PermissionId,
        p.PermissionCode,
        p.Module,
        p.Action
    FROM dbo.Users u
    JOIN dbo.UserRoles ur ON u.UserId = ur.UserId
    JOIN dbo.RolePermissions rp ON ur.RoleId = rp.RoleId
    JOIN dbo.Permissions p ON rp.PermissionId = p.PermissionId
    WHERE (u.Email = @EmailOrPhone OR u.PhoneNumber = @EmailOrPhone)
      AND u.IsDeleted = 0;
END;
GO

-- 2. usp_User_GetById
-- Returns user record with associated roles and permissions by UserId
CREATE OR ALTER PROCEDURE dbo.usp_User_GetById
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 0: User record (excluding sensitive credentials)
    SELECT TOP 1
        u.UserId,
        u.BranchId,
        u.FirstName,
        u.LastName,
        u.Email,
        u.PhoneNumber,
        u.UserType,
        u.AvatarUrl,
        u.IsActive,
        u.IsEmailVerified,
        u.IsPhoneVerified,
        u.LastLoginAt,
        u.CreatedAt,
        u.UpdatedAt,
        u.IsDeleted
    FROM dbo.Users u
    WHERE u.UserId = @UserId
      AND u.IsDeleted = 0;

    -- Recordset 1: Roles
    SELECT 
        r.RoleId,
        r.RoleCode,
        r.RoleName,
        ur.BranchId
    FROM dbo.UserRoles ur
    JOIN dbo.Roles r ON ur.RoleId = r.RoleId
    WHERE ur.UserId = @UserId;

    -- Recordset 2: Permissions
    SELECT DISTINCT
        p.PermissionId,
        p.PermissionCode,
        p.Module,
        p.Action
    FROM dbo.UserRoles ur
    JOIN dbo.RolePermissions rp ON ur.RoleId = rp.RoleId
    JOIN dbo.Permissions p ON rp.PermissionId = p.PermissionId
    WHERE ur.UserId = @UserId;
END;
GO

-- 3. usp_User_Create
-- Creates a new user in dbo.Users and returns the new UserId
CREATE OR ALTER PROCEDURE dbo.usp_User_Create
    @FirstName NVARCHAR(60),
    @LastName NVARCHAR(60) = NULL,
    @Email NVARCHAR(120) = NULL,
    @PhoneNumber NVARCHAR(25),
    @PasswordHash NVARCHAR(255) = NULL,
    @PasscodePin NVARCHAR(255) = NULL,
    @UserType NVARCHAR(30) = 'CUSTOMER',
    @BranchId INT = NULL,
    @AvatarUrl NVARCHAR(500) = NULL,
    @IsActive BIT = 1,
    @NewUserId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Users (
        FirstName,
        LastName,
        Email,
        PhoneNumber,
        PasswordHash,
        PasscodePin,
        UserType,
        BranchId,
        AvatarUrl,
        IsActive,
        CreatedAt,
        UpdatedAt,
        IsDeleted
    ) VALUES (
        @FirstName,
        @LastName,
        @Email,
        @PhoneNumber,
        @PasswordHash,
        @PasscodePin,
        @UserType,
        @BranchId,
        @AvatarUrl,
        @IsActive,
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        0
    );

    SET @NewUserId = SCOPE_IDENTITY();
END;
GO

-- 4. usp_User_CheckExists
-- Checks if an email or phone number is already registered
CREATE OR ALTER PROCEDURE dbo.usp_User_CheckExists
    @Email NVARCHAR(120) = NULL,
    @PhoneNumber NVARCHAR(25) = NULL,
    @ExcludeUserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        CASE WHEN @Email IS NOT NULL AND EXISTS (
            SELECT 1 FROM dbo.Users 
            WHERE Email = @Email 
              AND (@ExcludeUserId IS NULL OR UserId != @ExcludeUserId)
              AND IsDeleted = 0
        ) THEN 1 ELSE 0 END AS EmailExists,
        
        CASE WHEN @PhoneNumber IS NOT NULL AND EXISTS (
            SELECT 1 FROM dbo.Users 
            WHERE PhoneNumber = @PhoneNumber 
              AND (@ExcludeUserId IS NULL OR UserId != @ExcludeUserId)
              AND IsDeleted = 0
        ) THEN 1 ELSE 0 END AS PhoneExists;
END;
GO

-- 5. usp_User_UpdateProfile
-- Updates profile fields of an active user
CREATE OR ALTER PROCEDURE dbo.usp_User_UpdateProfile
    @UserId BIGINT,
    @FirstName NVARCHAR(60),
    @LastName NVARCHAR(60) = NULL,
    @PhoneNumber NVARCHAR(25) = NULL,
    @AvatarUrl NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Users
    SET
        FirstName = @FirstName,
        LastName = ISNULL(@LastName, LastName),
        PhoneNumber = ISNULL(@PhoneNumber, PhoneNumber),
        AvatarUrl = ISNULL(@AvatarUrl, AvatarUrl),
        UpdatedAt = SYSUTCDATETIME()
    WHERE UserId = @UserId
      AND IsDeleted = 0;

    SELECT @@ROWCOUNT AS RowsUpdated;
END;
GO

-- 6. usp_User_UpdateLastLogin
-- Updates user's LastLoginAt timestamp
CREATE OR ALTER PROCEDURE dbo.usp_User_UpdateLastLogin
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Users
    SET LastLoginAt = SYSUTCDATETIME()
    WHERE UserId = @UserId;
END;
GO

-- 7. usp_User_SetStatus
-- Sets user active/inactive status
CREATE OR ALTER PROCEDURE dbo.usp_User_SetStatus
    @UserId BIGINT,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Users
    SET 
        IsActive = @IsActive,
        UpdatedAt = SYSUTCDATETIME()
    WHERE UserId = @UserId;
END;
GO

-- 8. usp_User_GetPinAuth
-- Retrieves PIN hash and status for POS PIN verification
CREATE OR ALTER PROCEDURE dbo.usp_User_GetPinAuth
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        UserId,
        FirstName,
        LastName,
        Email,
        PhoneNumber,
        PasscodePin,
        UserType,
        BranchId,
        IsActive,
        IsDeleted
    FROM dbo.Users
    WHERE UserId = @UserId
      AND IsDeleted = 0;
END;
GO

-- 9. usp_Auth_AssignRole
-- Assigns a role to a user by RoleCode
CREATE OR ALTER PROCEDURE dbo.usp_Auth_AssignRole
    @UserId BIGINT,
    @RoleCode NVARCHAR(40),
    @BranchId INT = NULL,
    @UserRoleId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @RoleId INT;
    SELECT @RoleId = RoleId FROM dbo.Roles WHERE RoleCode = @RoleCode;

    IF @RoleId IS NULL
    BEGIN
        RAISERROR('Role with RoleCode %s does not exist.', 16, 1, @RoleCode);
        RETURN;
    END;

    -- Avoid duplicate role assignments for the same branch
    SELECT @UserRoleId = UserRoleId
    FROM dbo.UserRoles
    WHERE UserId = @UserId AND RoleId = @RoleId;

    IF @UserRoleId IS NULL
    BEGIN
        INSERT INTO dbo.UserRoles (UserId, RoleId, BranchId, AssignedAt)
        VALUES (@UserId, @RoleId, @BranchId, SYSUTCDATETIME());

        SET @UserRoleId = SCOPE_IDENTITY();
    END;
END;
GO

-- 10. usp_Auth_GetUserRolesAndPermissions
-- Retrieves all roles and permissions for a given UserId
CREATE OR ALTER PROCEDURE dbo.usp_Auth_GetUserRolesAndPermissions
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 0: Roles
    SELECT 
        r.RoleId,
        r.RoleCode,
        r.RoleName,
        ur.BranchId
    FROM dbo.UserRoles ur
    JOIN dbo.Roles r ON ur.RoleId = r.RoleId
    WHERE ur.UserId = @UserId;

    -- Recordset 1: Permissions
    SELECT DISTINCT
        p.PermissionId,
        p.PermissionCode,
        p.Module,
        p.Action
    FROM dbo.UserRoles ur
    JOIN dbo.RolePermissions rp ON ur.RoleId = rp.RoleId
    JOIN dbo.Permissions p ON rp.PermissionId = p.PermissionId
    WHERE ur.UserId = @UserId;
END;
GO

-- 11. usp_Auth_GetAllRoles
-- Retrieves all active system roles
CREATE OR ALTER PROCEDURE dbo.usp_Auth_GetAllRoles
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        RoleId,
        RoleCode,
        RoleName,
        Description,
        IsSystemRole
    FROM dbo.Roles
    ORDER BY RoleId ASC;
END;
GO

-- 12. usp_CustomerAddress_Create
-- Creates customer address, managing atomic single default address toggle
CREATE OR ALTER PROCEDURE dbo.usp_CustomerAddress_Create
    @UserId BIGINT,
    @AddressTitle NVARCHAR(50) = 'Home',
    @RecipientName NVARCHAR(100),
    @RecipientPhone NVARCHAR(25),
    @AddressLine1 NVARCHAR(200),
    @AddressLine2 NVARCHAR(200) = NULL,
    @Landmark NVARCHAR(120) = NULL,
    @City NVARCHAR(80),
    @StateProvince NVARCHAR(80),
    @PostalCode NVARCHAR(20),
    @Latitude DECIMAL(9,6) = NULL,
    @Longitude DECIMAL(9,6) = NULL,
    @IsDefault BIT = 0,
    @NewAddressId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRANSACTION;
    BEGIN TRY
        -- If this is set as default, reset any previous default for this user
        IF @IsDefault = 1
        BEGIN
            UPDATE dbo.CustomerAddresses
            SET IsDefault = 0, UpdatedAt = SYSUTCDATETIME()
            WHERE UserId = @UserId AND IsDefault = 1 AND IsDeleted = 0;
        END;

        INSERT INTO dbo.CustomerAddresses (
            UserId,
            AddressTitle,
            RecipientName,
            RecipientPhone,
            AddressLine1,
            AddressLine2,
            Landmark,
            City,
            StateProvince,
            PostalCode,
            Latitude,
            Longitude,
            IsDefault,
            CreatedAt,
            UpdatedAt,
            IsDeleted
        ) VALUES (
            @UserId,
            @AddressTitle,
            @RecipientName,
            @RecipientPhone,
            @AddressLine1,
            @AddressLine2,
            @Landmark,
            @City,
            @StateProvince,
            @PostalCode,
            @Latitude,
            @Longitude,
            @IsDefault,
            SYSUTCDATETIME(),
            SYSUTCDATETIME(),
            0
        );

        SET @NewAddressId = SCOPE_IDENTITY();
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- 13. usp_CustomerAddress_GetByUserId
-- Retrieves active addresses for a customer ordered by default first
CREATE OR ALTER PROCEDURE dbo.usp_CustomerAddress_GetByUserId
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        AddressId,
        UserId,
        AddressTitle,
        RecipientName,
        RecipientPhone,
        AddressLine1,
        AddressLine2,
        Landmark,
        City,
        StateProvince,
        PostalCode,
        Latitude,
        Longitude,
        IsDefault,
        CreatedAt,
        UpdatedAt
    FROM dbo.CustomerAddresses
    WHERE UserId = @UserId
      AND IsDeleted = 0
    ORDER BY IsDefault DESC, CreatedAt DESC;
END;
GO

-- 14. usp_CustomerAddress_GetById
-- Retrieves a specific customer address
CREATE OR ALTER PROCEDURE dbo.usp_CustomerAddress_GetById
    @AddressId BIGINT,
    @UserId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        AddressId,
        UserId,
        AddressTitle,
        RecipientName,
        RecipientPhone,
        AddressLine1,
        AddressLine2,
        Landmark,
        City,
        StateProvince,
        PostalCode,
        Latitude,
        Longitude,
        IsDefault,
        CreatedAt,
        UpdatedAt
    FROM dbo.CustomerAddresses
    WHERE AddressId = @AddressId
      AND (@UserId IS NULL OR UserId = @UserId)
      AND IsDeleted = 0;
END;
GO

-- 15. usp_CustomerAddress_Update
-- Updates address fields with atomic default address management
CREATE OR ALTER PROCEDURE dbo.usp_CustomerAddress_Update
    @AddressId BIGINT,
    @UserId BIGINT,
    @AddressTitle NVARCHAR(50) = NULL,
    @RecipientName NVARCHAR(100) = NULL,
    @RecipientPhone NVARCHAR(25) = NULL,
    @AddressLine1 NVARCHAR(200) = NULL,
    @AddressLine2 NVARCHAR(200) = NULL,
    @Landmark NVARCHAR(120) = NULL,
    @City NVARCHAR(80) = NULL,
    @StateProvince NVARCHAR(80) = NULL,
    @PostalCode NVARCHAR(20) = NULL,
    @Latitude DECIMAL(9,6) = NULL,
    @Longitude DECIMAL(9,6) = NULL,
    @IsDefault BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRANSACTION;
    BEGIN TRY
        IF @IsDefault = 1
        BEGIN
            UPDATE dbo.CustomerAddresses
            SET IsDefault = 0, UpdatedAt = SYSUTCDATETIME()
            WHERE UserId = @UserId AND AddressId != @AddressId AND IsDeleted = 0;
        END;

        UPDATE dbo.CustomerAddresses
        SET
            AddressTitle = ISNULL(@AddressTitle, AddressTitle),
            RecipientName = ISNULL(@RecipientName, RecipientName),
            RecipientPhone = ISNULL(@RecipientPhone, RecipientPhone),
            AddressLine1 = ISNULL(@AddressLine1, AddressLine1),
            AddressLine2 = ISNULL(@AddressLine2, AddressLine2),
            Landmark = ISNULL(@Landmark, Landmark),
            City = ISNULL(@City, City),
            StateProvince = ISNULL(@StateProvince, StateProvince),
            PostalCode = ISNULL(@PostalCode, PostalCode),
            Latitude = ISNULL(@Latitude, Latitude),
            Longitude = ISNULL(@Longitude, Longitude),
            IsDefault = ISNULL(@IsDefault, IsDefault),
            UpdatedAt = SYSUTCDATETIME()
        WHERE AddressId = @AddressId
          AND UserId = @UserId
          AND IsDeleted = 0;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- 16. usp_CustomerAddress_Delete
-- Soft-deletes a customer address
CREATE OR ALTER PROCEDURE dbo.usp_CustomerAddress_Delete
    @AddressId BIGINT,
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.CustomerAddresses
    SET 
        IsDeleted = 1,
        DeletedAt = SYSUTCDATETIME()
    WHERE AddressId = @AddressId
      AND UserId = @UserId
      AND IsDeleted = 0;

    SELECT @@ROWCOUNT AS RowsDeleted;
END;
GO

-- 17. usp_Employee_Create
-- Creates an employee record in dbo.Employees
CREATE OR ALTER PROCEDURE dbo.usp_Employee_Create
    @UserId BIGINT,
    @BranchId INT,
    @EmployeeCode NVARCHAR(30),
    @Designation NVARCHAR(80),
    @DateOfJoining DATE,
    @Salary DECIMAL(10,2) = 0.00,
    @EmergencyContactPerson NVARCHAR(100) = NULL,
    @EmergencyContactPhone NVARCHAR(25) = NULL,
    @EmploymentStatus NVARCHAR(30) = 'ACTIVE',
    @NewEmployeeId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Employees (
        UserId,
        BranchId,
        EmployeeCode,
        Designation,
        DateOfJoining,
        Salary,
        EmergencyContactPerson,
        EmergencyContactPhone,
        EmploymentStatus,
        CreatedAt,
        UpdatedAt,
        IsDeleted
    ) VALUES (
        @UserId,
        @BranchId,
        @EmployeeCode,
        @Designation,
        @DateOfJoining,
        @Salary,
        @EmergencyContactPerson,
        @EmergencyContactPhone,
        @EmploymentStatus,
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        0
    );

    SET @NewEmployeeId = SCOPE_IDENTITY();
END;
GO

-- 18. usp_Employee_GetById
-- Retrieves employee by EmployeeId joined with user information
CREATE OR ALTER PROCEDURE dbo.usp_Employee_GetById
    @EmployeeId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        e.EmployeeId,
        e.UserId,
        e.BranchId,
        e.EmployeeCode,
        e.Designation,
        e.DateOfJoining,
        e.DateOfLeaving,
        e.Salary,
        e.EmergencyContactPerson,
        e.EmergencyContactPhone,
        e.EmploymentStatus,
        e.CreatedAt,
        e.UpdatedAt,
        u.FirstName,
        u.LastName,
        u.Email,
        u.PhoneNumber,
        u.UserType,
        u.IsActive
    FROM dbo.Employees e
    JOIN dbo.Users u ON e.UserId = u.UserId
    WHERE e.EmployeeId = @EmployeeId
      AND e.IsDeleted = 0;
END;
GO

-- 19. usp_Employee_GetByUserId
-- Retrieves employee record by UserId
CREATE OR ALTER PROCEDURE dbo.usp_Employee_GetByUserId
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        e.EmployeeId,
        e.UserId,
        e.BranchId,
        e.EmployeeCode,
        e.Designation,
        e.DateOfJoining,
        e.DateOfLeaving,
        e.Salary,
        e.EmergencyContactPerson,
        e.EmergencyContactPhone,
        e.EmploymentStatus,
        e.CreatedAt,
        e.UpdatedAt,
        u.FirstName,
        u.LastName,
        u.Email,
        u.PhoneNumber,
        u.UserType,
        u.IsActive
    FROM dbo.Employees e
    JOIN dbo.Users u ON e.UserId = u.UserId
    WHERE e.UserId = @UserId
      AND e.IsDeleted = 0;
END;
GO

-- 20. usp_Employee_List
-- Lists employees with filtering and pagination
CREATE OR ALTER PROCEDURE dbo.usp_Employee_List
    @BranchId INT = NULL,
    @Designation NVARCHAR(80) = NULL,
    @EmploymentStatus NVARCHAR(30) = NULL,
    @SearchTerm NVARCHAR(100) = NULL,
    @Limit INT = 50,
    @Offset INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        e.EmployeeId,
        e.UserId,
        e.BranchId,
        e.EmployeeCode,
        e.Designation,
        e.DateOfJoining,
        e.DateOfLeaving,
        e.Salary,
        e.EmergencyContactPerson,
        e.EmergencyContactPhone,
        e.EmploymentStatus,
        e.CreatedAt,
        e.UpdatedAt,
        u.FirstName,
        u.LastName,
        u.Email,
        u.PhoneNumber,
        u.UserType,
        u.IsActive
    FROM dbo.Employees e
    JOIN dbo.Users u ON e.UserId = u.UserId
    WHERE e.IsDeleted = 0
      AND (@BranchId IS NULL OR e.BranchId = @BranchId)
      AND (@Designation IS NULL OR e.Designation = @Designation)
      AND (@EmploymentStatus IS NULL OR e.EmploymentStatus = @EmploymentStatus)
      AND (@SearchTerm IS NULL OR (
          u.FirstName LIKE '%' + @SearchTerm + '%'
          OR u.LastName LIKE '%' + @SearchTerm + '%'
          OR u.Email LIKE '%' + @SearchTerm + '%'
          OR e.EmployeeCode LIKE '%' + @SearchTerm + '%'
      ))
    ORDER BY e.EmployeeId ASC
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY;
END;
GO

-- 21. usp_Employee_Update
-- Updates employee details
CREATE OR ALTER PROCEDURE dbo.usp_Employee_Update
    @EmployeeId BIGINT,
    @Designation NVARCHAR(80) = NULL,
    @Salary DECIMAL(10,2) = NULL,
    @DateOfJoining DATE = NULL,
    @EmergencyContactPerson NVARCHAR(100) = NULL,
    @EmergencyContactPhone NVARCHAR(25) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Employees
    SET
        Designation = ISNULL(@Designation, Designation),
        Salary = ISNULL(@Salary, Salary),
        DateOfJoining = ISNULL(@DateOfJoining, DateOfJoining),
        EmergencyContactPerson = ISNULL(@EmergencyContactPerson, EmergencyContactPerson),
        EmergencyContactPhone = ISNULL(@EmergencyContactPhone, EmergencyContactPhone),
        UpdatedAt = SYSUTCDATETIME()
    WHERE EmployeeId = @EmployeeId
      AND IsDeleted = 0;

    SELECT @@ROWCOUNT AS RowsUpdated;
END;
GO

-- 22. usp_Employee_UpdateStatus
-- Updates employee status and synchronizes user IsActive status
CREATE OR ALTER PROCEDURE dbo.usp_Employee_UpdateStatus
    @EmployeeId BIGINT,
    @EmploymentStatus NVARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserId BIGINT;

    BEGIN TRANSACTION;
    BEGIN TRY
        SELECT @UserId = UserId
        FROM dbo.Employees
        WHERE EmployeeId = @EmployeeId;

        IF @UserId IS NULL
        BEGIN
            RAISERROR('Employee not found', 16, 1);
            RETURN;
        END;

        UPDATE dbo.Employees
        SET
            EmploymentStatus = @EmploymentStatus,
            UpdatedAt = SYSUTCDATETIME()
        WHERE EmployeeId = @EmployeeId;

        -- If TERMINATED or INACTIVE, deactivate corresponding user
        IF @EmploymentStatus IN ('TERMINATED', 'INACTIVE')
        BEGIN
            UPDATE dbo.Users
            SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
            WHERE UserId = @UserId;
        END
        ELSE IF @EmploymentStatus = 'ACTIVE'
        BEGIN
            UPDATE dbo.Users
            SET IsActive = 1, UpdatedAt = SYSUTCDATETIME()
            WHERE UserId = @UserId;
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- 23. usp_AuditLog_Create
-- Creates an audit log entry in dbo.AuditLogs
CREATE OR ALTER PROCEDURE dbo.usp_AuditLog_Create
    @BranchId INT = NULL,
    @UserId BIGINT = NULL,
    @EntityName NVARCHAR(60),
    @EntityId NVARCHAR(60),
    @ActionType NVARCHAR(30),
    @ActionDescription NVARCHAR(500),
    @IpAddress NVARCHAR(50) = NULL,
    @UserAgent NVARCHAR(255) = NULL,
    @OldValuesJson NVARCHAR(MAX) = NULL,
    @NewValuesJson NVARCHAR(MAX) = NULL,
    @NewAuditId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.AuditLogs (
        BranchId,
        UserId,
        EntityName,
        EntityId,
        ActionType,
        ActionDescription,
        IpAddress,
        UserAgent,
        OldValuesJson,
        NewValuesJson,
        CreatedAt
    ) VALUES (
        @BranchId,
        @UserId,
        @EntityName,
        @EntityId,
        @ActionType,
        @ActionDescription,
        @IpAddress,
        @UserAgent,
        @OldValuesJson,
        @NewValuesJson,
        SYSUTCDATETIME()
    );

    SET @NewAuditId = SCOPE_IDENTITY();
END;
GO
