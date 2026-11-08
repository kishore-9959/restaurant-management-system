# Restaurant Management System (RMS)
## Master Development Progress & Milestone Tracker

---

### Project Status Overview

- **Current Milestone**: Phase 2 — Database Architecture & Development
- **Status**: **Phase 2 Complete (Awaiting User Review & Sign-Off)**
- **Next Milestone**: Phase 3 — Backend Scaffolding, MSSQL Connection, Sequelize Models & Migrations, Authentication & RBAC Engine
- **Lead Architect**: Senior SQL Server Database Architect & Full-Stack Lead

---

### Phase Execution Tracker

| Phase # | Phase Title | Status | Completion Date | Sign-off Gate |
| :---: | :--- | :---: | :---: | :---: |
| **Phase 1** | **Architecture, Requirements, Database Design & Roadmap** | **COMPLETED** | **2026-11-08** | **Approved by User** |
| **Phase 2** | **Database Architecture & SQL Development** | **COMPLETED** | **2026-11-08** | **Pending User Review** |
| **Phase 3** | Backend Scaffolding, Sequelize Models, Auth & RBAC | *Blocked (Awaiting Phase 2 Sign-Off)* | - | Pending |
| **Phase 4** | Dining Sections, Floor Layout & QR Code Engine | *Planned* | - | Pending |
| **Phase 5** | Menu, Categories, Variants & Addons Engine | *Planned* | - | Pending |
| **Phase 6** | Ordering & Cart Engine (Customer QR & Staff POS) | *Planned* | - | Pending |
| **Phase 7** | Kitchen Display System (KDS) & Socket.IO Real-Time Dispatch | *Planned* | - | Pending |
| **Phase 8** | Razorpay Payment Gateway, Webhooks & Split Billing | *Planned* | - | Pending |
| **Phase 9** | Inventory Management & Bill of Materials (BOM) Depletion | *Planned* | - | Pending |
| **Phase 10** | Table Reservation & Floor Scheduling Engine | *Planned* | - | Pending |
| **Phase 11** | Sales Reports, Business Intelligence & Final Hardening | *Planned* | - | Pending |

---

### Detailed Phase 2 Deliverables Checklist (Completed)

- [x] **Database Requirement Synthesis**: Synthesized requirements across all 28 requested modules plus operations (KOT, Shift Sessions, BOM recipes).
- [x] **Database Engine & Settings Configuration**:
  - `database/01_CreateDatabase.sql`: Database creation, UTF-8 collation, RCSI (`READ_COMMITTED_SNAPSHOT ON`), Snapshot Isolation, and async statistics.
- [x] **44 Normalized Tables Created**:
  - `database/02_CreateTables.sql`: Full DDL with Primary Keys, NOT NULL constraints, historical price snapshots, soft deletion columns, and strict SQL Server data types.
- [x] **Referential Integrity & Constraints Configured**:
  - `database/03_CreateRelationships.sql`: All Foreign Keys isolated with explicit cascade and `NO ACTION` rules to prevent multiple cascade paths in MSSQL.
- [x] **Performance Indexing Strategy**:
  - `database/04_CreateIndexes.sql`: Non-clustered and filtered indexes (`WHERE IsDeleted = 0`) on all foreign keys, status fields, search slugs, and date ranges.
- [x] **Realistic Development Seed Data**:
  - `database/05_SeedData.sql`: Realistic seed data covering restaurants, branches, 6 roles, granular permissions, staff, table layout, menu taxonomy, variants, addons, suppliers, raw ingredients, and recipe BOM.
- [x] **Mission-Critical Stored Procedures**:
  - `database/06_StoredProcedures.sql`:
    1. `sp_PlaceOrderWithBOMDepletion` (Atomic transaction: order + KOT + recipe inventory deduction)
    2. `sp_SettlePaymentAndCompleteOrder` (Atomic payment verification, table status transition, order completion)
    3. `sp_OpenCashRegisterShift` (Float tracking)
    4. `sp_CloseCashRegisterShift` (Float balancing & Z-report over/short calculation)
    5. `sp_CheckTableAvailability` (Reservation slot conflict prevention)
- [x] **Master Architectural Documentation**:
  - `documentation/DATABASE_DESIGN.md`: Complete Data Dictionary, 55-table inventory, and referential rules.
  - `documentation/ER_DIAGRAM.md`: Comprehensive domain ER diagrams rendered in Mermaid syntax.
  - `documentation/DYNAMIC_CMS_DESIGN.md`: Full architectural specification for dynamic website content management, Cloudinary asset pipeline, and section component registry.
- [x] **Dynamic Website CMS Module (55 Tables Total)**:
  - 11 Dynamic CMS tables added to `database/02_CreateTables.sql` (`WebsiteSettings`, `SEOSettings`, `WebsitePages`, `WebsitePageSections`, `WebsiteBanners`, `NavigationMenus`, `FooterSections`, `FAQs`, `Testimonials`, `SocialMediaLinks`, `ContactMessages`).
  - Referential foreign keys appended to `database/03_CreateRelationships.sql`.
  - Filtered and non-clustered performance indexes appended to `database/04_CreateIndexes.sql`.
  - Cloudinary asset metadata attributes (`Url` + `PublicId`) supported across all CMS media entities.
  - Development seed data appended to `database/05_SeedData.sql` for homepage banners, navigation, sections, FAQs, testimonials, and footer.

---

### Phase 2 Database Validation Report

- **Circular Foreign Key Checks**: Verified. The bi-directional relationship between `RestaurantTables` and `Orders` was decoupled: `RestaurantTables.ActiveOrderId` is maintained as a soft indexed reference without an enforced cascading constraint, while `Orders.TableId` enforces strict referential integrity.
- **Multiple Cascade Paths**: Verified. SQL Server throws error 1785 if multiple cascade paths exist. All parent-child chains (`Orders` -> `OrderItems` -> `OrderItemAddons`, `MenuItems` -> `MenuItemVariants`) have unique cascade paths, while cross-cutting lookups (`BranchId`, `UserId`) utilize `ON DELETE NO ACTION` or `SET NULL`.
- **Historical Price Preservation**: Verified. `OrderItems` and `OrderItemAddons` store `ItemNameSnapshot`, `VariantNameSnapshot`, `UnitPrice`, and `AddonNameSnapshot` alongside original entity IDs.
- **Monetary Precision**: Verified. All prices, taxes, discounts, and payments use `DECIMAL(10,2)`. All recipe ingredient quantities and stock balances use `DECIMAL(12,4)`.
- **Soft Delete Support**: Verified. All master tables incorporate `IsDeleted BIT NOT NULL DEFAULT 0` and `DeletedAt DATETIME2(3) NULL`. Filtered indexes are applied where appropriate.

---

### Important Restrictions Observed
- No backend Express application code has been generated.
- No React frontend code has been created.
- Razorpay payment SDK has not been integrated yet.
- No destructive SQL commands were executed against the live server.
- Database scripts have been authored, validated, and placed in the `database/` directory ready for deployment.
