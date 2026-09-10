import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { Client } from 'discord.js';
import axios from 'axios';
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
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
  'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
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
    // Initial crawl is triggered by setClient() after Discord is ready.
    // No crawl here to avoid running before the client is logged in.
  }

  setClient(client: Client) {
    this.discordClient = client;
    // Trigger initial crawl 5s after Discord client is ready
    setTimeout(() => void this.crawlAll(), 5000);
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
          let html = '';
          try {
            const res = await fetch(source.url, {
              headers: FETCH_HEADERS,
              signal: AbortSignal.timeout(15_000),
            });
            if (res.ok) {
              html = await res.text();
            }
          } catch {
            // Node fetch failed (e.g. TLS or HTTP2 socket reset), try axios
          }

          if (!html) {
            try {
              const axiosRes = await axios.get(source.url, {
                headers: FETCH_HEADERS,
                timeout: 15_000,
                responseType: 'text',
              });
              html =
                typeof axiosRes.data === 'string'
                  ? axiosRes.data
                  : String(axiosRes.data);
            } catch (err: any) {
              const isBlocked =
                err?.response?.status === 403 || err?.response?.status === 503;
              const enableProxyFallback =
                process.env.CRAWLER_PROXY_FALLBACK === 'true';

              if (isBlocked && enableProxyFallback) {
                try {
                  const proxyUrl = `https://r.jina.ai/${source.url}`;
                  const proxyRes = await fetch(proxyUrl, {
                    headers: { 'User-Agent': FETCH_HEADERS['User-Agent'] },
                    signal: AbortSignal.timeout(15_000),
                  });
                  if (proxyRes.ok) {
                    html = await proxyRes.text();
                    this.logger.log(
                      `Proxy fallback (r.jina.ai) succeeded for ${gameId} (${source.url})`,
                    );
                  }
                } catch (proxyErr) {
                  this.logger.debug(
                    `Proxy fallback failed for ${gameId}: ${String(proxyErr)}`,
                  );
                }
              }
            }
          }

          if (html) {
            entries = source.extract(html);
            if (entries.length > 0) {
              sourceUrl = source.url; // primary source succeeded — skip fallback
              break;
            }
          }
        } catch (err) {
          this.logger.debug(
            `Source attempt failed for ${gameId} (${source.url}): ${String(err)}`,
          );
        }
      }
    }

    if (entries.length === 0) {
      this.logger.warn(
        `All crawl sources failed or returned 0 codes for ${gameId}`,
      );
      return { gameId, entries: [], newEntries: [] };
    }

    // Link every code back to the page it was found on
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

    // Only notify if explicitly requested by on-demand action (opts.notify)
    // or when there are brand new codes detected
    if (this.discordClient) {
      if (opts.notify) {
        await notifyGuildsForGiftcode(
          this.discordClient,
          this.guildSettings,
          gameId,
          giftcodeGameLabel(gameId),
          entriesWithLink,
        );
      } else if (dbCache && !unchanged && newEntries.length > 0) {
        this.logger.log(`Found ${newEntries.length} new code(s) for ${gameId}`);
        await notifyGuildsForGiftcode(
          this.discordClient,
          this.guildSettings,
          gameId,
          giftcodeGameLabel(gameId),
          newEntries,
        );
      }
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
