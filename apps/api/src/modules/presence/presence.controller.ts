import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PresenceService } from './presence.service';

@Controller('public')
export class PresenceController {
  constructor(private presenceService: PresenceService) {}

  @Get('me')
  async getPresence(@Query('id') id: string) {
    if (!id) {
      throw new HttpException(
        { success: false, error: 'Missing required query parameter: id' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.presenceService.getPresence(id);

    if (!result.data) {
      throw new HttpException(
        { success: false, error: result.error },
        HttpStatus.NOT_FOUND,
      );
    }

    return result.data;
  }
}
