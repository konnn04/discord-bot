import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { Client, EmbedBuilder } from 'discord.js';
import { GuildSettingsService } from '../settings/guild-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { GIFTCODE_CRAWL_GAMES } from 'shared/src/types/settings.types';
import { GIFTCODE_CRAWL_SOURCES } from './sources';

const GAME_LABELS: Record<string, string> = Object.fromEntries(
  GIFTCODE_CRAWL_GAMES.map((g) => [g.id, g.label]),
);

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
  codes: string[];
  newCodes: string[];
}

/**
 * Scrapes giftcode pages for games not covered by the michosgc HoYoverse API
 * (NTE, Wuthering Waves, Arknights/Endfield, Where Winds Meet) every 30
 * minutes, tracks known codes the same way michosgc does (hash + code list in
 * GiftcodeCache), and notifies guilds that opted in per game.
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

    // Crawling is shared across guilds — one fetch per game feeds every guild
    // that opted in (see notifyGuilds). Skip games nobody has enabled at all.
    const activeGameIds = this.getActiveGameIds();

    for (const game of GIFTCODE_CRAWL_GAMES) {
      if (!activeGameIds.has(game.id)) continue;
      try {
        await this.crawlGame(game.id);
      } catch (err) {
        this.logger.error(`Crawl failed for ${game.id}:`, err);
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

  /** The set of game ids at least one guild has enabled crawling for. */
  private getActiveGameIds(): Set<string> {
    const active = new Set<string>();
    for (const settings of this.guildSettings.getAll().values()) {
      const config = settings.giftcodeCrawl;
      if (!config?.enabled || !config.channelId) continue;
      for (const gameId of config.games ?? []) active.add(gameId);
    }
    return active;
  }

  private async crawlGame(
    gameId: string,
    opts: { notify?: boolean } = {},
  ): Promise<CrawlResult> {
    const sources = GIFTCODE_CRAWL_SOURCES[gameId];
    let codes: string[] = [];

    if (sources?.length) {
      for (const source of sources) {
        try {
          const res = await fetch(source.url, { headers: FETCH_HEADERS });
          if (!res.ok) continue;
          const html = await res.text();
          codes = source.extract(html);
          if (codes.length > 0) break; // primary source succeeded — skip fallback
        } catch (err) {
          this.logger.warn(
            `Source failed for ${gameId} (${source.url}): ${String(err)}`,
          );
        }
      }
    }

    if (codes.length === 0) {
      return { gameId, codes: [], newCodes: [] };
    }

    const payload = [...codes].sort().join(',');
    const currentHash = createHash('md5').update(payload).digest('hex');

    const dbCache = await this.prisma.giftcodeCache.findUnique({
      where: { game: gameId },
    });

    const known = dbCache ? (dbCache.codes as string[]) : [];
    const newCodes = codes.filter((c) => !known.includes(c));
    const unchanged = dbCache?.hash === currentHash;

    if (newCodes.length > 0 && (opts.notify || !unchanged)) {
      this.logger.log(`Found ${newCodes.length} new code(s) for ${gameId}`);
      await this.notifyGuilds(gameId, newCodes);
    }

    if (!unchanged) {
      const updatedKnown = [...new Set([...known, ...codes])];
      await this.prisma.giftcodeCache.upsert({
        where: { game: gameId },
        update: { hash: currentHash, codes: updatedKnown },
        create: { game: gameId, hash: currentHash, codes: updatedKnown },
      });
    }

    return { gameId, codes, newCodes };
  }

  private async notifyGuilds(gameId: string, newCodes: string[]): Promise<void> {
    if (!this.discordClient) return;
    const label = GAME_LABELS[gameId] ?? gameId;
    const allGuildSettings = this.guildSettings.getAll();

    for (const [guildId, settings] of allGuildSettings.entries()) {
      const config = settings.giftcodeCrawl;
      if (!config?.enabled || !config.channelId) continue;
      if (!config.games?.includes(gameId)) continue;

      try {
        const channel = await this.discordClient.channels.fetch(
          config.channelId,
        );
        if (!channel || !channel.isTextBased()) continue;

        const embed = new EmbedBuilder()
          .setTitle(`🎁 Mã quà tặng mới cho ${label}!`)
          .setColor(0x22c55e)
          .setDescription(newCodes.map((c) => `**\`${c}\`**`).join('\n'))
          .setFooter({
            text: 'Tự động cào từ web — kiểm tra hạn dùng trước khi nhập.',
          })
          .setTimestamp();

        const content = config.roleId ? `<@&${config.roleId}>` : undefined;

        await (channel as any).send({ content, embeds: [embed] });
      } catch (err) {
        this.logger.error(
          `Failed to notify guild ${guildId} for ${gameId}:`,
          err,
        );
      }
    }
  }
}
