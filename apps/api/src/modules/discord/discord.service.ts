import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { CommandLoaderService } from './services/command-loader.service';
import { EventLoaderService } from './services/event-loader.service';
import { CooldownService } from './services/cooldown.service';
import { PermissionService } from './services/permission.service';
import { GuildSettingsService } from '../settings/guild-settings.service';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { XpBufferService } from '../xp/services/xp-buffer/xp-buffer.service';
import { MichosgcService } from '../michosgc/michosgc.service';
import { VoiceTagService } from './services/voice-tag.service';
import { LeetcodeSchedulerService } from './services/leetcode-scheduler.service';
import { AnimeSchedulerService } from './services/anime-scheduler.service';
import { ReminderSchedulerService } from './services/reminder-scheduler.service';
import { MeetingTracker } from './utils/meeting-tracker';
import {
  setPlayerPrisma,
  setPlayerGuildSettings,
  setPlayerGateway,
} from './services/music/player-manager';
import { setQueueGuildSettings } from './services/music/queue-manager';
import { MusicGateway } from './gateways/music.gateway';

/** Shared ref so other modules (e.g. auth) can DM users */
export const discordClientRef: { client: Client | null } = { client: null };

@Injectable()
export class DiscordService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordService.name);
  public readonly client: Client;
  public readonly meetingTracker: MeetingTracker;
  private voiceXpInterval: NodeJS.Timeout | null = null;
  private guildHashes = new Map<string, string>();

  constructor(
    private config: ConfigService,
    private commandLoader: CommandLoaderService,
    private eventLoader: EventLoaderService,
    private cooldownService: CooldownService,
    private permissionService: PermissionService,
    private guildSettings: GuildSettingsService,
    private globalSettings: GlobalSettingsService,
    private xpBuffer: XpBufferService,
    private michosgc: MichosgcService,
    private voiceTagService: VoiceTagService,
    private leetcodeScheduler: LeetcodeSchedulerService,
    private animeScheduler: AnimeSchedulerService,
    private reminderScheduler: ReminderSchedulerService,
    private prisma: PrismaService,
    private musicGateway: MusicGateway,
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
      ],
      partials: [Partials.Channel, Partials.GuildMember],
    });

    this.meetingTracker = new MeetingTracker(this.client);
  }

  async onModuleInit() {
    const deps = {
      commandLoader: this.commandLoader,
      eventLoader: this.eventLoader,
      cooldownService: this.cooldownService,
      permissionService: this.permissionService,
      guildSettings: this.guildSettings,
      globalSettings: this.globalSettings,
      xpBuffer: this.xpBuffer,
      prisma: this.prisma,
      meetingTracker: this.meetingTracker,
      discordClient: this.client,
      voiceTagService: this.voiceTagService,
    };

    // Load commands and events, automatically injecting dependencies
    await this.commandLoader.loadAll(deps);
    await this.eventLoader.loadAll(this.client, deps);

    const token = this.config.get<string>('DISCORD_TOKEN');
    if (!token) {
      this.logger.error('DISCORD_TOKEN is not set!');
      return;
    }

    this.client.once('clientReady', () => {
      this.logger.log(`Discord bot ready as ${this.client.user?.tag}`);
      this.logger.log(`Serving ${this.client.guilds.cache.size} guild(s)`);

      this.syncGuilds().catch((err) =>
        this.logger.error('Failed to sync guilds:', err),
      );

      if (
        process.env.NODE_ENV !== 'production' ||
        process.env.REGISTER_SLASH === 'true'
      ) {
        this.commandLoader.registerSlashCommands().catch((err) => {
          this.logger.error('Failed to register slash commands', err);
        });
      }

      this.xpBuffer.setClient(this.client);
      this.michosgc.setClient(this.client);
      this.voiceTagService.setClient(this.client);
      this.leetcodeScheduler.setClient(this.client);
      this.animeScheduler.setClient(this.client);
      this.reminderScheduler.setClient(this.client);

      // Pass prisma and settings to managers
      setPlayerPrisma(this.prisma);
      setPlayerGuildSettings(this.guildSettings);
      setPlayerGateway(this.musicGateway);
      setQueueGuildSettings(this.guildSettings);

      // Share client ref for auth callbacks
      discordClientRef.client = this.client;

      this.voiceXpInterval = setInterval(() => this.grantVoiceXp(), 60 * 1000);

      this.voiceTagService
        .reconcileAll(this.client)
        .catch((err) =>
          this.logger.error('[VoiceTag] Startup reconciliation failed:', err),
        );
    });

    this.client.on('guildCreate', async (guild) => {
      this.logger.log(`Joined new guild: ${guild.name} (${guild.id})`);
      try {
        await this.prisma.guild.upsert({
          where: { id: guild.id },
          update: { name: guild.name, ownerId: guild.ownerId },
          create: { id: guild.id, name: guild.name, ownerId: guild.ownerId },
        });
      } catch (err) {
        this.logger.error(`Failed to sync new guild ${guild.id}:`, err);
      }
    });

    this.client.login(token).catch((err) => {
      this.logger.error('Failed to login to Discord:', err);
    });
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Discord client...');
    if (this.voiceXpInterval) {
      clearInterval(this.voiceXpInterval);
    }
    this.voiceTagService.onDestroy();
    await this.voiceTagService['flushTaskBuffer']().catch(() => {});
    await this.client.destroy();
  }

  /** Sync all guilds to database */
  private async syncGuilds() {
    this.logger.log('Syncing guilds with database...');
    let count = 0;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_guildId, guild] of this.client.guilds.cache) {
      if (await this.syncGuild(guild)) {
        count++;
      }
    }
    this.logger.log(`Successfully synced ${count} guild(s) metadata.`);
  }

  /** Sync a single guild metadata with caching */
  private async syncGuild(guild: any): Promise<boolean> {
    try {
      const hashPayload = `${guild.name}:${guild.ownerId}:${guild.icon || ''}`;
      const currentHash = createHash('md5').update(hashPayload).digest('hex');

      if (this.guildHashes.get(guild.id) !== currentHash) {
        await this.prisma.guild.upsert({
          where: { id: guild.id },
          update: {
            name: guild.name,
            ownerId: guild.ownerId,
            icon: guild.icon,
          },
          create: {
            id: guild.id,
            name: guild.name,
            ownerId: guild.ownerId,
            icon: guild.icon,
          },
        });
        this.guildHashes.set(guild.id, currentHash);
        return true;
      }
      return false;
    } catch (err) {
      this.logger.error(`Failed to sync guild ${guild.id}:`, err);
      return false;
    }
  }

  /** Grant XP to all users currently in voice channels */
  private grantVoiceXp() {
    let usersGranted = 0;
    for (const [guildId, guild] of this.client.guilds.cache) {
      for (const [memberId, voiceState] of guild.voiceStates.cache) {
        // Ignore bots and people not in a channel
        if (
          !voiceState.channelId ||
          !voiceState.member ||
          voiceState.member.user.bot
        )
          continue;

        // Ignore deafened or muted members (to prevent AFK farming)
        if (voiceState.selfDeaf || voiceState.serverDeaf) continue;

        // Grant 1 minute of voice XP
        this.xpBuffer.addVoiceXp(
          memberId,
          guildId,
          1,
          voiceState.member.user.username,
          voiceState.channelId,
          voiceState.member.user.avatar,
        );
        usersGranted++;
      }
    }
    if (usersGranted > 0) {
      this.logger.debug(
        `Granted 1 minute of voice XP to ${usersGranted} users`,
      );
    }
  }
}
