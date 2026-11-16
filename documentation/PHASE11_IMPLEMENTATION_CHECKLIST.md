# Restaurant Management System (RMS)
## Phase 11: Dynamic Website CMS & Customer Frontend Implementation Checklist

---

### Step 1: Database Stored Procedures Authoring (`database/15_CMSStoredProcedures.sql`)
- [ ] Author `database/15_CMSStoredProcedures.sql` deploying 47 single-responsibility procedures (SPs 163–209)
- [ ] **Category A: Website Settings & SEO (SPs 163–166)**:
  - [ ] Implement SP 163: `dbo.usp_CMS_GetWebsiteSettings` (branding, colors, contact, map)
  - [ ] Implement SP 164: `dbo.usp_CMS_UpdateWebsiteSettings` (admin update)
  - [ ] Implement SP 165: `dbo.usp_CMS_GetSEOSettings` (global & page-specific via PageId or PageSlug)
  - [ ] Implement SP 166: `dbo.usp_CMS_UpdateSEOSettings` (admin update)
- [ ] **Category B: Dynamic Pages & Sections (SPs 167–177)**:
  - [ ] Implement SP 167: `dbo.usp_CMS_GetPublicPageWithSections` (multi-recordset page, sections, banners; @PreviewMode guard)
  - [ ] Implement SP 168: `dbo.usp_CMS_ListPages` (admin listing with draft/published filters)
  - [ ] Implement SP 169: `dbo.usp_CMS_GetPageById` (admin detail with all sections & SEO)
  - [ ] Implement SP 170: `dbo.usp_CMS_CreatePage` (atomic creation with unique slug check)
  - [ ] Implement SP 171: `dbo.usp_CMS_UpdatePage` (title, hero banner, rich HTML, order)
  - [ ] Implement SP 172: `dbo.usp_CMS_SetPageStatus` (transitions `DRAFT` $\rightarrow$ `PUBLISHED` $\rightarrow$ `ARCHIVED`)
  - [ ] Implement SP 173: `dbo.usp_CMS_DeletePage` (soft delete with system page protection)
  - [ ] Implement SP 174: `dbo.usp_CMS_CreatePageSection` (adds modular section block)
  - [ ] Implement SP 175: `dbo.usp_CMS_UpdatePageSection` (updates title, component type, JSON, style)
  - [ ] Implement SP 176: `dbo.usp_CMS_ReorderPageSections` (atomic batch reorder from JSON array)
  - [ ] Implement SP 177: `dbo.usp_CMS_DeletePageSection` (deletes section block)
- [ ] **Category C: Banners & Sliders (SPs 178–182)**:
  - [ ] Implement SP 178: `dbo.usp_CMS_GetActiveBanners` (filtered by location & datetime schedule)
  - [ ] Implement SP 179: `dbo.usp_CMS_ListBanners` (admin listing)
  - [ ] Implement SP 180: `dbo.usp_CMS_CreateBanner` (desktop/mobile images, CTAs, scheduling)
  - [ ] Implement SP 181: `dbo.usp_CMS_UpdateBanner` (admin update)
  - [ ] Implement SP 182: `dbo.usp_CMS_DeleteBanner` (soft delete)
- [ ] **Category D: Navigation Menus (SPs 183–187)**:
  - [ ] Implement SP 183: `dbo.usp_CMS_GetPublicNavigation` (hierarchical header & mobile menus)
  - [ ] Implement SP 184: `dbo.usp_CMS_ListNavigationMenus` (admin listing)
  - [ ] Implement SP 185: `dbo.usp_CMS_CreateNavigationMenu` (menu item with parent dropdown)
  - [ ] Implement SP 186: `dbo.usp_CMS_UpdateNavigationMenu` (admin update)
  - [ ] Implement SP 187: `dbo.usp_CMS_DeleteNavigationMenu` (delete with child cleanup)
- [ ] **Category E: Footer Sections (SPs 188–192)**:
  - [ ] Implement SP 188: `dbo.usp_CMS_GetPublicFooter` (multi-recordset columns + social links)
  - [ ] Implement SP 189: `dbo.usp_CMS_ListFooterSections` (admin listing)
  - [ ] Implement SP 190: `dbo.usp_CMS_CreateFooterSection` (links, rich text, hours, newsletter)
  - [ ] Implement SP 191: `dbo.usp_CMS_UpdateFooterSection` (admin update)
  - [ ] Implement SP 192: `dbo.usp_CMS_DeleteFooterSection` (delete column)
- [ ] **Category F: FAQs & Testimonials (SPs 193–202)**:
  - [ ] Implement SP 193: `dbo.usp_CMS_GetPublicFAQs` (categorized FAQ list)
  - [ ] Implement SP 194: `dbo.usp_CMS_ListFAQs` (admin listing)
  - [ ] Implement SP 195: `dbo.usp_CMS_CreateFAQ` (add question & answer)
  - [ ] Implement SP 196: `dbo.usp_CMS_UpdateFAQ` (admin update)
  - [ ] Implement SP 197: `dbo.usp_CMS_DeleteFAQ` (soft delete)
  - [ ] Implement SP 198: `dbo.usp_CMS_GetPublicTestimonials` (featured reviews & critic quotes)
  - [ ] Implement SP 199: `dbo.usp_CMS_ListTestimonials` (admin listing)
  - [ ] Implement SP 200: `dbo.usp_CMS_CreateTestimonial` (rating 1-5, author, avatar)
  - [ ] Implement SP 201: `dbo.usp_CMS_UpdateTestimonial` (admin update)
  - [ ] Implement SP 202: `dbo.usp_CMS_DeleteTestimonial` (soft delete)
- [ ] **Category G: Social Media Links (SPs 203–205)**:
  - [ ] Implement SP 203: `dbo.usp_CMS_ListSocialLinks` (list all social media links)
  - [ ] Implement SP 204: `dbo.usp_CMS_SaveSocialMediaLink` (upsert social media profile)
  - [ ] Implement SP 205: `dbo.usp_CMS_DeleteSocialMediaLink` (delete social link)
- [ ] **Category H: Contact Messages & Inquiries (SPs 206–209)**:
  - [ ] Implement SP 206: `dbo.usp_CMS_SubmitContactMessage` (strictly writes ONLY to `dbo.ContactMessages`; zero writes to `dbo.Notifications`)
  - [ ] Implement SP 207: `dbo.usp_CMS_ListContactMessages` (admin listing with status filters)
  - [ ] Implement SP 208: `dbo.usp_CMS_GetContactMessageById` (admin detail and mark read)
  - [ ] Implement SP 209: `dbo.usp_CMS_ReplyContactMessage` (record staff reply notes and mark replied)

---

### Step 2: Database Stored Procedure Verification (Isolated Test DB & Primary DB)
- [ ] Deploy `database/15_CMSStoredProcedures.sql` to `RestaurantManagementDB_IsolatedTest`
- [ ] Deploy `database/15_CMSStoredProcedures.sql` to primary `RestaurantManagementDB`
- [ ] Author SQL unit test script: `database/tests/15_CMSStoredProcedures_Test.sql`
- [ ] Verify 100% test success rate on all 47 procedures

---

### Step 3: CMS Service Backend Implementation (`backend/cms-service/`, Port `8004`)
- [ ] Author `src/repositories/cms.repository.js` executing SPs 163–209 via `@rms/shared` database pool
- [ ] Author `src/services/media.service.js` with Cloudinary signed upload generation & asset destruction
- [ ] Author `src/services/cms.service.js`:
  - Business logic and Redis caching
  - Strict Preview Mode Authentication Guard (requires valid staff JWT for `?preview=true`; rejects unauthenticated with 401/403)
  - Asynchronous internal REST call to `notification-service` (:8012) `POST /api/v1/notifications/internal/broadcast` on contact inquiry submission
- [ ] Author `src/validators/cms.validator.js` (Joi validation schemas for all public & admin payloads)
- [ ] Author `src/controllers/public.controller.js` (cached public website endpoints)
- [ ] Author `src/controllers/admin.controller.js` (JWT & RBAC guarded management endpoints)
- [ ] Author `src/routes/public.routes.js` and `src/routes/admin.routes.js`
- [ ] Mount routes in `src/app.js` under `/api/v1/cms`

---

### Step 4: Redis Caching & Invalidation Layer
- [ ] Implement cache-aside pattern on public GET endpoints (`cms:public:v{ver}:*`, TTL 600s)
- [ ] Implement Dual-Tier Non-Blocking Cache Invalidation (tracked key set purge + atomic version roll `INCR cms:public:version`)

---

### Step 5: API Gateway Ingress & RBAC Verification (`backend/api-gateway/`, Port `8000`)
- [ ] Verify `/api/v1/cms` proxy forwarding to port 8004
- [ ] Verify public whitelist pattern `/^\/api\/v1\/cms\/public(\/.*)?$/`
- [ ] Verify admin RBAC pattern `/^\/api\/v1\/cms\/admin(\/.*)?$/` with `['SUPER_ADMIN', 'RESTAURANT_MANAGER']`

---

### Step 6: Public Customer Frontend Implementation (`frontend/customer-web/`)
- [ ] Scaffold Vite + React 18 + Tailwind CSS application
- [ ] Implement `src/api/` Axios client with `X-Correlation-ID` header injection
- [ ] Implement `ThemeContext.jsx` injecting database color tokens into CSS `:root`
- [ ] Implement Section Component Registry with all 12 modular components
- [ ] Implement `DynamicPageView.jsx` with `react-router-dom` v6
- [ ] Implement `SEOHelmet.jsx` with OpenGraph & Schema.org `Restaurant` JSON-LD
- [ ] Implement `Navbar.jsx` with mobile hamburger drawer
- [ ] Implement `Footer.jsx` with social icons and operating hours
- [ ] Implement `ContactPage.jsx` with inquiry form submission

---

### Step 7: Automated End-to-End Verification (`scripts/test_phase11.js`)
- [ ] Author `scripts/test_phase11_cms.js` testing all public and admin REST endpoints
- [ ] Author `scripts/test_phase11.js` master test runner
- [ ] Achieve 100% test pass rate

---

### Step 8: Full Platform Regression Testing (Phases 4 through 11)
- [ ] Run `scripts/test_phase4.js` (Auth & User)
- [ ] Run `scripts/test_phase5.js` (Restaurant & Floor)
- [ ] Run `scripts/test_phase6.js` (Menu & Redis)
- [ ] Run `scripts/test_phase7.js` (Cart & Order)
- [ ] Run `scripts/test_phase8.js` (Inventory & BOM)
- [ ] Run `scripts/test_phase9.js` (Payment & Razorpay)
- [ ] Run `scripts/test_phase10.js` (Kitchen & Notification)
- [ ] Run `scripts/test_phase11.js` (CMS & Customer Frontend)
- [ ] Verify all cumulative assertions pass with 100% success rate
- [ ] Update `DEVELOPMENT_PROGRESS.md`

