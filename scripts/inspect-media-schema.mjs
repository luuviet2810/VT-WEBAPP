import 'dotenv/config';
import pg from 'pg';

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  for (const t of ['vehicle_images', 'vehicle_documents', 'check_sheets']) {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [t]);
    console.log(`=== Table: ${t} ===`);
    res.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable}, default: ${r.column_default})`));
  }

  await client.end();
}

main().catch(console.error);
