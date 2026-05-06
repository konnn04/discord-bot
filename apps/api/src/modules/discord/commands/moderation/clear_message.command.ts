import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';

const clearMessage: ActionCommand = {
  name: 'clear',
  description: 'Xóa hàng loạt tin nhắn (1-255)',
  category: 'moderation',
  permission: PermissionLevel.MODERATOR,
  optionalArgs: [
    {
      name: 'amount',
      description: 'Số tin nhắn muốn xóa (1-255)',
      type: 'INTEGER',
      required: true,
      minValue: 1,
      maxValue: 255,
    },
  ],

  async execute(ctx: ContextAdapter) {
    const amount = (ctx.getOption('amount', 'integer') as number) || 0;
    if (amount < 1 || amount > 255) {
      await ctx.reply('❌ Số lượng phải từ 1 đến 255.');
      return;
    }

    const ch = ctx.channel;
    if (!ch) {
      await ctx.reply('❌ Không thể xác định kênh.');
      return;
    }

    await ctx.defer(true);

    try {
      // Bulk delete messages younger than 14 days
      const deleted = await ch.bulkDelete(amount, true);

      await ctx.editReply(`✅ Đã xóa **${deleted.size}** tin nhắn.`);
    } catch (err: any) {
      await ctx.editReply(`❌ Lỗi khi xóa: ${err.message}`);
    }
  },
};

export default clearMessage;
