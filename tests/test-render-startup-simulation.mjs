import dotenv from 'dotenv';
dotenv.config(); // Loads DATABASE_URL, etc.

// Explicitly delete any Supabase environment variables to simulate Render production
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.VITE_SUPABASE_URL;
delete process.env.VITE_SUPABASE_ANON_KEY;

process.env.PORT = '3095';
process.env.NODE_ENV = 'production';
process.env.FRONTEND_URL = 'https://admin-vtauto.vercel.app';

console.log('--- SIMULATING RENDER PRODUCTION STARTUP (ZERO SUPABASE ENV) ---');

let server;
try {
  const { startServer } = await import('../gara-bot-server/dist/index.js');
  server = await startServer(3095);
  console.log('✅ Server started successfully without Supabase environment!');

  // Test /health
  const healthRes = await fetch('http://localhost:3095/health');
  const healthData = await healthRes.json();
  console.log('GET /health status:', healthRes.status, healthData);

  // Test /health/db
  const dbHealthRes = await fetch('http://localhost:3095/health/db');
  const dbHealthData = await dbHealthRes.json();
  console.log('GET /health/db status:', dbHealthRes.status, 'DB Service:', dbHealthData.service, 'OK:', dbHealthData.ok);

  // Test /api/auth/login route responds
  const loginRes = await fetch('http://localhost:3095/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent@test.com', password: 'wrong' }),
  });
  console.log('POST /api/auth/login status:', loginRes.status, '(Expected 401 for wrong credentials)');

  if (healthRes.status === 200 && dbHealthRes.status === 200 && loginRes.status === 401) {
    console.log('🎉 RENDER STARTUP SIMULATION PASSED 100%! ZERO CRASHES!');
  } else {
    throw new Error('Endpoint verification failed');
  }
} catch (err) {
  console.error('❌ Server startup crashed:', err);
  process.exitCode = 1;
} finally {
  if (server) {
    server.close();
    console.log('Test server closed.');
  }
  process.exit(process.exitCode || 0);
}
