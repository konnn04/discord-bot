import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';
import { contextFromCommand, crawlGiftcodeAction } from '../../actions';
import { GIFTCODE_GAMES } from 'shared/src/types/settings.types';
import { GIFTCODE_CRAWL_SOURCES } from '../../../giftcode-crawler/sources';

const CRAWL_GAME_CHOICES = Object.keys(GIFTCODE_CRAWL_SOURCES).map((id) => ({
  name: GIFTCODE_GAMES.find((g) => g.id === id)?.label ?? id,
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

    const label = GIFTCODE_GAMES.find((g) => g.id === game)?.label ?? game;
    const embed = new EmbedBuilder()
      .setTitle(`🎁 Giftcode ${label}`)
      .setColor(0x22c55e)
      .setDescription(result.data.codes.map((c) => `**\`${c}\`**`).join('\n'))
      .setFooter({
        text: 'Tự động cào từ web — kiểm tra hạn dùng trước khi nhập.',
      })
      .setTimestamp();

    await ctx.editReply({ embeds: [embed] });
  },
};

export default giftcodeOtherCommand;
