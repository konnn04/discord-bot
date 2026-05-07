import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { PrismaService } from '../../../prisma/prisma.service';

/**
 * Parse a human time string: 30m, 2h, 1h30m, 14:30, "tomorrow 9:00"
 * Returns Date or null if unparseable.
 */
function parseTime(input: string): Date | null {
  const now = new Date();

  // tomorrow HH:MM
  const tomorrowMatch = input.match(/^tomorrow\s+(\d{1,2}):(\d{2})$/i);
  if (tomorrowMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(parseInt(tomorrowMatch[1]), parseInt(tomorrowMatch[2]), 0, 0);
    return d;
  }

  // HH:MM (today)
  const hhmm = input.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const d = new Date(now);
    d.setHours(parseInt(hhmm[1]), parseInt(hhmm[2]), 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1); // tomorrow if passed
    return d;
  }

  // NhMmSs (1h30m, 30m, 2h, 45s)
  let totalMs = 0;
  const hMatch = input.match(/(\d+)\s*h/i);
  const mMatch = input.match(/(\d+)\s*m/i);
  const sMatch = input.match(/(\d+)\s*s/i);
  if (hMatch) totalMs += parseInt(hMatch[1]) * 3600_000;
  if (mMatch) totalMs += parseInt(mMatch[1]) * 60_000;
  if (sMatch) totalMs += parseInt(sMatch[1]) * 1000;
  if (totalMs === 0) return null;
  if (totalMs < 60_000) totalMs = 60_000; // min 1 minute
  if (totalMs > 30 * 24 * 3600_000) totalMs = 30 * 24 * 3600_000; // max 30 days

  return new Date(now.getTime() + totalMs);
}

const remind: ActionCommand = {
  name: 'remind',
  description: 'Đặt lịch nhắc nhở',
  category: 'common',
  permission: PermissionLevel.EVERYONE,
  optionalArgs: [
    { name: 'time', description: 'Thời gian: 30m, 2h, 1h30m, 14:30, "tomorrow 9:00"', type: 'STRING', required: true },
    { name: 'message', description: 'Nội dung nhắc nhở', type: 'STRING', required: true },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    const prisma = deps?.prisma as PrismaService | undefined;
    if (!prisma) { await ctx.reply('❌ Hệ thống chưa sẵn sàng.'); return; }

    const timeStr = (ctx.getOption('time', 'string') as string) || '';
    const message = (ctx.getOption('message', 'string') as string) || '';

    if (!timeStr || !message) {
      await ctx.reply('❌ Cách dùng: `/remind time:1h30m message:"đi họp"`');
      return;
    }

    const remindAt = parseTime(timeStr);
    if (!remindAt) {
      await ctx.reply('❌ Không hiểu thời gian. VD: `30m`, `2h`, `1h30m`, `14:30`, `tomorrow 9:00`');
      return;
    }

    const r = await prisma.client.reminder.create({
      data: {
        userId: ctx.userId,
        channelId: ctx.channelId!,
        message: message.slice(0, 500),
        remindAt,
      },
    });

    const ts = Math.floor(remindAt.getTime() / 1000);
    await ctx.reply(`⏰ Đã đặt nhắc nhở: **${message}** — sẽ thông báo <t:${ts}:R>`);
  },
};

export default remind;
