import type { EventHandler } from 'shared/src/types/discord.types';
import { Interaction, MessageFlags } from 'discord.js';
import { ContextAdapter } from '../contexts/context-adapter';
import { getPlayerManager } from '../services/music/player-manager';

const interactionCreateEvent: EventHandler = {
  name: 'interactionCreate',

  async execute(interaction: Interaction, deps: any) {
    // ====== Music Button Interactions ======
    if (interaction.isButton()) {
      const musicButtons = [
        'music_prev',
        'music_pause',
        'music_skip',
        'music_stop',
        'music_lyrics',
      ];
      if (musicButtons.includes(interaction.customId)) {
        try {
          await getPlayerManager().handleButton(interaction);
        } catch (error) {
          console.error('[ERROR] Music button handler failed:', error);
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({
                content: '❌ Lỗi xử lý nút.',
                flags: MessageFlags.Ephemeral,
              });
            }
          } catch {
            /* ignore */
          }
        }
        return;
      }
    }

    // ====== Slash Command Interactions ======
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
          flags: MessageFlags.Ephemeral,
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
          flags: MessageFlags.Ephemeral,
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
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch {
        // Silently fail if we can't send error message
      }
    }
  },
};

export default interactionCreateEvent;
