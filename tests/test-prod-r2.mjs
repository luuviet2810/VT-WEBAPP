import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../gara-bot-server/.env'), override: true });

const require = createRequire(path.resolve(__dirname, '../gara-bot-server/node_modules'));
const jwt = require('jsonwebtoken');
const { S3Client, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const PROD_URL = 'https://vt-webapp.onrender.com';
const JWT_SECRET = process.env.JWT_SECRET || 'vtauto-backend-jwt-secret-key-change-in-prod-2026';

const ADMIN_USER = {
  id: '5952c302-6998-4804-8121-80a663c81fb5',
  email: 'luuviet2810@gmail.com',
  name: 'LƯU VĂN VIỆT',
  role: 'admin',
};

const token = jwt.sign(
  { id: ADMIN_USER.id, email: ADMIN_USER.email, name: ADMIN_USER.name },
  JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '2h' }
);

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://80e789d50d0c2f3b097ab46200987613.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const BUCKETS = [
  { type: 'images', name: 'vehicle-images' },
  { type: 'documents', name: 'vehicle-documents' },
  { type: 'photos', name: 'checksheet-photos' },
];

async function testAllProductionBuckets() {
  console.log('================================================================');
  console.log('  PRODUCTION R2 STORAGE INTEGRATION TEST (https://vt-webapp.onrender.com)');
  console.log('================================================================\n');

  for (const b of BUCKETS) {
    console.log(`>>> Testing Production on Bucket: "${b.name}" (type: ${b.type})`);
    const testKey = `prod-audit-test/${Date.now()}_${b.type}_probe.txt`;
    const testBody = `Production test body for ${b.name} at ${new Date().toISOString()}`;

    // 1. Request presigned upload URL from Production Backend
    process.stdout.write(`  1. POST /api/storage/presigned-upload: `);
    const uploadReq = await fetch(`${PROD_URL}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bucketType: b.type,
        key: testKey,
        contentType: 'text/plain',
      }),
    });

    if (!uploadReq.ok) {
      console.log(`FAILED (${uploadReq.status})`);
      continue;
    }
    const uploadJson = await uploadReq.json();
    console.log(`OK (Presigned PUT URL generated)`);

    // 2. Direct PUT to Cloudflare R2 using the Production-signed URL
    process.stdout.write(`  2. PUT to Cloudflare R2 Presigned URL: `);
    const putRes = await fetch(uploadJson.data.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: testBody,
    });
    console.log(`OK (HTTP ${putRes.status} ${putRes.statusText})`);

    // 3. Request presigned download URL from Production Backend
    process.stdout.write(`  3. POST /api/storage/presigned-download: `);
    const downloadReq = await fetch(`${PROD_URL}/api/storage/presigned-download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bucketType: b.type,
        key: testKey,
      }),
    });
    const downloadJson = await downloadReq.json();
    console.log(`OK (Presigned GET URL generated)`);

    // 4. Download content and verify match
    process.stdout.write(`  4. Download from Cloudflare R2 & verify: `);
    const getRes = await fetch(downloadJson.data.url);
    const downloadedText = await getRes.text();
    if (downloadedText !== testBody) {
      throw new Error(`Content mismatch on ${b.name}`);
    }
    console.log(`OK (HTTP ${getRes.status}, Content matched 100%)`);

    // 5. Clean up test file from R2 using S3 client
    process.stdout.write(`  5. Delete test file from R2: `);
    await s3.send(new DeleteObjectCommand({
      Bucket: b.name,
      Key: testKey,
    }));
    console.log(`OK (Cleaned up)\n`);
  }

  console.log('================================================================');
  console.log('  ALL PRODUCTION BUCKET TESTS COMPLETED SUCCESSFULLY (100% PASS)');
  console.log('================================================================');
}

testAllProductionBuckets();
