import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { MeetingReportParticipant } from 'shared/src/types/api.types';

export interface CreateMeetingReportInput {
  guildId: string;
  voiceChannelId: string;
  channelName: string;
  initiatorId: string;
  startTime: Date;
  endTime: Date;
  participants: MeetingReportParticipant[];
}

@Injectable()
export class MeetingsService {
  constructor(private prisma: PrismaService) {}

  /** Persist a meeting report and return its id (used to build the share link). */
  async create(input: CreateMeetingReportInput): Promise<string> {
    const report = await this.prisma.client.meetingReport.create({
      data: {
        guildId: input.guildId,
        voiceChannelId: input.voiceChannelId,
        channelName: input.channelName,
        initiatorId: input.initiatorId,
        startTime: input.startTime,
        endTime: input.endTime,
        participants: input.participants as any,
      },
      select: { id: true },
    });
    return report.id;
  }

  /** Fetch a report by id for the public web page. */
  async getById(id: string) {
    const report = await this.prisma.client.meetingReport.findUnique({
      where: { id },
    });
    if (!report) {
      throw new NotFoundException('Meeting report not found');
    }
    return report;
  }
}
