import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
if (fs.existsSync('gara-bot-server/.env')) dotenv.config({ path: 'gara-bot-server/.env' });

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

  console.log('================================================================');
  console.log('  AUDITING ALL 13 THUMBNAIL & ORIGINAL PAIRS FOR VEHICLE 0123');
  console.log('================================================================\n');

  const detailedReport = [];

  for (let i = 0; i < thumbRows.length; i++) {
    const t = thumbRows[i];
    const o = origRows.find(orig => orig.thumbnail && orig.thumbnail.includes(t.path));

    // 1. Check physical existence on R2
    const thumbR2 = await headObject('images', t.path);
    const origR2 = o ? await headObject('images', o.path) : { exists: false, size: 0 };

    // 2. Generate fresh Presigned GET for thumbnail using clean Object Key
    let thumbPresignedGetStatus = 0;
    let thumbFetchedBytes = 0;
    try {
      const presigned = await generatePresignedDownloadUrl('images', t.path);
      const getResp = await fetch(presigned.url);
      thumbPresignedGetStatus = getResp.status;
      const buf = await getResp.arrayBuffer();
      thumbFetchedBytes = buf.byteLength;
    } catch (e) {
      thumbPresignedGetStatus = e.message;
    }

    // 3. Generate fresh Presigned GET for original image
    let origPresignedGetStatus = 0;
    let origFetchedBytes = 0;
    if (o) {
      try {
        const presignedOrig = await generatePresignedDownloadUrl('images', o.path);
        const getOrigResp = await fetch(presignedOrig.url);
        origPresignedGetStatus = getOrigResp.status;
        const oBuf = await getOrigResp.arrayBuffer();
        origFetchedBytes = oBuf.byteLength;
      } catch (e) {
        origPresignedGetStatus = e.message;
      }
    }

    detailedReport.push({
      pairIndex: i + 1,
      sortOrder: t.sort_order,
      // Thumbnail Record
      thumbId: t.id,
      thumbPath: t.path,
      thumbDbSizeBytes: Number(t.size_bytes),
      thumbR2Exists: thumbR2.exists,
      thumbR2SizeBytes: thumbR2.size,
      thumbFetchStatus: thumbPresignedGetStatus,
      thumbFetchedBytes,
      thumbMimeType: t.mime_type,
      // Parent Original Image Record
      origId: o ? o.id : null,
      origPath: o ? o.path : null,
      origDbSizeBytes: o ? Number(o.size_bytes) : 0,
      origR2Exists: origR2.exists,
      origR2SizeBytes: origR2.size,
      origFetchStatus: origPresignedGetStatus,
      origFetchedBytes,
      origMimeType: o ? o.mime_type : null,
      origCurrentThumbCol: o ? o.thumbnail : null,
      cleanThumbKey: t.path
    });
  }

  console.table(detailedReport.map(r => ({
    '#': r.pairIndex,
    'Sort': r.sortOrder,
    'Thumb UUID': r.thumbId.substring(0, 8),
    'Orig UUID': r.origId ? r.origId.substring(0, 8) : 'NONE',
    'Thumb R2': r.thumbR2Exists ? `OK (${r.thumbR2SizeBytes}B)` : 'MISSING',
    'Thumb GET': r.thumbFetchStatus === 200 ? 'HTTP 200 OK' : r.thumbFetchStatus,
    'Orig R2': r.origR2Exists ? `OK (${r.origR2SizeBytes}B)` : 'MISSING',
    'Orig GET': r.origFetchStatus === 200 ? 'HTTP 200 OK' : r.origFetchStatus,
  })));

  // Verify all 13 are HTTP 200
  const allThumbOk = detailedReport.every(r => r.thumbR2Exists && r.thumbFetchStatus === 200);
  const allOrigOk = detailedReport.every(r => r.origR2Exists && r.origFetchStatus === 200);

  console.log(`\nAll 13 thumbnails exist on R2 and return HTTP 200 OK: ${allThumbOk ? 'YES (100%)' : 'NO'}`);
  console.log(`All 13 original images exist on R2 and return HTTP 200 OK: ${allOrigOk ? 'YES (100%)' : 'NO'}`);

  // Standalone PNG check
  const standalonePng = origRows.find(o => !thumbRows.some(t => o.thumbnail && o.thumbnail.includes(t.path)));
  if (standalonePng) {
    const pngR2 = await headObject('images', standalonePng.path);
    console.log(`\nStandalone PNG Image (ID: ${standalonePng.id}):`);
    console.log(`- Path: ${standalonePng.path}`);
    console.log(`- Size: ${standalonePng.size_bytes}B`);
    console.log(`- R2 Exists: ${pngR2.exists ? 'YES' : 'NO'} (${pngR2.size}B)`);
  }

  await pool.end();
}

main().catch(console.error);
