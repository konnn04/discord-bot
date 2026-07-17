import { ok, fail, type ActionContext, type ActionResult } from '../types';

export interface RankData {
  level: number;
  xp: number;
  rank: number;
  xpInLevel: number;
  xpNeeded: number;
  progress: number; // 0-100
}

export async function getRankAction(
  ctx: ActionContext,
  args: { discordId: string },
): Promise<ActionResult<RankData>> {
  const prisma = ctx.deps?.prisma;
  if (!prisma) return fail('Hệ thống chưa sẵn sàng.');

  const dbUser = await prisma.client.user.findUnique({
    where: { discordId: args.discordId },
  });
  if (!dbUser) return fail('Chưa có XP trong server này.');

  const member = await prisma.client.guildMember.findUnique({
    where: { userId_guildId: { userId: dbUser.id, guildId: ctx.guild.id } },
  });
  if (!member || member.xp === 0) return fail('Chưa có XP trong server này.');

  const rankPos =
    (await prisma.client.guildMember.count({
      where: { guildId: ctx.guild.id, xp: { gt: member.xp } },
    })) + 1;

  const settings = ctx.deps?.globalSettings?.get()?.xp;
  const formula = settings?.levelUpFormula || 'exponential';
  const baseXp = settings?.baseXpForLevelUp || 100;

  let currentBase = 0;
  if (formula === 'exponential') {
    for (let i = 1; i <= member.level; i++) {
      currentBase += baseXp * Math.pow(1.5, i - 1);
    }
  } else {
    currentBase = member.level * baseXp;
  }
  const nextBase =
    formula === 'exponential'
      ? currentBase + baseXp * Math.pow(1.5, member.level)
      : (member.level + 1) * baseXp;

  const xpInLevel = member.xp - currentBase;
  const xpNeeded = nextBase - currentBase;
  const progress = Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100));

  const data: RankData = {
    level: member.level,
    xp: member.xp,
    rank: rankPos,
    xpInLevel,
    xpNeeded,
    progress,
  };
  return ok(
    `Cấp ${data.level} • Hạng #${data.rank} • ${progress.toFixed(0)}% tới cấp sau`,
    data,
  );
}
