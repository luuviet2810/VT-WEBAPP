import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files with override
dotenv.config({ path: path.resolve(__dirname, '../gara-bot-server/.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const require = createRequire(path.resolve(__dirname, '../gara-bot-server/node_modules'));
const {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Verify credentials presence without printing them
const accessKey = process.env.R2_ACCESS_KEY_ID || '';
const secretKey = process.env.R2_SECRET_ACCESS_KEY || '';
const endpoint = process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : 'https://80e789d50d0c2f3b097ab46200987613.r2.cloudflarestorage.com');

console.log('================================================================');
console.log('  LOCAL S3 CREDENTIALS VERIFICATION ON CLOUDFLARE R2');
console.log('================================================================');
console.log('Access Key ID present:', Boolean(accessKey), '| Length:', accessKey.length, '| Prefix:', accessKey.slice(0, 6) + '...');
console.log('Secret Access Key present:', Boolean(secretKey), '| Length:', secretKey.length);
console.log('Endpoint:', endpoint);
console.log('----------------------------------------------------------------\n');

if (!accessKey || !secretKey) {
  console.error('FATAL: R2 credentials missing in environment.');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
  forcePathStyle: true,
});

const BUCKETS = [
  { name: 'vehicle-images', label: 'Vehicle Images Bucket' },
  { name: 'vehicle-documents', label: 'Vehicle Documents Bucket' },
  { name: 'checksheet-photos', label: 'CheckSheet Photos Bucket' },
];

async function testBucket(bucketName, label) {
  console.log(`>>> Testing Bucket: "${bucketName}" (${label})`);
  const testKey = `test-verify-credentials/${Date.now()}_probe.txt`;
  const expectedContent = `VT AUTO S3 Verification [${bucketName}] at ${new Date().toISOString()}`;

  // 1. HeadBucket
  process.stdout.write(`  1. HeadBucket (${bucketName}): `);
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log('OK (Bucket exists and reachable)');
  } catch (err) {
    console.log(`FAILED (${err.name}: ${err.message})`);
    return { success: false, bucket: bucketName, step: 'HeadBucket', error: err.message };
  }

  // 2. PutObject (Direct S3 Write)
  process.stdout.write(`  2. PutObject (Direct S3 Write): `);
  try {
    const putRes = await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: expectedContent,
      ContentType: 'text/plain',
      Metadata: { testby: 'vtauto-audit' },
    }));
    console.log(`OK (HTTP ${putRes.$metadata.httpStatusCode}, ETag: ${putRes.ETag})`);
  } catch (err) {
    console.log(`FAILED (${err.name}: ${err.message})`);
    return { success: false, bucket: bucketName, step: 'PutObject', error: err.message };
  }

  // 3. HeadObject
  process.stdout.write(`  3. HeadObject (Metadata verification): `);
  try {
    const headRes = await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: testKey }));
    if (headRes.ContentLength !== Buffer.byteLength(expectedContent)) {
      throw new Error(`Size mismatch: expected ${Buffer.byteLength(expectedContent)}, got ${headRes.ContentLength}`);
    }
    console.log(`OK (Size: ${headRes.ContentLength} bytes, Type: ${headRes.ContentType})`);
  } catch (err) {
    console.log(`FAILED (${err.name}: ${err.message})`);
    return { success: false, bucket: bucketName, step: 'HeadObject', error: err.message };
  }

  // 4. GetObject (Download & Content Check)
  process.stdout.write(`  4. GetObject (Read & Content match): `);
  try {
    const getRes = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: testKey }));
    const downloadedText = await getRes.Body.transformToString();
    if (downloadedText !== expectedContent) {
      throw new Error(`Content mismatch! Got: "${downloadedText}"`);
    }
    console.log('OK (Content matched 100%)');
  } catch (err) {
    console.log(`FAILED (${err.name}: ${err.message})`);
    return { success: false, bucket: bucketName, step: 'GetObject', error: err.message };
  }

  // 5. DeleteObject (Direct S3 Delete)
  process.stdout.write(`  5. DeleteObject (Clean up): `);
  try {
    const delRes = await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: testKey }));
    console.log(`OK (HTTP ${delRes.$metadata.httpStatusCode})`);
  } catch (err) {
    console.log(`FAILED (${err.name}: ${err.message})`);
    return { success: false, bucket: bucketName, step: 'DeleteObject', error: err.message };
  }

  // 6. Verify Deletion
  process.stdout.write(`  6. HeadObject post-delete (Confirm removed): `);
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: testKey }));
    console.log('FAILED (Object still exists!)');
    return { success: false, bucket: bucketName, step: 'VerifyDeletion', error: 'Object still exists' };
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      console.log('OK (Object confirmed 404 NotFound)');
    } else {
      console.log(`FAILED (${err.name}: ${err.message})`);
      return { success: false, bucket: bucketName, step: 'VerifyDeletion', error: err.message };
    }
  }

  // 7. Presigned PUT Upload Test (Client Direct Upload simulation)
  process.stdout.write(`  7. Presigned PUT Upload simulation: `);
  const presignedKey = `test-verify-credentials/${Date.now()}_presigned.txt`;
  try {
    const presignedPutUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucketName,
        Key: presignedKey,
        ContentType: 'text/plain',
      }),
      { expiresIn: 300 }
    );

    const putFetch = await fetch(presignedPutUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: 'VT AUTO presigned PUT upload test content',
    });

    if (!putFetch.ok) {
      const errText = await putFetch.text();
      throw new Error(`Presigned PUT failed with status ${putFetch.status}: ${errText}`);
    }
    console.log(`OK (HTTP ${putFetch.status})`);

    // Clean up presigned test object
    await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: presignedKey }));
    console.log(`  8. Clean up presigned test object: OK\n`);
  } catch (err) {
    console.log(`FAILED (${err.message})\n`);
    return { success: false, bucket: bucketName, step: 'PresignedPUT', error: err.message };
  }

  return { success: true, bucket: bucketName };
}

async function runAll() {
  const results = [];
  for (const b of BUCKETS) {
    const res = await testBucket(b.name, b.label);
    results.push(res);
  }

  console.log('================================================================');
  console.log('  SUMMARY OF RESULTS:');
  console.log('================================================================');
  let allOk = true;
  for (const r of results) {
    if (r.success) {
      console.log(`  🟢 Bucket "${r.bucket}": ALL OPERATIONS PASSED (Read, Write, Delete, Presigned PUT)`);
    } else {
      console.log(`  🔴 Bucket "${r.bucket}": FAILED at step ${r.step} (${r.error})`);
      allOk = false;
    }
  }
  console.log('================================================================\n');

  if (!allOk) {
    process.exit(1);
  }
}

runAll();
