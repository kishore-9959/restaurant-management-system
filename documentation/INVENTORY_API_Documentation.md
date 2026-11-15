# Restaurant Management System (RMS)
# INVENTORY SERVICE API SPECIFICATION & INTEGRATION MANUAL

- **Microservice**: `inventory-service` (Port: `8009`)
- **API Gateway Prefix**: `/api/v1/inventory` (Port: `8000`)
- **Database Engine**: Microsoft SQL Server (`RestaurantManagementDB` on port `1435`)
- **Stored Procedures**: `database/12_InventoryStoredProcedures.sql` (25 SPs, SP-107 through SP-131)
- **Architecture**: Zero Sequelize ORM, Pure Stored Procedure Data Access via `@rms/shared`
- **Cache Engine**: Shared Redis (`localhost:6379`)
- **Cross-Service Communication**: HTTP REST via Axios mesh client with `X-Internal-Service-Key`

---

## 1. Summary of Domain Modules

1. **Dual Health & Readiness Probes** (`/health/live`, `/health/ready`, `/health`)
2. **Supplier Management CRUD** (`/suppliers`, `/suppliers/:id`)
3. **Raw Material Ingredient CRUD** (`/ingredients`, `/ingredients/:id`, `/ingredients/:id/status`)
4. **Stock Movements** (`/stock/in`, `/stock/out`, `/stock/adjust`, `/stock/transfer`)
5. **Recipe Bill of Materials (BOM)** (`/recipes`, `/recipes/:menuItemId`, `/recipes/:recipeId`)
6. **Order Saga Stock Orchestration** (`/bom/check`, `/bom/deplete`, `/bom/restitute`)
7. **Operational Alerts & Audit History** (`/alerts/low-stock`, `/transactions`)
8. **Valuation & Consumption Analytics** (`/reports/valuation`, `/reports/consumption`)

For full endpoint documentation, payload schemas, and response samples, refer to:
[RMS_Phase8_API_Documentation.md](file:///c:/Projects/restaurant-management-system/restaurant-management-system/documentation/RMS_Phase8_API_Documentation.md)

