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

app.use(cors({
  origin: [config.cors.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

app.use(express.json());

// Mount modular API and Health routes
app.use(routes);

// Global centralized error handler
app.use(errorHandler);

export async function startServer(port = config.port) {
  const server = app.listen(port, async () => {
    console.log(`[VT AUTO API Server] listening on port :${port}`);

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
