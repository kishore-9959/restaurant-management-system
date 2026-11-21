# RESERVATION SERVICE DATABASE ARCHITECTURE DESIGN
## Relational Schema, Concurrency Guards & Stored Procedures

---

## 1. Relational Entities & Microservice Ownership

| Table Name | Owner Microservice | Purpose in Reservation Service |
|---|---|---|
| `dbo.Reservations` | `reservation-service` | Primary entity: stores table bookings, customer/guest details, status, party size, time slots. |
| `dbo.RestaurantTables` | `restaurant-service` | Read-only reference: capacity verification, section assignment, overlap detection. |
| `dbo.DiningSections` | `restaurant-service` | Read-only reference: floor sections for visual layout and timeline grouping. |
| `dbo.Branches` | `restaurant-service` | Read-only reference: branch operating hours (`OpeningTime`, `ClosingTime`) for slot generation. |
| `dbo.Users` | `user-service` | Read-only reference: registered customer name/email lookup. |
| `dbo.AuditLogs` | Shared Auditing | Stores complete audit trail of status changes, table assignments, and cancellations. |

---

## 2. Table Definition: `dbo.Reservations`

```sql
CREATE TABLE dbo.Reservations (
    ReservationId BIGINT IDENTITY(1,1) NOT NULL,
    BranchId INT NOT NULL,
    TableId INT NULL,                       -- NULL until assigned by hostess or auto-allocated
    CustomerId BIGINT NULL,                 -- Optional link to registered User
    GuestName NVARCHAR(100) NOT NULL,
    GuestPhone NVARCHAR(25) NOT NULL,
    GuestEmail NVARCHAR(120) NULL,
    PartySize INT NOT NULL,
    ReservationDate DATE NOT NULL,
    StartTime TIME(0) NOT NULL,
    EndTime TIME(0) NOT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'CONFIRMED', -- CONFIRMED, SEATED, CANCELLED, NO_SHOW, COMPLETED
    SpecialRequests NVARCHAR(500) NULL,
    DepositAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    DepositPaymentId BIGINT NULL,
    CreatedByUserId BIGINT NULL,
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted BIT NOT NULL DEFAULT 0,
    DeletedAt DATETIME2(3) NULL,
    CONSTRAINT PK_Reservations PRIMARY KEY CLUSTERED (ReservationId),
    CONSTRAINT FK_Reservations_Branches FOREIGN KEY (BranchId) REFERENCES dbo.Branches(BranchId),
    CONSTRAINT FK_Reservations_RestaurantTables FOREIGN KEY (TableId) REFERENCES dbo.RestaurantTables(TableId) ON DELETE SET NULL,
    CONSTRAINT FK_Reservations_Users_Customer FOREIGN KEY (CustomerId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_Reservations_Users_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(UserId)
);
```

### Existing Indexes
- `IX_Reservations_Date_Slot`: Non-clustered index on `(BranchId, ReservationDate, StartTime, Status)` INCLUDE `(TableId, PartySize, GuestName, GuestPhone)` WHERE `IsDeleted = 0`.

---

## 3. Concurrency Locking & Overlap Detection Strategy

To prevent race conditions during simultaneous table booking attempts, stored procedures `usp_Reservation_AssignTable` and `usp_Reservation_Create` use SQL Server's `WITH (UPDLOCK, HOLDLOCK)` hint.

### Interval Overlap Condition
Two time intervals `[S1, E1)` and `[S2, E2)` overlap if and only if:
```sql
(S1 < E2 AND E1 > S2)
```

### Stored Procedure Implementation
```sql
IF EXISTS (
    SELECT 1
    FROM dbo.Reservations WITH (UPDLOCK, HOLDLOCK)
    WHERE TableId = @TableId
      AND ReservationDate = @ReservationDate
      AND Status IN ('CONFIRMED', 'SEATED')
      AND IsDeleted = 0
      AND (@StartTime < EndTime AND @EndTime > StartTime)
)
BEGIN
    THROW 51010, 'Table is already booked during this time interval.', 1;
END;
```

---

## 4. State Machine Transition Rules

The reservation lifecycle state machine is strictly enforced in stored procedure `dbo.usp_Reservation_UpdateStatus`:

```
                 +------------+
                 | CONFIRMED  |
                 +-----+------+
                       |
         +-------------+-------------+
         |                           |
         v                           v
   +-----------+              +-------------+
   |  SEATED   |              |  CANCELLED  | (Terminal)
   +-----+-----+              +-------------+
         |                           ^
         +-------------+             |
         |             |             |
         v             v             |
   +-----------+ +-----------+       |
   | COMPLETED | |  NO_SHOW  |-------+ (Or direct from CONFIRMED)
   +-----------+ +-----------+
     (Terminal)   (Terminal)
```

1. **Seating Check:** Cannot transition to `SEATED` without a non-null assigned `TableId`.
2. **Terminal Statuses:** Once `COMPLETED`, `CANCELLED`, or `NO_SHOW`, status cannot be transitioned backwards.
3. **Table Release:** Transitions to `CANCELLED` or `NO_SHOW` automatically unassign `TableId` (`SET TableId = NULL`).

