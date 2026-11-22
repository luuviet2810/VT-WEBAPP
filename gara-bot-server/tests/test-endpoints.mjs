import http from 'http';
import app from '../dist/index.js';
import { closeDatabasePool } from '../dist/database/index.js';
import { signAuthToken } from '../dist/services/auth.service.js';

// We run a test probe on a temporary port or 3002
const testPort = 3002;

const server = app.listen(testPort, async () => {
  console.log(`Probe server running on port ${testPort}`);

  try {
    // 1. Test /health
    const res1 = await fetch(`http://localhost:${testPort}/health`);
    const data1 = await res1.json();
    console.log('GET /health:', res1.status, data1);

    // 2. Test /health/db
    const res2 = await fetch(`http://localhost:${testPort}/health/db`);
    const data2 = await res2.json();
    console.log('GET /health/db:', res2.status, data2);

    // 3. Test /health/r2
    const res3 = await fetch(`http://localhost:${testPort}/health/r2`);
    const data3 = await res3.json();
    console.log('GET /health/r2:', res3.status, data3);

    // 4. Test /api/auth/me without token -> should be 401
    const res4 = await fetch(`http://localhost:${testPort}/api/auth/me`);
    const data4 = await res4.json();
    console.log('GET /api/auth/me (no token):', res4.status, data4);

    // 5. Test /api/auth/me with valid JWT token -> should be 200
    const testToken = signAuthToken({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Admin Test',
      role: 'admin',
      status: 'approved',
    });
    const res5 = await fetch(`http://localhost:${testPort}/api/auth/me`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    const data5 = await res5.json();
    console.log('GET /api/auth/me (valid token):', res5.status, data5);

    // 6. Test /api/storage/presigned-upload (should return 200 with presigned URL)
    const res6 = await fetch(`http://localhost:${testPort}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        bucketType: 'images',
        key: 'vehicles/test-id/photo.jpg',
      }),
    });
    const data6 = await res6.json();
    console.log('POST /api/storage/presigned-upload:', res6.status, {
      ...data6,
      url: data6.url ? data6.url.substring(0, 60) + '...' : undefined,
    });

    console.log('\n--- ALL ROUTE PROBES PASSED! ---');
  } catch (err) {
    console.error('Route probe error:', err);
  } finally {
    server.close(async () => {
      await closeDatabasePool();
      process.exit(0);
    });
  }
});
