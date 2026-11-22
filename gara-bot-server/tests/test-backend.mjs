import { config } from './dist/config/index.js';
import { checkDatabaseHealth, closeDatabasePool } from './dist/database/index.js';
import { signAuthToken, verifyAuthToken } from './dist/services/auth.service.js';
import { checkR2Health, isR2Configured } from './dist/storage/r2.service.js';
import { getFullHealthReport } from './dist/services/health.service.js';

async function runTests() {
  console.log('=== RUNNING BACKEND TESTS ===\n');

  // 1. Config Test
  console.log('1. Config Test:');
  console.log('   Port:', config.port);
  console.log('   Database URL configured:', Boolean(config.database.url));
  console.log('   R2 Account ID:', config.r2.accountId);
  console.log('   R2 Endpoint:', config.r2.endpoint);
  console.log('   R2 Credentials set:', isR2Configured() ? 'Yes' : 'No (Pending API Token)');

  // 2. JWT Sign & Verify Test
  console.log('\n2. JWT Authentication Foundation Test:');
  const mockUser = {
    id: '00000000-0000-0000-0000-000000000099',
    name: 'Test Staff',
    email: 'staff@vtauto.vn',
    role: 'staff',
    status: 'approved',
  };
  const token = signAuthToken(mockUser);
  console.log('   Token generated successfully (length:', token.length, ')');
  const verified = verifyAuthToken(token);
  console.log('   Token verified successfully. User:', verified.name, '| Role:', verified.role);
  if (verified.id !== mockUser.id || verified.role !== 'staff') {
    throw new Error('JWT verification payload mismatch');
  }

  // 3. Neon Database Health Test
  console.log('\n3. Neon PostgreSQL Health Check Test:');
  const dbHealth = await checkDatabaseHealth();
  console.log('   DB OK:', dbHealth.ok);
  console.log('   Latency:', dbHealth.latencyMs, 'ms');
  console.log('   Postgres Version:', dbHealth.version);
  console.log('   Database Name:', dbHealth.database);
  if (!dbHealth.ok) {
    throw new Error('Database health check failed: ' + dbHealth.error);
  }

  // 4. Cloudflare R2 Health Test
  console.log('\n4. Cloudflare R2 Storage Health Test:');
  const r2Health = await checkR2Health();
  console.log('   R2 Configured:', r2Health.configured);
  console.log('   R2 Status:', r2Health.ok ? 'All Buckets Reachable' : (r2Health.error || 'Awaiting API token'));
  console.log('   Buckets monitored:');
  Object.entries(r2Health.buckets).forEach(([b, status]) => {
    console.log(`     - ${b}: ${status ? 'Active' : 'Unreachable / Unconfigured'}`);
  });

  // 5. Full System Health Report Test
  console.log('\n5. Full Health Report Test:');
  const fullReport = await getFullHealthReport();
  console.log('   Overall System OK:', fullReport.ok);
  console.log('   Service:', fullReport.service);
  console.log('   Timestamp:', fullReport.timestamp);

  await closeDatabasePool();
  console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('\nTest failed:', err);
  process.exit(1);
});
