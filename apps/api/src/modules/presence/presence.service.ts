import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';
import { ActivityType, GuildMember } from 'discord.js';

const DISCORD_CDN = 'https://cdn.discordapp.com';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    private prisma: PrismaService,
    private discordService: DiscordService,
  ) {}

  async getPresence(
    discordId: string,
  ): Promise<{ data: any | null; error?: string }> {
    // 1. Check if user has enabled public presence
    const record = await this.prisma.publicPresence?.findUnique({
      where: { discordId },
    });

    if (!record || !record.enabled) {
      return {
        data: null,
        error: 'User has not enabled public presence or does not exist.',
      };
    }

    // 2. Find the user in the tracked guild
    const client = this.discordService.client;
    const guild = client.guilds.cache.get(record.guildId);

    if (!guild) {
      return {
        data: null,
        error: 'Bot is no longer in the tracked guild.',
      };
    }

    // 3. Try to get the member
    let member = guild.members.cache.get(discordId);
    if (!member) {
      try {
        member = await guild.members.fetch(discordId);
      } catch {
        return {
          data: null,
          error: 'User not found in the tracked guild.',
        };
      }
    }

    const user = member.user;
    const presence = member.presence;

    // 4. Build avatar URLs
    const avatarHash = user.avatar;
    const avatarUrl = avatarHash
      ? `${DISCORD_CDN}/avatars/${user.id}/${avatarHash}.${avatarHash.startsWith('a_') ? 'gif' : 'webp'}?size=512`
      : `${DISCORD_CDN}/embed/avatars/${(BigInt(user.id) >> 22n) % 6n}.png`;

    const avatarDecorationData = user.avatarDecorationData;
    const avatarDecorationUrl = avatarDecorationData?.asset
      ? `${DISCORD_CDN}/avatar-decoration-presets/${avatarDecorationData.asset}.png?size=256`
      : null;

    const bannerUrl = user.banner
      ? `${DISCORD_CDN}/banners/${user.id}/${user.banner}.${user.banner.startsWith('a_') ? 'gif' : 'webp'}?size=600`
      : null;

    // 5. Build activities array with processed image URLs
    const activities: any[] = [];
    let listeningToSpotify = false;
    let spotifyData: any = null;

    if (presence?.activities) {
      for (const activity of presence.activities) {
        const activityObj: any = {
          name: activity.name,
          type: activity.type,
          state: activity.state || null,
          details: activity.details || null,
          created_at: activity.createdTimestamp,
        };

        if (activity.timestamps) {
          activityObj.timestamps = {
            start: activity.timestamps.start
              ? new Date(activity.timestamps.start).getTime()
              : null,
            end: activity.timestamps.end
              ? new Date(activity.timestamps.end).getTime()
              : null,
          };
        }

        if (activity.assets) {
          const largeImage = activity.assets.largeImage;
          const smallImage = activity.assets.smallImage;

          activityObj.assets = {
            large_image: largeImage || null,
            large_image_url: this.resolveActivityImage(
              largeImage,
              activity.applicationId,
            ),
            large_text: activity.assets.largeText || null,
            small_image: smallImage || null,
            small_image_url: this.resolveActivityImage(
              smallImage,
              activity.applicationId,
            ),
            small_text: activity.assets.smallText || null,
          };
        }

        if (activity.emoji) {
          activityObj.emoji = {
            name: activity.emoji.name,
            id: activity.emoji.id || null,
            animated: activity.emoji.animated || false,
            url: activity.emoji.id
              ? `${DISCORD_CDN}/emojis/${activity.emoji.id}.${activity.emoji.animated ? 'gif' : 'webp'}?size=64`
              : null,
          };
        }

        if (activity.party) {
          activityObj.party = {
            id: activity.party.id || null,
            size: activity.party.size || null,
          };
        }

        if (activity.applicationId) {
          activityObj.application_id = activity.applicationId;
        }

        if (activity.buttons && activity.buttons.length > 0) {
          activityObj.buttons = activity.buttons;
        }

        // Custom Status (type 4)
        if (activity.type === ActivityType.Custom) {
          activityObj.id = 'custom';
        }

        // Spotify detection (type 2 = Listening)
        if (
          activity.type === ActivityType.Listening &&
          activity.name === 'Spotify'
        ) {
          listeningToSpotify = true;

          const albumArt = activity.assets?.largeImage;
          spotifyData = {
            song: activity.details || null,
            artist: activity.state || null,
            album: activity.assets?.largeText || null,
            album_art_url: albumArt
              ? `https://i.scdn.co/image/${albumArt.replace('spotify:', '')}`
              : null,
            track_id: activity.syncId || null,
            timestamps: {
              start: activity.timestamps?.start
                ? new Date(activity.timestamps.start).getTime()
                : null,
              end: activity.timestamps?.end
                ? new Date(activity.timestamps.end).getTime()
                : null,
            },
          };
        }

        activities.push(activityObj);
      }
    }

    // 6. Determine client status
    const clientStatus = presence?.clientStatus;
    const status = presence?.status || 'offline';

    // 7. Build showcase guilds
    const showcaseGuilds = await this.buildShowcaseGuilds(
      discordId,
      record.showcaseGuildIds || [],
    );

    // 8. Build response
    const response = {
      data: {
        kv: {},
        discord_user: {
          id: user.id,
          username: user.username,
          global_name: user.globalName || null,
          display_name: user.displayName || null,
          avatar: avatarHash,
          avatar_url: avatarUrl,
          avatar_decoration_data: avatarDecorationData || null,
          avatar_decoration_url: avatarDecorationUrl,
          banner: user.banner || null,
          banner_url: bannerUrl,
          discriminator: user.discriminator,
          bot: user.bot,
          public_flags: user.flags?.bitfield || 0,
        },
        activities,
        discord_status: status,
        active_on_discord_web: clientStatus?.web !== undefined,
        active_on_discord_desktop: clientStatus?.desktop !== undefined,
        active_on_discord_mobile: clientStatus?.mobile !== undefined,
        listening_to_spotify: listeningToSpotify,
        spotify: spotifyData,
        showcase_guilds: showcaseGuilds,
      },
      success: true,
    };

    return { data: response };
  }

  /**
   * Resolve activity image to a full URL
   */
  private resolveActivityImage(
    imageKey: string | null | undefined,
    applicationId: string | null | undefined,
  ): string | null {
    if (!imageKey) return null;

    // Spotify images
    if (imageKey.startsWith('spotify:')) {
      return `https://i.scdn.co/image/${imageKey.replace('spotify:', '')}`;
    }

    // External URLs (mp: prefix)
    if (imageKey.startsWith('mp:external/')) {
      return `https://media.discordapp.net/${imageKey.replace('mp:', '')}`;
    }

    // Discord application assets
    if (applicationId) {
      return `${DISCORD_CDN}/app-assets/${applicationId}/${imageKey}.png`;
    }

    return null;
  }

  /**
   * Build showcase guild data with XP, roles, etc.
   */
  private async buildShowcaseGuilds(
    discordId: string,
    guildIds: string[],
  ): Promise<any[]> {
    if (guildIds.length === 0) return [];

    const client = this.discordService.client;
    const showcaseGuilds: any[] = [];

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYear = `${now.getFullYear()}`;

    for (const guildId of guildIds) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;

      let member: GuildMember | null = null;
      try {
        member =
          guild.members.cache.get(discordId) ||
          (await guild.members.fetch(discordId));
      } catch {
        continue; // User not in this guild
      }

      // Get XP data from DB
      const dbUser = await this.prisma.user?.findUnique({
        where: { discordId },
      });

      const xpData: any = { total: 0, level: 0, monthly: 0, yearly: 0 };

      if (dbUser) {
        const guildMember = await this.prisma.guildMember?.findUnique({
          where: { userId_guildId: { userId: dbUser.id, guildId } },
        });

        if (guildMember) {
          xpData.total = guildMember.xp;
          xpData.level = guildMember.level;

          // Get rank position
          const rankPosition = await this.prisma.guildMember?.count({
            where: { guildId, xp: { gt: guildMember.xp } },
          });
          xpData.rank = (rankPosition || 0) + 1;
        }

        // Monthly XP
        const monthlyXp = await this.prisma.guildMemberXp?.findUnique({
          where: {
            userId_guildId_period: {
              userId: dbUser.id,
              guildId,
              period: currentMonth,
            },
          },
        });
        xpData.monthly = monthlyXp?.xp || 0;

        // Yearly XP
        const yearlyXp = await this.prisma.guildMemberXp?.findUnique({
          where: {
            userId_guildId_period: {
              userId: dbUser.id,
              guildId,
              period: currentYear,
            },
          },
        });
        xpData.yearly = yearlyXp?.xp || 0;
      }

      // Get the highest role (excluding @everyone)
      const roles = member.roles.cache
        .filter((r) => r.id !== guild.id) // Exclude @everyone
        .sort((a, b) => b.position - a.position);
      const highestRole = roles.first();

      // Guild icon URL
      const guildIconUrl = guild.icon
        ? `${DISCORD_CDN}/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith('a_') ? 'gif' : 'webp'}?size=256`
        : null;

      showcaseGuilds.push({
        id: guild.id,
        name: guild.name,
        icon: guild.icon || null,
        icon_url: guildIconUrl,
        member_count: guild.memberCount,
        is_owner: guild.ownerId === discordId,
        joined_at: member.joinedAt?.toISOString() || null,
        highest_role: highestRole
          ? {
              id: highestRole.id,
              name: highestRole.name,
              color: `#${highestRole.color.toString(16).padStart(6, '0')}`,
              position: highestRole.position,
            }
          : null,
        xp: xpData,
      });
    }

    return showcaseGuilds;
  }
}
