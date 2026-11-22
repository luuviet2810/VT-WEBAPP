import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../gara-bot-server/.env') });

const { query } = await import('../gara-bot-server/dist/database/index.js');

async function main() {
  const res = await query(`
    SELECT id, vehicle_id, path, url, category, thumbnail 
    FROM vehicle_images 
    WHERE path LIKE '%thumb_%'
  `);
  console.log(`vehicle_images records with 'thumb_' in path: ${res.rows.length}`);
  res.rows.forEach(r => console.log(r));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
