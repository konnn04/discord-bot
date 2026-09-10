import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { contextFromCommand, crawlGiftcodeAction } from '../../actions';
import {
  buildGiftcodeEmbeds,
  buildGiftcodeEmbed,
  giftcodeGameLabel,
} from '../../../giftcode/giftcode-notify';
import { GIFTCODE_CRAWL_SOURCES } from '../../../giftcode-crawler/sources';

const CRAWL_GAME_CHOICES = Object.keys(GIFTCODE_CRAWL_SOURCES).map((id) => ({
  name: giftcodeGameLabel(id),
  value: id,
}));

const giftcodeOtherCommand: ActionCommand = {
  name: 'giftcode_other',
  description:
    'Cào giftcode mới nhất cho game chưa có API chính thức (NTE, Wuthering Waves, Arknights...)',
  category: 'common',
  optionalArgs: [
    {
      name: 'game',
      description: 'Chọn game bạn muốn xem giftcode',
      type: 'STRING',
      required: true,
      choices: CRAWL_GAME_CHOICES,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    const game = ctx.getOption('game', 'string') as string;

    const actionCtx = contextFromCommand(ctx, deps);
    if (!actionCtx) {
      await ctx.reply('❌ Lệnh này chỉ dùng được trong server.');
      return;
    }

    await ctx.defer();

    const result = await crawlGiftcodeAction(actionCtx, { game });
    if (!result.ok || !result.data) {
      await ctx.editReply(`❌ ${result.message}`);
      return;
    }

    const embeds = buildGiftcodeEmbeds(giftcodeGameLabel(game), result.data.entries);
    await ctx.editReply({ embeds: embeds.slice(0, 10) });
    for (let i = 10; i < embeds.length; i += 10) {
      if (ctx.channel) {
        await ctx.channel.send({ embeds: embeds.slice(i, i + 10) });
      }
    }
  },
};

export default giftcodeOtherCommand;
