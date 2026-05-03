import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DiscordModule } from './modules/discord/discord.module';
import { AuthModule } from './modules/auth/auth.module';
import { GuildsModule } from './modules/guilds/guilds.module';
import { XpModule } from './modules/xp/xp.module';
import { PresenceModule } from './modules/presence/presence.module';
import { MichosgcModule } from './modules/michosgc/michosgc.module';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // Core
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
