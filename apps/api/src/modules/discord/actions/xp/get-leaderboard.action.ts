import { ok, fail, type ActionContext, type ActionResult } from '../types';

export type LeaderboardType = 'all' | 'month' | 'year';

export interface LeaderboardEntry {
  position: number;
  username: string;
  xp: number;
  level: number | null;
}

export async function getLeaderboardAction(
  ctx: ActionContext,
  args: { type?: LeaderboardType },
): Promise<ActionResult<LeaderboardEntry[]>> {
  const prisma = ctx.deps?.prisma;
  if (!prisma) return fail('Hệ thống chưa sẵn sàng.');

  const type = args.type || 'all';
  const guildId = ctx.guild.id;

  let entries: LeaderboardEntry[] = [];
  if (type === 'month' || type === 'year') {
    const now = new Date();
    const period =
      type === 'month'
        ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        : `${now.getFullYear()}`;
    const logs = await prisma.client.guildMemberXp.findMany({
      where: { guildId, period },
      orderBy: { xp: 'desc' },
      take: 10,
      include: { user: true },
    });
    entries = logs.map((log: any, i: number) => ({
      position: i + 1,
      username: log.user.username,
      xp: log.xp,
      level: null,
    }));
  } else {
    const top = await prisma.client.guildMember.findMany({
      where: { guildId, xp: { gt: 0 } },
      orderBy: { xp: 'desc' },
      take: 10,
      include: { user: true },
    });
    entries = top.map((m: any, i: number) => ({
      position: i + 1,
      username: m.user.username,
      xp: m.xp,
      level: m.level,
    }));
  }

  if (entries.length === 0) return ok('Chưa có ai trong bảng xếp hạng.', []);

  const summary = entries
    .map((e) => `#${e.position} ${e.username} — ${e.xp} XP`)
    .join('\n');
  return ok(summary, entries);
}
