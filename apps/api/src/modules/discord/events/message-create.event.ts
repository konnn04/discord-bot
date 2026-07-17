import type { EventHandler } from 'shared/src/types/discord.types';
import { Message } from 'discord.js';
import { ContextAdapter } from '../contexts/context-adapter';
import { isStalkRateLimited } from '../services/stalk-rate-limit';
import { getSpeakManager } from '../services/speak/speak-manager';
import { getChatbotService } from '../chatbot/chatbot.service';

const messageCreateEvent: EventHandler = {
  name: 'messageCreate',

  async execute(message: Message, deps: any) {
    if (message.author.bot) return;

    if (deps?.prisma && message.guildId) {
      void (async () => {
        let prefix = 'f!';
        if (deps?.guildSettings) {
          prefix = deps.guildSettings.getPrefix(message.guildId!);
        } else if (deps?.globalSettings) {
          prefix = deps.globalSettings.get().bot.defaultPrefix;
        }
        if (message.content.startsWith(prefix)) return;

        const prisma = deps.prisma;

        const subs = await prisma.client.stalkerSubscription.findMany({
          where: { targetId: message.author.id, onMessage: true },
        });

        for (const sub of subs) {
          if (isStalkRateLimited(sub.id, 'message')) continue;

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

    if (
      message.guildId &&
      message.client.user &&
      message.mentions.has(message.client.user, {
        ignoreEveryone: true,
        ignoreRoles: true,
        ignoreRepliedUser: true,
      })
    ) {
      void getChatbotService()
        .handleMention(message, deps)
        .catch(() => {});
      return;
    }

    if (!deps?.commandLoader) return;

    let prefix = 'f!';
    if (message.guildId && deps?.guildSettings) {
      prefix = deps.guildSettings.getPrefix(message.guildId);
    } else if (deps?.globalSettings) {
      prefix = deps.globalSettings.get().bot.defaultPrefix;
    }

    if (!message.content.startsWith(prefix)) {
      if (message.guildId && message.content) {
        getSpeakManager().enqueue(
          message.guildId,
          message.channelId,
          message.content,
          {
            id: message.author.id,
            displayName: message.member?.displayName ?? message.author.username,
          },
        );
      }

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

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args[0]?.toLowerCase();
    if (!commandName) return;

    const command = deps.commandLoader.getCommand(commandName);
    if (!command) return;

    if (command.isOnlySlashCommand) {
      await message
        .reply({
          content: `❌ Lệnh này chỉ dùng được qua slash command. Hãy dùng \`/${commandName}\`.`,
        })
        .catch(() => {});
      return;
    }

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
