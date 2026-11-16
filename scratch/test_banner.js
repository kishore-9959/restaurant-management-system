const { bannerRepository } = require('../backend/cms-service/src/repositories');
const { closePool } = require('@rms/shared');

async function test() {
  try {
    console.log('Testing bannerRepository.getActiveBanners...');
    const start = Date.now();
    const res = await bannerRepository.getActiveBanners({ restaurantId: 1, bannerLocation: 'HOME_HERO' });
    console.log('Result in', Date.now() - start, 'ms:', res);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await closePool();
  }
}

test();

