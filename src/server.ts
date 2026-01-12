import { startBot } from './bot';
import { createApp } from './api/app';
import { config } from './config/env';

import { db } from './database/client';

async function start() {
  try {
    const bot = await startBot(db);
    console.log('[SUCCESS] Discord bot started');

    const app = await createApp(bot, db);
    await app.listen({ 
      port: config.server.port, 
      host: config.server.host,
    });
    
    console.log(`[SUCCESS] API server running on http://${config.server.host}:${config.server.port}`);
  } catch (error) {
    console.error('[ERROR] Startup error:', error);
    process.exit(1);
  }
}

start();