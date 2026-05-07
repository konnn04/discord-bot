import type { EventHandler } from 'shared/src/types/discord.types';
import { Interaction, MessageFlags } from 'discord.js';
import { ContextAdapter } from '../contexts/context-adapter';
import { getPlayerManager } from '../services/music/player-manager';
import { getMusicApi } from '../services/music/music-api.client';

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

    // ====== Autocomplete Interactions ======
    if (interaction.isAutocomplete()) {
      if (!deps?.commandLoader) return;
      const cmd = deps.commandLoader.getCommand(interaction.commandName);
      const focused = interaction.options.getFocused();
      if (cmd?.autocomplete && focused && String(focused).length >= 2) {
        try {
          const api = getMusicApi();
          const results = await api.search(String(focused), 'spotify', 10);
          await interaction.respond(
            results.map((t) => ({
              name: `${t.artist || ''} — ${t.title}`.slice(0, 100),
              value: `${t.artist || ''} — ${t.title}`.slice(0, 100),
            })),
          );
        } catch {
          await interaction.respond([]);
        }
      } else {
        await interaction.respond([]);
      }
      return;
    }

    // ====== Slash Command Interactions ======
    if (!interaction.isChatInputCommand()) return;
    if (!deps?.commandLoader) return;

    const ctx = new ContextAdapter(interaction);

    // Resolve command: if subcommand, look up "parent:child"
    let commandName = interaction.commandName;
    const subName = ctx.getSubcommand();
    if (subName) {
      commandName = `${interaction.commandName}:${subName}`;
    }

    const command = deps.commandLoader.getCommand(commandName);
    if (!command) {
      console.warn(`[WARN] Command "${commandName}" not found`);
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
      await command.execute(ctx, deps);
    } catch (error) {
      console.error(`[ERROR] Command "${commandName}" failed:`, error);
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
        /* ignore */
      }
    }
  },
};

export default interactionCreateEvent;
