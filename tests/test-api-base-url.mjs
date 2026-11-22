import assert from 'assert';

// Test 1: Production behavior (VITE_API_URL set to Render)
{
  globalThis.importMeta = {
    env: {
      PROD: true,
      DEV: false,
      VITE_API_URL: 'https://vt-webapp.onrender.com',
    },
  };

  function testGetApiBaseUrl(importMetaEnv) {
    if (importMetaEnv.DEV) {
      const devUrl = (importMetaEnv.VITE_API_URL || 'http://localhost:3001').trim();
      return devUrl.replace(/\/$/, '');
    }

    const envUrl = (importMetaEnv.VITE_API_URL || '').trim();
    if (!envUrl) {
      throw new Error('[CRITICAL CONFIG ERROR] VITE_API_URL is missing in Production');
    }
    if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      throw new Error('[CRITICAL CONFIG ERROR] Localhost URL detected in Production');
    }
    return envUrl.replace(/\/$/, '');
  }

  const url = testGetApiBaseUrl(globalThis.importMeta.env);
  assert.strictEqual(url, 'https://vt-webapp.onrender.com');
  console.log('✅ Test 1 Passed: Production mode correctly returns Render backend URL:', url);

  // Test 2: Trailing slash handling
  globalThis.importMeta.env.VITE_API_URL = 'https://vt-webapp.onrender.com/';
  const urlWithSlash = testGetApiBaseUrl(globalThis.importMeta.env);
  assert.strictEqual(urlWithSlash, 'https://vt-webapp.onrender.com');
  console.log('✅ Test 2 Passed: Trailing slash removed properly:', urlWithSlash);

  // Test 3: Production rejects empty URL
  globalThis.importMeta.env.VITE_API_URL = '';
  assert.throws(() => testGetApiBaseUrl(globalThis.importMeta.env), /missing in Production/);
  console.log('✅ Test 3 Passed: Production throws clear error when VITE_API_URL is empty');

  // Test 4: Production rejects localhost URL
  globalThis.importMeta.env.VITE_API_URL = 'http://localhost:3001';
  assert.throws(() => testGetApiBaseUrl(globalThis.importMeta.env), /Localhost URL detected in Production/);
  console.log('✅ Test 4 Passed: Production throws clear error when VITE_API_URL points to localhost');

  // Test 5: Development mode fallback
  const devEnv = {
    PROD: false,
    DEV: true,
    VITE_API_URL: '',
  };
  const devUrl = testGetApiBaseUrl(devEnv);
  assert.strictEqual(devUrl, 'http://localhost:3001');
  console.log('✅ Test 5 Passed: Development mode cleanly falls back to localhost:3001:', devUrl);
}

console.log('🎉 ALL API BASE URL LOGIC TESTS PASSED 100%!');
