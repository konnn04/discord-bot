import type { ActionCommand } from 'shared/src/types/discord.types';
import { PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';

const ping: ActionCommand = {
  name: 'ping',
  description: 'Kiểm tra độ trễ của bot',
  category: 'common',
  permission: PermissionLevel.EVERYONE,

  async execute(ctx: ContextAdapter) {
    const sent = Date.now();
    await ctx.reply('🏓 Đang đo...');
    const latency = Date.now() - sent;
    const wsLatency = ctx.client.ws.ping;

    await ctx.editReply(
      `🏓 **Pong!**\n` +
        `📡 API Latency: \`${latency}ms\`\n` +
        `💓 WebSocket: \`${wsLatency}ms\``,
    );
  },
};

export default ping;
