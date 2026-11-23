import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

// Parse PostgreSQL DATE columns (OID 1082) directly as 'YYYY-MM-DD' strings,
// preventing node-pg from converting them to JavaScript Date objects which serialize to UTC ISO timestamps (T...Z).
pg.types.setTypeParser(1082, (val: string) => val);

export interface DatabaseHealthResult {
  ok: boolean;
  version?: string;
  latencyMs?: number;
  database?: string;
  activeConnections?: number;
  error?: string;
}

let pool: pg.Pool | null = null;

export function getDatabasePool(): pg.Pool {
  if (!pool) {
    if (!config.database.url) {
      throw new Error('[Database] DATABASE_URL is not configured in environment');
    }

    pool = new Pool({
      connectionString: config.database.url,
      ssl: {
        rejectUnauthorized: false,
      },
      max: config.database.maxConnections,
      idleTimeoutMillis: config.database.idleTimeoutMillis,
      connectionTimeoutMillis: 15000,
    });

    pool.on('error', (err) => {
      console.error('[Database Pool Error] Unexpected idle client error:', err.message);
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const p = getDatabasePool();
  return p.query<T>(text, params);
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const startTime = Date.now();
  try {
    const p = getDatabasePool();
    const result = await p.query<{ version: string; current_database: string }>(
      'SELECT version(), current_database()'
    );
    const latencyMs = Date.now() - startTime;
    const row = result.rows[0];

    return {
      ok: true,
      version: row ? row.version.split(' on ')[0] : 'PostgreSQL',
      database: row ? row.current_database : undefined,
      latencyMs,
      activeConnections: p.totalCount,
    };
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Date.now() - startTime,
      error: err.message || 'Database connection failed',
    };
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
