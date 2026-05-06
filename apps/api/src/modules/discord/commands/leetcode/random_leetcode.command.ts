import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getLeetcodeApi } from '../../services/leetcode-api.client';
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from 'discord.js';

const DIFF_COLORS: Record<string, number> = {
  Easy: 0x00b8a3,
  Medium: 0xffc01e,
  Hard: 0xef4743,
};

const randomLeetcode: ActionCommand = {
  name: 'random_leetcode',
  description: 'Lấy một bài LeetCode ngẫu nhiên',
  category: 'leetcode',
  permission: PermissionLevel.EVERYONE,
  optionalArgs: [
    {
      name: 'difficulty',
      description: 'Độ khó mong muốn (Easy/Medium/Hard)',
      type: 'STRING',
      required: false,
      choices: [
        { name: 'Easy', value: 'easy' },
        { name: 'Medium', value: 'medium' },
        { name: 'Hard', value: 'hard' },
      ],
    },
    {
      name: 'tag',
      description: 'Chủ đề (vd: array, two-pointers, dp)',
      type: 'STRING',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter) {
    await ctx.defer();

    const difficulty = ctx.getOption('difficulty', 'string') as string | null;
    const tag = ctx.getOption('tag', 'string') as string | null;

    try {
      const api = getLeetcodeApi();
      const problem = await api.getRandom(
        difficulty || undefined,
        tag || undefined,
      );

      const color = DIFF_COLORS[problem.difficulty] || 0x7c3aed;
      const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Mở trên LeetCode')
          .setURL(problem.url)
          .setStyle(ButtonStyle.Link),
      );

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${problem.frontend_id}. ${problem.title}`)
        .setURL(problem.url)
        .addFields(
          {
            name: 'Độ khó',
            value: `\`${problem.difficulty}\``,
            inline: true,
          },
          {
            name: 'ID',
            value: `#${problem.frontend_id}`,
            inline: true,
          },
        )
        .setFooter({ text: 'LeetCode Random • Giải thử đi!' });

      await ctx.editReply({ embeds: [embed], components: [button] });
    } catch (err: any) {
      await ctx.editReply(
        `❌ Không thể lấy bài: ${err.message || 'Lỗi không xác định.'}`,
      );
    }
  },
};

export default randomLeetcode;
