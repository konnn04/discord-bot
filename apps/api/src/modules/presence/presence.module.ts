import { Module } from '@nestjs/common';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';
import { RankApiController } from './rank-api.controller';
import { RankApiService } from './rank-api.service';
import { DiscordModule } from '../discord/discord.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [DiscordModule, PrismaModule],
  controllers: [PresenceController, RankApiController],
  providers: [PresenceService, RankApiService],
})
export class PresenceModule {}
