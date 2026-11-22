import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

const parsed = dotenv.parse(fs.readFileSync('.env'));
const client = new pg.Client({ connectionString: parsed.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const res = await client.query('SELECT id, path, thumbnail, sort_order FROM vehicle_images WHERE vehicle_id = $1 ORDER BY sort_order', ['74cd5ba2-3c93-4148-9748-c3de2a10afa5']);
console.log('Images of 0123:');
res.rows.forEach((r, idx) => console.log(`#${idx+1} [${r.id}] sort_order: ${r.sort_order}\n  path: ${r.path}\n  thumb: ${r.thumbnail}`));

await client.end();
