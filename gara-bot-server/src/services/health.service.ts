import { checkDatabaseHealth, DatabaseHealthResult } from '../database/index.js';
import { checkR2Health, R2HealthResult } from '../storage/r2.service.js';

export interface FullHealthReport {
  ok: boolean;
  service: string;
  uptimeSeconds: number;
  timestamp: string;
  database: DatabaseHealthResult;
  storage: R2HealthResult;
}

export async function getFullHealthReport(): Promise<FullHealthReport> {
  const [dbHealth, r2Health] = await Promise.all([
    checkDatabaseHealth(),
    checkR2Health(),
  ]);

  const allOk = dbHealth.ok; // R2 might not be configured yet with secrets

  return {
    ok: allOk,
    service: 'gara-bot-server',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbHealth,
    storage: r2Health,
  };
}
