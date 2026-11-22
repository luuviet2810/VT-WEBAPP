import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../gara-bot-server/.env') });

const { query } = await import('../gara-bot-server/dist/database/index.js');

async function audit() {
  const legacyCountRes = await query("SELECT count(*) as count FROM vehicle_images WHERE url LIKE '%supabase%' OR url LIKE '%storage/v1/object%'");
  const totalCountRes = await query("SELECT count(*) as count FROM vehicle_images");
  const sampleRes = await query("SELECT id, vehicle_id, path, url, category, created_at FROM vehicle_images WHERE url LIKE '%supabase%' ORDER BY created_at ASC LIMIT 5");
  
  console.log('--- LEGACY SUPABASE IMAGES AUDIT ---');
  console.log('Legacy count:', legacyCountRes.rows[0].count);
  console.log('Total vehicle_images count:', totalCountRes.rows[0].count);
  console.log('Sample rows:');
  sampleRes.rows.forEach(r => {
    console.log(`- ID: ${r.id} | Vehicle: ${r.vehicle_id} | Path: ${r.path} | Category: ${r.category} | URL: ${r.url.slice(0, 75)}...`);
  });

  // Check if any legacy row contains R2 signature or expiring tokens
  const corruptedRes = await query("SELECT count(*) as count FROM vehicle_images WHERE (url LIKE '%supabase%') AND (url LIKE '%X-Amz-Signature%' OR url LIKE '%token=%')");
  console.log('Corrupted/modified legacy rows with presigned signatures:', corruptedRes.rows[0].count);

  process.exit(0);
}

audit().catch(err => {
  console.error(err);
  process.exit(1);
});
