import type { EventHandler } from 'shared/src/types/discord.types';
import { Client, ActivityType } from 'discord.js';

const readyEvent: EventHandler = {
  name: 'clientReady',
  once: true,

  execute(client: Client) {
    if (!client.user) return;

    console.log(`✅ Discord bot ready as ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} guild(s)`);

    // Set default presence
    client.user.setPresence({
      activities: [
        {
          name: '🤖 Discord Bot | /help',
          type: ActivityType.Custom,
        },
      ],
      status: 'online',
    });
  },
};

export default readyEvent;
