import { Request, Response } from 'express';
import { checkDatabaseHealth } from '../database/index.js';
import { checkR2Health } from '../storage/r2.service.js';
import { getFullHealthReport } from '../services/health.service.js';

export async function getBasicHealth(req: Request, res: Response) {
  res.json({
    ok: true,
    service: 'gara-bot-server',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

export async function getDatabaseHealth(req: Request, res: Response) {
  const result = await checkDatabaseHealth();
  const statusCode = result.ok ? 200 : 503;
  res.status(statusCode).json({
    ok: result.ok,
    service: 'neon-postgresql',
    data: result,
  });
}

export async function getStorageHealth(req: Request, res: Response) {
  const result = await checkR2Health();
  const statusCode = result.ok ? 200 : 503;
  res.status(statusCode).json({
    ok: result.ok,
    service: 'cloudflare-r2',
    data: result,
  });
}

export async function getFullHealth(req: Request, res: Response) {
  const report = await getFullHealthReport();
  const statusCode = report.ok ? 200 : 503;
  res.status(statusCode).json(report);
}
