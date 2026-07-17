import { AttachmentBuilder, User } from 'discord.js';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { contextFromCommand, getRankAction } from '../../actions';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { join } from 'path';

try {
  const fontDir = join(__dirname, '..', '..', '..', '..', 'assets', 'fonts');
  GlobalFonts.registerFromPath(join(fontDir, 'Roboto-Regular.ttf'), 'Roboto');
  GlobalFonts.registerFromPath(join(fontDir, 'Roboto-Bold.ttf'), 'Roboto');
} catch (e) {
  console.error('Failed to load Roboto font for rank card:', e);
}

const CARD_W = 900;
const CARD_H = 280;

async function drawRankCard(opts: {
  tag: string;
  avatarUrl: string;
  avatarDecorationUrl?: string;
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

    // ── Avatar Decoration ──
    if (opts.avatarDecorationUrl) {
      try {
        const decor = await loadImage(opts.avatarDecorationUrl);
        const decorSize = 160 * 1.2;
        const decorX = 110 - decorSize / 2;
        const decorY = CARD_H / 2 - decorSize / 2;
        ctx.drawImage(decor, decorX, decorY, decorSize, decorSize);
      } catch {
        /* decor load failed — skip */
      }
    }
  } catch {
    /* avatar load failed — skip */
  }

  // ── Rank badge (top-right) ──
  ctx.fillStyle = '#e94560';
  ctx.beginPath();
  ctx.roundRect(CARD_W - 170, 15, 150, 45, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px Roboto';
  ctx.textAlign = 'center';
  ctx.fillText(`#${opts.rank}`, CARD_W - 95, 47);

  // ── Username ──
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Roboto';
  ctx.textAlign = 'left';
  const name = opts.tag.length > 22 ? opts.tag.slice(0, 21) + '…' : opts.tag;
  ctx.fillText(name, 210, 105);

  // ── Level ──
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 22px Roboto';
  ctx.fillText(`Cấp ${opts.level}`, 210, 145);

  // ── XP text ──
  ctx.fillStyle = '#a0a0b8';
  ctx.font = '16px Roboto';
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
  ctx.font = 'bold 14px Roboto';
  ctx.textAlign = 'center';
  ctx.fillText(`${progress.toFixed(0)}%`, barX + barW / 2, barY + 17);

  // ── Server name (bottom-left) ──
  ctx.fillStyle = '#6c6c80';
  ctx.font = '16px Roboto';
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
    const actionCtx = contextFromCommand(ctx, deps);
    if (!actionCtx) {
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

    const result = await getRankAction(actionCtx, { discordId: targetUser.id });
    if (!result.ok || !result.data) {
      await ctx.editReply(
        `❌ **${targetUser.username}** chưa có XP trong server này.`,
      );
      return;
    }
    const {
      level,
      xp,
      rank: rankPos,
      xpInLevel: xpInLvl,
      xpNeeded: xpNeed,
      progress,
    } = result.data;

    const serverName = ctx.guild?.name || 'Server';
    const avatarUrl = targetUser.displayAvatarURL({
      extension: 'png',
      size: 256,
    });
    const avatarDecorationUrl = targetUser.avatarDecorationURL({
      extension: 'png',
      size: 256,
    });
    const serverIcon = ctx.guild?.iconURL({ extension: 'png', size: 128 });

    const buf = await drawRankCard({
      tag: targetUser.username,
      avatarUrl,
      avatarDecorationUrl: avatarDecorationUrl || undefined,
      level,
      xp,
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
