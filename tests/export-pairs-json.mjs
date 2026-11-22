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

  const pairs = [];
  for (let i = 0; i < thumbRows.length; i++) {
    const t = thumbRows[i];
    const o = origRows.find(orig => orig.thumbnail && orig.thumbnail.includes(t.path));
    pairs.push({
      index: i + 1,
      sortOrder: t.sort_order,
      // Thumb
      thumbId: t.id,
      thumbVehicleId: t.vehicle_id,
      thumbPath: t.path,
      thumbCol: t.thumbnail,
      thumbBucket: t.bucket,
      thumbSizeBytes: t.size_bytes,
      thumbMimeType: t.mime_type,
      // Orig
      origId: o.id,
      origVehicleId: o.vehicle_id,
      origPath: o.path,
      origCol: o.thumbnail,
      origBucket: o.bucket,
      origSizeBytes: o.size_bytes,
      origMimeType: o.mime_type,
      // Proposed Clean Thumb Key
      proposedCleanThumbnail: t.path
    });
  }

  console.log(JSON.stringify(pairs, null, 2));
  await pool.end();
}

main().catch(console.error);
