/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 12 FRONTEND VERIFICATION SUITE
 * File: scripts/test_phase12_frontend.js
 * Description: Validates frontend component integrity, exports, routes,
 *              API client, and reservation booking wizard for customer-web.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'customer-web');

console.log('='.repeat(80));
console.log('  PHASE 12 - CUSTOMER WEB RESERVATION FRONTEND VERIFICATION');
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

// 1. Files existence
console.log('\n--- 1. File Existence & Integrity ---');
const requiredFiles = [
  'src/services/reservationService.js',
  'src/pages/ReservationPage.jsx',
  'src/routes/AppRoutes.jsx',
  'src/sections/ReservationCTASection.jsx',
  'src/components/Header.jsx',
];

for (const file of requiredFiles) {
  const filePath = path.join(FRONTEND_DIR, file);
  assert(fs.existsSync(filePath), `File exists: ${file}`);
}

// 2. Reservation Service Exports
console.log('\n--- 2. Reservation Service API Client ---');
const serviceContent = fs.readFileSync(path.join(FRONTEND_DIR, 'src/services/reservationService.js'), 'utf8');
assert(serviceContent.includes('getTimeSlots'), 'reservationService exports getTimeSlots');
assert(serviceContent.includes('checkAvailability'), 'reservationService exports checkAvailability');
assert(serviceContent.includes('createReservation'), 'reservationService exports createReservation');
assert(serviceContent.includes('lookupReservation'), 'reservationService exports lookupReservation');
assert(serviceContent.includes('cancelReservation'), 'reservationService exports cancelReservation');
assert(serviceContent.includes('/reservations/public/book'), 'reservationService targets /reservations/public/book');

// 3. Reservation Page Component & Wizard
console.log('\n--- 3. Reservation Booking Wizard Page ---');
const pageContent = fs.readFileSync(path.join(FRONTEND_DIR, 'src/pages/ReservationPage.jsx'), 'utf8');
assert(pageContent.includes('export default function ReservationPage'), 'ReservationPage default export is defined');
assert(pageContent.includes('step === 1'), 'Step 1 (Branch & Party Size) implemented');
assert(pageContent.includes('step === 2'), 'Step 2 (Time Slot Picker) implemented');
assert(pageContent.includes('step === 3'), 'Step 3 (Guest Details) implemented');
assert(pageContent.includes('step === 4'), 'Step 4 (Booking Confirmation) implemented');
assert(pageContent.includes('activeTab === \'lookup\''), 'Self-service lookup & cancellation tab implemented');

// 4. Routing Integration
console.log('\n--- 4. Routing & Ingress Wiring ---');
const routesContent = fs.readFileSync(path.join(FRONTEND_DIR, 'src/routes/AppRoutes.jsx'), 'utf8');
assert(routesContent.includes('ReservationPage'), 'AppRoutes imports ReservationPage');
assert(routesContent.includes('path="reservations"'), 'AppRoutes mounts /reservations route');

// 5. CTA Navigation Wiring
console.log('\n--- 5. Reservation CTA Section & Header Navigation ---');
const ctaContent = fs.readFileSync(path.join(FRONTEND_DIR, 'src/sections/ReservationCTASection.jsx'), 'utf8');
assert(ctaContent.includes('to="/reservations"'), 'ReservationCTASection links to /reservations');

const headerContent = fs.readFileSync(path.join(FRONTEND_DIR, 'src/components/Header.jsx'), 'utf8');
assert(headerContent.includes('to="/reservations"'), 'Header Reserve Table CTA button links to /reservations');

console.log('\n===============================================================');
console.log('PHASE 12 FRONTEND VERIFICATION RESULTS');
console.log(`Total Passed: ${passed}`);
console.log(`Total Failed: ${failed}`);
console.log('===============================================================');

if (failed > 0) {
  process.exit(1);
}

