import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private isAvailable = false;

  constructor() {
    this.init();
  }

  private init() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number(process.env.REDIS_PORT) || 6379;

    try {
      this.client = new Redis({
        host,
        port,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 2000,
      });

      this.client
        .connect()
        .then(() => {
          this.isAvailable = true;
          this.logger.log(`Connected to Redis at ${host}:${port}`);
        })
        .catch(() => {
          this.isAvailable = false;
        });

      this.client.on('error', () => {
        this.isAvailable = false;
      });

      this.client.on('connect', () => {
        this.isAvailable = true;
      });
    } catch {
      this.isAvailable = false;
    }
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    if (!this.isAvailable || !this.client) return null;
    try {
      return await this.client.getBuffer(key);
    } catch {
      return null;
    }
  }

  async setBuffer(
    key: string,
    buffer: Buffer,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.isAvailable || !this.client) return;
    try {
      await this.client.set(key, buffer, 'EX', ttlSeconds);
    } catch {
      // Ignore cache write failures gracefully
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // Ignore disconnect failures on shutdown
      }
    }
  }
}
