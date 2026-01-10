import { startBot } from './bot';
import { createApp } from './api/app';
import { config } from './config/env';

async function start() {
  try {
    const bot = await startBot();
    console.log('[SUCCESS] Discord bot started');

    const app = await createApp(bot);
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