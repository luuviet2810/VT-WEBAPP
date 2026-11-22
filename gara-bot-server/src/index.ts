import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { checkDatabaseHealth, closeDatabasePool } from './database/index.js';
import { setupTelegramBot, startBotPolling } from './telegram/bot.js';

export const app = express();

const allowedOrigins = [
  config.cors.frontendUrl,
  'https://admin-vtauto.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép các request không có origin (curl, server-to-server, mobile app)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    // Cho phép origin nhưng cảnh báo
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());

// Mount modular API and Health routes
app.use(routes);

// Global centralized error handler
app.use(errorHandler);

export async function startServer(port = config.port) {
  const host = '0.0.0.0';
  const server = app.listen(port, host, async () => {
    console.log(`[VT AUTO API Server] listening on http://${host}:${port}`);

    // Test Neon PostgreSQL connection on startup
    const dbHealth = await checkDatabaseHealth();
    if (dbHealth.ok) {
      console.log(`[Database] Neon PostgreSQL connected successfully (${dbHealth.latencyMs}ms, ${dbHealth.version})`);
    } else {
      console.warn(`[Database] Neon PostgreSQL connection warning: ${dbHealth.error}`);
    }

    // Initialize Telegram Bot without interruption
    try {
      await setupTelegramBot();
      await startBotPolling();
      console.log('[Telegram Bot] Bot initialized and polling started');
    } catch (err: any) {
      console.error('[Telegram Bot] Failed to initialize bot:', err.message);
    }
  });

  process.on('SIGINT', async () => {
    console.log('\nShutting down server gracefully...');
    server.close(async () => {
      await closeDatabasePool();
      console.log('Server and database pool closed.');
      process.exit(0);
    });
  });

  return server;
}

const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (entryFile && (entryFile === currentFile || entryFile.endsWith('dist/index.js') || entryFile.endsWith('src/index.ts'))) {
  startServer();
}

export default app;
