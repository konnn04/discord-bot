/**
 * Stalker: notify subscribers when a tracked user changes presence (game activity).
 */
import type { EventHandler } from 'shared/src/types/discord.types';
import { ActivityType, Presence } from 'discord.js';
import type { PrismaService } from '../../prisma/prisma.service';

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

    // Find all subscriptions targeting this user with onGame=true
    const subs = await prisma.client.stalkerSubscription.findMany({
      where: { targetId: user.id, onGame: true },
    });
    if (subs.length === 0) return;

    // Get current game activity
    const gameActivity = newPresence.activities.find(
      (a) => a.type === ActivityType.Playing,
    );
    if (!gameActivity || !gameActivity.name) return;

    // Check old presence to avoid duplicate notifications for same game
    const oldGame = oldPresence?.activities.find(
      (a) => a.type === ActivityType.Playing,
    );
    if (oldGame?.name === gameActivity.name) return;

    // DM each subscriber
    const client = newPresence.client;
    const guildName = newPresence.guild?.name;
    const guildSuffix = guildName ? ` tại **${guildName}**` : '';

    for (const sub of subs) {
      try {
        const tracker = await client.users
          .fetch(sub.trackerId)
          .catch(() => null);
        if (!tracker) continue;

        await tracker.send(
          `🎯 **Stalker Alert:** <@${user.id}> vừa vào chơi **${gameActivity.name}**${guildSuffix}!`,
        );
      } catch {
        /* DMs closed */
      }
    }
  },
};

export default presenceUpdateEvent;
