import { Module, Global } from '@nestjs/common';
import { GlobalSettingsService } from './global-settings.service';
import { GuildSettingsService } from './guild-settings.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [GlobalSettingsService, GuildSettingsService],
  exports: [GlobalSettingsService, GuildSettingsService],
})
export class SettingsModule {}
