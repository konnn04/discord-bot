import { Injectable, NotFoundException } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';
import { GuildSettingsService } from '../settings/guild-settings.service';
import { PermissionService } from '../discord/services/permission.service';
import type { GuildSettings } from 'shared/src/types/settings.types';

@Injectable()
export class GuildsService {
  constructor(
    private discordService: DiscordService,
    private guildSettings: GuildSettingsService,
    private permissionService: PermissionService,
  ) {}

  /** Get all guilds the bot is in, optionally filtered by a user's guilds */
  getBotGuilds(userGuildIds?: string[]) {
    const botGuilds = this.discordService.client.guilds.cache;

    let guilds = botGuilds.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ size: 128 }),
      memberCount: guild.memberCount,
    }));

    // If user guild IDs are provided, filter to only guilds the user is also in
    if (userGuildIds) {
      const userSet = new Set(userGuildIds);
      guilds = guilds.filter((g) => userSet.has(g.id));
    }

    return guilds;
  }

  /** Get a specific guild by ID */
  getGuild(guildId: string) {
    const guild = this.discordService.client.guilds.cache.get(guildId);
    if (!guild) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }

    return {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ size: 256 }),
      memberCount: guild.memberCount,
      channels: guild.channels.cache.size,
      roles: guild.roles.cache.size,
      ownerId: guild.ownerId,
    };
  }

  /** Get settings for a guild */
  getGuildSettings(guildId: string): GuildSettings {
    // Verify guild exists in bot cache
    if (!this.discordService.client.guilds.cache.has(guildId)) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }
    return this.guildSettings.get(guildId);
  }

  /** Update settings for a guild */
  updateGuildSettings(
    guildId: string,
    partial: Partial<GuildSettings>,
  ): GuildSettings {
    if (!this.discordService.client.guilds.cache.has(guildId)) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }
    return this.guildSettings.update(guildId, partial);
  }

  /** Check if a user can manage a specific guild */
  canManageGuild(userId: string, guildId: string): boolean {
    // Super admins can manage any guild
    if (this.permissionService.isSuperAdmin(userId)) return true;

    const guild = this.discordService.client.guilds.cache.get(guildId);
    if (!guild) return false;

    const member = guild.members.cache.get(userId);
    if (!member) return false;

    return (
      member.permissions.has('ManageGuild') ||
      member.permissions.has('Administrator')
    );
  }
}
