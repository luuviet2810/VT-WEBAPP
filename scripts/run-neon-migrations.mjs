import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in .env');
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Neon PostgreSQL.');

  // Create migration tracking table
  await client.query(`
    CREATE TABLE IF NOT EXISTS _neon_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      status TEXT NOT NULL DEFAULT 'success'
    );
  `);

  const appliedRes = await client.query(`SELECT name FROM _neon_migrations WHERE status = 'success'`);
  const appliedSet = new Set(appliedRes.rows.map(r => r.name));

  const migrationsDir = 'neon-migrations';
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log(`Found ${files.length} migration files in ${migrationsDir}.`);
  console.log(`Already applied: ${appliedSet.size}`);

  let successCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`[SKIP] ${file} already applied.`);
      skippedCount++;
      continue;
    }

    console.log(`[RUNNING] ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO _neon_migrations (name, status) VALUES ($1, 'success')`,
        [file]
      );
      console.log(`[SUCCESS] ${file}`);
      successCount++;
    } catch (err) {
      console.error(`\n[ERROR] Failed at migration: ${file}`);
      console.error(`Reason: ${err.message}`);
      if (err.position) console.error(`Error position: ${err.position}`);
      await client.end();
      process.exit(1);
    }
  }

  console.log(`\n========================================`);
  console.log(`MIGRATION RUN COMPLETE!`);
  console.log(`Newly applied: ${successCount}`);
  console.log(`Skipped (already applied): ${skippedCount}`);
  console.log(`Total: ${files.length}`);
  console.log(`========================================\n`);

  await client.end();
}

run().catch(err => {
  console.error('Migration runner error:', err);
  process.exit(1);
});
