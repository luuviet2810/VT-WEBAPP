import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

const parsed = dotenv.parse(fs.readFileSync('.env'));
const client = new pg.Client({ connectionString: parsed.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

console.log('--- 1. Kiểm tra views public_vehicles và public_vehicle_images trong Neon ---');
const viewsRes = await client.query(`
  SELECT table_name, table_type 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name IN ('public_vehicles', 'public_vehicle_images', 'vehicles', 'vehicle_images')
`);
console.log('Found tables/views:', viewsRes.rows);

// View definition
const defRes = await client.query(`
  SELECT table_name, view_definition 
  FROM information_schema.views 
  WHERE table_schema = 'public' AND table_name IN ('public_vehicles', 'public_vehicle_images')
`);
console.log('View definitions:');
defRes.rows.forEach(r => console.log(`[${r.table_name}]:\n`, r.view_definition));

// Query public_vehicles
try {
  const pvRes = await client.query('SELECT count(*)::int as count FROM public_vehicles');
  console.log('public_vehicles count:', pvRes.rows[0].count);
  const samplePv = await client.query('SELECT * FROM public_vehicles LIMIT 3');
  console.log('Sample public_vehicles:', samplePv.rows);
} catch (err) {
  console.error('Error querying public_vehicles:', err.message);
}

// Query public_vehicle_images
try {
  const pviRes = await client.query('SELECT count(*)::int as count FROM public_vehicle_images');
  console.log('public_vehicle_images count:', pviRes.rows[0].count);
  const samplePvi = await client.query('SELECT * FROM public_vehicle_images LIMIT 5');
  console.log('Sample public_vehicle_images:', samplePvi.rows);
} catch (err) {
  console.error('Error querying public_vehicle_images:', err.message);
}

// Count vehicles with is_public = true and status <> 'sold'
const vCountRes = await client.query(`
  SELECT 
    COUNT(*)::int as total,
    COUNT(CASE WHEN is_public = true THEN 1 END)::int as public_count,
    COUNT(CASE WHEN is_public = true AND status != 'sold' THEN 1 END)::int as active_public_count,
    COUNT(CASE WHEN is_public = true AND status = 'available' THEN 1 END)::int as available_public_count
  FROM vehicles
`);
console.log('Vehicle counts:', vCountRes.rows[0]);

await client.end();
