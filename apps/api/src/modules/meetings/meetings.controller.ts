import { Controller, Get, Param } from '@nestjs/common';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
  constructor(private meetingsService: MeetingsService) {}

  @Get(':id')
  async get(@Param('id') id: string) {
    const report = await this.meetingsService.getById(id);
    return { success: true, data: report };
  }
}
