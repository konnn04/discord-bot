import { createCanvas, loadImage } from '@napi-rs/canvas';
import { initCanvasFonts } from './canvas-fonts';

initCanvasFonts();

export interface LeaderboardCardEntry {
  position: number;
  username: string;
  xp: number;
  level?: number | null;
  avatarUrl?: string;
}

export interface LeaderboardCardOptions {
  title: string;
  serverName: string;
  entries: LeaderboardCardEntry[];
}

const W = 900;
const H = 600;

function formatXp(xp: number): string {
  if (xp >= 1_000_000) return (xp / 1_000_000).toFixed(1) + 'M';
  if (xp >= 1_000) return (xp / 1_000).toFixed(1) + 'k';
  return xp.toLocaleString();
}

export async function renderLeaderboardCard(
  opts: LeaderboardCardOptions,
): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#13111c');
  bg.addColorStop(0.5, '#181528');
  bg.addColorStop(1, '#0f0e17');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 24);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(1, 1, W - 2, H - 2, 24);
  ctx.stroke();

  // Header Title
  ctx.fillStyle = '#ff5c26';
  ctx.font = 'bold 13px Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(opts.serverName.toUpperCase().slice(0, 32), 40, 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Roboto, sans-serif';
  ctx.fillText(opts.title, 40, 80);

  const top1 = opts.entries.find((e) => e.position === 1);
  const top2 = opts.entries.find((e) => e.position === 2);
  const top3 = opts.entries.find((e) => e.position === 3);

  const podiumSlots = [
    { entry: top2, pos: 2, color: '#c0c0d0', x: 70, y: 120, w: 220, h: 200 },
    { entry: top1, pos: 1, color: '#ffb703', x: 340, y: 105, w: 220, h: 215 },
    { entry: top3, pos: 3, color: '#fb8500', x: 610, y: 125, w: 220, h: 195 },
  ];

  for (const slot of podiumSlots) {
    if (!slot.entry) continue;
    const { entry, pos, color, x, y, w, h } = slot;

    // Card background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = pos === 1 ? 2.5 : 1.5;
    ctx.stroke();

    // Medal badge
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 24, y - 14, 48, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#12100f';
    ctx.font = 'bold 14px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('#' + pos, x + w / 2, y + 4);

    // Avatar
    const cx = x + w / 2;
    const cy = y + 65;
    const radius = 34;

    let avatarLoaded = false;
    if (entry.avatarUrl) {
      try {
        const img = await loadImage(entry.avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
        ctx.restore();
        avatarLoaded = true;
      } catch {}
    }

    if (!avatarLoaded) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = '#12100f';
      ctx.font = 'bold 22px Roboto, sans-serif';
      ctx.fillText(entry.username[0]?.toUpperCase() || '?', cx, cy + 8);
    }

    // Border around avatar
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Username
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Roboto, sans-serif';
    ctx.textAlign = 'center';
    const name =
      entry.username.length > 18
        ? entry.username.slice(0, 16) + '…'
        : entry.username;
    ctx.fillText(name, cx, y + 130);

    // XP
    ctx.fillStyle = color;
    ctx.font = 'bold 14px Roboto, sans-serif';
    ctx.fillText(formatXp(entry.xp) + ' XP', cx, y + 155);

    // Level
    if (entry.level != null) {
      ctx.fillStyle = '#8d8279';
      ctx.font = '12px Roboto, sans-serif';
      ctx.fillText(`Cấp ${entry.level}`, cx, y + 175);
    }
  }

  // Rows 4 to 10
  const rows = opts.entries.filter((e) => e.position >= 4).slice(0, 5);
  ctx.textAlign = 'left';
  const startY = 350;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const ry = startY + i * 44;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.beginPath();
    ctx.roundRect(50, ry, W - 100, 36, 10);
    ctx.fill();

    ctx.fillStyle = '#8d8279';
    ctx.font = 'bold 14px Roboto, sans-serif';
    ctx.fillText('#' + r.position, 70, ry + 23);

    ctx.fillStyle = '#ded4cd';
    ctx.font = 'bold 14px Roboto, sans-serif';
    const rowName =
      r.username.length > 28 ? r.username.slice(0, 26) + '…' : r.username;
    ctx.fillText(rowName, 120, ry + 23);

    if (r.level != null) {
      ctx.fillStyle = '#e94560';
      ctx.font = '13px Roboto, sans-serif';
      ctx.fillText(`Cấp ${r.level}`, 560, ry + 23);
    }

    ctx.fillStyle = '#a79c95';
    ctx.font = 'bold 13px Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatXp(r.xp) + ' XP', W - 75, ry + 23);
    ctx.textAlign = 'left';
  }

  return canvas.toBuffer('image/png');
}
