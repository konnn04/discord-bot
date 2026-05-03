import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { CommandLoaderService } from './services/command-loader.service';
import { EventLoaderService } from './services/event-loader.service';
import { CooldownService } from './services/cooldown.service';
import { PermissionService } from './services/permission.service';

import { MichosgcModule } from '../michosgc/michosgc.module';

@Module({
  imports: [MichosgcModule],
  providers: [
    DiscordService,
    CommandLoaderService,
    EventLoaderService,
    CooldownService,
    PermissionService,
  ],
  exports: [
    DiscordService,
    CommandLoaderService,
    CooldownService,
    PermissionService,
  ],
})
export class DiscordModule {}
