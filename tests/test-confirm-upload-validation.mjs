import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../gara-bot-server/.env') });

const { confirmUploadSchema } = await import('../gara-bot-server/dist/controllers/storage.controller.js');
const { validateBody } = await import('../gara-bot-server/dist/middleware/validate.middleware.js');
const { query } = await import('../gara-bot-server/dist/database/index.js');

async function runTests() {
  console.log('=== VT AUTO: CONFIRM-UPLOAD VALIDATION AUDIT ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // TEST 1: User's reported payload 1: "0758 sm5.jpg" with null thumbnail and null songNungExpiryDate
  console.log('--- Test 1: File "0758 sm5.jpg" (Standard vehicle photo) ---');
  const payload1 = {
    bucketType: 'images',
    key: 'vehicles/general/1732300000000_abc123_0758_sm5.jpg',
    vehicleId: 'b622cfa6-b187-438d-8e8e-4a81ba08198f',
    category: 'vehicle',
    sortOrder: 0,
    songNungExpiryDate: null,
    thumbnail: null,
    fileName: '0758 sm5.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 154200,
  };
  const res1 = confirmUploadSchema.safeParse(payload1);
  assert(res1.success, 'File "0758 sm5.jpg" with null fields passes Zod validation');
  if (!res1.success) console.error(res1.error);

  // TEST 2: User's reported payload 2: "1133_01 (1).jpg" with parentheses and space
  console.log('\n--- Test 2: File "1133_01 (1).jpg" (With parentheses & space) ---');
  const payload2 = {
    bucketType: 'images',
    key: 'vehicles/b622cfa6-b187-438d-8e8e-4a81ba08198f/1732300000000_def456_1133_01__1_.jpg',
    vehicleId: 'b622cfa6-b187-438d-8e8e-4a81ba08198f',
    category: 'vehicle',
    sortOrder: 1,
    songNungExpiryDate: null,
    thumbnail: null,
  };
  const res2 = confirmUploadSchema.safeParse(payload2);
  assert(res2.success, 'File "1133_01 (1).jpg" passes Zod validation');
  if (!res2.success) console.error(res2.error);

  // TEST 3: All 5 allowed categories
  console.log('\n--- Test 3: All 5 allowed categories ---');
  const categories = ['vehicle', 'website', 'documents', 'error', 'song_nung'];
  for (const cat of categories) {
    const p = {
      bucketType: 'images',
      key: `vehicles/b622cfa6-b187-438d-8e8e-4a81ba08198f/test_${cat}.jpg`,
      vehicleId: 'b622cfa6-b187-438d-8e8e-4a81ba08198f',
      category: cat,
      sortOrder: 0,
      songNungExpiryDate: cat === 'song_nung' ? '2026-12-31' : null,
      thumbnail: null,
    };
    const r = confirmUploadSchema.safeParse(p);
    assert(r.success, `Category "${cat}" parsed successfully`);
  }

  // TEST 4: Invalid category rejected strictly by Zod
  console.log('\n--- Test 4: Invalid category rejected strictly ---');
  const invalidCategoryPayload = {
    bucketType: 'images',
    key: 'vehicles/test/invalid_cat.jpg',
    category: 'custom_hack_category',
  };
  const resInvalidCat = confirmUploadSchema.safeParse(invalidCategoryPayload);
  assert(!resInvalidCat.success, 'Invalid category "custom_hack_category" was rejected by Zod');

  // TEST 5: Document upload payload
  console.log('\n--- Test 5: Document upload payload ---');
  const docPayload = {
    bucketType: 'documents',
    key: 'documents/b622cfa6-b187-438d-8e8e-4a81ba08198f/giay_to_xe.pdf',
    vehicleId: 'b622cfa6-b187-438d-8e8e-4a81ba08198f',
    label: 'Giấy đăng kiểm 2026',
    sortOrder: 0,
  };
  const resDoc = confirmUploadSchema.safeParse(docPayload);
  assert(resDoc.success, 'Document payload with label passes validation');

  // TEST 6: CheckSheet photo payload
  console.log('\n--- Test 6: Checksheet photo payload ---');
  const csPayload = {
    bucketType: 'photos',
    key: 'checksheets/b622cfa6-b187-438d-8e8e-4a81ba08198f/front_bumper/photo1.jpg',
    checksheetId: 'b622cfa6-b187-438d-8e8e-4a81ba08198f',
    spotKey: 'front_bumper',
  };
  const resCs = confirmUploadSchema.safeParse(csPayload);
  assert(resCs.success, 'Checksheet payload with spotKey passes validation');

  // TEST 7: validateBody middleware error formatting verification
  console.log('\n--- Test 7: validateBody middleware detailed error response ---');
  const middleware = validateBody(confirmUploadSchema);
  let capturedStatus = 0;
  let capturedJson = null;

  const mockReq = {
    method: 'POST',
    originalUrl: '/api/storage/confirm-upload',
    body: {
      bucketType: 'invalid_bucket',
      key: '', // too short
      sortOrder: 'not_a_number',
    },
  };
  const mockRes = {
    status(code) {
      capturedStatus = code;
      return this;
    },
    json(data) {
      capturedJson = data;
      return this;
    },
  };
  const mockNext = () => {};

  middleware(mockReq, mockRes, mockNext);
  assert(capturedStatus === 400, 'Middleware returns HTTP 400 on invalid input');
  assert(capturedJson?.error === 'validation_error', 'Middleware error code is "validation_error"');
  assert(
    typeof capturedJson?.message === 'string' && capturedJson.message.includes('Dữ liệu không hợp lệ'),
    `Middleware message is descriptive: "${capturedJson?.message}"`
  );
  assert(Array.isArray(capturedJson?.errors) && capturedJson.errors.length > 0, 'Middleware provides details for each failing field');

  // TEST 8: Live DB check with a real vehicle in Neon DB
  console.log('\n--- Test 8: Live database check with real vehicle ---');
  const vResult = await query('SELECT id FROM vehicles LIMIT 1');
  if (vResult.rows.length > 0) {
    const testVeh = vResult.rows[0];
    console.log(`Found test vehicle ID: ${testVeh.id}`);

    // Insert a test row with null song_nung_expiry_date and null thumbnail
    const testKey = `test_confirm_${Date.now()}.jpg`;
    const insertRes = await query(
      `INSERT INTO vehicle_images (
        vehicle_id, path, bucket, url, thumbnail, size_bytes, mime_type,
        category, sort_order, song_nung_expiry_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, category, song_nung_expiry_date, thumbnail`,
      [
        testVeh.id,
        testKey,
        'vehicle-images',
        testKey,
        null,
        1024,
        'image/jpeg',
        'vehicle',
        0,
        null,
      ]
    );

    assert(insertRes.rows.length === 1, 'Successfully inserted metadata with null values into Neon');
    const insertedId = insertRes.rows[0].id;

    // Clean up immediately
    await query('DELETE FROM vehicle_images WHERE id = $1', [insertedId]);
    console.log(`Cleaned up temporary test record (${insertedId})`);
  } else {
    console.log('No vehicle found for live DB test, skipping insert test.');
  }

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
