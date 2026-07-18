import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getGiftcodeAction } from '../../actions';
import {
  buildGiftcodeEmbed,
  giftcodeGameLabel,
} from '../../../giftcode/giftcode-notify';
import { HOYOVERSE_GAME_IDS } from 'shared/src/types/settings.types';

const giftcodeCommand: ActionCommand = {
  name: 'giftcode',
  description: 'Lấy danh sách giftcode mới nhất của các game Hoyoverse',
  category: 'common',
  optionalArgs: [
    {
      name: 'game',
      description: 'Chọn game bạn muốn xem giftcode',
      type: 'STRING',
      required: true,
      choices: HOYOVERSE_GAME_IDS.map((id) => ({
        name: giftcodeGameLabel(id),
        value: id,
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

    const embed = buildGiftcodeEmbed(giftcodeGameLabel(game), entries);
    await ctx.editReply({ embeds: [embed] });
  },
};

export default giftcodeCommand;
