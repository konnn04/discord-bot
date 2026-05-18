import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RankApiService } from './rank-api.service';

@Controller('public')
export class RankApiController {
  constructor(private rankApiService: RankApiService) {}

  /**
   * GET /api/public/rank/:guildId
   * ?period=YYYY-MM (month) | YYYY (year) — default: current month
   * &limit=20 (default 20, max 100)
   */
  @Get('rank/:guildId')
  async getRank(
    @Param('guildId') guildId: string,
    @Query('period') period?: string,
    @Query('limit') limit?: string,
  ) {
    if (!period) {
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Validate period format: YYYY-MM or YYYY
    if (!/^\d{4}(-\d{2})?$/.test(period)) {
      throw new HttpException(
        {
          success: false,
          error:
            'Invalid period format. Use YYYY-MM (month) or YYYY (year), e.g. 2026-05 or 2026',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Parse limit
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw new HttpException(
        {
          success: false,
          error: 'limit must be between 1 and 100',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.rankApiService.getTopMembers(
      guildId,
      period,
      parsedLimit,
    );

    if (!result.enabled) {
      throw new HttpException(
        { success: false, error: result.message },
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      success: true,
      data: {
        guildId,
        period,
        members: result.members,
        total: result.members?.length ?? 0,
      },
    };
  }
}
