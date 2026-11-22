import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

const parsed = dotenv.parse(fs.readFileSync('.env'));
const client = new pg.Client({ connectionString: parsed.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const res0123 = await client.query("SELECT category, count(*)::int as count FROM vehicle_images WHERE vehicle_id = $1 GROUP BY category", ['74cd5ba2-3c93-4148-9748-c3de2a10afa5']);
console.log('Vehicle 0123 counts:', res0123.rows);

const res8737 = await client.query("SELECT category, count(*)::int as count FROM vehicle_images WHERE vehicle_id = $1 GROUP BY category", ['5f0c65ef-66c8-405b-a03c-6700de924cd3']);
console.log('Vehicle 8737 counts:', res8737.rows);

await client.end();
