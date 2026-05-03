import type { EventHandler } from 'shared/src/types/discord.types';
import { Interaction } from 'discord.js';
import { ContextAdapter } from '../contexts/context-adapter';

const interactionCreateEvent: EventHandler = {
  name: 'interactionCreate',

  async execute(interaction: Interaction, deps: any) {
    if (!interaction.isChatInputCommand()) return;
    if (!deps?.commandLoader) return;

    const command = deps.commandLoader.getCommand(interaction.commandName);
    if (!command) {
      console.warn(`[WARN] Command "${interaction.commandName}" not found`);
      return;
    }

    // Permission check
    if (command.permission !== undefined && deps?.permissionService) {
      const member = interaction.member as any;
      if (
        !deps.permissionService.hasPermission(
          interaction.user.id,
          member,
          command.permission,
        )
      ) {
        await interaction.reply({
          content: '🔒 Bạn không có quyền sử dụng lệnh này.',
          ephemeral: true,
        });
        return;
      }
    }

    // Cooldown check
    if (deps?.cooldownService) {
      const remaining = deps.cooldownService.check(
        command.name,
        interaction.user.id,
        command.cooldown,
      );
      if (remaining > 0) {
        await interaction.reply({
          content: `⏰ Vui lòng chờ ${remaining.toFixed(1)}s trước khi dùng \`${command.name}\` lần nữa.`,
          ephemeral: true,
        });
        return;
      }
    }

    try {
      const ctx = new ContextAdapter(interaction);
      await command.execute(ctx, deps);
    } catch (error) {
      console.error(`[ERROR] Command "${command.name}" failed:`, error);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: '❌ Đã xảy ra lỗi khi thực hiện lệnh!',
          });
        } else {
          await interaction.reply({
            content: '❌ Đã xảy ra lỗi khi thực hiện lệnh!',
            ephemeral: true,
          });
        }
      } catch {
        // Silently fail if we can't send error message
      }
    }
  },
};

export default interactionCreateEvent;
