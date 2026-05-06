import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { CommandLoaderService } from './services/command-loader.service';
import { EventLoaderService } from './services/event-loader.service';
import { CooldownService } from './services/cooldown.service';
import { PermissionService } from './services/permission.service';
import { VoiceTagService } from './services/voice-tag.service';
import { LeetcodeSchedulerService } from './services/leetcode-scheduler.service';
import { MusicController } from './controllers/music.controller';

import { MichosgcModule } from '../michosgc/michosgc.module';

@Module({
  imports: [MichosgcModule],
  controllers: [MusicController],
  providers: [
    DiscordService,
    CommandLoaderService,
    EventLoaderService,
    CooldownService,
    PermissionService,
    VoiceTagService,
    LeetcodeSchedulerService,
  ],
  exports: [
    DiscordService,
    CommandLoaderService,
    CooldownService,
    PermissionService,
    VoiceTagService,
  ],
})
export class DiscordModule {}
