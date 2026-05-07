/**
 * Checks due reminders every 30 seconds and sends notifications.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import type { Client } from 'discord.js';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);
  private discordClient: Client | null = null;

  constructor(private prisma: PrismaService) {}

  setClient(client: Client): void {
    this.discordClient = client;
  }

  @Cron('*/30 * * * * *')
  async processReminders(): Promise<void> {
    if (!this.discordClient) return;

    const now = new Date();
    const due = await this.prisma.client.reminder.findMany({
      where: { remindAt: { lte: now } },
      take: 20,
    });

    for (const r of due) {
      try {
        const ch = await this.discordClient.channels.fetch(r.channelId).catch(() => null);
        if (ch && ch.isTextBased() && 'send' in ch) {
          await (ch as any).send(`⏰ <@${r.userId}> nhắc nhở: **${r.message}**`);
        } else {
          // Fallback: DM
          const user = await this.discordClient.users.fetch(r.userId).catch(() => null);
          if (user) await user.send(`⏰ Nhắc nhở: **${r.message}**`).catch(() => {});
        }
      } catch {/* channel gone, skip */}
      await this.prisma.client.reminder.delete({ where: { id: r.id } }).catch(() => {});
    }
  }
}
