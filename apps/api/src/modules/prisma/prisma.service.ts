import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public client!: PrismaClient;
  private pool!: pg.Pool;

  async onModuleInit() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      this.logger.warn('DATABASE_URL is not set — database features disabled');
      return;
    }

    try {
      this.pool = new pg.Pool({ connectionString: dbUrl });
      const adapter = new PrismaPg(this.pool);
      this.client = new PrismaClient({ adapter });
      await this.client.$connect();
      this.logger.log('Database connected');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.$disconnect();
      this.logger.log('Database disconnected');
    }
    if (this.pool) {
      await this.pool.end();
    }
  }

  get isConnected(): boolean {
    return !!this.client;
  }

  get user() {
    return this.client?.user;
  }
  get guild() {
    return this.client?.guild;
  }
  get guildMember() {
    return this.client?.guildMember;
  }
  get globalSetting() {
    return this.client?.globalSetting;
  }
  get guildMemberXp() {
    return this.client?.guildMemberXp;
  }
  get publicPresence() {
    return this.client?.publicPresence;
  }
  get giftcodeCache() {
    return this.client?.giftcodeCache;
  }
}
