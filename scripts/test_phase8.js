/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 8 AUTOMATED VERIFICATION SUITE
 * File: scripts/test_phase8.js
 * Description: Exhaustive verification runner for all Phase 8 requirements:
 *              Ingredients, Suppliers, Stock In/Out/Adjust/Transfer,
 *              Recipe BOM, Order Saga Depletion & Restitution, Low Stock Alerts,
 *              Transaction Audits, Valuation & Consumption Reports,
 *              RBAC, API Gateway Ingress, and Dual Health Probes.
 * ============================================================================
 */

// Direct tests to the isolated test database where the 25 SPs are deployed
process.env.DB_NAME = 'RestaurantManagementDB_IsolatedTest';

const http = require('http');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { config, query } = require('../backend/shared');

const GATEWAY_URL = 'http://localhost:8000';
const INVENTORY_SERVICE_URL = 'http://localhost:8009';

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

function safeListen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      resolve(server);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} already active. Reusing running service instance.`);
        resolve(null);
      } else {
        reject(err);
      }
    });
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  RMS PHASE 8: INVENTORY MANAGEMENT & BOM VERIFICATION SUITE');
  console.log('================================================================\n');

  // Boot inventory service and api-gateway
  const { app: inventoryApp } = require('../backend/inventory-service/src/app');
  const { app: gatewayApp } = require('../backend/api-gateway/src/app');

  const inventoryServer = await safeListen(inventoryApp, 8009);
  const gatewayServer = await safeListen(gatewayApp, 8000);

  // Wait 1.5 seconds for socket readiness
  await new Promise((r) => setTimeout(r, 1500));

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
      permissions: ['INVENTORY.MANAGE', 'INVENTORY.READ'],
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
      permissions: ['INVENTORY.READ', 'RECIPE.READ'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  const customerToken = jwt.sign(
    {
      userId: 5,
      email: 'customer@test.com',
      userType: 'CUSTOMER',
      roles: ['CUSTOMER'],
      permissions: [],
      branchId: null,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  const adminHeaders = {
    Authorization: `Bearer ${superAdminToken}`,
  };

  const managerHeaders = {
    Authorization: `Bearer ${managerToken}`,
  };

  const chefHeaders = {
    Authorization: `Bearer ${chefToken}`,
  };

  const customerHeaders = {
    Authorization: `Bearer ${customerToken}`,
  };

  let testSupplierId = null;
  let testIngredientId = null;
  let testIngredient2Id = null;
  let createdRecipeId = null;
  let seededOrderId = null;
  let seededOrderNumber = null;

  const uniqueSuffix = Date.now().toString().slice(-5);
  const testSupCode = `SUP-${uniqueSuffix}`;
  const testIngCode = `ING-TST-${uniqueSuffix}`;
  const testIngCode2 = `ING-BOM-${uniqueSuffix}`;

  try {
    // =========================================================================
    // GROUP 1: DUAL HEALTH PROBES & GATEWAY ROUTING
    // =========================================================================
    console.log('--- GROUP 1: Health Probes & Gateway Ingress ---');

    // Test 01: Direct Liveness Probe
    const liveRes = await request(`${INVENTORY_SERVICE_URL}/health/live`);
    recordTest(
      1,
      'Direct Inventory Service Liveness Probe (/health/live)',
      liveRes.status === 200 && liveRes.data?.data?.status === 'UP',
      `Status: ${liveRes.status}, Body status: ${liveRes.data?.data?.status}`
    );

    // Test 02: Direct Readiness Probe (DB + Redis)
    const readyRes = await request(`${INVENTORY_SERVICE_URL}/health/ready`);
    recordTest(
      2,
      'Direct Inventory Service Readiness Probe (/health/ready)',
      readyRes.status === 200 && readyRes.data?.data?.status === 'UP',
      `Status: ${readyRes.status}, DB: ${readyRes.data?.data?.dependencies?.database?.healthy}, Redis: ${readyRes.data?.data?.dependencies?.redis?.healthy}`
    );

    // Test 03: Direct Legacy /health
    const legacyHealthRes = await request(`${INVENTORY_SERVICE_URL}/health`);
    recordTest(
      3,
      'Direct Inventory Service Legacy /health',
      legacyHealthRes.status === 200 && legacyHealthRes.data?.data?.status === 'UP',
      `Status: ${legacyHealthRes.status}`
    );

    // Test 04: Gateway Forwarded Liveness Probe
    const gwLiveRes = await request(`${GATEWAY_URL}/api/v1/inventory/health/live`);
    recordTest(
      4,
      'API Gateway Ingress Liveness Probe (/api/v1/inventory/health/live)',
      gwLiveRes.status === 200 && gwLiveRes.data?.data?.status === 'UP',
      `Gateway forwarded HTTP ${gwLiveRes.status}`
    );

    // Test 05: Gateway Forwarded Readiness Probe
    const gwReadyRes = await request(`${GATEWAY_URL}/api/v1/inventory/health/ready`);
    recordTest(
      5,
      'API Gateway Ingress Readiness Probe (/api/v1/inventory/health/ready)',
      gwReadyRes.status === 200 && gwReadyRes.data?.data?.status === 'UP',
      `Gateway forwarded HTTP ${gwReadyRes.status}`
    );

    // =========================================================================
    // GROUP 2: SUPPLIER MANAGEMENT
    // =========================================================================
    console.log('\n--- GROUP 2: Supplier Management CRUD ---');

    // Test 06: Create Supplier
    const createSupRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/suppliers`,
      { method: 'POST', headers: adminHeaders },
      {
        supplierCode: testSupCode,
        supplierName: `Fresh Farms Dairy ${uniqueSuffix}`,
        contactPerson: 'Ramesh Patel',
        email: `ramesh_${uniqueSuffix}@freshfarms.in`,
        phone: '9876543210',
        address: 'Plot 45, APMC Market Yard',
        paymentTerms: 'Net 30',
      }
    );
    testSupplierId = createSupRes.data?.data?.SupplierId;
    recordTest(
      6,
      'Create Supplier via API Gateway (POST /suppliers)',
      createSupRes.status === 201 && testSupplierId > 0,
      `Status: ${createSupRes.status}, SupplierId: ${testSupplierId}`
    );

    // Test 07: Validate Supplier Payload (Missing required supplierName)
    const invalidSupRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/suppliers`,
      { method: 'POST', headers: adminHeaders },
      { contactPerson: 'No Name' }
    );
    recordTest(
      7,
      'Reject Supplier creation missing required supplierName (HTTP 400)',
      invalidSupRes.status === 400 && getErrorCode(invalidSupRes) === 'VALIDATION_ERROR',
      `Status: ${invalidSupRes.status}, Code: ${getErrorCode(invalidSupRes)}`
    );

    // Test 08: Get Supplier by ID
    const getSupRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/suppliers/${testSupplierId}`,
      { method: 'GET', headers: managerHeaders }
    );
    recordTest(
      8,
      'Get Supplier by ID (GET /suppliers/:id)',
      getSupRes.status === 200 && getSupRes.data?.data?.SupplierId === testSupplierId,
      `Retrieved: ${getSupRes.data?.data?.SupplierName}`
    );

    // Test 09: List Suppliers with search
    const listSupRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/suppliers?search=${uniqueSuffix}`,
      { method: 'GET', headers: managerHeaders }
    );
    const foundSupplier = Array.isArray(listSupRes.data?.data) && listSupRes.data.data.some(
      (s) => s.SupplierId === testSupplierId
    );
    recordTest(
      9,
      'List Suppliers with search filter (GET /suppliers)',
      listSupRes.status === 200 && foundSupplier,
      `Suppliers count: ${listSupRes.data?.data?.length}`
    );

    // Test 10: Update Supplier
    const updateSupRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/suppliers/${testSupplierId}`,
      { method: 'PUT', headers: adminHeaders },
      {
        supplierName: `Fresh Farms Dairy Updated ${uniqueSuffix}`,
        contactPerson: 'Ramesh Patel (Senior Manager)',
        email: `ramesh_${uniqueSuffix}@freshfarms.in`,
        phone: '9876543211',
        paymentTerms: 'Net 45',
      }
    );
    recordTest(
      10,
      'Update Supplier (PUT /suppliers/:id)',
      updateSupRes.status === 200 && updateSupRes.data?.data?.PaymentTerms === 'Net 45',
      `PaymentTerms: ${updateSupRes.data?.data?.PaymentTerms}`
    );

    // =========================================================================
    // GROUP 3: INGREDIENT MANAGEMENT
    // =========================================================================
    console.log('\n--- GROUP 3: Ingredient Management CRUD ---');

    // Test 11: Create Ingredient
    const createIngRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients`,
      { method: 'POST', headers: adminHeaders },
      {
        branchId: 1,
        ingredientName: `Amul Butter Salted ${uniqueSuffix}`,
        ingredientCode: testIngCode,
        category: 'DAIRY',
        unitOfMeasure: 'KG',
        initialStock: 50.0,
        minimumStockLevel: 10.0,
        reorderLevel: 15.0,
        costPerUnit: 500.0,
        primarySupplierId: testSupplierId,
      }
    );
    testIngredientId = createIngRes.data?.data?.IngredientId;
    const initialStockCreated = parseFloat(createIngRes.data?.data?.CurrentStock);
    recordTest(
      11,
      'Create Ingredient (POST /ingredients)',
      createIngRes.status === 201 && testIngredientId > 0 && initialStockCreated === 50.0,
      `Status: ${createIngRes.status}, IngredientId: ${testIngredientId}, Stock: ${initialStockCreated}`
    );

    // Test 12: Reject duplicate ingredient code in same branch
    const dupIngRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients`,
      { method: 'POST', headers: adminHeaders },
      {
        branchId: 1,
        ingredientName: `Amul Butter Duplicate ${uniqueSuffix}`,
        ingredientCode: testIngCode,
        category: 'DAIRY',
        unitOfMeasure: 'KG',
        initialStock: 10.0,
      }
    );
    recordTest(
      12,
      'Reject duplicate Ingredient Code in same branch (HTTP 409)',
      dupIngRes.status === 409 && getErrorCode(dupIngRes) === 'INGREDIENT_CODE_EXISTS',
      `Status: ${dupIngRes.status}, Code: ${getErrorCode(dupIngRes)}`
    );

    // Test 13: Create Second Ingredient for BOM testing
    const createIng2Res = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients`,
      { method: 'POST', headers: adminHeaders },
      {
        branchId: 1,
        ingredientName: `Organic Flour ${uniqueSuffix}`,
        ingredientCode: testIngCode2,
        category: 'GROCERY',
        unitOfMeasure: 'KG',
        initialStock: 100.0,
        minimumStockLevel: 20.0,
        reorderLevel: 25.0,
        costPerUnit: 45.0,
        primarySupplierId: testSupplierId,
      }
    );
    testIngredient2Id = createIng2Res.data?.data?.IngredientId;
    recordTest(
      13,
      'Create Second Ingredient for BOM testing (POST /ingredients)',
      createIng2Res.status === 201 && testIngredient2Id > 0,
      `IngredientId: ${testIngredient2Id}, Stock: ${createIng2Res.data?.data?.CurrentStock}`
    );

    // Test 14: Get Ingredient by ID
    const getIngRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients/${testIngredientId}`,
      { method: 'GET', headers: managerHeaders }
    );
    recordTest(
      14,
      'Get Ingredient by ID (GET /ingredients/:id)',
      getIngRes.status === 200 && getIngRes.data?.data?.IngredientId === testIngredientId,
      `Retrieved: ${getIngRes.data?.data?.IngredientName}`
    );

    // Test 15: List Ingredients with branch and category filter
    const listIngRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients?branchId=1&category=DAIRY`,
      { method: 'GET', headers: managerHeaders }
    );
    const foundIng = Array.isArray(listIngRes.data?.data) && listIngRes.data.data.some(
      (i) => i.IngredientId === testIngredientId
    );
    recordTest(
      15,
      'List Ingredients with branch and category filter (GET /ingredients)',
      listIngRes.status === 200 && foundIng,
      `DAIRY ingredients count: ${listIngRes.data?.data?.length}`
    );

    // Test 16: Update Ingredient
    const updateIngRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients/${testIngredientId}`,
      { method: 'PUT', headers: adminHeaders },
      {
        ingredientName: `Amul Butter Salted (Premium) ${uniqueSuffix}`,
        costPerUnit: 520.0,
        minimumStockLevel: 12.0,
        reorderLevel: 18.0,
      }
    );
    const updatedCost = parseFloat(updateIngRes.data?.data?.CostPerUnit);
    recordTest(
      16,
      'Update Ingredient details (PUT /ingredients/:id)',
      updateIngRes.status === 200 && updatedCost === 520.0,
      `CostPerUnit updated to: ${updatedCost}`
    );

    // Test 17: Toggle Ingredient Status (Active -> Inactive -> Active)
    const toggleIngRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients/${testIngredientId}/status`,
      { method: 'PATCH', headers: adminHeaders },
      { isActive: false }
    );
    const toggleBackRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients/${testIngredientId}/status`,
      { method: 'PATCH', headers: adminHeaders },
      { isActive: true }
    );
    recordTest(
      17,
      'Toggle Ingredient Status (PATCH /ingredients/:id/status)',
      toggleIngRes.status === 200 &&
        toggleIngRes.data?.data?.IsActive === false &&
        toggleBackRes.data?.data?.IsActive === true,
      `Status toggled to false then restored to true`
    );

    // =========================================================================
    // GROUP 4: STOCK MOVEMENTS (IN, OUT/WASTAGE)
    // =========================================================================
    console.log('\n--- GROUP 4: Stock Movements (In, Out/Wastage) ---');

    // Test 18: Stock In (Purchase receipt)
    const stockInRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/stock/in`,
      { method: 'POST', headers: managerHeaders },
      {
        branchId: 1,
        ingredientId: testIngredientId,
        quantity: 20.0,
        unitCost: 520.0,
        referencePOId: 101,
        notes: `PO #101 received batch ${uniqueSuffix}`,
      }
    );
    // Initial was 50, added 20 -> 70
    const newStockAfterIn = parseFloat(stockInRes.data?.data?.NewBalance || stockInRes.data?.data?.NewStock);
    recordTest(
      18,
      'Stock In / Purchase receipt (POST /stock/in)',
      stockInRes.status === 200 && newStockAfterIn === 70.0,
      `Stock increased from 50.0 to ${newStockAfterIn}`
    );

    // Test 19: Reject Negative or Zero Quantity on Stock In
    const badStockInRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/stock/in`,
      { method: 'POST', headers: managerHeaders },
      {
        branchId: 1,
        ingredientId: testIngredientId,
        quantity: -5.0,
      }
    );
    recordTest(
      19,
      'Reject negative quantity on Stock In (HTTP 400)',
      badStockInRes.status === 400 && getErrorCode(badStockInRes) === 'VALIDATION_ERROR',
      `Status: ${badStockInRes.status}, Code: ${getErrorCode(badStockInRes)}`
    );

    // Test 20: Stock Out / Wastage Spoilage
    const stockOutRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/stock/out`,
      { method: 'POST', headers: managerHeaders },
      {
        branchId: 1,
        ingredientId: testIngredientId,
        quantity: 5.0,
        reason: 'WASTAGE',
        notes: `Quality check failed batch ${uniqueSuffix}`,
      }
    );
    // Stock was 70, wasted 5 -> 65
    const newStockAfterOut = parseFloat(stockOutRes.data?.data?.NewBalance || stockOutRes.data?.data?.NewStock);
    recordTest(
      20,
      'Stock Out / Wastage Spoilage (POST /stock/out)',
      stockOutRes.status === 200 && newStockAfterOut === 65.0,
      `Stock decreased from 70.0 to ${newStockAfterOut}`
    );

    // Test 21: Reject Stock Out exceeding available stock
    const excessOutRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/stock/out`,
      { method: 'POST', headers: managerHeaders },
      {
        branchId: 1,
        ingredientId: testIngredientId,
        quantity: 999.0,
        reason: 'DAMAGED',
      }
    );
    recordTest(
      21,
      'Reject Stock Out exceeding available stock (HTTP 400)',
      excessOutRes.status === 400 && getErrorCode(excessOutRes) === 'INSUFFICIENT_STOCK',
      `Status: ${excessOutRes.status}, Code: ${getErrorCode(excessOutRes)}`
    );

    // =========================================================================
    // GROUP 5: STOCK ADJUSTMENT (PHYSICAL RECONCILIATION)
    // =========================================================================
    console.log('\n--- GROUP 5: Stock Adjustment (Physical Reconciliation) ---');

    // Test 22: Physical Stock Adjustment
    const adjustRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/stock/adjust`,
      { method: 'POST', headers: managerHeaders },
      {
        branchId: 1,
        ingredientId: testIngredientId,
        actualCount: 60.0,
        reason: 'Physical Audit Reconciliation',
        notes: 'Monthly physical stock audit variance reconciled',
      }
    );
    // Stock was 65, adjusted to 60 (variance -5)
    const newStockAfterAdj = parseFloat(adjustRes.data?.data?.NewBalance || adjustRes.data?.data?.NewStock);
    const variance = parseFloat(adjustRes.data?.data?.Variance !== undefined ? adjustRes.data?.data?.Variance : adjustRes.data?.data?.AdjustmentVariance);
    recordTest(
      22,
      'Physical Stock Adjustment (POST /stock/adjust)',
      adjustRes.status === 200 && newStockAfterAdj === 60.0 && variance === -5.0,
      `NewStock: ${newStockAfterAdj}, Variance: ${variance}`
    );

    // Test 23: Reject Negative Physical Stock Level on Adjustment
    const badAdjustRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/stock/adjust`,
      { method: 'POST', headers: managerHeaders },
      {
        branchId: 1,
        ingredientId: testIngredientId,
        actualCount: -10.0,
        reason: 'COUNT_ERROR',
      }
    );
    recordTest(
      23,
      'Reject negative physical stock level on adjustment (HTTP 400)',
      badAdjustRes.status === 400 && getErrorCode(badAdjustRes) === 'VALIDATION_ERROR',
      `Status: ${badAdjustRes.status}, Code: ${getErrorCode(badAdjustRes)}`
    );

    // =========================================================================
    // GROUP 6: INTER-BRANCH STOCK TRANSFER
    // =========================================================================
    console.log('\n--- GROUP 6: Inter-Branch Stock Transfer ---');

    // Test 24: Transfer Stock from Branch 1 to Branch 2
    const transferRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/stock/transfer`,
      { method: 'POST', headers: adminHeaders },
      {
        fromBranchId: 1,
        toBranchId: 2,
        ingredientCode: testIngCode,
        quantity: 10.0,
        notes: 'Emergency butter transfer to Indiranagar branch',
      }
    );
    // Source stock was 60, transferred 10 -> 50
    const sourceStockAfter = parseFloat(transferRes.data?.data?.SourceNewBalance || transferRes.data?.data?.SourceNewStock);
    recordTest(
      24,
      'Inter-Branch Stock Transfer (POST /stock/transfer)',
      transferRes.status === 200 && sourceStockAfter === 50.0,
      `Source stock: ${sourceStockAfter}, Dest stock: ${transferRes.data?.data?.DestNewBalance || transferRes.data?.data?.DestinationNewStock}`
    );

    // Test 25: Reject Transfer to same branch
    const sameBranchRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/stock/transfer`,
      { method: 'POST', headers: adminHeaders },
      {
        fromBranchId: 1,
        toBranchId: 1,
        ingredientCode: testIngCode,
        quantity: 5.0,
      }
    );
    const sameBranchCode = getErrorCode(sameBranchRes);
    recordTest(
      25,
      'Reject Inter-Branch transfer when source and dest branches are identical (HTTP 400)',
      sameBranchRes.status === 400 && (sameBranchCode === 'VALIDATION_ERROR' || sameBranchCode === 'IDENTICAL_BRANCHES'),
      `Status: ${sameBranchRes.status}, Code: ${sameBranchCode}`
    );

    // Test 26: Reject Transfer exceeding available source stock
    const excessTransferRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/stock/transfer`,
      { method: 'POST', headers: adminHeaders },
      {
        fromBranchId: 1,
        toBranchId: 2,
        ingredientCode: testIngCode,
        quantity: 999.0,
      }
    );
    recordTest(
      26,
      'Reject Inter-Branch transfer exceeding available stock (HTTP 400)',
      excessTransferRes.status === 400 && getErrorCode(excessTransferRes) === 'INSUFFICIENT_STOCK_FOR_TRANSFER',
      `Status: ${excessTransferRes.status}, Code: ${getErrorCode(excessTransferRes)}`
    );

    // =========================================================================
    // GROUP 7: RECIPE BILL OF MATERIALS (BOM)
    // =========================================================================
    console.log('\n--- GROUP 7: Recipe BOM Management ---');

    // Menu Item 1 is seeded in MenuItem table (e.g. Butter Chicken or Paneer Butter Masala)
    const targetMenuItemId = 1;

    // Test 27: Create / Update Recipe BOM
    const createRecipeRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/recipes`,
      { method: 'POST', headers: adminHeaders },
      {
        menuItemId: targetMenuItemId,
        yieldPortions: 1,
        preparationNotes: 'Melt butter on medium flame, incorporate flour paste',
        ingredients: [
          { ingredientId: testIngredientId, requiredQuantity: 0.25, unitOfMeasure: 'KG' },
          { ingredientId: testIngredient2Id, requiredQuantity: 0.5, unitOfMeasure: 'KG' },
        ],
      }
    );
    createdRecipeId = createRecipeRes.data?.data?.recipeId;
    const recipeMenuItemId = Number(createRecipeRes.data?.data?.menuItemId);
    recordTest(
      27,
      'Create / Update Recipe BOM for Menu Item (POST /recipes)',
      (createRecipeRes.status === 200 || createRecipeRes.status === 201) &&
        recipeMenuItemId === targetMenuItemId &&
        Number(createdRecipeId) > 0,
      `Status: ${createRecipeRes.status}, RecipeId: ${createdRecipeId}, Recipe items: ${createRecipeRes.data?.data?.ingredients?.length}`
    );

    // Test 28: Get Recipe BOM by MenuItemId
    const getRecipeRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/recipes/${targetMenuItemId}`,
      { method: 'GET', headers: chefHeaders }
    );
    const hasItems = getRecipeRes.data?.data?.ingredients?.length === 2;
    recordTest(
      28,
      'Get Recipe BOM by MenuItemId (GET /recipes/:menuItemId)',
      getRecipeRes.status === 200 && hasItems,
      `Retrieved recipe with ${getRecipeRes.data?.data?.ingredients?.length} ingredients`
    );

    // =========================================================================
    // GROUP 8: BOM AVAILABILITY CHECK, DEPLETION & RESTITUTION (ORDER SAGA)
    // =========================================================================
    console.log('\n--- GROUP 8: BOM Check, Depletion & Restitution (Order Saga) ---');

    // Test 29: Check Stock Availability for Order Items
    const checkStockRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/bom/check`,
      { method: 'POST', headers: managerHeaders },
      {
        branchId: 1,
        items: [
          { menuItemId: targetMenuItemId, quantity: 2 },
        ],
      }
    );
    recordTest(
      29,
      'BOM Stock Availability Check (POST /bom/check)',
      checkStockRes.status === 200 && checkStockRes.data?.data?.hasSufficientStock === true,
      `hasSufficientStock: ${checkStockRes.data?.data?.hasSufficientStock}`
    );

    // Seed a valid mock order to satisfy Foreign Key FK_InventoryTransactions_Orders
    const orderSeedRes = await query(`
      INSERT INTO dbo.Orders (
        BranchId, OrderNumber, OrderType, OrderStatus, PaymentStatus,
        SubTotal, TaxTotal, GrandTotal, CreatedAt, UpdatedAt
      )
      OUTPUT INSERTED.OrderId, INSERTED.OrderNumber
      VALUES (
        1, 'ORD-TST-${uniqueSuffix}', 'DINE_IN', 'CONFIRMED', 'PENDING',
        500.00, 25.00, 525.00, SYSUTCDATETIME(), SYSUTCDATETIME()
      );
    `);
    seededOrderId = Number(orderSeedRes.recordset[0].OrderId);
    seededOrderNumber = orderSeedRes.recordset[0].OrderNumber;

    const stockBeforeDeplete = 50.0; // Current Butter stock is 50.0

    // Test 30: Deplete BOM Stock for Confirmed Order
    const depleteRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/bom/deplete`,
      { method: 'POST', headers: adminHeaders },
      {
        branchId: 1,
        orderId: seededOrderId,
        orderNumber: seededOrderNumber,
        items: [
          { menuItemId: targetMenuItemId, quantity: 4 }, // 4 * 0.25kg = 1.0kg Butter
        ],
      }
    );
    recordTest(
      30,
      'Deplete BOM Stock for Order (POST /bom/deplete)',
      depleteRes.status === 200 && depleteRes.data?.data?.depletedCount > 0,
      `Depleted count: ${depleteRes.data?.data?.depletedCount}`
    );

    // Verify stock decreased by 1.0kg (50 - 1 = 49)
    const checkIngAfterDeplete = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients/${testIngredientId}`,
      { method: 'GET', headers: managerHeaders }
    );
    const stockAfterDeplete = parseFloat(checkIngAfterDeplete.data?.data?.CurrentStock);
    recordTest(
      31,
      'Verify physical stock deducted accurately by BOM consumption',
      stockAfterDeplete === 49.0,
      `Stock before: ${stockBeforeDeplete}, Stock after: ${stockAfterDeplete}`
    );

    // Test 32: Idempotent BOM Depletion (Submitting identical order does NOT double deduct)
    const dupDepleteRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/bom/deplete`,
      { method: 'POST', headers: adminHeaders },
      {
        branchId: 1,
        orderId: seededOrderId,
        orderNumber: seededOrderNumber,
        items: [
          { menuItemId: targetMenuItemId, quantity: 4 },
        ],
      }
    );
    const checkIngAfterDup = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients/${testIngredientId}`,
      { method: 'GET', headers: managerHeaders }
    );
    const stockAfterDup = parseFloat(checkIngAfterDup.data?.data?.CurrentStock);
    recordTest(
      32,
      'Enforce Idempotent BOM Depletion (no double-decrement)',
      dupDepleteRes.status === 200 &&
        dupDepleteRes.data?.data?.isIdempotentDuplicate === true &&
        stockAfterDup === 49.0,
      `Idempotent duplicate detected: ${dupDepleteRes.data?.data?.isIdempotentDuplicate}, stock remained: ${stockAfterDup}`
    );

    // Test 33: Restitute BOM Stock on Order Cancellation
    const restituteRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/bom/restitute`,
      { method: 'POST', headers: adminHeaders },
      {
        branchId: 1,
        orderId: seededOrderId,
        orderNumber: seededOrderNumber,
      }
    );
    const checkIngAfterRestitute = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients/${testIngredientId}`,
      { method: 'GET', headers: managerHeaders }
    );
    const stockAfterRestitute = parseFloat(checkIngAfterRestitute.data?.data?.CurrentStock);
    recordTest(
      33,
      'Restitute BOM Stock on Order Cancellation (POST /bom/restitute)',
      restituteRes.status === 200 && stockAfterRestitute === 50.0,
      `Stock restored from 49.0 back to: ${stockAfterRestitute}`
    );

    // =========================================================================
    // GROUP 9: LOW STOCK ALERTS & AUDIT TRANSACTIONS
    // =========================================================================
    console.log('\n--- GROUP 9: Low Stock Alerts & Audit Transactions ---');

    // Create a critical low-stock ingredient (initialStock: 3.0, ReorderLevel: 10.0)
    const lowStockIngRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients`,
      { method: 'POST', headers: adminHeaders },
      {
        branchId: 1,
        ingredientName: `Low Stock Saffron ${uniqueSuffix}`,
        ingredientCode: `SAF-${uniqueSuffix}`,
        category: 'SPICES',
        unitOfMeasure: 'GM',
        initialStock: 3.0,
        minimumStockLevel: 5.0,
        reorderLevel: 10.0,
        costPerUnit: 250.0,
      }
    );
    const lowStockIngId = lowStockIngRes.data?.data?.IngredientId;

    // Test 34: Retrieve Low Stock Alerts
    const alertsRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/alerts/low-stock?branchId=1`,
      { method: 'GET', headers: chefHeaders }
    );
    const foundAlert = Array.isArray(alertsRes.data?.data) && alertsRes.data.data.some(
      (a) => Number(a.IngredientId) === Number(lowStockIngId)
    );
    recordTest(
      34,
      'Retrieve Low Stock Alerts (GET /alerts/low-stock)',
      alertsRes.status === 200 && foundAlert,
      `Found ${alertsRes.data?.data?.length} low-stock alert items`
    );

    // Test 35: Retrieve Transaction Audit Logs with filters
    const txRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/transactions?branchId=1&ingredientId=${testIngredientId}`,
      { method: 'GET', headers: managerHeaders }
    );
    const txCount = Array.isArray(txRes.data?.data) ? txRes.data.data.length : 0;
    recordTest(
      35,
      'Retrieve Inventory Transaction Audit Logs (GET /transactions)',
      txRes.status === 200 && txCount >= 3,
      `Retrieved ${txCount} transaction audit records for test ingredient`
    );

    // =========================================================================
    // GROUP 10: REPORTS (VALUATION & CONSUMPTION)
    // =========================================================================
    console.log('\n--- GROUP 10: Reports (Valuation & Consumption) ---');

    // Test 36: Inventory Valuation Report
    const valRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/reports/valuation?branchId=1`,
      { method: 'GET', headers: managerHeaders }
    );
    const totalValuation = parseFloat(valRes.data?.data?.totalValuation);
    recordTest(
      36,
      'Inventory Valuation Report (GET /reports/valuation)',
      valRes.status === 200 && totalValuation > 0,
      `Total Valuation: Rs. ${totalValuation}, Categories: ${valRes.data?.data?.categories?.length}`
    );

    // Test 37: Inventory Consumption Report
    const consRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/reports/consumption?branchId=1&startDate=2026-01-01&endDate=2026-12-31`,
      { method: 'GET', headers: managerHeaders }
    );
    recordTest(
      37,
      'Inventory Consumption Report (GET /reports/consumption)',
      consRes.status === 200 && Array.isArray(consRes.data?.data?.items),
      `Consumption records: ${consRes.data?.data?.items?.length}`
    );

    // =========================================================================
    // GROUP 11: SECURITY, RBAC & CLEANUP
    // =========================================================================
    console.log('\n--- GROUP 11: Security, RBAC & Soft Deletion ---');

    // Test 38: Reject Unauthenticated Requests
    const unauthRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients`,
      { method: 'GET' }
    );
    recordTest(
      38,
      'Reject Unauthenticated Access without Token (HTTP 401)',
      unauthRes.status === 401,
      `Status: ${unauthRes.status}`
    );

    // Test 39: Reject Customer Access to Inventory Management
    const customerForbiddenRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/stock/in`,
      { method: 'POST', headers: customerHeaders },
      {
        branchId: 1,
        ingredientId: testIngredientId,
        quantity: 10.0,
      }
    );
    recordTest(
      39,
      'Reject Customer role on Stock Operations (HTTP 403 Forbidden)',
      customerForbiddenRes.status === 403,
      `Status: ${customerForbiddenRes.status}`
    );

    // Test 40: Allow Kitchen Chef to view Recipes and Alerts
    const chefAccessRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/recipes/${targetMenuItemId}`,
      { method: 'GET', headers: chefHeaders }
    );
    recordTest(
      40,
      'Allow KITCHEN_CHEF role to read Recipe BOMs (HTTP 200)',
      chefAccessRes.status === 200,
      `Status: ${chefAccessRes.status}, Recipe menuItemId: ${chefAccessRes.data?.data?.menuItemId}`
    );

    // Test 41: Delete Recipe BOM
    const delRecipeRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/recipes/${createdRecipeId}`,
      { method: 'DELETE', headers: adminHeaders }
    );
    recordTest(
      41,
      'Delete Recipe BOM (DELETE /recipes/:recipeId)',
      delRecipeRes.status === 200,
      `Recipe #${createdRecipeId} deleted successfully`
    );

    // Test 42: Soft Delete Ingredients
    const delIngRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients/${testIngredientId}`,
      { method: 'DELETE', headers: adminHeaders }
    );
    await request(
      `${GATEWAY_URL}/api/v1/inventory/ingredients/${testIngredient2Id}`,
      { method: 'DELETE', headers: adminHeaders }
    );
    if (lowStockIngId) {
      await request(
        `${GATEWAY_URL}/api/v1/inventory/ingredients/${lowStockIngId}`,
        { method: 'DELETE', headers: adminHeaders }
      );
    }
    recordTest(
      42,
      'Soft Delete Ingredient (DELETE /ingredients/:id)',
      delIngRes.status === 200,
      `Ingredient #${testIngredientId} soft-deleted successfully`
    );

    // Test 43: Soft Delete Supplier
    const delSupRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/suppliers/${testSupplierId}`,
      { method: 'DELETE', headers: adminHeaders }
    );
    recordTest(
      43,
      'Soft Delete Supplier (DELETE /suppliers/:id)',
      delSupRes.status === 200,
      `Supplier #${testSupplierId} soft-deleted successfully`
    );

    // Test 44: Verify Correlation ID forwarding through Gateway
    const testCorrId = `corr-${uuidv4()}`;
    const corrRes = await request(
      `${GATEWAY_URL}/api/v1/inventory/health/live`,
      {
        method: 'GET',
        headers: {
          'x-correlation-id': testCorrId,
        },
      }
    );
    const returnedCorrId = corrRes.headers?.['x-correlation-id'];
    recordTest(
      44,
      'API Gateway Correlation ID forwarding and reflection',
      returnedCorrId === testCorrId,
      `Sent: ${testCorrId}, Returned: ${returnedCorrId}`
    );

  } catch (err) {
    console.error('Test execution fatal error:', err);
  } finally {
    // Cleanup seeded mock order if any
    if (seededOrderId) {
      try {
        await query(`DELETE FROM dbo.Orders WHERE OrderId = ${seededOrderId}`);
      } catch (cleanupErr) {
        // ignore
      }
    }

    // Teardown listening servers
    if (inventoryServer) {
      inventoryServer.close();
    }
    if (gatewayServer) {
      gatewayServer.close();
    }
  }

  // Final Test Summary
  console.log('\n================================================================');
  console.log('  PHASE 8 TEST EXECUTION RESULTS');
  console.log('================================================================');

  const passedCount = testResults.filter((r) => r.passed).length;
  const failedCount = testResults.filter((r) => !r.passed).length;
  const totalCount = testResults.length;

  console.log(`Total Tests Run : ${totalCount}`);
  console.log(`Passed          : ${passedCount}  ✅`);
  console.log(`Failed          : ${failedCount}  ${failedCount > 0 ? '❌' : ''}`);
  console.log(`Success Rate    : ${Math.round((passedCount / totalCount) * 100)}%`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    console.log('Failed Tests:');
    testResults
      .filter((r) => !r.passed)
      .forEach((r) => console.log(`  - Test ${r.num}: ${r.name} (${r.detail})`));
    process.exit(1);
  } else {
    console.log('ALL PHASE 8 TESTS PASSED SUCCESSFULLY! 🚀');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});
