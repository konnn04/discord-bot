/**
 * Stalker: notify subscribers when a tracked user changes presence (online status or game activity).
 */
import type { EventHandler } from 'shared/src/types/discord.types';
import { ActivityType, Presence, type Client } from 'discord.js';
import type { PrismaService } from '../../prisma/prisma.service';
import { isStalkRateLimited } from '../services/stalk-rate-limit';

/** Cross-guild context: whether tracker and target share the event's guild */
function resolveGuildContext(
  client: Client,
  trackerId: string,
  eventGuildId: string | undefined,
): { same: boolean; guildName: string } {
  if (!eventGuildId) return { same: false, guildName: 'server khác' };
  const eventGuild = client.guilds.cache.get(eventGuildId);
  if (!eventGuild) return { same: false, guildName: 'server khác' };
  const same = eventGuild.members.cache.has(trackerId);
  return {
    same,
    guildName: same ? `**${eventGuild.name}**` : '**server khác**',
  };
}

const presenceUpdateEvent: EventHandler = {
  name: 'presenceUpdate',

  async execute(
    oldPresence: Presence | null,
    newPresence: Presence,
    deps?: any,
  ) {
    const prisma = deps?.prisma as PrismaService | undefined;
    if (!prisma) return;

    const user = newPresence.user;
    if (!user || user.bot) return;

    // —— Online status tracking ——
    const oldStatus = oldPresence?.status;
    const newStatus = newPresence.status;

    // Only fire when going from offline/invisible → online/dnd/idle
    if (
      oldStatus &&
      oldStatus !== newStatus &&
      (oldStatus === 'offline' || oldStatus === 'invisible') &&
      newStatus !== 'offline' &&
      newStatus !== 'invisible'
    ) {
      const subs = await prisma.client.stalkerSubscription.findMany({
        where: { targetId: user.id, onOnline: true },
      });
      if (subs.length > 0) {
        const client = newPresence.client;
        const eventGuildId = newPresence.guild?.id;
        for (const sub of subs) {
          if (isStalkRateLimited(sub.id, 'online')) continue;
          try {
            const tracker = await client.users
              .fetch(sub.trackerId)
              .catch(() => null);
            if (!tracker) continue;
            const ctx = resolveGuildContext(
              client,
              sub.trackerId,
              eventGuildId,
            );
            const device = newPresence.clientStatus
              ? Object.keys(newPresence.clientStatus)[0] || 'unknown'
              : 'unknown';
            const deviceStr =
              device === 'mobile'
                ? '📱 điện thoại'
                : device === 'desktop'
                  ? '🖥️ máy tính'
                  : device === 'web'
                    ? '🌐 web'
                    : '';
            await tracker.send(
              `🟢 **Stalker Alert:** <@${user.id}> vừa online ${deviceStr} tại ${ctx.guildName}!`,
            );
          } catch {
            /* DMs closed */
          }
        }
      }
    }

    // —— Game activity tracking ——
    const subs = await prisma.client.stalkerSubscription.findMany({
      where: { targetId: user.id, onGame: true },
    });
    if (subs.length === 0) return;

    const gameActivity = newPresence.activities.find(
      (a) => a.type === ActivityType.Playing,
    );
    if (!gameActivity || !gameActivity.name) return;

    const oldGame = oldPresence?.activities.find(
      (a) => a.type === ActivityType.Playing,
    );
    if (oldGame?.name === gameActivity.name) return;

    const client = newPresence.client;
    const eventGuildId = newPresence.guild?.id;

    for (const sub of subs) {
      if (isStalkRateLimited(sub.id, 'game')) continue;
      try {
        const tracker = await client.users
          .fetch(sub.trackerId)
          .catch(() => null);
        if (!tracker) continue;
        const ctx = resolveGuildContext(client, sub.trackerId, eventGuildId);
        await tracker.send(
          `🎮 **Stalker Alert:** <@${user.id}> vừa vào chơi **${gameActivity.name}** tại ${ctx.guildName}!`,
        );
      } catch {
        /* DMs closed */
      }
    }
  },
};

export default presenceUpdateEvent;
