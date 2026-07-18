import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DiscordModule } from './modules/discord/discord.module';
import { AuthModule } from './modules/auth/auth.module';
import { GuildsModule } from './modules/guilds/guilds.module';
import { XpModule } from './modules/xp/xp.module';
import { PresenceModule } from './modules/presence/presence.module';
import { MichosgcModule } from './modules/michosgc/michosgc.module';
import { GiftcodeCrawlerModule } from './modules/giftcode-crawler/giftcode-crawler.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';
import { HealthController } from './health.controller';

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // Core
    ConfigModule.forRoot({
      isGlobal: true,
      // Single source of truth: the monorepo-root .env. Candidates cover both
      // running from the repo root and from apps/api (pnpm --filter api ...).
      // dotenv uses the first existing file; deploy handles .env.production
      // separately (e.g. injected env vars or copied to .env).
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '..', '..', '.env'),
      ],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SettingsModule,

    // Rate Limiting (base config — actual limits handled in CustomThrottlerGuard)
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 5 },
      { name: 'medium', ttl: 30000, limit: 30 },
    ]),

    // Discord
    DiscordModule,

    // API
    AuthModule,
    GuildsModule,
    XpModule,
    PresenceModule,
    MichosgcModule,
    GiftcodeCrawlerModule,
    MeetingsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
