-- ============================================================================
-- Script: 01_CreateDatabase.sql
-- Description: Creates the RestaurantManagementDB database with enterprise
--              SQL Server configurations (Collation, Recovery Model, Filegroups).
-- Database: RestaurantManagementDB
-- Engine: Microsoft SQL Server 2019 / 2022 / Azure SQL Database
-- Author: Senior SQL Server Database Architect
-- Date: 2026-11-08
-- ============================================================================

USE master;
GO

-- Check if database already exists, if not create it
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'RestaurantManagementDB')
BEGIN
    CREATE DATABASE RestaurantManagementDB
    COLLATE Latin1_General_100_CI_AS_SC_UTF8;
    PRINT 'Database [RestaurantManagementDB] created successfully with UTF-8 Collation.';
END
ELSE
BEGIN
    PRINT 'Database [RestaurantManagementDB] already exists. Skipping creation.';
END
GO

USE RestaurantManagementDB;
GO

-- Verify Database Options for Concurrency and High-Throughput POS Operations
-- Enable Read Committed Snapshot Isolation (RCSI) to prevent read-write blocking
IF (SELECT is_read_committed_snapshot_on FROM sys.databases WHERE name = N'RestaurantManagementDB') = 0
BEGIN
    ALTER DATABASE RestaurantManagementDB SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
    PRINT 'READ_COMMITTED_SNAPSHOT set to ON for non-blocking read concurrency.';
END
GO

-- Enable Snapshot Isolation for cross-table transaction consistency
IF (SELECT snapshot_isolation_state FROM sys.databases WHERE name = N'RestaurantManagementDB') = 0
BEGIN
    ALTER DATABASE RestaurantManagementDB SET ALLOW_SNAPSHOT_ISOLATION ON;
    PRINT 'ALLOW_SNAPSHOT_ISOLATION set to ON.';
END
GO

-- Ensure ANSI NULLS and QUOTED_IDENTIFIER default to ON
ALTER DATABASE RestaurantManagementDB SET ANSI_NULL_DEFAULT ON;
ALTER DATABASE RestaurantManagementDB SET ANSI_NULLS ON;
ALTER DATABASE RestaurantManagementDB SET ANSI_PADDING ON;
ALTER DATABASE RestaurantManagementDB SET QUOTED_IDENTIFIER ON;
ALTER DATABASE RestaurantManagementDB SET AUTO_UPDATE_STATISTICS ON;
ALTER DATABASE RestaurantManagementDB SET AUTO_UPDATE_STATISTICS_ASYNC ON;
GO

PRINT 'Database configuration verified. Ready for table schema generation.';
GO

