import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { Client } from 'discord.js';
import { GuildSettingsService } from '../settings/guild-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { GIFTCODE_CRAWL_SOURCES } from './sources';
import {
  notifyGuildsForGiftcode,
  getActiveGiftcodeGameIds,
  giftcodeGameLabel,
  type GiftcodeEntry,
} from '../giftcode/giftcode-notify';

/** Games this crawler knows how to scrape (i.e. NOT the HoYoverse API games). */
const CRAWL_GAME_IDS = Object.keys(GIFTCODE_CRAWL_SOURCES);

// A realistic browser UA + headers reduce the chance of being blocked as a bot.
const FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export interface CrawlResult {
  gameId: string;
  /** Every code currently found on the source page, with reward text + a link back to that page. */
  entries: GiftcodeEntry[];
  /** The subset of `entries` not seen in a previous crawl. */
  newEntries: GiftcodeEntry[];
}

/**
 * Scrapes giftcode pages for games not covered by the michosgc HoYoverse API
 * (NTE, Wuthering Waves, Arknights/Endfield, Where Winds Meet) every 30
 * minutes, tracks known codes the same way michosgc does (hash + code list in
 * GiftcodeCache). Sending is unified with michosgc via giftcode-notify.ts —
 * see GuildSettings.giftcode for the shared per-guild configuration.
 */
@Injectable()
export class GiftcodeCrawlerService implements OnModuleInit {
  private readonly logger = new Logger(GiftcodeCrawlerService.name);
  private discordClient: Client | null = null;

  constructor(
    private guildSettings: GuildSettingsService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    // Give the bot a moment to finish logging in before the first crawl.
    setTimeout(() => void this.crawlAll(), 10_000);
  }

  setClient(client: Client) {
    this.discordClient = client;
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async crawlAll(): Promise<void> {
    if (!this.discordClient || !this.prisma.isConnected) return;

    // Shared across guilds — one fetch per game feeds every guild that opted
    // in (see notifyGuildsForGiftcode). Skip games nobody has enabled at all.
    const activeGameIds = getActiveGiftcodeGameIds(this.guildSettings);

    for (const gameId of CRAWL_GAME_IDS) {
      if (!activeGameIds.has(gameId)) continue;
      try {
        await this.crawlGame(gameId);
      } catch (err) {
        this.logger.error(`Crawl failed for ${gameId}:`, err);
      }
      // Be polite between sites — avoid hammering multiple hosts back-to-back.
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  /** Crawl a single game now, regardless of the schedule. Used by the on-demand tool/command. */
  async crawlGameNow(gameId: string): Promise<CrawlResult | null> {
    if (!GIFTCODE_CRAWL_SOURCES[gameId]) return null;
    return this.crawlGame(gameId, { notify: true });
  }

  private async crawlGame(
    gameId: string,
    opts: { notify?: boolean } = {},
  ): Promise<CrawlResult> {
    const sources = GIFTCODE_CRAWL_SOURCES[gameId];
    let entries: GiftcodeEntry[] = [];
    let sourceUrl: string | undefined;

    if (sources?.length) {
      for (const source of sources) {
        try {
          const res = await fetch(source.url, { headers: FETCH_HEADERS });
          if (!res.ok) continue;
          const html = await res.text();
          entries = source.extract(html);
          if (entries.length > 0) {
            sourceUrl = source.url; // primary source succeeded — skip fallback
            break;
          }
        } catch (err) {
          this.logger.warn(
            `Source failed for ${gameId} (${source.url}): ${String(err)}`,
          );
        }
      }
    }

    if (entries.length === 0) {
      return { gameId, entries: [], newEntries: [] };
    }

    // Link every code back to the page it was found on — accurate since it's
    // the page we just successfully scraped, unlike guessing a redeem URL.
    const entriesWithLink = entries.map((e) => ({ ...e, link: sourceUrl }));

    const codeStrings = entriesWithLink.map((e) => e.code);
    const payload = [...codeStrings].sort().join(',');
    const currentHash = createHash('md5').update(payload).digest('hex');

    const dbCache = await this.prisma.giftcodeCache.findUnique({
      where: { game: gameId },
    });

    const known = dbCache ? (dbCache.codes as string[]) : [];
    const newEntries = entriesWithLink.filter((e) => !known.includes(e.code));
    const unchanged = dbCache?.hash === currentHash;

    if (newEntries.length > 0 && (opts.notify || !unchanged) && this.discordClient) {
      this.logger.log(`Found ${newEntries.length} new code(s) for ${gameId}`);
      await notifyGuildsForGiftcode(
        this.discordClient,
        this.guildSettings,
        gameId,
        giftcodeGameLabel(gameId),
        newEntries,
      );
    }

    if (!unchanged) {
      const updatedKnown = [...new Set([...known, ...codeStrings])];
      await this.prisma.giftcodeCache.upsert({
        where: { game: gameId },
        update: { hash: currentHash, codes: updatedKnown },
        create: { game: gameId, hash: currentHash, codes: updatedKnown },
      });
    }

    return { gameId, entries: entriesWithLink, newEntries };
  }
}
