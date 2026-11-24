import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
dotenv.config({ path: 'gara-bot-server/.env' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('--- 1. FOREIGN KEY CONSTRAINTS DIRECTLY REFERENCING vehicles ---');
  const directFKs = await pool.query(`
    SELECT
      tc.table_schema,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'vehicles'
    ORDER BY tc.table_name, kcu.column_name;
  `);

  directFKs.rows.forEach(r => {
    console.log(`- Table: ${r.table_name.padEnd(25)} Column: ${r.column_name.padEnd(20)} ON DELETE: ${r.delete_rule} (${r.constraint_name})`);
  });

  console.log('\n--- 2. ALL FOREIGN KEY CONSTRAINTS IN PUBLIC SCHEMA ---');
  const allFKs = await pool.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY ccu.table_name, tc.table_name;
  `);

  allFKs.rows.forEach(r => {
    console.log(`- ${r.table_name}.${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name} [ON DELETE ${r.delete_rule}] (${r.constraint_name})`);
  });

  console.log('\n--- 3. ALL COLUMNS NAMED %vehicle% OR %checksheet% OR %task% IN ALL TABLES ---');
  const cols = await pool.query(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        column_name ILIKE '%vehicle%'
        OR column_name ILIKE '%checksheet%'
        OR column_name ILIKE '%check_sheet%'
        OR column_name ILIKE '%task_id%'
      )
    ORDER BY table_name, column_name;
  `);

  cols.rows.forEach(r => {
    console.log(`- ${r.table_name.padEnd(25)} Column: ${r.column_name.padEnd(25)} (${r.data_type}, nullable: ${r.is_nullable})`);
  });

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });

async function checkMore() {
  const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const notifCols = await p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications'");
  console.log('\nnotifications columns:', notifCols.rows);

  const actCols = await p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'activity_logs'");
  console.log('activity_logs columns:', actCols.rows);

  await p.end();
}
checkMore();

async function checkPublicImagesView() {
  const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const res = await p.query("SELECT table_name, table_type FROM information_schema.tables WHERE table_name = 'public_vehicle_images'");
  console.log('\npublic_vehicle_images table_type:', res.rows);
  await p.end();
}
checkPublicImagesView();
