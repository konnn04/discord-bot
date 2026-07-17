import type { Client } from 'discord.js';
import type { CommandLoaderService } from './services/command-loader.service';
import type { EventLoaderService } from './services/event-loader.service';
import type { CooldownService } from './services/cooldown.service';
import type { PermissionService } from './services/permission.service';
import type { GuildSettingsService } from '../settings/guild-settings.service';
import type { GlobalSettingsService } from '../settings/global-settings.service';
import type { XpBufferService } from '../xp/services/xp-buffer/xp-buffer.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { VoiceTagService } from './services/voice-tag.service';
import type { MeetingTracker } from './utils/meeting-tracker';

export interface DiscordDeps {
  commandLoader: CommandLoaderService;
  eventLoader: EventLoaderService;
  cooldownService: CooldownService;
  permissionService: PermissionService;
  guildSettings: GuildSettingsService;
  globalSettings: GlobalSettingsService;
  xpBuffer: XpBufferService;
  prisma: PrismaService;
  meetingTracker: MeetingTracker;
  discordClient: Client;
  voiceTagService: VoiceTagService;
}
