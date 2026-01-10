import { BotClient } from '../types/bot.types';

export default {
  name: 'clientReady',
  once: true,
  execute(client: BotClient) {
    console.log(`[SUCCESS] Logged in as ${client.user?.tag}`);

    client.rpc.setText('Is starting up...', 'idle').catch(console.error);
    client.rpc.setStatus('idle').catch(console.error);
  },
};