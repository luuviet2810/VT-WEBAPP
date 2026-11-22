import 'dotenv/config';
import pg from 'pg';

async function verify() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('--- VERIFYING NEON DATABASE SCHEMA ---\n');

  // 1. Tables
  const tablesRes = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  console.log(`Tables (${tablesRes.rows.length}):`);
  console.log(tablesRes.rows.map(r => '  - ' + r.table_name).join('\n'));

  // 2. Views
  const viewsRes = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'VIEW'
    ORDER BY table_name;
  `);
  console.log(`\nViews (${viewsRes.rows.length}):`);
  console.log(viewsRes.rows.map(r => '  - ' + r.table_name).join('\n'));

  // 3. ENUM types
  const enumRes = await client.query(`
    SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname;
  `);
  console.log(`\nENUM Types (${enumRes.rows.length}):`);
  console.log(enumRes.rows.map(r => `  - ${r.typname}: [${r.values}]`).join('\n'));

  // 4. Foreign Keys
  const fkRes = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  `);
  console.log(`\nForeign Keys (${fkRes.rows.length}):`);
  console.log(fkRes.rows.map(r => `  - ${r.table_name}.${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name}`).join('\n'));

  // 5. Total Indexes
  const idxRes = await client.query(`
    SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';
  `);
  console.log(`\nTotal Indexes in public: ${idxRes.rows[0].count}`);

  // 6. Migrations applied
  const migRes = await client.query(`
    SELECT id, name, applied_at, status FROM _neon_migrations ORDER BY id;
  `);
  console.log(`\nApplied Migrations recorded in _neon_migrations (${migRes.rows.length}):`);
  console.log(migRes.rows.map(r => `  [${r.id}] ${r.name} (${r.status}) at ${r.applied_at.toISOString()}`).join('\n'));

  await client.end();
}

verify().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
