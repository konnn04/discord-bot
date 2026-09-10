import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { GuildSettingsService } from '../settings/guild-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { Client } from 'discord.js';
import { createHash } from 'crypto';
import { HOYOVERSE_GAME_IDS } from 'shared/src/types/settings.types';
import {
  notifyGuildsForGiftcode,
  getActiveGiftcodeGameIds,
  giftcodeGameLabel,
  HOYOVERSE_REDEEM_LINKS,
  type GiftcodeEntry,
} from '../giftcode/giftcode-notify';

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
    setTimeout(() => void this.handleCron(true), 2000);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(force = false) {
    if (!this.discordClient) return;

    const settings = this.globalSettings.get();
    let minutes = settings.michosgc?.cronInterval || 15;
    if (minutes < 5) minutes = 5;

    const now = Date.now();
    if (!force && now - this.lastRun < minutes * 60 * 1000) {
      return;
    }

    this.lastRun = now;
    await this.checkCodes();
  }

  async checkCodes() {
    if (!this.discordClient) return;

    const activeGameIds = getActiveGiftcodeGameIds(this.guildSettings);
    const games = HOYOVERSE_GAME_IDS.filter((id) => activeGameIds.has(id));

    for (const game of games) {
      try {
        const response = await fetch(
          `https://hoyo-codes.seria.moe/codes?game=${game}`,
        );
        if (!response.ok) continue;

        const data = (await response.json()) as HoyoApiResponse;
        if (!data || !data.codes || data.codes.length === 0) continue;

        const fetchedCodes = data.codes.map((c) => c.code);
        const payload = fetchedCodes.slice().sort().join(',');
        const currentHash = createHash('md5').update(payload).digest('hex');

        const dbCache = await this.prisma.giftcodeCache.findUnique({
          where: { game },
        });

        if (dbCache && dbCache.hash === currentHash) {
          continue;
        }

        const known = dbCache ? (dbCache.codes as string[]) : [];
        const newCodes = data.codes.filter((c) => !known.includes(c.code));

        if (this.discordClient && dbCache && newCodes.length > 0) {
          this.logger.log(`Found ${newCodes.length} new code(s) for ${game}`);
          const newEntries: GiftcodeEntry[] = newCodes.map((c) => ({
            code: c.code,
            rewards: c.rewards || undefined,
            link: HOYOVERSE_REDEEM_LINKS[game]?.(c.code),
          }));

          await notifyGuildsForGiftcode(
            this.discordClient,
            this.guildSettings,
            game,
            giftcodeGameLabel(game),
            newEntries,
          );
        }

        await this.prisma.giftcodeCache.upsert({
          where: { game },
          update: { hash: currentHash, codes: fetchedCodes },
          create: { game, hash: currentHash, codes: fetchedCodes },
        });
      } catch (err) {
        this.logger.error(`Error fetching codes for ${game}:`, err);
      }

      // Delay between requests to avoid rate limits.
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
