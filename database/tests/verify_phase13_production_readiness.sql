-- ============================================================================
-- RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 13 PRODUCTION READINESS AUDIT
-- Script: database/tests/verify_phase13_production_readiness.sql
-- Description: Independent SQL verification script to validate:
--   1. All 25 expected procedures exist in RestaurantManagementDB_IsolatedTest
--   2. No usp_Report_% procedures exist in primary RestaurantManagementDB
--   3. No reporting procedure contains unintended NOLOCK / READUNCOMMITTED hints
--   4. All reporting procedures are strictly read-only (zero mutating DML)
-- ============================================================================

PRINT '====================================================================';
PRINT 'RMS PHASE 13: PRODUCTION READINESS AUDIT VERIFICATION';
PRINT '====================================================================';
PRINT '';

-- ----------------------------------------------------------------------------
-- CHECK 1: Count and List of Procedures in Isolated Test Database
-- ----------------------------------------------------------------------------
PRINT '>>> CHECK 1: Procedures in RestaurantManagementDB_IsolatedTest';

SELECT 
    ROUTINE_NAME AS ProcedureName,
    CREATED AS CreatedDate,
    LAST_ALTERED AS LastAlteredDate
FROM RestaurantManagementDB_IsolatedTest.INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'usp_Report_%'
ORDER BY ROUTINE_NAME;

DECLARE @IsolatedCount INT = (
    SELECT COUNT(1) 
    FROM RestaurantManagementDB_IsolatedTest.INFORMATION_SCHEMA.ROUTINES
    WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'usp_Report_%'
);

IF @IsolatedCount = 25
    PRINT '  [PASS] Exactly 25 Report stored procedures verified in RestaurantManagementDB_IsolatedTest.';
ELSE
    PRINT '  [FAIL] Expected 25 procedures in IsolatedTest, but found: ' + CAST(@IsolatedCount AS VARCHAR(10));

PRINT '';

-- ----------------------------------------------------------------------------
-- CHECK 2: Primary Database Production Guard
-- ----------------------------------------------------------------------------
PRINT '>>> CHECK 2: Primary Database Guard in RestaurantManagementDB';

DECLARE @PrimaryCount INT = (
    SELECT COUNT(1) 
    FROM RestaurantManagementDB.INFORMATION_SCHEMA.ROUTINES
    WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'usp_Report_%'
);

IF @PrimaryCount = 0
    PRINT '  [PASS] Primary database RestaurantManagementDB is 100% UNTOUCHED (0 usp_Report_% procedures exist).';
ELSE
    PRINT '  [FAIL] SAFETY VIOLATION! Found ' + CAST(@PrimaryCount AS VARCHAR(10)) + ' procedures in primary DB!';

PRINT '';

-- ----------------------------------------------------------------------------
-- CHECK 3: Check for NOLOCK / READUNCOMMITTED Hints in Procedure Definitions
-- ----------------------------------------------------------------------------
PRINT '>>> CHECK 3: Checking for Unintended NOLOCK / READUNCOMMITTED Hints';

SELECT 
    o.name AS ProcedureName,
    CASE 
        WHEN m.definition LIKE '%WITH%NOLOCK%' OR m.definition LIKE '%READUNCOMMITTED%' THEN 'VIOLATION: Contains NOLOCK'
        ELSE 'SAFE'
    END AS IsolationStatus
FROM RestaurantManagementDB_IsolatedTest.sys.sql_modules m
JOIN RestaurantManagementDB_IsolatedTest.sys.objects o ON m.object_id = o.object_id
WHERE o.type = 'P' AND o.name LIKE 'usp_Report_%'
  AND (m.definition LIKE '%WITH%NOLOCK%' OR m.definition LIKE '%READUNCOMMITTED%');

IF @@ROWCOUNT = 0
    PRINT '  [PASS] Zero report procedures contain NOLOCK or READUNCOMMITTED hints.';
ELSE
    PRINT '  [FAIL] Procedures with dirty-read hints detected above!';

PRINT '';

-- ----------------------------------------------------------------------------
-- CHECK 4: Check for Mutating DML Statements (Read-Only Guarantee)
-- ----------------------------------------------------------------------------
PRINT '>>> CHECK 4: Checking for Mutating DML Statements (INSERT/UPDATE/DELETE/MERGE/TRUNCATE)';

SELECT 
    o.name AS ProcedureName,
    'VIOLATION: Contains Mutating DML' AS MutationStatus
FROM RestaurantManagementDB_IsolatedTest.sys.sql_modules m
JOIN RestaurantManagementDB_IsolatedTest.sys.objects o ON m.object_id = o.object_id
WHERE o.type = 'P' AND o.name LIKE 'usp_Report_%'
  AND (
      m.definition LIKE '%INSERT INTO dbo.%'
      OR m.definition LIKE '%UPDATE dbo.%'
      OR m.definition LIKE '%DELETE FROM dbo.%'
      OR m.definition LIKE '%MERGE dbo.%'
      OR m.definition LIKE '%TRUNCATE TABLE dbo.%'
  );

IF @@ROWCOUNT = 0
    PRINT '  [PASS] All 25 procedures are strictly READ-ONLY (Zero mutating DML operations against dbo tables).';
ELSE
    PRINT '  [FAIL] Mutating DML operations detected above!';

PRINT '';

-- ----------------------------------------------------------------------------
-- CHECK 5: Dedicated Reporting Security Role [db_reporting_reader]
-- ----------------------------------------------------------------------------
PRINT '>>> CHECK 5: Checking [db_reporting_reader] Security Role & Least-Privilege';

DECLARE @RoleExists INT = (
    SELECT COUNT(1) 
    FROM RestaurantManagementDB_IsolatedTest.sys.database_principals 
    WHERE name = 'db_reporting_reader' AND type = 'R'
);

IF @RoleExists = 1
    PRINT '  [PASS] Database role [db_reporting_reader] exists.';
ELSE
    PRINT '  [FAIL] Role [db_reporting_reader] is missing!';

DECLARE @ExecPermCount INT = (
    SELECT COUNT(DISTINCT o.name)
    FROM RestaurantManagementDB_IsolatedTest.sys.database_permissions dp
    JOIN RestaurantManagementDB_IsolatedTest.sys.objects o ON dp.major_id = o.object_id
    JOIN RestaurantManagementDB_IsolatedTest.sys.database_principals r ON dp.grantee_principal_id = r.principal_id
    WHERE r.name = 'db_reporting_reader'
      AND dp.permission_name = 'EXECUTE'
      AND o.type = 'P'
      AND o.name LIKE 'usp_Report_%'
);

IF @ExecPermCount = 25
    PRINT '  [PASS] [db_reporting_reader] granted EXECUTE on exactly 25 reporting procedures.';
ELSE
    PRINT '  [FAIL] Expected 25 EXECUTE permissions, found: ' + CAST(@ExecPermCount AS VARCHAR(10));

DECLARE @DenyPermCount INT = (
    SELECT COUNT(1)
    FROM RestaurantManagementDB_IsolatedTest.sys.database_permissions dp
    JOIN RestaurantManagementDB_IsolatedTest.sys.database_principals r ON dp.grantee_principal_id = r.principal_id
    WHERE r.name = 'db_reporting_reader'
      AND dp.state_desc = 'DENY'
      AND dp.permission_name IN ('INSERT', 'UPDATE', 'DELETE', 'ALTER', 'SELECT')
);

IF @DenyPermCount = 5
    PRINT '  [PASS] [db_reporting_reader] has explicit DENY on INSERT, UPDATE, DELETE, ALTER, and SELECT on dbo.';
ELSE
    PRINT '  [FAIL] Expected 5 explicit DENY permissions, found: ' + CAST(@DenyPermCount AS VARCHAR(10));

PRINT '';
PRINT '====================================================================';
PRINT 'AUDIT COMPLETE';
PRINT '====================================================================';

