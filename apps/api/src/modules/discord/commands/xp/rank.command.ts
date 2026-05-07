import { AttachmentBuilder, User } from 'discord.js';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const CARD_W = 900;
const CARD_H = 280;

/** Generate rank card image buffer */
async function drawRankCard(opts: {
  tag: string;
  avatarUrl: string;
  level: number;
  xp: number;
  xpCurrent: number;
  xpNeeded: number;
  rank: number;
  progress: number; // 0-100
  serverName: string;
  serverIconUrl?: string;
}): Promise<Buffer> {
  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx = canvas.getContext('2d');

  // ── Background gradient ──
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, '#1a1a2e');
  bg.addColorStop(1, '#16213e');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, CARD_W, CARD_H, 20);
  ctx.fill();

  // ── Avatar ──
  try {
    const avatar = await loadImage(opts.avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(110, CARD_H / 2, 80, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 30, CARD_H / 2 - 80, 160, 160);
    ctx.restore();
    // Border
    ctx.beginPath();
    ctx.arc(110, CARD_H / 2, 82, 0, Math.PI * 2);
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 4;
    ctx.stroke();
  } catch {
    /* avatar load failed — skip */
  }

  // ── Rank badge (top-right) ──
  ctx.fillStyle = '#e94560';
  ctx.beginPath();
  ctx.roundRect(CARD_W - 170, 15, 150, 45, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`#${opts.rank}`, CARD_W - 95, 47);

  // ── Username ──
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'left';
  const name = opts.tag.length > 22 ? opts.tag.slice(0, 21) + '…' : opts.tag;
  ctx.fillText(name, 210, 105);

  // ── Level ──
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`Cấp ${opts.level}`, 210, 145);

  // ── XP text ──
  ctx.fillStyle = '#a0a0b8';
  ctx.font = '16px sans-serif';
  ctx.fillText(`${opts.xpCurrent} / ${opts.xpNeeded} XP`, 210, 175);

  // ── Progress bar background ──
  const barX = 210;
  const barY = 195;
  const barW = 650;
  const barH = 24;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 12);
  ctx.fill();

  // ── Progress bar fill ──
  const progress = Math.min(100, Math.max(0, opts.progress));
  const fillW = (barW * progress) / 100;
  if (fillW > 0) {
    const pg = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    pg.addColorStop(0, '#e94560');
    pg.addColorStop(1, '#ff6b6b');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 12);
    ctx.fill();
  }

  // ── Progress % ──
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${progress.toFixed(0)}%`, barX + barW / 2, barY + 17);

  // ── Server name (bottom-left) ──
  ctx.fillStyle = '#6c6c80';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(opts.serverName.slice(0, 30), 210, 255);

  return canvas.toBuffer('image/png');
}

const rank: ActionCommand = {
  name: 'rank',
  description: 'Xem thẻ rank của bạn hoặc người khác',
  category: 'xp',
  permission: PermissionLevel.EVERYONE,
  optionalArgs: [
    {
      name: 'user',
      description: 'Người dùng muốn xem rank',
      type: 'USER',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    if (!deps?.prisma) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    const guildId = ctx.guildId;
    if (!guildId) {
      await ctx.reply('❌ Lệnh này chỉ khả dụng trong server.');
      return;
    }

    const targetUser =
      (ctx.getOption('user', 'user') as User | null) || ctx.author;
    if (targetUser.bot) {
      await ctx.reply('🤖 Bot không có rank nha!');
      return;
    }

    await ctx.defer();

    const dbUser = await deps.prisma.user.findUnique({
      where: { discordId: targetUser.id },
    });
    if (!dbUser) {
      await ctx.editReply(
        `❌ **${targetUser.username}** chưa có XP trong server này.`,
      );
      return;
    }

    const member = await deps.prisma.guildMember.findUnique({
      where: { userId_guildId: { userId: dbUser.id, guildId } },
    });
    if (!member || member.xp === 0) {
      await ctx.editReply(
        `❌ **${targetUser.username}** chưa có XP trong server này.`,
      );
      return;
    }

    const rankPos =
      (await deps.prisma.guildMember.count({
        where: { guildId, xp: { gt: member.xp } },
      })) + 1;

    // XP calculation
    const formula =
      deps.globalSettings?.get()?.xp?.levelUpFormula || 'exponential';
    const baseXp = deps.globalSettings?.get()?.xp?.baseXpForLevelUp || 100;
    let currentBase = 0;
    if (formula === 'exponential') {
      for (let i = 1; i <= member.level; i++)
        currentBase += baseXp * Math.pow(1.5, i - 1);
    } else {
      currentBase = member.level * baseXp;
    }
    const nextBase =
      formula === 'exponential'
        ? currentBase + baseXp * Math.pow(1.5, member.level)
        : (member.level + 1) * baseXp;
    const xpInLvl = member.xp - currentBase;
    const xpNeed = nextBase - currentBase;
    const progress = Math.min(100, Math.max(0, (xpInLvl / xpNeed) * 100));

    const serverName = ctx.guild?.name || 'Server';
    const avatarUrl = targetUser.displayAvatarURL({
      extension: 'png',
      size: 256,
    });
    const serverIcon = ctx.guild?.iconURL({ extension: 'png', size: 128 });

    const buf = await drawRankCard({
      tag: targetUser.username,
      avatarUrl,
      level: member.level,
      xp: member.xp,
      xpCurrent: xpInLvl,
      xpNeeded: xpNeed,
      rank: rankPos,
      progress,
      serverName,
      serverIconUrl: serverIcon || undefined,
    });

    await ctx.editReply({
      files: [new AttachmentBuilder(buf, { name: 'rank.png' })],
    });
  },
};

export default rank;
