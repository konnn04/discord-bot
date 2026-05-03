import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';

interface HoyoApiResponse {
  codes: Array<{
    id: number;
    code: string;
    status: string;
    game: string;
    rewards: string;
  }>;
  game: string;
}

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

    try {
      const response = await fetch(
        `https://hoyo-codes.seria.moe/codes?game=${game}`,
      );

      if (!response.ok) {
        await ctx.editReply('❌ Lỗi khi tải dữ liệu giftcode từ server.');
        return;
      }

      const data = (await response.json()) as HoyoApiResponse;

      if (!data || !data.codes || data.codes.length === 0) {
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
      for (const c of data.codes) {
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
    } catch (err) {
      console.error(err);
      await ctx.editReply(
        '❌ Đã xảy ra lỗi khi kết nối tới server lấy giftcode.',
      );
    }
  },
};

export default giftcodeCommand;
