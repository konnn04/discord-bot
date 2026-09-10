import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getGiftcodeAction } from '../../actions';
import {
  buildGiftcodeEmbeds,
  giftcodeGameLabel,
} from '../../../giftcode/giftcode-notify';
import { GIFTCODE_GAMES } from 'shared/src/types/settings.types';

const giftcodeCommand: ActionCommand = {
  name: 'giftcode',
  description:
    'Lấy danh sách giftcode mới nhất của các game (HoYoverse, WuWa, NTE, Arknights, WWM...)',
  category: 'common',
  optionalArgs: [
    {
      name: 'game',
      description: 'Chọn game bạn muốn xem giftcode',
      type: 'STRING',
      required: true,
      choices: GIFTCODE_GAMES.map((g) => ({
        name: g.label,
        value: g.id,
      })),
    },
  ],

  async execute(ctx: ContextAdapter) {
    const game = ctx.getOption('game', 'string') as string;

    await ctx.defer();

    const result = await getGiftcodeAction({ game });
    if (!result.ok) {
      await ctx.editReply(`❌ ${result.message}`);
      return;
    }
    const entries = result.data ?? [];
    if (entries.length === 0) {
      await ctx.editReply(
        '❌ Hiện tại không có giftcode nào khả dụng cho game này.',
      );
      return;
    }

    const embeds = buildGiftcodeEmbeds(giftcodeGameLabel(game), entries);
    await ctx.editReply({ embeds: embeds.slice(0, 10) });
    for (let i = 10; i < embeds.length; i += 10) {
      if (ctx.channel) {
        await ctx.channel.send({ embeds: embeds.slice(i, i + 10) });
      }
    }
  },
};

export default giftcodeCommand;
