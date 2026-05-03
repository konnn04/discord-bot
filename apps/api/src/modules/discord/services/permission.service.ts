import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { PermissionLevel } from 'shared/src/types/discord.types';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);
  private readonly superAdmins: Set<string>;

  constructor(private config: ConfigService) {
    const superAdminStr = this.config.get<string>('SUPER_ADMIN', '');
    this.superAdmins = new Set(
      superAdminStr
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );
    this.logger.log(`Loaded ${this.superAdmins.size} super admin(s)`);
  }

  /** Check if a user ID is a super admin */
  isSuperAdmin(userId: string): boolean {
    return this.superAdmins.has(userId);
  }

  /** Get the permission level of a guild member */
  getPermissionLevel(
    userId: string,
    member: GuildMember | null,
  ): PermissionLevel {
    if (this.isSuperAdmin(userId)) {
      return PermissionLevel.SUPER_ADMIN;
    }

    if (!member) return PermissionLevel.EVERYONE;

    // Guild owner
    if (member.id === member.guild.ownerId) {
      return PermissionLevel.GUILD_OWNER;
    }

    // Administrator permission
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      return PermissionLevel.ADMIN;
    }

    // Moderator-like permissions
    if (
      member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      member.permissions.has(PermissionFlagsBits.ManageChannels) ||
      member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      member.permissions.has(PermissionFlagsBits.KickMembers) ||
      member.permissions.has(PermissionFlagsBits.BanMembers)
    ) {
      return PermissionLevel.MODERATOR;
    }

    return PermissionLevel.EVERYONE;
  }

  /** Check if a user meets the required permission level */
  hasPermission(
    userId: string,
    member: GuildMember | null,
    required: PermissionLevel,
  ): boolean {
    return this.getPermissionLevel(userId, member) >= required;
  }
}
