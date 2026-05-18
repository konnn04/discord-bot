import { Module } from '@nestjs/common';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { AuthModule } from '../auth/auth.module';
import { DiscordModule } from '../discord/discord.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, DiscordModule, PrismaModule],
  controllers: [GuildsController],
  providers: [GuildsService],
})
export class GuildsModule {}
