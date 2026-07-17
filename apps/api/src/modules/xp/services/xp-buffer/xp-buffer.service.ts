import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { GuildSettingsService } from '../../../settings/guild-settings.service';
import { Client } from 'discord.js';

interface XpBufferItem {
  xp: number;
  username: string;
  avatar?: string | null;
  lastChannelId?: string;
}

@Injectable()
export class XpBufferService implements OnModuleDestroy {
  private readonly logger = new Logger(XpBufferService.name);

  private buffer = new Map<string, XpBufferItem>();

  private cooldowns = new Map<string, number>();
  private userHashes = new Map<string, string>();

  private flushInterval: NodeJS.Timeout;
  private discordClient: Client | null = null;

  constructor(
    private prisma: PrismaService,
    private guildSettings: GuildSettingsService,
  ) {
    this.flushInterval = setInterval(() => void this.flush(), 30 * 1000);
  }

  setClient(client: Client) {
    this.discordClient = client;
  }

  onModuleDestroy() {
    clearInterval(this.flushInterval);
    return this.flush();
  }

  addMessageXp(
    userId: string,
    guildId: string,
    username: string,
    channelId: string,
    avatar?: string | null,
  ): void {
    const settings = this.guildSettings.get(guildId);
    if (!settings.features.xpTracking) return;

    const key = `${userId}:${guildId}`;
    const now = Date.now();
    const lastMessage = this.cooldowns.get(key) || 0;

    // Check cooldown
    if (now - lastMessage < settings.xp.messageCooldown * 1000) {
      return; // On cooldown
    }

    // Update cooldown and add XP
    this.cooldowns.set(key, now);
    this.addXp(
      userId,
      guildId,
      settings.xp.xpPerMessage,
      username,
      channelId,
      avatar,
    );
  }

  addVoiceXp(
    userId: string,
    guildId: string,
    minutes: number,
    username?: string,
    channelId?: string,
    avatar?: string | null,
  ): void {
    const settings = this.guildSettings.get(guildId);
    if (!settings.features.xpTracking) return;

    const xpToGive = settings.xp.xpPerVoiceMinute * minutes;
    this.addXp(
      userId,
      guildId,
      xpToGive,
      username || 'Unknown',
      channelId,
      avatar,
    );
  }

  private addXp(
    userId: string,
    guildId: string,
    amount: number,
    username: string,
    channelId?: string,
    avatar?: string | null,
  ): void {
    const key = `${userId}:${guildId}`;
    const current = this.buffer.get(key) || { xp: 0, username };

    current.xp += amount;
    current.username = username;
    if (avatar !== undefined) {
      current.avatar = avatar;
    }
    if (channelId) {
      current.lastChannelId = channelId;
    }
    this.buffer.set(key, current);
  }

  /** Flush buffered XP to the database */
  async flush(): Promise<void> {
    if (this.buffer.size === 0) return;

    // Create a copy of the buffer and clear it immediately to prevent race conditions
    const toFlush = new Map(this.buffer);
    this.buffer.clear();

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYear = `${now.getFullYear()}`;

    try {
      // Execute all updates in a transaction for atomicity and performance
      await this.prisma.client.$transaction(async (tx) => {
        for (const [key, data] of toFlush.entries()) {
          const [userId, guildId] = key.split(':');

          const hashPayload = `${data.username}:${data.avatar || ''}`;
          const currentHash = createHash('md5')
            .update(hashPayload)
            .digest('hex');

          // Ensure User exists and is up to date, skip if hash hasn't changed
          if (this.userHashes.get(userId) !== currentHash) {
            await tx.user.upsert({
              where: { discordId: userId },
              create: {
                discordId: userId,
                username: data.username,
                avatar: data.avatar ?? null,
              },
              update: {
                username: data.username,
                ...(data.avatar !== undefined && { avatar: data.avatar }),
              },
            });
            this.userHashes.set(userId, currentHash);
          }

          // Fetch the user to get the true CUID id for relations
          const user = await tx.user.findUnique({
            where: { discordId: userId },
          });
          if (!user) continue;

          // 1. Update all-time XP in GuildMember
          const member = await tx.guildMember.upsert({
            where: { userId_guildId: { userId: user.id, guildId } },
            create: {
              userId: user.id,
              guildId,
              xp: data.xp,
            },
            update: {
              xp: { increment: data.xp },
            },
          });

          // Check level up logic
          const globalSettings = await tx.globalSetting.findUnique({
            where: { id: 'global' },
          });
          const formula =
            (globalSettings?.settings as any)?.xp?.levelUpFormula ||
            'exponential';
          const baseXp =
            (globalSettings?.settings as any)?.xp?.baseXpForLevelUp || 100;

          let newLevel = member.level;
          if (formula === 'exponential') {
            // e.g. Level 1 = 100, Level 2 = 300, Level 3 = 700
            let required = 0;
            let checkLvl = 1;
            while (true) {
              required += baseXp * Math.pow(1.5, checkLvl - 1);
              if (member.xp >= required) {
                checkLvl++;
              } else {
                break;
              }
            }
            newLevel = checkLvl - 1;
          } else {
            newLevel = Math.floor(member.xp / baseXp);
          }

          if (newLevel > member.level) {
            await tx.guildMember.update({
              where: { id: member.id },
              data: { level: newLevel },
            });

            // Send level-up message to Discord
            this.sendLevelUpMessage(
              userId,
              guildId,
              newLevel,
              data.username,
              data.lastChannelId,
            );

            // Award the matching rank role (non-stack)
            this.applyRoleRank(userId, guildId, newLevel);
          }

          // 2. Update Monthly XP
          await tx.guildMemberXp.upsert({
            where: {
              userId_guildId_period: {
                userId: user.id,
                guildId,
                period: currentMonth,
              },
            },
            create: {
              userId: user.id,
              guildId,
              period: currentMonth,
              xp: data.xp,
            },
            update: { xp: { increment: data.xp } },
          });

          // 3. Update Yearly XP
          await tx.guildMemberXp.upsert({
            where: {
              userId_guildId_period: {
                userId: user.id,
                guildId,
                period: currentYear,
              },
            },
            create: {
              userId: user.id,
              guildId,
              period: currentYear,
              xp: data.xp,
            },
            update: { xp: { increment: data.xp } },
          });
        }
      });

      this.logger.debug(`Flushed XP for ${toFlush.size} users`);
    } catch (error) {
      this.logger.error('Failed to flush XP buffer:');
      console.error(error);
      // Restore buffer if flush failed to not lose data
      for (const [key, data] of toFlush.entries()) {
        const current = this.buffer.get(key) || {
          xp: 0,
          username: data.username,
        };
        current.xp += data.xp;
        this.buffer.set(key, current);
      }
    }
  }

  /** Send a level-up congratulation message to the guild */
  private sendLevelUpMessage(
    discordUserId: string,
    guildId: string,
    newLevel: number,
    username: string,
    lastChannelId?: string,
  ) {
    if (!this.discordClient) return;

    try {
      const guild = this.discordClient.guilds.cache.get(guildId);
      if (!guild) return;

      // Get the guild settings for the level-up channel and message
      const settings = this.guildSettings.get(guildId);

      // Check if notifications are enabled
      if (!settings.xp.levelUpNotification) return;

      const channelId = settings.xp.levelUpChannelId;
      const template =
        settings.xp.levelUpMessage ||
        '🎉 Chúc mừng {user} đã đạt level **{level}**!';

      // Find the channel to send to: configured channel -> last message channel -> fallback to nothing
      let channelIdToSend = channelId;
      if (!channelIdToSend && lastChannelId) {
        channelIdToSend = lastChannelId;
      }

      const channel = channelIdToSend
        ? guild.channels.cache.get(channelIdToSend)
        : null;

      if (!channel || !('send' in channel)) return;

      const member = guild.members.cache.get(discordUserId);
      const displayName = member ? member.displayName : username;

      const message = template
        .replace('{user}', `**${displayName}**`)
        .replace('{level}', String(newLevel))
        .replace('{username}', username);

      channel.send(message).catch((err: any) => {
        this.logger.error(
          `Failed to send level-up message in guild ${guildId}:`,
          err,
        );
      });
    } catch (error) {
      this.logger.error('Failed to send level-up message:', error);
    }
  }

  /**
   * Award the single rank role matching the member's new level and remove any
   * other configured rank roles (non-stacking). Best-effort and non-blocking.
   */
  private applyRoleRank(
    discordUserId: string,
    guildId: string,
    newLevel: number,
  ): void {
    if (!this.discordClient) return;

    void (async () => {
      try {
        const settings = this.guildSettings.get(guildId);
        const roleRank = settings.roleRank;
        if (!roleRank?.enabled || !roleRank.rules?.length) return;

        const guild = this.discordClient!.guilds.cache.get(guildId);
        if (!guild) return;

        const member = await guild.members
          .fetch(discordUserId)
          .catch(() => null);
        if (!member) return;

        const allRankRoleIds = roleRank.rules
          .map((r) => r.roleId)
          .filter(Boolean);
        const eligible = roleRank.rules
          .filter((r) => r.roleId && newLevel >= r.level)
          .sort((a, b) => b.level - a.level);
        const targetRoleId = eligible[0]?.roleId ?? null;

        const toRemove = allRankRoleIds.filter(
          (id) => id !== targetRoleId && member.roles.cache.has(id),
        );
        for (const roleId of toRemove) {
          await member.roles
            .remove(roleId, 'Role rank: non-stacking cleanup')
            .catch(() => undefined);
        }

        if (targetRoleId && !member.roles.cache.has(targetRoleId)) {
          await member.roles
            .add(targetRoleId, `Role rank: reached level ${newLevel}`)
            .catch(() => undefined);
        }
      } catch (error) {
        this.logger.error(
          `Failed to apply role rank in guild ${guildId}:`,
          error,
        );
      }
    })();
  }
}
