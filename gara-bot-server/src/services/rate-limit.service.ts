import { query } from '../database/index.js';

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
const WINDOW_SECONDS = WINDOW_MINUTES * 60;

// Fallback in-memory cache in case of database connectivity issues
interface MemoryAttempt {
  count: number;
  firstAttempt: number;
}
const memoryStore = new Map<string, MemoryAttempt>();

function cleanMemoryStore() {
  const now = Date.now();
  for (const [key, val] of memoryStore.entries()) {
    if (now - val.firstAttempt > WINDOW_SECONDS * 1000) {
      memoryStore.delete(key);
    }
  }
}

export async function checkLoginRateLimit(
  ip: string,
  normalizedEmail: string
): Promise<{ blocked: boolean; retryAfterSeconds: number }> {
  const ipKey = `ip:${ip}`;
  const emailKey = `email:${normalizedEmail}`;

  try {
    const result = await query<{ identifier: string; failed_count: string; last_attempt: Date }>(
      `SELECT identifier, COUNT(*) as failed_count, MAX(attempted_at) as last_attempt
       FROM auth_login_attempts
       WHERE identifier IN ($1, $2)
         AND attempted_at > NOW() - INTERVAL '15 minutes'
       GROUP BY identifier;`,
      [ipKey, emailKey]
    );

    let maxAttempts = 0;
    let latestAttemptTime: number | null = null;

    for (const row of result.rows) {
      const count = parseInt(row.failed_count, 10) || 0;
      if (count > maxAttempts) {
        maxAttempts = count;
      }
      if (row.last_attempt) {
        const time = new Date(row.last_attempt).getTime();
        if (!latestAttemptTime || time > latestAttemptTime) {
          latestAttemptTime = time;
        }
      }
    }

    if (maxAttempts >= MAX_FAILED_ATTEMPTS) {
      const now = Date.now();
      const elapsedSeconds = latestAttemptTime ? Math.floor((now - latestAttemptTime) / 1000) : 0;
      const retryAfterSeconds = Math.max(1, WINDOW_SECONDS - elapsedSeconds);
      return { blocked: true, retryAfterSeconds };
    }

    return { blocked: false, retryAfterSeconds: 0 };
  } catch (err: any) {
    // Database fallback to memory store
    cleanMemoryStore();
    const now = Date.now();
    for (const key of [ipKey, emailKey]) {
      const mem = memoryStore.get(key);
      if (mem && mem.count >= MAX_FAILED_ATTEMPTS && now - mem.firstAttempt < WINDOW_SECONDS * 1000) {
        const retryAfterSeconds = Math.max(1, WINDOW_SECONDS - Math.floor((now - mem.firstAttempt) / 1000));
        return { blocked: true, retryAfterSeconds };
      }
    }
    return { blocked: false, retryAfterSeconds: 0 };
  }
}

export async function recordFailedLogin(ip: string, normalizedEmail: string): Promise<void> {
  const ipKey = `ip:${ip}`;
  const emailKey = `email:${normalizedEmail}`;

  // Always update in-memory fallback
  const now = Date.now();
  for (const key of [ipKey, emailKey]) {
    const mem = memoryStore.get(key);
    if (!mem || now - mem.firstAttempt > WINDOW_SECONDS * 1000) {
      memoryStore.set(key, { count: 1, firstAttempt: now });
    } else {
      mem.count += 1;
    }
  }

  // Insert into Neon database
  try {
    await query(
      `INSERT INTO auth_login_attempts (identifier) VALUES ($1), ($2);`,
      [ipKey, emailKey]
    );

    // Opportunistic cleanup of attempts older than 1 hour (runs asynchronously, does not block)
    query(`DELETE FROM auth_login_attempts WHERE attempted_at < NOW() - INTERVAL '1 hour';`).catch(() => {});
  } catch (err: any) {
    console.warn('[RateLimit] Database log failed, memory fallback active:', err.message);
  }
}

export async function clearFailedLogin(ip: string, normalizedEmail: string): Promise<void> {
  const ipKey = `ip:${ip}`;
  const emailKey = `email:${normalizedEmail}`;

  memoryStore.delete(ipKey);
  memoryStore.delete(emailKey);

  try {
    await query(
      `DELETE FROM auth_login_attempts WHERE identifier IN ($1, $2);`,
      [ipKey, emailKey]
    );
  } catch (err: any) {
    console.warn('[RateLimit] Database clear failed:', err.message);
  }
}
