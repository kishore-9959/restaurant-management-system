/**
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - COMPREHENSIVE HEALTH & READINESS AUDIT
 * File: scripts/verify-health.js
 * Description: Audits /health/live, /health/ready, and /health across all 14 microservices.
 */

const http = require('http');

const services = [
  { name: 'api-gateway', port: 8000, type: 'gateway' },
  { name: 'auth-service', port: 8001, type: 'domain' },
  { name: 'user-service', port: 8002, type: 'domain' },
  { name: 'restaurant-service', port: 8003, type: 'domain' },
  { name: 'cms-service', port: 8004, type: 'domain' },
  { name: 'menu-service', port: 8005, type: 'domain' },
  { name: 'cart-service', port: 8006, type: 'domain' },
  { name: 'order-service', port: 8007, type: 'domain' },
  { name: 'payment-service', port: 8008, type: 'domain' },
  { name: 'inventory-service', port: 8009, type: 'domain' },
  { name: 'kitchen-service', port: 8010, type: 'domain' },
  { name: 'reservation-service', port: 8011, type: 'domain' },
  { name: 'notification-service', port: 8012, type: 'domain' },
  { name: 'report-service', port: 8013, type: 'domain' },
];

function fetchEndpoint(port, path) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ ok: res.statusCode === 200, status: res.statusCode, data: json });
        } catch (e) {
          resolve({ ok: false, status: res.statusCode, error: 'Non-JSON response' });
        }
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Timeout' }); });
  });
}

async function checkAll() {
  console.log('========================================================================================');
  console.log('  RESTAURANT MANAGEMENT SYSTEM (RMS) - LIVENESS & READINESS HEALTH AUDIT                 ');
  console.log('========================================================================================');

  const report = [];

  for (const s of services) {
    const [liveRes, readyRes] = await Promise.all([
      fetchEndpoint(s.port, '/health/live'),
      fetchEndpoint(s.port, '/health/ready'),
    ]);

    const liveOk = liveRes.ok && liveRes.status === 200;
    const readyOk = readyRes.ok && readyRes.status === 200;

    let dbStatus = 'N/A';
    let redisStatus = 'N/A';

    if (readyRes.data && readyRes.data.data) {
      const d = readyRes.data.data;
      if (d.stateless) {
        dbStatus = 'Stateless';
        redisStatus = 'Stateless';
      } else {
        if (d.dependencies?.database) {
          dbStatus = d.dependencies.database.healthy ? 'CONNECTED' : 'DISCONNECTED';
        }
        if (d.dependencies?.redis) {
          redisStatus = d.dependencies.redis.healthy ? 'CONNECTED' : 'DISCONNECTED';
        }
      }
    }

    const overallPass = liveOk && readyOk;
    console.log(
      `[${overallPass ? 'PASS' : 'FAIL'}] ${s.name.padEnd(22)} (:${s.port}) -> ` +
      `Live: ${liveOk ? 'UP (200)' : 'FAIL (' + liveRes.status + ')'} | ` +
      `Ready: ${readyOk ? 'UP (200)' : 'FAIL (' + readyRes.status + ')'} | ` +
      `DB: ${dbStatus.padEnd(11)} | Redis: ${redisStatus}`
    );

    report.push({
      service: s.name,
      port: s.port,
      liveOk,
      readyOk,
      dbStatus,
      redisStatus,
      overallPass,
    });
  }

  const allPassed = report.every((r) => r.overallPass);
  console.log('========================================================================================');
  console.log(`Overall Health Status: ${allPassed ? 'ALL 14 SERVICES PASS LIVENESS & READINESS CHECKS (100%)' : 'ATTENTION REQUIRED'}`);
  console.log('========================================================================================');

  if (!allPassed) process.exit(1);
}

checkAll();
