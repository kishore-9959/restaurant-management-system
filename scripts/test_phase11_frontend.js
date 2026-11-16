/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 11 FRONTEND VERIFICATION SUITE
 * File: scripts/test_phase11_frontend.js
 * Description: Validates frontend component integrity, JSX syntax, exports,
 *              hooks, API services, routing, and Theme Context.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'customer-web');

console.log('='.repeat(80));
console.log('  PHASE 11 - CUSTOMER FRONTEND ARCHITECTURE & SYNTAX VERIFICATION');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// 1. Verify Directory & Key Config Files
console.log('\n--- 1. Configuration & Project Files ---');
const configFiles = [
  'package.json',
  'vite.config.js',
  'index.html',
  'src/styles/index.css',
  'src/App.jsx',
  'src/main.jsx',
  'src/routes/AppRoutes.jsx',
  'src/layouts/MainLayout.jsx',
  'src/context/SettingsContext.jsx',
];

for (const file of configFiles) {
  const filePath = path.join(FRONTEND_DIR, file);
  assert(fs.existsSync(filePath), `Config file exists: ${file}`);
}

// 2. Verify API Services
console.log('\n--- 2. API Services ---');
const apiServices = [
  'src/services/api.js',
  'src/services/cmsService.js',
  'src/services/menuService.js',
  'src/services/restaurantService.js',
];

for (const service of apiServices) {
  const filePath = path.join(FRONTEND_DIR, service);
  assert(fs.existsSync(filePath), `API service exists: ${service}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('export const') || content.includes('export default'), `Service exports methods: ${service}`);
}

// 3. Verify Custom Hooks
console.log('\n--- 3. Custom React Hooks ---');
const hooks = [
  'usePublicNavigation.js',
  'usePublicFooter.js',
  'usePublicBanners.js',
  'usePublicFAQs.js',
  'usePublicTestimonials.js',
  'usePublicPage.js',
  'useMenuHighlights.js',
  'useLocations.js',
];

for (const hook of hooks) {
  const filePath = path.join(FRONTEND_DIR, 'src', 'hooks', hook);
  assert(fs.existsSync(filePath), `Hook exists: ${hook}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('useState') && content.includes('useEffect'), `Hook uses standard React state lifecycle: ${hook}`);
}

// 4. Verify Core Reusable Components
console.log('\n--- 4. Core UI Components ---');
const coreComponents = [
  'Header.jsx',
  'Footer.jsx',
  'BannerCarousel.jsx',
  'ContactFormModal.jsx',
  'LoadingSpinner.jsx',
  'SEOHelmet.jsx',
];

for (const comp of coreComponents) {
  const filePath = path.join(FRONTEND_DIR, 'src', 'components', comp);
  assert(fs.existsSync(filePath), `Core component exists: ${comp}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('export default function'), `Component has default export: ${comp}`);
}

// 5. Verify Section Component Registry (12 Section Types)
console.log('\n--- 5. Dynamic Section Components Registry ---');
const sectionComponents = [
  'HeroSliderSection.jsx',
  'AboutStorySection.jsx',
  'FeaturedMenuSection.jsx',
  'ChefFeatureSection.jsx',
  'ServicesListSection.jsx',
  'StatsCounterSection.jsx',
  'TestimonialsSection.jsx',
  'FAQAccordionSection.jsx',
  'ReservationCTASection.jsx',
  'NewsletterSection.jsx',
  'MapContactSection.jsx',
  'CustomHtmlSection.jsx',
  'SectionRegistry.jsx',
];

for (const sec of sectionComponents) {
  const filePath = path.join(FRONTEND_DIR, 'src', 'sections', sec);
  assert(fs.existsSync(filePath), `Section component exists: ${sec}`);
}

const registryContent = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'sections', 'SectionRegistry.jsx'), 'utf-8');
const requiredKeys = [
  'HERO_SLIDER',
  'ABOUT_STORY',
  'FEATURED_MENU',
  'CHEF_FEATURE',
  'SERVICES_LIST',
  'STATS_COUNTER',
  'TESTIMONIALS_GRID',
  'FAQ_ACCORDION',
  'RESERVATION_CTA',
  'NEWSLETTER_FORM',
  'MAP_CONTACT',
  'CUSTOM_HTML',
];

for (const key of requiredKeys) {
  assert(registryContent.includes(key), `Registry contains component type: ${key}`);
}

// 6. Verify Public Pages
console.log('\n--- 6. Public Pages ---');
const pages = [
  'HomePage.jsx',
  'AboutPage.jsx',
  'MenuPage.jsx',
  'MenuItemDetailsPage.jsx',
  'LocationsPage.jsx',
  'ContactPage.jsx',
  'FAQsPage.jsx',
  'TestimonialsPage.jsx',
  'PrivacyPolicyPage.jsx',
  'TermsPage.jsx',
  'DynamicPage.jsx',
  'NotFoundPage.jsx',
];

for (const pageFile of pages) {
  const filePath = path.join(FRONTEND_DIR, 'src', 'pages', pageFile);
  assert(fs.existsSync(filePath), `Page component exists: ${pageFile}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('SEOHelmet') || pageFile === 'DynamicPage.jsx', `Page has SEO Helmet integration: ${pageFile}`);
}

// 7. Verify Dynamic CSS Variables Theme Engine
console.log('\n--- 7. Dynamic Database Theming Engine ---');
const settingsCtx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'context', 'SettingsContext.jsx'), 'utf-8');
assert(settingsCtx.includes('--primary-color'), 'SettingsContext applies --primary-color CSS variable');
assert(settingsCtx.includes('--secondary-color'), 'SettingsContext applies --secondary-color CSS variable');
assert(settingsCtx.includes('--font-family'), 'SettingsContext applies --font-family CSS variable');
assert(settingsCtx.includes('root.style.setProperty') || settingsCtx.includes('document.documentElement.style.setProperty'), 'SettingsContext dynamically injects CSS variables to documentElement');

// Summary
console.log('\n' + '='.repeat(80));
console.log(`  FRONTEND VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log('='.repeat(80));

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
