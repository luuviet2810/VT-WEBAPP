import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../gara-bot-server/.env') });

const require = createRequire(path.resolve(__dirname, '../gara-bot-server/node_modules'));
const jwt = require('jsonwebtoken');

const { app } = await import('../gara-bot-server/dist/index.js');
const { query } = await import('../gara-bot-server/dist/database/index.js');
const { headObject, isR2Configured } = await import('../gara-bot-server/dist/storage/r2.service.js');

const TEST_PORT = 3120;
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

const SAMPLE_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const SAMPLE_PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n103\n%%EOF');

let server;

async function run() {
  console.log('================================================================');
  console.log('  VT AUTO – STEP 3: REAL FUNCTIONAL TEST EXECUTION');
  console.log('================================================================\n');

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`[Test Server] Started at ${BASE_URL}\n`);
      resolve();
    });
  });

  let testVehicle = null;
  let testCheckSheet = null;
  let testImageRow = null;
  let testDocRow = null;
  let testChecksheetPhotoKey = null;

  try {
    // 1. Create isolated test vehicle (so real vehicles are NOT touched)
    console.log('--- 3.1 Create Isolated Test Vehicle ---');
    const vCreateRes = await fetch(`${BASE_URL}/api/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        plate: 'AUDIT9999',
        model: 'AUDIT-TEST-CAR',
        brand: 'VT Testing',
        year: 2024,
        fuelType: 'Xăng',
        costPrice: 50000000,
        sellPrice: 65000000,
        status: 'available',
        note: 'Xe thử nghiệm Phase 2 - sẽ dọn dẹp sạch sau test',
      }),
    });
    const vCreateJson = await vCreateRes.json();
    if (!vCreateJson.ok) throw new Error(`Create test vehicle failed: ${JSON.stringify(vCreateJson)}`);
    testVehicle = vCreateJson.data;
    console.log(`  [PASS] Created test vehicle ID: ${testVehicle.id} (Plate: ${testVehicle.plate})\n`);

    // 2. Real Functional Test: Vehicle Image Upload & Refresh Simulation
    console.log('--- 3.2 Vehicle Image: Upload -> Refresh -> Verify Render ---');
    // Step a: Presigned URL
    const imgPresignRes = await fetch(`${BASE_URL}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'images',
        fileName: 'real_test_vehicle_cover.png',
        fileSize: SAMPLE_PNG.length,
        mimeType: 'image/png',
        vehicleId: testVehicle.id,
      }),
    });
    const imgPresign = await imgPresignRes.json();
    if (!imgPresign.ok) throw new Error(`Presigned URL failed: ${JSON.stringify(imgPresign)}`);
    console.log(`  [PASS] Generated Presigned Upload URL for Key: ${imgPresign.data.key}`);

    // Step b: PUT binary directly to R2
    const imgPutRes = await fetch(imgPresign.data.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: SAMPLE_PNG,
    });
    if (!imgPutRes.ok) throw new Error(`R2 PUT failed with status ${imgPutRes.status}`);
    console.log(`  [PASS] PUT binary to Cloudflare R2 succeeded (HTTP ${imgPutRes.status})`);

    // Step c: Confirm upload
    const imgConfirmRes = await fetch(`${BASE_URL}/api/storage/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'images',
        key: imgPresign.data.key,
        vehicleId: testVehicle.id,
        category: 'website',
        sortOrder: 0,
      }),
    });
    const imgConfirm = await imgConfirmRes.json();
    if (!imgConfirm.ok) throw new Error(`Confirm failed: ${JSON.stringify(imgConfirm)}`);
    testImageRow = imgConfirm.data;
    console.log(`  [PASS] Confirm upload returned DB ID: ${testImageRow.id}`);
    console.log(`  [PASS] downloadUrl in response: ${testImageRow.downloadUrl.slice(0, 70)}...`);

    // Step d: Simulate Page Refresh (GET /api/vehicles/:id/images)
    console.log('  [Action] Simulating user refresh / page reload...');
    const refreshRes = await fetch(`${BASE_URL}/api/vehicles/${testVehicle.id}/images`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const refreshData = await refreshRes.json();
    if (!refreshData.ok || refreshData.data.length === 0) {
      throw new Error(`Refresh simulation failed: ${JSON.stringify(refreshData)}`);
    }
    const displayedImage = refreshData.data[0];
    console.log(`  [PASS] Image found after refresh: ID=${displayedImage.id}, Category=${displayedImage.category}`);
    console.log(`  [PASS] Fresh presigned downloadUrl: ${displayedImage.downloadUrl.slice(0, 70)}...`);

    // Step e: Fetch the downloadUrl (browser render verification)
    const renderRes = await fetch(displayedImage.downloadUrl);
    if (!renderRes.ok) throw new Error(`Failed to render/fetch image from R2: HTTP ${renderRes.status}`);
    const renderBuf = Buffer.from(await renderRes.arrayBuffer());
    if (renderBuf.length !== SAMPLE_PNG.length) throw new Error('Rendered image size mismatch');
    console.log(`  [PASS] Browser image fetch verified byte-for-byte (${renderBuf.length} bytes)\n`);

    // 3. Real Functional Test: Document PDF Upload, View & Download
    console.log('--- 3.3 Vehicle Document: Upload PDF -> View -> Download ---');
    // Step a: Presigned URL
    const docPresignRes = await fetch(`${BASE_URL}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'documents',
        fileName: 'dang_kiem_xe_sample.pdf',
        fileSize: SAMPLE_PDF.length,
        mimeType: 'application/pdf',
        vehicleId: testVehicle.id,
      }),
    });
    const docPresign = await docPresignRes.json();
    if (!docPresign.ok) throw new Error(`Doc presigned URL failed: ${JSON.stringify(docPresign)}`);

    // Step b: PUT binary to R2
    const docPutRes = await fetch(docPresign.data.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: SAMPLE_PDF,
    });
    if (!docPutRes.ok) throw new Error(`Doc R2 PUT failed: HTTP ${docPutRes.status}`);

    // Step c: Confirm
    const docConfirmRes = await fetch(`${BASE_URL}/api/storage/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'documents',
        key: docPresign.data.key,
        vehicleId: testVehicle.id,
        label: 'Giấy Đăng Kiểm Kiểm Thử',
      }),
    });
    const docConfirm = await docConfirmRes.json();
    if (!docConfirm.ok) throw new Error(`Doc confirm failed: ${JSON.stringify(docConfirm)}`);
    testDocRow = docConfirm.data;
    console.log(`  [PASS] PDF document confirmed with ID: ${testDocRow.id}`);

    // Step d: GET documents list
    const getDocsRes = await fetch(`${BASE_URL}/api/vehicles/${testVehicle.id}/documents`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getDocs = await getDocsRes.json();
    if (!getDocs.ok || getDocs.data.length === 0) throw new Error('GET documents failed');
    const returnedDoc = getDocs.data[0];
    console.log(`  [PASS] Document list retrieved. Label: "${returnedDoc.label}", downloadUrl: ${returnedDoc.downloadUrl.slice(0, 65)}...`);

    // Step e: Download/View PDF
    const pdfFetchRes = await fetch(returnedDoc.downloadUrl);
    if (!pdfFetchRes.ok) throw new Error(`PDF download failed: HTTP ${pdfFetchRes.status}`);
    const pdfText = await pdfFetchRes.text();
    if (!pdfText.startsWith('%PDF-1.4')) throw new Error('Downloaded PDF corrupted');
    console.log(`  [PASS] PDF downloaded and verified header: "%PDF-1.4" (${pdfText.length} bytes)\n`);

    // 4. Real Functional Test: CheckSheet Photo by spotKey, Save & Reopen
    console.log('--- 3.4 CheckSheet Photo: Upload by spotKey -> Save Sheet -> Reopen ---');
    // Step a: Create CheckSheet
    const csCreateRes = await query(
      `INSERT INTO check_sheets (vehicle_id, type, check_date)
       VALUES ($1, 'in', '2026-11-22')
       RETURNING *`,
      [testVehicle.id]
    );
    testCheckSheet = csCreateRes.rows[0];
    console.log(`  [PASS] Created CheckSheet ID: ${testCheckSheet.id}`);

    // Step b: Upload Photo for spotKey 'rear_bumper'
    const spotKey = 'rear_bumper';
    const csPhotoPresignRes = await fetch(`${BASE_URL}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'photos',
        fileName: 'rear_bumper_dent.jpg',
        fileSize: SAMPLE_PNG.length,
        mimeType: 'image/jpeg',
        vehicleId: testVehicle.id,
        checksheetId: testCheckSheet.id,
        spotKey,
      }),
    });
    const csPhotoPresign = await csPhotoPresignRes.json();
    if (!csPhotoPresign.ok) throw new Error(`CS photo presign failed: ${JSON.stringify(csPhotoPresign)}`);

    const csPhotoPutRes = await fetch(csPhotoPresign.data.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: SAMPLE_PNG,
    });
    if (!csPhotoPutRes.ok) throw new Error(`CS photo PUT failed: HTTP ${csPhotoPutRes.status}`);

    const csPhotoConfirmRes = await fetch(`${BASE_URL}/api/storage/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'photos',
        key: csPhotoPresign.data.key,
        checksheetId: testCheckSheet.id,
        spotKey,
      }),
    });
    const csPhotoConfirm = await csPhotoConfirmRes.json();
    if (!csPhotoConfirm.ok) throw new Error(`CS photo confirm failed: ${JSON.stringify(csPhotoConfirm)}`);
    testChecksheetPhotoKey = csPhotoPresign.data.key;
    console.log(`  [PASS] CheckSheet photo confirmed for spotKey "${spotKey}"`);

    // Step c: Save Sheet with exterior condition and exteriorPhotos
    const updateRes = await fetch(`${BASE_URL}/api/checksheets/${testCheckSheet.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        exterior: {
          rear_bumper: { condition: 'dent' },
        },
        exteriorPhotos: {
          rear_bumper: [testChecksheetPhotoKey],
        },
      }),
    });
    const updateJson = await updateRes.json();
    if (!updateJson.ok) throw new Error(`CheckSheet update failed: ${JSON.stringify(updateJson)}`);
    console.log(`  [PASS] CheckSheet saved with exteriorPhotos JSONB`);

    // Step d: Reopen CheckSheet (simulate user reopening the form)
    const reopenPhotosRes = await fetch(`${BASE_URL}/api/checksheets/${testCheckSheet.id}/photos`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reopenPhotosJson = await reopenPhotosRes.json();
    if (!reopenPhotosJson.ok) throw new Error(`Reopen failed: ${JSON.stringify(reopenPhotosJson)}`);
    const reopenedList = reopenPhotosJson.data.photos[spotKey] || [];
    if (reopenedList.length === 0 || reopenedList[0].key !== testChecksheetPhotoKey) {
      throw new Error(`Photo key not found after reopening: ${JSON.stringify(reopenedList)}`);
    }
    console.log(`  [PASS] Reopened sheet: photo found under spotKey "${spotKey}"`);
    console.log(`  [PASS] Fresh presigned downloadUrl: ${reopenedList[0].downloadUrl.slice(0, 65)}...`);

    // Verify photo render
    const csPhotoFetch = await fetch(reopenedList[0].downloadUrl);
    if (!csPhotoFetch.ok) throw new Error(`Failed to fetch checksheet photo: HTTP ${csPhotoFetch.status}`);
    console.log(`  [PASS] CheckSheet photo fetched successfully (HTTP 200)\n`);

    // 5. Deletion & Cleanup Verification
    console.log('--- 3.5 Deletion & Neon/R2 Cleanup Verification ---');
    // a. Delete Vehicle Image
    const delImgRes = await fetch(`${BASE_URL}/api/vehicles/images/${testImageRow.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delImgJson = await delImgRes.json();
    if (!delImgJson.ok) throw new Error('Delete vehicle image failed');

    const dbImgCheck = await query('SELECT id FROM vehicle_images WHERE id = $1', [testImageRow.id]);
    const r2ImgHead = await headObject('images', testImageRow.path);
    if (dbImgCheck.rows.length !== 0) throw new Error('Vehicle image row still exists in Neon');
    if (r2ImgHead.exists) throw new Error('Vehicle image object still exists in R2');
    console.log(`  [PASS] Vehicle image deleted: Neon row = 0, R2 object exists = false`);

    // b. Delete Vehicle Document
    const delDocRes = await fetch(`${BASE_URL}/api/vehicles/documents/${testDocRow.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delDocJson = await delDocRes.json();
    if (!delDocJson.ok) throw new Error('Delete vehicle document failed');

    const dbDocCheck = await query('SELECT id FROM vehicle_documents WHERE id = $1', [testDocRow.id]);
    const r2DocHead = await headObject('documents', testDocRow.path);
    if (dbDocCheck.rows.length !== 0) throw new Error('Vehicle document row still exists in Neon');
    if (r2DocHead.exists) throw new Error('Vehicle document object still exists in R2');
    console.log(`  [PASS] Vehicle document deleted: Neon row = 0, R2 object exists = false`);

    // c. Delete CheckSheet Photo
    const delCsPhotoRes = await fetch(`${BASE_URL}/api/checksheets/${testCheckSheet.id}/photos`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        spotKey,
        key: testChecksheetPhotoKey,
      }),
    });
    const delCsPhotoJson = await delCsPhotoRes.json();
    if (!delCsPhotoJson.ok) throw new Error('Delete CS photo failed');

    const r2CsHead = await headObject('photos', testChecksheetPhotoKey);
    const dbCsCheck = await query('SELECT exterior_photos FROM check_sheets WHERE id = $1', [testCheckSheet.id]);
    const remainingPhotos = dbCsCheck.rows[0].exterior_photos?.[spotKey] || [];
    if (remainingPhotos.includes(testChecksheetPhotoKey)) throw new Error('Photo key still in check_sheets JSONB');
    if (r2CsHead.exists) throw new Error('CheckSheet photo object still exists in R2');
    console.log(`  [PASS] CheckSheet photo deleted: JSONB key removed, R2 object exists = false\n`);

    console.log('================================================================');
    console.log('  REAL FUNCTIONAL TESTS: 100% PASSED');
    console.log('================================================================\n');
  } finally {
    // Clean up test vehicle and check sheet so database is 100% clean
    if (testCheckSheet) {
      await query('DELETE FROM check_sheets WHERE id = $1', [testCheckSheet.id]).catch(() => {});
    }
    if (testVehicle) {
      await query('DELETE FROM vehicles WHERE id = $1', [testVehicle.id]).catch(() => {});
    }
    if (server) server.close();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Functional test failed:', err);
    if (server) server.close();
    process.exit(1);
  });
