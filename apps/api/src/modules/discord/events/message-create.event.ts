import type { EventHandler } from 'shared/src/types/discord.types';
import { Message } from 'discord.js';
import { ContextAdapter } from '../contexts/context-adapter';
import { isStalkRateLimited } from '../services/stalk-rate-limit';

const messageCreateEvent: EventHandler = {
  name: 'messageCreate',

  async execute(message: Message, deps: any) {
    // Ignore bots
    if (message.author.bot) return;

    // —— Stalker: message tracking (non-command messages only) ——
    if (deps?.prisma && message.guildId) {
      void (async () => {
        // Check if message starts with a prefix → not a natural conversation
        let prefix = 'f!';
        if (deps?.guildSettings) {
          prefix = deps.guildSettings.getPrefix(message.guildId!);
        } else if (deps?.globalSettings) {
          prefix = deps.globalSettings.get().bot.defaultPrefix;
        }
        if (message.content.startsWith(prefix)) return;

        const prisma = deps.prisma;

        // Find subscriptions with onMessage=true for this user
        const subs = await prisma.client.stalkerSubscription.findMany({
          where: { targetId: message.author.id, onMessage: true },
        });

        for (const sub of subs) {
          // 5-min rate limit via in-memory Map (lighter than DB write)
          if (isStalkRateLimited(sub.id, 'message')) continue;

          // Cross-guild context
          const eventGuild = message.guild;
          const same = eventGuild?.members.cache.has(sub.trackerId);
          const guildLabel = same
            ? `**${eventGuild!.name}**`
            : '**server khác**';

          try {
            const tracker = await message.client.users
              .fetch(sub.trackerId)
              .catch(() => null);
            if (!tracker) continue;

            const channelMention = `<#${message.channelId}>`;
            const preview =
              message.content.slice(0, 100) +
              (message.content.length > 100 ? '...' : '');
            await tracker.send(
              `💬 **Stalker Alert:** <@${message.author.id}> vừa nhắn tại ${channelMention} ở ${guildLabel}:\n` +
                `> ${preview}`,
            );
          } catch {
            /* DMs closed */
          }
        }
      })();
    }

    if (!deps?.commandLoader) return;

    // Determine prefix for this guild
    let prefix = 'f!';
    if (message.guildId && deps?.guildSettings) {
      prefix = deps.guildSettings.getPrefix(message.guildId);
    } else if (deps?.globalSettings) {
      prefix = deps.globalSettings.get().bot.defaultPrefix;
    }

    // Check if message starts with prefix
    if (!message.content.startsWith(prefix)) {
      // Not a command, give XP!
      if (message.guildId && deps?.xpBuffer) {
        deps.xpBuffer.addMessageXp(
          message.author.id,
          message.guildId,
          message.author.username,
          message.channelId,
          message.author.avatar,
        );
      }
      return;
    }

    // Parse command name
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args[0]?.toLowerCase();
    if (!commandName) return;

    // Get command
    const command = deps.commandLoader.getCommand(commandName);
    if (!command) return;

    // Check if command is slash-only
    if (command.isOnlySlashCommand) {
      await message
        .reply({
          content: `❌ Lệnh này chỉ dùng được qua slash command. Hãy dùng \`/${commandName}\`.`,
        })
        .catch(() => {});
      return;
    }

    // Permission check
    if (command.permission !== undefined && deps?.permissionService) {
      const member = message.member;
      if (
        !deps.permissionService.hasPermission(
          message.author.id,
          member,
          command.permission,
        )
      ) {
        await message
          .reply({ content: '🔒 Bạn không có quyền sử dụng lệnh này.' })
          .catch(() => {});
        return;
      }
    }

    // Cooldown check
    if (deps?.cooldownService) {
      const remaining = deps.cooldownService.check(
        command.name,
        message.author.id,
        command.cooldown,
      );
      if (remaining > 0) {
        const reply = await message.reply({
          content: `⏰ Vui lòng chờ ${remaining.toFixed(1)}s trước khi dùng \`${command.name}\` lần nữa.`,
        });

        setTimeout(() => reply.delete().catch(() => {}), 5000);
        return;
      }
    }

    // Execute command
    try {
      const ctx = new ContextAdapter(message, commandName);
      await command.execute(ctx, deps);
    } catch (error) {
      console.error(`[ERROR] Command "${command.name}" failed:`, error);
      await message
        .reply({ content: '❌ Đã xảy ra lỗi khi thực hiện lệnh!' })
        .catch(() => {});
    }
  },
};

export default messageCreateEvent;
