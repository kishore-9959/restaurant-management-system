/**
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PORT 8000 SERIES HEALTH AUDITOR
 * File: scripts/test-all-services.js
 * Description: Sequentially starts each microservice on ports 8000-8013,
 *              audits its /health endpoint, tests DB/Redis connectivity,
 *              and gracefully terminates it.
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const services = [
  { name: 'auth-service', port: 8001, dir: 'auth-service' },
  { name: 'user-service', port: 8002, dir: 'user-service' },
  { name: 'restaurant-service', port: 8003, dir: 'restaurant-service' },
  { name: 'cms-service', port: 8004, dir: 'cms-service' },
  { name: 'menu-service', port: 8005, dir: 'menu-service' },
  { name: 'cart-service', port: 8006, dir: 'cart-service' },
  { name: 'order-service', port: 8007, dir: 'order-service' },
  { name: 'payment-service', port: 8008, dir: 'payment-service' },
  { name: 'inventory-service', port: 8009, dir: 'inventory-service' },
  { name: 'kitchen-service', port: 8010, dir: 'kitchen-service' },
  { name: 'reservation-service', port: 8011, dir: 'reservation-service' },
  { name: 'notification-service', port: 8012, dir: 'notification-service' },
  { name: 'report-service', port: 8013, dir: 'report-service' },
  { name: 'api-gateway', port: 8000, dir: 'api-gateway' },
];

function fetchHealth(port) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testService(svc) {
  const servicePath = path.resolve(__dirname, '..', 'backend', svc.dir, 'src', 'index.js');
  const child = spawn(process.execPath, [servicePath], {
    cwd: path.resolve(__dirname, '..', 'backend', svc.dir),
    env: { ...process.env, PATH: `C:\\Program Files\\nodejs;${process.env.PATH}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let hasStarted = false;
  let healthResult = null;
  let errorOutput = '';

  child.stderr.on('data', (d) => { errorOutput += d.toString(); });

  // Poll for up to 10 seconds
  const start = Date.now();
  while (Date.now() - start < 10000) {
    try {
      healthResult = await fetchHealth(svc.port);
      if (healthResult && healthResult.status === 200) {
        hasStarted = true;
        break;
      }
    } catch (e) {
      // not yet up
    }
    await sleep(400);
  }

  // Gracefully terminate child
  child.kill('SIGTERM');
  await sleep(300);
  if (!child.killed) {
    child.kill('SIGKILL');
  }

  return {
    name: svc.name,
    port: svc.port,
    started: hasStarted,
    health: healthResult ? healthResult.body : null,
    error: hasStarted ? null : errorOutput,
  };
}

async function runAll() {
  console.log('================================================================================');
  console.log('  RESTAURANT MANAGEMENT SYSTEM (RMS) - 8000 SERIES PORT MIGRATION AUDIT         ');
  console.log('================================================================================\n');

  const results = [];
  for (const s of services) {
    process.stdout.write(`Testing ${s.name.padEnd(22)} on port ${s.port}... `);
    const res = await testService(s);
    if (res.started) {
      const data = res.health?.data || {};
      const dbStatus = data.stateless ? 'N/A' : (data.dependencies?.database?.healthy ? 'CONNECTED' : 'DISCONNECTED');
      const redisStatus = data.dependencies?.redis ? (data.dependencies.redis.healthy ? 'CONNECTED' : 'DISCONNECTED') : 'N/A';
      console.log(`[PASS] HTTP 200 OK | DB: ${dbStatus.padEnd(11)} | Redis: ${redisStatus}`);
      results.push({ ...res, dbStatus, redisStatus, pass: true });
    } else {
      console.log(`[FAIL] Did not respond on port ${s.port}`);
      if (res.error) {
        console.log(`   Error: ${res.error.slice(0, 200)}`);
      }
      results.push({ ...res, pass: false });
    }
  }

  console.log('\n================================================================================');
  const allPassed = results.every(r => r.pass);
  console.log(`Summary: ${results.filter(r => r.pass).length}/${results.length} Services Verified Healthy on Ports 8000-8013.`);
  console.log(`Migration Verification: ${allPassed ? 'ALL SERVICES PASS 100%' : 'SOME SERVICES FAILED'}`);
  console.log('================================================================================');

  if (!allPassed) process.exit(1);
}

runAll().catch(err => {
  console.error('Test runner encountered an error:', err);
  process.exit(1);
});
