import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { GuildSettingsService } from '../settings/guild-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { Client, EmbedBuilder } from 'discord.js';
import { createHash } from 'crypto';

interface HoyoApiResponse {
  codes: Array<{
    id: number;
    code: string;
    status: string;
    game: string;
    rewards: string;
  }>;
  game: string;
}

@Injectable()
export class MichosgcService implements OnModuleInit {
  private readonly logger = new Logger(MichosgcService.name);
  private discordClient: Client | null = null;
  private lastRun = 0;
  private readonly games = ['genshin', 'hkrpg', 'honkai3rd', 'nap', 'tot'];

  constructor(
    private globalSettings: GlobalSettingsService,
    private guildSettings: GuildSettingsService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    setTimeout(() => void this.handleCron(true), 5000);
  }

  setClient(client: Client) {
    this.discordClient = client;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(force = false) {
    if (!this.discordClient) return;

    const settings = this.globalSettings.get();
    let minutes = settings.michosgc?.cronInterval || 15;
    if (minutes < 5) minutes = 5;

    const now = Date.now();
    if (!force && now - this.lastRun < minutes * 60 * 1000) {
      return; // Skip if interval hasn't passed
    }

    this.lastRun = now;
    await this.checkCodes();
  }

  async checkCodes() {
    if (!this.discordClient) return;

    for (const game of this.games) {
      try {
        const response = await fetch(
          `https://hoyo-codes.seria.moe/codes?game=${game}`,
        );
        if (!response.ok) continue;

        const data = (await response.json()) as HoyoApiResponse;
        if (!data || !data.codes) continue;

        const fetchedCodes = data.codes.map((c) => c.code);
        const payload = fetchedCodes.slice().sort().join(',');
        const currentHash = createHash('md5').update(payload).digest('hex');

        // Check DB Cache
        const dbCache = await this.prisma.giftcodeCache.findUnique({
          where: { game },
        });

        if (dbCache && dbCache.hash === currentHash) {
          continue; // No changes
        }

        const known = dbCache ? (dbCache.codes as string[]) : [];
        const newCodes = data.codes.filter((c) => !known.includes(c.code));

        if (newCodes.length > 0) {
          this.logger.log(`Found ${newCodes.length} new codes for ${game}`);
          await this.notifyGuilds(game, newCodes);
        }

        // Save to DB
        const updatedKnown = [...new Set([...known, ...fetchedCodes])];
        await (this.prisma as any).giftcodeCache.upsert({
          where: { game },
          update: { hash: currentHash, codes: updatedKnown },
          create: { game, hash: currentHash, codes: updatedKnown },
        });
      } catch (err) {
        this.logger.error(`Error fetching codes for ${game}:`, err);
      }

      // Delay 10s between requests to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  private async notifyGuilds(game: string, newCodes: HoyoApiResponse['codes']) {
    const allGuildSettings = this.guildSettings.getAll();

    for (const [guildId, settings] of allGuildSettings.entries()) {
      const config = settings.michosgc;
      if (!config || !config.enabled || !config.channelId) continue;

      try {
        const channel = await this.discordClient!.channels.fetch(
          config.channelId,
        );
        if (!channel || !channel.isTextBased()) {
          this.logger.warn(
            `Guild ${guildId}: Channel ${config.channelId} is not text-based or not found.`,
          );
          continue;
        }

        const gameNames: Record<string, string> = {
          genshin: 'Genshin Impact',
          hkrpg: 'Honkai: Star Rail',
          honkai3rd: 'Honkai Impact 3rd',
          nap: 'Zenless Zone Zero',
          tot: 'Tears of Themis',
        };
        const gameColors: Record<string, number> = {
          genshin: 0xffffff,
          hkrpg: 0x3d3580,
          honkai3rd: 0x00d4ff,
          nap: 0x111111,
          tot: 0xd82b2b,
        };
        const gName = gameNames[game] || game.toUpperCase();

        const embed = new EmbedBuilder()
          .setTitle(`🎁 Mã quà tặng mới cho ${gName}!`)
          .setColor(gameColors[game] || 0xffffff)
          .setFooter({
            text: 'Dữ liệu từ seria.moe',
            iconURL: 'https://docs.hb.seria.moe/img/favicon.ico',
          })
          .setTimestamp();

        let desc = '';
        for (const c of newCodes) {
          let link = '';
          if (game === 'genshin')
            link = `https://genshin.hoyoverse.com/vi/gift?code=${c.code}`;
          else if (game === 'hkrpg')
            link = `https://hsr.hoyoverse.com/gift?code=${c.code}`;
          else if (game === 'nap')
            link = `https://zenless.hoyoverse.com/redemption?code=${c.code}`;

          const displayCode = link
            ? `**[${c.code}](${link})**`
            : `**\`${c.code}\`**`;
          desc += `${displayCode}\n└ 🎁 ${c.rewards || 'Không rõ phần thưởng'}\n\n`;
        }
        embed.setDescription(desc);

        // Tags — respect the configured mode:
        //   'common'  → tag a single shared role for every giftcode
        //   'perGame' → tag the role specific to this game
        let content = '';
        const tags: string[] = [];
        if (config.mode === 'perGame') {
          const specificRole = config.roles[game as keyof typeof config.roles];
          if (specificRole) tags.push(`<@&${specificRole}>`);
        } else {
          if (config.roleCommon) tags.push(`<@&${config.roleCommon}>`);
        }

        if (tags.length > 0) {
          content = tags.join(' ');
        }

        const messagePayload: any = { embeds: [embed] };
        if (content) messagePayload.content = content;

        if ('send' in channel) {
          await channel.send(messagePayload);
        } else {
          await (channel as any).send(messagePayload);
        }
      } catch (err) {
        this.logger.error(`Failed to send code to guild ${guildId}:`, err);
      }
    }
  }
}
