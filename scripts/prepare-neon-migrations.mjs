import fs from 'fs';
import path from 'path';

const srcDir = 'migrations';
const dstDir = 'neon-migrations';
const seedsDir = path.join(dstDir, 'seeds');

if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
if (!fs.existsSync(seedsDir)) fs.mkdirSync(seedsDir, { recursive: true });

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.sql')).sort();

console.log(`Processing ${files.length} migrations from ${srcDir} to ${dstDir}...`);

for (const file of files) {
  const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');

  if (file === '001_initial_schema.sql') {
    // 001 contains schema + seed data block at the end (lines 543-563)
    // Find the seed block
    const seedMarker = '-- SEED DATA';
    const splitIndex = content.indexOf(seedMarker);
    if (splitIndex !== -1) {
      const ddlPart = content.slice(0, splitIndex);
      const seedPart = content.slice(splitIndex);
      fs.writeFileSync(path.join(dstDir, file), ddlPart.trim() + '\n');
      fs.writeFileSync(path.join(seedsDir, '001_seed_data.sql'), seedPart.trim() + '\n');
      console.log(`[001] Split DDL and Seed Data.`);
      continue;
    }
  }

  if (file === '004_supabase_auth.sql') {
    // 004 has UPDATE backfill and ALTER TABLE DROP password_hash
    const ddl = `-- Migration 004: Schema update for Neon
BEGIN;
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users (auth_id);
COMMENT ON TABLE public.users IS 'Canonical employee profile table. auth_id links to auth identity.';
COMMIT;
`;
    const seed = `-- Migration 004: Data backfill (extracted)
UPDATE public.users
SET auth_id = 'legacy-' || md5(LOWER(COALESCE(email, '')) || '|' || name)
WHERE auth_id IS NULL AND email IS NOT NULL AND name IS NOT NULL;

UPDATE public.users
SET auth_id = 'legacy-' || id::text
WHERE auth_id IS NULL;
`;
    fs.writeFileSync(path.join(dstDir, file), ddl);
    fs.writeFileSync(path.join(seedsDir, '004_auth_backfill.sql'), seed);
    console.log(`[004] Separated DDL and Data backfill.`);
    continue;
  }

  if (file === '010_fix_vehicles_import_trigger.sql') {
    // Ensure vehicles_import table exists before creating triggers on it
    const ddl = `-- Ensure vehicles_import staging table exists
CREATE TABLE IF NOT EXISTS vehicles_import (
  id BIGSERIAL PRIMARY KEY,
  plate TEXT,
  model TEXT,
  year INTEGER,
  fuel_type TEXT,
  displacement TEXT,
  mileage TEXT,
  color TEXT,
  cost_price BIGINT,
  sell_price BIGINT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

` + content;
    fs.writeFileSync(path.join(dstDir, file), ddl);
    console.log(`[010] Added safe vehicles_import table creation.`);
    continue;
  }

  if (file === '012_set_default_vehicle_position.sql') {
    // 012 is pure data update
    fs.writeFileSync(path.join(seedsDir, '012_set_default_vehicle_position.sql'), content);
    fs.writeFileSync(path.join(dstDir, file), `-- Migration 012: Data backfill moved to seeds/012_set_default_vehicle_position.sql\n-- No DDL changes required.\nSELECT 1;\n`);
    console.log(`[012] Moved data update to seeds.`);
    continue;
  }

  if (file === '014_simplify_task_priority.sql') {
    // 014 is pure data update
    fs.writeFileSync(path.join(seedsDir, '014_simplify_task_priority.sql'), content);
    fs.writeFileSync(path.join(dstDir, file), `-- Migration 014: Data backfill moved to seeds/014_simplify_task_priority.sql\n-- No DDL changes required.\nSELECT 1;\n`);
    console.log(`[014] Moved data update to seeds.`);
    continue;
  }

  if (file === '017_convert_urgent_to_high.sql') {
    // 017 is pure data update
    fs.writeFileSync(path.join(seedsDir, '017_convert_urgent_to_high.sql'), content);
    fs.writeFileSync(path.join(dstDir, file), `-- Migration 017: Data backfill moved to seeds/017_convert_urgent_to_high.sql\n-- No DDL changes required.\nSELECT 1;\n`);
    console.log(`[017] Moved data update to seeds.`);
    continue;
  }

  if (file === '019_add_sold_date.sql') {
    const ddl = `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sold_date DATE;\n`;
    const seed = `UPDATE vehicles SET sold_date = created_at::DATE WHERE status = 'sold' AND sold_date IS NULL;\n`;
    fs.writeFileSync(path.join(dstDir, file), ddl);
    fs.writeFileSync(path.join(seedsDir, '019_sold_date_backfill.sql'), seed);
    console.log(`[019] Separated DDL and backfill.`);
    continue;
  }

  if (file === '022_add_task_source.sql') {
    const ddl = `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source TEXT;\nALTER TABLE tasks ALTER COLUMN source SET DEFAULT 'manual';\n`;
    const seed = `UPDATE tasks SET source = 'rule_engine' WHERE rule_id IS NOT NULL AND source IS NULL;\nUPDATE tasks SET source = 'manual' WHERE rule_id IS NULL AND source IS NULL;\n`;
    fs.writeFileSync(path.join(dstDir, file), ddl);
    fs.writeFileSync(path.join(seedsDir, '022_task_source_backfill.sql'), seed);
    console.log(`[022] Separated DDL and backfill.`);
    continue;
  }

  if (file === '028_fix_duplicate_auto_tasks.sql') {
    // Step 1 delete, step 2 create unique index
    const ddl = `-- Step 2: Add unique index to prevent future duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_vehicle_rule
  ON tasks (vehicle_id, rule_id)
  WHERE rule_id IS NOT NULL;
`;
    const seed = `-- Step 1: Clean up duplicates (extracted)
WITH duplicates AS (
  SELECT id, vehicle_id, rule_id, status, created_at,
    ROW_NUMBER() OVER (
      PARTITION BY vehicle_id, rule_id
      ORDER BY
        CASE status WHEN 'done' THEN 0 WHEN 'doing' THEN 1 WHEN 'todo' THEN 2 ELSE 3 END,
        created_at DESC
    ) AS rn
  FROM tasks WHERE rule_id IS NOT NULL
), to_delete AS (
  SELECT id FROM duplicates WHERE rn > 1
)
DELETE FROM tasks WHERE id IN (SELECT id FROM to_delete);
`;
    fs.writeFileSync(path.join(dstDir, file), ddl);
    fs.writeFileSync(path.join(seedsDir, '028_delete_duplicates.sql'), seed);
    console.log(`[028] Separated DDL and delete.`);
    continue;
  }

  if (file === '031_create_vehicle_option_defs.sql') {
    const seedMarker = '-- Seed the initial catalog';
    const splitIndex = content.indexOf(seedMarker);
    if (splitIndex !== -1) {
      const ddlPart = content.slice(0, splitIndex) + "NOTIFY pgrst, 'reload schema';\n";
      const seedPart = content.slice(splitIndex);
      fs.writeFileSync(path.join(dstDir, file), ddlPart);
      fs.writeFileSync(path.join(seedsDir, '031_option_defs_seed.sql'), seedPart);
      console.log(`[031] Separated DDL and option catalog seed.`);
      continue;
    }
  }

  if (file === '033_public_web_sort_order.sql') {
    // Has UPDATE backfill
    const lines = content.split('\n');
    const updateStart = lines.findIndex(l => l.includes('UPDATE vehicles v'));
    const updateEnd = lines.findIndex(l => l.includes('WHERE v.id = sub.id;'));
    if (updateStart !== -1 && updateEnd !== -1) {
      const ddlLines = [...lines.slice(0, updateStart), ...lines.slice(updateEnd + 1)];
      const seedLines = lines.slice(updateStart, updateEnd + 1);
      fs.writeFileSync(path.join(dstDir, file), ddlLines.join('\n'));
      fs.writeFileSync(path.join(seedsDir, '033_sort_order_backfill.sql'), seedLines.join('\n'));
      console.log(`[033] Separated DDL and sort order backfill.`);
      continue;
    }
  }

  if (file === '035_website_settings.sql') {
    const seedMarker = '-- Seed thông tin thật';
    const splitIndex = content.indexOf(seedMarker);
    if (splitIndex !== -1) {
      const ddlPart = content.slice(0, splitIndex) + "NOTIFY pgrst, 'reload schema';\n";
      const seedPart = content.slice(splitIndex);
      fs.writeFileSync(path.join(dstDir, file), ddlPart);
      fs.writeFileSync(path.join(seedsDir, '035_website_settings_seed.sql'), seedPart);
      console.log(`[035] Separated DDL and website settings seed.`);
      continue;
    }
  }

  if (file === '040_sold_task_kanban.sql') {
    const updateMarker = '-- Backfill display snapshots';
    const splitIndex = content.indexOf(updateMarker);
    if (splitIndex !== -1) {
      const ddlPart = content.slice(0, splitIndex) + "NOTIFY pgrst, 'reload schema';\n";
      const seedPart = content.slice(splitIndex);
      fs.writeFileSync(path.join(dstDir, file), ddlPart);
      fs.writeFileSync(path.join(seedsDir, '040_snapshots_backfill.sql'), seedPart);
      console.log(`[040] Separated DDL and snapshots backfill.`);
      continue;
    }
  }

  // Default: copy as is
  fs.writeFileSync(path.join(dstDir, file), content);
  console.log(`[${file}] Copied DDL directly.`);
}

console.log('\nPreparation complete. All 42 migrations ready in neon-migrations/.');
console.log('Seed/backfill queries safely stored in neon-migrations/seeds/ and NOT executed.');
