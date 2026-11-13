const path = require('path');
const http = require('http');

const services = [
  { name: 'api-gateway', port: 8000, file: '../backend/api-gateway/src/app' },
  { name: 'auth-service', port: 8001, file: '../backend/auth-service/src/app' },
  { name: 'user-service', port: 8002, file: '../backend/user-service/src/app' },
  { name: 'restaurant-service', port: 8003, file: '../backend/restaurant-service/src/app' },
  { name: 'cms-service', port: 8004, file: '../backend/cms-service/src/app' },
  { name: 'menu-service', port: 8005, file: '../backend/menu-service/src/app' },
  { name: 'cart-service', port: 8006, file: '../backend/cart-service/src/app' },
  { name: 'order-service', port: 8007, file: '../backend/order-service/src/app' },
  { name: 'payment-service', port: 8008, file: '../backend/payment-service/src/app' },
  { name: 'inventory-service', port: 8009, file: '../backend/inventory-service/src/app' },
  { name: 'kitchen-service', port: 8010, file: '../backend/kitchen-service/src/app' },
  { name: 'reservation-service', port: 8011, file: '../backend/reservation-service/src/app' },
  { name: 'notification-service', port: 8012, file: '../backend/notification-service/src/app' },
  { name: 'report-service', port: 8013, file: '../backend/report-service/src/app' },
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    }).on('error', reject);
  });
}

async function verifyAll() {
  console.log('================================================================');
  console.log('  AUDITING LIVENESS & READINESS FOR ALL 14 SERVICES');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  for (const s of services) {
    try {
      const mod = require(path.join(__dirname, s.file));
      const app = mod.app || mod;
      const server = http.createServer(app);
      
      await new Promise((resolve, reject) => {
        server.listen(0, '127.0.0.1', async () => {
          const addr = server.address();
          const ephemeralPort = addr.port;
          
          try {
            const live = await fetch(`http://127.0.0.1:${ephemeralPort}/health/live`);
            const ready = await fetch(`http://127.0.0.1:${ephemeralPort}/health/ready`);

            server.close(() => {
              if (live.status === 200 && ready.status === 200) {
                console.log(`[PASS] ${s.name.padEnd(22)} Live: 200 OK | Ready: 200 OK (DB & Redis Healthy)`);
                passed++;
                resolve();
              } else {
                console.error(`[FAIL] ${s.name.padEnd(22)} Live: ${live.status} | Ready: ${ready.status}`);
                failed++;
                resolve();
              }
            });
          } catch (probeErr) {
            server.close(() => {
              console.error(`[FAIL] ${s.name.padEnd(22)} Probe error: ${probeErr.message}`);
              failed++;
              resolve();
            });
          }
        });
        server.on('error', reject);
      });
    } catch (err) {
      console.error(`[ERROR] ${s.name.padEnd(22)} Exception during startup:`, err.message);
      failed++;
    }
  }

  console.log('\n================================================================');
  console.log(`Total Services: ${services.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================');

  const { closePool } = require('../backend/shared');
  await closePool();

  process.exit(failed > 0 ? 1 : 0);
}

verifyAll();
