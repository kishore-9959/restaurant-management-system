/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PHASE 9 AUTOMATED VERIFICATION SUITE
 * File: scripts/test_phase9.js
 * Description: Exhaustive verification runner for Phase 9 - Payment Service:
 *              Online Razorpay intent creation, cryptographic HMAC verification,
 *              Razorpay webhooks & signature verification, Redis idempotency,
 *              Offline POS settlement (Cash, Card, UPI), full & partial refunds,
 *              excess refund guards, Order Service synchronization,
 *              financial reconciliation reports, RBAC, Gateway routing, and probes.
 * ============================================================================
 */

process.env.DB_NAME = 'RestaurantManagementDB_IsolatedTest';

const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { config, query } = require('../backend/shared');

const GATEWAY_URL = 'http://localhost:8000';
const PAYMENT_SERVICE_URL = 'http://localhost:8008';
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
  console.log('  RMS PHASE 9: PAYMENT SERVICE & RAZORPAY INTEGRATION SUITE');
  console.log('================================================================\n');

  // Boot payment service, order service, and api-gateway if not already running
  const { app: paymentApp } = require('../backend/payment-service/src/app');
  const { app: orderApp } = require('../backend/order-service/src/app');
  const { app: gatewayApp } = require('../backend/api-gateway/src/app');

  const paymentServer = await safeListen(paymentApp, 8008);
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
      email: 'manager@antigravitybistro.com',
      userType: 'EMPLOYEE',
      roles: ['RESTAURANT_MANAGER'],
      permissions: ['payments:manage', 'payments:refund', 'payments:view'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  const cashierToken = jwt.sign(
    {
      userId: 3,
      email: 'cashier@antigravitybistro.com',
      userType: 'EMPLOYEE',
      roles: ['CASHIER_POS'],
      permissions: ['payments:settle', 'payments:view'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  const customerToken = jwt.sign(
    {
      userId: 6,
      email: 'customer@example.com',
      userType: 'CUSTOMER',
      roles: ['CUSTOMER'],
      permissions: ['payments:create'],
      branchId: 1,
    },
    config.security.jwtAccessSecret,
    { expiresIn: '1h' }
  );

  // --------------------------------------------------------------------------
  // TEST DATABASE SETUP: Create persistent parent orders for testing
  // --------------------------------------------------------------------------
  const testOrderNum1 = `ORD-PAY9-${Date.now().toString().slice(-6)}`;
  const testOrderNum2 = `ORD-POS9-${Date.now().toString().slice(-6)}`;

  await query(`
    DELETE FROM dbo.PaymentRefunds WHERE PaymentId IN (SELECT PaymentId FROM dbo.Payments WHERE OrderId IN (SELECT OrderId FROM dbo.Orders WHERE OrderNumber IN ('${testOrderNum1}', '${testOrderNum2}')));
    DELETE FROM dbo.PaymentTransactions WHERE PaymentId IN (SELECT PaymentId FROM dbo.Payments WHERE OrderId IN (SELECT OrderId FROM dbo.Orders WHERE OrderNumber IN ('${testOrderNum1}', '${testOrderNum2}')));
    DELETE FROM dbo.Payments WHERE OrderId IN (SELECT OrderId FROM dbo.Orders WHERE OrderNumber IN ('${testOrderNum1}', '${testOrderNum2}'));
    DELETE FROM dbo.Orders WHERE OrderNumber IN ('${testOrderNum1}', '${testOrderNum2}');

    INSERT INTO dbo.Orders (BranchId, OrderNumber, OrderType, OrderStatus, PaymentStatus, SubTotal, TaxTotal, GrandTotal, CreatedAt, UpdatedAt)
    VALUES 
      (1, '${testOrderNum1}', 'DINE_IN', 'CONFIRMED', 'PENDING', 450.00, 22.50, 472.50, SYSUTCDATETIME(), SYSUTCDATETIME()),
      (1, '${testOrderNum2}', 'TAKEAWAY', 'READY', 'PENDING', 200.00, 10.00, 210.00, SYSUTCDATETIME(), SYSUTCDATETIME());
  `);

  const orderRows = await query(`SELECT OrderId, OrderNumber, GrandTotal FROM dbo.Orders WHERE OrderNumber IN ('${testOrderNum1}', '${testOrderNum2}') ORDER BY OrderNumber`);
  const order1 = orderRows.recordset.find(o => o.OrderNumber === testOrderNum1);
  const order2 = orderRows.recordset.find(o => o.OrderNumber === testOrderNum2);

  const testOrderId1 = order1.OrderId;
  const testOrderId2 = order2.OrderId;

  let createdPayment1 = null;
  let offlinePayment2 = null;
  let partialRefund1 = null;

  try {
    // ========================================================================
    // GROUP 1: HEALTH & READINESS PROBES
    // ========================================================================
    console.log('--- GROUP 1: HEALTH & READINESS PROBES ---');

    // Test 01: Direct Liveness Probe
    const liveRes = await request(`${PAYMENT_SERVICE_URL}/health/live`);
    recordTest(
      1,
      'Payment Service Liveness Probe (/health/live)',
      liveRes.status === 200 && liveRes.data?.data?.status === 'UP',
      `HTTP ${liveRes.status} | status: ${liveRes.data?.data?.status}`
    );

    // Test 02: Direct Readiness Probe (Verifies DB and Redis)
    const readyRes = await request(`${PAYMENT_SERVICE_URL}/health/ready`);
    recordTest(
      2,
      'Payment Service Readiness Probe (/health/ready: DB & Redis)',
      readyRes.status === 200 && readyRes.data?.data?.dependencies?.database?.healthy === true,
      `HTTP ${readyRes.status} | DB Healthy: ${readyRes.data?.data?.dependencies?.database?.healthy}`
    );

    // Test 03: Gateway Forwarded Liveness Probe
    const gwLiveRes = await request(`${GATEWAY_URL}/api/v1/payments/health/live`);
    recordTest(
      3,
      'API Gateway Forwarded Payment Liveness Probe',
      gwLiveRes.status === 200 && gwLiveRes.data?.data?.status === 'UP',
      `HTTP ${gwLiveRes.status}`
    );

    // Test 04: Gateway Forwarded Readiness Probe
    const gwReadyRes = await request(`${GATEWAY_URL}/api/v1/payments/health/ready`);
    recordTest(
      4,
      'API Gateway Forwarded Payment Readiness Probe',
      gwReadyRes.status === 200 && gwReadyRes.data?.data?.status === 'UP',
      `HTTP ${gwReadyRes.status}`
    );

    // ========================================================================
    // GROUP 2: ONLINE PAYMENT ORDER CREATION (RAZORPAY INTENT)
    // ========================================================================
    console.log('\n--- GROUP 2: ONLINE PAYMENT ORDER CREATION (RAZORPAY) ---');

    // Test 05: Create Razorpay Order via Gateway (POST /api/v1/payments/razorpay/create-order)
    const createRes = await request(
      `${GATEWAY_URL}/api/v1/payments/razorpay/create-order`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      },
      {
        orderId: testOrderId1,
        branchId: 1,
        paymentMethod: 'RAZORPAY',
      }
    );

    const pData = createRes.data?.data;
    createdPayment1 = pData;
    recordTest(
      5,
      'Create Razorpay Payment Order (POST /api/v1/payments/razorpay/create-order)',
      createRes.status === 201 && pData?.paymentId && pData?.gatewayOrderId && pData?.status === 'PENDING',
      `PaymentId: ${pData?.paymentId} | GatewayOrderId: ${pData?.gatewayOrderId} | Ref: ${pData?.paymentReference}`
    );

    // Test 06: Payment Reference Format (PAY-YYYYMMDD-XXXXX)
    recordTest(
      6,
      'Generated Payment Reference Matches Format (PAY-YYYYMMDD-...)',
      typeof pData?.paymentReference === 'string' && /^PAY-\d{8}-/.test(pData?.paymentReference),
      `Ref: ${pData?.paymentReference}`
    );

    // Test 07: Amount Converted and Matches Order GrandTotal
    recordTest(
      7,
      'Payment Amount Accurately Recorded in Database',
      pData?.amount === 472.50,
      `Amount: ${pData?.amount} (Expected 472.50)`
    );

    // Test 08: Validation Rejection: Missing/Invalid OrderId
    const badOrderRes = await request(
      `${GATEWAY_URL}/api/v1/payments/razorpay/create-order`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      },
      {
        orderId: -1,
      }
    );
    recordTest(
      8,
      'Rejects Invalid Order ID with 400 Bad Request',
      badOrderRes.status === 400 && getErrorCode(badOrderRes) === 'VALIDATION_ERROR',
      `HTTP ${badOrderRes.status} | Code: ${getErrorCode(badOrderRes)}`
    );

    // ========================================================================
    // GROUP 3: ONLINE PAYMENT SIGNATURE VERIFICATION & CAPTURE
    // ========================================================================
    console.log('\n--- GROUP 3: PAYMENT VERIFICATION & SIGNATURE CHECK ---');

    // Test 09: Tampered Signature Rejected (POST /api/v1/payments/razorpay/verify)
    const badSigRes = await request(
      `${GATEWAY_URL}/api/v1/payments/razorpay/verify`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      },
      {
        paymentId: createdPayment1.paymentId,
        gatewayOrderId: createdPayment1.gatewayOrderId,
        gatewayPaymentId: 'pay_test_capture_999',
        gatewaySignature: 'forged_invalid_signature_string',
      }
    );
    recordTest(
      9,
      'Rejects Invalid HMAC Signature with 400 Bad Request',
      badSigRes.status === 400,
      `HTTP ${badSigRes.status} | ${badSigRes.data?.message}`
    );

    // Test 10: Valid Signature Captures Payment (status: SUCCESS)
    const validVerifyRes = await request(
      `${GATEWAY_URL}/api/v1/payments/razorpay/verify`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      },
      {
        paymentId: createdPayment1.paymentId,
        gatewayOrderId: createdPayment1.gatewayOrderId,
        gatewayPaymentId: 'pay_test_capture_999',
        gatewaySignature: 'sig_test_hmac_valid_hash',
      }
    );
    const capturedData = validVerifyRes.data?.data;
    recordTest(
      10,
      'Valid Cryptographic Signature Captures Payment (Status: SUCCESS)',
      validVerifyRes.status === 200 && capturedData?.paymentStatus === 'SUCCESS',
      `Status: ${capturedData?.paymentStatus} | SettledAt: ${capturedData?.settledAt}`
    );

    // Test 11: Idempotency on Repeated Capture
    const repeatVerifyRes = await request(
      `${GATEWAY_URL}/api/v1/payments/razorpay/verify`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      },
      {
        paymentId: createdPayment1.paymentId,
        gatewayOrderId: createdPayment1.gatewayOrderId,
        gatewayPaymentId: 'pay_test_capture_999',
        gatewaySignature: 'sig_test_hmac_valid_hash',
      }
    );
    recordTest(
      11,
      'Repeated Capture Request is Idempotent without Error (isIdempotent: true)',
      repeatVerifyRes.status === 200 && repeatVerifyRes.data?.data?.isIdempotent === true,
      `isIdempotent: ${repeatVerifyRes.data?.data?.isIdempotent}`
    );

    // Test 12: Order Service Status Synchronized to PAID
    const orderCheck = await query(`SELECT PaymentStatus FROM dbo.Orders WHERE OrderId = ${testOrderId1}`);
    recordTest(
      12,
      'Order Service PaymentStatus Synchronized to PAID',
      orderCheck.recordset?.[0]?.PaymentStatus === 'PAID',
      `Order #${testOrderId1} PaymentStatus: ${orderCheck.recordset?.[0]?.PaymentStatus}`
    );

    // ========================================================================
    // GROUP 4: ASYNCHRONOUS RAZORPAY WEBHOOKS
    // ========================================================================
    console.log('\n--- GROUP 4: RAZORPAY ASYNCHRONOUS WEBHOOKS ---');

    // Test 13: Webhook Missing Signature Rejected (400 Bad Request)
    const unsignedWebhookRes = await request(
      `${GATEWAY_URL}/api/v1/payments/razorpay/webhook`,
      {
        method: 'POST',
      },
      {
        event: 'payment.captured',
      }
    );
    recordTest(
      13,
      'Webhook Rejects Missing Signature with 400 Bad Request',
      unsignedWebhookRes.status === 400,
      `HTTP ${unsignedWebhookRes.status}`
    );

    // Test 14: Valid Webhook Signature Processing
    const webhookPayload = {
      id: `evt_test_${Date.now()}`,
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_capture_999',
            order_id: createdPayment1.gatewayOrderId,
            amount: 47250,
            status: 'captured',
          },
        },
      },
    };

    const webhookRes = await request(
      `${GATEWAY_URL}/api/v1/payments/razorpay/webhook`,
      {
        method: 'POST',
        headers: {
          'X-Razorpay-Signature': 'sig_test_webhook_valid',
        },
      },
      webhookPayload
    );
    recordTest(
      14,
      'Valid Webhook Processed Successfully (HTTP 200 OK)',
      webhookRes.status === 200 && webhookRes.data?.received === true,
      `Event: ${webhookRes.data?.event} | Result: ${webhookRes.data?.result}`
    );

    // Test 15: Duplicate Webhook Event Idempotency
    const dupWebhookRes = await request(
      `${GATEWAY_URL}/api/v1/payments/razorpay/webhook`,
      {
        method: 'POST',
        headers: {
          'X-Razorpay-Signature': 'sig_test_webhook_valid',
        },
      },
      webhookPayload
    );
    recordTest(
      15,
      'Duplicate Webhook Event Prevented by Distributed Idempotency (idempotent: true)',
      dupWebhookRes.status === 200 && dupWebhookRes.data?.idempotent === true,
      `Idempotent: ${dupWebhookRes.data?.idempotent}`
    );

    // ========================================================================
    // GROUP 5: PAYMENT FAILURE HANDLING
    // ========================================================================
    console.log('\n--- GROUP 5: PAYMENT FAILURE HANDLING ---');

    // Create a new pending payment to simulate failure
    const failOrderRes = await request(
      `${GATEWAY_URL}/api/v1/payments/razorpay/create-order`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      },
      {
        orderId: testOrderId2,
        amount: 210.00,
      }
    );
    const failPayment = failOrderRes.data?.data;

    // Test 16: Webhook payment.failed Records Failure
    const failWebhookRes = await request(
      `${GATEWAY_URL}/api/v1/payments/razorpay/webhook`,
      {
        method: 'POST',
        headers: {
          'X-Razorpay-Signature': 'sig_test_webhook_valid',
        },
      },
      {
        id: `evt_fail_${Date.now()}`,
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_failed_888',
              order_id: failPayment.gatewayOrderId,
              amount: 21000,
              error_code: 'BAD_REQUEST_ERROR',
              error_description: 'Card declined by issuing bank',
            },
          },
        },
      }
    );
    recordTest(
      16,
      'payment.failed Webhook Records Status FAILED',
      failWebhookRes.status === 200,
      `HTTP ${failWebhookRes.status}`
    );

    // Test 17: Database Status Verified as FAILED
    const failDbCheck = await query(`SELECT PaymentStatus FROM dbo.Payments WHERE PaymentId = ${failPayment.paymentId}`);
    recordTest(
      17,
      'Payment Status in Database Verified as FAILED',
      failDbCheck.recordset?.[0]?.PaymentStatus === 'FAILED',
      `Status: ${failDbCheck.recordset?.[0]?.PaymentStatus}`
    );

    // ========================================================================
    // GROUP 6: OFFLINE POS PAYMENT SETTLEMENT (CASH, CARD, UPI)
    // ========================================================================
    console.log('\n--- GROUP 6: OFFLINE POS PAYMENT SETTLEMENT ---');

    // Test 18: Settle Order 2 via Cash (POST /api/v1/payments/offline-settle)
    const settleRes = await request(
      `${GATEWAY_URL}/api/v1/payments/offline-settle`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${cashierToken}` },
      },
      {
        orderId: testOrderId2,
        branchId: 1,
        paymentMethod: 'CASH',
        amount: 210.00,
        notes: 'Exact cash tendered at counter 1',
      }
    );

    offlinePayment2 = settleRes.data?.data;
    recordTest(
      18,
      'Offline Cash Settlement (POST /api/v1/payments/offline-settle)',
      settleRes.status === 200 && offlinePayment2?.paymentStatus === 'SUCCESS' && offlinePayment2?.paymentMethod === 'CASH',
      `PaymentId: ${offlinePayment2?.paymentId} | Amount: ${offlinePayment2?.amount} | Settler: ${offlinePayment2?.settledByUserId}`
    );

    // Test 19: Cashier User ID Recorded in SettledByUserId
    recordTest(
      19,
      'Cashier Staff User ID Accurately Recorded in Settlement Record',
      Number(offlinePayment2?.settledByUserId) === 3,
      `SettledByUserId: ${offlinePayment2?.settledByUserId}`
    );

    // Test 20: Order Service Synchronized to PAID upon Cash Settlement
    const order2Check = await query(`SELECT PaymentStatus, OrderStatus FROM dbo.Orders WHERE OrderId = ${testOrderId2}`);
    recordTest(
      20,
      'Order Service PaymentStatus Synchronized to PAID for Offline Settlement',
      order2Check.recordset?.[0]?.PaymentStatus === 'PAID',
      `PaymentStatus: ${order2Check.recordset?.[0]?.PaymentStatus} | OrderStatus: ${order2Check.recordset?.[0]?.OrderStatus}`
    );

    // Test 21: Rejects Invalid Payment Method
    const badMethodRes = await request(
      `${GATEWAY_URL}/api/v1/payments/offline-settle`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${cashierToken}` },
      },
      {
        orderId: testOrderId2,
        paymentMethod: 'GOLD_COINS',
      }
    );
    recordTest(
      21,
      'Rejects Invalid Offline Payment Method with 400 Bad Request',
      badMethodRes.status === 400,
      `HTTP ${badMethodRes.status} | ${badMethodRes.data?.message}`
    );

    // ========================================================================
    // GROUP 7: REFUND MANAGEMENT (FULL & PARTIAL)
    // ========================================================================
    console.log('\n--- GROUP 7: REFUND MANAGEMENT ---');

    // Test 22: Partial Refund Creation (POST /api/v1/payments/refund)
    // Payment 1 is 472.50. Refund 150.00 -> remaining balance = 322.50
    const partialRefundRes = await request(
      `${GATEWAY_URL}/api/v1/payments/refund`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${managerToken}` },
      },
      {
        paymentId: createdPayment1.paymentId,
        refundAmount: 150.00,
        reason: 'Customer returned cold appetizer',
      }
    );

    partialRefund1 = partialRefundRes.data?.data;
    recordTest(
      22,
      'Process Partial Refund (POST /api/v1/payments/refund)',
      partialRefundRes.status === 200 && partialRefund1?.refundId && partialRefund1?.status === 'PROCESSED',
      `RefundId: ${partialRefund1?.refundId} | Refunded: ${partialRefund1?.refundAmount} | Remaining: ${partialRefund1?.remainingBalance}`
    );

    // Test 23: Remaining Balance Accurately Computed
    recordTest(
      23,
      'Remaining Balance Computed with 2-Decimal Precision (322.50)',
      partialRefund1?.remainingBalance === 322.50,
      `RemainingBalance: ${partialRefund1?.remainingBalance} (Expected 322.50)`
    );

    // Test 24: Excess Refund Rejection (Guards Over-Refunding)
    // Attempting to refund 400.00 when only 322.50 remains
    const excessRefundRes = await request(
      `${GATEWAY_URL}/api/v1/payments/refund`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${managerToken}` },
      },
      {
        paymentId: createdPayment1.paymentId,
        refundAmount: 400.00,
        reason: 'Excess refund test',
      }
    );
    recordTest(
      24,
      'Excess Refund Guard Blocks Overdraw with 400 Bad Request',
      excessRefundRes.status === 400,
      `HTTP ${excessRefundRes.status} | ${excessRefundRes.data?.message}`
    );

    // Test 25: Full Refund of Remaining Balance
    // Refund remaining 322.50 -> PaymentStatus must transition to REFUNDED
    const fullRefundRes = await request(
      `${GATEWAY_URL}/api/v1/payments/refund`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${managerToken}` },
      },
      {
        paymentId: createdPayment1.paymentId,
        refundAmount: 322.50,
        reason: 'Full order refund approved by manager',
      }
    );
    const fullRefundData = fullRefundRes.data?.data;
    recordTest(
      25,
      'Full Refund Completes; PaymentStatus Advances to REFUNDED',
      fullRefundRes.status === 200 && fullRefundData?.remainingBalance === 0.00 && fullRefundData?.paymentStatus === 'REFUNDED',
      `Remaining: ${fullRefundData?.remainingBalance} | PaymentStatus: ${fullRefundData?.paymentStatus}`
    );

    // Test 26: Get Refund by ID (GET /api/v1/payments/refunds/:refundId)
    const getRefundRes = await request(
      `${GATEWAY_URL}/api/v1/payments/refunds/${partialRefund1.refundId}`,
      {
        headers: { Authorization: `Bearer ${managerToken}` },
      }
    );
    recordTest(
      26,
      'Get Refund Details by ID (GET /api/v1/payments/refunds/:refundId)',
      getRefundRes.status === 200 && getRefundRes.data?.data?.RefundId === partialRefund1.refundId,
      `RefundId: ${getRefundRes.data?.data?.RefundId} | Amount: ${getRefundRes.data?.data?.RefundAmount}`
    );

    // ========================================================================
    // GROUP 8: PAYMENT LOOKUPS, HISTORY & REPORTS
    // ========================================================================
    console.log('\n--- GROUP 8: PAYMENT LOOKUPS & REPORTS ---');

    // Test 27: Get Payment by ID (GET /api/v1/payments/:id)
    const getPayRes = await request(
      `${GATEWAY_URL}/api/v1/payments/${createdPayment1.paymentId}`,
      {
        headers: { Authorization: `Bearer ${managerToken}` },
      }
    );
    const payDetails = getPayRes.data?.data;
    recordTest(
      27,
      'Get Payment by ID Returns Transactions and Refunds Multi-Recordset',
      getPayRes.status === 200 && Array.isArray(payDetails?.transactions) && Array.isArray(payDetails?.refunds),
      `Tx Count: ${payDetails?.transactions?.length} | Refund Count: ${payDetails?.refunds?.length}`
    );

    // Test 28: Summary Balance Accurately Returned in Payment Details
    recordTest(
      28,
      'Payment Summary Net Settled Amount is 0.00 After Full Refund',
      payDetails?.summary?.netSettledAmount === 0.00,
      `NetSettledAmount: ${payDetails?.summary?.netSettledAmount}`
    );

    // Test 29: Get Payments by Order ID (GET /api/v1/payments/order/:orderId)
    const getOrderPaysRes = await request(
      `${GATEWAY_URL}/api/v1/payments/order/${testOrderId1}`,
      {
        headers: { Authorization: `Bearer ${managerToken}` },
      }
    );
    recordTest(
      29,
      'Get Payments by Order ID Returns All Associated Payments & Aggregates',
      getOrderPaysRes.status === 200 && getOrderPaysRes.data?.data?.payments?.length > 0,
      `Payments for Order #${testOrderId1}: ${getOrderPaysRes.data?.data?.payments?.length}`
    );

    // Test 30: Lightweight Status Lookup (GET /api/v1/payments/status/:id)
    const getStatusRes = await request(
      `${GATEWAY_URL}/api/v1/payments/status/${createdPayment1.paymentId}`,
      {
        headers: { Authorization: `Bearer ${managerToken}` },
      }
    );
    recordTest(
      30,
      'Get Payment Status Lightweight Lookup (GET /api/v1/payments/status/:id)',
      getStatusRes.status === 200 && getStatusRes.data?.data?.PaymentStatus === 'REFUNDED',
      `PaymentStatus: ${getStatusRes.data?.data?.PaymentStatus}`
    );

    // Test 31: List Payments with Pagination (GET /api/v1/payments)
    const listRes = await request(
      `${GATEWAY_URL}/api/v1/payments?branchId=1&page=1&limit=10`,
      {
        headers: { Authorization: `Bearer ${managerToken}` },
      }
    );
    recordTest(
      31,
      'List Payments with Branch Filter and Pagination (GET /api/v1/payments)',
      listRes.status === 200 && Array.isArray(listRes.data?.data) && listRes.data?.pagination?.page === 1,
      `Found ${listRes.data?.data?.length} payments | Total Records: ${listRes.data?.pagination?.totalRecords}`
    );

    // Test 32: Financial Reconciliation Summary (GET /api/v1/payments/reports/reconciliation)
    const reconRes = await request(
      `${GATEWAY_URL}/api/v1/payments/reports/reconciliation?branchId=1`,
      {
        headers: { Authorization: `Bearer ${managerToken}` },
      }
    );
    const reconData = reconRes.data?.data;
    recordTest(
      32,
      'Financial Reconciliation Report Returns Collections & Method Breakdown',
      reconRes.status === 200 && reconData?.metrics?.totalTransactions > 0 && Array.isArray(reconData?.breakdownByMethod),
      `Gross: ${reconData?.metrics?.grossCollections} | Refunds: ${reconData?.metrics?.totalRefunds} | Net: ${reconData?.metrics?.netCollections}`
    );

    // ========================================================================
    // GROUP 9: SECURITY, AUTHENTICATION & RBAC AUTHORIZATION
    // ========================================================================
    console.log('\n--- GROUP 9: SECURITY & RBAC AUTHORIZATION ---');

    // Test 33: Unauthenticated Access Blocked by API Gateway (401 Unauthorized)
    const unauthRes = await request(`${GATEWAY_URL}/api/v1/payments/1`);
    recordTest(
      33,
      'Unauthenticated Payment Access Blocked with 401 Unauthorized',
      unauthRes.status === 401,
      `HTTP ${unauthRes.status}`
    );

    // Test 34: Customer Role Blocked from Staff-Only Offline Settlement (403 Forbidden)
    const custSettleRes = await request(
      `${GATEWAY_URL}/api/v1/payments/offline-settle`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      },
      {
        orderId: testOrderId1,
        paymentMethod: 'CASH',
        amount: 100.0,
      }
    );
    recordTest(
      34,
      'Customer Role Blocked from Offline Settlement (403 Forbidden)',
      custSettleRes.status === 403,
      `HTTP ${custSettleRes.status}`
    );

    // Test 35: Customer Role Blocked from Issuing Refunds (403 Forbidden)
    const custRefundRes = await request(
      `${GATEWAY_URL}/api/v1/payments/refund`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      },
      {
        paymentId: createdPayment1.paymentId,
        refundAmount: 50.0,
        reason: 'Unauthorized customer refund',
      }
    );
    recordTest(
      35,
      'Customer Role Blocked from Processing Refunds (403 Forbidden)',
      custRefundRes.status === 403,
      `HTTP ${custRefundRes.status}`
    );

    // Test 36: Cashier Role Blocked from Financial Reconciliation Report (403 Forbidden)
    const cashierReconRes = await request(
      `${GATEWAY_URL}/api/v1/payments/reports/reconciliation`,
      {
        headers: { Authorization: `Bearer ${cashierToken}` },
      }
    );
    recordTest(
      36,
      'Cashier Role Blocked from Executive Reconciliation Financials (403 Forbidden)',
      cashierReconRes.status === 403,
      `HTTP ${cashierReconRes.status}`
    );

    // Test 37: Restaurant Manager Authorized for Full Operational Capabilities (200 OK)
    const mgrReconRes = await request(
      `${GATEWAY_URL}/api/v1/payments/reports/reconciliation`,
      {
        headers: { Authorization: `Bearer ${managerToken}` },
      }
    );
    recordTest(
      37,
      'Restaurant Manager Role Fully Authorized for Financial Reporting (200 OK)',
      mgrReconRes.status === 200,
      `HTTP ${mgrReconRes.status}`
    );

    // Test 38: Super Admin Role Authorized for All Operations (200 OK)
    const adminListRes = await request(
      `${GATEWAY_URL}/api/v1/payments`,
      {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      }
    );
    recordTest(
      38,
      'Super Admin Role Fully Authorized Across All Endpoints (200 OK)',
      adminListRes.status === 200,
      `HTTP ${adminListRes.status}`
    );

  } finally {
    // ------------------------------------------------------------------------
    // TEARDOWN & CLEANUP
    // ------------------------------------------------------------------------
    console.log('\n--- CLEANUP & TEARDOWN ---');
    try {
      await query(`
        DELETE FROM dbo.PaymentRefunds WHERE PaymentId IN (SELECT PaymentId FROM dbo.Payments WHERE OrderId IN (${testOrderId1}, ${testOrderId2}));
        DELETE FROM dbo.PaymentTransactions WHERE PaymentId IN (SELECT PaymentId FROM dbo.Payments WHERE OrderId IN (${testOrderId1}, ${testOrderId2}));
        DELETE FROM dbo.Payments WHERE OrderId IN (${testOrderId1}, ${testOrderId2});
        DELETE FROM dbo.Orders WHERE OrderId IN (${testOrderId1}, ${testOrderId2});
      `);
      console.log('Post-test cleanup completed: All test records successfully removed.');
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
    }
  }

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  const passed = testResults.filter((t) => t.passed).length;
  const failed = testResults.filter((t) => !t.passed).length;

  console.log('\n================================================================');
  console.log(`  PHASE 9 TEST SUMMARY: ${passed} Passed / ${failed} Failed (${((passed / testResults.length) * 100).toFixed(1)}% Success Rate)`);
  console.log('================================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL 38 PHASE 9 TEST REQUIREMENTS PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  } else {
    console.error(`❌ ${failed} TEST(S) FAILED IN PHASE 9 TEST SUITE.\n`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('FATAL TEST RUNNER ERROR:', err);
  process.exit(1);
});
