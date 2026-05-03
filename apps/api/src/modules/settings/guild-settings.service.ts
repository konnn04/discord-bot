import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { GuildSettings } from 'shared/src/types/settings.types';
import { createDefaultGuildSettings } from 'shared/src/types/settings.types';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class GuildSettingsService implements OnModuleInit {
  private readonly logger = new Logger(GuildSettingsService.name);
  private readonly cache = new Map<string, GuildSettings>();

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadAll();
  }

  private async loadAll() {
    try {
      const guilds = await this.prisma.guild.findMany({
        select: { id: true, settings: true },
      });

      for (const guild of guilds) {
        if (guild.settings) {
          const merged = this.deepMerge(
            createDefaultGuildSettings(guild.id),
            guild.settings as any,
          ) as GuildSettings;
          this.cache.set(guild.id, merged);
        }
      }
      this.logger.log(`Pre-loaded settings for ${this.cache.size} guilds`);
    } catch (error) {
      this.logger.error('Failed to pre-load guild settings', error);
    }
  }

  get(guildId: string): GuildSettings {
    if (this.cache.has(guildId)) {
      return this.cache.get(guildId)!;
    }

    const defaults = createDefaultGuildSettings(guildId);
    this.cache.set(guildId, defaults);
    this.save(guildId, defaults).catch((err) =>
      this.logger.error(`Failed to save defaults for ${guildId}`, err),
    );
    return defaults;
  }

  update(guildId: string, partial: Partial<GuildSettings>): GuildSettings {
    const current = this.get(guildId);
    const updated = this.deepMerge(current, partial) as GuildSettings;
    updated.guildId = guildId; // Ensure guildId is preserved
    this.cache.set(guildId, updated);
    this.save(guildId, updated).catch((err) =>
      this.logger.error(`Failed to update settings for ${guildId}`, err),
    );
    return updated;
  }

  delete(guildId: string): void {
    this.cache.delete(guildId);
    this.prisma.guild
      .update({
        where: { id: guildId },
        data: { settings: Prisma.DbNull },
      })
      .catch((error) => {
        this.logger.error(
          `Failed to delete settings for guild ${guildId}`,
          error,
        );
      });
  }

  getPrefix(guildId: string): string {
    return this.get(guildId).prefix;
  }

  isFeatureEnabled(
    guildId: string,
    feature: keyof GuildSettings['features'],
  ): boolean {
    return this.get(guildId).features[feature];
  }

  private async save(guildId: string, settings: GuildSettings): Promise<void> {
    try {
      await this.prisma.guild.upsert({
        where: { id: guildId },
        update: { settings: settings as any },
        create: {
          id: guildId,
          name: 'Unknown Guild',
          ownerId: 'unknown',
          settings: settings as any,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save settings for guild ${guildId}`, error);
    }
  }

  /** Simple deep merge utility */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object'
      ) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  getAll(): Map<string, GuildSettings> {
    return this.cache;
  }
}
