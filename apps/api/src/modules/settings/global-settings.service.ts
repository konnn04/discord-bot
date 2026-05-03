import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { GlobalSettings } from 'shared/src/types/settings.types';
import { DEFAULT_GLOBAL_SETTINGS } from 'shared/src/types/settings.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GlobalSettingsService implements OnModuleInit {
  private readonly logger = new Logger(GlobalSettingsService.name);
  private settings: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS };

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.load();
  }

  /** Load global settings from database, merge with defaults */
  async load(): Promise<void> {
    try {
      const record = await this.prisma.globalSetting.findUnique({
        where: { id: 'global' },
      });

      if (record && record.settings) {
        // Deep merge with defaults to fill in any missing fields
        this.settings = this.deepMerge(
          DEFAULT_GLOBAL_SETTINGS,
          record.settings as any,
        );
        this.logger.log('Global settings loaded from database');
      } else {
        await this.save();
        this.logger.log('Global settings created with defaults in database');
      }
    } catch (error) {
      this.logger.error(
        'Failed to load global settings, using defaults',
        error,
      );
    }
  }

  /** Get the full global settings object */
  get(): GlobalSettings {
    return this.settings;
  }

  /** Update global settings (partial) and persist */
  update(partial: Partial<GlobalSettings>): GlobalSettings {
    this.settings = this.deepMerge(this.settings, partial) as GlobalSettings;
    this.save().catch((err) =>
      this.logger.error('Failed to save global settings', err),
    );
    return this.settings;
  }

  /** Persist to database */
  private async save(): Promise<void> {
    try {
      await this.prisma.globalSetting.upsert({
        where: { id: 'global' },
        update: { settings: this.settings as any },
        create: { id: 'global', settings: this.settings as any },
      });
    } catch (error) {
      this.logger.error('Failed to save global settings', error);
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
}
