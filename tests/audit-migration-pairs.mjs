import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
if (fs.existsSync('gara-bot-server/.env')) {
  dotenv.config({ path: 'gara-bot-server/.env' });
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const { headObject, generatePresignedDownloadUrl } = await import('../gara-bot-server/dist/storage/r2.service.js');

async function main() {
  const vId = '74cd5ba2-3c93-4148-9748-c3de2a10afa5';
  const res = await pool.query(`
    SELECT id, vehicle_id, path, thumbnail, url, bucket, size_bytes, mime_type, sort_order, created_at
    FROM vehicle_images
    WHERE vehicle_id = $1
    ORDER BY sort_order ASC, created_at ASC
  `, [vId]);

  const thumbRows = res.rows.filter(r => r.path && r.path.includes('_thumb_'));
  const origRows = res.rows.filter(r => !r.path || !r.path.includes('_thumb_'));

  console.log(`=== AUDIT 13 PAIRS FOR VEHICLE 0123 ===`);
  console.log(`Total rows: ${res.rows.length} (Thumb: ${thumbRows.length}, Orig: ${origRows.length})\n`);

  const auditPairs = [];

  for (const t of thumbRows) {
    // find matched orig
    const matchedOrig = origRows.find(o => o.thumbnail && o.thumbnail.includes(t.path));
    
    // Check if thumbnail exists on R2
    const thumbR2Check = await headObject('images', t.path);
    
    // Check if original exists on R2
    let origR2Check = { exists: false };
    if (matchedOrig && matchedOrig.path) {
      origR2Check = await headObject('images', matchedOrig.path);
    }

    // Check presigned download URL generation for thumbnail
    let presignedThumbResult = null;
    let fetchThumbStatus = null;
    try {
      const presigned = await generatePresignedDownloadUrl('images', t.path);
      presignedThumbResult = presigned.url;
      const resp = await fetch(presigned.url, { method: 'HEAD' });
      fetchThumbStatus = resp.status;
    } catch (err) {
      fetchThumbStatus = err.message;
    }

    auditPairs.push({
      thumbId: t.id,
      thumbPath: t.path,
      thumbSize: t.size_bytes,
      thumbMime: t.mime_type,
      thumbBucket: t.bucket,
      thumbExistsOnR2: thumbR2Check.exists,
      thumbR2SizeBytes: thumbR2Check.size,
      presignedDownloadStatus: fetchThumbStatus,
      origId: matchedOrig ? matchedOrig.id : null,
      origPath: matchedOrig ? matchedOrig.path : null,
      origSize: matchedOrig ? matchedOrig.size_bytes : null,
      origMime: matchedOrig ? matchedOrig.mime_type : null,
      origBucket: matchedOrig ? matchedOrig.bucket : null,
      origExistsOnR2: origR2Check.exists,
      origThumbnailCol: matchedOrig ? matchedOrig.thumbnail : null,
    });
  }

  console.log('Pair audit result:');
  console.table(auditPairs.map((p, idx) => ({
    '#': idx + 1,
    'Thumb UUID': p.thumbId.substring(0, 8),
    'Orig UUID': p.origId ? p.origId.substring(0, 8) : 'NONE',
    'Thumb Key': p.thumbPath.split('/').pop(),
    'R2 Exists': p.thumbExistsOnR2 ? 'YES' : 'NO',
    'HTTP HEAD': p.presignedDownloadStatus,
    'Thumb Raw Col': p.origThumbnailCol ? (p.origThumbnailCol.startsWith('https://') ? 'FULL_URL' : 'KEY') : 'NULL'
  })));

  console.log('\n--- Details of original thumbnail column values ---');
  auditPairs.forEach((p, idx) => {
    console.log(`[#${idx + 1}] Orig ID: ${p.origId}`);
    console.log(`     Thumbnail column: ${p.origThumbnailCol}`);
    console.log(`     Clean Object Key should be: ${p.thumbPath}`);
  });

  await pool.end();
}

main().catch(console.error);
