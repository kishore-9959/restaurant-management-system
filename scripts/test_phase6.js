/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 6 AUTOMATED VERIFICATION SUITE
 * File: scripts/test_phase6.js
 * Description: Exhaustive verification runner for all Phase 6 requirements:
 *              Category Management, Menu Items, Variants, Addon Groups & Items,
 *              Pricing updates, Availability ("86" toggle), Image management,
 *              Redis Catalog Caching (Cache Miss, Cache Hit, Cache Invalidation),
 *              Public customer access, RBAC, Validation & Error Handling.
 * ============================================================================
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const { config, getPool, closePool, getRedisClient } = require('../backend/shared');

const GATEWAY_URL = 'http://localhost:8000';
const MENU_SERVICE_URL = 'http://localhost:8005';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + (parsed.search || ''),
      method: options.method || 'GET',
      headers,
      timeout: 10000,
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${url} timed out`));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function getErrorCode(res) {
  return res.data?.error?.code || res.data?.code;
}

const testResults = [];

function recordTest(num, name, passed, detail = '') {
  testResults.push({ num, name, passed, detail });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] Test ${String(num).padStart(2, '0')}: ${name}`);
  if (detail) {
    console.log(`         ↳ ${detail}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  RMS PHASE 6: MENU SERVICE & REDIS CATALOG CACHING SUITE');
  console.log('================================================================\n');

  // Boot servers in-process
  const { app: menuApp } = require('../backend/menu-service/src/app');
  const { app: gatewayApp } = require('../backend/api-gateway/src/app');

  const menuServer = menuApp.listen(8005);
  const gatewayServer = gatewayApp.listen(8000);

  // Wait 1 second for socket readiness
  await new Promise((r) => setTimeout(r, 1000));

  // Generate test JWT tokens
  const superAdminToken = jwt.sign(
    {
      userId: 1,
      email: 'admin@antigravitybistro.com',
      userType: 'EMPLOYEE',
      roles: ['SUPER_ADMIN'],
      permissions: ['*'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  const managerToken = jwt.sign(
    {
      userId: 2,
      email: 'manager.blr@antigravitybistro.com',
      userType: 'EMPLOYEE',
      roles: ['RESTAURANT_MANAGER'],
      permissions: ['MENU.MANAGE', 'MENU.READ'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  const chefToken = jwt.sign(
    {
      userId: 3,
      email: 'chef.blr@antigravitybistro.com',
      userType: 'EMPLOYEE',
      roles: ['KITCHEN_CHEF'],
      permissions: ['MENU.AVAILABILITY_UPDATE'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  const waiterToken = jwt.sign(
    {
      userId: 4,
      email: 'waiter.blr@antigravitybistro.com',
      userType: 'EMPLOYEE',
      roles: ['WAITSTAFF'],
      permissions: ['MENU.READ'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  let createdCategoryId = null;
  let createdMenuItemId = null;
  let createdVariantId = null;
  let createdImageId = null;
  let createdAddonGroupId = null;
  let createdAddonItemId = null;

  try {
    // ------------------------------------------------------------------------
    // GROUP 1: HEALTH & READINESS PROBES
    // ------------------------------------------------------------------------
    console.log('--- GROUP 1: HEALTH & READINESS PROBES ---');

    // Test 1: Liveness probe
    const liveRes = await request(`${MENU_SERVICE_URL}/health/live`);
    recordTest(
      1,
      'Menu Service Liveness Probe (/health/live)',
      liveRes.status === 200 && liveRes.data?.data?.status === 'UP',
      `Status: ${liveRes.status}, Process UP: ${liveRes.data?.data?.status === 'UP'}`
    );

    // Test 2: Readiness probe (DB + Redis)
    const readyRes = await request(`${MENU_SERVICE_URL}/health/ready`);
    recordTest(
      2,
      'Menu Service Readiness Probe (/health/ready: DB & Redis)',
      readyRes.status === 200 &&
        readyRes.data?.data?.status === 'UP' &&
        readyRes.data?.data?.dependencies?.database?.healthy === true &&
        readyRes.data?.data?.dependencies?.redis?.healthy === true,
      `Status: ${readyRes.status}, DB: ${readyRes.data?.data?.dependencies?.database?.healthy}, Redis: ${readyRes.data?.data?.dependencies?.redis?.healthy}`
    );

    // ------------------------------------------------------------------------
    // GROUP 2: CATEGORY MANAGEMENT
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 2: CATEGORY MANAGEMENT ---');

    // Test 3: Create Category
    const createCatRes = await request(
      `${GATEWAY_URL}/api/v1/menu/categories`,
      { method: 'POST', headers: { Authorization: `Bearer ${managerToken}` } },
      {
        branchId: 1,
        categoryName: 'Artisanal Wood-Fired Calzones',
        categorySlug: `wood-fired-calzones-${Date.now()}`,
        description: 'Folded neapolitan pizza pouches stuffed with ricotta & truffle',
        displayOrder: 10,
        imageUrl: '/images/categories/calzones.jpg',
        isActive: true,
      }
    );
    createdCategoryId = createCatRes.data?.data?.CategoryId;
    recordTest(
      3,
      'Create Category (POST /api/v1/menu/categories)',
      createCatRes.status === 201 && createdCategoryId !== undefined,
      `Status: ${createCatRes.status}, CategoryId: ${createdCategoryId}`
    );

    // Test 4: Get Category by ID
    const getCatRes = await request(`${GATEWAY_URL}/api/v1/menu/categories/${createdCategoryId}`, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    recordTest(
      4,
      'Get Category by ID (GET /api/v1/menu/categories/:id)',
      getCatRes.status === 200 && getCatRes.data?.data?.CategoryId === createdCategoryId,
      `Status: ${getCatRes.status}, CategoryName: ${getCatRes.data?.data?.CategoryName}`
    );

    // Test 5: Update Category
    const updateCatRes = await request(
      `${GATEWAY_URL}/api/v1/menu/categories/${createdCategoryId}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${managerToken}` } },
      {
        categoryName: 'Artisanal Wood-Fired Calzones & Stromboli',
        categorySlug: `calzones-stromboli-${Date.now()}`,
        description: 'Updated description for stuffed calzones and rolled stromboli',
        displayOrder: 11,
      }
    );
    recordTest(
      5,
      'Update Category (PUT /api/v1/menu/categories/:id)',
      updateCatRes.status === 200 && updateCatRes.data?.data?.DisplayOrder === 11,
      `Status: ${updateCatRes.status}, Name: ${updateCatRes.data?.data?.CategoryName}`
    );

    // Test 6: List Categories for Branch
    const listCatRes = await request(`${GATEWAY_URL}/api/v1/menu/categories?branchId=1`, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    recordTest(
      6,
      'List Categories by Branch (GET /api/v1/menu/categories?branchId=1)',
      listCatRes.status === 200 && Array.isArray(listCatRes.data?.data) && listCatRes.data?.data?.length >= 6,
      `Status: ${listCatRes.status}, Categories Count: ${listCatRes.data?.data?.length}`
    );

    // Test 7: Toggle Category Status
    const toggleCatRes = await request(
      `${GATEWAY_URL}/api/v1/menu/categories/${createdCategoryId}/status`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${managerToken}` } },
      { isActive: false }
    );
    recordTest(
      7,
      'Toggle Category Active Status (PATCH /api/v1/menu/categories/:id/status)',
      toggleCatRes.status === 200 && toggleCatRes.data?.data?.IsActive === false,
      `Status: ${toggleCatRes.status}, IsActive: ${toggleCatRes.data?.data?.IsActive}`
    );

    // Reactivate for item testing
    await request(
      `${GATEWAY_URL}/api/v1/menu/categories/${createdCategoryId}/status`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${managerToken}` } },
      { isActive: true }
    );

    // ------------------------------------------------------------------------
    // GROUP 3: MENU ITEM MANAGEMENT
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 3: MENU ITEM MANAGEMENT ---');

    // Test 8: Create Menu Item
    const itemCode = `CALZ-${Date.now().toString().slice(-4)}`;
    const createItemRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items`,
      { method: 'POST', headers: { Authorization: `Bearer ${managerToken}` } },
      {
        branchId: 1,
        categoryId: createdCategoryId,
        itemCode,
        itemName: 'Truffle Mushroom & Ricotta Calzone',
        description: 'Folded wood-fired crust with wild mushrooms, ricotta and black truffle glaze',
        basePrice: 520.00,
        costPrice: 130.00,
        taxPercentage: 5.00,
        dietaryType: 'VEG',
        spicyLevel: 0,
        preparationTimeMinutes: 18,
        isAvailable: true,
        isFeatured: true,
        displayOrder: 1,
      }
    );
    createdMenuItemId = createItemRes.data?.data?.MenuItemId;
    recordTest(
      8,
      'Create Menu Item (POST /api/v1/menu/items)',
      createItemRes.status === 201 && createdMenuItemId !== undefined,
      `Status: ${createItemRes.status}, MenuItemId: ${createdMenuItemId}, ItemCode: ${itemCode}`
    );

    // Test 9: Get Menu Item by ID (Multi-recordset)
    const getItemRes = await request(`${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}`, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    recordTest(
      9,
      'Get Menu Item by ID with Multi-Recordset (GET /api/v1/menu/items/:id)',
      getItemRes.status === 200 &&
        getItemRes.data?.data?.MenuItemId === createdMenuItemId &&
        Array.isArray(getItemRes.data?.data?.variants) &&
        Array.isArray(getItemRes.data?.data?.addonGroups) &&
        Array.isArray(getItemRes.data?.data?.images),
      `Status: ${getItemRes.status}, CategoryName: ${getItemRes.data?.data?.CategoryName}, BasePrice: ${getItemRes.data?.data?.BasePrice}`
    );

    // Test 10: Update Menu Item
    const updateItemRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${managerToken}` } },
      {
        categoryId: createdCategoryId,
        itemCode,
        itemName: 'Royal Truffle Mushroom & Ricotta Calzone',
        description: 'Upgraded with 24-month aged parmesan and white truffle drizzle',
        basePrice: 550.00,
        costPrice: 140.00,
        taxPercentage: 5.00,
        dietaryType: 'VEG',
        spicyLevel: 1,
        preparationTimeMinutes: 20,
        isAvailable: true,
        isFeatured: true,
        displayOrder: 2,
      }
    );
    recordTest(
      10,
      'Update Menu Item (PUT /api/v1/menu/items/:id)',
      updateItemRes.status === 200 && updateItemRes.data?.data?.BasePrice === 550,
      `Status: ${updateItemRes.status}, Updated Name: ${updateItemRes.data?.data?.ItemName}`
    );

    // Test 11: List Menu Items with Filters and Pagination
    const listItemsRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items?branchId=1&dietaryType=VEG&isFeatured=true&page=1&limit=10`,
      { headers: { Authorization: `Bearer ${waiterToken}` } }
    );
    recordTest(
      11,
      'List Menu Items with Filters (GET /api/v1/menu/items?branchId=1&dietaryType=VEG)',
      listItemsRes.status === 200 &&
        Array.isArray(listItemsRes.data?.data) &&
        listItemsRes.data?.meta?.totalCount >= 1,
      `Status: ${listItemsRes.status}, TotalCount: ${listItemsRes.data?.meta?.totalCount}`
    );

    // Test 12: Availability "86" Out-of-Stock Toggle by Kitchen Chef
    const toggle86Res = await request(
      `${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}/availability`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${chefToken}` } },
      { isAvailable: false }
    );
    recordTest(
      12,
      'Menu Item Availability "86" Toggle by Chef (PATCH /api/v1/menu/items/:id/availability)',
      toggle86Res.status === 200 && toggle86Res.data?.data?.IsAvailable === false,
      `Status: ${toggle86Res.status}, IsAvailable: ${toggle86Res.data?.data?.IsAvailable} (86 OUT OF STOCK)`
    );

    // Restore to Available
    await request(
      `${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}/availability`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${managerToken}` } },
      { isAvailable: true }
    );

    // Test 13: Single Item Pricing Update
    const priceUpdateRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}/pricing`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${managerToken}` } },
      { basePrice: 560.00, costPrice: 145.00, taxPercentage: 5.00 }
    );
    recordTest(
      13,
      'Single Item Pricing Update (PATCH /api/v1/menu/items/:id/pricing)',
      priceUpdateRes.status === 200 && priceUpdateRes.data?.data?.BasePrice === 560,
      `Status: ${priceUpdateRes.status}, New BasePrice: ${priceUpdateRes.data?.data?.BasePrice}`
    );

    // Test 14: Bulk Pricing Update
    const bulkPriceRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items/pricing/bulk`,
      { method: 'POST', headers: { Authorization: `Bearer ${superAdminToken}` } },
      {
        updates: [
          { menuItemId: createdMenuItemId, basePrice: 575.00, costPrice: 150.00 },
          { menuItemId: 3, basePrice: 495.00 }, // Margherita Pizza
        ],
      }
    );
    recordTest(
      14,
      'Bulk Pricing Update (POST /api/v1/menu/items/pricing/bulk)',
      bulkPriceRes.status === 200 && Array.isArray(bulkPriceRes.data?.data) && bulkPriceRes.data?.data?.length === 2,
      `Status: ${bulkPriceRes.status}, Updated Count: ${bulkPriceRes.data?.data?.length}`
    );

    // ------------------------------------------------------------------------
    // GROUP 4: MENU VARIANTS MANAGEMENT
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 4: MENU VARIANTS MANAGEMENT ---');

    // Test 15: Create Variant
    const createVarRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}/variants`,
      { method: 'POST', headers: { Authorization: `Bearer ${managerToken}` } },
      {
        variantName: 'Monster Calzone (Serves 2-3)',
        sku: `VAR-${itemCode}-XL`,
        priceAdjustment: 220.00,
        isDefault: false,
        isAvailable: true,
      }
    );
    createdVariantId = createVarRes.data?.data?.VariantId;
    recordTest(
      15,
      'Create Menu Variant (POST /api/v1/menu/items/:id/variants)',
      createVarRes.status === 201 && createdVariantId !== undefined,
      `Status: ${createVarRes.status}, VariantId: ${createdVariantId}, PriceAdjustment: ${createVarRes.data?.data?.PriceAdjustment}`
    );

    // Test 16: Update Variant
    const updateVarRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items/variants/${createdVariantId}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${managerToken}` } },
      {
        variantName: 'Colossal Calzone (Serves 3)',
        sku: `VAR-${itemCode}-XXL`,
        priceAdjustment: 240.00,
        isDefault: false,
        isAvailable: true,
      }
    );
    recordTest(
      16,
      'Update Menu Variant (PUT /api/v1/menu/items/variants/:variantId)',
      updateVarRes.status === 200 && updateVarRes.data?.data?.PriceAdjustment === 240,
      `Status: ${updateVarRes.status}, Name: ${updateVarRes.data?.data?.VariantName}`
    );

    // Test 17: Toggle Variant Availability ("86")
    const toggleVar86Res = await request(
      `${GATEWAY_URL}/api/v1/menu/items/variants/${createdVariantId}/availability`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${chefToken}` } },
      { isAvailable: false }
    );
    recordTest(
      17,
      'Toggle Variant Availability (PATCH /api/v1/menu/items/variants/:variantId/availability)',
      toggleVar86Res.status === 200 && toggleVar86Res.data?.data?.IsAvailable === false,
      `Status: ${toggleVar86Res.status}, IsAvailable: ${toggleVar86Res.data?.data?.IsAvailable}`
    );

    // Re-enable variant
    await request(
      `${GATEWAY_URL}/api/v1/menu/items/variants/${createdVariantId}/availability`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${managerToken}` } },
      { isAvailable: true }
    );

    // ------------------------------------------------------------------------
    // GROUP 5: MENU IMAGES MANAGEMENT
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 5: MENU IMAGES MANAGEMENT ---');

    // Test 18: Add Image to Menu Item
    const addImgRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}/images`,
      { method: 'POST', headers: { Authorization: `Bearer ${managerToken}` } },
      {
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/calzone-truffle.jpg',
        isPrimary: true,
        displayOrder: 1,
      }
    );
    createdImageId = addImgRes.data?.data?.ImageId;
    recordTest(
      18,
      'Add Image to Menu Item (POST /api/v1/menu/items/:id/images)',
      addImgRes.status === 201 && createdImageId !== undefined,
      `Status: ${addImgRes.status}, ImageId: ${createdImageId}`
    );

    // Test 19: List Images
    const listImgRes = await request(`${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}/images`, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    recordTest(
      19,
      'List Images for Menu Item (GET /api/v1/menu/items/:id/images)',
      listImgRes.status === 200 && Array.isArray(listImgRes.data?.data) && listImgRes.data?.data?.length >= 1,
      `Status: ${listImgRes.status}, Images Count: ${listImgRes.data?.data?.length}`
    );

    // ------------------------------------------------------------------------
    // GROUP 6: ADDON GROUPS & ADDON ITEMS
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 6: ADDON GROUPS & ADDON ITEMS ---');

    // Test 20: Create Addon Group
    const createGrpRes = await request(
      `${GATEWAY_URL}/api/v1/menu/addons/groups`,
      { method: 'POST', headers: { Authorization: `Bearer ${managerToken}` } },
      {
        branchId: 1,
        groupName: 'Dipping Sauces & Infusions',
        minSelections: 0,
        maxSelections: 2,
        isActive: true,
      }
    );
    createdAddonGroupId = createGrpRes.data?.data?.AddonGroupId;
    recordTest(
      20,
      'Create Addon Group (POST /api/v1/menu/addons/groups)',
      createGrpRes.status === 201 && createdAddonGroupId !== undefined,
      `Status: ${createGrpRes.status}, AddonGroupId: ${createdAddonGroupId}`
    );

    // Test 21: Create Addon Item in Group
    const createAddonItemRes = await request(
      `${GATEWAY_URL}/api/v1/menu/addons/groups/${createdAddonGroupId}/items`,
      { method: 'POST', headers: { Authorization: `Bearer ${managerToken}` } },
      {
        itemName: 'Truffle Garlic Butter Dip',
        price: 65.00,
        isAvailable: true,
      }
    );
    createdAddonItemId = createAddonItemRes.data?.data?.AddonItemId;
    recordTest(
      21,
      'Create Addon Item (POST /api/v1/menu/addons/groups/:id/items)',
      createAddonItemRes.status === 201 && createdAddonItemId !== undefined,
      `Status: ${createAddonItemRes.status}, AddonItemId: ${createdAddonItemId}`
    );

    // Test 22: Link Addon Group to Menu Item
    const linkRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}/addons/${createdAddonGroupId}`,
      { method: 'POST', headers: { Authorization: `Bearer ${managerToken}` } },
      { displayOrder: 1 }
    );
    recordTest(
      22,
      'Link Addon Group to Menu Item (POST /api/v1/menu/items/:id/addons/:groupId)',
      linkRes.status === 200 && linkRes.data?.data?.AddonGroupId === createdAddonGroupId,
      `Status: ${linkRes.status}, GroupName: ${linkRes.data?.data?.GroupName}`
    );

    // Test 23: Toggle Addon Item Availability ("86")
    const toggleAddon86Res = await request(
      `${GATEWAY_URL}/api/v1/menu/addons/items/${createdAddonItemId}/availability`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${chefToken}` } },
      { isAvailable: false }
    );
    recordTest(
      23,
      'Toggle Addon Item Availability (PATCH /api/v1/menu/addons/items/:id/availability)',
      toggleAddon86Res.status === 200 && toggleAddon86Res.data?.data?.IsAvailable === false,
      `Status: ${toggleAddon86Res.status}, IsAvailable: ${toggleAddon86Res.data?.data?.IsAvailable}`
    );

    // Restore addon item availability
    await request(
      `${GATEWAY_URL}/api/v1/menu/addons/items/${createdAddonItemId}/availability`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${managerToken}` } },
      { isAvailable: true }
    );

    // ------------------------------------------------------------------------
    // GROUP 7: REDIS CATALOG CACHING & PUBLIC CUSTOMER ACCESS
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 7: REDIS CATALOG CACHING & PUBLIC ACCESS ---');

    // Purge cache first to start clean
    await request(
      `${GATEWAY_URL}/api/v1/menu/admin/cache/purge`,
      { method: 'POST', headers: { Authorization: `Bearer ${managerToken}` } },
      { branchId: 1 }
    );

    // Test 24: Unauthenticated Public Catalog Access - First Request (Cache MISS)
    const pubCatalogMissRes = await request(`${GATEWAY_URL}/api/v1/menu/public/catalog/1`);
    recordTest(
      24,
      'Public Catalog Access - Cache MISS (GET /api/v1/menu/public/catalog/1)',
      pubCatalogMissRes.status === 200 &&
        pubCatalogMissRes.data?.data?._cache === 'MISS' &&
        Array.isArray(pubCatalogMissRes.data?.data?.categories),
      `Status: ${pubCatalogMissRes.status}, Cache Header: ${pubCatalogMissRes.headers['x-cache-status']}, Cache Flag: ${pubCatalogMissRes.data?.data?._cache}`
    );

    // Test 25: Unauthenticated Public Catalog Access - Second Request (Cache HIT)
    const pubCatalogHitRes = await request(`${GATEWAY_URL}/api/v1/menu/public/catalog/1`);
    recordTest(
      25,
      'Public Catalog Access - Cache HIT (GET /api/v1/menu/public/catalog/1)',
      pubCatalogHitRes.status === 200 &&
        pubCatalogHitRes.data?.data?._cache === 'HIT' &&
        pubCatalogHitRes.headers['x-cache-status'] === 'HIT',
      `Status: ${pubCatalogHitRes.status}, Cache Header: ${pubCatalogHitRes.headers['x-cache-status']}, Cache Flag: ${pubCatalogHitRes.data?.data?._cache}`
    );

    // Test 26: Automatic Cache Invalidation on Mutation ("86" toggle)
    // Toggling item availability must invalidate the Redis catalog cache
    await request(
      `${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}/availability`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${managerToken}` } },
      { isAvailable: false }
    );

    // Fetch catalog again: should be Cache MISS because cache was purged by the mutation
    const pubCatalogAfterInvalidateRes = await request(`${GATEWAY_URL}/api/v1/menu/public/catalog/1`);
    recordTest(
      26,
      'Automatic Redis Cache Invalidation on Mutation (Cache MISS after 86 toggle)',
      pubCatalogAfterInvalidateRes.status === 200 &&
        pubCatalogAfterInvalidateRes.data?.data?._cache === 'MISS',
      `Status: ${pubCatalogAfterInvalidateRes.status}, Cache Flag: ${pubCatalogAfterInvalidateRes.data?.data?._cache} (Cache was purged & freshly regenerated)`
    );

    // Restore item to Available
    await request(
      `${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}/availability`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${managerToken}` } },
      { isAvailable: true }
    );

    // Test 27: Public Categories Lookup
    const pubCatsRes = await request(`${GATEWAY_URL}/api/v1/menu/public/categories/1`);
    recordTest(
      27,
      'Public Categories Lookup (GET /api/v1/menu/public/categories/1)',
      pubCatsRes.status === 200 && Array.isArray(pubCatsRes.data?.data),
      `Status: ${pubCatsRes.status}, Categories: ${pubCatsRes.data?.data?.length}`
    );

    // Test 28: Public Item Details Lookup
    const pubItemRes = await request(`${GATEWAY_URL}/api/v1/menu/public/items/${createdMenuItemId}`);
    recordTest(
      28,
      'Public Item Details Lookup (GET /api/v1/menu/public/items/:id)',
      pubItemRes.status === 200 && pubItemRes.data?.data?.MenuItemId === createdMenuItemId,
      `Status: ${pubItemRes.status}, Item: ${pubItemRes.data?.data?.ItemName}`
    );

    // ------------------------------------------------------------------------
    // GROUP 8: SECURITY & RBAC ENFORCEMENT
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 8: SECURITY & RBAC ENFORCEMENT ---');

    // Test 29: Unauthenticated attempt to create item rejected (401)
    const unauthCreateRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items`,
      { method: 'POST' },
      { branchId: 1, categoryId: 1, itemCode: 'UNAUTH-1', itemName: 'Hacker Dish', basePrice: 100 }
    );
    recordTest(
      29,
      'Unauthenticated Mutate Rejected (401 Unauthorized)',
      unauthCreateRes.status === 401,
      `Status: ${unauthCreateRes.status}, Code: ${getErrorCode(unauthCreateRes)}`
    );

    // Test 30: Waitstaff forbidden from creating menu items (403)
    const waiterCreateRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items`,
      { method: 'POST', headers: { Authorization: `Bearer ${waiterToken}` } },
      { branchId: 1, categoryId: 1, itemCode: 'FORBID-1', itemName: 'Unauthorized Dish', basePrice: 100 }
    );
    recordTest(
      30,
      'Waitstaff Role Forbidden from Creating Menu Items (403 Forbidden)',
      waiterCreateRes.status === 403,
      `Status: ${waiterCreateRes.status}, Code: ${getErrorCode(waiterCreateRes)}`
    );

    // Test 31: Kitchen Chef forbidden from altering pricing (403)
    const chefPricingRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}/pricing`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${chefToken}` } },
      { basePrice: 999.00 }
    );
    recordTest(
      31,
      'Chef Forbidden from Updating Prices (403 Forbidden)',
      chefPricingRes.status === 403,
      `Status: ${chefPricingRes.status}, Code: ${getErrorCode(chefPricingRes)}`
    );

    // ------------------------------------------------------------------------
    // GROUP 9: VALIDATION & ERROR HANDLING
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 9: VALIDATION & ERROR HANDLING ---');

    // Test 32: Invalid Dietary Type Rejected (400)
    const badDietRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items`,
      { method: 'POST', headers: { Authorization: `Bearer ${managerToken}` } },
      {
        branchId: 1,
        categoryId: 1,
        itemCode: 'INVALID-DIET',
        itemName: 'Invalid Diet Dish',
        basePrice: 200,
        dietaryType: 'PESCATARIAN_NOT_SUPPORTED',
      }
    );
    recordTest(
      32,
      'Invalid Dietary Type Rejected (400 Bad Request)',
      badDietRes.status === 400 && getErrorCode(badDietRes) === 'VALIDATION_ERROR',
      `Status: ${badDietRes.status}, Code: ${getErrorCode(badDietRes)}`
    );

    // Test 33: Negative Base Price Rejected (400)
    const negPriceRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items`,
      { method: 'POST', headers: { Authorization: `Bearer ${managerToken}` } },
      {
        branchId: 1,
        categoryId: 1,
        itemCode: 'NEG-PRICE',
        itemName: 'Negative Price Dish',
        basePrice: -50.00,
      }
    );
    recordTest(
      33,
      'Negative Base Price Rejected (400 Bad Request)',
      negPriceRes.status === 400 && getErrorCode(negPriceRes) === 'VALIDATION_ERROR',
      `Status: ${negPriceRes.status}, Code: ${getErrorCode(negPriceRes)}`
    );

    // Test 34: Non-existent Menu Item Returns 404
    const notFoundRes = await request(`${GATEWAY_URL}/api/v1/menu/items/999999`, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    recordTest(
      34,
      'Non-existent Item Lookup Returns 404',
      notFoundRes.status === 404 && getErrorCode(notFoundRes) === 'MENU_ITEM_NOT_FOUND',
      `Status: ${notFoundRes.status}, Code: ${getErrorCode(notFoundRes)}`
    );

    // ------------------------------------------------------------------------
    // CLEANUP / SOFT DELETE TEST
    // ------------------------------------------------------------------------
    console.log('\n--- CLEANUP & SOFT DELETE ---');

    // Test 35: Soft Delete Menu Item
    const deleteItemRes = await request(
      `${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${managerToken}` } }
    );
    recordTest(
      35,
      'Soft Delete Menu Item (DELETE /api/v1/menu/items/:id)',
      deleteItemRes.status === 200 && deleteItemRes.data?.data?.Success === 1,
      `Status: ${deleteItemRes.status}, DeletedId: ${deleteItemRes.data?.data?.DeletedMenuItemId}`
    );

    // Test 36: Soft Deleted Item No Longer Returned in GET
    const getDeletedItemRes = await request(`${GATEWAY_URL}/api/v1/menu/items/${createdMenuItemId}`, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    recordTest(
      36,
      'Soft Deleted Item Inaccessible via API (404 Not Found)',
      getDeletedItemRes.status === 404,
      `Status: ${getDeletedItemRes.status}, Code: ${getErrorCode(getDeletedItemRes)}`
    );

  } finally {
    // Teardown HTTP servers and DB pool
    menuServer.close();
    gatewayServer.close();
    await closePool();
    const redis = getRedisClient();
    try {
      redis.disconnect();
    } catch {}
  }

  // Summary
  console.log('\n================================================================');
  console.log('  TEST SUMMARY');
  console.log('================================================================');
  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = total - passed;

  console.log(`Total Tests : ${total}`);
  console.log(`Passed      : ${passed} ✅`);
  console.log(`Failed      : ${failed} ❌`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%\n`);

  if (failed > 0) {
    console.error('Some tests failed. See details above.');
    process.exit(1);
  } else {
    console.log('ALL PHASE 6 VERIFICATIONS PASSED SUCCESSFULLY! 🚀');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('FATAL TEST RUNNER ERROR:', err);
  process.exit(1);
});
