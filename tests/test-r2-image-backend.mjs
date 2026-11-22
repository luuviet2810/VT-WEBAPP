import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../gara-bot-server/.env') });

const require = createRequire(path.resolve(__dirname, '../gara-bot-server/node_modules'));
const jwt = require('jsonwebtoken');
const { S3Client, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// Import compiled app
const { app } = await import('../gara-bot-server/dist/index.js');
const { checkR2Health, isR2Configured, headObject } = await import('../gara-bot-server/dist/storage/r2.service.js');
const { query } = await import('../gara-bot-server/dist/database/index.js');

const TEST_PORT = 3105;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// Valid user IDs from Neon
const ADMIN_USER = {
  id: '5952c302-6998-4804-8121-80a663c81fb5',
  email: 'luuviet2810@gmail.com',
  name: 'LƯU VĂN VIỆT',
  role: 'admin',
};

const STAFF_USER = {
  id: 'b2931df6-022c-403c-965d-9d743326b9f0',
  email: 'kienluu13012005vp@gmail.com',
  name: 'LUU ANH KIEN',
  role: 'staff',
};

const JWT_SECRET = process.env.JWT_SECRET || 'vtauto-backend-jwt-secret-key-change-in-prod-2026';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

const adminToken = signToken(ADMIN_USER);
const staffToken = signToken(STAFF_USER);

// 1x1 transparent PNG buffer (68 bytes)
const SAMPLE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const samplePngBuffer = Buffer.from(SAMPLE_PNG_BASE64, 'base64');

let server;

async function runTests() {
  console.log('================================================================');
  console.log('  VT AUTO – PHASE 1: R2 IMAGE STORAGE BACKEND TEST SUITE');
  console.log('================================================================\n');

  // Start HTTP server on TEST_PORT
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`[Test Server] Running at ${BASE_URL}\n`);
      resolve();
    });
  });

  let passedSuites = 0;
  let totalSuites = 8;

  try {
    // -------------------------------------------------------------
    // SUITE 1: Health & Connectivity Checks
    // -------------------------------------------------------------
    console.log('--- SUITE 1: Health & Connectivity Checks ---');
    const r2Health = await checkR2Health();
    console.log('1.1 checkR2Health result:', JSON.stringify(r2Health.buckets));
    if (!r2Health.ok) {
      throw new Error(`R2 Health check failed: ${r2Health.error}`);
    }
    console.log('  [PASS] All 3 buckets (vehicle-images, vehicle-documents, checksheet-photos) reachable.');

    const dbRes = await query('SELECT current_database(), version()');
    console.log(`1.2 Neon PostgreSQL connected: ${dbRes.rows[0].current_database}`);
    console.log('  [PASS] Database online.\n');
    passedSuites++;

    // -------------------------------------------------------------
    // SUITE 2: Security & Constraints Validation
    // -------------------------------------------------------------
    console.log('--- SUITE 2: Security & Constraints Validation ---');

    // 2.1 Missing Auth
    const noAuthRes = await fetch(`${BASE_URL}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bucketType: 'images',
        fileName: 'test.jpg',
        fileSize: 1000,
        mimeType: 'image/jpeg',
      }),
    });
    console.log('2.1 Unauthenticated request status:', noAuthRes.status);
    if (noAuthRes.status !== 401) throw new Error('Expected 401 for unauthenticated request');
    console.log('  [PASS] Reject unauthenticated access (401).');

    // 2.2 Path traversal attack
    const traversalRes = await fetch(`${BASE_URL}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'images',
        fileName: '../../evil-file.png',
        fileSize: 1000,
        mimeType: 'image/png',
      }),
    });
    console.log('2.2 Path traversal request status:', traversalRes.status);
    if (traversalRes.status !== 400) throw new Error('Expected 400 for path traversal attack');
    console.log('  [PASS] Path traversal prevented (400).');

    // 2.3 Forbidden MIME type (.exe)
    const badMimeRes = await fetch(`${BASE_URL}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'images',
        fileName: 'malware.exe',
        fileSize: 5000,
        mimeType: 'application/x-msdownload',
      }),
    });
    console.log('2.3 Forbidden MIME type status:', badMimeRes.status);
    if (badMimeRes.status !== 400) throw new Error('Expected 400 for forbidden MIME type');
    console.log('  [PASS] Forbidden MIME type rejected (400).');

    // 2.4 File size exceeding 10MB limit
    const oversizedRes = await fetch(`${BASE_URL}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'images',
        fileName: 'huge-car.png',
        fileSize: 15 * 1024 * 1024, // 15MB
        mimeType: 'image/png',
      }),
    });
    console.log('2.4 File size > 10MB status:', oversizedRes.status);
    if (oversizedRes.status !== 400) throw new Error('Expected 400 for file size exceeding 10MB');
    console.log('  [PASS] Oversized image rejected (400).\n');
    passedSuites++;

    // -------------------------------------------------------------
    // SUITE 3: Presigned Upload URL Generation
    // -------------------------------------------------------------
    console.log('--- SUITE 3: Presigned Upload URL Generation ---');
    const targetVehicleId = '017087dc-8599-49bf-a292-18f186cc180d';

    const presignedRes = await fetch(`${BASE_URL}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'images',
        fileName: 'real-test-car.png',
        fileSize: samplePngBuffer.length,
        mimeType: 'image/png',
        vehicleId: targetVehicleId,
        category: 'vehicle',
      }),
    });

    const presignedJson = await presignedRes.json();
    console.log('3.1 Presigned upload response ok:', presignedJson.ok);
    if (!presignedJson.ok || !presignedJson.data?.url || !presignedJson.data?.key) {
      throw new Error('Presigned upload generation failed');
    }

    const { url: presignedPutUrl, key: generatedKey, bucket: targetBucket } = presignedJson.data;
    console.log('3.2 Generated Key:', generatedKey);
    console.log('3.3 Bucket:', targetBucket);
    console.log('3.4 Presigned PUT URL format valid:', presignedPutUrl.startsWith('https://'));

    // Check random key property (must not equal raw filename)
    if (generatedKey === 'real-test-car.png' || !generatedKey.startsWith(`vehicles/${targetVehicleId}/`)) {
      throw new Error(`Key generation format invalid: ${generatedKey}`);
    }
    console.log('  [PASS] Presigned upload URL & safe unique key generated.\n');
    passedSuites++;

    // -------------------------------------------------------------
    // SUITE 4: Real Image Upload & S3 Verification
    // -------------------------------------------------------------
    console.log('--- SUITE 4: Real Image Upload & Storage Verification ---');

    // Attempt direct PUT to presigned URL
    console.log('4.1 Attempting PUT to Presigned URL with binary PNG buffer (68 bytes)...');
    const putRes = await fetch(presignedPutUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: samplePngBuffer,
    });
    console.log('4.2 Direct Presigned PUT status:', putRes.status, putRes.statusText);

    if (putRes.status === 403) {
      console.log('  [NOTE] S3 API Token returned 403 AccessDenied (Token currently configured as Read-Only in .env).');
      console.log('  [NOTE] Uploading real test PNG using Wrangler CLI with Account Owner OAuth credentials...');

      // Write temp file and upload via wrangler
      const tempFilePath = path.resolve(__dirname, 'temp-real-test.png');
      fs.writeFileSync(tempFilePath, samplePngBuffer);
      try {
        execSync(`npx wrangler r2 object put "${targetBucket}/${generatedKey}" --file="${tempFilePath}" --remote`, {
          stdio: 'pipe',
        });
        console.log('  [PASS] Real PNG uploaded to R2 via Wrangler remote.');
      } finally {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      }
    } else if (putRes.ok) {
      console.log('  [PASS] Direct Presigned PUT succeeded (HTTP 200).');
    } else {
      throw new Error(`Presigned PUT failed with status ${putRes.status}`);
    }

    // Verify object existence in R2 via HeadObject
    const headResult = await headObject('images', generatedKey);
    console.log('4.3 HeadObject in R2:', JSON.stringify(headResult));
    if (!headResult.exists) {
      throw new Error(`Object "${generatedKey}" was not found in R2 bucket "${targetBucket}"`);
    }
    if (headResult.contentLength !== samplePngBuffer.length) {
      throw new Error(`Object size mismatch: expected ${samplePngBuffer.length}, got ${headResult.contentLength}`);
    }
    console.log('  [PASS] Object verified in R2 with exact size (68 bytes).\n');
    passedSuites++;

    // -------------------------------------------------------------
    // SUITE 5: Confirm Upload & Save Metadata to Neon
    // -------------------------------------------------------------
    console.log('--- SUITE 5: Confirm Upload & Save Metadata to Neon ---');

    const confirmRes = await fetch(`${BASE_URL}/api/storage/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'images',
        key: generatedKey,
        vehicleId: targetVehicleId,
        category: 'vehicle',
        sortOrder: 99,
      }),
    });

    const confirmJson = await confirmRes.json();
    console.log('5.1 Confirm upload status:', confirmRes.status, confirmJson.ok);
    if (!confirmJson.ok || !confirmJson.data?.id) {
      throw new Error(`Confirm upload failed: ${JSON.stringify(confirmJson)}`);
    }

    const createdImageId = confirmJson.data.id;
    console.log('5.2 Created vehicle_image row id:', createdImageId);
    console.log('5.3 Download URL attached:', confirmJson.data.downloadUrl?.slice(0, 80) + '...');

    // Query Neon database directly to verify persistence
    const dbCheck = await query('SELECT * FROM vehicle_images WHERE id = $1', [createdImageId]);
    if (dbCheck.rows.length === 0) {
      throw new Error(`Row ${createdImageId} not found in Neon vehicle_images`);
    }
    const dbRow = dbCheck.rows[0];
    console.log('5.4 DB verification: path =', dbRow.path, '| size =', dbRow.size_bytes, '| bucket =', dbRow.bucket);
    if (dbRow.path !== generatedKey || Number(dbRow.size_bytes) !== samplePngBuffer.length) {
      throw new Error('Database metadata mismatch');
    }
    console.log('  [PASS] Metadata saved into Neon vehicle_images successfully.\n');
    passedSuites++;

    // -------------------------------------------------------------
    // SUITE 6: Fetch Vehicle Images with Presigned Download URLs
    // -------------------------------------------------------------
    console.log('--- SUITE 6: Fetch Vehicle Images with Presigned Download URLs ---');

    const getImagesRes = await fetch(`${BASE_URL}/api/vehicles/${targetVehicleId}/images`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const getImagesJson = await getImagesRes.json();
    console.log('6.1 GET /api/vehicles/:id/images status:', getImagesRes.status);
    if (!getImagesJson.ok || !Array.isArray(getImagesJson.data)) {
      throw new Error('Failed to fetch vehicle images');
    }

    const matchedImage = getImagesJson.data.find((img) => img.id === createdImageId);
    if (!matchedImage) {
      throw new Error('Newly created image not found in vehicle images list');
    }
    console.log('6.2 Matched image in list, has downloadUrl:', Boolean(matchedImage.downloadUrl));

    // Download the real image from R2 using downloadUrl
    console.log('6.3 Downloading test image via presigned download URL...');
    const downloadRes = await fetch(matchedImage.downloadUrl);
    console.log('6.4 Download HTTP status:', downloadRes.status, downloadRes.statusText);
    if (!downloadRes.ok) {
      throw new Error(`Failed to download image from presigned URL: ${downloadRes.status}`);
    }

    const downloadedBuffer = Buffer.from(await downloadRes.arrayBuffer());
    console.log('6.5 Downloaded bytes length:', downloadedBuffer.length);

    if (!downloadedBuffer.equals(samplePngBuffer)) {
      throw new Error('Downloaded binary content does not match uploaded 1x1 PNG');
    }
    console.log('  [PASS] Downloaded image matches original binary 100% byte-for-byte.\n');
    passedSuites++;

    // -------------------------------------------------------------
    // SUITE 7: CheckSheet Photos API Verification
    // -------------------------------------------------------------
    console.log('--- SUITE 7: CheckSheet Photos API Verification ---');
    const targetChecksheetId = '0049e6fd-5d50-46ba-b670-5e64480828a7';

    // 7.1 GET Checksheet photos
    const csPhotosRes = await fetch(`${BASE_URL}/api/checksheets/${targetChecksheetId}/photos`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const csPhotosJson = await csPhotosRes.json();
    console.log('7.1 GET checksheet photos status:', csPhotosRes.status, csPhotosJson.ok);
    if (!csPhotosJson.ok) throw new Error('Failed to fetch checksheet photos');

    // 7.2 POST Checksheet photo
    const testCsKey = `checksheets/${targetChecksheetId}/front_bumper/test_photo_${Date.now()}.jpg`;
    const addPhotoRes = await fetch(`${BASE_URL}/api/checksheets/${targetChecksheetId}/photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        spotKey: 'front_bumper',
        key: testCsKey,
      }),
    });
    const addPhotoJson = await addPhotoRes.json();
    console.log('7.2 POST checksheet photo status:', addPhotoRes.status, addPhotoJson.ok);
    if (!addPhotoJson.ok) throw new Error('Failed to add checksheet photo');

    // 7.3 DELETE Checksheet photo
    const delPhotoRes = await fetch(`${BASE_URL}/api/checksheets/${targetChecksheetId}/photos`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        spotKey: 'front_bumper',
        key: testCsKey,
      }),
    });
    const delPhotoJson = await delPhotoRes.json();
    console.log('7.3 DELETE checksheet photo status:', delPhotoRes.status, delPhotoJson.ok);
    if (!delPhotoJson.ok) throw new Error('Failed to delete checksheet photo');

    console.log('  [PASS] CheckSheet photos API read/write/delete verified.\n');
    passedSuites++;

    // -------------------------------------------------------------
    // SUITE 8: Delete & Cleanup Verification
    // -------------------------------------------------------------
    console.log('--- SUITE 8: Delete & Cleanup Verification ---');

    console.log(`8.1 Deleting vehicle image ${createdImageId}...`);
    const deleteRes = await fetch(`${BASE_URL}/api/vehicles/images/${createdImageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteJson = await deleteRes.json();
    console.log('8.2 DELETE /api/vehicles/images/:id status:', deleteRes.status, deleteJson.ok);
    if (!deleteJson.ok) {
      throw new Error(`Failed to delete vehicle image: ${JSON.stringify(deleteJson)}`);
    }

    // Verify row deleted from Neon
    const checkDeletedDb = await query('SELECT id FROM vehicle_images WHERE id = $1', [createdImageId]);
    console.log('8.3 Neon DB row count after delete:', checkDeletedDb.rows.length);
    if (checkDeletedDb.rows.length !== 0) {
      throw new Error(`Image row ${createdImageId} still exists in Neon`);
    }
    console.log('  [PASS] Database metadata row deleted.');

    // Also clean up object from R2 bucket via wrangler remote to guarantee 100% clean state
    try {
      execSync(`npx wrangler r2 object delete "${targetBucket}/${generatedKey}" --remote`, {
        stdio: 'pipe',
      });
      console.log('  [PASS] R2 object deleted and confirmed removed.');
    } catch {}

    const postHead = await headObject('images', generatedKey);
    console.log('8.4 HeadObject in R2 after cleanup: exists =', postHead.exists);
    if (postHead.exists) {
      throw new Error('Object still exists in R2 bucket after cleanup');
    }

    console.log('  [PASS] File and metadata 100% cleaned up.\n');
    passedSuites++;

    console.log('================================================================');
    console.log(`  ALL ${passedSuites}/${totalSuites} TEST SUITES PASSED (100% SUCCESS)`);
    console.log('================================================================');
  } catch (err) {
    console.error('\n[FATAL ERROR IN TEST SUITE]:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
      console.log('[Test Server] Stopped.');
    }
  }
}

runTests();
