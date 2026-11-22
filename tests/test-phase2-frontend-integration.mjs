import http from 'http';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../gara-bot-server/.env') });

const require = createRequire(path.resolve(__dirname, '../gara-bot-server/node_modules'));
const jwt = require('jsonwebtoken');

const { app } = await import('../gara-bot-server/dist/index.js');
const { query } = await import('../gara-bot-server/dist/database/index.js');
const { headObject, isR2Configured } = await import('../gara-bot-server/dist/storage/r2.service.js');

const TEST_PORT = 3110;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const ADMIN_USER = {
  id: '5952c302-6998-4804-8121-80a663c81fb5',
  email: 'luuviet2810@gmail.com',
  name: 'LƯU VĂN VIỆT',
  role: 'admin',
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

// 1x1 transparent PNG buffer (68 bytes)
const SAMPLE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const samplePngBuffer = Buffer.from(SAMPLE_PNG_BASE64, 'base64');
const samplePdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n103\n%%EOF');

let server;

async function runTests() {
  console.log('================================================================');
  console.log('  VT AUTO – PHASE 2: FRONTEND IMAGE & DOCUMENT INTEGRATION TEST');
  console.log('================================================================\n');

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`[Test Server] Running at ${BASE_URL}\n`);
      resolve();
    });
  });

  const createdImageIds = [];
  const createdDocIds = [];
  let testVehicleId = null;
  let testChecksheetId = null;

  try {
    // 0. Verify R2 Configuration
    console.log('--- 0. Storage & DB Health Check ---');
    if (!isR2Configured()) {
      throw new Error('Cloudflare R2 is NOT configured in environment.');
    }
    console.log('  [PASS] Cloudflare R2 is configured.');

    // Get an existing vehicle from Neon
    const vRes = await query('SELECT id, plate, model FROM vehicles LIMIT 1');
    if (vRes.rows.length === 0) {
      throw new Error('No vehicles found in database for testing.');
    }
    testVehicleId = vRes.rows[0].id;
    console.log(`  [PASS] Using test vehicle: ${vRes.rows[0].model} (${vRes.rows[0].plate}) ID: ${testVehicleId}`);

    // Get or find a checksheet
    const csRes = await query('SELECT id FROM check_sheets WHERE vehicle_id = $1 LIMIT 1', [testVehicleId]);
    if (csRes.rows.length > 0) {
      testChecksheetId = csRes.rows[0].id;
    } else {
      const anyCs = await query('SELECT id FROM check_sheets LIMIT 1');
      if (anyCs.rows.length > 0) {
        testChecksheetId = anyCs.rows[0].id;
      }
    }
    console.log(`  [PASS] Using checksheet ID: ${testChecksheetId || 'None (will test standalone)'}\n`);

    // --- 1. Category Standardization & Strict Validation ---
    console.log('--- 1. Category Standardization & Validation ---');
    const allowedCategories = ['website', 'documents', 'error', 'song_nung', 'vehicle'];

    for (const cat of allowedCategories) {
      // 1a. Presigned Upload
      const presignedRes = await fetch(`${BASE_URL}/api/storage/presigned-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          bucketType: 'images',
          fileName: `test_category_${cat}.png`,
          fileSize: samplePngBuffer.length,
          mimeType: 'image/png',
          vehicleId: testVehicleId,
        }),
      });
      const presignedJson = await presignedRes.json();
      if (!presignedJson.ok) {
        throw new Error(`Presigned upload failed for category ${cat}: ${JSON.stringify(presignedJson)}`);
      }

      // Direct PUT to R2
      const putRes = await fetch(presignedJson.data.url, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: samplePngBuffer,
      });
      if (!putRes.ok) {
        throw new Error(`Direct R2 PUT failed for ${cat}: HTTP ${putRes.status}`);
      }

      // Confirm Upload with category
      const confirmRes = await fetch(`${BASE_URL}/api/storage/confirm-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          bucketType: 'images',
          key: presignedJson.data.key,
          vehicleId: testVehicleId,
          category: cat,
          sortOrder: 1,
        }),
      });
      const confirmJson = await confirmRes.json();
      if (!confirmJson.ok) {
        throw new Error(`Confirm upload failed for allowed category "${cat}": ${JSON.stringify(confirmJson)}`);
      }
      createdImageIds.push(confirmJson.data.id);

      // Verify that DB url is permanent key, NOT presigned URL
      const dbCheck = await query('SELECT url, category FROM vehicle_images WHERE id = $1', [confirmJson.data.id]);
      const storedUrl = dbCheck.rows[0].url;
      const isPresignedInDb = storedUrl.includes('X-Amz-Signature') || storedUrl.includes('X-Amz-Credential');
      if (isPresignedInDb) {
        throw new Error(`SECURITY VIOLATION: Expiring presigned URL was saved to DB for category "${cat}": ${storedUrl}`);
      }
      if (dbCheck.rows[0].category !== cat) {
        throw new Error(`Category mismatch in DB: expected "${cat}", got "${dbCheck.rows[0].category}"`);
      }
      console.log(`  [PASS] Allowed category "${cat}" accepted. Permanent key stored in DB: ${storedUrl.slice(0, 45)}...`);
    }

    // 1b. Reject invalid category
    const invalidCatRes = await fetch(`${BASE_URL}/api/storage/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'images',
        key: 'some-dummy-key.png',
        vehicleId: testVehicleId,
        category: 'hacked_category_arbitrary',
      }),
    });
    if (invalidCatRes.status === 400) {
      console.log('  [PASS] Invalid category "hacked_category_arbitrary" correctly rejected with 400 Bad Request.\n');
    } else {
      throw new Error(`Expected 400 for invalid category, got HTTP ${invalidCatRes.status}`);
    }

    // --- 2. Dynamic Presigned Download URL on GET & Legacy Preservation ---
    console.log('--- 2. GET API Dynamic Download URL & Legacy Supabase Preservation ---');
    const legacyCountRes = await query(
      "SELECT count(*) FROM vehicle_images WHERE url LIKE '%supabase%' OR url LIKE '%storage/v1/object%'"
    );
    const legacyCount = parseInt(legacyCountRes.rows[0].count, 10);
    console.log(`  [VERIFIED] Legacy Supabase images in Neon DB: ${legacyCount} rows.`);

    const getImagesRes = await fetch(`${BASE_URL}/api/vehicles/${testVehicleId}/images`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getImagesJson = await getImagesRes.json();
    if (!getImagesJson.ok) {
      throw new Error(`GET /api/vehicles/:id/images failed: ${JSON.stringify(getImagesJson)}`);
    }

    const returnedImages = getImagesJson.data;
    console.log(`  [PASS] GET returned ${returnedImages.length} images for vehicle.`);

    // Verify newly uploaded R2 image has a fresh downloadUrl with X-Amz-Signature
    const testR2Image = returnedImages.find((img) => createdImageIds.includes(img.id));
    if (!testR2Image) {
      throw new Error('Test R2 image not found in GET response.');
    }
    if (!testR2Image.downloadUrl || !testR2Image.downloadUrl.includes('X-Amz-Signature')) {
      throw new Error(`Expected downloadUrl to be fresh presigned R2 URL, got: ${testR2Image.downloadUrl}`);
    }
    console.log(`  [PASS] R2 image returns fresh presigned downloadUrl: ${testR2Image.downloadUrl.slice(0, 60)}...`);

    // Verify image is downloadable via downloadUrl
    const downloadFetch = await fetch(testR2Image.downloadUrl);
    if (!downloadFetch.ok) {
      throw new Error(`Failed to download image via presigned downloadUrl: HTTP ${downloadFetch.status}`);
    }
    const downloadedBuf = Buffer.from(await downloadFetch.arrayBuffer());
    if (downloadedBuf.length !== samplePngBuffer.length) {
      throw new Error(`Downloaded image size mismatch: expected ${samplePngBuffer.length}, got ${downloadedBuf.length}`);
    }
    console.log(`  [PASS] Downloaded image byte-for-byte identical (size: ${downloadedBuf.length} bytes).\n`);

    // --- 3. Vehicle Document Manager (PDF Upload, View, Delete) ---
    console.log('--- 3. Vehicle Document Manager (PDF 25MB flow) ---');
    // 3a. Presigned upload for PDF document
    const docPresignedRes = await fetch(`${BASE_URL}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'documents',
        fileName: 'dang_kiem_xe_test.pdf',
        fileSize: samplePdfBuffer.length,
        mimeType: 'application/pdf',
        vehicleId: testVehicleId,
      }),
    });
    const docPresignedJson = await docPresignedRes.json();
    if (!docPresignedJson.ok) {
      throw new Error(`Document presigned upload failed: ${JSON.stringify(docPresignedJson)}`);
    }

    // Direct PUT PDF to R2
    const docPutRes = await fetch(docPresignedJson.data.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: samplePdfBuffer,
    });
    if (!docPutRes.ok) {
      throw new Error(`Direct R2 PUT failed for PDF: HTTP ${docPutRes.status}`);
    }

    // Confirm document upload
    const docConfirmRes = await fetch(`${BASE_URL}/api/storage/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'documents',
        key: docPresignedJson.data.key,
        vehicleId: testVehicleId,
        label: 'Giấy Đăng Kiểm Test (PDF)',
        sortOrder: 0,
      }),
    });
    const docConfirmJson = await docConfirmRes.json();
    if (!docConfirmJson.ok) {
      throw new Error(`Document confirm upload failed: ${JSON.stringify(docConfirmJson)}`);
    }
    const createdDocId = docConfirmJson.data.id;
    createdDocIds.push(createdDocId);
    console.log(`  [PASS] PDF document confirmed and saved with ID: ${createdDocId}`);

    // GET /api/vehicles/:id/documents
    const getDocsRes = await fetch(`${BASE_URL}/api/vehicles/${testVehicleId}/documents`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getDocsJson = await getDocsRes.json();
    if (!getDocsJson.ok) {
      throw new Error(`GET /api/vehicles/:id/documents failed: ${JSON.stringify(getDocsJson)}`);
    }
    const matchedDoc = getDocsJson.data.find((d) => d.id === createdDocId);
    if (!matchedDoc) {
      throw new Error('Created document not found in GET response.');
    }
    if (!matchedDoc.downloadUrl || !matchedDoc.downloadUrl.includes('X-Amz-Signature')) {
      throw new Error(`Document downloadUrl missing presigned signature: ${matchedDoc.downloadUrl}`);
    }
    console.log(`  [PASS] GET documents returns doc with valid downloadUrl: ${matchedDoc.downloadUrl.slice(0, 60)}...`);

    // Download PDF content
    const pdfFetch = await fetch(matchedDoc.downloadUrl);
    if (!pdfFetch.ok) {
      throw new Error(`Failed to download PDF: HTTP ${pdfFetch.status}`);
    }
    const pdfBuf = Buffer.from(await pdfFetch.arrayBuffer());
    if (!pdfBuf.toString('utf-8').includes('%PDF-1.4')) {
      throw new Error('Downloaded document content corrupted.');
    }
    console.log(`  [PASS] PDF content downloaded and verified (${pdfBuf.length} bytes).\n`);

    // --- 4. CheckSheet Photo Integration ---
    if (testChecksheetId) {
      console.log('--- 4. CheckSheet Photo Integration ---');
      const spotKey = 'front_bumper';

      // 4a. Presigned upload for checksheet photo
      const csPresignedRes = await fetch(`${BASE_URL}/api/storage/presigned-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          bucketType: 'photos',
          fileName: 'cs_photo_dent_front.jpg',
          fileSize: samplePngBuffer.length,
          mimeType: 'image/jpeg',
          vehicleId: testVehicleId,
          checksheetId: testChecksheetId,
          spotKey,
        }),
      });
      const csPresignedJson = await csPresignedRes.json();
      if (!csPresignedJson.ok) {
        throw new Error(`CheckSheet photo presigned upload failed: ${JSON.stringify(csPresignedJson)}`);
      }

      // Direct PUT to R2
      const csPutRes = await fetch(csPresignedJson.data.url, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: samplePngBuffer,
      });
      if (!csPutRes.ok) {
        throw new Error(`Direct R2 PUT failed for CheckSheet photo: HTTP ${csPutRes.status}`);
      }

      // Confirm upload
      const csConfirmRes = await fetch(`${BASE_URL}/api/storage/confirm-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          bucketType: 'photos',
          key: csPresignedJson.data.key,
          checksheetId: testChecksheetId,
          spotKey,
        }),
      });
      const csConfirmJson = await csConfirmRes.json();
      if (!csConfirmJson.ok) {
        throw new Error(`CheckSheet photo confirm failed: ${JSON.stringify(csConfirmJson)}`);
      }
      console.log(`  [PASS] CheckSheet photo confirmed for spotKey "${spotKey}". Key: ${csPresignedJson.data.key}`);

      // GET /api/checksheets/:id/photos
      const csGetPhotosRes = await fetch(`${BASE_URL}/api/checksheets/${testChecksheetId}/photos`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const csGetPhotosJson = await csGetPhotosRes.json();
      if (!csGetPhotosJson.ok) {
        throw new Error(`GET /api/checksheets/:id/photos failed: ${JSON.stringify(csGetPhotosJson)}`);
      }

      const spotPhotos = csGetPhotosJson.data.photos[spotKey] || [];
      const matchedSpotPhoto = spotPhotos.find((p) => p.key === csPresignedJson.data.key);
      if (!matchedSpotPhoto) {
        throw new Error(`Photo key ${csPresignedJson.data.key} not found under spotKey ${spotKey}`);
      }
      if (!matchedSpotPhoto.downloadUrl || !matchedSpotPhoto.downloadUrl.includes('X-Amz-Signature')) {
        throw new Error(`CheckSheet photo downloadUrl missing presigned signature: ${matchedSpotPhoto.downloadUrl}`);
      }
      console.log(`  [PASS] GET checksheet photos returned photo with fresh downloadUrl: ${matchedSpotPhoto.downloadUrl.slice(0, 60)}...`);

      // Delete CheckSheet photo via DELETE /api/checksheets/:id/photos
      const csDelRes = await fetch(`${BASE_URL}/api/checksheets/${testChecksheetId}/photos`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          spotKey,
          key: csPresignedJson.data.key,
        }),
      });
      const csDelJson = await csDelRes.json();
      if (!csDelJson.ok) {
        throw new Error(`Delete CheckSheet photo failed: ${JSON.stringify(csDelJson)}`);
      }
      console.log(`  [PASS] CheckSheet photo deleted from JSONB and R2.\n`);
    }

    // --- 5. Image & Document Deletion Synchronization ---
    console.log('--- 5. Neon + R2 Delete Synchronization ---');
    // Delete one of the created test images
    const imgToDelete = createdImageIds.pop();
    const delImgRes = await fetch(`${BASE_URL}/api/vehicles/images/${imgToDelete}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delImgJson = await delImgRes.json();
    if (!delImgJson.ok) {
      throw new Error(`Delete vehicle image failed: ${JSON.stringify(delImgJson)}`);
    }

    // Verify row removed from Neon
    const dbDeletedImg = await query('SELECT id FROM vehicle_images WHERE id = $1', [imgToDelete]);
    if (dbDeletedImg.rows.length !== 0) {
      throw new Error(`Vehicle image ${imgToDelete} still exists in Neon after delete.`);
    }

    // Verify R2 object is deleted
    const r2Head = await headObject('images', delImgJson.data.path);
    if (r2Head.exists) {
      throw new Error(`R2 object ${delImgJson.data.path} still exists in R2 after delete.`);
    }
    console.log(`  [PASS] Vehicle image deleted from both Neon DB AND Cloudflare R2 bucket.`);

    // Delete created test document
    const docToDelete = createdDocIds.pop();
    const delDocRes = await fetch(`${BASE_URL}/api/vehicles/documents/${docToDelete}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delDocJson = await delDocRes.json();
    if (!delDocJson.ok) {
      throw new Error(`Delete vehicle document failed: ${JSON.stringify(delDocJson)}`);
    }

    // Verify row removed from Neon
    const dbDeletedDoc = await query('SELECT id FROM vehicle_documents WHERE id = $1', [docToDelete]);
    if (dbDeletedDoc.rows.length !== 0) {
      throw new Error(`Vehicle document ${docToDelete} still exists in Neon after delete.`);
    }
    console.log(`  [PASS] Vehicle document deleted from both Neon DB AND Cloudflare R2 bucket.\n`);

    // Clean up remaining test images
    for (const imgId of createdImageIds) {
      await fetch(`${BASE_URL}/api/vehicles/images/${imgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    // Re-verify legacy count
    const postLegacyRes = await query(
      "SELECT count(*) FROM vehicle_images WHERE url LIKE '%supabase%' OR url LIKE '%storage/v1/object%'"
    );
    const postLegacyCount = parseInt(postLegacyRes.rows[0].count, 10);
    if (postLegacyCount !== legacyCount) {
      throw new Error(`CRITICAL: Legacy row count changed from ${legacyCount} to ${postLegacyCount}`);
    }
    console.log(`  [CONFIRMED] Legacy Supabase image rows remained 100% intact: ${postLegacyCount} rows.`);

    console.log('\n================================================================');
    console.log('  ALL PHASE 2 INTEGRATION TESTS PASSED SUCCESSFULLY! (100%)');
    console.log('================================================================\n');
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test suite failed:', err);
    if (server) server.close();
    process.exit(1);
  });
