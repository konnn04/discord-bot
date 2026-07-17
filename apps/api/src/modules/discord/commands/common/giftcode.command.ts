import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';
import { getGiftcodeAction } from '../../actions';

const gameNames: Record<string, string> = {
  genshin: 'Genshin Impact',
  hkrpg: 'Honkai: Star Rail',
  honkai3rd: 'Honkai Impact 3rd',
  nap: 'Zenless Zone Zero',
  tot: 'Tears of Themis',
};

const gameColors: Record<string, number> = {
  genshin: 0xffffff,
  hkrpg: 0x3d3580,
  honkai3rd: 0x00d4ff,
  nap: 0x111111,
  tot: 0xd82b2b,
};

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
      choices: [
        { name: 'Genshin Impact', value: 'genshin' },
        { name: 'Honkai: Star Rail', value: 'hkrpg' },
        { name: 'Honkai Impact 3rd', value: 'honkai3rd' },
        { name: 'Zenless Zone Zero', value: 'nap' },
        { name: 'Tears of Themis', value: 'tot' },
      ],
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
    const codes = result.data ?? [];
    if (codes.length === 0) {
      await ctx.editReply(
        '❌ Hiện tại không có giftcode nào khả dụng cho game này.',
      );
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎁 Giftcode ${gameNames[game] || game}`)
      .setColor(gameColors[game] || 0xffffff)
      .setFooter({
        text: 'Dữ liệu từ seria.moe',
        iconURL:
          'https://cdn.discordapp.com/emojis/1149957778942369873.webp?size=96&quality=lossless',
      })
      .setTimestamp();

    let desc = '';
    for (const c of codes) {
      let link = '';
      if (game === 'genshin')
        link = `https://genshin.hoyoverse.com/vi/gift?code=${c.code}`;
      else if (game === 'hkrpg')
        link = `https://hsr.hoyoverse.com/gift?code=${c.code}`;
      else if (game === 'nap')
        link = `https://zenless.hoyoverse.com/redemption?code=${c.code}`;

      const displayCode = link
        ? `**[${c.code}](${link})**`
        : `**\`${c.code}\`**`;
      desc += `${displayCode}\n└ 🎁 ${c.rewards || 'Không rõ'}\n\n`;
    }

    embed.setDescription(desc);
    await ctx.editReply({ embeds: [embed] });
  },
};

export default giftcodeCommand;
