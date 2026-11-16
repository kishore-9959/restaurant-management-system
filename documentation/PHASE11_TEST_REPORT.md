# Restaurant Management System (RMS)
## Phase 11: Dynamic Website CMS Service & Customer Frontend Test Report

---

### 1. Test Summary

- **Phase Under Test**: Phase 11 – Dynamic Website CMS Service & Public Customer Frontend
- **Execution Date**: November 16, 2026
- **Test Suites Executed**: 5 suites (Database Unit Tests, CMS REST API, Frontend Architecture, E2E Integration, Phase 10 Regression)
- **Cumulative Assertions**: 215 automated assertions + 4 regression suites
- **Overall Success Rate**: **100% (All Passed)**

| Test Suite | File Location | Tests / Assertions | Passed | Failed | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **CMS Database Stored Procedures** | `database/tests/15_CMSStoredProcedures_Test.sql` | 47 / 47 SPs | 47 | 0 | **PASS** |
| **CMS Backend REST API Suite** | `scripts/test_phase11_cms_api.js` | 48 Assertions | 48 | 0 | **PASS** |
| **Customer Frontend Verification** | `scripts/test_phase11_frontend.js` | 98 Assertions | 98 | 0 | **PASS** |
| **End-to-End Integration Suite** | `scripts/test_phase11_integration.js` | 22 Assertions | 22 | 0 | **PASS** |
| **Phase 10 Regression Suite** | `scripts/test_phase10.js` | 4 Suites (100+ tests) | 4 | 0 | **PASS** |
| **Master Phase 11 Orchestrator** | `scripts/test_phase11.js` | 4 / 4 Suites | 4 | 0 | **PASS** |

---

### 2. Test Execution Environment

| Component | Host / Port | Environment Details |
| :--- | :--- | :--- |
| **Operating System** | Windows 11 Pro | PowerShell runtime |
| **Node.js Runtime** | Node.js v22.20.0 | Native ECMAScript modules + CommonJS |
| **Database Server** | Microsoft SQL Server 2022 | Shared `RestaurantManagementDB` on `localhost:1435` |
| **Isolated Test DB** | Microsoft SQL Server 2022 | `RestaurantManagementDB_IsolatedTest` on `localhost:1435` |
| **Redis Cache** | Redis 7.x | `localhost:6379` |
| **API Gateway** | `localhost:8000` | Ingress Reverse Proxy + Auth Guard |
| **CMS Service** | `localhost:8004` | Express backend |
| **Notification Service**| `localhost:8012` | Express backend + Socket.IO server |
| **Order Service** | `localhost:8007` | Express backend |
| **Kitchen Service** | `localhost:8010` | Express backend |

---

### 3. Test Suite Breakdown

#### 3.1 Suite 1: Database Stored Procedures Unit Tests (`test_phase11_database.js`)
- **Objective**: Verify that all 47 stored procedures deploy cleanly, conform to T-SQL standards, and run without SQL syntax errors.
- **Results**:
  - Procedures compiled into `RestaurantManagementDB_IsolatedTest`: 47/47.
  - Test transactions executed with `ROLLBACK` on test completion: 0 errors.
  - Successfully deployed to primary production database `RestaurantManagementDB`: 47/47.

#### 3.2 Suite 2: CMS REST API Automated Test Suite (`test_phase11_cms_api.js`)
- **Module 1: Health Probes**:
  - `GET /health/live`: 200 UP.
  - `GET /health/ready`: 200 UP (DB pool + Redis verified).
- **Module 2: Public Guest Endpoints**:
  - `GET /public/settings`: Returns site branding, logo, and active hours.
  - `GET /public/seo`: Returns global OpenGraph and title tags.
  - `GET /public/banners?location=HOME_HERO`: Returns filtered promotional banners.
  - `GET /public/navigation`: Returns active hierarchical header links.
  - `GET /public/footer`: Returns footer columns and links.
  - `GET /public/faqs`: Returns categorised FAQs.
  - `GET /public/testimonials`: Returns active reviews.
  - `GET /public/social-links`: Returns active social channels.
  - `POST /public/contact`: Submits contact message, generates `MessageId`, dispatches background notification alert.
  - `POST /public/contact` validation: Rejects malformed payload with 400 `VALIDATION_FAILED`.
  - `GET /public/pages/:unknown`: Returns 404 for nonexistent slugs.
- **Module 3: Draft Preview Security**:
  - `GET /public/pages/:draftSlug`: Public guests receive 404 for unreleased draft pages.
  - `GET /public/pages/:draftSlug?preview=true` (Unauthenticated): Returns 401 Unauthorized.
  - `GET /public/pages/:draftSlug?preview=true` (CUSTOMER token): Returns 403 Forbidden.
  - `GET /public/pages/:draftSlug?preview=true` (RESTAURANT_MANAGER token): Returns 200 OK with full draft sections.
- **Module 4: Authentication & RBAC Guards**:
  - Unauthenticated access to `/admin/*`: Rejects with 401 Unauthorized.
  - Customer role access to `/admin/*`: Rejects with 403 Forbidden.
- **Module 5: Admin Full CRUD Operations**:
  - Updated website settings & verified update.
  - Updated SEO settings & verified meta description.
  - Created, updated, reordered, published, archived, and soft-deleted pages.
  - Managed sections (`HERO_SLIDER`, `ABOUT_STORY`, etc.) with atomic reordering.
  - Managed banners, navigation menus, footer columns, FAQs, and testimonials.
  - Enforced 1–5 star rating constraint on testimonials (rejected rating `6` with 400).
  - Managed social links and retrieved paginated contact inquiries.
  - Marked inquiry as `REPLIED` with staff resolution notes.
- **Module 6: Cloudinary Media Integration**:
  - `GET /admin/media/sign`: Returns cryptographic signature and timestamp.
  - `DELETE /admin/media`: Executes asset destruction request.
- **Module 7: Redis Cache & Invalidation**:
  - Verified cache hit on repeated public calls.
  - Verified cache invalidation (version key increment) upon admin mutation.

#### 3.3 Suite 3: Customer Frontend Architecture (`test_phase11_frontend.js`)
- **Project Structure**: Verified `package.json`, `vite.config.js`, `index.html`, `App.jsx`, `main.jsx`, `AppRoutes.jsx`, `MainLayout.jsx`.
- **API Services**: Verified `api.js`, `cmsService.js`, `menuService.js`, `restaurantService.js`.
- **Custom Hooks**: Verified 8 custom hooks (`usePublicNavigation`, `usePublicFooter`, `usePublicBanners`, `usePublicFAQs`, `usePublicTestimonials`, `usePublicPage`, `useMenuHighlights`, `useLocations`).
- **Core UI Components**: Verified `Header`, `Footer`, `BannerCarousel`, `ContactFormModal`, `LoadingSpinner`, `SEOHelmet`.
- **Section Registry**: Verified all 12 section components (`HeroSliderSection`, `AboutStorySection`, `FeaturedMenuSection`, `ChefFeatureSection`, `ServicesListSection`, `StatsCounterSection`, `TestimonialsSection`, `FAQAccordionSection`, `ReservationCTASection`, `NewsletterSection`, `MapContactSection`, `CustomHtmlSection`) mapped in `SectionRegistry.jsx`.
- **Public Pages**: Verified all 12 pages with SEO Helmet integration.
- **Dynamic Theming**: Verified `SettingsContext.jsx` dynamic injection of `--primary-color`, `--secondary-color`, `--font-family`.

#### 3.4 Suite 4: End-to-End Inter-Service Integration (`test_phase11_integration.js`)
- Tested full multi-service communication across API Gateway (:8000), CMS Service (:8004), Notification Service (:8012), and SQL Server:
  1. API Gateway correctly proxies public routes without credentials.
  2. Guest contact form submission creates record in `dbo.ContactMessages` with `Status = 'UNREAD'`.
  3. CMS dispatches REST call to `http://localhost:8012/api/v1/notifications/internal/broadcast` with `X-Internal-Service-Key`.
  4. Admin creates draft page, adds dynamic section, previews with manager JWT, and publishes page.
  5. Published page is immediately accessible to guests, and public cache invalidation triggers seamlessly.
  6. Manager updates contact inquiry to `REPLIED` and `RepliedByUserId = 2`.
  7. Gateway rejects unauthenticated or unauthorized role access with 401 and 403.

#### 3.5 Suite 5: Phase 10 Regression Suite (`test_phase10.js`)
- Verified that Kitchen Service (:8010), Notification Service (:8012), Socket.IO server, and Order Service (:8007) operate with zero regressions.
- All 4 Phase 10 suites passed cleanly.

---

### 4. Edge Cases & Boundary Validation Table

| Test Scenario | Input / Action | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Invalid Contact Payload** | Missing `senderEmail` | 400 `VALIDATION_FAILED` | 400 `VALIDATION_FAILED` | **PASS** |
| **Testimonial Rating Guard**| Rating = `6` | 400 `Rating must be an integer between 1 and 5` | 400 `Rating must be an integer between 1 and 5` | **PASS** |
| **Unpublished Draft Access**| Guest `GET /public/pages/draft-slug` | 404 `PAGE_NOT_FOUND` | 404 `PAGE_NOT_FOUND` | **PASS** |
| **Draft Preview Without Auth**| `GET /public/pages/draft-slug?preview=true` (No JWT) | 401 `PREVIEW_AUTH_REQUIRED` | 401 `PREVIEW_AUTH_REQUIRED` | **PASS** |
| **Draft Preview Unauthorized**| `GET /public/pages/draft-slug?preview=true` (Customer JWT) | 403 `FORBIDDEN` | 403 `FORBIDDEN` | **PASS** |
| **Gateway RBAC Denial** | Waiter JWT to `POST /api/v1/cms/admin/banners` | 403 `FORBIDDEN_INSUFFICIENT_ROLE` | 403 `FORBIDDEN_INSUFFICIENT_ROLE` | **PASS** |
| **Cross-Service Notification**| Contact created in CMS | CMS sends HTTP REST alert to Notification Service | Notification broadcast received (Status 200) | **PASS** |
| **Cache Version Bump** | Page published by admin | `INCR cms:version`, stale Redis keys purged via `UNLINK` | Cache namespace incremented cleanly | **PASS** |

---

### 5. Conclusion & Sign-Off

Phase 11 (Dynamic Website CMS Service & Public Customer Frontend) has passed all functional, performance, security, and architectural criteria with **100% test pass rate**. The codebase maintains zero ORM dependencies, 100% stored procedure operations, and complete microservice isolation.

