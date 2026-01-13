import { BotClient } from '../types/bot.types';
import { readdirSync } from 'fs';
import { join } from 'path';

export async function loadEvents(client: BotClient) {
  const eventsPath = join(process.cwd(), 'src', 'bot', 'events');
  const eventFiles = readdirSync(eventsPath).filter(
    file => (file.endsWith('.ts') || file.endsWith('.js')) && file !== 'index.ts' && file !== 'index.js'
  );

  for (const file of eventFiles) {
    const event = (await import(join(eventsPath, file))).default;
    
    if (!event || !event.name) {
      console.warn(`⚠️ Event file ${file} is missing name or default export`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
      console.log(`✅ Loaded event: ${event.name} (once)`);
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
      console.log(`✅ Loaded event: ${event.name} (on)`);
    }
  }
}