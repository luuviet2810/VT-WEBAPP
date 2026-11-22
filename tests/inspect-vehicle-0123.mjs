import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('--- Inspecting Vehicles Schema ---');
  const cols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'vehicles'
  `);
  console.log('Vehicles columns:', cols.rows.map(r => r.column_name).join(', '));

  // Find plate column or search in any string columns
  const allVehicles = await pool.query(`SELECT * FROM vehicles LIMIT 5`);
  console.log('Sample vehicle row keys:', Object.keys(allVehicles.rows[0] || {}));
  
  // Find vehicle with 0123 in any column or plate-like column
  const queryStr = `
    SELECT * FROM vehicles 
    WHERE license_plate ILIKE '%0123%' 
       OR plate_number ILIKE '%0123%' 
       OR plate ILIKE '%0123%' 
       OR vin ILIKE '%0123%'
       OR model ILIKE '%0123%'
  `.replace(/license_plate/g, cols.rows.some(c => c.column_name === 'license_plate') ? 'license_plate' : 'id');

  // Let's inspect which column actually holds the plate:
  const plateCol = cols.rows.find(c => c.column_name.includes('plate') || c.column_name.includes('number') || c.column_name.includes('bien'))?.column_name;
  console.log('Plate column identified:', plateCol);

  let searchRes;
  if (plateCol) {
    searchRes = await pool.query(`SELECT * FROM vehicles WHERE ${plateCol} ILIKE '%0123%'`);
  } else {
    searchRes = await pool.query(`SELECT * FROM vehicles WHERE id::text ILIKE '%0123%' OR model ILIKE '%0123%'`);
  }

  console.log(`Found ${searchRes.rows.length} vehicle(s):`);
  for (const v of searchRes.rows) {
    console.log(v);
    
    // Check images
    const images = await pool.query(`
      SELECT * FROM vehicle_images 
      WHERE vehicle_id = $1 
      ORDER BY sort_order ASC, created_at ASC
    `, [v.id]);
    
    console.log(`Total images for vehicle ${v.id}: ${images.rows.length}`);
    for (const img of images.rows) {
      console.log(JSON.stringify(img, null, 2));
    }
  }

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
