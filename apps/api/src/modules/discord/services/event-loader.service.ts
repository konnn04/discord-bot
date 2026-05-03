import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'discord.js';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { EventHandler } from 'shared/src/types/discord.types';

@Injectable()
export class EventLoaderService {
  private readonly logger = new Logger(EventLoaderService.name);

  /** Load all event handlers and attach them to the Discord client */
  async loadAll(client: Client, deps: any): Promise<void> {
    const eventsPath = join(__dirname, '..', 'events');

    if (!existsSync(eventsPath)) {
      this.logger.warn(`Events directory not found: ${eventsPath}`);
      return;
    }

    const eventFiles = readdirSync(eventsPath).filter(
      (f) =>
        !f.startsWith('_') &&
        f.match(/\.event\.(ts|js)$/) &&
        !f.startsWith('index'),
    );

    // Warn for invalid file structures
    const allFiles = readdirSync(eventsPath);
    for (const f of allFiles) {
      if (
        !f.startsWith('_') &&
        !f.match(/\.event\.(ts|js)$/) &&
        !f.endsWith('.d.ts') &&
        !f.endsWith('.js.map') &&
        f !== 'index.ts' &&
        f !== 'index.js'
      ) {
        this.logger.warn(`Sai cấu trúc file event (bỏ qua): ${f}`);
      }
    }

    let loaded = 0;

    for (const file of eventFiles) {
      try {
        const filePath = join(eventsPath, file);
        const mod = await import(filePath);

        const event: EventHandler = mod.default;

        if (!event || !event.name || !event.execute) {
          this.logger.warn(
            `File thiếu cấu trúc event hợp lệ (bỏ qua): ${file}`,
          );
          continue;
        }

        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, deps));
        } else {
          client.on(event.name, (...args) => event.execute(...args, deps));
        }

        loaded++;
        this.logger.debug(`Loaded event: ${event.name}`);
      } catch (error) {
        this.logger.error(`Failed to load event file ${file}:`, error);
      }
    }

    this.logger.log(`Loaded ${loaded} event handlers`);
  }
}
