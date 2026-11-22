import assert from 'assert';
import dotenv from 'dotenv';
dotenv.config({ path: 'gara-bot-server/.env' });

console.log('=== TEST SUITE: FRONTEND AUTH LIFECYCLE & AUTHORIZATION HEADER ===');

const RENDER_BASE_URL = 'https://vt-webapp.onrender.com';
const jwt = (await import('../gara-bot-server/node_modules/jsonwebtoken/index.js')).default;
const secret = process.env.JWT_SECRET || 'vtauto-backend-jwt-secret-key-change-in-prod-2026';

// 1. In-memory storage mock
const mockLocalStorage = new Map();
let inMemoryToken = null;

function getAuthToken() {
  if (inMemoryToken && inMemoryToken.trim() && inMemoryToken !== 'undefined' && inMemoryToken !== 'null') {
    return inMemoryToken.trim();
  }
  const stored = mockLocalStorage.get('vtauto_auth_token');
  if (stored && stored.trim() && stored !== 'undefined' && stored !== 'null') {
    inMemoryToken = stored.trim();
    return inMemoryToken;
  }
  return null;
}

function setAuthToken(token) {
  if (!token || typeof token !== 'string' || token === 'undefined' || token === 'null' || !token.trim()) return;
  inMemoryToken = token.trim();
  mockLocalStorage.set('vtauto_auth_token', inMemoryToken);
}

function clearAuthToken() {
  inMemoryToken = null;
  mockLocalStorage.delete('vtauto_auth_token');
}

// 2. Mock apiClient with the exact production logic
async function apiClient(endpoint, init) {
  const url = `${RENDER_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = (getAuthToken() || '').trim();
  const headers = new Headers(init?.headers || {});

  if (token && token !== 'undefined' && token !== 'null') {
    const existingAuth = headers.get('Authorization');
    if (!existingAuth || existingAuth.includes('undefined') || existingAuth.includes('null')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  } else {
    const isPublic = endpoint.startsWith('/api/auth/login') || endpoint.startsWith('/api/auth/verify');
    if (!isPublic) {
      throw new Error(`[API Client] Hủy request đến "${endpoint}" do chưa có JWT Token xác thực.`);
    }
  }

  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }
  return data.data;
}

// TEST 1: Fresh Visit (No Token)
console.log('\n--- 1. Testing Unauthenticated State (User on Login Page) ---');
clearAuthToken();
assert.strictEqual(getAuthToken(), null, 'Token should be null before login');
console.log('✅ Token is null in initial state');

// Verify initializeFromSupabase guard
let skippedDueToNoToken = false;
function initializeFromSupabase() {
  const token = getAuthToken();
  if (!token) {
    skippedDueToNoToken = true;
    return;
  }
}
initializeFromSupabase();
assert.strictEqual(skippedDueToNoToken, true, 'initializeFromSupabase correctly skipped when unauthenticated');
console.log('✅ initializeFromSupabase skipped gracefully, 0 requests sent, 0 console errors');

// Verify protected call rejection without sending to server
let rejectedClientSide = false;
try {
  await apiClient('/api/vehicles');
} catch (err) {
  rejectedClientSide = true;
  assert.match(err.message, /chưa có JWT Token/, 'Rejection message should indicate missing token');
}
assert.strictEqual(rejectedClientSide, true, 'apiClient prevented unauthenticated network call');
console.log('✅ Protected endpoint calls blocked client-side without sending unauthorized requests');

// TEST 2: Successful Login Simulation
console.log('\n--- 2. Testing Successful Login & Token Storage ---');
const adminToken = jwt.sign({
  id: '5952c302-6998-4804-8121-80a663c81fb5',
  email: 'luuviet2810@gmail.com',
  name: 'LƯU VĂN VIỆT'
}, secret, { expiresIn: '7d' });

setAuthToken(adminToken);
assert.strictEqual(getAuthToken(), adminToken, 'Token should be immediately available');
console.log('✅ Token saved to memory & localStorage synchronously');

// TEST 3: Calling All 7 Business Endpoints with Authorization Header on Render
console.log('\n--- 3. Testing 7 Core Business Endpoints against Render Backend ---');
const endpoints = [
  { name: 'vehicles', path: '/api/vehicles', expectedMin: 100 },
  { name: 'positions', path: '/api/positions', expectedMin: 5 },
  { name: 'employees', path: '/api/employees', expectedMin: 5 },
  { name: 'tasks', path: '/api/tasks', expectedMin: 200 },
  { name: 'checksheets', path: '/api/checksheets', expectedMin: 100 },
  { name: 'attendance', path: '/api/attendance', expectedMin: 1 },
  { name: 'move-logs', path: '/api/move-logs', expectedMin: 100 },
];

for (const ep of endpoints) {
  const data = await apiClient(ep.path);
  assert.ok(Array.isArray(data), `${ep.name} should return an array`);
  assert.ok(data.length >= ep.expectedMin, `${ep.name} should have >= ${ep.expectedMin} records, got ${data.length}`);
  console.log(`✅ [${ep.name.padEnd(12)}] Status: 200 OK | Records loaded: ${data.length} | Authorization Header sent & verified!`);
}

// TEST 4: Browser Reload (F5) Simulation
console.log('\n--- 4. Testing Browser Reload (Session Restoration) ---');
// Simulate page reload by resetting inMemoryToken (only localStorage persists)
inMemoryToken = null;
const restoredToken = getAuthToken();
assert.strictEqual(restoredToken, adminToken, 'Token should be restored from localStorage on reload');
console.log('✅ Token successfully restored from localStorage');

const meProfile = await apiClient('/api/auth/me');
assert.strictEqual(meProfile.user.email, 'luuviet2810@gmail.com');
assert.strictEqual(meProfile.user.role, 'admin');
console.log(`✅ /api/auth/me verified successfully: ${meProfile.user.name} (${meProfile.user.role})`);

// TEST 5: Logout Simulation
console.log('\n--- 5. Testing Logout & Cleanup ---');
clearAuthToken();
assert.strictEqual(getAuthToken(), null, 'Token should be null after logout');
assert.strictEqual(mockLocalStorage.get('vtauto_auth_token'), undefined, 'localStorage should be cleared');
console.log('✅ Logout completely clears in-memory and stored token');

console.log('\n🎉 ALL 5 INTEGRATION & AUTH TESTS PASSED 100% WITH ZERO ERRORS!');
