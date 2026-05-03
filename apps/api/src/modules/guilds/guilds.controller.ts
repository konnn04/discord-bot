import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { AuthGuard } from '../auth/auth.guard';
import type { Request } from 'express';
import type { GuildSettings } from 'shared/src/types/settings.types';

@Controller('guilds')
@UseGuards(AuthGuard)
export class GuildsController {
  constructor(private guildsService: GuildsService) {}

  /** Get all guilds the bot is in (that the user also has access to) */
  @Get()
  list() {
    // For super admins, return all bot guilds
    // For regular users, we'd need their guild list from Discord
    // For simplicity, return all bot guilds for now
    const guilds = this.guildsService.getBotGuilds();
    return { success: true, data: guilds };
  }

  /** Get a specific guild */
  @Get(':id')
  get(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException(
        'You do not have permission to manage this guild',
      );
    }

    const guild = this.guildsService.getGuild(id);
    return { success: true, data: guild };
  }

  /** Get guild settings */
  @Get(':id/settings')
  getSettings(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException(
        'You do not have permission to manage this guild',
      );
    }

    const settings = this.guildsService.getGuildSettings(id);
    return { success: true, data: settings };
  }

  /** Update guild settings */
  @Put(':id/settings')
  updateSettings(
    @Param('id') id: string,
    @Body() body: Partial<GuildSettings>,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException(
        'You do not have permission to manage this guild',
      );
    }

    const settings = this.guildsService.updateGuildSettings(id, body);
    return { success: true, data: settings };
  }
}
