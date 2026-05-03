import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder, User } from 'discord.js';

/**
 * Factory to create nekos.best emote commands.
 * Each command fetches a random GIF from nekos.best API and sends it as an embed.
 */
export function createEmoteCommand(
  name: string,
  endpoint: string,
  description: string,
  actionText: {
    self: string; // e.g. "{user} tự ôm mình 🤗"
    target: string; // e.g. "{user} ôm {target} 🤗"
  },
  color: number = 0xfe6598,
): ActionCommand {
  return {
    name: `e_${name}`,
    description,
    category: 'emote',
    optionalArgs: [
      {
        name: 'user',
        description: 'Người bạn muốn tương tác',
        type: 'USER',
        required: false,
      },
    ],

    async execute(ctx: ContextAdapter) {
      const target = ctx.getOption('user', 'user') as User | null;

      // Fetch GIF from nekos.best
      let gifUrl: string;
      try {
        const res = await fetch(`https://nekos.best/api/v2/${endpoint}`);
        const data = await res.json();
        gifUrl = data.results?.[0]?.url;

        if (!gifUrl) {
          await ctx.reply('❌ Không thể tải ảnh. Vui lòng thử lại.');
          return;
        }
      } catch {
        await ctx.reply('❌ Lỗi kết nối tới API. Vui lòng thử lại sau.');
        return;
      }

      const authorName = ctx.author.displayName || ctx.author.username;
      let text: string;

      if (target && target.id !== ctx.author.id) {
        const targetName = target.displayName || target.username;
        text = actionText.target
          .replace('{user}', `**${authorName}**`)
          .replace('{target}', `**${targetName}**`);
      } else {
        text = actionText.self.replace('{user}', `**${authorName}**`);
      }

      const embed = new EmbedBuilder()
        .setDescription(text)
        .setImage(gifUrl)
        .setColor(color)
        .setFooter({
          text: 'Được cung cấp bởi nekos.best.',
        });

      await ctx.reply({ embeds: [embed] });
    },
  };
}
