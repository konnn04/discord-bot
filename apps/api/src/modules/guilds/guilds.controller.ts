import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
  HttpException,
  HttpStatus,
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

  /** Get guild statistics */
  @Get(':id/stats')
  getStats(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    const stats = this.guildsService.getGuildStats(id);
    return { success: true, data: stats };
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

  @Get(':id/chatbot-config')
  async getChatbotConfig(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException(
        'You do not have permission to manage this guild',
      );
    }
    const data = await this.guildsService.getChatbotConfig(id);
    return {
      success: true,
      data,
    };
  }

  @Post(':id/chatbot-models')
  async fetchChatbotModels(
    @Param('id') id: string,
    @Body()
    body: {
      provider: 'gemini' | 'deepseek' | 'agentrouter';
      apiKey?: string;
      baseUrl?: string;
    },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException(
        'You do not have permission to manage this guild',
      );
    }
    const data = await this.guildsService.fetchLiveModels(
      id,
      body.provider,
      body.apiKey,
      body.baseUrl,
    );
    return { success: true, data };
  }

  @Post(':id/chatbot-test')
  async testChatbot(
    @Param('id') id: string,
    @Body()
    body: {
      provider?: 'gemini' | 'deepseek' | 'agentrouter';
      model?: string;
      apiKey?: string;
      baseUrl?: string;
    },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException(
        'You do not have permission to manage this guild',
      );
    }
    return this.guildsService.testChatbot(id, body);
  }

  @Get(':id/channels')
  getChannels(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    return { success: true, data: this.guildsService.getChannels(id) };
  }

  @Get(':id/roles')
  getRoles(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    return { success: true, data: this.guildsService.getRoles(id) };
  }

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

  @Get(':id/members')
  async getMembers(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('filter') filter: 'all' | 'humans' | 'bots' | 'online' = 'humans',
    @Query('sort') sort: 'joined' | 'status' = 'joined',
    @Query('search') search?: string,
    @Req() req?: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    return this.guildsService.getMembers(
      id,
      parseInt(page),
      parseInt(pageSize),
      filter,
      sort,
      search,
    );
  }

  /** Get member detail */
  @Get(':id/members/:memberId')
  getMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    return this.guildsService.getMemberDetail(id, memberId);
  }

  /** Kick a member */
  @Post(':id/members/:memberId/kick')
  async kickMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    return this.guildsService.kickMember(id, memberId);
  }

  /** Timeout a member (minutes=0 or omit to remove timeout) */
  @Post(':id/members/:memberId/timeout')
  async timeoutMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: { minutes?: number },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    return this.guildsService.timeoutMember(id, memberId, body.minutes ?? null);
  }

  /** Get message chart data */
  @Get(':id/charts/messages')
  async getMessageChart(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    const data = await this.guildsService.getMessageChart(id);
    return { success: true, data };
  }

  /** Get XP chart data */
  @Get(':id/charts/xp')
  async getXpChart(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    const data = await this.guildsService.getXpChart(id);
    return { success: true, data };
  }

  /** Get online frequency chart data with range filter */
  @Get(':id/charts/online')
  async getOnlineFrequency(
    @Param('id') id: string,
    @Query('range') range: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    const validRange = range === 'month' || range === '90d' ? range : 'week';
    const data = await this.guildsService.getOnlineFrequency(id, validRange);
    return { success: true, data };
  }

  /** Get top XP members for a guild (protected, no rankApi setting needed) */
  @Get(':id/charts/xp/top')
  async getTopXpMembers(
    @Param('id') id: string,
    @Query('period') period: string,
    @Query('limit') limit: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }

    if (!period) {
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!/^\d{4}(-\d{2})?$/.test(period)) {
      throw new HttpException(
        { success: false, error: 'Invalid period format. Use YYYY-MM or YYYY' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const data = await this.guildsService.getTopMembers(
      id,
      period,
      parsedLimit,
    );
    return { success: true, data: { guildId: id, period, members: data } };
  }

  /** Get music statistics for a guild */
  @Get(':id/music/stats')
  async getMusicStats(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    const data = await this.guildsService.getMusicStats(id);
    return { success: true, data };
  }

  /** Get memories for a guild */
  @Get(':id/memories')
  async getMemories(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('search') search?: string,
    @Query('source') source?: 'all' | 'ai' | 'manual',
    @Req() req?: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    const data = await this.guildsService.getMemories(
      id,
      parseInt(page, 10) || 1,
      parseInt(pageSize, 10) || 20,
      search,
      source,
    );
    return { success: true, data };
  }

  /** Get memory stats for a guild */
  @Get(':id/memories/stats')
  async getMemoryStats(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    const data = await this.guildsService.getMemoryStats(id);
    return { success: true, data };
  }

  /** Create a new memory entry manually */
  @Post(':id/memories')
  async createMemory(
    @Param('id') id: string,
    @Body() body: { key: string; value: string; metadata?: any },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    if (!body.key || !body.value) {
      throw new HttpException(
        { success: false, error: 'Key and value are required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const metadata = {
      ...(body.metadata || {}),
      source: 'manual',
      author: user.username || user.displayName || user.sub,
    };
    const data = await this.guildsService.saveMemory(
      id,
      body.key,
      body.value,
      metadata,
    );
    return { success: true, data };
  }

  /** Update an existing memory entry */
  @Put(':id/memories/:key')
  async updateMemory(
    @Param('id') id: string,
    @Param('key') key: string,
    @Body() body: { value: string; metadata?: any },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    if (!body.value) {
      throw new HttpException(
        { success: false, error: 'Value is required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const metadata = {
      ...(body.metadata || {}),
      source: 'manual',
      updatedBy: user.username || user.displayName || user.sub,
    };
    const data = await this.guildsService.saveMemory(
      id,
      key,
      body.value,
      metadata,
    );
    return { success: true, data };
  }

  /** Delete a memory key */
  @Delete(':id/memories/:key')
  async deleteMemory(
    @Param('id') id: string,
    @Param('key') key: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    const result = await this.guildsService.deleteMemory(id, key);
    return { success: true, data: result };
  }

  /** Extract & save memory entries from a free-text admin prompt via AI */
  @Post(':id/memories/from-prompt')
  async createMemoriesFromPrompt(
    @Param('id') id: string,
    @Body() body: { prompt: string },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    if (!body.prompt || !body.prompt.trim()) {
      throw new HttpException(
        { success: false, error: 'Prompt is required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const data = await this.guildsService.createMemoriesFromPrompt(
      id,
      body.prompt.trim(),
      user.username || user.displayName || user.sub,
    );
    return { success: true, data };
  }

  /** Test memory lookup algorithm / simulator */
  @Post(':id/memories/test-lookup')
  async testMemoryLookup(
    @Param('id') id: string,
    @Body() body: { query: string },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!this.guildsService.canManageGuild(user.sub, id)) {
      throw new ForbiddenException('You do not have permission');
    }
    if (!body.query) {
      return { success: true, data: { query: '', matched: [] } };
    }
    const data = await this.guildsService.testMemoryLookup(id, body.query);
    return { success: true, data };
  }
}
