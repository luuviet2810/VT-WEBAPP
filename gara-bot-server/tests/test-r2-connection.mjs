import path from 'path';
import dotenv from 'dotenv';
import { S3Client, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

const accountId = process.env.R2_ACCOUNT_ID || '80e789d50d0c2f3b097ab46200987613';
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

console.log('=== CLOUDFLARE R2 CONNECTION TEST (READ-ONLY) ===\n');

if (!accessKeyId || !secretAccessKey) {
  console.error('ERROR: R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY is missing.');
  process.exit(1);
}

// Log status without printing secrets
console.log('1. Credentials Check:');
console.log('   R2_ACCESS_KEY_ID: Present (length: ' + accessKeyId.length + ')');
console.log('   R2_SECRET_ACCESS_KEY: Present (length: ' + secretAccessKey.length + ')');
console.log('   Endpoint:', endpoint);

const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

const buckets = [
  { name: 'vehicle-images', purpose: 'Ảnh xe (ngoại thất, nội thất, website)' },
  { name: 'vehicle-documents', purpose: 'Hồ sơ, giấy tờ đăng kiểm xe' },
  { name: 'checksheet-photos', purpose: 'Ảnh phiếu kiểm tra xe (hư hại chi tiết)' },
];

async function run() {
  console.log('\n2. Testing Bucket Accessibility (HeadBucket & ListObjectsV2 MaxKeys=1):');

  let allOk = true;

  for (const b of buckets) {
    try {
      // Test 1: HeadBucket (verifies bucket existence and permissions)
      await client.send(new HeadBucketCommand({ Bucket: b.name }));

      // Test 2: ListObjectsV2 (verifies object read permission without writing anything)
      const listRes = await client.send(new ListObjectsV2Command({ Bucket: b.name, MaxKeys: 1 }));
      const objectCount = listRes.KeyCount ?? 0;

      console.log(`   [OK] Bucket "${b.name}": Accessible & Authorized.`);
      console.log(`        Purpose: ${b.purpose}`);
      console.log(`        Current objects count returned: ${objectCount}`);
    } catch (err) {
      allOk = false;
      console.error(`   [FAIL] Bucket "${b.name}": ${err.message}`);
      if (err.$metadata) {
        console.error(`          HTTP Status: ${err.$metadata.httpStatusCode}`);
      }
    }
  }

  console.log('\n========================================');
  if (allOk) {
    console.log('R2 STATUS: ALL 3 BUCKETS FULLY ACCESSIBLE!');
    console.log('Read and Head permissions verified successfully.');
    console.log('No files were modified, created, or deleted.');
  } else {
    console.log('R2 STATUS: SOME BUCKETS FAILED TO RESPOND.');
  }
  console.log('========================================\n');
}

run().catch(err => {
  console.error('Unexpected test error:', err.message);
  process.exit(1);
});
