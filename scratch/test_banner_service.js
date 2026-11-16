const { bannerService } = require('../backend/cms-service/src/services');
const { closePool } = require('@rms/shared');

async function test() {
  try {
    console.log('Testing bannerService.getActiveBanners...');
    const start = Date.now();
    const res = await bannerService.getActiveBanners({ restaurantId: 1, bannerLocation: 'HOME_HERO' });
    console.log('Result in', Date.now() - start, 'ms:', res.length, 'banners');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await closePool();
    process.exit(0);
  }
}

test();

