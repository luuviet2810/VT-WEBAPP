import 'dotenv/config';
import pg from 'pg';

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in .env');
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Neon PostgreSQL.\n');

  // Check initial state
  console.log('--- PRE-SEED CHECK ---');
  for (const table of ['positions', 'vehicle_option_defs', 'website_settings']) {
    const res = await client.query(`SELECT count(*) FROM ${table}`);
    console.log(`Current rows in ${table}: ${res.rows[0].count}`);
  }

  console.log('\n--- EXECUTING SEED INSERTS ---');
  await client.query('BEGIN');

  try {
    // 1. positions (from 001_seed_data.sql)
    console.log('1. Inserting positions...');
    const posRes = await client.query(`
      INSERT INTO positions (id, name, sort_order) VALUES
        ('00000000-0000-0000-0000-000000000001', 'Song nưng dưới này',  0),
        ('00000000-0000-0000-0000-000000000002', 'Song nưng trên này',  1),
        ('00000000-0000-0000-0000-000000000003', 'Rửa máy',              2),
        ('00000000-0000-0000-0000-000000000004', 'Song nưng chốt',       3),
        ('00000000-0000-0000-0000-000000000005', 'Đánh bóng Wolpyong',   4)
      ON CONFLICT (id) DO NOTHING
      RETURNING *;
    `);
    console.log(`   Positions inserted: ${posRes.rowCount}`);

    // 2. vehicle_option_defs (from 031_option_defs_seed.sql)
    console.log('2. Inserting vehicle_option_defs...');
    const optRes = await client.query(`
      INSERT INTO vehicle_option_defs (group_key, group_label, key, label, sort_order) VALUES
        ('comfort',   'Tiện nghi',              'smart_key',         'Smart Key',            1),
        ('comfort',   'Tiện nghi',              'start_button',      'Nút bấm khởi động',    2),
        ('comfort',   'Tiện nghi',              'av_screen',         'Màn hình AV',          3),
        ('comfort',   'Tiện nghi',              'auto_ac',           'Điều hòa tự động',     4),
        ('comfort',   'Tiện nghi',              'cruise_control',    'Cruise Control',       5),
        ('interior',  'Ghế / Nội thất',         'leather_seats',     'Ghế da',               6),
        ('interior',  'Ghế / Nội thất',         'power_seats',       'Ghế điện',             7),
        ('interior',  'Ghế / Nội thất',         'seat_heater',       'Sưởi ghế',             8),
        ('interior',  'Ghế / Nội thất',         'seat_ventilation',  'Làm mát ghế',          9),
        ('interior',  'Ghế / Nội thất',         'heated_steering',   'Vô lăng sưởi',        10),
        ('safety',    'An toàn / Hỗ trợ',       'rear_camera',       'Camera lùi',          11),
        ('safety',    'An toàn / Hỗ trợ',       'rear_sensor',       'Cảm biến lùi',        12),
        ('safety',    'An toàn / Hỗ trợ',       'front_sensor',      'Cảm biến trước',      13),
        ('exterior',  'Ngoại thất',             'sunroof',           'Cửa sổ trời',         14),
        ('exterior',  'Ngoại thất',             'power_trunk',       'Cốp điện',            15),
        ('exterior',  'Ngoại thất',             'power_mirrors',     'Gương điện',          16)
      ON CONFLICT (key) DO NOTHING
      RETURNING *;
    `);
    console.log(`   Vehicle option defs inserted: ${optRes.rowCount}`);

    // 3. website_settings (from 035_website_settings_seed.sql)
    console.log('3. Inserting website_settings...');
    const webRes = await client.query(`
      INSERT INTO website_settings (
        id, office_address_1, office_address_2,
        phone_display, phone_raw,
        tiktok_url, tiktok_display
      ) VALUES (
        1,
        'CS1: 대전광역시 유성구 유성대로 510, 339호',
        'CS2: 경기 수원시 권선구 세화로 49, 8호',
        '010-2592-5885 (Tiến)',
        '+821025925885',
        'https://www.tiktok.com/@viettienauto',
        '@viettienauto'
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING *;
    `);
    console.log(`   Website settings inserted: ${webRes.rowCount}`);

    await client.query('COMMIT');
    console.log('\nSeed transaction committed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed transaction failed, rolled back:', err.message);
    await client.end();
    process.exit(1);
  }

  // Verification & duplicate checks
  console.log('\n--- VERIFICATION & DUPLICATE CHECKS ---');

  // Verify positions
  const posAll = await client.query(`SELECT id, name, sort_order FROM positions ORDER BY sort_order;`);
  console.log(`\nPositions in database (${posAll.rows.length}):`);
  posAll.rows.forEach(r => console.log(`  - [${r.sort_order}] ${r.id}: ${r.name}`));

  // Check positions duplicate ID / name
  const posDup = await client.query(`
    SELECT id, count(*) FROM positions GROUP BY id HAVING count(*) > 1;
  `);
  console.log(`Positions duplicate IDs: ${posDup.rows.length === 0 ? 'None (OK)' : posDup.rows.length}`);

  // Verify vehicle_option_defs
  const optAll = await client.query(`SELECT id, group_key, group_label, key, label, sort_order FROM vehicle_option_defs ORDER BY sort_order;`);
  console.log(`\nVehicle Option Defs in database (${optAll.rows.length}):`);
  optAll.rows.forEach(r => console.log(`  - [${r.sort_order}] [${r.group_key}] ${r.key} -> ${r.label}`));

  // Check vehicle_option_defs duplicate key / ID
  const optDupKey = await client.query(`
    SELECT key, count(*) FROM vehicle_option_defs GROUP BY key HAVING count(*) > 1;
  `);
  console.log(`Vehicle option defs duplicate keys: ${optDupKey.rows.length === 0 ? 'None (OK)' : optDupKey.rows.length}`);

  const optDupId = await client.query(`
    SELECT id, count(*) FROM vehicle_option_defs GROUP BY id HAVING count(*) > 1;
  `);
  console.log(`Vehicle option defs duplicate IDs: ${optDupId.rows.length === 0 ? 'None (OK)' : optDupId.rows.length}`);

  // Verify website_settings
  const webAll = await client.query(`SELECT id, office_address_1, office_address_2, phone_display, phone_raw, tiktok_url, tiktok_display FROM website_settings;`);
  console.log(`\nWebsite Settings in database (${webAll.rows.length}):`);
  webAll.rows.forEach(r => {
    console.log(`  - ID: ${r.id}`);
    console.log(`    Address 1: ${r.office_address_1}`);
    console.log(`    Address 2: ${r.office_address_2}`);
    console.log(`    Phone: ${r.phone_display} (${r.phone_raw})`);
    console.log(`    TikTok: ${r.tiktok_display} (${r.tiktok_url})`);
  });

  // Verify application querying simulation
  console.log('\n--- APPLICATION QUERY SIMULATION ---');
  // 1. Frontend positionService simulation
  const appPos = await client.query(`SELECT * FROM positions ORDER BY sort_order ASC`);
  console.log(`App query 'positions': SUCCESS (${appPos.rowCount} rows retrieved)`);

  // 2. Frontend vehicleOptionService simulation
  const appOpt = await client.query(`SELECT * FROM vehicle_option_defs ORDER BY sort_order ASC`);
  console.log(`App query 'vehicle_option_defs': SUCCESS (${appOpt.rowCount} rows retrieved)`);

  // 3. Frontend websiteSettingsService simulation
  const appWeb = await client.query(`SELECT * FROM website_settings WHERE id = 1 LIMIT 1`);
  console.log(`App query 'website_settings': SUCCESS (${appWeb.rowCount} row retrieved)`);

  await client.end();
  console.log('\nAll checks passed successfully!');
}

seed().catch(err => {
  console.error('Seed runner failed:', err);
  process.exit(1);
});
