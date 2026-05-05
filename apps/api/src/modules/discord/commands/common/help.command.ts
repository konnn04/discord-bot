import { EmbedBuilder } from 'discord.js';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { paginate } from '../../utils/pagination';

/**
 * NOTE: This command accesses the command loader at runtime via a workaround.
 * In a future refactor, commands could be NestJS-injectable classes
 * that receive services via constructor injection.
 * For now, we use a global reference set during bootstrap.
 */

const help: ActionCommand = {
  name: 'help',
  description: 'Hiển thị danh sách lệnh hoặc thông tin chi tiết về một lệnh',
  helpDescription:
    'Xem danh sách tất cả các lệnh hoặc thông tin chi tiết về một lệnh cụ thể.',
  category: 'common',
  permission: PermissionLevel.EVERYONE,
  optionalArgs: [
    {
      name: 'command',
      description: 'Tên lệnh muốn xem chi tiết',
      type: 'STRING',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    const targetCommand = ctx.getOption('command', 'string') as string | null;

    if (targetCommand && deps?.commandLoader) {
      // Show details for a specific command
      const cmd = deps.commandLoader.getCommand(targetCommand);
      if (!cmd) {
        await ctx.reply(`❌ Không tìm thấy lệnh \`${targetCommand}\`.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📖 Lệnh: ${cmd.name}`)
        .setDescription(cmd.helpDescription || cmd.description)
        .setColor(0x5865f2)
        .addFields(
          { name: '📁 Danh mục', value: cmd.category || 'N/A', inline: true },
          {
            name: '⏱️ Cooldown',
            value: cmd.cooldown ? `${cmd.cooldown / 1000}s` : 'Mặc định',
            inline: true,
          },
          {
            name: '🔒 Quyền',
            value: PermissionLevel[cmd.permission ?? 0],
            inline: true,
          },
        );

      if (cmd.optionalArgs && cmd.optionalArgs.length > 0) {
        const argsText = cmd.optionalArgs
          .map(
            (a: any) =>
              `\`${a.name}\` — ${a.description}${a.required ? ' *(bắt buộc)*' : ''}`,
          )
          .join('\n');
        embed.addFields({ name: '⚙️ Tham số', value: argsText });
      }

      await ctx.reply({ embeds: [embed] });
      return;
    }

    // Show all commands grouped by category
    if (!deps?.commandLoader) {
      await ctx.reply('❌ Chưa tải được danh sách lệnh.');
      return;
    }

    const categories = deps.commandLoader.getCommandsByCategory() as Map<
      string,
      ActionCommand[]
    >;
    const categoriesList = Array.from(categories.entries());
    const pages: EmbedBuilder[] = [];
    const itemsPerPage = 3;
    const totalPages = Math.ceil(categoriesList.length / itemsPerPage);

    for (let p = 0; p < totalPages; p++) {
      const embed = new EmbedBuilder()
        .setTitle('📚 Danh sách lệnh')
        .setDescription('Sử dụng `/help <tên lệnh>` để xem chi tiết.')
        .setColor(0x5865f2)
        .setTimestamp();

      const chunk = categoriesList.slice(
        p * itemsPerPage,
        (p + 1) * itemsPerPage,
      );
      for (const [category, commands] of chunk) {
        const commandList = commands
          .map((c: ActionCommand) => `\`${c.name}\` — ${c.description}`)
          .join('\n');
        embed.addFields({
          name: `📁 ${category.charAt(0).toUpperCase() + category.slice(1)}`,
          value: commandList || 'Trống',
        });
      }
      pages.push(embed);
    }

    const msgOrInteraction = await ctx.defer();
    await paginate(msgOrInteraction, pages, ctx.userId);
  },
};

export default help;
