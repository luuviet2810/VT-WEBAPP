import 'dotenv/config';
import pg from 'pg';

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const userRes = await client.query('SELECT current_user, session_user;');
  console.log('Current user:', userRes.rows[0]);

  // Test schema auth and dummy functions
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS auth;');
    console.log('OK: Schema auth created or exists.');
    await client.query(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;`);
    await client.query(`CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;`);
    await client.query(`CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'anon'::text $$;`);
    console.log('OK: auth.uid(), auth.jwt(), auth.role() created.');
  } catch (err) {
    console.error('FAIL on auth schema/functions:', err.message);
  }

  // Test creating roles
  try {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
      END
      $$;
    `);
    console.log('OK: Roles anon, authenticated, service_role created.');
  } catch (err) {
    console.error('FAIL on role creation:', err.message);
  }

  await client.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
