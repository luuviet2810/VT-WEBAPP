import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('--- Auditing All Thumbnail Records in vehicle_images ---');
  
  // Total records
  const totalRes = await pool.query(`SELECT COUNT(*) as count FROM vehicle_images`);
  console.log(`Total rows in vehicle_images: ${totalRes.rows[0].count}`);

  // Records where path contains thumb
  const thumbRes = await pool.query(`
    SELECT id, vehicle_id, path, category, created_at 
    FROM vehicle_images 
    WHERE path ILIKE '%thumb%' OR url ILIKE '%thumb%'
  `);
  console.log(`Rows where path/url has 'thumb': ${thumbRes.rows.length}`);

  // Group by vehicle_id
  const byVehicle = {};
  for (const r of thumbRes.rows) {
    byVehicle[r.vehicle_id] = (byVehicle[r.vehicle_id] || 0) + 1;
  }
  console.log('Breakdown of thumb rows by vehicle_id:');
  for (const [vId, cnt] of Object.entries(byVehicle)) {
    const vInfo = await pool.query(`SELECT plate, model FROM vehicles WHERE id = $1`, [vId]);
    const p = vInfo.rows[0] ? `${vInfo.rows[0].plate} (${vInfo.rows[0].model})` : 'unknown';
    console.log(`- Vehicle ${vId} [${p}]: ${cnt} rows`);
  }

  // Legacy Supabase records count
  const supabaseRes = await pool.query(`
    SELECT COUNT(*) as count FROM vehicle_images WHERE url ILIKE '%supabase.co%' OR path ILIKE '%supabase.co%'
  `);
  console.log(`Legacy Supabase rows: ${supabaseRes.rows[0].count}`);

  // How many legacy Supabase have thumb in path vs in thumbnail column
  const legacyThumbInPath = await pool.query(`
    SELECT COUNT(*) as count FROM vehicle_images 
    WHERE (url ILIKE '%supabase.co%' OR path ILIKE '%supabase.co%') 
      AND (path ILIKE '%thumb%' OR url ILIKE '%thumb%')
  `);
  console.log(`Legacy Supabase rows with thumb in path/url: ${legacyThumbInPath.rows[0].count}`);

  const legacyThumbInThumbCol = await pool.query(`
    SELECT COUNT(*) as count FROM vehicle_images 
    WHERE (url ILIKE '%supabase.co%' OR path ILIKE '%supabase.co%') 
      AND thumbnail ILIKE '%thumb%'
  `);
  console.log(`Legacy Supabase rows with thumb in thumbnail column: ${legacyThumbInThumbCol.rows[0].count}`);

  await pool.end();
}

main().catch(console.error);
