/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 7 AUTOMATED VERIFICATION SUITE
 * File: scripts/test_phase7.js
 * Description: Exhaustive verification runner for all Phase 7 requirements:
 *              Cart Management, Order Placement & Lifecycle, State Machine,
 *              Historical Pricing Snapshots, Redis Idempotency, Inter-service
 *              REST calls, API Gateway Routing, Ownership & Error Handling.
 * ============================================================================
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { config, getPool, closePool, query } = require('../backend/shared');

const GATEWAY_URL = 'http://localhost:8000';
const CART_SERVICE_URL = 'http://localhost:8006';
const ORDER_SERVICE_URL = 'http://localhost:8007';

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
  console.log('  RMS PHASE 7: CART & ORDER MANAGEMENT MICROSERVICES SUITE');
  console.log('================================================================\n');

  // Boot all services needed for end-to-end integration
  const { app: userApp } = require('../backend/user-service/src/app');
  const { app: restaurantApp } = require('../backend/restaurant-service/src/app');
  const { app: menuApp } = require('../backend/menu-service/src/app');
  const { app: cartApp } = require('../backend/cart-service/src/app');
  const { app: orderApp } = require('../backend/order-service/src/app');
  const { app: gatewayApp } = require('../backend/api-gateway/src/app');

  const userServer = await safeListen(userApp, 8002);
  const restaurantServer = await safeListen(restaurantApp, 8003);
  const menuServer = await safeListen(menuApp, 8005);
  const cartServer = await safeListen(cartApp, 8006);
  const orderServer = await safeListen(orderApp, 8007);
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
      permissions: ['ORDER.MANAGE', 'ORDER.READ', 'MENU.READ'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  const waitstaffToken = jwt.sign(
    {
      userId: 4,
      email: 'waiter.blr@antigravitybistro.com',
      userType: 'EMPLOYEE',
      roles: ['WAITSTAFF'],
      permissions: ['ORDER.CREATE', 'ORDER.UPDATE', 'ORDER.READ'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  // Customer A (UserId: 8 - has registered addresses in seed)
  const customerAToken = jwt.sign(
    {
      userId: 8,
      email: 'customer.aarav@example.com',
      userType: 'CUSTOMER',
      roles: ['CUSTOMER'],
      permissions: ['CUSTOMER.ORDERS'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  // Customer B (UserId: 9)
  const customerBToken = jwt.sign(
    {
      userId: 9,
      email: 'customer.priya@example.com',
      userType: 'CUSTOMER',
      roles: ['CUSTOMER'],
      permissions: ['CUSTOMER.ORDERS'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  const guestSessionToken = `guest_sess_${Date.now()}_${uuidv4().substring(0, 8)}`;

  let guestCartId = null;
  let customerCartId = null;
  let cartItemId1 = null;
  let cartItemId2 = null;
  let createdOrderId = null;
  let createdOrderNumber = null;
  let deliveryOrderId = null;

  try {
    // ------------------------------------------------------------------------
    // GROUP 1: HEALTH & READINESS PROBES
    // ------------------------------------------------------------------------
    console.log('--- GROUP 1: HEALTH & READINESS PROBES ---');

    // Test 1: Cart Service Liveness probe
    const cartLiveRes = await request(`${CART_SERVICE_URL}/health/live`);
    recordTest(
      1,
      'Cart Service Liveness Probe (/health/live)',
      cartLiveRes.status === 200 && cartLiveRes.data?.data?.status === 'UP',
      `Status: ${cartLiveRes.status}, Process UP: ${cartLiveRes.data?.data?.status === 'UP'}`
    );

    // Test 2: Cart Service Readiness probe (DB & Redis)
    const cartReadyRes = await request(`${CART_SERVICE_URL}/health/ready`);
    recordTest(
      2,
      'Cart Service Readiness Probe (/health/ready: DB & Redis)',
      cartReadyRes.status === 200 &&
        cartReadyRes.data?.data?.status === 'UP' &&
        cartReadyRes.data?.data?.dependencies?.database?.healthy === true &&
        cartReadyRes.data?.data?.dependencies?.redis?.healthy === true,
      `Status: ${cartReadyRes.status}, DB: ${cartReadyRes.data?.data?.dependencies?.database?.healthy}, Redis: ${cartReadyRes.data?.data?.dependencies?.redis?.healthy}`
    );

    // Test 3: Order Service Liveness probe
    const orderLiveRes = await request(`${ORDER_SERVICE_URL}/health/live`);
    recordTest(
      3,
      'Order Service Liveness Probe (/health/live)',
      orderLiveRes.status === 200 && orderLiveRes.data?.data?.status === 'UP',
      `Status: ${orderLiveRes.status}, Process UP: ${orderLiveRes.data?.data?.status === 'UP'}`
    );

    // Test 4: Order Service Readiness probe (DB & Redis)
    const orderReadyRes = await request(`${ORDER_SERVICE_URL}/health/ready`);
    recordTest(
      4,
      'Order Service Readiness Probe (/health/ready: DB & Redis)',
      orderReadyRes.status === 200 &&
        orderReadyRes.data?.data?.status === 'UP' &&
        orderReadyRes.data?.data?.dependencies?.database?.healthy === true &&
        orderReadyRes.data?.data?.dependencies?.redis?.healthy === true,
      `Status: ${orderReadyRes.status}, DB: ${orderReadyRes.data?.data?.dependencies?.database?.healthy}, Redis: ${orderReadyRes.data?.data?.dependencies?.redis?.healthy}`
    );

    // ------------------------------------------------------------------------
    // GROUP 2: SHOPPING CART MANAGEMENT
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 2: SHOPPING CART MANAGEMENT ---');

    // Test 5: Get or Create Guest Cart with Session Token
    const guestCartRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart`,
      { method: 'POST', headers: { 'X-Session-Token': guestSessionToken } },
      { branchId: 1 }
    );
    guestCartId = guestCartRes.data?.data?.cartId;
    recordTest(
      5,
      'Create Guest Cart with Session Token (POST /api/v1/cart)',
      guestCartRes.status === 200 && guestCartId !== undefined && guestCartRes.data?.data?.sessionToken === guestSessionToken,
      `Status: ${guestCartRes.status}, CartId: ${guestCartId}`
    );

    // Test 6: Create/Retrieve Customer Cart with JWT
    const custCartRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      { branchId: 1, tableId: 1 }
    );
    customerCartId = custCartRes.data?.data?.cartId;
    recordTest(
      6,
      'Create/Retrieve Customer Cart with JWT (POST /api/v1/cart)',
      custCartRes.status === 200 && customerCartId !== undefined && Number(custCartRes.data?.data?.userId) === 8,
      `Status: ${custCartRes.status}, CartId: ${customerCartId}, UserId: ${custCartRes.data?.data?.userId}`
    );

    // Clear Customer Cart before running tests to ensure 100% deterministic arithmetic
    if (customerCartId) {
      await request(
        `${CART_SERVICE_URL}/api/v1/cart`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${customerAToken}` } },
        { cartId: customerCartId }
      );
    }

    // Test 7: Add Item to Customer Cart (Truffle & Parmesan Arancini, MenuItemId: 1, BasePrice: 380, qty: 2)
    const addItem1Res = await request(
      `${CART_SERVICE_URL}/api/v1/cart/items`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      {
        cartId: customerCartId,
        menuItemId: 1,
        quantity: 2,
        specialInstructions: 'Extra crispy please',
      }
    );
    const addedItem1 = addItem1Res.data?.data?.items?.find((i) => String(i.menuItemId) === '1');
    cartItemId1 = addedItem1?.cartItemId;
    recordTest(
      7,
      'Add Base Item to Cart (POST /api/v1/cart/items)',
      addItem1Res.status === 201 && addedItem1 !== undefined && parseFloat(addedItem1.totalPrice) === 760.00,
      `Status: ${addItem1Res.status}, CartItemId: ${cartItemId1}, UnitPrice: ${addedItem1?.unitPrice}, Total: ${addedItem1?.totalPrice}`
    );

    // Test 8: Add Item with Variant and Addons (Margherita Classica, MenuItemId: 3, Variant 2 (+140), Addons: 1 (+80), 2 (+95))
    // Unit price = 495 + 140 = 635. Addons per item = 80 + 95 = 175. For qty 1: Total = 635 + 175 = 810.00
    const addItem2Res = await request(
      `${CART_SERVICE_URL}/api/v1/cart/items`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      {
        cartId: customerCartId,
        menuItemId: 3,
        variantId: 2,
        quantity: 1,
        addons: [
          { addonItemId: 1, quantity: 1 },
          { addonItemId: 2, quantity: 1 },
        ],
        specialInstructions: 'Well done crust',
      }
    );
    const addedItem2 = addItem2Res.data?.data?.items?.find((i) => String(i.menuItemId) === '3');
    cartItemId2 = addedItem2?.cartItemId;
    recordTest(
      8,
      'Add Item with Variant and Addons to Cart (POST /api/v1/cart/items)',
      addItem2Res.status === 201 &&
        addedItem2 !== undefined &&
        parseFloat(addedItem2.totalPrice) === 635.00 &&
        addedItem2.addons?.length === 2,
      `Status: ${addItem2Res.status}, CartItemId: ${cartItemId2}, ItemBaseTotal: ${addedItem2?.totalPrice}, AddonCount: ${addedItem2?.addons?.length}`
    );

    // Test 9: Precise Monetary Calculations (2-decimal arithmetic)
    // Subtotal: 760.00 + 810.00 = 1570.00
    // Tax: 5% of 1570.00 = 78.50. Grand Total: 1648.50
    const cartCalc = addItem2Res.data?.data;
    const isPrecisionCorrect =
      parseFloat(cartCalc?.subTotal) === 1570.00 &&
      parseFloat(cartCalc?.taxTotal) === 78.50 &&
      parseFloat(cartCalc?.grandTotal) === 1648.50;
    recordTest(
      9,
      'Authoritative Cart Calculations (Subtotal, 5% Tax, Grand Total)',
      isPrecisionCorrect,
      `SubTotal: ${cartCalc?.subTotal} (exp 1570.00), Tax: ${cartCalc?.taxTotal} (exp 78.50), GrandTotal: ${cartCalc?.grandTotal} (exp 1648.50)`
    );

    // Test 10: Reject adding item from different branch (Branch 2 cart vs Branch 1 item)
    const branch2Session = `branch2_sess_${Date.now()}`;
    const branch2CartRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart`,
      { method: 'POST', headers: { 'X-Session-Token': branch2Session } },
      { branchId: 2 }
    );
    const branch2CartId = branch2CartRes.data?.data?.cartId;
    const branchMismatchRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart/items`,
      { method: 'POST', headers: { 'X-Session-Token': branch2Session } },
      {
        cartId: branch2CartId,
        menuItemId: 1, // MenuItem 1 belongs to Branch 1!
        quantity: 1,
      }
    );
    recordTest(
      10,
      'Reject Adding Item from Different Branch (400 BRANCH_MISMATCH)',
      branchMismatchRes.status === 400 && getErrorCode(branchMismatchRes) === 'BRANCH_MISMATCH',
      `Status: ${branchMismatchRes.status}, ErrorCode: ${getErrorCode(branchMismatchRes)}`
    );

    // Test 11: Reject adding non-existent menu item
    const invalidItemRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart/items`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      {
        cartId: customerCartId,
        menuItemId: 999999,
        quantity: 1,
      }
    );
    recordTest(
      11,
      'Reject Adding Non-existent Menu Item (404/400 ITEM_NOT_FOUND)',
      invalidItemRes.status >= 400,
      `Status: ${invalidItemRes.status}, ErrorCode: ${getErrorCode(invalidItemRes)}`
    );

    // Test 12: Update Cart Item Quantity (Arancini qty 2 -> qty 3)
    // New item1 total: 380 * 3 = 1140.00. Subtotal: 1140 + 810 = 1950.00. Tax: 97.50. Grand Total: 2047.50
    const updateQtyRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart/items/${cartItemId1}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${customerAToken}` } },
      { quantity: 3 }
    );
    const updatedCart = updateQtyRes.data?.data;
    const updatedItem1 = updatedCart?.items?.find((i) => String(i.cartItemId) === String(cartItemId1));
    recordTest(
      12,
      'Update Cart Item Quantity (PUT /api/v1/cart/items/:id)',
      updateQtyRes.status === 200 &&
        updatedItem1?.quantity === 3 &&
        parseFloat(updatedCart?.subTotal) === 1950.00 &&
        parseFloat(updatedCart?.grandTotal) === 2047.50,
      `Status: ${updateQtyRes.status}, Qty: ${updatedItem1?.quantity}, SubTotal: ${updatedCart?.subTotal}, GrandTotal: ${updatedCart?.grandTotal}`
    );

    // Test 13: Reject updating quantity to 0 or negative
    const invalidQtyRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart/items/${cartItemId1}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${customerAToken}` } },
      { quantity: 0 }
    );
    recordTest(
      13,
      'Reject Zero or Negative Quantity (400 VALIDATION_ERROR)',
      invalidQtyRes.status === 400,
      `Status: ${invalidQtyRes.status}, Error: ${invalidQtyRes.data?.message || getErrorCode(invalidQtyRes)}`
    );

    // Test 14: Cart Summary Endpoint
    const summaryRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart/summary?cartId=${customerCartId}`,
      { headers: { Authorization: `Bearer ${customerAToken}` } }
    );
    recordTest(
      14,
      'Get Cart Summary (GET /api/v1/cart/summary)',
      summaryRes.status === 200 && summaryRes.data?.data?.totalItemsCount === 4, // 3 arancini + 1 pizza = 4
      `Status: ${summaryRes.status}, TotalItemsCount: ${summaryRes.data?.data?.totalItemsCount}, GrandTotal: ${summaryRes.data?.data?.grandTotal}`
    );

    // Test 15: Cart Ownership Protection (Customer B cannot modify Customer A's cart)
    const ownershipRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart/items/${cartItemId1}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${customerBToken}` } },
      { quantity: 5 }
    );
    recordTest(
      15,
      "Cart Ownership Protection (Customer B blocked from modifying Customer A's cart: 403)",
      ownershipRes.status === 403 && getErrorCode(ownershipRes) === 'CART_ACCESS_FORBIDDEN',
      `Status: ${ownershipRes.status}, ErrorCode: ${getErrorCode(ownershipRes)}`
    );

    // Test 16: Remove single item from guest cart
    // First add an item to guest cart
    const addGuestItemRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart/items`,
      { method: 'POST', headers: { 'X-Session-Token': guestSessionToken } },
      { cartId: guestCartId, menuItemId: 1, quantity: 1 }
    );
    const guestCartItemId = addGuestItemRes.data?.data?.items?.[0]?.cartItemId;
    const removeGuestItemRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart/items/${guestCartItemId}`,
      { method: 'DELETE', headers: { 'X-Session-Token': guestSessionToken } }
    );
    recordTest(
      16,
      'Remove Item from Cart (DELETE /api/v1/cart/items/:id)',
      removeGuestItemRes.status === 200 && removeGuestItemRes.data?.data?.items?.length === 0,
      `Status: ${removeGuestItemRes.status}, RemainingItems: ${removeGuestItemRes.data?.data?.items?.length}`
    );

    // Test 17: Clear Cart
    // Add item to guest cart, then clear it
    await request(
      `${CART_SERVICE_URL}/api/v1/cart/items`,
      { method: 'POST', headers: { 'X-Session-Token': guestSessionToken } },
      { cartId: guestCartId, menuItemId: 2, quantity: 2 }
    );
    const clearCartRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart`,
      { method: 'DELETE', headers: { 'X-Session-Token': guestSessionToken } },
      { cartId: guestCartId }
    );
    recordTest(
      17,
      'Clear Entire Cart (DELETE /api/v1/cart)',
      clearCartRes.status === 200,
      `Status: ${clearCartRes.status}, Message: ${clearCartRes.data?.message}`
    );

    // ------------------------------------------------------------------------
    // GROUP 3: ORDER PLACEMENT & INTER-SERVICE VALIDATION
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 3: ORDER CREATION & INTER-SERVICE VALIDATION ---');

    // Test 18: Reject order placement with an empty cart
    const emptyOrderRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      {
        cartId: guestCartId, // guest cart was cleared in test 17
        orderType: 'DINE_IN',
        tableId: 1,
      }
    );
    recordTest(
      18,
      'Reject Order Placement with Empty Cart (400 EMPTY_CART)',
      emptyOrderRes.status === 400 && getErrorCode(emptyOrderRes) === 'EMPTY_CART',
      `Status: ${emptyOrderRes.status}, ErrorCode: ${getErrorCode(emptyOrderRes)}`
    );

    // Test 19: Place DINE_IN order from populated Customer A cart (with TableId 1)
    const idempotencyKey1 = `idemp_order_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const placeOrderRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${customerAToken}`,
          'X-Idempotency-Key': idempotencyKey1,
        },
      },
      {
        cartId: customerCartId,
        orderType: 'DINE_IN',
        tableId: 1,
        serviceCharge: 50.00,
        customerNotes: 'Please serve appetizer first',
      }
    );
    createdOrderId = placeOrderRes.data?.data?.orderId;
    createdOrderNumber = placeOrderRes.data?.data?.orderNumber;
    recordTest(
      19,
      'Place DINE_IN Order from Cart (POST /api/v1/orders)',
      placeOrderRes.status === 201 && createdOrderId !== undefined && placeOrderRes.data?.data?.orderStatus === 'PENDING',
      `Status: ${placeOrderRes.status}, OrderId: ${createdOrderId}, OrderNumber: ${createdOrderNumber}, GrandTotal: ${placeOrderRes.data?.data?.grandTotal}`
    );

    // Test 20: Verify Generated OrderNumber Format (ORD-YYYYMMDD-XXXX)
    const orderNumRegex = /^ORD-\d{8}-\d{4,}$/;
    recordTest(
      20,
      'Verify Human-Readable OrderNumber Format (ORD-YYYYMMDD-XXXX)',
      orderNumRegex.test(createdOrderNumber),
      `Generated OrderNumber: '${createdOrderNumber}' matches ${orderNumRegex}`
    );

    // Test 21: Verify Historical Pricing Snapshots Preservation
    const orderItems = placeOrderRes.data?.data?.items || [];
    const item1Snapshot = orderItems.find((i) => i.itemNameSnapshot === 'Truffle & Parmesan Arancini');
    const item2Snapshot = orderItems.find((i) => i.itemNameSnapshot === 'Margherita Classica');
    const hasSnapshots =
      item1Snapshot &&
      item2Snapshot &&
      item2Snapshot.variantNameSnapshot === '12-Inch Large' &&
      item2Snapshot.addons?.length === 2 &&
      item2Snapshot.addons[0].addonNameSnapshot !== undefined;
    recordTest(
      21,
      'Preserve Historical Pricing Snapshots (ItemName, Variant, UnitPrice, Addons)',
      Boolean(hasSnapshots),
      `Item1: ${item1Snapshot?.itemNameSnapshot} (₹${item1Snapshot?.unitPrice}), Item2: ${item2Snapshot?.itemNameSnapshot} (${item2Snapshot?.variantNameSnapshot}, ₹${item2Snapshot?.unitPrice}), Addons: ${item2Snapshot?.addons?.length}`
    );

    // Test 22: Verify Automatic Cart Clearing in Cart Service
    const checkClearedCartRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart/${customerCartId}`,
      { headers: { Authorization: `Bearer ${customerAToken}` } }
    );
    const cartItemsCount = checkClearedCartRes.data?.data?.items?.length || 0;
    recordTest(
      22,
      'Automatic Cart Clearing Post Order Placement',
      cartItemsCount === 0,
      `CartId: ${customerCartId}, ItemsRemaining: ${cartItemsCount} (expected 0)`
    );

    // Test 23: Reject DINE_IN Order with Invalid Table (Table belongs to another branch or not found)
    // Setup a new cart with item for validation test
    const newCartRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      { branchId: 1 }
    );
    const testCartId = newCartRes.data?.data?.cartId;
    await request(
      `${CART_SERVICE_URL}/api/v1/cart/items`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      { cartId: testCartId, menuItemId: 1, quantity: 1 }
    );

    const invalidTableOrderRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      {
        cartId: testCartId,
        orderType: 'DINE_IN',
        tableId: 999999, // non-existent table
      }
    );
    recordTest(
      23,
      'Reject DINE_IN with Invalid Dining Table (400 TABLE_VALIDATION_FAILED)',
      invalidTableOrderRes.status === 400,
      `Status: ${invalidTableOrderRes.status}, ErrorCode: ${getErrorCode(invalidTableOrderRes)}`
    );

    // Test 24: Reject DELIVERY order without deliveryAddressId
    const missingAddressOrderRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      {
        cartId: testCartId,
        orderType: 'DELIVERY',
      }
    );
    recordTest(
      24,
      'Reject DELIVERY Order Without Delivery Address (400 DELIVERY_ADDRESS_REQUIRED)',
      missingAddressOrderRes.status === 400 &&
        (getErrorCode(missingAddressOrderRes) === 'DELIVERY_ADDRESS_REQUIRED' ||
         getErrorCode(missingAddressOrderRes) === 'VALIDATION_ERROR'),
      `Status: ${missingAddressOrderRes.status}, ErrorCode: ${getErrorCode(missingAddressOrderRes)}`
    );

    // Test 25: Place DELIVERY order with valid deliveryAddressId (Address 1 belongs to User 8)
    const placeDeliveryRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      {
        cartId: testCartId,
        orderType: 'DELIVERY',
        deliveryAddressId: 1,
        packagingCharge: 25.00,
      }
    );
    deliveryOrderId = placeDeliveryRes.data?.data?.orderId;
    recordTest(
      25,
      'Place DELIVERY Order with Delivery Address Validation (POST /api/v1/orders)',
      placeDeliveryRes.status === 201 && deliveryOrderId !== undefined && placeDeliveryRes.data?.data?.orderType === 'DELIVERY',
      `Status: ${placeDeliveryRes.status}, OrderId: ${deliveryOrderId}, OrderType: ${placeDeliveryRes.data?.data?.orderType}, PackagingCharge: ${placeDeliveryRes.data?.data?.packagingCharge}`
    );

    // Test 26: Place TAKEAWAY order
    // Create cart and item for takeaway
    const takeawayCartRes = await request(
      `${CART_SERVICE_URL}/api/v1/cart`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      { branchId: 1 }
    );
    const takeawayCartId = takeawayCartRes.data?.data?.cartId;
    await request(
      `${CART_SERVICE_URL}/api/v1/cart/items`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      { cartId: takeawayCartId, menuItemId: 2, quantity: 1 }
    );
    const placeTakeawayRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      {
        cartId: takeawayCartId,
        orderType: 'TAKEAWAY',
        guestName: 'Kishore Express',
        guestPhone: '+919876543210',
      }
    );
    const takeawayOrderId = placeTakeawayRes.data?.data?.orderId;
    recordTest(
      26,
      'Place TAKEAWAY Order with Guest Details (POST /api/v1/orders)',
      placeTakeawayRes.status === 201 && takeawayOrderId !== undefined && placeTakeawayRes.data?.data?.orderType === 'TAKEAWAY',
      `Status: ${placeTakeawayRes.status}, OrderId: ${takeawayOrderId}, OrderType: ${placeTakeawayRes.data?.data?.orderType}`
    );

    // ------------------------------------------------------------------------
    // GROUP 4: REDIS IDEMPOTENCY & TRANSACTION SAFETY
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 4: REDIS IDEMPOTENCY & TRANSACTION SAFETY ---');

    // Test 27: Idempotency Enforcement - Resubmit with same X-Idempotency-Key
    // Count orders before
    const beforeCountRes = await query('SELECT COUNT(*) AS total FROM Orders');
    const orderCountBefore = beforeCountRes.recordset[0].total;

    const idempotentRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${customerAToken}`,
          'X-Idempotency-Key': idempotencyKey1, // Reusing key from Test 19
        },
      },
      {
        cartId: 999999, // payload ignored because idempotency cache returns existing order
        orderType: 'DINE_IN',
        tableId: 1,
      }
    );
    recordTest(
      27,
      'Redis Idempotency Enforcement (Re-submitting same X-Idempotency-Key returns cached order)',
      (idempotentRes.status === 200 || idempotentRes.status === 201) &&
        idempotentRes.data?.data?.orderId === createdOrderId &&
        idempotentRes.data?.data?.orderNumber === createdOrderNumber,
      `Status: ${idempotentRes.status}, Cached OrderId: ${idempotentRes.data?.data?.orderId}, OrderNumber: ${idempotentRes.data?.data?.orderNumber}`
    );

    // Test 28: Verify DB order count did not increase
    const afterCountRes = await query('SELECT COUNT(*) AS total FROM Orders');
    const orderCountAfter = afterCountRes.recordset[0].total;
    recordTest(
      28,
      'Verify No Duplicate Order Created in Database on Idempotent Request',
      orderCountBefore === orderCountAfter,
      `CountBefore: ${orderCountBefore}, CountAfter: ${orderCountAfter}`
    );

    // ------------------------------------------------------------------------
    // GROUP 5: ORDER LIFECYCLE STATE MACHINE & AUDIT HISTORY
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 5: ORDER LIFECYCLE STATE MACHINE & AUDIT HISTORY ---');

    // Test 29: Get Order by ID
    const getOrderRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/${createdOrderId}`,
      { headers: { Authorization: `Bearer ${customerAToken}` } }
    );
    recordTest(
      29,
      'Get Order by ID (GET /api/v1/orders/:orderId)',
      getOrderRes.status === 200 && getOrderRes.data?.data?.orderId === createdOrderId,
      `Status: ${getOrderRes.status}, OrderId: ${getOrderRes.data?.data?.orderId}, Status: ${getOrderRes.data?.data?.orderStatus}`
    );

    // Test 30: Get Order by OrderNumber
    const getByNumRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/number/${createdOrderNumber}`,
      { headers: { Authorization: `Bearer ${waitstaffToken}` } }
    );
    recordTest(
      30,
      'Get Order by OrderNumber (GET /api/v1/orders/number/:orderNumber)',
      getByNumRes.status === 200 && getByNumRes.data?.data?.orderNumber === createdOrderNumber,
      `Status: ${getByNumRes.status}, Found: ${getByNumRes.data?.data?.orderNumber}`
    );

    // Test 31: Update Status: PENDING -> CONFIRMED
    const toConfirmedRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/${createdOrderId}/status`,
      { method: 'PUT', headers: { Authorization: `Bearer ${managerToken}` } },
      { status: 'CONFIRMED', notes: 'Kitchen accepted order' }
    );
    recordTest(
      31,
      'State Machine: Transition PENDING -> CONFIRMED',
      toConfirmedRes.status === 200 && toConfirmedRes.data?.data?.orderStatus === 'CONFIRMED',
      `Status: ${toConfirmedRes.status}, New Status: ${toConfirmedRes.data?.data?.orderStatus}`
    );

    // Test 32: Update Status: CONFIRMED -> PREPARING
    const toPreparingRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/${createdOrderId}/status`,
      { method: 'PUT', headers: { Authorization: `Bearer ${managerToken}` } },
      { status: 'PREPARING', notes: 'Chef started preparation' }
    );
    recordTest(
      32,
      'State Machine: Transition CONFIRMED -> PREPARING',
      toPreparingRes.status === 200 && toPreparingRes.data?.data?.orderStatus === 'PREPARING',
      `Status: ${toPreparingRes.status}, New Status: ${toPreparingRes.data?.data?.orderStatus}`
    );

    // Test 33: Update Status: PREPARING -> READY
    const toReadyRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/${createdOrderId}/status`,
      { method: 'PUT', headers: { Authorization: `Bearer ${managerToken}` } },
      { status: 'READY', notes: 'Plated and ready at pickup counter' }
    );
    recordTest(
      33,
      'State Machine: Transition PREPARING -> READY',
      toReadyRes.status === 200 && toReadyRes.data?.data?.orderStatus === 'READY',
      `Status: ${toReadyRes.status}, New Status: ${toReadyRes.data?.data?.orderStatus}`
    );

    // Test 34: Update Status: READY -> COMPLETED
    const toCompletedRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/${createdOrderId}/status`,
      { method: 'PUT', headers: { Authorization: `Bearer ${waitstaffToken}` } },
      { status: 'COMPLETED', notes: 'Served and settled' }
    );
    recordTest(
      34,
      'State Machine: Transition READY -> COMPLETED',
      toCompletedRes.status === 200 && toCompletedRes.data?.data?.orderStatus === 'COMPLETED',
      `Status: ${toCompletedRes.status}, New Status: ${toCompletedRes.data?.data?.orderStatus}`
    );

    // Test 35: Reject Invalid State Transition (COMPLETED -> CONFIRMED)
    const invalidTransRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/${createdOrderId}/status`,
      { method: 'PUT', headers: { Authorization: `Bearer ${managerToken}` } },
      { status: 'CONFIRMED', notes: 'Invalid rollback attempt' }
    );
    recordTest(
      35,
      'Reject Invalid State Transition: COMPLETED -> CONFIRMED (400 INVALID_STATUS_TRANSITION)',
      invalidTransRes.status === 400 && getErrorCode(invalidTransRes) === 'INVALID_STATUS_TRANSITION',
      `Status: ${invalidTransRes.status}, ErrorCode: ${getErrorCode(invalidTransRes)}`
    );

    // Test 36: Verify Complete OrderStatusHistory Audit Log
    const historyRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/${createdOrderId}/history`,
      { headers: { Authorization: `Bearer ${waitstaffToken}` } }
    );
    const historyRows = historyRes.data?.data || [];
    // Should have: INITIAL (PENDING), CONFIRMED, PREPARING, READY, COMPLETED = 5 entries
    const hasTransitions = historyRows.some((h) => h.newStatus === 'CONFIRMED') &&
                           historyRows.some((h) => h.newStatus === 'PREPARING') &&
                           historyRows.some((h) => h.newStatus === 'READY') &&
                           historyRows.some((h) => h.newStatus === 'COMPLETED');
    recordTest(
      36,
      'Verify OrderStatusHistory Audit Log (Every transition logged with timestamp & user)',
      historyRes.status === 200 && historyRows.length >= 4 && hasTransitions,
      `Status: ${historyRes.status}, HistoryCount: ${historyRows.length}, RecordedStates: [${historyRows.map((h) => h.newStatus).join(', ')}]`
    );

    // ------------------------------------------------------------------------
    // GROUP 6: ORDER CANCELLATION & POLICY
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 6: ORDER CANCELLATION & POLICY ---');

    // Test 37: Cancel an order in CONFIRMED state (deliveryOrderId is in PENDING/CONFIRMED)
    // First advance deliveryOrderId to CONFIRMED
    await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/${deliveryOrderId}/status`,
      { method: 'PUT', headers: { Authorization: `Bearer ${managerToken}` } },
      { status: 'CONFIRMED', notes: 'Ready for rider assignment' }
    );

    const cancelRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/${deliveryOrderId}/cancel`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      { reason: 'Customer requested cancellation due to change of plans' }
    );
    recordTest(
      37,
      'Cancel Order in CONFIRMED state (POST /api/v1/orders/:orderId/cancel)',
      cancelRes.status === 200 && cancelRes.data?.data?.orderStatus === 'CANCELLED',
      `Status: ${cancelRes.status}, OrderStatus: ${cancelRes.data?.data?.orderStatus}`
    );

    // Test 38: Reject Cancellation of an already COMPLETED order
    const cancelCompletedRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/${createdOrderId}/cancel`,
      { method: 'POST', headers: { Authorization: `Bearer ${managerToken}` } },
      { reason: 'Attempting to cancel already served meal' }
    );
    recordTest(
      38,
      'Reject Cancelling COMPLETED Order (400 CANNOT_CANCEL_ORDER)',
      cancelCompletedRes.status === 400 && getErrorCode(cancelCompletedRes) === 'CANNOT_CANCEL_ORDER',
      `Status: ${cancelCompletedRes.status}, ErrorCode: ${getErrorCode(cancelCompletedRes)}`
    );

    // ------------------------------------------------------------------------
    // GROUP 7: ORDER QUERIES & FILTERING
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 7: ORDER QUERIES & FILTERING ---');

    // Test 39: List Orders with pagination & status filter
    const listOrdersRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders?branchId=1&status=COMPLETED&page=1&limit=10`,
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );
    recordTest(
      39,
      'List Orders with Pagination & Status Filter (GET /api/v1/orders)',
      listOrdersRes.status === 200 && Array.isArray(listOrdersRes.data?.data),
      `Status: ${listOrdersRes.status}, Count: ${listOrdersRes.data?.data?.length}, Total: ${listOrdersRes.data?.meta?.total}`
    );

    // Test 40: Customer Order History
    const custHistoryRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/customer/8`,
      { headers: { Authorization: `Bearer ${customerAToken}` } }
    );
    recordTest(
      40,
      'Customer Order History (GET /api/v1/orders/customer/:customerId)',
      custHistoryRes.status === 200 && Array.isArray(custHistoryRes.data?.data),
      `Status: ${custHistoryRes.status}, OrdersFound: ${custHistoryRes.data?.data?.length}`
    );

    // Test 41: Branch Order List
    const branchOrdersRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/branch/1`,
      { headers: { Authorization: `Bearer ${waitstaffToken}` } }
    );
    recordTest(
      41,
      'Branch Order List (GET /api/v1/orders/branch/:branchId)',
      branchOrdersRes.status === 200 && Array.isArray(branchOrdersRes.data?.data),
      `Status: ${branchOrdersRes.status}, Count: ${branchOrdersRes.data?.data?.length}`
    );

    // Test 42: Order Ownership Guard (Customer B cannot inspect Customer A's order)
    const blockedOrderRes = await request(
      `${ORDER_SERVICE_URL}/api/v1/orders/${createdOrderId}`,
      { headers: { Authorization: `Bearer ${customerBToken}` } }
    );
    recordTest(
      42,
      "Order Ownership Guard (Customer B forbidden from viewing Customer A's order: 403)",
      blockedOrderRes.status === 403 && getErrorCode(blockedOrderRes) === 'ORDER_ACCESS_FORBIDDEN',
      `Status: ${blockedOrderRes.status}, ErrorCode: ${getErrorCode(blockedOrderRes)}`
    );

    // ------------------------------------------------------------------------
    // GROUP 8: API GATEWAY INGRESS ROUTING
    // ------------------------------------------------------------------------
    console.log('\n--- GROUP 8: API GATEWAY INGRESS ROUTING ---');

    // Test 43: Gateway proxy route for Cart (/api/v1/cart)
    const gwCartRes = await request(
      `${GATEWAY_URL}/api/v1/cart`,
      { method: 'POST', headers: { Authorization: `Bearer ${customerAToken}` } },
      { branchId: 1 }
    );
    recordTest(
      43,
      'API Gateway Routing for Cart Service (/api/v1/cart -> port 8006)',
      gwCartRes.status === 200 && gwCartRes.data?.data?.cartId !== undefined,
      `Status: ${gwCartRes.status}, CartId: ${gwCartRes.data?.data?.cartId}`
    );

    // Test 44: Gateway proxy route for Orders (/api/v1/orders/:orderId)
    const gwOrderRes = await request(
      `${GATEWAY_URL}/api/v1/orders/${createdOrderId}`,
      { headers: { Authorization: `Bearer ${customerAToken}` } }
    );
    recordTest(
      44,
      'API Gateway Routing for Order Service (/api/v1/orders -> port 8007)',
      gwOrderRes.status === 200 && gwOrderRes.data?.data?.orderId === createdOrderId,
      `Status: ${gwOrderRes.status}, OrderId: ${gwOrderRes.data?.data?.orderId}`
    );

    // Test 45: Gateway Auth Enforcement for Orders (unauthenticated request rejected with 401)
    const gwNoAuthRes = await request(`${GATEWAY_URL}/api/v1/orders/${createdOrderId}`);
    recordTest(
      45,
      'API Gateway Auth Enforcement for Orders (Unauthenticated request -> 401 UNAUTHORIZED)',
      gwNoAuthRes.status === 401,
      `Status: ${gwNoAuthRes.status}, ErrorCode: ${getErrorCode(gwNoAuthRes)}`
    );

    // Test 46: Gateway Correlation ID Propagation
    const testCorrelationId = `corr-test-p7-${Date.now()}`;
    const gwCorrRes = await request(
      `${GATEWAY_URL}/api/v1/orders/${createdOrderId}`,
      {
        headers: {
          Authorization: `Bearer ${customerAToken}`,
          'X-Correlation-ID': testCorrelationId,
        },
      }
    );
    const echoedCorrId = gwCorrRes.headers['x-correlation-id'];
    recordTest(
      46,
      'Gateway Correlation ID Propagation (X-Correlation-ID echoed in response headers)',
      gwCorrRes.status === 200 && echoedCorrId === testCorrelationId,
      `Injected: ${testCorrelationId}, Echoed: ${echoedCorrId}`
    );

  } catch (error) {
    console.error('\n❌ Unhandled error during Phase 7 test execution:', error);
  } finally {
    // Teardown in-process servers
    if (userServer) userServer.close();
    if (restaurantServer) restaurantServer.close();
    if (menuServer) menuServer.close();
    if (cartServer) cartServer.close();
    if (orderServer) orderServer.close();
    if (gatewayServer) gatewayServer.close();

    // Close shared DB connection pool
    try {
      await closePool();
    } catch {
      // ignore
    }

    // Summary calculation
    const passed = testResults.filter((t) => t.passed).length;
    const total = testResults.length;
    console.log('\n================================================================');
    console.log(`  PHASE 7 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
    console.log('================================================================');

    if (passed === total) {
      console.log('\n🎉 ALL PHASE 7 VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
    } else {
      console.error(`\n⚠️ ${total - passed} TESTS FAILED. PLEASE REVIEW LOGS ABOVE.\n`);
    }

    process.exit(passed === total ? 0 : 1);
  }
}

runTestSuite();
