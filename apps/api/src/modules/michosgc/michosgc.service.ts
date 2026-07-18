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

const GAME_LABELS: Record<string, string> = {
  genshin: 'Genshin Impact',
  hkrpg: 'Honkai: Star Rail',
  honkai3rd: 'Honkai Impact 3rd',
  nap: 'Zenless Zone Zero',
  tot: 'Tears of Themis',
};

const REDEEM_LINKS: Record<string, (code: string) => string> = {
  genshin: (code) => `https://genshin.hoyoverse.com/vi/gift?code=${code}`,
  hkrpg: (code) => `https://hsr.hoyoverse.com/gift?code=${code}`,
  nap: (code) => `https://zenless.hoyoverse.com/redemption?code=${code}`,
};

/**
 * Polls the HoYoverse codes API (hoyo-codes.seria.moe) for the 5 HoYoverse
 * games. Sending is unified with the web-scraped games via giftcode-notify.ts
 * — see GuildSettings.giftcode for the shared per-guild configuration.
 */
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

    // Shared across guilds — only poll a game if at least one guild wants it,
    // and one fetch feeds every guild that opted in (see notifyGuildsForGiftcode).
    const activeGameIds = getActiveGiftcodeGameIds(this.guildSettings);
    const games = HOYOVERSE_GAME_IDS.filter((id) => activeGameIds.has(id));

    for (const game of games) {
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
          const entries: GiftcodeEntry[] = newCodes.map((c) => ({
            code: c.code,
            rewards: c.rewards || undefined,
            link: REDEEM_LINKS[game]?.(c.code),
          }));
          await notifyGuildsForGiftcode(
            this.discordClient,
            this.guildSettings,
            game,
            GAME_LABELS[game] ?? game,
            entries,
          );
        }

        const updatedKnown = [...new Set([...known, ...fetchedCodes])];
        await this.prisma.giftcodeCache.upsert({
          where: { game },
          update: { hash: currentHash, codes: updatedKnown },
          create: { game, hash: currentHash, codes: updatedKnown },
        });
      } catch (err) {
        this.logger.error(`Error fetching codes for ${game}:`, err);
      }

      // Delay between requests to avoid rate limits.
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}
