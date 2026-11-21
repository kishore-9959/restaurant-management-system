/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 13 REPORT API TEST SUITE
 * File: scripts/test_phase13_api.js
 * Description: Exhaustive REST API verification for all Report & Analytics
 *              endpoints, standard response envelopes, query parameters,
 *              filtering, pagination, and Excel/CSV/PDF streaming file exports.
 * Database Target: RestaurantManagementDB_IsolatedTest
 * ============================================================================
 */

process.env.DB_NAME = 'RestaurantManagementDB_IsolatedTest';

const http = require('http');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { app } = require('../backend/report-service/src/app');
const { config, closePool } = require('@rms/shared');

const PORT = 8013;
const BASE_URL = `http://localhost:${PORT}/api/v1/reports`;

let server = null;
let client = null;

// Auth Tokens
const jwtSecret = config.jwtAccessSecret;
const adminToken = jwt.sign(
  { userId: 1, email: 'admin@antigravitybistro.com', role: 'SUPER_ADMIN', roles: ['SUPER_ADMIN'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);
const managerToken = jwt.sign(
  { userId: 2, email: 'manager@antigravitybistro.com', role: 'RESTAURANT_MANAGER', roles: ['RESTAURANT_MANAGER'], branchId: 1 },
  jwtSecret,
  { expiresIn: '1h' }
);

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`  [FAIL] ${testName} - ${details}`);
  }
}

async function run() {
  console.log('='.repeat(80));
  console.log('  PHASE 13 - REPORT SERVICE REST API & EXPORT AUTOMATED TEST SUITE');
  console.log('  Target Database: RestaurantManagementDB_IsolatedTest');
  console.log('='.repeat(80));

  // 1. Boot up Report Service HTTP Server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`\n[INIT] Report Service test server listening on port ${PORT}`);

  client = axios.create({
    baseURL: `http://localhost:${PORT}`,
    validateStatus: () => true, // capture all status codes
  });

  try {
    // SECTION 1: Health Probes
    console.log('\n--- 1. Health Probes ---');
    const healthLive = await client.get('/health/live');
    assert(healthLive.status === 200, 'GET /health/live returns 200');
    assert(healthLive.data.data.status === 'UP', 'Liveness probe indicates UP');

    const healthReady = await client.get('/health/ready');
    assert(healthReady.status === 200, 'GET /health/ready returns 200');
    assert(healthReady.data.data.status === 'UP', 'Readiness probe indicates UP');

    // SECTION 2: Executive Dashboard APIs
    console.log('\n--- 2. Executive Dashboard APIs ---');
    const dashRes = await client.get(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(dashRes.status === 200, 'GET /dashboard/summary returns 200');
    assert(dashRes.data.success === true, 'Response envelope has success: true');
    assert(dashRes.data.data.kpiSummary !== undefined, 'Dashboard has kpiSummary');
    assert(Array.isArray(dashRes.data.data.trendPreview), 'Dashboard has trendPreview array');
    assert(Array.isArray(dashRes.data.data.recentOrders), 'Dashboard has recentOrders array');

    const dashOverview = await client.get(`${BASE_URL}/dashboard/sales-overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(dashOverview.status === 200, 'GET /dashboard/sales-overview returns 200');
    assert(Array.isArray(dashOverview.data.data), 'Sales overview returns array of daily points');

    const orderOverview = await client.get(`${BASE_URL}/dashboard/order-overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(orderOverview.status === 200, 'GET /dashboard/order-overview returns 200');
    assert(orderOverview.data.data.TotalOrders !== undefined, 'Order overview has TotalOrders');

    const revOverview = await client.get(`${BASE_URL}/dashboard/revenue-overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(revOverview.status === 200, 'GET /dashboard/revenue-overview returns 200');
    assert(revOverview.data.data.NetRevenue !== undefined, 'Revenue overview has NetRevenue');

    // SECTION 3: Sales APIs
    console.log('\n--- 3. Sales Reports APIs ---');
    const salesDaily = await client.get(`${BASE_URL}/sales/daily?branchId=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(salesDaily.status === 200, 'GET /sales/daily returns 200');
    assert(Array.isArray(salesDaily.data.data), 'Daily sales returns array');

    const salesMonthly = await client.get(`${BASE_URL}/sales/monthly?year=2026`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(salesMonthly.status === 200, 'GET /sales/monthly returns 200');
    assert(Array.isArray(salesMonthly.data.data), 'Monthly sales returns array');

    const salesTrends = await client.get(`${BASE_URL}/sales/trends?interval=DAY`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(salesTrends.status === 200, 'GET /sales/trends returns 200');
    assert(Array.isArray(salesTrends.data.data), 'Sales trends returns array');

    const salesBranches = await client.get(`${BASE_URL}/sales/branches`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(salesBranches.status === 200, 'GET /sales/branches returns 200 (SUPER_ADMIN)');
    assert(Array.isArray(salesBranches.data.data), 'Sales by branch returns array');

    const salesRestaurants = await client.get(`${BASE_URL}/sales/restaurants`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(salesRestaurants.status === 200, 'GET /sales/restaurants returns 200');
    assert(Array.isArray(salesRestaurants.data.data), 'Sales by restaurant returns array');

    const salesItems = await client.get(`${BASE_URL}/sales/items?topN=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(salesItems.status === 200, 'GET /sales/items returns 200');
    assert(Array.isArray(salesItems.data.data), 'Sales by item returns array');

    const salesCategories = await client.get(`${BASE_URL}/sales/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(salesCategories.status === 200, 'GET /sales/categories returns 200');
    assert(Array.isArray(salesCategories.data.data), 'Sales by category returns array');

    // SECTION 4: Revenue & Reconciliation APIs
    console.log('\n--- 4. Revenue Reports APIs ---');
    const revSummary = await client.get(`${BASE_URL}/revenue/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(revSummary.status === 200, 'GET /revenue/summary returns 200');
    assert(revSummary.data.data.GrossSales !== undefined, 'Revenue summary contains GrossSales');
    assert(revSummary.data.data.NetRevenue !== undefined, 'Revenue summary contains NetRevenue');

    const revMethods = await client.get(`${BASE_URL}/revenue/payment-methods`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(revMethods.status === 200, 'GET /revenue/payment-methods returns 200');
    assert(Array.isArray(revMethods.data.data), 'Revenue by payment method returns array');

    const revRefunds = await client.get(`${BASE_URL}/revenue/refunds`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(revRefunds.status === 200, 'GET /revenue/refunds returns 200');
    assert(Array.isArray(revRefunds.data.data), 'Revenue refunds returns array');

    // SECTION 5: Orders Reports APIs
    console.log('\n--- 5. Orders Reports APIs ---');
    const ordSummary = await client.get(`${BASE_URL}/orders/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(ordSummary.status === 200, 'GET /orders/summary returns 200');
    assert(ordSummary.data.data.TotalOrders !== undefined, 'Orders summary has TotalOrders');

    const ordPeak = await client.get(`${BASE_URL}/orders/peak-hours`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(ordPeak.status === 200, 'GET /orders/peak-hours returns 200');
    assert(Array.isArray(ordPeak.data.data), 'Orders peak hours returns array');

    const ordTopItems = await client.get(`${BASE_URL}/orders/top-items?topN=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(ordTopItems.status === 200, 'GET /orders/top-items returns 200');
    assert(Array.isArray(ordTopItems.data.data), 'Top items returns array');

    // SECTION 6: Inventory Reports APIs
    console.log('\n--- 6. Inventory Reports APIs ---');
    const invStock = await client.get(`${BASE_URL}/inventory/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invStock.status === 200, 'GET /inventory/summary returns 200');
    assert(Array.isArray(invStock.data.data), 'Inventory stock returns array');

    const invLow = await client.get(`${BASE_URL}/inventory/low-stock`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invLow.status === 200, 'GET /inventory/low-stock returns 200');
    assert(Array.isArray(invLow.data.data), 'Inventory low stock returns array');

    const invTx = await client.get(`${BASE_URL}/inventory/transactions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invTx.status === 200, 'GET /inventory/transactions returns 200');
    assert(Array.isArray(invTx.data.data), 'Inventory transactions returns array');

    const invVal = await client.get(`${BASE_URL}/inventory/valuation`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invVal.status === 200, 'GET /inventory/valuation returns 200');
    assert(invVal.data.data.overallTotals !== undefined, 'Valuation has overallTotals');

    const invCons = await client.get(`${BASE_URL}/inventory/consumption`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invCons.status === 200, 'GET /inventory/consumption returns 200');
    assert(Array.isArray(invCons.data.data.ingredientDetails), 'Consumption has ingredientDetails');

    // SECTION 7: Reservation Reports APIs
    console.log('\n--- 7. Reservation Reports APIs ---');
    const resSummary = await client.get(`${BASE_URL}/reservations/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resSummary.status === 200, 'GET /reservations/summary returns 200');
    assert(resSummary.data.data.TotalBookings !== undefined, 'Reservation summary has TotalBookings');

    const resTrends = await client.get(`${BASE_URL}/reservations/trends`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resTrends.status === 200, 'GET /reservations/trends returns 200');
    assert(Array.isArray(resTrends.data.data), 'Reservation trends returns array');

    // SECTION 8: Customer Analytics & Performance APIs
    console.log('\n--- 8. Customer Analytics & Performance Scorecards ---');
    const custAnalytics = await client.get(`${BASE_URL}/customers/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(custAnalytics.status === 200, 'GET /customers/summary returns 200');
    assert(custAnalytics.data.data.TotalRegisteredCustomers !== undefined, 'Customer analytics has TotalRegisteredCustomers');

    const custTop = await client.get(`${BASE_URL}/customers/top-customers?topN=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(custTop.status === 200, 'GET /customers/top-customers returns 200 (SUPER_ADMIN)');
    assert(Array.isArray(custTop.data.data), 'Customer top spenders returns array');

    const branchPerf = await client.get(`${BASE_URL}/branches/performance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(branchPerf.status === 200, 'GET /branches/performance returns 200 (SUPER_ADMIN)');
    assert(Array.isArray(branchPerf.data.data), 'Branch performance scorecard returns array');

    const restPerf = await client.get(`${BASE_URL}/restaurants/performance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(restPerf.status === 200, 'GET /restaurants/performance returns 200 (SUPER_ADMIN)');
    assert(Array.isArray(restPerf.data.data), 'Restaurant performance rollup returns array');

    // SECTION 9: File Streaming Exports
    console.log('\n--- 9. File Streaming Exports (Excel, CSV, PDF) ---');
    const excelExport = await client.get(`${BASE_URL}/export/sales-daily?format=excel`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      responseType: 'arraybuffer',
    });
    assert(excelExport.status === 200, 'GET /export/sales-daily?format=excel returns 200');
    assert(
      excelExport.headers['content-type'] === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Excel export has correct spreadsheet Content-Type'
    );
    assert(excelExport.data.length > 500, `Excel file received with non-trivial size (${excelExport.data.length} bytes)`);

    const csvExport = await client.get(`${BASE_URL}/export/sales-daily?format=csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(csvExport.status === 200, 'GET /export/sales-daily?format=csv returns 200');
    assert(csvExport.headers['content-type'].includes('text/csv'), 'CSV export has correct text/csv Content-Type');
    assert(csvExport.data.includes('Sale Date,Order Count,Gross Sales'), 'CSV export has valid header row');

    const pdfExport = await client.get(`${BASE_URL}/export/sales-daily?format=pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      responseType: 'arraybuffer',
    });
    assert(pdfExport.status === 200, 'GET /export/sales-daily?format=pdf returns 200');
    assert(pdfExport.headers['content-type'] === 'application/pdf', 'PDF export has application/pdf Content-Type');
    assert(pdfExport.data.length > 500, `PDF file received with non-trivial size (${pdfExport.data.length} bytes)`);

    // Multiple report exports verification
    const pmExport = await client.get(`${BASE_URL}/export/revenue-methods?format=excel`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      responseType: 'arraybuffer',
    });
    assert(pmExport.status === 200, 'GET /export/revenue-methods?format=excel returns 200');

    const stockExport = await client.get(`${BASE_URL}/export/inventory-stock?format=csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(stockExport.status === 200, 'GET /export/inventory-stock?format=csv returns 200');

    const topItemsExport = await client.get(`${BASE_URL}/export/top-items?format=pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      responseType: 'arraybuffer',
    });
    assert(topItemsExport.status === 200, 'GET /export/top-items?format=pdf returns 200');

    console.log('\n' + '='.repeat(80));
    console.log(`  PHASE 13 API SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('='.repeat(80) + '\n');

    if (failedCount > 0) {
      throw new Error(`${failedCount} API tests failed!`);
    }
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    try {
      const { getRedisClient } = require('@rms/shared');
      const r = getRedisClient();
      if (r) {
        await r.quit().catch(() => r.disconnect());
      }
    } catch (e) {}
    await closePool();
  }
}

if (require.main === module) {
  run().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('\n[FATAL ERROR IN API TESTS]:', err);
    process.exit(1);
  });
}

module.exports = { run };

